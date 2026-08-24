from pathlib import Path

# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

# Updated 1,080-row input dataset
INPUT_CSV = BASE_DIR / "dataset" / "processed" / "final_feedback_dataset.csv"

# Generated analysis output
OUTPUT_CSV = BASE_DIR / "dataset" / "processed" / "analyzed_feedback.csv"

# ============================================================
# DATA COLUMNS
# ============================================================

TEXT_COLUMN = "feedback_text"
ID_COLUMN = "feedback_id"

# ============================================================
# SENTIMENT LABELS
# ============================================================

POSITIVE = "Positive"
NEGATIVE = "Negative"
NEUTRAL = "Neutral"

# ============================================================
# PRIORITY LABELS
# ============================================================

HIGH = "High"
MEDIUM = "Medium"
LOW = "Low"
