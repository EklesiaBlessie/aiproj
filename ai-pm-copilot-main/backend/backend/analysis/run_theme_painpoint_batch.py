import time
from pathlib import Path

import pandas as pd

from analysis.batch_analyzer import analyze_feedback_batch


INPUT_FILE = Path(r"..\..\dataset\processed\analyzed_feedback.csv")
OUTPUT_FILE = Path(r"..\..\dataset\processed\theme_painpoint_analysis.csv")

BATCH_SIZE = 10


def save_results(df, results):
    """
    Save currently available AI results.
    """

    ai_lookup = {}

    for item in results:
        if not isinstance(item, dict):
            continue

        feedback = item.get("feedback")

        if feedback:
            ai_lookup[feedback] = {
                "theme": item.get("theme", ""),
                "pain_point": item.get("pain_point", "")
            }

    output = df.copy()

    output["theme"] = output["feedback_text"].map(
        lambda x: ai_lookup.get(x, {}).get("theme", "")
    )

    output["pain_point"] = output["feedback_text"].map(
        lambda x: ai_lookup.get(x, {}).get("pain_point", "")
    )

    output.to_csv(
        OUTPUT_FILE,
        index=False
    )

    return output


def main():

    print("=" * 70)
    print("AI PRODUCT MANAGER - THEME & PAIN-POINT ANALYSIS")
    print("=" * 70)

    df = pd.read_csv(INPUT_FILE)

    print(f"Loaded records: {len(df)}")

    results = []

    for start in range(0, len(df), BATCH_SIZE):

        batch = df.iloc[start:start + BATCH_SIZE]

        feedback_list = batch["feedback_text"].tolist()

        print(
            f"Processing records "
            f"{start + 1}-{min(start + BATCH_SIZE, len(df))}..."
        )

        try:

            batch_results = analyze_feedback_batch(feedback_list)

            if not isinstance(batch_results, list):

                print("WARNING: Gemini did not return a list.")

                continue

            results.extend(batch_results)

            print(
                f"Batch successful. "
                f"AI results collected: {len(results)}"
            )

        except Exception as e:

            error_text = str(e)

            print(
                f"\nERROR processing batch "
                f"{start + 1}-{min(start + BATCH_SIZE, len(df))}:"
            )

            print(error_text)

            # Stop immediately when Gemini quota is exhausted.
            if "429" in error_text or "RESOURCE_EXHAUSTED" in error_text:

                print("\nGemini API quota exceeded.")
                print("Stopping safely to avoid unnecessary requests.")

                break

            # Stop on other unexpected API errors too.
            print("\nUnexpected API error.")
            print("Stopping safely.")

            break

        # Small delay between successful requests.
        time.sleep(1)

    # ---------------------------------------------------------
    # SAVE EVERYTHING THAT SUCCESSFULLY COMPLETED
    # ---------------------------------------------------------

    output = save_results(df, results)

    print("\n" + "=" * 70)
    print("THEME & PAIN-POINT ANALYSIS RUN FINISHED")
    print("=" * 70)

    print(f"Input records: {len(df)}")
    print(f"AI results received: {len(results)}")
    print(f"Output records: {len(output)}")
    print(f"Output file: {OUTPUT_FILE}")

    print("\nMissing themes:")
    print(output["theme"].eq("").sum())

    print("\nMissing pain points:")
    print(output["pain_point"].eq("").sum())

    print("\nIMPORTANT:")
    print("The output contains all successfully processed records.")
    print("Unprocessed records remain blank and can be processed later.")


if __name__ == "__main__":
    main()