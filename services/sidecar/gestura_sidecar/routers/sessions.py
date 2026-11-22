"""Session management, utterances storage, and export API router."""

import html
import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from gestura_sidecar.db.database import get_db_dependency
from gestura_sidecar.db.models import SessionModel, UtteranceModel
from gestura_sidecar.metrics import ACTIVE_SESSIONS

router = APIRouter(tags=["sessions"])


# Pydantic Schemas
class CreateSessionRequest(BaseModel):
    """Payload to initiate a new session."""

    title: str = Field(default="Conversation")
    sign_language: str = Field(default="ISL")


class AddUtteranceRequest(BaseModel):
    """Payload to record an utterance."""

    direction: str = Field(description="'sign_to_speech' or 'speech_to_sign'")
    text: str
    gloss: str = Field(default="")
    confidence: float = Field(default=1.0)
    latency_ms: float = Field(default=0.0)
    token_provenance: list[dict[str, Any]] = Field(default_factory=list)


class UtteranceResponse(BaseModel):
    """Utterance representation."""

    id: str
    session_id: str
    direction: str
    text: str
    gloss: str
    confidence: float
    latency_ms: float
    token_provenance: list[dict[str, Any]]
    timestamp: datetime


class SessionResponse(BaseModel):
    """Session representation."""

    id: str
    title: str
    sign_language: str
    active: bool
    created_at: datetime
    updated_at: datetime
    utterances_count: int = 0


# Database Service Operations
def create_session_record(
    db: Session, title: str = "Conversation", sign_language: str = "ISL"
) -> SessionModel:
    """Create and persist a new session."""
    session = SessionModel(title=title, sign_language=sign_language, active=True)
    db.add(session)
    db.flush()
    ACTIVE_SESSIONS.inc()
    return session


def list_session_records(db: Session, search: str | None = None) -> list[SessionModel]:
    """Retrieve all sessions with optional search term filtering."""
    query = select(SessionModel).order_by(desc(SessionModel.created_at))
    if search:
        query = query.where(SessionModel.title.contains(search))
    return list(db.scalars(query).all())


def get_session_record(db: Session, session_id: str) -> SessionModel | None:
    """Retrieve session by primary key."""
    return db.get(SessionModel, session_id)


def delete_session_record(db: Session, session_id: str) -> bool:
    """Delete a single session and all child utterances."""
    session = get_session_record(db, session_id)
    if not session:
        return False
    db.delete(session)
    db.flush()
    ACTIVE_SESSIONS.dec()
    return True


def wipe_all_sessions(db: Session) -> int:
    """Privacy wipe: delete all sessions and utterances."""
    sessions = list(db.scalars(select(SessionModel)).all())
    count = len(sessions)
    for s in sessions:
        db.delete(s)
    db.flush()
    ACTIVE_SESSIONS.set(0)
    return count


def add_utterance_record(
    db: Session,
    session_id: str,
    direction: str,
    text: str,
    gloss: str = "",
    confidence: float = 1.0,
    latency_ms: float = 0.0,
    token_provenance: list[dict[str, Any]] | None = None,
) -> UtteranceModel:
    """Record an utterance turn for a session."""
    session = get_session_record(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    utterance = UtteranceModel(
        session_id=session_id,
        direction=direction,
        text=text,
        gloss=gloss,
        confidence=confidence,
        latency_ms=latency_ms,
        token_provenance=token_provenance or [],
    )
    db.add(utterance)
    db.flush()
    return utterance


def export_session_data(db: Session, session_id: str, export_format: str = "json") -> str:
    """Export complete session log into JSON, plain text, or print-ready HTML."""
    session = get_session_record(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    utterances = session.utterances

    if export_format.lower() == "json":
        data = {
            "session_id": session.id,
            "title": session.title,
            "sign_language": session.sign_language,
            "created_at": session.created_at.isoformat(),
            "utterances": [
                {
                    "id": u.id,
                    "direction": u.direction,
                    "text": u.text,
                    "gloss": u.gloss,
                    "confidence": u.confidence,
                    "latency_ms": u.latency_ms,
                    "timestamp": u.timestamp.isoformat(),
                    "token_provenance": u.token_provenance,
                }
                for u in utterances
            ],
        }
        return json.dumps(data, indent=2)

    elif export_format.lower() == "txt":
        lines = [
            "GESTURA Conversation Transcript",
            f"Title: {session.title}",
            f"Language: {session.sign_language}",
            f"Date: {session.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}",
            "=" * 60,
            "",
        ]
        for u in utterances:
            speaker_tag = "[Signer]" if u.direction == "sign_to_speech" else "[Speaker]"
            time_str = u.timestamp.strftime("%H:%M:%S")
            lines.append(f"{time_str} {speaker_tag} {u.text}")
            if u.gloss:
                lines.append(f"     Gloss: {u.gloss}")
            lines.append("")
        return "\n".join(lines)

    elif export_format.lower() == "html":
        rows = []
        for u in utterances:
            speaker_tag = (
                "Signer (Sign &rarr; Speech)"
                if u.direction == "sign_to_speech"
                else "Speaker (Speech &rarr; Sign)"
            )
            row_class = "signer-row" if u.direction == "sign_to_speech" else "speaker-row"
            rows.append(
                f"""<tr class="{row_class}">
                    <td class="time">{html.escape(u.timestamp.strftime("%H:%M:%S"))}</td>
                    <td class="speaker"><strong>{speaker_tag}</strong></td>
                    <td class="content">
                        <div class="text">{html.escape(u.text)}</div>
                        <div class="gloss"><code>{html.escape(u.gloss)}</code></div>
                    </td>
                    <td class="metrics">{u.confidence:.2f} ({u.latency_ms:.0f}ms)</td>
                </tr>"""
            )
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>GESTURA Transcript - {html.escape(session.title)}</title>
    <style>
        body {{ font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; margin: 2rem; }}
        h1 {{ color: #818cf8; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 1.5rem; }}
        th, td {{ padding: 0.75rem 1rem; border-bottom: 1px solid #334155; text-align: left; }}
        th {{ background: #1e293b; color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; }}
        .signer-row {{ background: rgba(99, 102, 241, 0.05); }}
        .speaker-row {{ background: rgba(16, 185, 129, 0.05); }}
        .gloss {{ font-size: 0.85rem; color: #a5b4fc; margin-top: 0.25rem; }}
        .metrics {{ font-size: 0.8rem; color: #64748b; }}
    </style>
</head>
<body>
    <h1>GESTURA Session Transcript</h1>
    <p><strong>Title:</strong> {html.escape(session.title)} | <strong>Language:</strong> {html.escape(session.sign_language)} | <strong>Created:</strong> {session.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")}</p>
    <table>
        <thead><tr><th>Time</th><th>Participant</th><th>Message</th><th>Confidence</th></tr></thead>
        <tbody>
            {"".join(rows)}
        </tbody>
    </table>
</body>
</html>"""
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported format: {export_format}"
        )


# Route Handlers
@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: CreateSessionRequest, db: Session = Depends(get_db_dependency)
) -> SessionResponse:
    """Create a new conversation session."""
    session = create_session_record(db, title=payload.title, sign_language=payload.sign_language)
    return SessionResponse(
        id=session.id,
        title=session.title,
        sign_language=session.sign_language,
        active=session.active,
        created_at=session.created_at,
        updated_at=session.updated_at,
        utterances_count=0,
    )


@router.get("/sessions", response_model=list[SessionResponse])
def get_sessions(
    search: str | None = None, db: Session = Depends(get_db_dependency)
) -> list[SessionResponse]:
    """List sessions matching optional query."""
    records = list_session_records(db, search=search)
    return [
        SessionResponse(
            id=r.id,
            title=r.title,
            sign_language=r.sign_language,
            active=r.active,
            created_at=r.created_at,
            updated_at=r.updated_at,
            utterances_count=len(r.utterances),
        )
        for r in records
    ]


@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db_dependency)) -> SessionResponse:
    """Retrieve session details by ID."""
    session = get_session_record(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return SessionResponse(
        id=session.id,
        title=session.title,
        sign_language=session.sign_language,
        active=session.active,
        created_at=session.created_at,
        updated_at=session.updated_at,
        utterances_count=len(session.utterances),
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: str, db: Session = Depends(get_db_dependency)) -> None:
    """Delete a session."""
    if not delete_session_record(db, session_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")


@router.delete("/sessions", status_code=status.HTTP_200_OK)
def wipe_sessions(db: Session = Depends(get_db_dependency)) -> dict[str, int]:
    """One-click privacy wipe deleting all conversation records."""
    count = wipe_all_sessions(db)
    return {"deleted_count": count}


@router.post(
    "/sessions/{session_id}/utterances",
    response_model=UtteranceResponse,
    status_code=status.HTTP_201_CREATED,
)
def append_utterance(
    session_id: str, payload: AddUtteranceRequest, db: Session = Depends(get_db_dependency)
) -> UtteranceResponse:
    """Append a dialogue turn to a session."""
    u = add_utterance_record(
        db,
        session_id=session_id,
        direction=payload.direction,
        text=payload.text,
        gloss=payload.gloss,
        confidence=payload.confidence,
        latency_ms=payload.latency_ms,
        token_provenance=payload.token_provenance,
    )
    return UtteranceResponse(
        id=u.id,
        session_id=u.session_id,
        direction=u.direction,
        text=u.text,
        gloss=u.gloss,
        confidence=u.confidence,
        latency_ms=u.latency_ms,
        token_provenance=u.token_provenance,
        timestamp=u.timestamp,
    )


@router.get("/sessions/{session_id}/utterances", response_model=list[UtteranceResponse])
def get_session_utterances(
    session_id: str, db: Session = Depends(get_db_dependency)
) -> list[UtteranceResponse]:
    """Retrieve ordered utterances for a session."""
    session = get_session_record(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return [
        UtteranceResponse(
            id=u.id,
            session_id=u.session_id,
            direction=u.direction,
            text=u.text,
            gloss=u.gloss,
            confidence=u.confidence,
            latency_ms=u.latency_ms,
            token_provenance=u.token_provenance,
            timestamp=u.timestamp,
        )
        for u in session.utterances
    ]


@router.get("/export/{session_id}")
def export_session(
    session_id: str,
    format: str = Query(default="json", pattern="^(json|txt|html)$"),
    db: Session = Depends(get_db_dependency),
) -> Response:
    """Export session log in chosen format."""
    content = export_session_data(db, session_id, export_format=format)
    media_types = {
        "json": "application/json",
        "txt": "text/plain; charset=utf-8",
        "html": "text/html; charset=utf-8",
    }
    return Response(content=content, media_type=media_types[format])
