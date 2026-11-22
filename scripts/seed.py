"""Seed script for GESTURA.
Populates local database with default system settings, an initial demonstration conversation session,
and optional baseline landmark sample sequences for immediate offline evaluation and testing.
"""

import argparse
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Add services/sidecar and ml to sys.path
repo_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(repo_root / "services" / "sidecar"))
sys.path.insert(0, str(repo_root))

from gestura_sidecar.db.database import get_db, init_db  # noqa: E402
from gestura_sidecar.db.models import (  # noqa: E402
    SessionModel,
    SettingModel,
    SignSampleModel,
    UtteranceModel,
)
from ml.train import generate_synthetic_sign_dataset  # noqa: E402


def seed_database(db_url: str = "sqlite:///gestura.db", seed_samples: bool = True) -> None:
    """Populate database with default configuration, demo session, and landmark samples."""
    print(f"Initializing database: {db_url}...")
    init_db(db_url)

    with get_db() as db:
        # 1. Seed Default Settings
        print("Checking default settings...")
        default_settings = {
            "sign_language": "ISL",
            "high_contrast": False,
            "large_type": False,
            "caption_font_size": 18,
            "confidence_threshold": 0.65,
            "margin_threshold": 0.15,
            "debounce_frames": 5,
            "pause_commit_ms": 1200,
            "tts_voice": "default",
            "tts_rate": 1.0,
            "tts_volume": 1.0,
            "input_mic_device": "default",
            "output_speaker_device": "default",
            "camera_device": "default",
            "left_handed": False,
            "active_model": "gestura_sign_recognizer_int8.onnx",
        }

        for key, val in default_settings.items():
            existing = db.get(SettingModel, key)
            if not existing:
                db.add(SettingModel(key=key, value=val))
        print("Settings configured.")

        # 2. Seed Initial Demonstration Conversation Session
        print("Creating demo conversation session...")
        now = datetime.now(UTC)
        demo_session = SessionModel(
            title="Hospital Consultation (Demo)",
            sign_language="ISL",
            active=True,
            created_at=now - timedelta(minutes=15),
            updated_at=now,
        )
        db.add(demo_session)
        db.flush()

        dialogue_turns = [
            {
                "direction": "speech_to_sign",
                "text": "Hello, how can I help you today?",
                "gloss": "HELLO HOW HELP YOU TODAY",
                "confidence": 0.98,
                "latency_ms": 32.5,
                "time_offset_sec": 600,
                "token_provenance": [
                    {
                        "original_word": "hello",
                        "gloss": "HELLO",
                        "provenance": "lexicon",
                        "confidence": 1.0,
                    },
                    {
                        "original_word": "how",
                        "gloss": "HOW",
                        "provenance": "lexicon",
                        "confidence": 1.0,
                    },
                    {
                        "original_word": "help",
                        "gloss": "HELP",
                        "provenance": "lexicon",
                        "confidence": 1.0,
                    },
                ],
            },
            {
                "direction": "sign_to_speech",
                "text": "Hello doctor, I need help water.",
                "gloss": "HELLO DOCTOR HELP WATER",
                "confidence": 0.92,
                "latency_ms": 185.0,
                "time_offset_sec": 480,
                "token_provenance": [],
            },
            {
                "direction": "speech_to_sign",
                "text": "Please sit down, water is coming right away.",
                "gloss": "PLEASE SIT WATER COME",
                "confidence": 0.96,
                "latency_ms": 28.1,
                "time_offset_sec": 300,
                "token_provenance": [
                    {
                        "original_word": "please",
                        "gloss": "PLEASE",
                        "provenance": "lexicon",
                        "confidence": 1.0,
                    },
                    {
                        "original_word": "water",
                        "gloss": "WATER",
                        "provenance": "lexicon",
                        "confidence": 1.0,
                    },
                ],
            },
            {
                "direction": "sign_to_speech",
                "text": "Thank you very much.",
                "gloss": "THANK-YOU GOOD",
                "confidence": 0.94,
                "latency_ms": 190.2,
                "time_offset_sec": 120,
                "token_provenance": [],
            },
        ]

        for turn in dialogue_turns:
            utt = UtteranceModel(
                session_id=demo_session.id,
                direction=turn["direction"],
                text=turn["text"],
                gloss=turn["gloss"],
                confidence=turn["confidence"],
                latency_ms=turn["latency_ms"],
                token_provenance=turn["token_provenance"],
                timestamp=now - timedelta(seconds=turn["time_offset_sec"]),
            )
            db.add(utt)
        print("Demo session and utterances created.")

        # 3. Optional Baseline Landmark Sample Sequences
        if seed_samples:
            print("Generating calibrated landmark sample sequences for onboarding...")
            demo_signs = ["HELLO", "THANK-YOU", "YES", "NO", "HELP"]
            X, _ = generate_synthetic_sign_dataset(demo_signs, samples_per_class=3)

            for i, gloss in enumerate(demo_signs):
                for s_idx in range(3):
                    sample_arr = X[i * 3 + s_idx].tolist()
                    sample = SignSampleModel(
                        gloss=gloss,
                        sample_index=s_idx + 1,
                        user_profile="demo",
                        num_frames=32,
                        quality_score=0.96,
                        landmark_data=sample_arr,
                        created_at=now - timedelta(minutes=5),
                    )
                    db.add(sample)
            print(f"Seeded 15 sample landmark sequences ({len(demo_signs)} signs x 3 samples).")

        db.commit()
    print("Database seeding completed successfully.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed GESTURA local SQLite database.")
    parser.add_argument(
        "--db-url", type=str, default="sqlite:///gestura.db", help="SQLAlchemy SQLite URL"
    )
    parser.add_argument(
        "--no-samples", action="store_true", help="Skip generating landmark samples"
    )
    args = parser.parse_args()

    seed_database(db_url=args.db_url, seed_samples=not args.no_samples)


if __name__ == "__main__":
    main()
