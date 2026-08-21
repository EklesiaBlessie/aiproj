import threading

class ContextManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ContextManager, cls).__new__(cls)
                cls._instance.history = {}
            return cls._instance

    def add_message(self, session_id: str, role: str, content: str):
        if not session_id:
            return
        if session_id not in self.history:
            self.history[session_id] = []
        self.history[session_id].append({"role": role, "content": content})
        # Keep only the last 10 turns (20 messages) to limit context size
        if len(self.history[session_id]) > 20:
            self.history[session_id] = self.history[session_id][-20:]

    def get_history(self, session_id: str):
        if not session_id or session_id not in self.history:
            return []
        return self.history[session_id]

    def clear(self, session_id: str):
        if session_id in self.history:
            self.history[session_id] = []
