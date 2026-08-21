from pathlib import Path
import pandas as pd


class DataLoader:
    """
    Loads restaurant datasets from the data directory.
    """

    def __init__(self, data_path="data"):
        self.data_path = Path(data_path)

    def load_reviews(self):
        file = self.data_path / "reviews" / "restaurant_reviews.csv"
        return pd.read_csv(file)

    def load_feature_requests(self):
        file = self.data_path / "feature_requests" / "feature_requests.csv"
        return pd.read_csv(file)

    def load_support_tickets(self):
        file = self.data_path / "support_tickets" / "support_tickets.csv"
        return pd.read_csv(file)

    def load_menu(self):
        file = self.data_path / "menu" / "menu.csv"
        return pd.read_csv(file)

    def load_all(self):
        return {
            "reviews": self.load_reviews(),
            "feature_requests": self.load_feature_requests(),
            "support_tickets": self.load_support_tickets(),
            "menu": self.load_menu(),
        }