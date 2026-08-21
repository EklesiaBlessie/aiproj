"""
config.py
-----------
Configuration settings for the Data Collection & Preprocessing Module.
"""

from pathlib import Path

# -----------------------------
# Project Root
# -----------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# -----------------------------
# Dataset Paths
# -----------------------------
DATASET_DIR = PROJECT_ROOT / "dataset"

SOURCE_DATA_DIR = DATASET_DIR / "source_data"

REFERENCE_DIR = DATASET_DIR / "reference"

RAW_DIR = DATASET_DIR / "raw"

PROCESSED_DIR = DATASET_DIR / "processed"

REPORT_DIR = PROJECT_ROOT / "reports"

# -----------------------------
# Output Files
# -----------------------------
RAW_FEEDBACK_FILE = RAW_DIR / "raw_feedback.csv"

VALIDATED_FILE = PROCESSED_DIR / "validated_feedback.csv"

CLEANED_FILE = PROCESSED_DIR / "cleaned_feedback.csv"

NORMALIZED_FILE = PROCESSED_DIR / "normalized_feedback.csv"

FINAL_DATASET_FILE = PROCESSED_DIR / "final_feedback_dataset.csv"

PREPROCESSING_REPORT = REPORT_DIR / "preprocessing_report.txt"

# -----------------------------
# Source CSV Files
# -----------------------------
SOURCE_FILES = [
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