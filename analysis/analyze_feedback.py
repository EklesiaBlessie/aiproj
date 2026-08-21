import pandas as pd

from config import INPUT_CSV, OUTPUT_CSV, TEXT_COLUMN, ID_COLUMN
from category import CategoryClassifier
from sentiment import SentimentClassifier
from priority import PriorityClassifier


def validate_dataset(df):
    """
    Validate the updated dataset before analysis.
    """

    print("\n--- Dataset Validation ---")

    # Check required columns
    required_columns = [
        ID_COLUMN,
        TEXT_COLUMN
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    # Check feedback IDs
    missing_ids = df[ID_COLUMN].isna().sum()

    if missing_ids > 0:
        raise ValueError(
            f"Found {missing_ids} feedback records without feedback_id."
        )

    duplicate_ids = df[ID_COLUMN].duplicated().sum()

    if duplicate_ids > 0:
        raise ValueError(
            f"Found {duplicate_ids} duplicate feedback IDs."
        )

    print(f"Total records: {len(df)}")
    print(f"Unique feedback IDs: {df[ID_COLUMN].nunique()}")
    print(f"Missing feedback IDs: {missing_ids}")
    print(f"Duplicate feedback IDs: {duplicate_ids}")

    print("Dataset validation successful.")


def main():

    print("=" * 70)
    print("AI PRODUCT MANAGER - FEEDBACK ANALYSIS")
    print("=" * 70)

    # ---------------------------------------------------------
    # 1. LOAD DATA
    # ---------------------------------------------------------

    print("\nLoading dataset...")
    print(f"Input: {INPUT_CSV}")

    try:
        df = pd.read_csv(INPUT_CSV)

    except FileNotFoundError:
        print("\nERROR: Dataset not found.")
        print(f"Expected file: {INPUT_CSV}")
        return

    print(f"Loaded {len(df)} records.")

    # ---------------------------------------------------------
    # 2. VALIDATE DATA
    # ---------------------------------------------------------

    validate_dataset(df)

    # ---------------------------------------------------------
    # 3. PREPARE FEEDBACK TEXT
    # ---------------------------------------------------------

    df["review"] = (
        df[TEXT_COLUMN]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    # ---------------------------------------------------------
    # 4. CATEGORY
    # ---------------------------------------------------------

    print("\nRunning category analysis...")

    category_classifier = CategoryClassifier()

    df["Category"] = category_classifier.predict_batch(
        df["review"].tolist()
    )

    print("Category analysis completed.")

    # ---------------------------------------------------------
    # 5. SENTIMENT
    # ---------------------------------------------------------

    print("\nRunning sentiment analysis...")

    sentiment_classifier = SentimentClassifier()

    ratings = (
        df["rating"].tolist()
        if "rating" in df.columns
        else [None] * len(df)
    )

    df["Sentiment"] = sentiment_classifier.predict_batch(
        df["review"].tolist(),
        ratings
    )

    print("Sentiment analysis completed.")
    # ---------------------------------------------------------
    # 6. PRIORITY
    # ---------------------------------------------------------

    print("\nRunning priority analysis...")

    priority_classifier = PriorityClassifier()

    ratings = (
        df["rating"].tolist()
        if "rating" in df.columns
        else [None] * len(df)
    )

    df["Priority"] = priority_classifier.predict_batch(
        df["review"].tolist(),
        df["Sentiment"].tolist(),
        ratings
    )

    print("Priority analysis completed.")

    # ---------------------------------------------------------
    # 7. SAVE RESULTS
    # ---------------------------------------------------------

    print("\nSaving analyzed dataset...")

    df.to_csv(
        OUTPUT_CSV,
        index=False
    )

    # ---------------------------------------------------------
    # 8. DISPLAY SUMMARY
    # ---------------------------------------------------------

    print("\n" + "=" * 70)
    print("ANALYSIS COMPLETED")
    print("=" * 70)

    print(f"\nTotal feedback processed: {len(df)}")

    print(
        f"Unique feedback IDs: "
        f"{df[ID_COLUMN].nunique()}"
    )

    print("\nCategory Distribution:")
    print(df["Category"].value_counts())

    print("\nSentiment Distribution:")
    print(df["Sentiment"].value_counts())

    print("\nPriority Distribution:")
    print(df["Priority"].value_counts())

    print(f"\nOutput file:")
    print(OUTPUT_CSV)

    print("\nFirst 5 analyzed records:")
    print(
        df[
            [
                ID_COLUMN,
                TEXT_COLUMN,
                "Category",
                "Sentiment",
                "Priority"
            ]
        ].head()
    )


if __name__ == "__main__":
    main()
