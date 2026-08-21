import re


class CategoryClassifier:
    """
    Rule-based category classifier for product/app feedback.

    The classifier uses keywords from the feedback text.
    """

    CATEGORY_KEYWORDS = {
        "App Crash": [
            "crash",
            "crashes",
            "crashed",
            "crashing",
            "force close",
            "keeps closing",
            "app closed",
        ],

        "UI/UX": [
            "interface",
            "ui",
            "ux",
            "design",
            "layout",
            "screen",
            "button",
            "navigation",
            "confusing",
            "difficult to use",
            "hard to use",
        ],

        "Performance": [
            "slow",
            "lag",
            "laggy",
            "loading",
            "takes too long",
            "freeze",
            "freezes",
            "freezing",
            "performance",
            "hang",
        ],

        "Payment": [
            "payment",
            "pay",
            "paid",
            "transaction",
            "card",
            "upi",
            "billing",
            "refund",
            "money",
            "charge",
        ],

        "Login/Auth": [
            "login",
            "log in",
            "logged in",
            "sign in",
            "signin",
            "password",
            "authentication",
            "otp",
            "verification",
            "account access",
        ],

        "Cart/Checkout": [
            "cart",
            "checkout",
            "purchase",
            "buy",
            "order",
            "place order",
        ],

        "Order Tracking": [
            "tracking",
            "track order",
            "order status",
            "where is my order",
            "delivery status",
        ],

        "Notifications": [
            "notification",
            "notifications",
            "alert",
            "alerts",
            "notify",
            "reminder",
        ],

        "Customer Support": [
            "customer support",
            "customer service",
            "support",
            "help",
            "agent",
            "representative",
        ],

        "Account": [
            "account",
            "profile",
            "username",
            "personal details",
        ],

        "Search": [
            "search",
            "find",
            "search results",
            "search bar",
        ],

        "Feature Request": [
            "feature request",
            "add a feature",
            "please add",
            "would like",
            "should have",
            "it would be nice",
            "new feature",
            "suggestion",
        ],

        "General Feedback": []
    }

    def _normalize(self, text):
        if text is None:
            return ""

        text = str(text).lower()
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def predict(self, text):
        """
        Predict category for one feedback item.
        """

        text = self._normalize(text)

        if not text:
            return "General Feedback"

        scores = {}

        for category, keywords in self.CATEGORY_KEYWORDS.items():
            score = 0

            for keyword in keywords:
                if keyword in text:
                    score += 1

            if score > 0:
                scores[category] = score

        if not scores:
            return "General Feedback"

        # Return category with highest keyword score
        return max(scores, key=scores.get)

    def predict_batch(self, texts):
        """
        Predict categories for multiple feedback records.
        """
        return [self.predict(text) for text in texts]
