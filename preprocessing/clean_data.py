import logging
import re
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = PROJECT_ROOT / "dataset" / "raw" / "raw_feedback.csv"
OUTPUT_FILE = PROJECT_ROOT / "dataset" / "processed" / "cleaned_feedback.csv"
REPORT_FILE = PROJECT_ROOT / "reports" / "cleaning_report.txt"

LOG_DIR = PROJECT_ROOT / "logs"
LOG_FILE = LOG_DIR / "cleaning.log"

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


def clean_text(value):
    """Clean feedback text without changing its meaning."""
    if pd.isna(value):
        return ""

    text = str(value)

    # Remove leading/trailing whitespace.
    text = text.strip()

    # Collapse repeated whitespace.
    text = re.sub(r"\s+", " ", text)

    return text


def clean_dataset():
    logger.info("Starting delivery-app data cleaning...")

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Input file not found: {INPUT_FILE}"
        )

    df = pd.read_csv(
        INPUT_FILE,
        encoding="utf-8-sig",
    )

    original_rows = len(df)

    logger.info("Loaded validated dataset.")
    logger.info("Rows before cleaning: %s", original_rows)

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            "Missing required columns: "
            + ", ".join(missing_columns)
        )

    df = df[REQUIRED_COLUMNS].copy()

    # --------------------------------------------------------
    # 1. Standardize missing values
    # --------------------------------------------------------

    missing_tokens = {
        "",
        "nan",
        "none",
        "null",
        "n/a",
        "na",
        "unknown",
    }

    for column in REQUIRED_COLUMNS:
        if df[column].dtype == "object":
            df[column] = df[column].apply(
                lambda x: (
                    pd.NA
                    if str(x).strip().lower() in missing_tokens
                    else x
                )
            )

    # --------------------------------------------------------
    # 2. Clean feedback text
    # --------------------------------------------------------

    df["feedback_text"] = df["feedback_text"].apply(clean_text)

    empty_text_before = (
        df["feedback_text"]
        .eq("")
        .sum()
    )

    # Feedback text is the only mandatory content field.
    # Rows without feedback cannot be analyzed.
    df = df[df["feedback_text"] != ""].copy()

    removed_empty_text = (
        empty_text_before
    )

    logger.info(
        "Rows removed because feedback text was empty: %s",
        removed_empty_text,
    )

    # --------------------------------------------------------
    # 3. Normalize basic string fields
    # --------------------------------------------------------

    string_columns = [
        "feedback_id",
        "source",
        "app_name",
        "language",
        "platform",
    ]

    for column in string_columns:
        df[column] = df[column].apply(
            lambda x: (
                pd.NA
                if pd.isna(x)
                else re.sub(r"\s+", " ", str(x)).strip()
            )
        )

    # --------------------------------------------------------
    # 4. Normalize app names
    # --------------------------------------------------------

    app_mapping = {
        "swiggy": "Swiggy",
        "zomato": "Zomato",
        "doordash": "DoorDash",
        "uber eats": "Uber Eats",
        "ubereats": "Uber Eats",
        "grubhub": "Grubhub",
    }

    def normalize_app(value):
        if pd.isna(value):
            return pd.NA

        cleaned = str(value).strip()
        key = cleaned.lower()

        return app_mapping.get(
            key,
            cleaned,
        )

    df["app_name"] = df["app_name"].apply(
        normalize_app
    )

    # --------------------------------------------------------
    # 5. Normalize platform
    # --------------------------------------------------------

    platform_mapping = {
        "android": "Android",
        "ios": "iOS",
        "web": "Web",
    }

    def normalize_platform(value):
        if pd.isna(value):
            return pd.NA

        cleaned = str(value).strip()
        return platform_mapping.get(
            cleaned.lower(),
            cleaned,
        )

    df["platform"] = df["platform"].apply(
        normalize_platform
    )

    # --------------------------------------------------------
    # 6. Normalize language labels
    # --------------------------------------------------------

    language_mapping = {
        "english": "English",
        "en": "English",
        "hindi": "Hindi",
        "hi": "Hindi",
        "telugu": "Telugu",
        "te": "Telugu",
        "tamil": "Tamil",
        "ta": "Tamil",
    }

    def normalize_language(value):
        if pd.isna(value):
            return pd.NA

        cleaned = str(value).strip()
        return language_mapping.get(
            cleaned.lower(),
            cleaned,
        )

    df["language"] = df["language"].apply(
        normalize_language
    )

    # --------------------------------------------------------
    # 7. Normalize ratings
    # --------------------------------------------------------

    df["rating"] = pd.to_numeric(
        df["rating"],
        errors="coerce",
    )

    invalid_ratings = (
        df["rating"].notna()
        & ~df["rating"].between(1, 5)
    ).sum()

    df.loc[
        ~df["rating"].between(1, 5),
        "rating"
    ] = pd.NA

    logger.info(
        "Invalid ratings converted to missing: %s",
        invalid_ratings,
    )

    # --------------------------------------------------------
    # 8. Remove exact duplicate feedback
    # --------------------------------------------------------

    duplicate_mask = df.duplicated(
        subset=["feedback_text"],
        keep="first",
    )

    duplicate_rows = duplicate_mask.sum()

    if duplicate_rows > 0:
        df = df.loc[~duplicate_mask].copy()

    logger.info(
        "Duplicate feedback rows removed: %s",
        duplicate_rows,
    )

    # --------------------------------------------------------
    # 9. Remove obviously unusable placeholder feedback
    # --------------------------------------------------------

    placeholder_patterns = [
        r"^test$",
        r"^testing$",
        r"^test review$",
        r"^asdf$",
        r"^abc$",
        r"^\.+$",
        r"^-+$",
    ]

    placeholder_regex = re.compile(
        "|".join(placeholder_patterns),
        flags=re.IGNORECASE,
    )

    placeholder_mask = df["feedback_text"].apply(
        lambda text: bool(
            placeholder_regex.fullmatch(
                str(text).strip()
            )
        )
    )

    placeholder_rows = placeholder_mask.sum()

    if placeholder_rows > 0:
        df = df.loc[~placeholder_mask].copy()

    logger.info(
        "Placeholder feedback rows removed: %s",
        placeholder_rows,
    )

    # --------------------------------------------------------
    # 10. Preserve rows with missing optional fields
    # --------------------------------------------------------

    # We deliberately DO NOT remove rows because:
    # - source is missing
    # - app_name is missing
    # - rating is missing
    # - date is missing
    # - language is missing
    # - platform is missing

    final_rows = len(df)

    # --------------------------------------------------------
    # 11. Save cleaned dataset
    # --------------------------------------------------------

    df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    logger.info(
        "Cleaned dataset saved to: %s",
        OUTPUT_FILE,
    )

    # --------------------------------------------------------
    # 12. Generate report
    # --------------------------------------------------------

    with REPORT_FILE.open(
        "w",
        encoding="utf-8",
    ) as report:

        report.write(
            "DELIVERY APP DATA CLEANING REPORT\n"
        )
        report.write("=" * 60 + "\n\n")

        report.write(
            f"Input file: {INPUT_FILE}\n"
        )

        report.write(
            f"Output file: {OUTPUT_FILE}\n\n"
        )

        report.write(
            f"Rows before cleaning: {original_rows}\n"
        )

        report.write(
            f"Rows after cleaning: {final_rows}\n"
        )

        report.write(
            f"Total rows removed: "
            f"{original_rows - final_rows}\n\n"
        )

        report.write("CLEANING OPERATIONS\n")
        report.write("-" * 60 + "\n")

        report.write(
            f"Empty feedback rows removed: "
            f"{removed_empty_text}\n"
        )

        report.write(
            f"Duplicate feedback rows removed: "
            f"{duplicate_rows}\n"
        )

        report.write(
            f"Placeholder feedback rows removed: "
            f"{placeholder_rows}\n"
        )

        report.write(
            f"Invalid ratings converted to missing: "
            f"{invalid_ratings}\n\n"
        )

        report.write(
            "OPTIONAL FIELDS WERE PRESERVED WHEN EMPTY.\n"
        )

        report.write(
            "Missing source, app name, rating, date, "
            "language, or platform values were NOT used "
            "as reasons to remove rows.\n\n"
        )

        report.write(
            "STATUS\n"
        )
        report.write("-" * 60 + "\n")
        report.write(
            "Cleaning completed successfully.\n"
        )

    logger.info(
        "Cleaning report generated: %s",
        REPORT_FILE,
    )

    return df


if __name__ == "__main__":
    try:
        clean_dataset()
        logger.info(
            "Cleaning completed successfully."
        )

    except Exception as exc:
        logger.exception(
            "Cleaning failed: %s",
            exc,
        )
        raise