import logging
from pathlib import Path

import pandas as pd


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    PROJECT_ROOT
    / "dataset"
    / "processed"
    / "product_feedback.csv"
)

OUTPUT_FILE = (
    PROJECT_ROOT
    / "dataset"
    / "processed"
    / "normalized_feedback.csv"
)

REPORT_FILE = (
    PROJECT_ROOT
    / "reports"
    / "normalization_report.txt"
)

LOG_DIR = PROJECT_ROOT / "logs"
LOG_FILE = LOG_DIR / "normalization.log"


# ============================================================
# SETUP
# ============================================================

LOG_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)

logger = logging.getLogger(__name__)


# ============================================================
# REQUIRED COLUMNS
# ============================================================

REQUIRED_COLUMNS = [
    "feedback_id",
    "source",
    "app_name",
    "feedback_text",
    "rating",
    "created_date",
    "language",
    "platform",
]


# ============================================================
# NORMALIZATION MAPPINGS
# ============================================================

SOURCE_MAPPING = {
    "google play": "Google Play",
    "googleplay": "Google Play",
    "play store": "Google Play",
    "playstore": "Google Play",

    "app store": "App Store",
    "appstore": "App Store",
    "apple app store": "App Store",

    "support ticket": "Support Ticket",
    "support tickets": "Support Ticket",

    "survey": "Survey",
    "surveys": "Survey",

    "email": "Email",
    "emails": "Email",

    "social media": "Social Media",
    "social": "Social Media",
}


APP_MAPPING = {
    "swiggy": "Swiggy",
    "zomato": "Zomato",
    "doordash": "DoorDash",
    "door dash": "DoorDash",
    "uber eats": "Uber Eats",
    "ubereats": "Uber Eats",
    "grubhub": "Grubhub",
}


LANGUAGE_MAPPING = {
    "english": "English",
    "en": "English",

    "hindi": "Hindi",
    "hi": "Hindi",

    "telugu": "Telugu",
    "te": "Telugu",

    "tamil": "Tamil",
    "ta": "Tamil",
}


PLATFORM_MAPPING = {
    "android": "Android",
    "android os": "Android",

    "ios": "iOS",
    "iphone": "iOS",
    "apple ios": "iOS",

    "web": "Web",
    "website": "Web",
    "browser": "Web",
}


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def normalize_string(value):
    """Normalize whitespace while preserving missing values."""

    if pd.isna(value):
        return pd.NA

    value = str(value).strip()

    if not value:
        return pd.NA

    return " ".join(value.split())


def normalize_mapped_value(value, mapping):
    """Normalize a value using a mapping dictionary."""

    value = normalize_string(value)

    if pd.isna(value):
        return pd.NA

    key = str(value).lower()

    return mapping.get(key, value)


def normalize_date(value):
    """
    Convert supported date formats to YYYY-MM-DD.

    Invalid or missing dates become missing values.
    Rows are never removed because of a missing date.
    """

    if pd.isna(value):
        return pd.NA

    value = str(value).strip()

    if not value:
        return pd.NA

    try:
        parsed = pd.to_datetime(
            value,
            errors="coerce",
            format="mixed",
            dayfirst=False,
        )

        if pd.isna(parsed):
            return pd.NA

        return parsed.strftime("%Y-%m-%d")

    except Exception:
        return pd.NA


def normalize_rating(value):
    """
    Normalize ratings to numeric values between 1 and 5.

    Missing/invalid ratings are preserved as missing.
    """

    if pd.isna(value):
        return pd.NA

    try:
        rating = float(value)

        if 1 <= rating <= 5:
            if rating.is_integer():
                return int(rating)

            return rating

        return pd.NA

    except (ValueError, TypeError):
        return pd.NA


# ============================================================
# MAIN NORMALIZATION
# ============================================================

def normalize_dataset():

    logger.info(
        "Starting delivery-app dataset normalization..."
    )

    # --------------------------------------------------------
    # Check input
    # --------------------------------------------------------

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Input file not found: {INPUT_FILE}"
        )

    try:
        df = pd.read_csv(
            INPUT_FILE,
            encoding="utf-8-sig",
        )

    except Exception as exc:
        logger.exception(
            "Failed to read product feedback dataset."
        )

        raise RuntimeError(
            f"Unable to read input dataset: {exc}"
        ) from exc

    original_rows = len(df)

    logger.info(
        "Dataset loaded successfully."
    )

    logger.info(
        "Rows before normalization: %s",
        original_rows,
    )

    # --------------------------------------------------------
    # Schema validation
    # --------------------------------------------------------

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            "Required columns are missing: "
            + ", ".join(missing_columns)
        )

    # Keep only finalized project columns.
    df = df[REQUIRED_COLUMNS].copy()

    # --------------------------------------------------------
    # Normalize feedback ID
    # --------------------------------------------------------

    df["feedback_id"] = df[
        "feedback_id"
    ].apply(normalize_string)

    # --------------------------------------------------------
    # Normalize source
    # --------------------------------------------------------

    source_before = df["source"].copy()

    df["source"] = df["source"].apply(
        lambda value: normalize_mapped_value(
            value,
            SOURCE_MAPPING,
        )
    )

    source_changes = (
        source_before.astype("string")
        != df["source"].astype("string")
    ).sum()

    logger.info(
        "Source values normalized: %s",
        source_changes,
    )

    # --------------------------------------------------------
    # Normalize app names
    # --------------------------------------------------------

    app_before = df["app_name"].copy()

    df["app_name"] = df["app_name"].apply(
        lambda value: normalize_mapped_value(
            value,
            APP_MAPPING,
        )
    )

    app_changes = (
        app_before.astype("string")
        != df["app_name"].astype("string")
    ).sum()

    logger.info(
        "App names normalized: %s",
        app_changes,
    )

    # --------------------------------------------------------
    # Normalize feedback text
    # --------------------------------------------------------

    df["feedback_text"] = df[
        "feedback_text"
    ].apply(normalize_string)

    # --------------------------------------------------------
    # Normalize ratings
    # --------------------------------------------------------

    rating_before = df["rating"].copy()

    df["rating"] = df[
        "rating"
    ].apply(normalize_rating)

    rating_missing_after = df["rating"].isna().sum()

    rating_changes = (
        rating_before.astype("string")
        != df["rating"].astype("string")
    ).sum()

    logger.info(
        "Rating values normalized: %s",
        rating_changes,
    )

    logger.info(
        "Missing ratings after normalization: %s",
        rating_missing_after,
    )

    # --------------------------------------------------------
    # Normalize dates
    # --------------------------------------------------------

    date_before = df["created_date"].copy()

    df["created_date"] = df[
        "created_date"
    ].apply(normalize_date)

    date_missing_after = (
        df["created_date"]
        .isna()
        .sum()
    )

    date_changes = (
        date_before.astype("string")
        != df["created_date"].astype("string")
    ).sum()

    logger.info(
        "Date values normalized: %s",
        date_changes,
    )

    logger.info(
        "Missing dates after normalization: %s",
        date_missing_after,
    )

    # --------------------------------------------------------
    # Normalize language
    # --------------------------------------------------------

    language_before = df["language"].copy()

    df["language"] = df["language"].apply(
        lambda value: normalize_mapped_value(
            value,
            LANGUAGE_MAPPING,
        )
    )

    language_changes = (
        language_before.astype("string")
        != df["language"].astype("string")
    ).sum()

    logger.info(
        "Language values normalized: %s",
        language_changes,
    )

    # --------------------------------------------------------
    # Normalize platform
    # --------------------------------------------------------

    platform_before = df["platform"].copy()

    df["platform"] = df["platform"].apply(
        lambda value: normalize_mapped_value(
            value,
            PLATFORM_MAPPING,
        )
    )

    platform_changes = (
        platform_before.astype("string")
        != df["platform"].astype("string")
    ).sum()

    logger.info(
        "Platform values normalized: %s",
        platform_changes,
    )

    # --------------------------------------------------------
    # IMPORTANT:
    # Do NOT remove rows during normalization.
    # --------------------------------------------------------

    final_rows = len(df)

    if final_rows != original_rows:
        raise RuntimeError(
            "Normalization unexpectedly changed row count."
        )

    # --------------------------------------------------------
    # Save normalized dataset
    # --------------------------------------------------------

    df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    logger.info(
        "Normalized dataset saved to: %s",
        OUTPUT_FILE,
    )

    # --------------------------------------------------------
    # Generate report
    # --------------------------------------------------------

    with REPORT_FILE.open(
        "w",
        encoding="utf-8",
    ) as report:

        report.write(
            "DELIVERY APP DATASET NORMALIZATION REPORT\n"
        )

        report.write(
            "=" * 65 + "\n\n"
        )

        report.write(
            f"Input file: {INPUT_FILE}\n"
        )

        report.write(
            f"Output file: {OUTPUT_FILE}\n\n"
        )

        report.write(
            f"Rows before normalization: {original_rows}\n"
        )

        report.write(
            f"Rows after normalization: {final_rows}\n"
        )

        report.write(
            f"Rows removed: "
            f"{original_rows - final_rows}\n\n"
        )

        report.write(
            "NORMALIZATION OPERATIONS\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        report.write(
            f"Source values normalized: {source_changes}\n"
        )

        report.write(
            f"App names normalized: {app_changes}\n"
        )

        report.write(
            f"Rating values normalized: {rating_changes}\n"
        )

        report.write(
            f"Date values normalized: {date_changes}\n"
        )

        report.write(
            f"Language values normalized: {language_changes}\n"
        )

        report.write(
            f"Platform values normalized: {platform_changes}\n\n"
        )

        report.write(
            "FINAL VALUE COUNTS\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        report.write(
            f"Missing ratings: {rating_missing_after}\n"
        )

        report.write(
            f"Missing dates: {date_missing_after}\n\n"
        )

        report.write(
            "ROW PRESERVATION\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        report.write(
            "No rows were removed during normalization.\n"
        )

        report.write(
            "Rows with missing optional values were preserved.\n\n"
        )

        report.write(
            "STATUS\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        report.write(
            "Normalization completed successfully.\n"
        )

    logger.info(
        "Normalization report generated: %s",
        REPORT_FILE,
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    try:

        normalize_dataset()

        logger.info(
            "Normalization completed successfully."
        )

    except Exception as exc:

        logger.exception(
            "Normalization failed: %s",
            exc,
        )

        raise