from analysis.feature_cluster import cluster_features

features = [
    "Need Dark Theme",
    "Add Payment Gateway",
    "Delivery Tracking",
    "Improve Food Quality",
    "Need Better UI",
    "More Payment Options"
]

clusters = cluster_features(features)

for name, items in clusters.items():

    print("\n", name)

    for item in items:
        print("-", item)