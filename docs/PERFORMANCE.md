# GESTURA Real Performance Benchmarks

Generated on: 2026-11-22 19:08:33 UTC

## Hardware Specifications
- **Operating System**: Windows 10 (10.0.26300)
- **CPU**: Intel64 Family 6 Model 186 Stepping 2, GenuineIntel
- **Physical Cores**: 10 | **Logical Cores**: 16
- **Memory**: 15.6 GB
- **Python**: 3.11.15

## Module II: Speech & Text-to-Gloss Latencies
| Component | Metric | Target | Measured Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| Text-to-Gloss Engine | p50 Latency | < 5 ms | 0.019 ms | **PASSED** |
| Text-to-Gloss Engine | p95 Latency | < 10 ms | 0.037 ms | **PASSED** |
| TTS Synthesis (Offline) | p50 Latency | < 300 ms | 85.0 ms | **PASSED** |
| TTS Synthesis (Offline) | p95 Latency | < 500 ms | 171.1 ms | **PASSED** |

*Note: All figures measured locally via `scripts/benchmark_speech.py`.*
