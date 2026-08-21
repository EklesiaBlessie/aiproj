import logging
from pathlib import Path

import pandas as pd


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = PROJECT_ROOT / "dataset" / "source_data" / "delivery_app_feedback.csv"
OUTPUT_FILE = PROJECT_ROOT / "dataset" / "raw" / "raw_feedback.csv"
REPORT_FILE = PROJECT_ROOT / "reports" / "validation_report.txt"
LOG_DIR = PROJECT_ROOT / "logs"
LOG_FILE = LOG_DIR / "validation.log"


# ============================================================
# REQUIRED SCHEMA
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
# LOGGING
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
# VALIDATION
# ============================================================

def validate_dataset():
    logger.info("Starting dataset validation...")

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Input dataset not found: {INPUT_FILE}"
        )

    try:
        df = pd.read_csv(INPUT_FILE, encoding="utf-8-sig")
    except Exception as exc:
        logger.exception("Failed to read input dataset.")
        raise RuntimeError(
            f"Unable to read dataset: {exc}"
        ) from exc

    original_rows = len(df)

    logger.info("Dataset loaded successfully.")
    logger.info("Rows found: %s", original_rows)

    # --------------------------------------------------------
    # Schema validation
    # --------------------------------------------------------

    missing_columns = [
        column for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    unexpected_columns = [
        column for column in df.columns
        if column not in REQUIRED_COLUMNS
    ]

    if missing_columns:
        raise ValueError(
            "Required columns are missing: "
            + ", ".join(missing_columns)
        )

    if unexpected_columns:
        logger.warning(
            "Unexpected columns found: %s",
            ", ".join(unexpected_columns),
        )

    # Keep only the finalized project schema.
    df = df[REQUIRED_COLUMNS].copy()

    # --------------------------------------------------------
    # Feedback ID validation
    # --------------------------------------------------------

    missing_feedback_ids = (
        df["feedback_id"]
        .isna()
        .sum()
    )

    duplicate_feedback_ids = (
        df["feedback_id"]
        .duplicated()
        .sum()
    )

    logger.info(
        "Missing feedback IDs: %s",
        missing_feedback_ids,
    )

    logger.info(
        "Duplicate feedback IDs: %s",
        duplicate_feedback_ids,
    )

    # --------------------------------------------------------
    # Feedback text validation
    # --------------------------------------------------------

    missing_feedback_text = (
        df["feedback_text"]
        .isna()
        .sum()
    )

    empty_feedback_text = (
        df["feedback_text"]
        .fillna("")
        .astype(str)
        .str.strip()
        .eq("")
        .sum()
    )

    logger.info(
        "Missing feedback text: %s",
        missing_feedback_text,
    )

    logger.info(
        "Empty feedback text: %s",
        empty_feedback_text,
    )

    # Feedback text is the core field.
    # Rows without usable feedback text are invalid.
    valid_text_mask = (
        df["feedback_text"]
        .fillna("")
        .astype(str)
        .str.strip()
        .ne("")
    )

    invalid_text_rows = (~valid_text_mask).sum()

    if invalid_text_rows > 0:
        logger.warning(
            "Removing %s rows without usable feedback text.",
            invalid_text_rows,
        )

        df = df.loc[valid_text_mask].copy()

    # --------------------------------------------------------
    # Rating validation
    # --------------------------------------------------------

    numeric_ratings = pd.to_numeric(
        df["rating"],
        errors="coerce",
    )

    invalid_rating_mask = (
        numeric_ratings.notna()
        & ~numeric_ratings.between(1, 5)
    )

    invalid_ratings = invalid_rating_mask.sum()

    logger.info(
        "Invalid ratings outside 1-5: %s",
        invalid_ratings,
    )

    if invalid_ratings > 0:
        df.loc[invalid_rating_mask, "rating"] = pd.NA

    # --------------------------------------------------------
    # Date validation
    # --------------------------------------------------------

    parsed_dates = pd.to_datetime(
        df["created_date"],
        errors="coerce",
        format="mixed",
        dayfirst=False,
    )

    invalid_dates = (
        parsed_dates.isna()
        & df["created_date"].notna()
        & df["created_date"].astype(str).str.strip().ne("")
    ).sum()

    logger.info(
        "Invalid/unparseable dates: %s",
        invalid_dates,
    )

    # Do not remove rows merely because a date is missing.
    # Normalization will handle valid dates later.
    df["created_date"] = df["created_date"]

    # --------------------------------------------------------
    # Missing optional fields
    # --------------------------------------------------------

    optional_columns = [
        "source",
        "app_name",
        "rating",
        "created_date",
        "language",
        "platform",
    ]

    missing_report = {}

    for column in optional_columns:
        missing_count = (
            df[column]
            .isna()
            .sum()
            +
            df[column]
            .astype(str)
            .str.strip()
            .eq("")
            .sum()
        )

        missing_report[column] = int(missing_count)

    # --------------------------------------------------------
    # Save validated dataset
    # --------------------------------------------------------

    validated_rows = len(df)

    df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    logger.info(
        "Validated dataset saved to: %s",
        OUTPUT_FILE,
    )

    # --------------------------------------------------------
    # Report
    # --------------------------------------------------------

    with REPORT_FILE.open("w", encoding="utf-8") as report:
        report.write("DELIVERY APP DATASET VALIDATION REPORT\n")
        report.write("=" * 55 + "\n\n")

        report.write(f"Input file: {INPUT_FILE}\n")
        report.write(f"Output file: {OUTPUT_FILE}\n\n")

        report.write(f"Original rows: {original_rows}\n")
        report.write(f"Validated rows: {validated_rows}\n")
        report.write(
            f"Rows removed: {original_rows - validated_rows}\n\n"
        )

        report.write("SCHEMA\n")
        report.write("-" * 55 + "\n")

        for column in REQUIRED_COLUMNS:
            report.write(f"- {column}\n")

        report.write("\nVALIDATION RESULTS\n")
        report.write("-" * 55 + "\n")

        report.write(
            f"Missing feedback IDs: {missing_feedback_ids}\n"
        )

        report.write(
            f"Duplicate feedback IDs: {duplicate_feedback_ids}\n"
        )

        report.write(
            f"Rows with missing/empty feedback text removed: "
            f"{invalid_text_rows}\n"
        )

        report.write(
            f"Invalid ratings converted to missing: "
            f"{invalid_ratings}\n"
        )

        report.write(
            f"Invalid/unparseable dates detected: "
            f"{invalid_dates}\n\n"
        )

        report.write("OPTIONAL FIELD MISSING VALUES\n")
        report.write("-" * 55 + "\n")

        for column, count in missing_report.items():
            report.write(f"{column}: {count}\n")

        report.write("\nSTATUS\n")
        report.write("-" * 55 + "\n")
        report.write(
            "Validation completed successfully.\n"
        )

    logger.info(
        "Validation report generated: %s",
        REPORT_FILE,
    )

    return df


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    try:
        validate_dataset()
        logger.info("Validation completed successfully.")

    except Exception as exc:
        logger.exception(
            "Validation failed: %s",
            exc,
        )
        raise