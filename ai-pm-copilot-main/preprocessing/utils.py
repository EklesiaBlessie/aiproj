"""
utils.py
---------
Common helper functions used throughout preprocessing.
"""

import logging
from pathlib import Path


def create_directories(paths):
    """
    Create directories if they do not exist.
    """
    for path in paths:
        Path(path).mkdir(parents=True, exist_ok=True)


def setup_logger():

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s"
    )

    return logging.getLogger("DataEngineering")


logger = setup_logger()