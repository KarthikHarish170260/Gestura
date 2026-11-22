"""Sign vocabulary query and registration router."""

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from gestura_sidecar.db.database import get_db_dependency
from gestura_sidecar.db.models import SettingModel

router = APIRouter(tags=["vocabulary"])


class SignDefinition(BaseModel):
    """Vocabulary sign entry."""

    id: str
    label: str
    category: str = "General"
    synonyms: list[str] = Field(default_factory=list)


class CustomSignRequest(BaseModel):
    """Add a new custom sign to the vocabulary."""

    id: str
    label: str
    category: str = "Custom"
    synonyms: list[str] = Field(default_factory=list)


def load_base_vocabulary() -> dict[str, Any]:
    """Load default 40-sign dictionary from data/vocabulary.json."""
    vocab_path = Path("data/vocabulary.json")
    if not vocab_path.exists():
        # Fallback if executing from a different subfolder
        parent_vocab = Path("../../data/vocabulary.json")
        if parent_vocab.exists():
            vocab_path = parent_vocab
        else:
            return {"signs": [], "fingerspelling": [], "special_classes": ["UNKNOWN"]}

    with open(vocab_path, encoding="utf-8") as f:
        data: dict[str, Any] = json.load(f)
        return data


@router.get("/vocabulary")
def get_vocabulary(db: Session = Depends(get_db_dependency)) -> dict[str, Any]:
    """Get active vocabulary merged with user-defined custom signs."""
    base_data = load_base_vocabulary()
    signs = list(base_data.get("signs", []))

    # Retrieve custom signs saved in settings
    custom_record = db.scalar(select(SettingModel).where(SettingModel.key == "custom_signs"))
    if custom_record and isinstance(custom_record.value, list):
        signs.extend(custom_record.value)

    return {
        "default_language": base_data.get("default_language", "ISL"),
        "supported_languages": base_data.get("supported_languages", ["ISL", "ASL"]),
        "signs": signs,
        "fingerspelling": base_data.get("fingerspelling", []),
        "special_classes": base_data.get("special_classes", ["UNKNOWN"]),
        "total_signs": len(signs),
    }


@router.post("/vocabulary", status_code=status.HTTP_201_CREATED)
def add_custom_sign(
    sign: CustomSignRequest, db: Session = Depends(get_db_dependency)
) -> dict[str, Any]:
    """Add a new custom sign to the local vocabulary."""
    sign_id = sign.id.upper().strip()
    if not sign_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Sign ID cannot be empty"
        )

    custom_record = db.scalar(select(SettingModel).where(SettingModel.key == "custom_signs"))
    custom_list: list[dict[str, Any]] = (
        custom_record.value if custom_record and isinstance(custom_record.value, list) else []
    )

    # Check for duplicate
    if any(s.get("id") == sign_id for s in custom_list):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=f"Sign '{sign_id}' already exists"
        )

    new_sign = {
        "id": sign_id,
        "label": sign.label,
        "category": sign.category,
        "synonyms": [s.lower().strip() for s in sign.synonyms],
    }
    custom_list.append(new_sign)

    if custom_record:
        custom_record.value = custom_list
    else:
        db.add(SettingModel(key="custom_signs", value=custom_list))
    db.flush()

    return {"message": f"Sign '{sign_id}' added successfully", "sign": new_sign}
