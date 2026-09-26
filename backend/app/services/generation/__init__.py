"""Generation services — structured extraction via Gemini (Task 1.7) / DeepSeek (Phase 6)."""

from app.services.generation.extractor import (
    ExtractionResult,
    FakeExtractor,
    GeminiExtractor,
    get_extractor,
    get_extractor_for_tier,
)

__all__ = [
    "ExtractionResult",
    "FakeExtractor",
    "GeminiExtractor",
    "get_extractor",
    "get_extractor_for_tier",
]
