import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter, Body
from fastapi.responses import StreamingResponse

from models import QueryOptions
from services.llm_flow.graph import QueryGraphService
from state import session_store
from services.llm_flow.utils import SQLDatabaseFromEngine


router = APIRouter(prefix="/query", tags=["query"])


def to_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n"


@router.post("")
async def query(
    session_id: str = Body(...),
    prompt: str = Body(...),
    secure_data: bool = Body(default=True),
) -> StreamingResponse:
    engine = session_store.get_engine(session_id)
    if engine is None:
        raise RuntimeError("Invalid session_id. Upload CSV first.")

    query_service = QueryGraphService(engine=engine)

    async def stream() -> AsyncGenerator[bytes, None]:
        async for messages, results in query_service.query(prompt, QueryOptions(secure_data=secure_data)):
            if results:
                for r in results:
                    yield to_sse("ADD_RESULT", r).encode()
            await asyncio.sleep(0)  # cooperative
        yield to_sse("END", {"ok": True}).encode()

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.post("/execute")
async def execute_sql(
    session_id: str = Body(...),
    sql: str = Body(...),
    for_chart: bool = Body(default=False),
):
    from fastapi import HTTPException
    import logging
    
    logger = logging.getLogger(__name__)
    
    engine = session_store.get_engine(session_id)
    if engine is None:
        raise HTTPException(status_code=400, detail="Invalid session_id. Upload CSV first.")

    try:
        db = SQLDatabaseFromEngine(engine)
        columns, rows = db.run_sql(sql)
        # normalize rows to array of arrays
        normalized = [list(r) for r in rows]
        return {"columns": columns, "rows": normalized, "for_chart": for_chart}
    except Exception as e:
        logger.error(f"SQL execution failed: {sql}", exc_info=True)
        error_msg = str(e)
        # Provide helpful error messages
        if "no such column" in error_msg.lower():
            raise HTTPException(status_code=400, detail=f"SQL Error: Column not found. {error_msg}")
        elif "syntax error" in error_msg.lower():
            raise HTTPException(status_code=400, detail=f"SQL Syntax Error: {error_msg}")
        else:
            raise HTTPException(status_code=500, detail=f"SQL execution failed: {error_msg}")


