import logging

from pathlib import Path

from datetime import datetime

from zoneinfo import ZoneInfo

LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

TIMEZONE = ZoneInfo("Europe/Sofia")

logger = logging.getLogger("mrazqJS")
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    file_handler = logging.FileHandler(
        LOG_DIR / f"{datetime.now(TIMEZONE).strftime('%Y-%m-%d_%H-%M-%S')}.log",
        encoding="utf-8"
    )

    formatter = logging.Formatter("%(asctime)s %(message)s")

    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)