"""Smoke test for Gestura ML package."""

import ml


def test_ml_package_version() -> None:
    """Verify ML package version is defined."""
    assert ml.__version__ == "0.1.0"
