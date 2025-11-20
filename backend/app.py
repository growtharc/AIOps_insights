import logging
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.session.router import router as session_router
from api.query.router import router as query_router
from api.jira.router import router as jira_router


logger = logging.getLogger(__name__)


def create_app(allowed_origins: list[str] | None = None) -> FastAPI:
    app = FastAPI(title="AI Support Data Analyst API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(session_router)
    app.include_router(query_router)
    app.include_router(jira_router)

    @app.get("/healthcheck")
    async def healthcheck() -> dict[str, Any]:
        return {"status": "ok"}

    return app


