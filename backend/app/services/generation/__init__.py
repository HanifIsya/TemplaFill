"""Generation services — structured extraction via Gemini (Task 1.7)."""

from app.services.generation.extractor import ExtractionResult, FakeExtractor, GeminiExtractor, get_extractor

__all__ = ["ExtractionResult", "FakeExtractor", "GeminiExtractor", "get_extractor"]
