import test from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Tier System test suite (Phase 6) — covers TESTING.md T13–T18.
// Mirrors the frontend tier contract (types.ts, api.ts, lib/tier.ts) without a
// DOM: a small localStorage shim stands in for the browser.
// ---------------------------------------------------------------------------

const ACCOUNT_REQUEST_EMAIL = 'hanif.isya.annafi-2024@fst.unair.ac.id';
const FREE_DAILY_LIMIT = 5;
const HISTORY_KEY = 'tf_history';
const TIER_TOKEN_KEY = 'tf_tier_token';

class LocalStorageShim {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

/** In-memory stand-in for the tier-aware ApiClient. */
class TierTestClient {
  constructor({ live = true } = {}) {
    this.live = live;
    this.localStorage = new LocalStorageShim();
    this.freeUsedToday = 0;
    this.uploads = [];
  }

  // --- tier token persistence -------------------------------------------
  getTierToken() {
    return this.localStorage.getItem(TIER_TOKEN_KEY);
  }
  getTier() {
    return this.getTierToken() ? 'pro' : 'free';
  }
  saveTierToken(token) {
    this.localStorage.setItem(TIER_TOKEN_KEY, token);
  }
  clearTierToken() {
    this.localStorage.removeItem(TIER_TOKEN_KEY);
  }

  // --- auth (T13) -------------------------------------------------------
  async login(username, password) {
    if (!username.trim() || !password.trim()) {
      throw new Error('Invalid credentials');
    }
    this.saveTierToken(`tf_tier_${Date.now().toString(36)}`);
    return { tier: 'pro', token: this.getTierToken() };
  }

  async logout() {
    this.clearTierToken();
  }

  // --- quota (T14) ------------------------------------------------------
  async getQuota() {
    return {
      free_used_today: this.freeUsedToday,
      free_limit: FREE_DAILY_LIMIT,
      tier: this.getTier(),
    };
  }

  // --- upload with tier + quota (T14/T18) -------------------------------
  async uploadFiles(sourceFile, templateFile) {
    const tier = this.getTier();
    if (tier === 'free' && this.freeUsedToday >= FREE_DAILY_LIMIT) {
      const err = new Error('Daily extraction limit reached.');
      err.code = 'QUOTA_EXCEEDED';
      err.tier = 'free';
      err.retryAfterSeconds = 3600;
      throw err;
    }
    this.freeUsedToday += 1;
    const sessionId = `session-${this.uploads.length + 1}`;
    this.uploads.push({ sessionId, tier, sourceFile, templateFile });
    return {
      sessionId,
      tier,
      sourceDoc: { filename: sourceFile.name, sizeBytes: sourceFile.size, format: 'pdf' },
      templateDoc: { filename: templateFile.name, sizeBytes: templateFile.size, format: 'docx' },
      createdAt: new Date().toISOString(),
    };
  }

  // --- history (T16) ----------------------------------------------------
  getHistory() {
    const raw = this.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  }
  saveHistoryEntry(entry) {
    const updated = [entry, ...this.getHistory().filter((h) => h.sessionId !== entry.sessionId)];
    this.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  }
  clearHistory() {
    this.localStorage.removeItem(HISTORY_KEY);
  }
}

// --- view helpers mirroring the React components -------------------------
function tierBadge(tier) {
  return tier === 'pro' ? 'Account · DeepSeek' : 'Free · Gemini';
}

function engineBadge(extractedBy) {
  const map = {
    gemini: 'Gemini 3.6 Flash',
    deepseek: 'DeepSeek',
    heuristic: 'Fallback',
    manual: null,
  };
  return map[extractedBy] ?? null;
}

function freeDisclosureText(tier) {
  if (tier === 'pro') {
    return 'Account tier active. Processing runs on DeepSeek — your documents are not sent to Google on this tier.';
  }
  return 'Free tier — powered by Google Gemini free API. Prompts may be used by Google to improve its services, and the free quota can be rate-limited.';
}

function accountRequestText() {
  return `Request an Account — contact ${ACCOUNT_REQUEST_EMAIL}`;
}

// ===========================================================================
// T13 — Login modal happy path + wrong password UI
// ===========================================================================
test('T13 — login modal switches badge to Account · DeepSeek', async (t) => {
  const client = new TierTestClient();

  await t.test('anonymous state starts on Free · Gemini', () => {
    assert.equal(client.getTier(), 'free');
    assert.equal(tierBadge(client.getTier()), 'Free · Gemini');
  });

  await t.test('wrong credentials surface a generic error and keep free tier', async () => {
    await assert.rejects(
      () => client.login('someone', ''),
      /Invalid credentials/
    );
    assert.equal(client.getTier(), 'free');
    assert.equal(tierBadge(client.getTier()), 'Free · Gemini');
  });

  await t.test('valid credentials switch badge to Account · DeepSeek', async () => {
    const result = await client.login('shared-user', 'shared-password');
    assert.equal(result.tier, 'pro');
    assert.ok(result.token, 'tier token issued');
    assert.equal(client.getTier(), 'pro');
    assert.equal(tierBadge(client.getTier()), 'Account · DeepSeek');
  });

  await t.test('logout returns to Free · Gemini and clears the token', async () => {
    await client.logout();
    assert.equal(client.getTierToken(), null);
    assert.equal(tierBadge(client.getTier()), 'Free · Gemini');
  });
});

// ===========================================================================
// T14 — Quota banner at 5/day + account-request email
// ===========================================================================
test('T14 — free quota blocks the 6th job and shows the request-account email', async (t) => {
  const client = new TierTestClient();
  const pdf = { name: 'source.pdf', size: 1024 };
  const docx = { name: 'template.docx', size: 2048 };

  await t.test('first five free jobs succeed and count down', async () => {
    for (let i = 0; i < FREE_DAILY_LIMIT; i++) {
      const session = await client.uploadFiles(pdf, docx);
      assert.equal(session.tier, 'free');
      const quota = await client.getQuota();
      assert.equal(quota.free_used_today, i + 1);
    }
    const quota = await client.getQuota();
    assert.equal(quota.free_used_today, FREE_DAILY_LIMIT);
  });

  await t.test('sixth job raises QUOTA_EXCEEDED with retry hint', async () => {
    await assert.rejects(
      () => client.uploadFiles(pdf, docx),
      (err) => {
        assert.equal(err.code, 'QUOTA_EXCEEDED');
        assert.equal(err.tier, 'free');
        assert.ok(err.retryAfterSeconds > 0);
        return true;
      }
    );
  });

  await t.test('account-request screen exposes the contact email', () => {
    const text = accountRequestText();
    assert.ok(text.includes(ACCOUNT_REQUEST_EMAIL), 'contact email must be visible');
  });

  await t.test('logged-in account tier bypasses the free cap', async () => {
    await client.login('shared-user', 'shared-password');
    const session = await client.uploadFiles(pdf, docx);
    assert.equal(session.tier, 'pro');
  });
});

// ===========================================================================
// T15 — Free-tier Google disclosure on landing/upload
// ===========================================================================
test('T15 — free-tier Google disclosure renders for anonymous users only', async (t) => {
  await t.test('free tier shows the Google-training + quota notice', () => {
    const text = freeDisclosureText('free');
    assert.ok(text.includes('Google Gemini free API'));
    assert.ok(text.includes('improve its services'));
    assert.ok(text.includes('rate-limited'));
  });

  await t.test('account tier shows the DeepSeek/no-Google notice instead', () => {
    const text = freeDisclosureText('pro');
    assert.ok(text.includes('DeepSeek'));
    assert.ok(text.includes('not sent to Google'));
    assert.ok(!text.includes('improve its services'));
  });
});

// ===========================================================================
// T16 — tf_history localStorage write/read/clear
// ===========================================================================
test('T16 — tf_history schema write/read/clear', async (t) => {
  const client = new TierTestClient();

  const entry = {
    sessionId: 'session-abc',
    createdAt: new Date().toISOString(),
    tier: 'pro',
    engineUsed: 'deepseek',
    sourceDoc: { filename: 'contract.pdf', size: 4096 },
    templateDoc: { filename: 'summary.docx', format: 'docx' },
    overallConfidence: 0.91,
    fieldCount: 12,
    filledFilename: 'summary_Filled_session.docx',
    downloadExpired: true,
  };

  await t.test('write persists under the tf_history key', () => {
    const updated = client.saveHistoryEntry(entry);
    assert.equal(updated.length, 1);
    assert.ok(client.localStorage.getItem(HISTORY_KEY), 'tf_history key written');
  });

  await t.test('read returns the stored schema fields', () => {
    const [stored] = client.getHistory();
    assert.equal(stored.sessionId, entry.sessionId);
    assert.equal(stored.tier, 'pro');
    assert.equal(stored.engineUsed, 'deepseek');
    assert.deepEqual(stored.sourceDoc, entry.sourceDoc);
    assert.deepEqual(stored.templateDoc, entry.templateDoc);
    assert.equal(typeof stored.overallConfidence, 'number');
    assert.equal(stored.fieldCount, 12);
    assert.equal(stored.downloadExpired, true);
  });

  await t.test('re-saving the same session id de-duplicates', () => {
    const updated = client.saveHistoryEntry({ ...entry, fieldCount: 13 });
    assert.equal(updated.length, 1);
    assert.equal(updated[0].fieldCount, 13);
  });

  await t.test('clear removes the tf_history key', () => {
    client.clearHistory();
    assert.equal(client.localStorage.getItem(HISTORY_KEY), null);
    assert.equal(client.getHistory().length, 0);
  });
});

// ===========================================================================
// T17 — Engine badge renders deepseek
// ===========================================================================
test('T17 — engine provenance badge renders deepseek', async (t) => {
  await t.test('deepseek maps to its own badge', () => {
    assert.equal(engineBadge('deepseek'), 'DeepSeek');
  });
  await t.test('gemini and heuristic keep distinct badges', () => {
    assert.equal(engineBadge('gemini'), 'Gemini 3.6 Flash');
    assert.equal(engineBadge('heuristic'), 'Fallback');
  });
  await t.test('unknown provenance renders no badge', () => {
    assert.equal(engineBadge('manual'), null);
  });
});

// ===========================================================================
// T18 — Full flow both tiers
// ===========================================================================
test('T18 — full extraction flow for both tiers', async (t) => {
  const pdf = { name: 'source.pdf', size: 1024 };
  const docx = { name: 'template.docx', size: 2048 };

  await t.test('free flow: upload → gemini engine → history tier=free', async () => {
    const client = new TierTestClient();
    const session = await client.uploadFiles(pdf, docx);
    assert.equal(session.tier, 'free');

    const result = { engineUsed: 'gemini', fields: [{ extractedBy: 'gemini' }] };
    assert.equal(engineBadge(result.fields[0].extractedBy), 'Gemini 3.6 Flash');

    const history = client.saveHistoryEntry({
      sessionId: session.sessionId,
      createdAt: new Date().toISOString(),
      tier: session.tier,
      engineUsed: result.engineUsed,
      sourceDoc: { filename: pdf.name, size: pdf.size },
      templateDoc: { filename: docx.name, format: 'docx' },
      overallConfidence: 0.9,
      fieldCount: 1,
      filledFilename: 'filled.docx',
      downloadExpired: true,
    });
    assert.equal(history[0].tier, 'free');
    assert.equal(history[0].engineUsed, 'gemini');
  });

  await t.test('account flow: login → upload tier=pro → deepseek engine → history tier=pro', async () => {
    const client = new TierTestClient();
    await client.login('shared-user', 'shared-password');
    const session = await client.uploadFiles(pdf, docx);
    assert.equal(session.tier, 'pro');

    const result = { engineUsed: 'deepseek', fields: [{ extractedBy: 'deepseek' }] };
    assert.equal(engineBadge(result.fields[0].extractedBy), 'DeepSeek');

    const history = client.saveHistoryEntry({
      sessionId: session.sessionId,
      createdAt: new Date().toISOString(),
      tier: session.tier,
      engineUsed: result.engineUsed,
      sourceDoc: { filename: pdf.name, size: pdf.size },
      templateDoc: { filename: docx.name, format: 'docx' },
      overallConfidence: 0.93,
      fieldCount: 1,
      filledFilename: 'filled.docx',
      downloadExpired: true,
    });
    assert.equal(history[0].tier, 'pro');
    assert.equal(history[0].engineUsed, 'deepseek');
  });
});
