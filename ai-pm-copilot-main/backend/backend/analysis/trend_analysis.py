import pandas as pd


def analyze_feature_request_trends(df):
    """
    Analyze feature-request trends by month and feature cluster.
    """

    data = df[df["Category"].eq("Feature Request")].copy()

    if data.empty:
        return pd.DataFrame()

    data["created_date"] = pd.to_datetime(
        data["created_date"],
        errors="coerce"
    )

    data = data.dropna(subset=["created_date"])

    data["month"] = data["created_date"].dt.to_period("M").astype(str)

    monthly_trend = (
        data.groupby(
            ["month", "feature_cluster"]
        )
        .size()
        .reset_index(name="request_count")
        .sort_values(
            ["month", "request_count"],
            ascending=[True, False]
        )
    )

    return monthly_trend