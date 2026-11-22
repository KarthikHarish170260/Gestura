"""Configuration management for GESTURA sidecar."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class SidecarSettings(BaseSettings):
    """Sidecar server settings."""

    app_name: str = "GESTURA Sidecar"
    version: str = "0.1.0"
    host: str = "127.0.0.1"
    port: int = 8000
    auth_token: str = "default-insecure-dev-token"
    database_url: str = "sqlite:///gestura.db"
    data_dir: Path = Path("data")
    log_level: str = "INFO"

    # Audio & ML Settings
    stt_model_size: str = "base.en"
    stt_device: str = "cpu"
    stt_compute_type: str = "int8"
    tts_voice: str = "en_US-lessac-medium"
    model_config = SettingsConfigDict(env_prefix="GESTURA_", case_sensitive=False)
