from __future__ import annotations

import logging
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Optional

import httpx
from mutagen import File as MutagenFile
from PIL import Image
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
def batch_transcribe_audio(file_path: Path) -> str:
    client = _get_client()
    try:
        init_response = client.speech_to_text_job.initialise(
            job_parameters={
                "language_code": getattr(config, "STT_LANGUAGE", "unknown"),
                "model": config.STT_MODEL,
                "mode": "transcribe",
            }
        )
        job_id = init_response.job_id

        filename = file_path.name
        upload_response = client.speech_to_text_job.get_upload_links(
            job_id=job_id, files=[filename]
        )
        file_details = upload_response.upload_urls.get(filename)
        if not file_details:
            raise MediaProcessingError(f"No upload URL returned for {filename}")
        upload_url = file_details.file_url

        with open(file_path, "rb") as f:
            file_data = f.read()
        put_resp = httpx.put(
            upload_url,
            content=file_data,
            headers={
                "Content-Type": "audio/mpeg",
                "x-ms-blob-type": "BlockBlob",
            },
            timeout=300.0,
        )
        put_resp.raise_for_status()

        client.speech_to_text_job.start(job_id=job_id)

        elapsed = 0
        status = None
        while elapsed < config.BATCH_STT_MAX_POLL_SECONDS:
            status = client.speech_to_text_job.get_status(job_id=job_id)
            if status.job_state in ("Completed", "Failed"):
                break
            time.sleep(config.BATCH_STT_POLL_INTERVAL_SECONDS)
            elapsed += config.BATCH_STT_POLL_INTERVAL_SECONDS

        if status is None or status.job_state != "Completed":
            raise MediaProcessingError(
                f"Batch STT job {job_id} did not complete successfully "
                f"(state={getattr(status, 'job_state', 'unknown')}) for {file_path}"
            )

        output_filename = None
        for detail in status.job_details or []:
            for output in detail.outputs or []:
                output_filename = output.file_name
                break
            if output_filename:
                break
        if not output_filename:
            raise MediaProcessingError(f"Batch STT job {job_id} completed but produced no output file")

        download_response = client.speech_to_text_job.get_download_links(
            job_id=job_id, files=[output_filename]
        )
        download_details = download_response.download_urls.get(output_filename)
        if not download_details:
            raise MediaProcessingError(f"No download URL returned for {output_filename}")

        result = httpx.get(download_details.file_url, timeout=60.0)
        result.raise_for_status()
        transcript_data = result.json()
        logger.debug("Batch STT raw output for %s: %s", file_path, transcript_data)
        transcript = (transcript_data.get("transcript") or "").strip()

        if not transcript:
            raise MediaProcessingError(f"Batch STT returned an empty transcript for {file_path}")
        return transcript

    except MediaProcessingError:
        raise
    except Exception as exc:
        raise MediaProcessingError(f"Batch STT transcription failed for {file_path}: {exc}") from exc

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
        use_batch = duration is not None and duration > config.MAX_REALTIME_AUDIO_SECONDS

        try:
            if use_batch:
                logger.info(
                    "Audio %s is %.1fs, exceeds the %ds real-time limit — using Batch STT.",
                    full_path, duration, config.MAX_REALTIME_AUDIO_SECONDS,
                )
                return batch_transcribe_audio(full_path), "ok"
            return transcribe_audio(full_path), "ok"
        except MediaProcessingError:
            logger.exception("Giving up on audio transcription for %s", full_path)
            return None, "unavailable"

    logger.warning("Unrecognized media_type=%r for media_id=%s", media_type, media_id)
    return None, "not_applicable"