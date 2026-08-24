from analysis.trend_analysis import analyze_trends

themes = [
    "Slow Delivery",
    "Food Quality",
    "Slow Delivery",
    "App Crash",
    "Slow Delivery",
    "Payment Issue",
    "Food Quality"
]

result = analyze_trends(themes)

print("Trend Analysis")
print("----------------")

for theme, count in result.items():
    print(f"{theme}: {count}")