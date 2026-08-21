import time
from pathlib import Path

import pandas as pd

from analysis.batch_analyzer import analyze_feedback_batch


INPUT_FILE = Path(
    r"..\..\dataset\processed\theme_painpoint_analysis.csv"
)

BATCH_SIZE = 25

# Wait times after temporary Gemini 503 errors.
RETRY_DELAYS = [30, 60, 120, 240]


def save_progress(df):
    df.to_csv(INPUT_FILE, index=False)


def is_temporary_error(error_text):
    return (
        "503" in error_text
        or "UNAVAILABLE" in error_text
        or "504" in error_text
        or "DEADLINE_EXCEEDED" in error_text
        or "429" in error_text
        or "RESOURCE_EXHAUSTED" in error_text
    )


def main():

    print("=" * 70)
    print("AI PRODUCT MANAGER - RESUME THEME & PAIN-POINT ANALYSIS")
    print("=" * 70)

    df = pd.read_csv(INPUT_FILE)

    print(f"Total records: {len(df)}")

    missing_mask = (
        df["theme"].fillna("").astype(str).str.strip().eq("")
        | df["pain_point"].fillna("").astype(str).str.strip().eq("")
    )

    pending_indices = df.index[missing_mask].tolist()

    print(f"Already enriched: {len(df) - len(pending_indices)}")
    print(f"Still pending: {len(pending_indices)}")

    if not pending_indices:
        print("\nAll records are already enriched.")
        return

    newly_enriched = 0

    for start in range(0, len(pending_indices), BATCH_SIZE):

        batch_indices = pending_indices[
            start:start + BATCH_SIZE
        ]

        batch = df.loc[batch_indices]

        feedback_list = (
            batch["feedback_text"]
            .fillna("")
            .astype(str)
            .tolist()
        )

        print(
            f"\nProcessing pending records "
            f"{start + 1}-"
            f"{min(start + BATCH_SIZE, len(pending_indices))} "
            f"of {len(pending_indices)}..."
        )

        batch_results = None

        # ---------------------------------------------------------
        # GEMINI REQUEST WITH RETRIES
        # ---------------------------------------------------------

        for attempt in range(len(RETRY_DELAYS) + 1):

            try:

                batch_results = analyze_feedback_batch(
                    feedback_list
                )

                break

            except Exception as e:

                error_text = str(e)

                print("\nERROR:")
                print(error_text)

                if not is_temporary_error(error_text):

                    print(
                        "\nNon-retryable error."
                    )

                    print(
                        "Stopping safely."
                    )

                    return

                if attempt >= len(RETRY_DELAYS):

                    print(
                        "\nGemini is still unavailable "
                        "after multiple retries."
                    )

                    print(
                        "Stopping safely."
                    )

                    return

                wait_seconds = RETRY_DELAYS[attempt]

                print(
                    f"\nTemporary Gemini error."
                )

                print(
                    f"Retrying in {wait_seconds} seconds..."
                )

                time.sleep(wait_seconds)

        # ---------------------------------------------------------
        # VALIDATE RESPONSE
        # ---------------------------------------------------------

        if not isinstance(batch_results, list):

            print(
                "WARNING: Gemini did not return a valid list."
            )

            continue

        # ---------------------------------------------------------
        # MATCH AI RESULTS TO ORIGINAL FEEDBACK
        # ---------------------------------------------------------

        ai_lookup = {}

        for item in batch_results:

            if not isinstance(item, dict):
                continue

            feedback = item.get("feedback")

            if not feedback:
                continue

            ai_lookup[str(feedback).strip()] = {
                "theme": str(
                    item.get("theme", "")
                ).strip(),

                "pain_point": str(
                    item.get("pain_point", "")
                ).strip(),
            }

        updated = 0

        for index in batch_indices:

            original_text = str(
                df.at[index, "feedback_text"]
            ).strip()

            result = ai_lookup.get(original_text)

            if not result:
                continue

            theme = result["theme"]
            pain_point = result["pain_point"]

            if theme:
                df.at[index, "theme"] = theme

            if pain_point:
                df.at[index, "pain_point"] = pain_point

            if theme and pain_point:
                updated += 1

        newly_enriched += updated

        # ---------------------------------------------------------
        # SAVE IMMEDIATELY
        # ---------------------------------------------------------

        save_progress(df)

        print(
            f"Batch enriched: {updated}"
        )

        print(
            f"Newly enriched this run: "
            f"{newly_enriched}"
        )

        time.sleep(2)

    # -------------------------------------------------------------
    # FINAL VALIDATION
    # -------------------------------------------------------------

    missing_mask = (
        df["theme"].fillna("").astype(str).str.strip().eq("")
        | df["pain_point"].fillna("").astype(str).str.strip().eq("")
    )

    enriched = (~missing_mask).sum()
    remaining = missing_mask.sum()

    print("\n" + "=" * 70)
    print("RESUME RUN FINISHED")
    print("=" * 70)

    print(f"Total records: {len(df)}")
    print(f"Enriched records: {enriched}")
    print(f"Remaining records: {remaining}")
    print(f"Output file: {INPUT_FILE}")


if __name__ == "__main__":
    main()