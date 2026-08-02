from __future__ import annotations

import os
from pathlib import Path

# Root and Dataset
ROOT_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = ROOT_DIR / "dataset"
MEDIA_DIR = DATASET_DIR / "media"
OUTPUT_PATH = DATASET_DIR / "output.csv"


# Sarvam AI

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "").strip()

STT_MODEL = "saaras:v3"
REASONING_MODEL = "sarvam-105b"
VISION_LANGUAGE = "en-IN"
VISION_OUTPUT_FORMAT = "md"

LLM_TEMPERATURE = 0.2
LLM_MAX_TOKENS = 2000

LLM_MAX_ATTEMPTS = 4
LLM_RETRY_MIN_WAIT_SECONDS = 1.0
LLM_RETRY_MAX_WAIT_SECONDS = 12.0

DEFAULT_MAX_WORKERS = 4

ALLOWED_ACTIONS = {"notify", "digest", "mute"}
ALLOWED_MESSAGE_TYPES = {
    "personal", "urgent", "event", "payment", "business_update",
    "promotion", "greeting", "forward", "spam", "scam", "unknown",
}

SCAM_KEYWORDS = [
    "otp", "one time password", "6 digit", "6-digit", "login code",
    "verification code", "scan this qr", "scan the qr", "pay the clearance",
    "clearance amount", "reattempt fee", "reattempt charge", "account will be blocked",
    "access card may be blocked", "card will be blocked", "kyc update", "kyc expired",
    "click below to continue", "tap below to continue", "verify immediately",
    "urgent action required", "suspend your account", "account suspended",
    "winning prize", "you have won", "claim your reward", "limited time only act now",
]

FORWARD_CHAIN_KEYWORDS = [
    "forward this to", "send this to ten", "send to all", "do not ignore",
    "luck changes", "good morning", "stay positive", "share with", "blessings",
]

PROMO_KEYWORDS = [
    "sale", "discount", "offer", "% off", "cashback", "coupon", "flat off",
    "buy now", "shop now", "limited period", "deal of the day",
]


class ConfigurationError(RuntimeError):
    """Raised when required configuration (e.g. the API key) is missing."""


def require_api_key() -> str:
    """Fail fast with a clear message if SARVAM_API_KEY is not configured."""
    if not SARVAM_API_KEY:
        raise ConfigurationError(
            "SARVAM_API_KEY is not set. Export it before running, e.g.:\n"
            "    export SARVAM_API_KEY=your_key_here\n"
            "or copy API key to .env and fill it in."
        )
    return SARVAM_API_KEY