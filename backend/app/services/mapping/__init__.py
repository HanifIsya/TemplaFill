"""Template mapping services — parser, mapper, generator (Tasks 1.8-1.12)."""

from app.services.mapping.generator import (
    generate_filled_document,
    generate_filled_docx,
    generate_filled_pptx,
    generate_filled_xlsx,
)
from app.services.mapping.mapper import (
    FieldMapping,
    MappingResult,
    map_extracted_to_template,
    map_fields,
)
from app.services.mapping.models import ParsedTemplate, TemplateField
from app.services.mapping.parser import parse_template, parse_template_bytes

__all__ = [
    "ParsedTemplate",
    "TemplateField",
    "parse_template",
    "parse_template_bytes",
    "map_fields",
    "map_extracted_to_template",
    "MappingResult",
    "FieldMapping",
    "generate_filled_document",
    "generate_filled_docx",
    "generate_filled_xlsx",
    "generate_filled_pptx",
]
