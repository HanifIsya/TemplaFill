"""Unit tests for SelectivePIIMasker."""

import pytest
from app.services.privacy.masker import SelectivePIIMasker


def test_mask_email():
    masker = SelectivePIIMasker()
    text = "Hubungi PIC di bambang.wijaya@ctx-sejahtera.co.id untuk info lebih lanjut."
    masked, mapping = masker.mask_text(text)

    assert "[TOKEN_EMAIL_1]" in masked
    assert "bambang.wijaya@ctx-sejahtera.co.id" not in masked
    assert mapping["[TOKEN_EMAIL_1]"] == "bambang.wijaya@ctx-sejahtera.co.id"

    # Unmask test
    restored = masker.unmask(masked, mapping)
    assert restored == text


def test_mask_npwp():
    masker = SelectivePIIMasker()
    text = "NPWP Pihak Pertama: 01.234.567.8-615.000, NPWP Pihak Kedua: 02.987.654.3-615.000"
    masked, mapping = masker.mask_text(text)

    assert "[TOKEN_NPWP_1]" in masked
    assert "[TOKEN_NPWP_2]" in masked
    assert "01.234.567.8-615.000" not in masked
    assert "02.987.654.3-615.000" not in masked

    restored = masker.unmask(masked, mapping)
    assert restored == text


def test_mask_nik():
    masker = SelectivePIIMasker()
    text = "No. KTP Direktur: 3201234567890001 atas nama Bambang."
    masked, mapping = masker.mask_text(text)

    assert "[TOKEN_NIK_1]" in masked
    assert "3201234567890001" not in masked

    restored = masker.unmask(masked, mapping)
    assert restored == text


def test_mask_rekening():
    masker = SelectivePIIMasker()
    text = "Pembayaran ditransfer ke rekening Bank Mandiri 142-00-9988776-5 a.n. CV Sinergi Teknologi"
    masked, mapping = masker.mask_text(text)

    assert "[TOKEN_REK_1]" in masked
    assert "142-00-9988776-5" not in masked
    assert "Bank Mandiri" in masked
    assert "CV Sinergi Teknologi" in masked

    restored = masker.unmask(masked, mapping)
    assert restored == text


def test_mask_phone():
    masker = SelectivePIIMasker()
    text = "Kontak Telepon: (031) 567-8901 dan WA: 081234567890"
    masked, mapping = masker.mask_text(text)

    assert "[TOKEN_PHONE_1]" in masked
    assert "[TOKEN_PHONE_2]" in masked

    restored = masker.unmask(masked, mapping)
    assert restored == text


def test_preserves_contract_non_pii():
    """Verify that contract names, titles, dates, numbers, and amounts are untouched."""
    masker = SelectivePIIMasker()
    text = (
        "Nomor Kontrak: PSW/MGN-2026/1123/PRC tertanggal 3 September 2026. "
        "Antara PT Mitra Global Nusantara (diwakili Ir. Bambang Wijaya, M.T. — Direktur Utama) "
        "dengan nilai total Rp 450.000.000 (empat ratus lima puluh juta rupiah)."
    )
    masked, mapping = masker.mask_text(text)

    assert "PSW/MGN-2026/1123/PRC" in masked
    assert "3 September 2026" in masked
    assert "PT Mitra Global Nusantara" in masked
    assert "Ir. Bambang Wijaya, M.T. — Direktur Utama" in masked
    assert "Rp 450.000.000" in masked
    assert "empat ratus lima puluh juta rupiah" in masked
    assert len(mapping) == 0


def test_cross_chunk_consistency():
    """Verify identical entity in different chunks gets identical surrogate token."""
    masker = SelectivePIIMasker()
    chunk1 = "Pihak Pertama NPWP 01.234.567.8-615.000 terdaftar di Jakarta."
    chunk2 = "Konfirmasi kembali bahwa NPWP 01.234.567.8-615.000 adalah sah."

    masked_chunks, mapping = masker.mask_chunks([chunk1, chunk2])

    assert "[TOKEN_NPWP_1]" in masked_chunks[0]
    assert "[TOKEN_NPWP_1]" in masked_chunks[1]
    assert "[TOKEN_NPWP_2]" not in mapping
    assert mapping["[TOKEN_NPWP_1]"] == "01.234.567.8-615.000"


def test_unmask_llm_variations():
    """Verify unmasking works even if LLM adds spaces or strips brackets."""
    masker = SelectivePIIMasker()
    mapping = {"[TOKEN_NPWP_1]": "01.234.567.8-615.000"}

    assert masker.unmask("[TOKEN_NPWP_1]", mapping) == "01.234.567.8-615.000"
    assert masker.unmask("[ TOKEN_NPWP_1 ]", mapping) == "01.234.567.8-615.000"
    assert masker.unmask("[token_npwp_1]", mapping) == "01.234.567.8-615.000"
    assert masker.unmask("TOKEN_NPWP_1", mapping) == "01.234.567.8-615.000"
    assert masker.unmask("NPWP adalah [TOKEN_NPWP_1] resmi", mapping) == "NPWP adalah 01.234.567.8-615.000 resmi"
