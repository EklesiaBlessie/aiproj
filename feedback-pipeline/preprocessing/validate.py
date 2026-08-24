"""
validate.py
------------------------
Validates the merged raw feedback dataset.
"""

import logging
from pathlib import Path
import pandas as pd

# -----------------------------
# Logging
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

RAW_FILE = PROJECT_ROOT / "dataset" / "raw" / "raw_feedback.csv"

PROCESSED_DIR = PROJECT_ROOT / "dataset" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = PROCESSED_DIR / "validated_feedback.csv"

REPORT_FILE = PROJECT_ROOT / "reports" / "validation_report.txt"
REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)


# -----------------------------
# Validation
# -----------------------------
def validate_dataset():

    logger.info("Reading raw dataset...")

    df = pd.read_csv(RAW_FILE)

    total_records = len(df)

    # -------------------------
    # Missing Values
    # -------------------------

    missing_values = df.isnull().sum()

    # -------------------------
    # Duplicate Rows
    # -------------------------

    duplicate_rows = df.duplicated().sum()

    # -------------------------
    # Duplicate Feedback IDs
    # -------------------------

    if "feedback_id" in df.columns:
        duplicate_feedback_ids = df["feedback_id"].duplicated().sum()
    else:
        duplicate_feedback_ids = 0

    # -------------------------
    # Invalid Ratings
    # -------------------------

    invalid_ratings = 0

    if "rating" in df.columns:

        invalid_ratings = (
            ~df["rating"]
            .fillna(0)
            .astype(str)
            .str.replace(".0", "", regex=False)
            .isin(["1", "2", "3", "4", "5", "0"])
        ).sum()

    # -------------------------
    # Empty Feedback
    # -------------------------

    empty_feedback = 0

    if "feedback_text" in df.columns:

        empty_feedback = (
            df["feedback_text"]
            .fillna("")
            .str.strip()
            .eq("")
            .sum()
        )

    # -------------------------
    # Date Validation
    # -------------------------

    invalid_dates = 0

    if "created_date" in df.columns:

        converted = pd.to_datetime(
            df["created_date"],
            errors="coerce"
        )

        invalid_dates = converted.isna().sum()

    # -------------------------
    # Save Dataset
    # -------------------------

    df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    # -------------------------
    # Report
    # -------------------------

    with open(REPORT_FILE, "w", encoding="utf-8") as report:

        report.write("=" * 50 + "\n")
        report.write("VALIDATION REPORT\n")
        report.write("=" * 50 + "\n\n")

        report.write(f"Total Records : {total_records}\n\n")

        report.write(f"Duplicate Rows : {duplicate_rows}\n")
        report.write(f"Duplicate Feedback IDs : {duplicate_feedback_ids}\n")
        report.write(f"Invalid Ratings : {invalid_ratings}\n")
        report.write(f"Invalid Dates : {invalid_dates}\n")
        report.write(f"Empty Feedback : {empty_feedback}\n\n")

        report.write("Missing Values\n")
        report.write("-" * 40 + "\n")

        for col, value in missing_values.items():

            report.write(f"{col:25} : {value}\n")

    logger.info("=" * 50)
    logger.info("Validation Completed")
    logger.info(f"Validated Dataset : {OUTPUT_FILE}")
    logger.info(f"Validation Report : {REPORT_FILE}")
    logger.info("=" * 50)


# -----------------------------
# Main
# -----------------------------
if __name__ == "__main__":
    validate_dataset()