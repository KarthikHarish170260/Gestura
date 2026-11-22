"""Prometheus metrics registry and telemetry collectors."""

from prometheus_client import CollectorRegistry, Counter, Gauge, Histogram, generate_latest

REGISTRY = CollectorRegistry(auto_describe=True)

REQUEST_COUNTER = Counter(
    "gestura_requests_total",
    "Total HTTP requests handled by sidecar",
    ["method", "endpoint", "status"],
    registry=REGISTRY,
)

ERROR_COUNTER = Counter(
    "gestura_errors_total",
    "Total runtime errors encountered",
    ["type", "component"],
    registry=REGISTRY,
)

INFERENCE_LATENCY = Histogram(
    "gestura_inference_latency_seconds",
    "Latency of landmark model inference in seconds",
    buckets=[0.005, 0.010, 0.015, 0.025, 0.050, 0.100, 0.250],
    registry=REGISTRY,
)

STT_LATENCY = Histogram(
    "gestura_stt_latency_seconds",
    "Latency of speech-to-text processing per utterance in seconds",
    buckets=[0.05, 0.1, 0.2, 0.3, 0.5, 1.0, 2.0],
    registry=REGISTRY,
)

TTS_LATENCY = Histogram(
    "gestura_tts_latency_seconds",
    "Latency of text-to-speech synthesis in seconds",
    buckets=[0.02, 0.05, 0.1, 0.2, 0.5, 1.0],
    registry=REGISTRY,
)

ACTIVE_SESSIONS = Gauge(
    "gestura_active_sessions",
    "Number of active user conversation sessions",
    registry=REGISTRY,
)

TRAINING_JOB_STATUS = Gauge(
    "gestura_training_job_status",
    "Status code of background model trainer (0=idle, 1=running, 2=complete, -1=failed)",
    registry=REGISTRY,
)


def export_metrics_bytes() -> bytes:
    """Format and generate prometheus metrics bytes."""
    return generate_latest(REGISTRY)
