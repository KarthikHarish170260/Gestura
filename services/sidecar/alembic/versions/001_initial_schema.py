"""001_initial_schema

Revision ID: 001_initial_schema
Revises: None
Create Date: 2026-11-23 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. sessions
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False, server_default="Conversation"),
        sa.Column("sign_language", sa.String(length=16), nullable=False, server_default="ISL"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    # 2. utterances
    op.create_table(
        "utterances",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "session_id",
            sa.String(length=36),
            sa.ForeignKey("sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("direction", sa.String(length=32), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("gloss", sa.Text(), nullable=False, server_default=""),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("latency_ms", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("token_provenance", sa.JSON(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_utterances_session_id", "utterances", ["session_id"])
    op.create_index("ix_utterances_timestamp", "utterances", ["timestamp"])

    # 3. sign_samples
    op.create_table(
        "sign_samples",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("gloss", sa.String(length=64), nullable=False),
        sa.Column("sample_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("user_profile", sa.String(length=64), nullable=False, server_default="default"),
        sa.Column("num_frames", sa.Integer(), nullable=False, server_default="32"),
        sa.Column("quality_score", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("landmark_data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_sign_samples_gloss", "sign_samples", ["gloss"])

    # 4. settings
    op.create_table(
        "settings",
        sa.Column("key", sa.String(length=128), primary_key=True),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    # 5. sus_responses
    op.create_table(
        "sus_responses",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("sus_responses")
    op.drop_table("settings")
    op.drop_index("ix_sign_samples_gloss", table_name="sign_samples")
    op.drop_table("sign_samples")
    op.drop_index("ix_utterances_timestamp", table_name="utterances")
    op.drop_index("ix_utterances_session_id", table_name="utterances")
    op.drop_table("utterances")
    op.drop_table("sessions")
