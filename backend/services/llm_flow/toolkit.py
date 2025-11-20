from typing import Any, Iterable, List, Optional, Sequence, Type, TypedDict

from fastapi.encoders import jsonable_encoder
from langchain_core.callbacks import CallbackManagerForToolRun
from langchain_core.messages import BaseMessage, ToolMessage
from langchain_core.tools import BaseTool, BaseToolkit
from pydantic import BaseModel, Field

from models import QueryOptions, SQLQueryRunResult, SQLQueryStringResult
from .utils import SQLDatabaseFromEngine


class QueryGraphState(BaseModel):
    messages: Sequence[BaseMessage]
    results: list[dict]
    options: QueryOptions
    sql_toolkit: "SQLDatabaseToolkit"
    user_query: str = ""

    class Config:
        arbitrary_types_allowed = True


class QueryGraphStateUpdate(TypedDict):
    messages: Sequence[BaseMessage]
    results: list[dict]


def state_update(messages: Sequence[BaseMessage] = [], results: list[dict] = []) -> QueryGraphStateUpdate:
    return {"messages": messages, "results": results}


class BaseSQLDatabaseTool(BaseTool):
    db: SQLDatabaseFromEngine = Field(exclude=True)

    class Config:
        arbitrary_types_allowed = True


class StateUpdaterTool(BaseTool):  # type: ignore[misc]
    def get_response(self, state: QueryGraphState, args: dict[str, Any], call_id: str) -> QueryGraphStateUpdate:  # type: ignore[misc]
        raise NotImplementedError


class _ListTablesInput(BaseModel):
    tool_input: str = Field("", description="empty")


class ListTablesTool(BaseSQLDatabaseTool):
    name: str = "list_sql_tables"
    description: str = "Return a comma-separated list of tables in the database"
    args_schema: Type[BaseModel] = _ListTablesInput

    def _run(self, tool_input: str = "", run_manager: Optional[CallbackManagerForToolRun] = None) -> list[str]:  # type: ignore[misc]
        return list(self.db.get_table_names())


class _InfoTablesInput(BaseModel):
    table_names: str = Field(..., description="Comma separated list of tables to get schema for")


class InfoTablesTool(BaseSQLDatabaseTool, StateUpdaterTool):
    name: str = "sql_db_schema"
    description: str = "Get schema and sample rows for the specified tables"
    args_schema: Type[BaseModel] = _InfoTablesInput

    def _run(self, table_names: str, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:  # type: ignore[misc]
        names = [t.strip() for t in table_names.split(",") if t.strip()]
        return self.db.get_table_info(names)

    def get_response(self, state: QueryGraphState, args: dict[str, Any], call_id: str) -> QueryGraphStateUpdate:  # type: ignore[misc]
        response = self.run(args)
        tool_message = ToolMessage(content=str(response), name=self.name, tool_call_id=call_id)
        return state_update(messages=[tool_message])


class _ExecuteSQLInput(BaseModel):
    query: str
    for_chart: bool = False


class ExecuteSQLTool(BaseSQLDatabaseTool, StateUpdaterTool):
    name: str = "sql_db_query"
    description: str = "Execute a SQL query and return rows + columns"
    args_schema: Type[BaseModel] = _ExecuteSQLInput

    def _run(self, query: str, for_chart: bool = False, run_manager: Optional[CallbackManagerForToolRun] = None):  # type: ignore[misc]
        cols, rows = self.db.run_sql(query)
        return cols, rows, for_chart

    def get_response(self, state: QueryGraphState, args: dict[str, Any], call_id: str) -> QueryGraphStateUpdate:  # type: ignore[misc]
        sql_result = SQLQueryStringResult(sql=args["query"], for_chart=args.get("for_chart", False))
        try:
            cols, rows, for_chart = self.run(args)
            run_result = SQLQueryRunResult(columns=cols, rows=[list(r) for r in rows], for_chart=for_chart)
            tool_message = ToolMessage(
                content=(
                    "Query executed successfully. "
                    "I cannot display raw data if secure mode is enabled; describe it instead."
                ),
                name=self.name,
                tool_call_id=call_id,
            )
            return state_update(messages=[tool_message], results=[sql_result.model_dump(), run_result.model_dump()])
        except Exception as e:
            tool_message = ToolMessage(content=f"ERROR: {str(e)}", name=self.name, tool_call_id=call_id)
            return state_update(messages=[tool_message], results=[sql_result.model_dump()])


class SQLDatabaseToolkit(BaseToolkit):
    db: SQLDatabaseFromEngine = Field(exclude=True)

    class Config:
        arbitrary_types_allowed = True

    def __init__(self, db: SQLDatabaseFromEngine) -> None:  # type: ignore[misc]
        super().__init__(db=db)
        self.tool_map: dict[str, BaseTool] = {}

    def get_tools(self, allow_execution: bool = True) -> List[BaseTool]:
        list_tables = ListTablesTool(db=self.db)
        info_tables = InfoTablesTool(db=self.db)
        execute = ExecuteSQLTool(db=self.db)

        tools: list[BaseTool] = [list_tables, info_tables]
        if allow_execution:
            tools.append(execute)

        # expose a name->tool map for executor-like behavior
        self.tool_map = {t.name: t for t in tools}
        return tools


