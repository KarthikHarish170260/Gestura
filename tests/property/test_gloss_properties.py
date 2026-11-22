"""Property-based tests for Text-to-Gloss engine using Hypothesis."""

from hypothesis import given, settings, strategies as st
from gestura_sidecar.gloss.engine import TextToGlossEngine, ProvenanceType
from gestura_sidecar.gloss.normalizer import normalize_text


@settings(max_examples=100)
@given(st.text(alphabet=st.characters(blacklist_categories=("Cs",)), max_size=200))
def test_gloss_engine_never_crashes(text: str) -> None:
    """Invariant: Engine must never crash on arbitrary unicode strings."""
    engine = TextToGlossEngine()
    result = engine.translate(text)
    assert isinstance(result.raw_text, str)
    assert isinstance(result.gloss_string, str)
    assert isinstance(result.tokens, list)


@settings(max_examples=100)
@given(st.text(alphabet=st.characters(blacklist_categories=("Cs",)), max_size=150))
def test_all_tokens_are_valid_vocab_or_fingerspelling(text: str) -> None:
    """Invariant: Every output token must be in the vocabulary or be a valid fingerspelling symbol."""
    engine = TextToGlossEngine()
    result = engine.translate(text)

    valid_vocab_ids = set(engine.vocabulary.keys())
    valid_fs_chars = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

    for token in result.tokens:
        if token.provenance == ProvenanceType.FINGERSPELL:
            assert token.token in valid_fs_chars, f"Invalid fingerspell char: {token.token}"
        else:
            assert token.token in valid_vocab_ids, f"Token {token.token} not in vocabulary"


@settings(max_examples=100)
@given(st.text(alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z")), max_size=150))
def test_normalizer_idempotency(text: str) -> None:
    """Invariant: Normalising a string twice yields the same string."""
    once = normalize_text(text)
    twice = normalize_text(once)
    assert once == twice
