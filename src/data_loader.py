from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import pandas as pd

from . import config


def _read_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path, sep=None, engine="python", dtype=str, keep_default_na=False)


@dataclass
class Dataset:
    messages: pd.DataFrame
    sample_messages: pd.DataFrame
    users: pd.DataFrame
    groups: pd.DataFrame
    group_members: pd.DataFrame
    business_accounts: pd.DataFrame
    user_business_history: pd.DataFrame
    message_history: pd.DataFrame
    message_events: pd.DataFrame
    images: pd.DataFrame
    voice_notes: pd.DataFrame
    daily_notification_summary: pd.DataFrame

    def user(self, user_id: str) -> Optional[dict]:
        df = self.users
        row = df[df["user_id"] == user_id]
        return row.iloc[0].to_dict() if len(row) else None

    def group(self, group_id: str) -> Optional[dict]:
        df = self.groups
        row = df[df["group_id"] == group_id]
        return row.iloc[0].to_dict() if len(row) else None

    def group_member(self, group_id: str, user_id: str) -> Optional[dict]:
        df = self.group_members
        row = df[(df["group_id"] == group_id) & (df["user_id"] == user_id)]
        return row.iloc[0].to_dict() if len(row) else None

    def business(self, business_id: str) -> Optional[dict]:
        df = self.business_accounts
        row = df[df["business_id"] == business_id]
        return row.iloc[0].to_dict() if len(row) else None

    def user_business_relationship(self, user_id: str, business_id: str) -> Optional[dict]:
        df = self.user_business_history
        row = df[(df["user_id"] == user_id) & (df["business_id"] == business_id)]
        return row.iloc[0].to_dict() if len(row) else None

    def history_for_user(self, user_id: str) -> pd.DataFrame:
        df = self.message_history
        if "user_id" not in df.columns:
            return df
        return df[df["user_id"] == user_id]

    def history_from_sender(self, user_id: str, sender_user_id: str = None, business_id: str = None) -> pd.DataFrame:
        df = self.history_for_user(user_id)
        if sender_user_id:
            df = df[df["sender_user_id"] == sender_user_id]
        elif business_id:
            df = df[df["business_id"] == business_id]
        return df

    def events_for_message(self, user_id: str, message_id: str) -> Optional[dict]:
        df = self.message_events
        row = df[(df["user_id"] == user_id) & (df["message_id"] == message_id)]
        return row.iloc[0].to_dict() if len(row) else None

    def image_path(self, image_id: str) -> Optional[str]:
        df = self.images
        row = df[df["image_id"] == image_id]
        return row.iloc[0]["file_path"] if len(row) else None

    def voice_note_path(self, voice_note_id: str) -> Optional[str]:
        df = self.voice_notes
        row = df[df["voice_note_id"] == voice_note_id]
        return row.iloc[0]["file_path"] if len(row) else None

    def daily_load(self, user_id: str) -> pd.DataFrame:
        df = self.daily_notification_summary
        if "user_id" not in df.columns:
            return df
        return df[df["user_id"] == user_id]


def load_dataset(dataset_dir: Path = config.DATASET_DIR) -> Dataset:
    return Dataset(
        messages=_read_csv(dataset_dir / "messages.csv"),
        sample_messages=_read_csv(dataset_dir / "sample_messages.csv"),
        users=_read_csv(dataset_dir / "users.csv"),
        groups=_read_csv(dataset_dir / "groups.csv"),
        group_members=_read_csv(dataset_dir / "group_members.csv"),
        business_accounts=_read_csv(dataset_dir / "business_accounts.csv"),
        user_business_history=_read_csv(dataset_dir / "user_business_history.csv"),
        message_history=_read_csv(dataset_dir / "message_history.csv"),
        message_events=_read_csv(dataset_dir / "message_events.csv"),
        images=_read_csv(dataset_dir / "images.csv"),
        voice_notes=_read_csv(dataset_dir / "voice_notes.csv"),
        daily_notification_summary=_read_csv(dataset_dir / "daily_notification_summary.csv"),
    )