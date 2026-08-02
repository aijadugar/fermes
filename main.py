from __future__ import annotations

import argparse
import csv
import logging
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from src import config
from src.data_loader import load_dataset
from src.context_builder import build_context
from src.llm_router import classify, RouterError, RoutingDecision

logger = logging.getLogger("router")

OUTPUT_COLUMNS = ["message_id", "action", "message_type", "reason", "confidence", "evidence_message_ids"]


def _configure_logging(verbose: bool) -> None:
    logging.basicConfig(level=logging.DEBUG if verbose else logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s", datefmt="%H:%M:%S")

def _route_one(msg_row: dict, dataset, sample_df) -> RoutingDecision:
    ctx = build_context(msg_row, dataset)
    return classify(ctx, sample_df=sample_df)


def run(dataset_dir: Path, output_path: Path, limit: int | None = None, max_workers: int = config.DEFAULT_MAX_WORKERS, allow_partial: bool = False) -> int:

    config.require_api_key()
    dataset = load_dataset(dataset_dir)

    if not len(dataset.messages):
        logger.error("No messages found at %s/messages.csv", dataset_dir)
        return 2

    rows = dataset.messages.to_dict("records")
    if limit:
        rows = rows[:limit]

    logger.info("Routing %d message(s) via Sarvam-105B (workers=%d)...", len(rows), max_workers)

    decisions: dict[str, RoutingDecision] = {}
    failures: dict[str, str] = {}

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        future_to_id = {
            pool.submit(_route_one, row, dataset, dataset.sample_messages): row["message_id"]
            for row in rows
        }
        completed = 0
        for future in as_completed(future_to_id):
            message_id = future_to_id[future]
            completed += 1
            try:
                decision = future.result()
                decisions[message_id] = decision
                logger.info(
                    "[%d/%d] %s -> action=%s type=%s confidence=%.2f",
                    completed, len(rows), message_id, decision.action, decision.message_type, decision.confidence,
                )
            except RouterError as exc:
                failures[message_id] = str(exc)
                logger.error("[%d/%d] %s -> FAILED: %s", completed, len(rows), message_id, exc)

    if failures:
        logger.warning(
            "%d/%d message(s) failed to classify after retries: %s",
            len(failures), len(rows), ", ".join(failures),
        )
        if not allow_partial:
            logger.error(
                "Refusing to write a partial output.csv (missing %d row(s)). "
                "Re-run with --allow-partial to write successes only, or fix the "
                "underlying API/config issue and re-run.",
                len(failures),
            )
            return 1

    ordered_results = [
        decisions[row["message_id"]].as_row()
        for row in rows
        if row["message_id"] in decisions
    ]
    write_output(ordered_results, output_path)
    logger.info("Wrote %d/%d row(s) to %s", len(ordered_results), len(rows), output_path)

    return 1 if failures else 0


def write_output(results: list[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_COLUMNS, delimiter="\t")
        writer.writeheader()
        for r in results:
            writer.writerow({col: r.get(col, "") for col in OUTPUT_COLUMNS})


def parse_args(argv=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Message Notification Router (Sarvam-105B powered)")
    p.add_argument("--dataset-dir", type=Path, default=config.DATASET_DIR, help="Directory containing messages.csv and reference tables")
    p.add_argument("--output", type=Path, default=config.OUTPUT_PATH, help="Where to write predictions")
    p.add_argument("--limit", type=int, default=None, help="Only process the first N messages (debugging)")
    p.add_argument("--workers", type=int, default=config.DEFAULT_MAX_WORKERS, help="Concurrent Sarvam API calls")
    p.add_argument("--allow-partial", action="store_true", help="Write output.csv with successful rows even if some messages fail")
    p.add_argument("--verbose", action="store_true", help="Debug-level logging")
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    _configure_logging(args.verbose)
    try:
        return run(
            dataset_dir=args.dataset_dir,
            output_path=args.output,
            limit=args.limit,
            max_workers=args.workers,
            allow_partial=args.allow_partial,
        )
    except config.ConfigurationError as exc:
        logger.error(str(exc))
        return 2


if __name__ == "__main__":
    sys.exit(main())