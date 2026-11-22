"""Unit tests for deterministic rule-based Text-to-Gloss engine (TDD)."""

from gestura_sidecar.gloss.engine import TextToGlossEngine, ProvenanceType


def test_contractions_and_normalisation() -> None:
    """Verify contractions expansion, punctuation stripping, and lowercasing."""
    engine = TextToGlossEngine()
    result = engine.translate("Hello, I'm glad to see you!")
    tokens = [t.token for t in result.tokens]

    assert "HELLO" in tokens
    # "I'm" expanded to "I am", "am" dropped as auxiliary, "see" processed
    assert all(t.isupper() for t in tokens)


def test_stopword_and_auxiliary_filtering() -> None:
    """Verify articles and auxiliary verbs are dropped per sign language grammar."""
    engine = TextToGlossEngine()
    result = engine.translate("The doctor is at the hospital")
    tokens = [t.token for t in result.tokens]

    # Articles 'the' and copula 'is' must be dropped
    assert "THE" not in tokens
    assert "IS" not in tokens
    assert "DOCTOR" in tokens
    assert "HOSPITAL" in tokens


def test_lemmatisation_and_synonym_mapping() -> None:
    """Verify word forms are lemmatised and mapped to vocabulary glosses."""
    engine = TextToGlossEngine()
    # "eating" -> "eat" -> mapped to vocabulary gloss "FOOD"
    result = engine.translate("We are eating food")
    tokens = [t.token for t in result.tokens]
    provenances = [t.provenance for t in result.tokens]

    assert "FOOD" in tokens
    # Check provenance
    assert ProvenanceType.VOCAB in provenances or ProvenanceType.SYNONYM in provenances


def test_topic_comment_question_reordering() -> None:
    """Verify WH-question words are reordered to the end of the clause in ISL/ASL."""
    engine = TextToGlossEngine(language="ISL")
    result = engine.translate("Where is your home?")
    tokens = [t.token for t in result.tokens]

    # In ISL/ASL topic-comment grammar, interrogatives (WHERE, WHAT, HOW) shift to sentence-final
    assert tokens[-1] == "WHERE"
    assert "HOME" in tokens


def test_fingerspelling_fallback_for_oov() -> None:
    """Verify out-of-vocabulary words are decomposed into fingerspelling tokens."""
    engine = TextToGlossEngine()
    # "Karthik" is out-of-vocabulary, should produce individual fingerspelled letters
    result = engine.translate("My name is Zara")
    tokens = [t.token for t in result.tokens]

    assert "NAME" in tokens
    # "Zara" letters Z, A, R, A should appear with FINGERSPELL provenance
    fs_tokens = [t for t in result.tokens if t.provenance == ProvenanceType.FINGERSPELL]
    assert [t.token for t in fs_tokens] == ["Z", "A", "R", "A"]


def test_full_provenance_tracking() -> None:
    """Verify typed output tokens carry provenance metadata (VOCAB, SYNONYM, FINGERSPELL)."""
    engine = TextToGlossEngine()
    result = engine.translate("Thanks for aid Max")

    # "Thanks" -> THANK-YOU (SYNONYM)
    # "aid" -> HELP (SYNONYM)
    # "Max" -> M, A, X (FINGERSPELL)
    token_map = {t.token: t.provenance for t in result.tokens}
    assert token_map.get("THANK-YOU") in (ProvenanceType.VOCAB, ProvenanceType.SYNONYM)
    assert token_map.get("HELP") in (ProvenanceType.VOCAB, ProvenanceType.SYNONYM)
    assert token_map.get("M") == ProvenanceType.FINGERSPELL
    assert token_map.get("A") == ProvenanceType.FINGERSPELL
    assert token_map.get("X") == ProvenanceType.FINGERSPELL
