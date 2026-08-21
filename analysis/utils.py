"""
utils.py
-------------------------
Utility functions for Restaurant Feedback Analysis
"""

import re
import string
import pandas as pd


def clean_text(text):
    """
    Clean a review by:
    - converting to lowercase
    - removing URLs
    - removing HTML tags
    - removing punctuation
    - removing extra spaces
    """

    if pd.isna(text):
        return ""

    text = str(text).lower()

    # Remove URLs
    text = re.sub(r"http\S+|www\S+", "", text)

    # Remove HTML tags
    text = re.sub(r"<.*?>", "", text)

    # Remove punctuation
    text = text.translate(str.maketrans("", "", string.punctuation))

    # Remove numbers
    text = re.sub(r"\d+", "", text)

    # Remove extra spaces
    text = re.sub(r"\s+", " ", text).strip()

    return text


def contains_keyword(text, keywords):
    """
    Returns True if any keyword exists in the text.
    """

    text = clean_text(text)

    for keyword in keywords:
        if keyword.lower() in text:
            return True

    return False


def preprocess_dataframe(df):
    """
    Preprocess the dataset before analysis.
    Ensures there is a 'review' column and cleans it.
    """

    possible_columns = [
    "feedback_text",
    "review",
    "Review",
    "review_text",
    "Review_Text",
    "feedback",
    "Feedback",
    "Feedback_Text",
    "comment",
    "Comment",
    "text",
    "Text",
    "description",
    "Description",
]

    review_column = None

    for column in possible_columns:
        if column in df.columns:
            review_column = column
            break

    if review_column is None:
        raise ValueError(
            "No review column found in the dataset."
        )

    df["review"] = df[review_column].astype(str).apply(clean_text)

    return df


def safe_text(value):
    """
    Safely converts any value into a clean string.
    """

    if pd.isna(value):
        return ""

    return clean_text(str(value))