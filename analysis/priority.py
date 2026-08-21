import re


class PriorityClassifier:
    """
    Assigns High / Medium / Low priority using:
    - sentiment
    - rating
    - critical issue keywords
    """

    HIGH_PRIORITY_KEYWORDS = [
        "crash",
        "crashes",
        "crashed",
        "not working",
        "cannot login",
        "can't login",
        "unable to login",
        "payment failed",
        "money deducted",
        "charged twice",
        "security",
        "data loss",
        "lost my data",
        "account blocked",
        "urgent",
        "critical",
    ]

    MEDIUM_PRIORITY_KEYWORDS = [
        "slow",
        "lag",
        "loading",
        "error",
        "problem",
        "issue",
        "confusing",
        "difficult",
        "bug",
    ]

    def _normalize(self, text):
        if text is None:
            return ""

        text = str(text).lower()
        text = re.sub(r"\s+", " ", text)

        return text.strip()

    def predict(self, text, sentiment="Neutral", rating=None):
        """
        Predict priority for one feedback item.
        """

        text = self._normalize(text)
        sentiment = str(sentiment).lower().strip()

        # Critical keywords
        for keyword in self.HIGH_PRIORITY_KEYWORDS:
            if keyword in text:
                return "High"

        # Rating-based priority
        try:
            rating_value = float(rating) if rating is not None else None
        except (ValueError, TypeError):
            rating_value = None

        # Very low rating + negative sentiment
        if rating_value is not None:
            if rating_value <= 2 and sentiment == "negative":
                return "High"

        # Medium priority issues
        for keyword in self.MEDIUM_PRIORITY_KEYWORDS:
            if keyword in text:
                return "Medium"

        # Negative feedback without a critical issue
        if sentiment == "negative":
            return "Medium"

        # Positive feedback
        if sentiment == "positive":
            return "Low"

        return "Low"

    def predict_batch(self, texts, sentiments, ratings=None):
        """
        Predict priority for multiple feedback records.
        """

        if ratings is None:
            ratings = [None] * len(texts)

        return [
            self.predict(text, sentiment, rating)
            for text, sentiment, rating in zip(
                texts,
                sentiments,
                ratings
            )
        ]
