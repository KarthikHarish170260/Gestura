"""Text normalization and contraction expansion for text-to-gloss pipeline."""

import re

CONTRACTION_EXPANSIONS: dict[str, str] = {
    "i'm": "i am",
    "you're": "you are",
    "he's": "he is",
    "she's": "she is",
    "it's": "it is",
    "we're": "we are",
    "they're": "they are",
    "i've": "i have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",
    "i'll": "i will",
    "you'll": "you will",
    "he'll": "he will",
    "she'll": "she will",
    "we'll": "we will",
    "they'll": "they will",
    "i'd": "i would",
    "you'd": "you would",
    "he'd": "he would",
    "she'd": "she would",
    "we'd": "we would",
    "they'd": "they would",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "can't": "cannot",
    "couldn't": "could not",
    "won't": "will not",
    "wouldn't": "would not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "what's": "what is",
    "where's": "where is",
    "who's": "who is",
    "that's": "that is",
    "there's": "there is",
}


def normalize_text(text: str) -> str:
    """Normalize text: lowercase, expand contractions, strip non-alphanumeric punctuation."""
    if not text:
        return ""

    lowered = text.lower().strip()

    # Expand contractions
    words = lowered.split()
    expanded_words = [CONTRACTION_EXPANSIONS.get(w, w) for w in words]
    expanded_text = " ".join(expanded_words)

    # Strip punctuation except hyphen in compound words
    cleaned = re.sub(r"[^\w\s\-]", " ", expanded_text)
    # Collapse consecutive spaces
    normalized = re.sub(r"\s+", " ", cleaned).strip()
    return normalized
