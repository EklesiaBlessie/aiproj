def cluster_features(features):
    """
    Simple keyword-based clustering.
    """

    clusters = {
        "UI Improvements": [],
        "Payment": [],
        "Delivery": [],
        "Food": [],
        "Others": []
    }

    for feature in features:

        text = feature.lower()

        if "dark" in text or "theme" in text or "ui" in text:
            clusters["UI Improvements"].append(feature)

        elif "payment" in text:
            clusters["Payment"].append(feature)

        elif "delivery" in text:
            clusters["Delivery"].append(feature)

        elif "food" in text:
            clusters["Food"].append(feature)

        else:
            clusters["Others"].append(feature)

    return clusters