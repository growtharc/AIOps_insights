from typing import Dict, Optional

from sqlalchemy.engine import Engine


class SessionStore:
    def __init__(self) -> None:
        self._engines: Dict[str, Engine] = {}

    def add_session(self, session_id: str, engine: Engine) -> None:
        self._engines[session_id] = engine

    def get_engine(self, session_id: str) -> Optional[Engine]:
        return self._engines.get(session_id)


session_store = SessionStore()


