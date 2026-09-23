"""Models for template mapping pipeline."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class TemplateField(BaseModel):
    """Single placeholder detected in a template."""

    field_name: str = Field(description="Normalized field name, e.g., full_name")
    placeholder: str = Field(description="Raw placeholder as found, e.g., {{full_name}}")
    normalized_placeholder: str = Field(description="Stripped name, e.g., full_name")
    location: str = Field(description="Where found: 'paragraph:2', 'table:0 cell:A1', 'slide:1 shape:2'")
    format: str = Field(description="docx|xlsx|pptx")
    occurrences: int = Field(default=1, description="Number of times placeholder appears")
    context: Optional[str] = Field(default=None, description="Surrounding text snippet")


class ParsedTemplate(BaseModel):
    """Result of parsing a template file."""

    filename: str
    format: str  # docx, xlsx, pptx
    fields: List[TemplateField] = Field(default_factory=list)
    field_names: List[str] = Field(default_factory=list, description="Unique normalized names")
    has_placeholders: bool = Field(default=False)
    total_placeholders: int = Field(default=0)
    warnings: List[str] = Field(default_factory=list)
