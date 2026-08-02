from __future__ import annotations

import logging
import tempfile
import zipfile
from pathlib import Path
from typing import Optional

from PIL import Image
from mutagen import File as MutagenFile
from tenacity import retry, stop_after_attempt, wait_exponential, before_sleep_log, retry_if_exception

from . import config

logger = logging.getLogger(__name__)

_client = None


class MediaProcessingError(RuntimeError):
    """Raised when a Sarvam media API call fails after retries."""


def _get_client():
    global _client
    if _client is None:
        config.require_api_key()
        from sarvamai import SarvamAI
        _client = SarvamAI(api_subscription_key=config.SARVAM_API_KEY)
    return _client

def _get_audio_duration_seconds(file_path: Path) -> Optional[float]:
    try:
        audio = MutagenFile(str(file_path))
        if audio is not None and audio.info is not None:
            return float(audio.info.length)
    except Exception as exc:
        logger.warning("Could not read audio duration for %s: %s", file_path, exc)
    return None

def _is_retryable_media_error(exc: BaseException) -> bool:
    if isinstance(exc, MediaProcessingError) and "exceeds the maximum limit" in str(exc):
        return False
    return True

def _normalize_to_jpeg(file_path: Path) -> tuple[Path, bool]:
    try:
        with Image.open(file_path) as img:
            if img.format == "JPEG":
                return file_path, False

            logger.info(
                "File %s has .jpg extension but is actually %s — converting.",
                file_path, img.format,
            )
            rgb = img.convert("RGB")
            tmp_path = Path(tempfile.mktemp(suffix=".jpg"))
            rgb.save(tmp_path, format="JPEG", quality=95)
            return tmp_path, True
    except Exception as exc:
        raise MediaProcessingError(
            f"Could not open/normalize image {file_path}: {exc}"
        ) from exc

@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, max=10),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    retry=retry_if_exception(_is_retryable_media_error),
)
def transcribe_audio(file_path: Path) -> str:
    client = _get_client()
    try:
        with open(file_path, "rb") as f:
            response = client.speech_to_text.transcribe(
                file=f,
                model=config.STT_MODEL,
                mode="transcribe",
            )
        transcript = (response.transcript or "").strip()
        if not transcript:
            raise MediaProcessingError(f"Saaras v3 returned an empty transcript for {file_path}")
        return transcript
    except MediaProcessingError:
        raise
    except Exception as exc:
        raise MediaProcessingError(f"Saaras v3 transcription failed for {file_path}: {exc}") from exc


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, max=10),
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
def extract_image_text(file_path: Path) -> str:
    client = _get_client()
    upload_path, is_temp = _normalize_to_jpeg(file_path)
    try:
        job = client.document_intelligence.create_job(
            language=config.VISION_LANGUAGE,
            output_format=config.VISION_OUTPUT_FORMAT,
        )
        job.upload_file(str(upload_path))
        job.start()
        job.wait_until_complete()

        out_zip = file_path.with_suffix(".vision_output.zip")
        job.download_output(str(out_zip))

        text_parts = []
        with zipfile.ZipFile(out_zip) as zf:
            for name in zf.namelist():
                if name.lower().endswith((".md", ".txt")):
                    text_parts.append(zf.read(name).decode("utf-8", errors="ignore"))
        text = "\n".join(text_parts).strip()
        if not text:
            raise MediaProcessingError(f"Sarvam Vision returned no extractable text for {file_path}")
        return text
    except MediaProcessingError:
        raise
    except Exception as exc:
        raise MediaProcessingError(f"Sarvam Vision extraction failed for {file_path}: {exc}") from exc
    finally:
        if is_temp:
            upload_path.unlink(missing_ok=True)

def resolve_media_text(media_type: str, media_id: str, dataset) -> tuple[Optional[str], str]:
    media_type = (media_type or "").strip().lower()
    media_id = (media_id or "").strip()

    if not media_type or not media_id:
        return None, "not_applicable"

    if media_type in ("image", "photo", "poster", "screenshot"):
        rel_path = dataset.image_path(media_id)
        if not rel_path:
            logger.warning("No image_path found for media_id=%s", media_id)
            return None, "unavailable"
        full_path = config.DATASET_DIR / rel_path
        if not full_path.exists():
            logger.warning("Image file missing on disk: %s", full_path)
            return None, "unavailable"
        try:
            return extract_image_text(full_path), "ok"
        except MediaProcessingError:
            logger.exception("Giving up on image extraction for %s", full_path)
            return None, "unavailable"

    if media_type in ("audio", "voice", "voice_note", "voicenote"):
        rel_path = dataset.voice_note_path(media_id)
        if not rel_path:
            logger.warning("No voice_note_path found for media_id=%s", media_id)
            return None, "unavailable"
        full_path = config.DATASET_DIR / rel_path
        if not full_path.exists():
            logger.warning("Audio file missing on disk: %s", full_path)
            return None, "unavailable"

        duration = _get_audio_duration_seconds(full_path)
        if duration is not None and duration > config.MAX_REALTIME_AUDIO_SECONDS:
            logger.warning(
                "Audio %s is %.1fs, exceeds the %ds real-time API limit — "
                "skipping transcription (batch API not implemented).",
                full_path, duration, config.MAX_REALTIME_AUDIO_SECONDS,
            )
            return None, "unavailable"

        try:
            return transcribe_audio(full_path), "ok"
        except MediaProcessingError:
            logger.exception("Giving up on audio transcription for %s", full_path)
            return None, "unavailable"

    logger.warning("Unrecognized media_type=%r for media_id=%s", media_type, media_id)
    return None, "not_applicable"