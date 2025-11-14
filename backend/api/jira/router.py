# backend/api/jira/router.py
from fastapi import APIRouter, HTTPException
from backend.services.jira import fetch_jira_data

router = APIRouter(prefix="/jira", tags=["jira"])

@router.get("/issues")
async def get_jira_issues():
    try:
        data = fetch_jira_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
