"""Deterministic rule-based Text-to-Gloss engine."""

import json
from enum import StrEnum
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from gestura_sidecar.gloss.lemma_table import lemmatize_word
from gestura_sidecar.gloss.normalizer import normalize_text
from gestura_sidecar.gloss.rules import apply_topic_comment_reordering, should_drop_word


class ProvenanceType(StrEnum):
    """Source classification of a translated gloss token."""

    VOCAB = "VOCAB"
    SYNONYM = "SYNONYM"
    FINGERSPELL = "FINGERSPELL"


class GlossToken(BaseModel):
    """Individual gloss token with classification provenance."""

    token: str
    provenance: ProvenanceType
    original_word: str = ""


class GlossResult(BaseModel):
    """Result payload of text-to-gloss translation."""

    raw_text: str
    gloss_string: str
    tokens: list[GlossToken] = Field(default_factory=list)


class TextToGlossEngine:
    """Translates spoken/written English into sign gloss sequences."""

    def __init__(self, language: str = "ISL") -> None:
        self.language = language
        self.vocabulary: dict[str, dict[str, Any]] = {}
        self.synonym_map: dict[str, str] = {}
        self._load_vocabulary()

    def _load_vocabulary(self) -> None:
        """Load vocabulary and construct lookup indices."""
        vocab_path = Path("data/vocabulary.json")
        if not vocab_path.exists():
            parent_vocab = Path("../../data/vocabulary.json")
            if parent_vocab.exists():
                vocab_path = parent_vocab

        if vocab_path.exists():
            with open(vocab_path, encoding="utf-8") as f:
                data = json.load(f)
                for item in data.get("signs", []):
                    sign_id = item["id"].upper()
                    self.vocabulary[sign_id] = item

                    # Index label and canonical ID
                    self.synonym_map[item["label"].lower()] = sign_id
                    self.synonym_map[sign_id.lower()] = sign_id

                    # Index all synonyms
                    for syn in item.get("synonyms", []):
                        self.synonym_map[syn.lower().strip()] = sign_id

    def translate(self, text: str) -> GlossResult:
        """Translate arbitrary English text into structured sign glosses."""
        if not text or not text.strip():
            return GlossResult(raw_text="", gloss_string="", tokens=[])

        normalized = normalize_text(text)
        words = normalized.split()

        intermediate_tokens: list[GlossToken] = []

        for word in words:
            if should_drop_word(word):
                continue

            lemma = lemmatize_word(word)
            lemma_upper = lemma.upper()

            # Check direct vocabulary hit
            if lemma_upper in self.vocabulary:
                intermediate_tokens.append(
                    GlossToken(
                        token=lemma_upper,
                        provenance=ProvenanceType.VOCAB,
                        original_word=word,
                    )
                )
            # Check synonym hit on lemma
            elif lemma in self.synonym_map:
                mapped_id = self.synonym_map[lemma]
                intermediate_tokens.append(
                    GlossToken(
                        token=mapped_id,
                        provenance=ProvenanceType.SYNONYM,
                        original_word=word,
                    )
                )
            # Check synonym hit on original word
            elif word in self.synonym_map:
                mapped_id = self.synonym_map[word]
                intermediate_tokens.append(
                    GlossToken(
                        token=mapped_id,
                        provenance=ProvenanceType.SYNONYM,
                        original_word=word,
                    )
                )
            # Fallback: Fingerspell out-of-vocabulary characters
            else:
                for char in word.upper():
                    if char in "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789":
                        intermediate_tokens.append(
                            GlossToken(
                                token=char,
                                provenance=ProvenanceType.FINGERSPELL,
                                original_word=word,
                            )
                        )

        # Apply topic-comment reordering (e.g. WH-question shift)
        token_strings = [t.token for t in intermediate_tokens]
        reordered_strings = apply_topic_comment_reordering(token_strings)

        # Re-align token objects according to reordered strings
        reordered_tokens: list[GlossToken] = []
        token_pool = list(intermediate_tokens)

        for target_str in reordered_strings:
            for idx, candidate in enumerate(token_pool):
                if candidate.token == target_str:
                    reordered_tokens.append(candidate)
                    token_pool.pop(idx)
                    break

        gloss_str = " ".join(t.token for t in reordered_tokens)
        return GlossResult(
            raw_text=text,
            gloss_string=gloss_str,
            tokens=reordered_tokens,
        )
