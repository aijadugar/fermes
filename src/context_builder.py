from __future__ import annotations

from datetime import datetime, time
from typing import Optional

from . import config
from .media_processor import resolve_media_text


def _to_int(v, default=0):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


def _parse_dnd(window: str, at: datetime) -> Optional[bool]:
    if not window or "-" not in window:
        return None
    try:
        start_s, end_s = window.split("-")
        start_h, start_m = [int(x) for x in start_s.split(":")]
        end_h, end_m = [int(x) for x in end_s.split(":")]
        start_t, end_t = time(start_h, start_m), time(end_h, end_m)
        cur_t = at.time()
        if start_t <= end_t:
            return start_t <= cur_t <= end_t
        return cur_t >= start_t or cur_t <= end_t
    except Exception:
        return None


def build_context(msg_row: dict, dataset) -> dict:
    message_id = msg_row.get("message_id")
    user_id = msg_row.get("user_id")
    conversation_type = (msg_row.get("conversation_type") or "").strip()
    group_id = (msg_row.get("group_id") or "").strip()
    business_id = (msg_row.get("business_id") or "").strip()
    sender_user_id = (msg_row.get("sender_user_id") or "").strip()
    created_at_raw = (msg_row.get("created_at") or "").strip()
    message_text = (msg_row.get("message_text") or "").strip()
    media_type = (msg_row.get("media_type") or "").strip()
    media_id = (msg_row.get("media_id") or "").strip()
    forwarded_count = _to_int(msg_row.get("forwarded_count"), 0)

    try:
        created_at = datetime.strptime(created_at_raw, "%Y-%m-%d %H:%M")
    except Exception:
        created_at = None

    media_text, media_status = resolve_media_text(media_type, media_id, dataset)
    effective_text = message_text
    if media_text:
        effective_text = (effective_text + "\n" + media_text).strip()

    user = dataset.user(user_id) or {}
    dnd_window = user.get("do_not_disturb_window", "")
    in_dnd = _parse_dnd(dnd_window, created_at) if created_at else None
    opened = _to_int(user.get("messages_opened_30d"))
    replied = _to_int(user.get("messages_replied_30d"))
    dismissed = _to_int(user.get("notifications_dismissed_30d"))
    reported = _to_int(user.get("messages_reported_30d"))
    engagement_rate = round(opened / max(opened + dismissed, 1), 2)

    group = dataset.group(group_id) if group_id else None
    member = dataset.group_member(group_id, user_id) if group_id else None
    is_admin_sender = False
    if group_id and sender_user_id:
        sender_membership = dataset.group_member(group_id, sender_user_id)
        if sender_membership and sender_membership.get("role") == "admin":
            is_admin_sender = True
    group_muted = bool(member and str(member.get("group_muted_by_user")) == "1")
    directly_mentioned = f"@{user_id}" in message_text

    business = dataset.business(business_id) if business_id else None
    relationship = dataset.user_business_relationship(user_id, business_id) if business_id else None
    verified_business = bool(business and str(business.get("verified")) == "1")
    promotions_opted_out = bool(relationship and relationship.get("promotions_opted_out_at"))
    allows_promotions = bool(relationship and str(relationship.get("allows_promotions")) == "1")

    same_sender_history = dataset.history_from_sender(
        user_id, sender_user_id=sender_user_id or None, business_id=business_id or None
    )
    evidence_ids = list(same_sender_history["message_id"]) if len(same_sender_history) else []

    reported_precedent_ids = []
    if len(same_sender_history):
        for _, hist_row in same_sender_history.iterrows():
            ev = dataset.events_for_message(user_id, hist_row["message_id"])
            if ev and (str(ev.get("message_reported")) == "1" or str(ev.get("notification_dismissed")) == "1"):
                reported_precedent_ids.append(hist_row["message_id"])

    scam_like_precedent_ids = []
    scam_terms = ("otp", "reattempt", "verification", "qr", "clearance", "blocked", "suspend")
    hist_df = dataset.message_history
    if len(hist_df):
        text_col = hist_df["message_text"].str.lower()
        mask = text_col.apply(lambda t: any(term in t for term in scam_terms))
        scam_like_precedent_ids = list(hist_df[mask]["message_id"])

    text_lower = effective_text.lower()
    hits_scam_keywords = [k for k in config.SCAM_KEYWORDS if k in text_lower]
    hits_forward_chain_keywords = [k for k in config.FORWARD_CHAIN_KEYWORDS if k in text_lower]
    hits_promo_keywords = [k for k in config.PROMO_KEYWORDS if k in text_lower]

    daily = dataset.daily_load(user_id)
    recent_notif_load = None
    if len(daily):
        recent_notif_load = round(daily["notifications_sent"].astype(float).tail(7).mean(), 1)

    context = {
        "message_id": message_id,
        "user_id": user_id,
        "conversation_type": conversation_type,
        "group_id": group_id,
        "business_id": business_id,
        "sender_user_id": sender_user_id,
        "created_at": created_at_raw,
        "message_text": message_text,
        "media_type": media_type,
        "media_id": media_id,
        "media_status": media_status,
        "media_extracted_text": media_text,
        "effective_text": effective_text,
        "forwarded_count": forwarded_count,

        "user_dnd_window": dnd_window,
        "in_dnd_window": in_dnd,
        "user_engagement_rate": engagement_rate,
        "user_messages_opened_30d": opened,
        "user_messages_replied_30d": replied,
        "user_notifications_dismissed_30d": dismissed,
        "user_messages_reported_30d": reported,

        "group_name": (group or {}).get("group_name"),
        "group_type": (group or {}).get("group_type"),
        "group_member_count": (group or {}).get("member_count"),
        "group_is_admin_sender": is_admin_sender,
        "group_muted_by_user": group_muted,
        "user_directly_mentioned": directly_mentioned,

        "business_display_name": (business or {}).get("display_name"),
        "business_category": (business or {}).get("category"),
        "business_verified": verified_business,
        "business_account_age_days": (business or {}).get("account_age_days"),
        "business_user_reports_30d": (business or {}).get("user_reports_30d"),
        "business_known_to_dataset": business is not None,

        "user_business_relationship": (relationship or {}).get("why_user_knows_account"),
        "user_business_last_activity_at": (relationship or {}).get("last_activity_at"),
        "user_business_allows_promotions": allows_promotions,
        "user_business_promotions_opted_out": promotions_opted_out,
        "user_business_activity_count_180d": (relationship or {}).get("activity_count_180d"),

        "hits_scam_keywords": hits_scam_keywords,
        "hits_forward_chain_keywords": hits_forward_chain_keywords,
        "hits_promo_keywords": hits_promo_keywords,
        "forwarded_widely": forwarded_count >= 3,

        "same_sender_history_count": len(same_sender_history),
        "same_sender_history_ids": evidence_ids,
        "reported_or_dismissed_precedent_ids": reported_precedent_ids,
        "scam_like_precedent_ids": scam_like_precedent_ids,

        "recent_avg_daily_notifications": recent_notif_load,
    }
    return context