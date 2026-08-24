from pathlib import Path

import pandas as pd

from analysis.feature_cluster import cluster_features
from analysis.trend_analysis import analyze_feature_request_trends


INPUT_FILE = Path(
    r"..\..\dataset\processed\theme_painpoint_analysis.csv"
)

OUTPUT_FILE = Path(
    r"..\..\dataset\processed\feature_request_trends.csv"
)


def main():

    print("=" * 70)
    print("AI PRODUCT MANAGER - FEATURE REQUEST TREND ANALYSIS")
    print("=" * 70)

    df = pd.read_csv(INPUT_FILE)

    print(f"Loaded records: {len(df)}")

    # ---------------------------------------------------------
    # 1. SELECT FEATURE REQUESTS
    # ---------------------------------------------------------

    feature_df = df[
        df["Category"].eq("Feature Request")
    ].copy()

    print(
        f"Feature requests found: {len(feature_df)}"
    )

    # ---------------------------------------------------------
    # 2. CREATE FEATURE CLUSTERS
    # ---------------------------------------------------------

    features = (
        feature_df["feedback_text"]
        .fillna("")
        .astype(str)
        .tolist()
    )

    clusters = cluster_features(features)

    # Map each feedback text to its cluster.
    cluster_lookup = {}

    for cluster_name, items in clusters.items():

        for item in items:
            cluster_lookup[item] = cluster_name

    feature_df["feature_cluster"] = (
        feature_df["feedback_text"]
        .map(cluster_lookup)
    )

    # ---------------------------------------------------------
    # 3. TREND ANALYSIS
    # ---------------------------------------------------------

    trends = analyze_feature_request_trends(
        feature_df
    )

    # ---------------------------------------------------------
    # 4. SAVE RESULTS
    # ---------------------------------------------------------

    trends.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("\n" + "=" * 70)
    print("FEATURE REQUEST TREND ANALYSIS COMPLETED")
    print("=" * 70)

    print(f"Feature requests: {len(feature_df)}")
    print(f"Trend rows: {len(trends)}")

    print("\nFeature Cluster Distribution:")

    print(
        feature_df["feature_cluster"]
        .value_counts()
        .to_string()
    )

    print("\nMonthly Trend:")

    print(
        trends.to_string(index=False)
    )

    print(f"\nOutput file:")
    print(OUTPUT_FILE)


if __name__ == "__main__":
    main()