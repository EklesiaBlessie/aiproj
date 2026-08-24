import re
import difflib
from typing import Literal, Tuple, Any

Intent = Literal["chitchat", "business"]
SubIntent = Literal["chitchat", "prd", "user_story", "acceptance_criteria", "prioritize", "analyze"]

_CHITCHAT_PATTERN = re.compile(
    r"^\s*("
    r"hi|hello|hey|yo|hola|"
    r"good\s+(morning|afternoon|evening|night)|"
    r"greetings|"
    r"bye|goodbye|see\s+ya|see\s+you|later|"
    r"thanks|thank\s+you|thx|"
    r"ok|okay|cool|got\s+it|sounds\s+good|"
    r"how\s+are\s+you|what['’]?s\s+up|"
    r"who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do"
    r")\s*[!.?]*\s*$",
    re.IGNORECASE,
)

CHITCHAT_KEYWORDS = [
    "hi", "hello", "hey", "yo", "hola", "greetings",
    "good morning", "good afternoon", "good evening", "good night",
    "goodmorning", "goodafternoon", "goodevening", "goodnight",
    "bye", "goodbye", "see ya", "see you", "later",
    "thanks", "thank you", "thankyou", "thx", "ok", "okay", "cool", "got it", "sounds good",
    "how are you", "what's up", "whats up", "what’s up",
    "who are you", "what are you", "what can you do"
]

PRD_KEYWORDS = [
    "prd", "generate prd", "create prd", "write prd", "make prd", "build prd",
    "product requirements", "product requirement document", "requirements document"
]

USER_STORY_KEYWORDS = [
    "user story", "user stories", "user-story", "user-stories", "generate stories",
    "generate user story", "generate user stories", "create user story", "create user stories",
    "write user story", "write user stories"
]

ACCEPTANCE_CRITERIA_KEYWORDS = [
    "acceptance criteria", "acceptance criterion", "acceptance test", "acceptance tests",
    "generate acceptance criteria", "create acceptance criteria", "write acceptance criteria",
    "acceptance requirements"
]

PRIORITIZE_KEYWORDS = [
    "rice", "rice score", "rice scores", "ice", "ice score", "moscow", "moscow prioritization",
    "prioritize", "prioritise", "priority score", "feature score", "feature scores",
    "rank features", "ranking features"
]

CATEGORIES = {
    "chitchat": CHITCHAT_KEYWORDS,
    "prd": PRD_KEYWORDS,
    "user_story": USER_STORY_KEYWORDS,
    "acceptance_criteria": ACCEPTANCE_CRITERIA_KEYWORDS,
    "prioritize": PRIORITIZE_KEYWORDS,
}

def get_ngrams(text: str, max_n: int = 4) -> list[str]:
    words = text.split()
    ngrams = []
    # Add single words
    ngrams.extend(words)
    # Add n-grams
    for n in range(2, min(max_n + 1, len(words) + 1)):
        for i in range(len(words) - n + 1):
            ngrams.append(" ".join(words[i:i+n]))
    return list(set(ngrams))

def classify_full(question: str, ai_service: Any = None) -> Tuple[str, str, dict]:
    cleaned = (question or "").strip()
    if not cleaned:
        print(f"[intent_classifier] question='' -> business/analyze (via: empty_default)")
        return "business", "analyze", {"tier": 1, "method": "empty_default"}

    lower_q = cleaned.lower()

    # -------------------------------------------------------------------------
    # TIER 1: Exact Match
    # -------------------------------------------------------------------------
    # 1. Chitchat check
    if _CHITCHAT_PATTERN.match(cleaned):
        print(f"[intent_classifier] question={cleaned!r} -> chitchat (via: exact_match)")
        return "chitchat", "chitchat", {"tier": 1, "method": "exact_match"}

    # 2. Business check
    # Check PRD keywords
    if any(kw in lower_q for kw in PRD_KEYWORDS):
        print(f"[intent_classifier] question={cleaned!r} -> business/prd (via: exact_match)")
        return "business", "prd", {"tier": 1, "method": "exact_match"}

    # Check User Story keywords
    if any(kw in lower_q for kw in USER_STORY_KEYWORDS):
        print(f"[intent_classifier] question={cleaned!r} -> business/user_story (via: exact_match)")
        return "business", "user_story", {"tier": 1, "method": "exact_match"}

    # Check Acceptance Criteria keywords
    if any(kw in lower_q for kw in ACCEPTANCE_CRITERIA_KEYWORDS):
        print(f"[intent_classifier] question={cleaned!r} -> business/acceptance_criteria (via: exact_match)")
        return "business", "acceptance_criteria", {"tier": 1, "method": "exact_match"}

    # Check Prioritize keywords
    if any(kw in lower_q for kw in PRIORITIZE_KEYWORDS):
        print(f"[intent_classifier] question={cleaned!r} -> business/prioritize (via: exact_match)")
        return "business", "prioritize", {"tier": 1, "method": "exact_match"}

    # -------------------------------------------------------------------------
    # TIER 2: Fuzzy Match
    # -------------------------------------------------------------------------
    try:
        candidates = get_ngrams(lower_q, max_n=4)
        best_match_category = None
        best_matched_keyword = None
        best_score = 0.0
        cutoff = 0.78  # Start around 0.75-0.80

        for candidate in candidates:
            for category, target_list in CATEGORIES.items():
                matches = difflib.get_close_matches(candidate, target_list, n=1, cutoff=cutoff)
                if matches:
                    matched_kw = matches[0]
                    # Require word counts to match to prevent partial subphrase mismatching (e.g. "what are" -> "what are you")
                    if len(candidate.split()) != len(matched_kw.split()):
                        continue
                    # If category is chitchat, ignore if the overall question is significantly longer
                    if category == "chitchat" and len(lower_q.split()) > len(matched_kw.split()) + 2:
                        continue

                    score = difflib.SequenceMatcher(None, candidate, matched_kw).ratio()
                    if score > best_score:
                        best_score = score
                        best_match_category = category
                        best_matched_keyword = matched_kw

        if best_match_category and best_score >= cutoff:
            top_level = "chitchat" if best_match_category == "chitchat" else "business"
            sub_intent = best_match_category

            sub_intent_str = f"/{sub_intent}" if top_level == "business" else ""
            print(f"[intent_classifier] question={cleaned!r} -> {top_level}{sub_intent_str} (via: fuzzy_match, matched={best_matched_keyword!r}, score={best_score:.2f})")

            return top_level, sub_intent, {
                "tier": 2,
                "method": "fuzzy_match",
                "matched_keyword": best_matched_keyword,
                "score": best_score,
            }
    except Exception as e:
        print(f"[intent_classifier] Fuzzy match raised error: {e}. Continuing to fallback...")

    # -------------------------------------------------------------------------
    # TIER 3: LLM Fallback (only for short/ambiguous queries)
    # -------------------------------------------------------------------------
    is_long = len(lower_q.split()) >= 5 or len(lower_q) >= 30
    if is_long:
        print(f"[intent_classifier] question={cleaned!r} -> business/analyze (via: length_heuristic_default)")
        return "business", "analyze", {"tier": 2, "method": "length_heuristic_default"}

    if ai_service:
        try:
            prompt = (
                "Classify this message into exactly one category, respond with only "
                "the category name and nothing else: chitchat, prd, user_story, "
                "acceptance_criteria, prioritize, or analyze.\n"
                "- chitchat: greeting, farewell, thanks, small talk\n"
                "- prd: request to generate/write a product requirements document\n"
                "- user_story: request for user stories\n"
                "- acceptance_criteria: request for acceptance criteria\n"
                "- prioritize: request to rank/score/prioritize features (RICE/ICE/MoSCoW)\n"
                "- analyze: any other real product/feedback question\n"
                f"Message: {cleaned}\n"
                "Category:"
            )

            reply = ai_service.llm.generate(prompt)
            parsed_reply = (reply or "").strip().lower()

            if "chitchat" in parsed_reply:
                print(f"[intent_classifier] question={cleaned!r} -> chitchat (via: llm_fallback)")
                return "chitchat", "chitchat", {"tier": 3, "method": "llm_fallback"}
            elif "prd" in parsed_reply:
                print(f"[intent_classifier] question={cleaned!r} -> business/prd (via: llm_fallback)")
                return "business", "prd", {"tier": 3, "method": "llm_fallback"}
            elif "user_story" in parsed_reply or "userstory" in parsed_reply:
                print(f"[intent_classifier] question={cleaned!r} -> business/user_story (via: llm_fallback)")
                return "business", "user_story", {"tier": 3, "method": "llm_fallback"}
            elif "acceptance_criteria" in parsed_reply or "acceptancecriteria" in parsed_reply:
                print(f"[intent_classifier] question={cleaned!r} -> business/acceptance_criteria (via: llm_fallback)")
                return "business", "acceptance_criteria", {"tier": 3, "method": "llm_fallback"}
            elif "prioritize" in parsed_reply:
                print(f"[intent_classifier] question={cleaned!r} -> business/prioritize (via: llm_fallback)")
                return "business", "prioritize", {"tier": 3, "method": "llm_fallback"}
            elif "analyze" in parsed_reply:
                print(f"[intent_classifier] question={cleaned!r} -> business/analyze (via: llm_fallback)")
                return "business", "analyze", {"tier": 3, "method": "llm_fallback"}

        except Exception as e:
            print(f"[intent_classifier] LLM fallback error: {e}. Defaulting to business/analyze.")

    print(f"[intent_classifier] question={cleaned!r} -> business/analyze (via: safe_default)")
    return "business", "analyze", {"tier": 3, "method": "safe_default"}

def classify(question: str) -> Intent:
    top_level, _, _ = classify_full(question)
    return top_level

def is_chitchat(question: str) -> bool:
    return classify(question) == "chitchat"