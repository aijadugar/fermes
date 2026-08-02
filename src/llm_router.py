from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential, before_sleep_log

from . import config

logger = logging.getLogger(__name__)


class RouterError(RuntimeError):
    """Raised when Sarvam-105B cannot produce a usable routing decision."""


class InvalidLLMResponseError(RouterError):
    """Raised when the model response cannot be parsed into a valid decision."""


class SarvamAPIError(RouterError):
    """Raised when the Sarvam API call itself fails (network, auth, 5xx, etc.)."""


@dataclass(frozen=True)
class RoutingDecision:
    message_id: str
    action: str
    message_type: str
    reason: str
    confidence: float
    evidence_message_ids: str

    def as_row(self) -> dict:
        return {
            "message_id": self.message_id,
            "action": self.action,
            "message_type": self.message_type,
            "reason": self.reason,
            "confidence": self.confidence,
            "evidence_message_ids": self.evidence_message_ids,
        }


_client = None


def _get_client():
    global _client
    if _client is None:
        config.require_api_key()
        from sarvamai import SarvamAI
        _client = SarvamAI(api_subscription_key=config.SARVAM_API_KEY)
    return _client


SYSTEM_PROMPT = """You are the reasoning engine for a WhatsApp message notification router.

For every message you are given a rich JSON context (message text, sender type,
group/business relationship, the receiving user's engagement history, repetition
signals, explicit lexical signals, and any text extracted from attached media).
Decide how the message should be routed for THIS specific user.

Allowed `action` values: notify, digest, mute
  - notify: important/time-sensitive enough to interrupt the user right now.
  - digest: safe and possibly useful, but can wait and be shown later.
  - mute: repetitive, unwanted, low-value, suspicious, scam-like, or unsafe.

Allowed `message_type` values: personal, urgent, event, payment, business_update,
promotion, greeting, forward, spam, scam, unknown

Rules of thumb:
  - Personalize using the receiving user's own engagement/report history, group
    role and mute state, and business relationship - the same message text can
    warrant different actions for different users.
  - A muted group can still surface an urgent, directly-relevant, or @-mentioned
    message.
  - Clear scam/safety-risk content (credential/OTP requests, urgent payment/QR
    pressure, look-alike domains, pressure from an unverified sender) must be
    `mute` regardless of the user's usual engagement level - risk overrides
    engagement.
  - Chain-forward "send to N people" content with no personal relevance is low
    value (`forward` or `spam`, usually mute/digest).
  - Verified businesses with a real, on-file relationship to the user sending an
    operationally relevant update (order/payment/ride status) generally `notify`.
  - Promotions the user has not opted into, or has opted out of, should be
    `digest` or `mute`, not `notify`.
  - If media (voice note/image) could not be read, say so plainly in the reason
    and lower your confidence rather than inventing content.
  - Use `evidence_message_ids` to cite specific historical message_ids from the
    context (same_sender_history_ids, reported_or_dismissed_precedent_ids,
    scam_like_precedent_ids) that materially informed your decision. Write
    "none" if nothing in history is relevant.

Respond with ONLY a single JSON object, no markdown fences, no commentary:
{
  "action": "notify|digest|mute",
  "message_type": "one of the allowed types",
  "reason": "one short, specific sentence explaining the decision",
  "confidence": 0.0-1.0,
  "evidence_message_ids": "semicolon-separated historical message_ids used as evidence, or \\"none\\""
}
"""


def _few_shot_block(sample_df) -> str:
    if sample_df is None or not len(sample_df):
        return ""
    lines = ["Reference examples of expected style (from labeled samples):"]
    for _, r in sample_df.iterrows():
        lines.append(
            f"- text={r['message_text'][:140]!r} -> action={r['action']}, "
            f"type={r['message_type']}, reason={r['reason']}, confidence={r['confidence']}"
        )
    return "\n".join(lines)


def _build_user_prompt(ctx: dict, sample_df) -> str:
    few_shot = _few_shot_block(sample_df)
    context_json = json.dumps(ctx, indent=2, default=str)
    return (
        f"{few_shot}\n\n"
        f"Now classify this message. Context:\n{context_json}\n\n"
        "Return only the JSON object described in the system prompt."
    )


def _extract_json(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```(json)?", "", raw).strip()
    raw = re.sub(r"```$", "", raw).strip()
    match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
    if not match:
        raise InvalidLLMResponseError(f"No JSON object found in LLM response: {raw[:300]!r}")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise InvalidLLMResponseError(f"Malformed JSON from LLM: {exc}. Raw: {raw[:300]!r}") from exc


def _validate(decision: dict) -> dict:
    action = str(decision.get("action", "")).strip().lower()
    message_type = str(decision.get("message_type", "")).strip().lower()
    reason = str(decision.get("reason", "")).strip()

    try:
        confidence = float(decision.get("confidence"))
    except (TypeError, ValueError):
        raise InvalidLLMResponseError(f"Non-numeric confidence from LLM: {decision.get('confidence')!r}")
    confidence = max(0.0, min(1.0, confidence))

    evidence = decision.get("evidence_message_ids", "none")
    if isinstance(evidence, list):
        evidence = ";".join(str(e) for e in evidence) if evidence else "none"
    evidence = str(evidence).strip() or "none"

    if action not in config.ALLOWED_ACTIONS:
        raise InvalidLLMResponseError(f"Invalid action from LLM: {action!r}")
    if message_type not in config.ALLOWED_MESSAGE_TYPES:
        raise InvalidLLMResponseError(f"Invalid message_type from LLM: {message_type!r}")
    if not reason:
        raise InvalidLLMResponseError("LLM returned an empty reason.")

    return {
        "action": action,
        "message_type": message_type,
        "reason": reason,
        "confidence": round(confidence, 2),
        "evidence_message_ids": evidence,
    }


@retry(
    reraise=True,
    stop=stop_after_attempt(config.LLM_MAX_ATTEMPTS),
    wait=wait_exponential(
        multiplier=config.LLM_RETRY_MIN_WAIT_SECONDS,
        max=config.LLM_RETRY_MAX_WAIT_SECONDS,
    ),
    retry=retry_if_exception_type((SarvamAPIError, InvalidLLMResponseError)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
def _call_sarvam(ctx: dict, sample_df) -> dict:
    client = _get_client()
    user_prompt = _build_user_prompt(ctx, sample_df)

    estimated_tokens = (len(SYSTEM_PROMPT) + len(user_prompt)) // 4
    if estimated_tokens + config.LLM_MAX_TOKENS > config.LLM_MAX_TOKENS_LIMIT:
        raise InvalidLLMResponseError(
            f"Prompt too large ({estimated_tokens} estimated tokens) for message_id={ctx.get('message_id')}; "
            "skipping instead of retrying a request that will always fail."
        )

    try:
        response = client.chat.completions(
            model=config.REASONING_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=config.LLM_TEMPERATURE,
            max_tokens=config.LLM_MAX_TOKENS,
            reasoning_effort=None,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        raise SarvamAPIError(f"Sarvam-105B call failed: {exc}") from exc

    try:
        raw_text = response.choices[0].message.content
    except (AttributeError, IndexError) as exc:
        raise InvalidLLMResponseError(f"Unexpected Sarvam response shape: {exc}") from exc

    decision = _extract_json(raw_text)
    return _validate(decision)


def classify(ctx: dict, sample_df=None) -> RoutingDecision:
    decision = _call_sarvam(ctx, sample_df)
    return RoutingDecision(message_id=ctx["message_id"], **decision)