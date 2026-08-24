import logging
import re
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
    / "normalized_feedback.csv"
)

OUTPUT_FILE = (
    PROJECT_ROOT
    / "dataset"
    / "processed"
    / "final_feedback_dataset.csv"
)

REPORT_FILE = (
    PROJECT_ROOT
    / "reports"
    / "feature_engineering_report.txt"
)

LOG_DIR = PROJECT_ROOT / "logs"
LOG_FILE = LOG_DIR / "feature_engineering.log"


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
        logging.FileHandler(
            LOG_FILE,
            encoding="utf-8",
        ),
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
# FEATURE KEYWORDS
# ============================================================

FEATURE_PATTERNS = {
    "app_crash": [
        r"\bcrash(?:es|ed|ing)?\b",
        r"\bcrash(?:es|ed|ing)?\b.*\bapp\b",
        r"\bapp\b.*\bcrash(?:es|ed|ing)?\b",
        r"\bfreeze(?:s|d|ing)?\b",
    ],

    "ui_ux": [
        r"\bui\b",
        r"\bux\b",
        r"\binterface\b",
        r"\bnavigation\b",
        r"\bnavigate\b",
        r"\blayout\b",
        r"\bbutton\b",
        r"\bscreen\b",
    ],

    "performance": [
        r"\bslow\b",
        r"\blag(?:s|ging)?\b",
        r"\bperformance\b",
        r"\bloading\b",
        r"\btakes too long\b",
        r"\btimeout\b",
        r"\btime out\b",
    ],

    "login_auth": [
        r"\blog[\s-]?in\b",
        r"\blogout\b",
        r"\botp\b",
        r"\bpassword\b",
        r"\bauthentication\b",
        r"\bsign in\b",
    ],

    "payment": [
        r"\bpayment\b",
        r"\bupi\b",
        r"\bcard\b",
        r"\bwallet\b",
        r"\brefund\b",
        r"\bcharged\b",
        r"\bcharge\b",
        r"\bcharged\b",
        r"\bdeducted\b",
        r"\bdeduction\b",
        r"\btransaction\b",
        r"\bmoney was deducted\b",
        r"\bmoney was charged\b",
        r"\bpayment failed\b",
        r"\bpayment was not\b",
        r"\bpaid but\b",
    ],

    "order_tracking": [
        r"\border tracking\b",
        r"\btracking map\b",
        r"\btrack(?:ing)?\b",
        r"\beta\b",
        r"\bdelivery status\b",
        r"\bdriver location\b",
        r"\bgps\b",
    ],

    "notifications": [
        r"\bnotification(?:s)?\b",
        r"\balert(?:s)?\b",
    ],

    "search": [
        r"\bsearch\b",
        r"\bsearch results\b",
        r"\bsearch bar\b",
    ],

    "cart_checkout": [
        r"\bcart\b",
        r"\bcheckout\b",
        r"\bcoupon\b",
        r"\border total\b",
    ],

    "feature_request": [
        r"\bplease add\b",
        r"\bwould like\b",
        r"\brequest\b",
        r"\bfeature\b",
        r"\bdark mode\b",
        r"\badd an option\b",
    ],

    "customer_support": [
        r"\bsupport\b",
        r"\bhelp\b",
        r"\bcustomer service\b",
        r"\bsupport ticket\b",
        r"\bagent\b",
        r"\bchat\b",
    ],

    "account": [
        r"\baccount\b",
        r"\bprofile\b",
        r"\bsaved address\b",
        r"\bphone number\b",
        r"\bsettings\b",
    ],
}


# ============================================================
# FEATURE DETECTION
# ============================================================

def detect_issue_types(text):
    """
    Detect one or more product issue areas from feedback text.
    """

    text = str(text).lower()

    detected = []

    for issue_type, patterns in FEATURE_PATTERNS.items():

        for pattern in patterns:

            if re.search(
                pattern,
                text,
                flags=re.IGNORECASE,
            ):
                detected.append(issue_type)
                break

    if not detected:
        detected.append("general_product_feedback")

    return detected


def calculate_text_length(text):
    """Return character length of feedback."""

    if pd.isna(text):
        return 0

    return len(str(text))


def calculate_word_count(text):
    """Return approximate word count."""

    if pd.isna(text):
        return 0

    return len(
        str(text).split()
    )


def contains_question(text):
    """Detect whether feedback contains a question."""

    if pd.isna(text):
        return 0

    return int(
        "?" in str(text)
    )


def contains_exclamation(text):
    """Detect whether feedback contains an exclamation."""

    if pd.isna(text):
        return 0

    return int(
        "!" in str(text)
    )


def detect_feature_request(text):
    """Detect whether feedback appears to request a feature."""

    if pd.isna(text):
        return 0

    text = str(text).lower()

    patterns = [
        r"\bplease add\b",
        r"\bwould like\b",
        r"\bfeature request\b",
        r"\badd an option\b",
        r"\bit would be useful\b",
    ]

    return int(
        any(
            re.search(
                pattern,
                text,
            )
            for pattern in patterns
        )
    )


# ============================================================
# MAIN
# ============================================================

def engineer_features():

    logger.info(
        "Starting feature engineering..."
    )

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
            "Unable to read normalized dataset."
        )

        raise RuntimeError(
            f"Could not read input dataset: {exc}"
        ) from exc

    original_rows = len(df)

    logger.info(
        "Normalized rows loaded: %s",
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
            "Missing required columns: "
            + ", ".join(missing_columns)
        )

    # --------------------------------------------------------
    # Feature 1: text length
    # --------------------------------------------------------

    df["feedback_length"] = df[
        "feedback_text"
    ].apply(
        calculate_text_length
    )

    # --------------------------------------------------------
    # Feature 2: word count
    # --------------------------------------------------------

    df["feedback_word_count"] = df[
        "feedback_text"
    ].apply(
        calculate_word_count
    )

    # --------------------------------------------------------
    # Feature 3: question indicator
    # --------------------------------------------------------

    df["has_question"] = df[
        "feedback_text"
    ].apply(
        contains_question
    )

    # --------------------------------------------------------
    # Feature 4: exclamation indicator
    # --------------------------------------------------------

    df["has_exclamation"] = df[
        "feedback_text"
    ].apply(
        contains_exclamation
    )

    # --------------------------------------------------------
    # Feature 5: feature request indicator
    # --------------------------------------------------------

    df["is_feature_request"] = df[
        "feedback_text"
    ].apply(
        detect_feature_request
    )

    # --------------------------------------------------------
    # Feature 6: issue types
    # --------------------------------------------------------

    detected_issue_types = df[
        "feedback_text"
    ].apply(
        detect_issue_types
    )

    df["issue_type"] = detected_issue_types.apply(
        lambda values: "|".join(values)
    )

    # Primary issue type for simpler downstream models.
    df["primary_issue_type"] = detected_issue_types.apply(
        lambda values: values[0]
    )

    # --------------------------------------------------------
    # Feature 7: rating availability
    # --------------------------------------------------------

    df["has_rating"] = df[
        "rating"
    ].notna().astype(int)

    # --------------------------------------------------------
    # Feature 8: text quality
    # --------------------------------------------------------

    df["has_feedback_text"] = (
        df["feedback_text"]
        .fillna("")
        .astype(str)
        .str.strip()
        .ne("")
        .astype(int)
    )

    # --------------------------------------------------------
    # Preserve row count
    # --------------------------------------------------------

    final_rows = len(df)

    if final_rows != original_rows:

        raise RuntimeError(
            "Feature engineering changed the row count."
        )

    # --------------------------------------------------------
    # Save final dataset
    # --------------------------------------------------------

    df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    logger.info(
        "Final feature-engineered dataset saved to: %s",
        OUTPUT_FILE,
    )

    # --------------------------------------------------------
    # Generate report
    # --------------------------------------------------------

    issue_counts = {}

    for issue_type in FEATURE_PATTERNS:

        count = df[
            "issue_type"
        ].str.contains(
            issue_type,
            regex=False,
            na=False,
        ).sum()

        issue_counts[
            issue_type
        ] = int(count)

    feature_request_count = int(
        df["is_feature_request"].sum()
    )

    question_count = int(
        df["has_question"].sum()
    )

    exclamation_count = int(
        df["has_exclamation"].sum()
    )

    with REPORT_FILE.open(
        "w",
        encoding="utf-8",
    ) as report:

        report.write(
            "DELIVERY APP FEATURE ENGINEERING REPORT\n"
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
            f"Rows before feature engineering: "
            f"{original_rows}\n"
        )

        report.write(
            f"Rows after feature engineering: "
            f"{final_rows}\n"
        )

        report.write(
            "Rows removed: 0\n\n"
        )

        report.write(
            "GENERATED FEATURES\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        generated_features = [
            "feedback_length",
            "feedback_word_count",
            "has_question",
            "has_exclamation",
            "is_feature_request",
            "issue_type",
            "primary_issue_type",
            "has_rating",
            "has_feedback_text",
        ]

        for feature in generated_features:
            report.write(
                f"- {feature}\n"
            )

        report.write(
            "\nISSUE TYPE COUNTS\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        for issue_type, count in issue_counts.items():

            report.write(
                f"{issue_type}: {count}\n"
            )

        report.write(
            "\nOTHER FEATURE COUNTS\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        report.write(
            f"Feature requests: "
            f"{feature_request_count}\n"
        )

        report.write(
            f"Feedback containing questions: "
            f"{question_count}\n"
        )

        report.write(
            f"Feedback containing exclamations: "
            f"{exclamation_count}\n"
        )

        report.write(
            "\nIMPORTANT\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        report.write(
            "This stage creates analytical features only.\n"
        )

        report.write(
            "Sentiment, priority, severity, and final AI "
            "classification are intentionally NOT generated "
            "here because they belong to the downstream "
            "AI analysis layer.\n\n"
        )

        report.write(
            "STATUS\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        report.write(
            "Feature engineering completed successfully.\n"
        )

    logger.info(
        "Feature engineering report generated: %s",
        REPORT_FILE,
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    try:

        engineer_features()

        logger.info(
            "Feature engineering completed successfully."
        )

    except Exception as exc:

        logger.exception(
            "Feature engineering failed: %s",
            exc,
        )

        raise