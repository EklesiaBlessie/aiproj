"""
collect_data.py
-----------------------
Reads all source CSV files, standardizes them,
merges them into a single raw_feedback.csv.
"""

import os
import pandas as pd
import logging
from pathlib import Path

# -----------------------------
# Logging Configuration
# -----------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger(__name__)

# -----------------------------
# Paths
# -----------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent

SOURCE_FOLDER = PROJECT_ROOT / "dataset" / "source_data"
RAW_FOLDER = PROJECT_ROOT / "dataset" / "raw"

RAW_FOLDER.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = RAW_FOLDER / "raw_feedback.csv"

# -----------------------------
# Source Files
# -----------------------------
FILES = [
    "google_reviews.csv",
    "zomato_reviews.csv",
    "swiggy_reviews.csv",
    "uber_eats_reviews.csv",
    "customer_surveys.csv",
    "support_tickets.csv",
    "customer_emails.csv",
    "feature_requests.csv",
    "walkin_feedback.csv",
    "social_media_feedback.csv"
]

# -----------------------------
# Standard Columns
# -----------------------------
STANDARD_COLUMNS = [
    "feedback_id",
    "customer_id",
    "restaurant_id",
    "restaurant_name",
    "feedback_text",
    "rating",
    "source",
    "created_date",
    "city",
    "language"
]


# -----------------------------
# Read CSV
# -----------------------------
def load_csv(file_path):

    try:

        df = pd.read_csv(file_path)

        logger.info(f"Loaded {file_path.name} ({len(df)} rows)")

        return df

    except Exception as e:

        logger.error(f"Failed to read {file_path.name}")

        logger.error(e)

        return None


# -----------------------------
# Standardize Columns
# -----------------------------
def standardize_columns(df):

    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
    )

    # Rename common variations
    rename_map = {
        "review": "feedback_text",
        "review_text": "feedback_text",
        "text": "feedback_text",
        "date": "created_date"
    }

    df.rename(columns=rename_map, inplace=True)

    # Add missing columns
    for col in STANDARD_COLUMNS:

        if col not in df.columns:

            df[col] = pd.NA

    # Reorder
    df = df[STANDARD_COLUMNS + [
        c for c in df.columns
        if c not in STANDARD_COLUMNS
    ]]

    return df


# -----------------------------
# Merge Files
# -----------------------------
def merge_all():

    merged = []

    total = 0

    for file in FILES:

        path = SOURCE_FOLDER / file

        if not path.exists():

            logger.warning(f"{file} not found")

            continue

        df = load_csv(path)

        if df is None:

            continue

        df = standardize_columns(df)

        merged.append(df)

        total += len(df)

    if len(merged) == 0:

        logger.error("No CSV files found.")

        return

    final_df = pd.concat(
        merged,
        ignore_index=True
    )

    final_df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    logger.info("=" * 50)

    logger.info(f"Total Source Files : {len(merged)}")

    logger.info(f"Total Records      : {total}")

    logger.info(f"Raw Dataset Saved  : {OUTPUT_FILE}")

    logger.info("=" * 50)


# -----------------------------
# Main
# -----------------------------
if __name__ == "__main__":

    merge_all()