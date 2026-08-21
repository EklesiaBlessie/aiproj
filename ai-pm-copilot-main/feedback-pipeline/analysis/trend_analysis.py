from collections import Counter


def analyze_trends(themes):
    """
    Count occurrences of each theme.
    """

    counter = Counter(themes)

    return dict(counter)