from typing import Any, Iterable, Sequence

from langchain_community.utilities.sql_database import SQLDatabase
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


class SQLDatabaseFromEngine(SQLDatabase):
    def __init__(self, engine: Engine) -> None:
        self._engine = engine
        self._inspector = inspect(self._engine)

    def get_table_names(self) -> Iterable[str]:
        return self._inspector.get_table_names()

    def get_table_info(self, table_names: list[str]) -> str:
        infos: list[str] = []
        for name in table_names:
            cols = self._inspector.get_columns(name)
            col_str = ", ".join(f"{c['name']} {c.get('type')}" for c in cols)
            infos.append(f"CREATE TABLE {name} ({col_str})")
        return "\n\n".join(infos)

    def run_sql(self, query: str) -> tuple[list[str], Sequence[tuple[Any, ...]]]:
        with self._engine.begin() as conn:
            result = conn.execute(text(query))
            rows = result.fetchall()
            columns = list(result.keys())
            return columns, rows


