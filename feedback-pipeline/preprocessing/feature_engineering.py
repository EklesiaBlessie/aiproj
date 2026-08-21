"""
feature_engineering.py

Reads:
dataset/processed/normalized_feedback.csv

Outputs:
dataset/processed/final_feedback_dataset.csv
"""

import logging
import re
from pathlib import Path

import pandas as pd

# ==========================================================
# PATHS
# ==========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_FILE = BASE_DIR / "dataset" / "processed" / "normalized_feedback.csv"
OUTPUT_FILE = BASE_DIR / "dataset" / "processed" / "final_feedback_dataset.csv"

REPORT_FILE = BASE_DIR / "reports" / "feature_engineering_report.txt"
LOG_FILE = BASE_DIR / "logs" / "feature_engineering.log"

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
# KEYWORDS
# ==========================================================

POSITIVE_WORDS = {
    "good","great","excellent","awesome","amazing",
    "perfect","delicious","fresh","clean","friendly",
    "love","liked","best","wonderful","fantastic",
    "happy","satisfied","fast"
}

NEGATIVE_WORDS = {
    "bad","worst","late","slow","dirty","cold",
    "burnt","uncooked","poor","terrible","awful",
    "issue","problem","complaint","delay",
    "missing","refund","cancel","rude","disappointed"
}

REQUEST_WORDS = {
    "please","need","wish","could","can you",
    "would like","add","feature","suggest",
    "improve","option","request"
}

BUG_WORDS = {
    "bug","crash","error","failed","failure",
    "broken","issue","not working","loading","freeze"
}

DELIVERY_WORDS = {
    "delivery","late","delay","driver",
    "arrived","pickup","dispatch"
}

SERVICE_WORDS = {
    "staff","waiter","service",
    "support","behavior","attitude"
}

FOOD_WORDS = {
    "food","taste","pizza","burger",
    "biryani","meal","rice","cold",
    "fresh","spicy","quality"
}

# ==========================================================
# HELPER FUNCTIONS
# ==========================================================

def clean_text(text):

    if pd.isna(text):
        return ""

    text = str(text).lower()

    text = re.sub(r"[^a-z0-9 ]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def count_words(text):

    text = clean_text(text)

    if not text:
        return 0

    return len(text.split())


def contains_keywords(text, keywords):

    text = clean_text(text)

    return any(word in text for word in keywords)

# ==========================================================
# FEATURE FUNCTIONS
# ==========================================================

def rating_category(rating):

    try:
        rating = float(rating)
    except:
        return "Unknown"

    if rating >= 4.5:
        return "Excellent"
    elif rating >= 3.5:
        return "Good"
    elif rating >= 2.5:
        return "Average"
    elif rating >= 1.5:
        return "Poor"
    else:
        return "Very Poor"
        # ==========================================================
# AI FEATURES
# ==========================================================

def sentiment_hint(row):

    text = clean_text(row.get("feedback_text", ""))
    rating = row.get("rating", "")

    score = 0

    if contains_keywords(text, POSITIVE_WORDS):
        score += 2

    if contains_keywords(text, NEGATIVE_WORDS):
        score -= 2

    try:
        rating = float(rating)

        if rating >= 4:
            score += 2

        elif rating <= 2:
            score -= 2

    except:
        pass

    if score >= 2:
        return "Positive"

    elif score <= -2:
        return "Negative"

    return "Neutral"


def priority(row):

    text = clean_text(row.get("feedback_text", ""))
    rating = row.get("rating", "")

    try:
        rating = float(rating)
    except:
        rating = 3

    if contains_keywords(text, BUG_WORDS):
        return "High"

    if contains_keywords(text, DELIVERY_WORDS):
        return "High"

    if contains_keywords(text, NEGATIVE_WORDS) and rating <= 2:
        return "High"

    if contains_keywords(text, REQUEST_WORDS):
        return "Medium"

    if rating >= 4:
        return "Low"

    return "Medium"


# ==========================================================
# MAIN
# ==========================================================

def main():

    logger.info("Starting feature engineering...")

    if not INPUT_FILE.exists():
        logger.error(f"Input file not found: {INPUT_FILE}")
        return

    try:

        df = pd.read_csv(INPUT_FILE)

        logger.info(f"Loaded {len(df)} rows.")

    except Exception as e:

        logger.exception(f"Unable to load dataset: {e}")
        return

    # ------------------------------------------------------
    # Ensure feedback column exists
    # ------------------------------------------------------

    if "feedback_text" not in df.columns:
        logger.error("feedback_text column not found.")
        return

    # ------------------------------------------------------
    # Basic Features
    # ------------------------------------------------------

    logger.info("Generating text features...")

    df["review_length"] = (
        df["feedback_text"]
        .fillna("")
        .astype(str)
        .str.len()
    )

    df["word_count"] = (
        df["feedback_text"]
        .fillna("")
        .apply(count_words)
    )

    # ------------------------------------------------------
    # Rating Features
    # ------------------------------------------------------

    logger.info("Generating rating features...")

    if "rating" in df.columns:

        df["has_rating"] = (
            df["rating"]
            .fillna("")
            .astype(str)
            .str.strip()
            .ne("")
        )

        df["rating_category"] = (
            df["rating"]
            .apply(rating_category)
        )

    else:

        df["has_rating"] = False
        df["rating_category"] = "Unknown"
            # ------------------------------------------------------
    # Keyword Features
    # ------------------------------------------------------

    logger.info("Generating keyword features...")

    df["contains_complaint"] = df["feedback_text"].apply(
        lambda x: contains_keywords(x, NEGATIVE_WORDS)
    )

    df["contains_praise"] = df["feedback_text"].apply(
        lambda x: contains_keywords(x, POSITIVE_WORDS)
    )

    df["contains_request"] = df["feedback_text"].apply(
        lambda x: contains_keywords(x, REQUEST_WORDS)
    )

    df["contains_bug"] = df["feedback_text"].apply(
        lambda x: contains_keywords(x, BUG_WORDS)
    )

    df["contains_delivery_issue"] = df["feedback_text"].apply(
        lambda x: contains_keywords(x, DELIVERY_WORDS)
    )

    df["contains_service_issue"] = df["feedback_text"].apply(
        lambda x: contains_keywords(x, SERVICE_WORDS)
    )

    df["contains_food_issue"] = df["feedback_text"].apply(
        lambda x: contains_keywords(x, FOOD_WORDS)
    )

    # ------------------------------------------------------
    # AI Features
    # ------------------------------------------------------

    logger.info("Generating AI features...")

    df["sentiment_hint"] = df.apply(sentiment_hint, axis=1)

    df["feedback_priority"] = df.apply(priority, axis=1)

    # ------------------------------------------------------
    # Save Dataset
    # ------------------------------------------------------

    try:

        df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")

        logger.info(f"Saved final dataset to {OUTPUT_FILE}")

    except Exception as e:

        logger.exception(f"Unable to save dataset: {e}")
        return

    # ------------------------------------------------------
    # REPORT
    # ------------------------------------------------------

    report = f"""
==========================================================
FEATURE ENGINEERING REPORT
==========================================================

Input File:
{INPUT_FILE}

Output File:
{OUTPUT_FILE}

Rows Processed:
{len(df)}

Features Added:

[OK] review_length
[OK] word_count
[OK] has_rating
[OK] rating_category
[OK] contains_complaint
[OK] contains_praise
[OK] contains_request
[OK] contains_bug
[OK] contains_delivery_issue
[OK] contains_service_issue
[OK] contains_food_issue
[OK] sentiment_hint
[OK] feedback_priority

Summary

Positive Feedback :
{(df["sentiment_hint"] == "Positive").sum()}

Neutral Feedback :
{(df["sentiment_hint"] == "Neutral").sum()}

Negative Feedback :
{(df["sentiment_hint"] == "Negative").sum()}

High Priority :
{(df["feedback_priority"] == "High").sum()}

Medium Priority :
{(df["feedback_priority"] == "Medium").sum()}

Low Priority :
{(df["feedback_priority"] == "Low").sum()}

Completed Successfully.

==========================================================
"""

    try:

        with open(REPORT_FILE, "w", encoding="utf-8") as file:
            file.write(report)

        logger.info(f"Report generated: {REPORT_FILE}")

    except Exception as e:

        logger.exception(f"Unable to write report: {e}")

    logger.info("Feature engineering completed successfully.")


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