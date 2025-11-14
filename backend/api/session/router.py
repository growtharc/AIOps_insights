import io
import logging
import tempfile
import uuid
from pathlib import Path
from typing import Any, List, Dict

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import create_engine

from backend.state import session_store


router = APIRouter(prefix="/session", tags=["session"])
logger = logging.getLogger(__name__)


class LoadDataRequest(BaseModel):
    data: List[Dict[str, Any]]


@router.post("/load")
async def load_data(request: LoadDataRequest) -> dict[str, Any]:
    try:
        df = pd.DataFrame(request.data)

        if df.empty:
            raise HTTPException(status_code=400, detail="Data is empty")

        # Clean column names (remove special chars, strip whitespace)
        df.columns = df.columns.str.strip()
        
        # Replace NaN with None for better JSON serialization
        df = df.where(pd.notnull(df), None)

        session_id = str(uuid.uuid4())
        # create per-session sqlite in temp directory
        temp_dir = Path(tempfile.gettempdir()) / "ai_analyst_sessions"
        temp_dir.mkdir(exist_ok=True)
        db_file = temp_dir / f"session_{session_id}.db"
        db_path = f"sqlite:///{db_file}"
        
        engine = create_engine(db_path)
        df.to_sql("data", engine, if_exists="replace", index=False)

        session_store.add_session(session_id, engine)
        logger.info(f"Created session {session_id} with {len(df)} rows from JSON data")
        return {"session_id": session_id, "rows": len(df), "columns": list(df.columns)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Data loading failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Data loading failed: {str(e)}")


@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)) -> dict[str, Any]:
    try:
        content = await file.read()
        
        # Try multiple encodings and parsing strategies
        try:
            df = pd.read_csv(io.BytesIO(content), encoding='utf-8')
        except UnicodeDecodeError:
            logger.warning("UTF-8 decode failed, trying latin-1")
            df = pd.read_csv(io.BytesIO(content), encoding='latin-1')
        except Exception as parse_err:
            logger.warning(f"Standard parse failed: {parse_err}, trying with error handling")
            df = pd.read_csv(
                io.BytesIO(content), 
                encoding='utf-8',
                encoding_errors='replace',
                on_bad_lines='skip'
            )

        if df.empty:
            raise HTTPException(status_code=400, detail="CSV file is empty")

        # Clean column names (remove special chars, strip whitespace)
        df.columns = df.columns.str.strip()
        
        # Replace NaN with None for better JSON serialization
        df = df.where(pd.notnull(df), None)

        session_id = str(uuid.uuid4())
        # create per-session sqlite in temp directory
        temp_dir = Path(tempfile.gettempdir()) / "ai_analyst_sessions"
        temp_dir.mkdir(exist_ok=True)
        db_file = temp_dir / f"session_{session_id}.db"
        db_path = f"sqlite:///{db_file}"
        
        engine = create_engine(db_path)
        df.to_sql("data", engine, if_exists="replace", index=False)

        session_store.add_session(session_id, engine)
        logger.info(f"Created session {session_id} with {len(df)} rows")
        return {"session_id": session_id, "rows": len(df), "columns": list(df.columns)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
