"""Generate the scrypt hash for TIER_ACCOUNT_PASSWORD_HASH (Phase 6, ADR-020).

Usage:
    python scripts/hash_password.py                 # prompts (hidden input)
    python scripts/hash_password.py 'my-password'   # direct (avoid in shell history!)

Prints:  scrypt$<salt_hex>$<hash_hex>
Set it as the TIER_ACCOUNT_PASSWORD_HASH env var and redeploy. The plaintext
password is never stored anywhere — hand it out privately, never commit it.
"""

from __future__ import annotations

import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.tier_auth import hash_password  # noqa: E402


def main() -> None:
    if len(sys.argv) > 1:
        password = sys.argv[1]
    else:
        password = getpass.getpass("Password: ")
        confirm = getpass.getpass("Confirm: ")
        if password != confirm:
            print("Passwords do not match.", file=sys.stderr)
            raise SystemExit(1)
    if not password:
        print("Empty password.", file=sys.stderr)
        raise SystemExit(1)
    print(hash_password(password))


if __name__ == "__main__":
    main()
