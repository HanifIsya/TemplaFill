"""Tests for GeminiKeyPool and multi-key failover rotation."""

import time
import pytest
from app.core.key_pool import GeminiKeyPool, get_key_pool
from app.services.generation.extractor import GeminiExtractor


def test_key_pool_parsing():
    raw = "key1, key2; key3\nkey4"
    pool = GeminiKeyPool(raw)
    assert pool.total_keys == 4
    assert pool.get_current_key() == "key1"
    assert pool.get_all_keys() == ["key1", "key2", "key3", "key4"]


def test_key_pool_deduplication():
    raw = "keyA, keyB, keyA, keyC"
    pool = GeminiKeyPool(raw)
    assert pool.total_keys == 3
    assert pool.get_all_keys() == ["keyA", "keyB", "keyC"]


def test_key_pool_exhaustion_rotation():
    pool = GeminiKeyPool("key1, key2, key3")
    assert pool.get_current_key() == "key1"

    # Mark key1 exhausted
    next_key = pool.mark_exhausted("key1", duration_seconds=10.0, reason="test_429")
    assert next_key == "key2"
    assert pool.get_current_key() == "key2"

    # Mark key2 exhausted
    next_key = pool.mark_exhausted("key2", duration_seconds=10.0, reason="test_429")
    assert next_key == "key3"
    assert pool.get_current_key() == "key3"

    # Mark key3 exhausted -> all exhausted, returns a fallback key without crashing
    next_key = pool.mark_exhausted("key3", duration_seconds=10.0, reason="test_429")
    assert next_key in ["key1", "key2", "key3"]


def test_gemini_extractor_multi_key_init():
    ext = GeminiExtractor(api_key="keyA, keyB", use_fake=True)
    assert ext.key_pool.total_keys == 2
    assert ext.api_key == "keyA"

    ext._switch_api_key("keyB")
    assert ext.api_key == "keyB"
