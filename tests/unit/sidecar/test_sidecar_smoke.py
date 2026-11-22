"""Smoke test for Gestura sidecar package."""

import gestura_sidecar


def test_sidecar_package_version() -> None:
    """Verify sidecar package version is defined."""
    assert gestura_sidecar.__version__ == "0.1.0"
