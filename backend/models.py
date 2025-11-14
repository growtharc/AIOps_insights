from typing import Literal, Optional

from pydantic import BaseModel


class QueryOptions(BaseModel):
    secure_data: bool = True
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    llm_model: str = "gpt-4o-mini"


class SQLQueryStringResult(BaseModel):
    type: Literal["SQL_QUERY_STRING_RESULT"] = "SQL_QUERY_STRING_RESULT"
    sql: str
    for_chart: bool = False


class SQLQueryRunResult(BaseModel):
    type: Literal["SQL_QUERY_RUN_RESULT"] = "SQL_QUERY_RUN_RESULT"
    columns: list[str]
    rows: list[list[object]]
    for_chart: bool = False
    linked_id: Optional[str] = None


class ChartGenerationResult(BaseModel):
    type: Literal["CHART_GENERATION_RESULT"] = "CHART_GENERATION_RESULT"
    chartjs_json: str
    chart_type: str
    linked_id: Optional[str] = None


