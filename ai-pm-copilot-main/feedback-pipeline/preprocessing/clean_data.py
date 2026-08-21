"""
clean_data.py
----------------------------------------
Clean the validated feedback dataset.

Author : Sarayu
Project : AI Product Manager Copilot
"""

import re
import logging
from pathlib import Path

import pandas as pd

# -----------------------------------------------------
# Logging
# -----------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger("Cleaning")

# -----------------------------------------------------
# Paths
# -----------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = PROJECT_ROOT / "dataset" / "processed" / "validated_feedback.csv"

OUTPUT_DIR = PROJECT_ROOT / "dataset" / "processed"

REPORT_DIR = PROJECT_ROOT / "reports"

OUTPUT_DIR.mkdir(exist_ok=True)
REPORT_DIR.mkdir(exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "cleaned_feedback.csv"

REPORT_FILE = REPORT_DIR / "cleaning_report.txt"

# -----------------------------------------------------
# Cleaning Helpers
# -----------------------------------------------------

def remove_html(text):
    if pd.isna(text):
        return ""
    return re.sub(r"<[^>]*>", "", str(text))


def remove_urls(text):
    if pd.isna(text):
        return ""
    return re.sub(r"http\\S+|www\\S+", "", str(text))


def remove_emojis(text):
    if pd.isna(text):
        return ""

    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002700-\U000027BF"
        "]+",
        flags=re.UNICODE,
    )

    return emoji_pattern.sub("", str(text))


def remove_extra_spaces(text):
    if pd.isna(text):
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


# -----------------------------------------------------
# Main Cleaning
# -----------------------------------------------------

def clean_dataset():

    logger.info("Reading validated dataset...")

    df = pd.read_csv(INPUT_FILE)

    original_rows = len(df)

    logger.info(f"Rows Loaded : {original_rows}")

    # -----------------------------------------
    # Remove duplicate rows
    # -----------------------------------------

    duplicate_rows = df.duplicated().sum()

    df = df.drop_duplicates()

    # -----------------------------------------
    # Remove duplicate feedback ids
    # -----------------------------------------

    duplicate_ids = 0

    if "feedback_id" in df.columns:

        # Only count/drop duplicates among non-null and non-empty feedback_id values
        valid_ids = df["feedback_id"].dropna().astype(str).str.strip()
        valid_ids = valid_ids[valid_ids != ""]

        duplicate_mask = df["feedback_id"].isin(valid_ids[valid_ids.duplicated()])
        # Keep first occurrence of each valid feedback_id, keep all rows with missing feedback_id
        is_dup = df["feedback_id"].duplicated(keep="first") & df["feedback_id"].notna() & (df["feedback_id"].astype(str).str.strip() != "")
        duplicate_ids = is_dup.sum()

        df = df[~is_dup]

    # -----------------------------------------
    # Clean feedback text
    # -----------------------------------------

    if "feedback_text" in df.columns:

        df["feedback_text"] = (
            df["feedback_text"]
            .fillna("")
            .apply(remove_html)
            .apply(remove_urls)
            .apply(remove_emojis)
            .apply(remove_extra_spaces)
        )

        before_blank = len(df)

        df = df[
            df["feedback_text"].str.strip() != ""
        ]

        removed_blank = before_blank - len(df)

    else:

        removed_blank = 0

    # -----------------------------------------
    # Remove fully empty rows
    # -----------------------------------------

    before_empty = len(df)

    df = df.dropna(how="all")

    removed_empty_rows = before_empty - len(df)

    # -----------------------------------------
    # Save
    # -----------------------------------------

    df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    final_rows = len(df)

    # -----------------------------------------
    # Report
    # -----------------------------------------

    with open(REPORT_FILE, "w", encoding="utf-8") as report:

        report.write("="*60 + "\n")
        report.write("CLEANING REPORT\n")
        report.write("="*60 + "\n\n")

        report.write(f"Original Rows              : {original_rows}\n")
        report.write(f"Duplicate Rows Removed     : {duplicate_rows}\n")
        report.write(f"Duplicate IDs Removed      : {duplicate_ids}\n")
        report.write(f"Blank Feedback Removed     : {removed_blank}\n")
        report.write(f"Empty Rows Removed         : {removed_empty_rows}\n")
        report.write(f"Final Rows                 : {final_rows}\n")

    logger.info("="*60)
    logger.info("Cleaning Completed Successfully")
    logger.info(f"Rows Remaining : {final_rows}")
    logger.info(f"Output Saved   : {OUTPUT_FILE}")
    logger.info("="*60)


# -----------------------------------------------------
# Run
# -----------------------------------------------------

if __name__ == "__main__":
    clean_dataset()