"""
sentiment.py
-------------------------
Delivery App Feedback Sentiment Analysis

Uses VADER text sentiment as the primary signal and
user rating as a secondary signal when the text is ambiguous.
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from config import POSITIVE, NEGATIVE, NEUTRAL
from utils import clean_text


class SentimentClassifier:
    """
    Classifies delivery-app feedback as:
    - Positive
    - Negative
    - Neutral
    """

    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()

    def predict(self, review, rating=None):
        """
        Predict sentiment using text as the primary signal
        and rating as a secondary signal.
        """

        review = clean_text(review)

        if not review:
            return NEUTRAL

        score = self.analyzer.polarity_scores(review)
        compound = score["compound"]

        # Text sentiment is the primary signal.
        if compound <= -0.05:
            return NEGATIVE

        if compound >= 0.05:
            return POSITIVE

        # Use rating only when the text is ambiguous.
        try:
            rating_value = float(rating) if rating is not None else None
        except (TypeError, ValueError):
            rating_value = None

        if rating_value is not None:
            if rating_value <= 2:
                return NEGATIVE

            if rating_value >= 4:
                return POSITIVE

        return NEUTRAL

    def predict_batch(self, reviews, ratings=None):
        """
        Predict sentiments for multiple feedback records.
        """

        if ratings is None:
            return [self.predict(review) for review in reviews]

        return [
            self.predict(review, rating)
            for review, rating in zip(reviews, ratings)
        ]