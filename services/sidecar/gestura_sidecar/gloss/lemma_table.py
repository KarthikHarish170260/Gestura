"""Bundled lightweight lemma lookup table for sign language glossing."""

LEMMA_DICTIONARY: dict[str, str] = {
    # Pronouns
    "me": "i",
    "my": "i",
    "myself": "i",
    "your": "you",
    "yours": "you",
    "yourself": "you",
    "his": "he",
    "him": "he",
    "her": "she",
    "hers": "she",
    "our": "we",
    "us": "we",
    "their": "they",
    "them": "they",
    # Verbs - Eat / Food
    "eats": "eat",
    "eating": "eat",
    "ate": "eat",
    "eaten": "eat",
    # Verbs - Drink / Water
    "drinks": "drink",
    "drinking": "drink",
    "drank": "drink",
    # Verbs - Go
    "goes": "go",
    "going": "go",
    "went": "go",
    "gone": "go",
    # Verbs - Come
    "comes": "come",
    "coming": "come",
    "came": "come",
    # Verbs - Want
    "wants": "want",
    "wanting": "want",
    "wanted": "want",
    # Verbs - Need
    "needs": "need",
    "needing": "need",
    "needed": "need",
    # Verbs - Help
    "helps": "help",
    "helping": "help",
    "helped": "help",
    # Verbs - Like
    "likes": "like",
    "liking": "like",
    "liked": "like",
    # Verbs - Understand
    "understands": "understand",
    "understanding": "understand",
    "understood": "understand",
    # Verbs - Work
    "works": "work",
    "working": "work",
    "worked": "work",
    # Verbs - Stop
    "stops": "stop",
    "stopping": "stop",
    "stopped": "stop",
    # Plurals
    "doctors": "doctor",
    "hospitals": "hospital",
    "medicines": "medicine",
    "pains": "pain",
    "families": "family",
    "friends": "friend",
    "homes": "home",
    "houses": "home",
    "times": "time",
    "names": "name",
}


def lemmatize_word(word: str) -> str:
    """Return lemmatized base form of an English token."""
    cleaned = word.lower().strip()
    return LEMMA_DICTIONARY.get(cleaned, cleaned)
