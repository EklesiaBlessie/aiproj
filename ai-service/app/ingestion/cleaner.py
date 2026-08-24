from typing import List


class DataCleaner:
    """
    Converts structured restaurant datasets into clean text
    documents ready for chunking and embeddings.
    """

    def clean_reviews(self, df) -> List[dict]:
        documents = []

        for _, row in df.iterrows():

            text = (
                f"Restaurant: {row['restaurant']}\n"
                f"Menu Item: {row['menu_item']}\n"
                f"Rating: {row['rating']}\n"
                f"Review: {row['review']}"
            )

            documents.append(
                {
                    "text": text,
                    "metadata": {
                        "source": "reviews",
                        "restaurant": row["restaurant"],
                        "rating": int(row["rating"]),
                        "date": row["date"],
                    },
                }
            )

        return documents

    def clean_feature_requests(self, df):

        documents = []

        for _, row in df.iterrows():

            text = (
                f"Feature Request: {row['feature_request']}\n"
                f"Priority: {row['priority']}"
            )

            documents.append(
                {
                    "text": text,
                    "metadata": {
                        "source": "feature_requests",
                        "priority": row["priority"],
                    },
                }
            )

        return documents

    def clean_support_tickets(self, df):

        documents = []

        for _, row in df.iterrows():

            text = (
                f"Issue: {row['issue']}\n"
                f"Status: {row['status']}"
            )

            documents.append(
                {
                    "text": text,
                    "metadata": {
                        "source": "support_tickets",
                        "status": row["status"],
                    },
                }
            )

        return documents

    def clean_menu(self, df):

        documents = []

        for _, row in df.iterrows():

            text = (
                f"Menu Item: {row['item']}\n"
                f"Category: {row['category']}\n"
                f"Price: ₹{row['price']}"
            )

            documents.append(
                {
                    "text": text,
                    "metadata": {
                        "source": "menu",
                        "category": row["category"],
                    },
                }
            )

        return documents