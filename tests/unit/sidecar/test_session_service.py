"""Unit tests for GESTURA session management and database operations (TDD)."""

import pytest
from gestura_sidecar.db.database import get_db, init_db
from gestura_sidecar.db.models import SessionModel, UtteranceModel
from gestura_sidecar.routers.sessions import (
    create_session_record,
    list_session_records,
    get_session_record,
    delete_session_record,
    wipe_all_sessions,
    add_utterance_record,
    export_session_data,
)


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path: pytest.TempPathFactory) -> None:
    """Initialize a fresh SQLite test database in a temporary directory."""
    db_file = tmp_path / "test_gestura.db"
    init_db(f"sqlite:///{db_file}")


def test_create_and_retrieve_session() -> None:
    """Test creating a new session and retrieving it by ID."""
    with get_db() as db:
        session = create_session_record(db, title="Morning Conversation", sign_language="ISL")
        assert session.id is not None
        assert session.title == "Morning Conversation"
        assert session.sign_language == "ISL"
        assert session.active is True

        retrieved = get_session_record(db, session.id)
        assert retrieved is not None
        assert retrieved.id == session.id
        assert retrieved.title == "Morning Conversation"


def test_add_utterances_and_export_formats() -> None:
    """Test appending utterances to a session and exporting to JSON, TXT, HTML."""
    with get_db() as db:
        session = create_session_record(db, title="Export Test", sign_language="ISL")

        u1 = add_utterance_record(
            db,
            session_id=session.id,
            direction="sign_to_speech",
            text="Hello, how are you?",
            gloss="HELLO HOW YOU",
            confidence=0.96,
            latency_ms=180.5,
            token_provenance=[{"token": "HELLO", "source": "VOCAB"}, {"token": "HOW", "source": "VOCAB"}],
        )
        assert u1.id is not None

        u2 = add_utterance_record(
            db,
            session_id=session.id,
            direction="speech_to_sign",
            text="I am good, thank you.",
            gloss="ME GOOD THANK-YOU",
            confidence=0.99,
            latency_ms=220.0,
            token_provenance=[{"token": "GOOD", "source": "VOCAB"}, {"token": "THANK-YOU", "source": "VOCAB"}],
        )
        assert u2.id is not None

        # Verify JSON export
        json_export = export_session_data(db, session.id, export_format="json")
        assert "Morning Conversation" not in json_export
        assert "Hello, how are you?" in json_export
        assert "ME GOOD THANK-YOU" in json_export

        # Verify TXT export
        txt_export = export_session_data(db, session.id, export_format="txt")
        assert "[Signer]" in txt_export
        assert "[Speaker]" in txt_export
        assert "HELLO HOW YOU" in txt_export

        # Verify HTML export
        html_export = export_session_data(db, session.id, export_format="html")
        assert "<!DOCTYPE html>" in html_export
        assert "Export Test" in html_export
        assert "Hello, how are you?" in html_export


def test_delete_and_wipe_sessions() -> None:
    """Test deleting an individual session and wiping all session history for privacy."""
    with get_db() as db:
        s1 = create_session_record(db, title="Session 1", sign_language="ISL")
        s2 = create_session_record(db, title="Session 2", sign_language="ASL")

        assert len(list_session_records(db)) == 2

        # Delete single session
        deleted = delete_session_record(db, s1.id)
        assert deleted is True
        assert get_session_record(db, s1.id) is None
        assert len(list_session_records(db)) == 1

        # Wipe all remaining sessions
        wipe_count = wipe_all_sessions(db)
        assert wipe_count >= 1
        assert len(list_session_records(db)) == 0
