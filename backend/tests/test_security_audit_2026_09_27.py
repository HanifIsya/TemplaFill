"""Security audit regression tests (2026-09-27).

Pins the fixes from `docs/6-security/CYBER_SECURITY_AUDIT_2026-09-27.md`:
 - AUDIT-01: X-Forwarded-For spoofing must not change the resolved client IP
   (rightmost hop wins; leftmost attacker entries ignored).
 - AUDIT-02: failed jobs must not echo raw internal exception text.
"""

from __future__ import annotations

from starlette.requests import Request

from app.core.config import get_settings
from app.core.security import get_client_ip


def _request(headers: dict[str, str], peer: str = "10.0.0.5") -> Request:
    raw_headers = [(k.lower().encode(), v.encode()) for k, v in headers.items()]
    scope = {
        "type": "http",
        "headers": raw_headers,
        "client": (peer, 12345),
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "scheme": "http",
        "server": ("testserver", 80),
    }
    return Request(scope)


class TestClientIpSpoofResistance:
    """AUDIT-01 — attacker-supplied headers must not change the resolved IP."""

    def test_cf_connecting_ip_preferred(self, monkeypatch):
        """CF-Connecting-IP (set by Cloudflare at Render's edge) wins."""
        monkeypatch.setattr(get_settings(), "trusted_proxies", "*")
        req = _request(
            {
                "cf-connecting-ip": "198.51.100.7",
                "x-forwarded-for": "203.0.113.99, 198.51.100.7",
            },
            peer="10.0.0.5",
        )
        assert get_client_ip(req) == "198.51.100.7"

    def test_rightmost_hop_wins_without_cf(self, monkeypatch):
        monkeypatch.setattr(get_settings(), "trusted_proxies", "*")
        # Attacker prepends fake IPs; the nearest proxy appends the real one.
        req = _request({"x-forwarded-for": "1.2.3.4, 5.6.7.8, 203.0.113.9"}, peer="10.0.0.5")
        assert get_client_ip(req) == "203.0.113.9"

    def test_leftmost_spoof_ignored(self, monkeypatch):
        monkeypatch.setattr(get_settings(), "trusted_proxies", "*")
        # Single entry: it is the hop appended by the trusted proxy.
        req = _request({"x-forwarded-for": "203.0.113.99"}, peer="10.0.0.5")
        assert get_client_ip(req) == "203.0.113.99"
        # But with a real hop appended after it, the spoof is ignored.
        req2 = _request({"x-forwarded-for": "203.0.113.99, 198.51.100.7"}, peer="10.0.0.5")
        assert get_client_ip(req2) == "198.51.100.7"

    def test_untrusted_peer_cannot_spoof(self, monkeypatch):
        monkeypatch.setattr(get_settings(), "trusted_proxies", "")
        req = _request(
            {
                "cf-connecting-ip": "198.51.100.7",
                "x-forwarded-for": "203.0.113.99",
            },
            peer="203.0.113.50",
        )
        # Peer is not trusted → all headers ignored, socket peer used.
        assert get_client_ip(req) == "203.0.113.50"

    def test_trusted_hops_skipped_right_to_left(self, monkeypatch):
        monkeypatch.setattr(get_settings(), "trusted_proxies", "10.0.0.0/8, 192.168.0.0/16")
        # Rightmost is another trusted proxy; the first non-trusted hop wins.
        req = _request({"x-forwarded-for": "9.9.9.9, 192.168.1.1"}, peer="10.0.0.5")
        assert get_client_ip(req) == "9.9.9.9"

    def test_x_real_ip_used_when_no_xff(self, monkeypatch):
        monkeypatch.setattr(get_settings(), "trusted_proxies", "*")
        req = _request({"x-real-ip": "198.51.100.42"}, peer="10.0.0.5")
        assert get_client_ip(req) == "198.51.100.42"

    def test_no_headers_returns_peer(self, monkeypatch):
        monkeypatch.setattr(get_settings(), "trusted_proxies", "*")
        req = _request({}, peer="10.0.0.5")
        assert get_client_ip(req) == "10.0.0.5"

    def test_blank_cf_header_falls_through(self, monkeypatch):
        monkeypatch.setattr(get_settings(), "trusted_proxies", "*")
        req = _request({"cf-connecting-ip": "   ", "x-forwarded-for": "203.0.113.9"}, peer="10.0.0.5")
        assert get_client_ip(req) == "203.0.113.9"


class TestFailedJobErrorSanitized:
    """AUDIT-02 — raw internal exception text must not reach clients."""

    def test_failed_results_returns_generic_message(self):
        import asyncio

        from fastapi.testclient import TestClient

        from app.main import app
        from app.services.jobs.manager import get_job_manager
        from app.services.jobs.models import Job, JobStatus

        client = TestClient(app)
        manager = get_job_manager()

        async def run():
            job = Job(
                job_id="11111111-2222-3333-4444-555555555555",
                status=JobStatus.failed,
                error="Traceback: pdfplumber internal failure at /app/secret/path.py:42",
            )
            from app.services.jobs.manager import _jobs

            _jobs[job.job_id] = job
            return job.job_id

        job_id = asyncio.run(run())
        try:
            resp = client.get(f"/api/jobs/{job_id}/results")
            assert resp.status_code == 500
            body = resp.json()
            assert body["error"]["message"] == "Job failed during processing"
            assert "pdfplumber" not in resp.text
            assert "/app/secret/path.py" not in resp.text
        finally:
            from app.services.jobs.manager import _jobs

            _jobs.pop(job_id, None)
