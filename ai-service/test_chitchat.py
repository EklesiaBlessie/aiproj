import os
import sys

# Ensure local path is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(".env")

from app.services.chitchat_service import is_chitchat, build_chitchat_prompt
from app.services.copilot_service import CopilotService
from app.services.ai_service import AIService
from app.services.prd_service import PRDService
from app.services.prioritization_service import PrioritizationService
from app.rag.retriever import Retriever

def test_classifier():
    print("🧪 Running Chitchat Classifier Tests...")
    
    true_cases = [
        "hi",
        "Hello!",
        "thanks",
        "bye",
        "what can you do",
        "who are you?",
        "Good Morning.",
        "thank you!!!",
        "cool",
        "ok",
        "how are you?",
        "what's up",
        "whats up",
        "what’s up?",
        "hello !"
    ]
    
    false_cases = [
        "What are the top complaints about delivery time?",
        "Hey, can you tell me about refund complaints?",
        "hi there, tell me a joke",
        "ok, write a prd for dark mode",
        "who are you to tell me what to do?",
        "thanks for the info, but what is the rating?"
    ]
    
    for case in true_cases:
        assert is_chitchat(case) == True, f"Failed: '{case}' should be detected as chitchat"
        
    for case in false_cases:
        assert is_chitchat(case) == False, f"Failed: '{case}' should NOT be detected as chitchat"
        
    print("✅ All Chitchat Classifier Tests Passed!")

def test_prompt_generation():
    print("\n🧪 Running Prompt Generation Tests...")
    
    p1 = build_chitchat_prompt("hello", "")
    assert "Aria" in p1
    assert "who are you" not in p1.lower()
    
    p2 = build_chitchat_prompt("what can you do?", "")
    assert "analyzing customer feedback" in p2.lower()
    assert "writing product requirement documents" in p2.lower() or "prds" in p2.lower()
    
    print("✅ Prompt Generation Tests Passed!")

def test_router_and_session():
    print("\n🧪 Running Copilot Service End-To-End Routing & Session Tests...")
    
    import requests
    import time
    
    server_url = "http://127.0.0.1:8000/copilot"
    session_id = "test_session_chitchat_123"
    
    connected = False
    for attempt in range(1, 6):
        try:
            probe = requests.post(server_url, json={"question": "hi", "session_id": session_id}, timeout=30)
            connected = True
            break
        except requests.exceptions.RequestException:
            time.sleep(2)
            
    if connected:
        print("📡 FastAPI server detected on port 8000. Running E2E tests via HTTP...")
        
        res1 = requests.post(server_url, json={"question": "hello", "session_id": session_id}, timeout=30).json()
        print("\nTurn 1 Response:")
        print(res1)
        assert res1["intent"] == "chitchat"
        assert res1["answer"] is not None
        assert res1["session_id"] == session_id
        
        res2 = requests.post(server_url, json={"question": "who are you?", "session_id": session_id}, timeout=30).json()
        print("\nTurn 2 Response:")
        print(res2)
        assert res2["intent"] == "chitchat"
        assert "Aria" in res2["answer"]
        assert res2["session_id"] == session_id
        
        res3 = requests.post(server_url, json={"question": "What do customers say about order tracking?", "session_id": session_id}, timeout=30).json()
        print("\nTurn 3 Response:")
        print("Intent:", res3["intent"])
        assert res3["intent"] == "analyze"
        assert "sources" in res3
        assert res3["session_id"] == session_id
        
        print("\n✅ Router & Session Tests Passed via HTTP!")
        return
    else:
        print("📡 FastAPI server not running on port 8000. Falling back to local instances...")
        
    retriever = Retriever()
    try:
        ai_svc = AIService(retriever)
        prd_svc = PRDService(retriever)
        priority_svc = PrioritizationService()
        copilot_svc = CopilotService(ai_svc, prd_svc, priority_svc)
        
        copilot_svc.context_manager.clear(session_id)
        
        res1 = copilot_svc.answer("hello", session_id=session_id)
        print("\nTurn 1 Response:")
        print(res1)
        assert res1["intent"] == "chitchat"
        assert res1["answer"] is not None
        
        history = copilot_svc.context_manager.get_history(session_id)
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[0]["content"] == "hello"
        assert history[1]["role"] == "assistant"
        
        res2 = copilot_svc.answer("who are you?", session_id=session_id)
        print("\nTurn 2 Response:")
        print(res2)
        assert res2["intent"] == "chitchat"
        assert "Aria" in res2["answer"]
        
        history = copilot_svc.context_manager.get_history(session_id)
        assert len(history) == 4
        
        res3 = copilot_svc.answer("What do customers say about order tracking?", session_id=session_id)
        print("\nTurn 3 Response:")
        print("Intent:", res3["intent"])
        assert res3["intent"] == "analyze"
        assert "sources" in res3
        
        copilot_svc.context_manager.clear(session_id)
        print("\n✅ Router & Session Tests Passed locally!")
        
    finally:
        retriever.close()

if __name__ == "__main__":
    test_classifier()
    test_prompt_generation()
    test_router_and_session()
