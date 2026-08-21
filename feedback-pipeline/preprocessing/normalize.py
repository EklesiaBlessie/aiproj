"""
normalize.py
-----------------------------------------
Module: Data Normalization

Normalizes:
- Dates
- Sources
- Restaurant names
- Languages
- Ratings

Input:
    dataset/processed/cleaned_feedback.csv

Output:
    dataset/processed/normalized_feedback.csv

Report:
    reports/normalization_report.txt
"""

import logging
from pathlib import Path

import pandas as pd


# ==========================================================
# CONFIGURATION
# ==========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_FILE = BASE_DIR / "dataset" / "processed" / "cleaned_feedback.csv"
OUTPUT_FILE = BASE_DIR / "dataset" / "processed" / "normalized_feedback.csv"
REPORT_FILE = BASE_DIR / "reports" / "normalization_report.txt"
LOG_FILE = BASE_DIR / "logs" / "normalize.log"

OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)


# ==========================================================
# LOGGING
# ==========================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


# ==========================================================
# NORMALIZATION MAPS
# ==========================================================

SOURCE_MAP = {

    "google": "Google",

    "google review": "Google",
    "google reviews": "Google",

    "zomato": "Zomato",

    "swiggy": "Swiggy",

    "uber eats": "Uber Eats",
    "ubereats": "Uber Eats",

    "facebook": "Facebook",

    "instagram": "Instagram",

    "tripadvisor": "TripAdvisor",
    "trip advisor": "TripAdvisor",

    "website": "Website",

    "email": "Email",

    "survey": "Survey",

    "support": "Support",

    "call": "Call",

    "walk-in": "Walk-In",
    "walk in": "Walk-In",

    "other": "Other"
}

LANGUAGE_MAP = {

    "en": "English",
    "eng": "English",
    "english": "English",

    "te": "Telugu",
    "telugu": "Telugu",

    "hi": "Hindi",
    "hindi": "Hindi",

    "ta": "Tamil",
    "tamil": "Tamil",

    "kn": "Kannada",
    "kannada": "Kannada",

    "ml": "Malayalam",
    "malayalam": "Malayalam",

    "mixed": "Mixed",

    "unknown": "Unknown"
}


# ==========================================================
# FUNCTIONS
# ==========================================================

def normalize_source(value):

    if pd.isna(value):
        return ""

    value = str(value).strip().lower()

    return SOURCE_MAP.get(value, value.title())


def normalize_language(value):

    if pd.isna(value):
        return ""

    value = str(value).strip().lower()

    return LANGUAGE_MAP.get(value, value.title())


def normalize_restaurant(value):

    if pd.isna(value):
        return ""

    value = str(value).strip()

    value = " ".join(value.split())

    return value.title()


def normalize_rating(value):

    if pd.isna(value) or str(value).strip() == "":
        return ""

    try:

        rating = float(value)

        if rating < 1:
            rating = 1

        if rating > 5:
            rating = 5

        return round(rating, 1)

    except Exception:
        return ""


def normalize_date(value):

    if pd.isna(value) or str(value).strip() == "":
        return ""

    date = pd.to_datetime(
        value,
        errors="coerce",
        dayfirst=True
    )

    if pd.isna(date):
        return ""

    return date.strftime("%Y-%m-%d")


# ==========================================================
# MAIN
# ==========================================================

def main():

    logger.info("Starting normalization process...")

    if not INPUT_FILE.exists():

        logger.error(f"Input file not found: {INPUT_FILE}")
        return

    try:

        df = pd.read_csv(INPUT_FILE)

        original_rows = len(df)

        logger.info("Dataset loaded successfully.")
        logger.info(f"Rows: {original_rows}")

    except Exception as e:

        logger.exception(f"Unable to read CSV: {e}")
        return

    date_changes = 0
    source_changes = 0
    restaurant_changes = 0
    language_changes = 0
    rating_changes = 0

    # --------------------------
    # Date
    # --------------------------

    if "created_date" in df.columns:

        old = df["created_date"].copy()

        df["created_date"] = df["created_date"].apply(normalize_date)

        date_changes = (old.astype(str) != df["created_date"].astype(str)).sum()

    # --------------------------
    # Source
    # --------------------------

    if "source" in df.columns:

        old = df["source"].copy()

        df["source"] = df["source"].apply(normalize_source)

        source_changes = (old.astype(str) != df["source"].astype(str)).sum()

    # --------------------------
    # Restaurant
    # --------------------------

    if "restaurant_name" in df.columns:

        old = df["restaurant_name"].copy()

        df["restaurant_name"] = df["restaurant_name"].apply(normalize_restaurant)

        restaurant_changes = (
            old.astype(str)
            != df["restaurant_name"].astype(str)
        ).sum()

    # --------------------------
    # Language
    # --------------------------

    if "language" in df.columns:

        old = df["language"].copy()

        df["language"] = df["language"].apply(normalize_language)

        language_changes = (
            old.astype(str)
            != df["language"].astype(str)
        ).sum()

    # --------------------------
    # Rating
    # --------------------------

    if "rating" in df.columns:

        old = df["rating"].copy()

        df["rating"] = df["rating"].apply(normalize_rating)

        rating_changes = (
            old.astype(str)
            != df["rating"].astype(str)
        ).sum()

    try:

        df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")

        logger.info(f"Normalized dataset saved to {OUTPUT_FILE}")

    except Exception as e:

        logger.exception(f"Failed to save CSV: {e}")
        return

    # ======================================================
    # REPORT
    # ======================================================

    report = f"""
==========================================================
NORMALIZATION REPORT
==========================================================

Input File :
{INPUT_FILE}

Output File :
{OUTPUT_FILE}

Total Rows Processed :
{len(df)}

Rows Removed :
0

Date Values Normalized :
{date_changes}

Source Values Normalized :
{source_changes}

Restaurant Names Normalized :
{restaurant_changes}

Language Values Normalized :
{language_changes}

Ratings Normalized :
{rating_changes}

Normalization Completed Successfully.

==========================================================
"""

    try:

        with open(REPORT_FILE, "w", encoding="utf-8") as file:
            file.write(report)

        logger.info(f"Report generated: {REPORT_FILE}")

    except Exception as e:

        logger.exception(f"Unable to create report: {e}")

    logger.info("Normalization completed successfully.")


# ==========================================================
# ENTRY POINT
# ==========================================================

if __name__ == "__main__":

    try:
        main()

    except KeyboardInterrupt:
        logger.warning("Process interrupted by user.")

    except Exception as e:
        logger.exception(f"Unexpected error: {e}")