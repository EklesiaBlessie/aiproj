from analysis.theme_extractor import extract_theme
from analysis.pain_point_detector import detect_pain_point


feedback = """
Food was tasty but delivery took 50 minutes.
"""


print("Theme:")
print(extract_theme(feedback))

print()

print("Pain Point:")
print(detect_pain_point(feedback))