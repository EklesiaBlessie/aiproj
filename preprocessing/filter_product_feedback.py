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
    / "cleaned_feedback.csv"
)

OUTPUT_FILE = (
    PROJECT_ROOT
    / "dataset"
    / "processed"
    / "product_feedback.csv"
)

REPORT_FILE = (
    PROJECT_ROOT
    / "reports"
    / "product_filter_report.txt"
)

LOG_DIR = PROJECT_ROOT / "logs"
LOG_FILE = LOG_DIR / "product_filter.log"


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
# EXPLICIT PRODUCT SIGNALS
# ============================================================

PRODUCT_PATTERNS = [
    # Application / technical
    r"\bapp\b",
    r"\bapplication\b",
    r"\bcrash(?:es|ed|ing)?\b",
    r"\bfreez(?:e|es|ing)\b",
    r"\berror\b",
    r"\bbug\b",
    r"\bupdate\b",
    r"\bloading\b",
    r"\bslow\b",
    r"\blag(?:s|ging)?\b",
    r"\bperformance\b",
    r"\btimeout\b",

    # Login / authentication
    r"\blog[\s-]?in\b",
    r"\blogout\b",
    r"\botp\b",
    r"\bpassword\b",
    r"\bauthentication\b",
    r"\bsign in\b",

    # UI / UX
    r"\bui\b",
    r"\bux\b",
    r"\binterface\b",
    r"\bnavigation\b",
    r"\bnavigate\b",
    r"\blayout\b",
    r"\bbutton\b",
    r"\bscreen\b",

    # Payment
    r"\bpayment\b",
    r"\bupi\b",
    r"\bcard\b",
    r"\bwallet\b",
    r"\brefund\b",
    r"\bcharged\b",
    r"\bdeducted\b",
    r"\btransaction\b",

    # Tracking / delivery system
    r"\border tracking\b",
    r"\btracking map\b",
    r"\btrack(?:ing)?\b",
    r"\beta\b",
    r"\bdelivery status\b",
    r"\bdriver location\b",
    r"\bgps\b",

    # Notifications
    r"\bnotification(?:s)?\b",
    r"\balert(?:s)?\b",

    # Search / cart / checkout
    r"\bsearch\b",
    r"\bsearch results\b",
    r"\bsearch bar\b",
    r"\bcart\b",
    r"\bcheckout\b",
    r"\bcoupon\b",
    r"\border total\b",

    # Feature requests
    r"\bfeature\b",
    r"\bplease add\b",
    r"\bwould like\b",
    r"\badd an option\b",
    r"\bdark mode\b",

    # Customer support
    r"\bsupport\b",
    r"\bsupport ticket\b",
    r"\bcustomer service\b",
    r"\bchat\b",
    r"\bagent\b",
]


# ============================================================
# FOOD / RESTAURANT-ONLY SIGNALS
# ============================================================

FOOD_PATTERNS = [
    r"\bfood\b",
    r"\btaste\b",
    r"\btasty\b",
    r"\bdelicious\b",
    r"\bspicy\b",
    r"\bspice\b",
    r"\boily\b",
    r"\bfresh\b",
    r"\bfreshness\b",
    r"\bportion\b",
    r"\bportion size\b",
    r"\bpackaging\b",
    r"\bpackage\b",
    r"\brestaurant\b",
    r"\brestaurant staff\b",
    r"\bstaff\b",
    r"\bambience\b",
    r"\bambiance\b",
    r"\bundercooked\b",
    r"\bovercooked\b",
    r"\bcold food\b",
    r"\bhot food\b",
    r"\bmeal\b",
    r"\bdish\b",
    r"\bbiryani\b",
    r"\bpizza\b",
    r"\bburger\b",
    r"\bchicken\b",
]


# ============================================================
# KNOWN FOOD-ONLY FEEDBACK PATTERNS
# ============================================================
#
# These are the actual food/restaurant feedback templates
# used in this project's synthetic dataset.
#
# We use the first sentence because later sentences may contain
# contextual words such as "checkout" that should NOT convert a
# food complaint into a product complaint.
#
# This keeps the filtering deterministic for this generated
# dataset while still preserving genuine product feedback that
# happens to mention food.
# ============================================================

FOOD_ONLY_OPENINGS = [
    "the food was cold when it arrived",
    "the biryani tasted amazing and was very fresh",
    "the restaurant staff were rude",
    "the portion size was too small for the price",
    "the restaurant packaging was damaged",
    "the food was too spicy and oily",
    "the restaurant ambience was excellent",
    "the chicken was undercooked",
]


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def normalize_text(text):
    """Normalize text for reliable matching."""

    if pd.isna(text):
        return ""

    text = str(text).strip().lower()

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text


def has_product_signal(text):
    """Return True if the feedback contains a clear product signal."""

    text = normalize_text(text)

    return any(
        re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        )
        for pattern in PRODUCT_PATTERNS
    )


def has_food_signal(text):
    """Return True if the feedback contains a food/restaurant signal."""

    text = normalize_text(text)

    return any(
        re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        )
        for pattern in FOOD_PATTERNS
    )


def has_known_food_only_opening(text):
    """
    Detect the known food-only templates in this generated
    dataset.

    Only the beginning of the feedback is checked so that a
    genuine product complaint mentioning food later is not
    incorrectly removed.
    """

    text = normalize_text(text)

    first_sentence = re.split(
        r"[.!?]",
        text,
        maxsplit=1,
    )[0].strip()

    return any(
        first_sentence.startswith(opening)
        for opening in FOOD_ONLY_OPENINGS
    )


def is_product_feedback(text):
    """
    Determine whether feedback belongs to the delivery-app
    product domain.

    Decision order:

    1. Known food-only feedback -> EXCLUDE.
    2. Strong product signal -> KEEP.
    3. Food/restaurant signal without product signal -> EXCLUDE.
    4. Otherwise -> KEEP.

    This prevents generic words such as "checkout" in a later
    sentence from incorrectly changing a food-only complaint
    into a product complaint.
    """

    text = normalize_text(text)

    if not text:
        return False

    # First: identify the known food-only templates.
    if has_known_food_only_opening(text):
        return False

    # Second: genuine product signal takes priority.
    if has_product_signal(text):
        return True

    # Third: food/restaurant issue with no product signal.
    if has_food_signal(text):
        return False

    # Unknown feedback is retained rather than discarded.
    return True


# ============================================================
# MAIN FILTER
# ============================================================

def filter_product_feedback():

    logger.info(
        "Starting delivery-app product relevance filtering..."
    )

    # --------------------------------------------------------
    # Input validation
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
            "Unable to read cleaned dataset."
        )

        raise RuntimeError(
            f"Could not read input dataset: {exc}"
        ) from exc

    original_rows = len(df)

    logger.info(
        "Rows before filtering: %s",
        original_rows,
    )

    if "feedback_text" not in df.columns:

        raise ValueError(
            "Required column 'feedback_text' "
            "was not found."
        )

    # --------------------------------------------------------
    # Apply product relevance filter
    # --------------------------------------------------------

    keep_mask = df[
        "feedback_text"
    ].apply(
        is_product_feedback
    )

    product_df = df.loc[
        keep_mask
    ].copy()

    excluded_df = df.loc[
        ~keep_mask
    ].copy()

    retained_rows = len(product_df)
    excluded_rows = len(excluded_df)

    logger.info(
        "Restaurant/food-only rows excluded: %s",
        excluded_rows,
    )

    logger.info(
        "Product-relevant rows retained: %s",
        retained_rows,
    )

    # --------------------------------------------------------
    # Save product-focused dataset
    # --------------------------------------------------------

    product_df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    logger.info(
        "Product-focused dataset saved to: %s",
        OUTPUT_FILE,
    )

    # --------------------------------------------------------
    # Report
    # --------------------------------------------------------

    retention_percentage = (
        retained_rows / original_rows * 100
        if original_rows
        else 0
    )

    exclusion_percentage = (
        excluded_rows / original_rows * 100
        if original_rows
        else 0
    )

    with REPORT_FILE.open(
        "w",
        encoding="utf-8",
    ) as report:

        report.write(
            "DELIVERY APP PRODUCT RELEVANCE REPORT\n"
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
            f"Input rows: {original_rows}\n"
        )

        report.write(
            f"Product-relevant rows retained: "
            f"{retained_rows}\n"
        )

        report.write(
            f"Restaurant/food-only rows excluded: "
            f"{excluded_rows}\n"
        )

        report.write(
            f"Retention percentage: "
            f"{retention_percentage:.2f}%\n"
        )

        report.write(
            f"Exclusion percentage: "
            f"{exclusion_percentage:.2f}%\n\n"
        )

        report.write(
            "RETAINED PRODUCT AREAS\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        retained_categories = [
            "App crashes",
            "UI/UX",
            "Performance",
            "Login/Auth",
            "Payments",
            "Order tracking",
            "Notifications",
            "Search",
            "Cart/Checkout",
            "Feature requests",
            "Customer support",
            "Account issues",
            "Delivery-app experience",
        ]

        for category in retained_categories:

            report.write(
                f"- {category}\n"
            )

        report.write(
            "\nEXCLUDED AREAS\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        excluded_categories = [
            "Food taste",
            "Food quality",
            "Food temperature",
            "Portion size",
            "Restaurant ambience",
            "Restaurant staff",
            "Packaging",
            "Food preparation",
            "Other restaurant-only complaints",
        ]

        for category in excluded_categories:

            report.write(
                f"- {category}\n"
            )

        report.write(
            "\nFILTERING LOGIC\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        report.write(
            "Food/restaurant-only complaints are excluded.\n"
        )

        report.write(
            "Product/app complaints are retained even when "
            "they mention food or an order.\n"
        )

        report.write(
            "Unknown feedback is retained rather than "
            "discarded.\n"
        )

        report.write(
            "\nEXAMPLES\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        report.write(
            '"The food was cold when it arrived" -> EXCLUDED\n'
        )

        report.write(
            '"The restaurant staff were rude" -> EXCLUDED\n'
        )

        report.write(
            '"The app showed my order as delivered while '
            'the food was still being prepared" -> RETAINED\n'
        )

        report.write(
            '"Money was deducted but the order was not '
            'confirmed" -> RETAINED\n'
        )

        report.write(
            '"The app crashes whenever I open the orders '
            'page" -> RETAINED\n'
        )

        report.write(
            "\nROW PRESERVATION\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        report.write(
            f"Rows retained: {retained_rows}\n"
        )

        report.write(
            f"Rows excluded: {excluded_rows}\n"
        )

        report.write(
            f"Rows accounted for: "
            f"{retained_rows + excluded_rows}\n"
        )

        report.write(
            "\nSTATUS\n"
        )

        report.write(
            "-" * 65 + "\n"
        )

        report.write(
            "Product relevance filtering completed successfully.\n"
        )

    logger.info(
        "Product filtering report generated: %s",
        REPORT_FILE,
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    try:

        filter_product_feedback()

        logger.info(
            "Product relevance filtering completed successfully."
        )

    except Exception as exc:

        logger.exception(
            "Product relevance filtering failed: %s",
            exc,
        )

        raise