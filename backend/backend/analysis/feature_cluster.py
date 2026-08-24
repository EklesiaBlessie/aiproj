def cluster_features(features):
    """
    Cluster delivery-app feature requests into meaningful product themes.
    """

    clusters = {
        "Dark Mode": [],
        "Saved Address Management": [],
        "Delivery Estimate Accuracy": [],
        "Other Feature Requests": []
    }

    for feature in features:

        text = str(feature).lower()

        if "dark mode" in text:
            clusters["Dark Mode"].append(feature)

        elif "saved address" in text and (
            "disappeared" in text
            or "lost" in text
            or "delete" in text
        ):
            clusters["Saved Address Management"].append(feature)

        elif "delivery estimate" in text:
            clusters["Delivery Estimate Accuracy"].append(feature)

        else:
            clusters["Other Feature Requests"].append(feature)

    return clusters