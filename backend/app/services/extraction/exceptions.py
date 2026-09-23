"""Custom exceptions for PDF extraction pipeline."""

from __future__ import annotations


class PdfExtractionError(Exception):
    """Base exception for PDF extraction failures."""

    def __init__(self, message: str, *, code: str = "EXTRACTION_ERROR") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class PdfPasswordProtectedError(PdfExtractionError):
    """PDF is encrypted and requires a password."""

    def __init__(self, message: str = "PDF is password-protected") -> None:
        super().__init__(message, code="PDF_PASSWORD_PROTECTED")


class PdfCorruptError(PdfExtractionError):
    """PDF file is corrupt or not a valid PDF."""

    def __init__(self, message: str = "PDF file is corrupt or invalid") -> None:
        super().__init__(message, code="PDF_CORRUPT")


class PdfTooLargeError(PdfExtractionError):
    """PDF exceeds allowed limits (pages or file size)."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="PDF_TOO_LARGE")


class PdfEmptyError(PdfExtractionError):
    """PDF contains no extractable text."""

    def __init__(self, message: str = "PDF contains no extractable text") -> None:
        super().__init__(message, code="PDF_EMPTY")
