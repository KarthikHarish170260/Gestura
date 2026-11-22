"""Grammatical transformation rules for sign language text-to-gloss."""

# Words dropped during gloss translation (articles, auxiliaries, grammatical particles)
DROPPED_GRAMMAR_WORDS: set[str] = {
    "a",
    "an",
    "the",
    "is",
    "are",
    "am",
    "was",
    "were",
    "be",
    "been",
    "being",
    "do",
    "does",
    "did",
    "to",
    "of",
    "at",
    "by",
    "for",
    "my",
    "your",
    "his",
    "her",
    "our",
    "their",
}

# Question words that move to the end in ISL / ASL topic-comment structure
INTERROGATIVE_GLOSSES: set[str] = {
    "WHAT",
    "WHERE",
    "WHEN",
    "HOW",
    "WHO",
    "WHICH",
    "WHY",
}


def should_drop_word(word: str) -> bool:
    """Check if token should be omitted from gloss translation."""
    return word.lower().strip() in DROPPED_GRAMMAR_WORDS


def apply_topic_comment_reordering(gloss_tokens: list[str]) -> list[str]:
    """Reorder interrogative question glosses to the end of the sentence."""
    interrogatives = [t for t in gloss_tokens if t in INTERROGATIVE_GLOSSES]
    non_interrogatives = [t for t in gloss_tokens if t not in INTERROGATIVE_GLOSSES]

    # If sentence contains interrogatives, place them at the sentence-final position
    return non_interrogatives + interrogatives
