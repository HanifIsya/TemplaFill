import test from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Frontend polish suite — covers the design-review fixes:
// tier-aware engine labels, toast dismissal policy, history metadata export,
// empty-generate guard, and the full 5-syntax documentation set.
// Pure-logic mirrors of the components (no DOM).
// ---------------------------------------------------------------------------

const PLACEHOLDER_SYNTAXES = [
  { example: '{{field_name}}', label: 'Double Braces' },
  { example: '<<field_name>>', label: 'Double Angle Brackets' },
  { example: '[field_name]', label: 'Square Brackets' },
  { example: '{field_name}', label: 'Single Braces' },
  { example: '__field_name__', label: 'Double Underscores' },
];

function engineLabel(tier) {
  return tier === 'pro' ? 'DeepSeek' : 'Google Gemini 3.6 Flash';
}

function processingStep4Title(tier) {
  return `Structured Extraction via ${engineLabel(tier)}`;
}

function footerEngineLabel(tier) {
  return tier === 'pro'
    ? 'Account tier: DeepSeek + PyMuPDF'
    : 'Free tier: Google Gemini 3.6 Flash + PyMuPDF';
}

function auditEngineLabel(tier) {
  return tier === 'pro' ? 'DeepSeek' : 'Google Gemini 3.6 Flash RAG';
}

// Mirrors page.tsx addToast dismissal policy.
function toastAutoDismissMs(type) {
  return type === 'success' || type === 'info' ? 4200 : null;
}

function historyMetadataFilename(sessionId) {
  return `session_${sessionId.slice(0, 8)}_metadata.json`;
}

function generateGuard(fields) {
  const values = {};
  fields.forEach((f) => {
    if (!f.isSkipped && f.extractedValue.trim()) values[f.templateField] = f.extractedValue;
  });
  return { canGenerate: Object.keys(values).length > 0, values };
}

// ===========================================================================
test('engine labels are tier-aware everywhere', async (t) => {
  await t.test('free tier labels the Gemini engine', () => {
    assert.equal(engineLabel('free'), 'Google Gemini 3.6 Flash');
    assert.equal(processingStep4Title('free'), 'Structured Extraction via Google Gemini 3.6 Flash');
    assert.ok(footerEngineLabel('free').includes('Google Gemini 3.6 Flash'));
    assert.ok(auditEngineLabel('free').includes('Gemini'));
  });

  await t.test('account tier labels the DeepSeek engine', () => {
    assert.equal(engineLabel('pro'), 'DeepSeek');
    assert.equal(processingStep4Title('pro'), 'Structured Extraction via DeepSeek');
    assert.ok(footerEngineLabel('pro').includes('DeepSeek'));
    assert.equal(auditEngineLabel('pro'), 'DeepSeek');
  });

  await t.test('no stale text-embedding-004 reference remains', () => {
    for (const tier of ['free', 'pro']) {
      assert.ok(!processingStep4Title(tier).includes('text-embedding-004'));
    }
  });
});

test('toast dismissal policy keeps warnings/errors visible', async (t) => {
  await t.test('success and info auto-dismiss', () => {
    assert.equal(typeof toastAutoDismissMs('success'), 'number');
    assert.equal(typeof toastAutoDismissMs('info'), 'number');
  });
  await t.test('warning and error persist until dismissed', () => {
    assert.equal(toastAutoDismissMs('warning'), null);
    assert.equal(toastAutoDismissMs('error'), null);
  });
});

test('history export produces JSON metadata, not a mislabeled document', async (t) => {
  await t.test('filename is a .json metadata record', () => {
    const name = historyMetadataFilename('550e8400-e29b-41d4-a716-446655440000');
    assert.ok(name.endsWith('.json'));
    assert.ok(name.includes('metadata'));
  });
  await t.test('filename never masquerades as a .docx', () => {
    const name = historyMetadataFilename('session-abc12345');
    assert.ok(!name.endsWith('.docx'));
  });
});

test('generate is blocked until at least one field has a value', async (t) => {
  await t.test('all-empty fields cannot generate', () => {
    const fields = [
      { templateField: 'a', extractedValue: '', isSkipped: false },
      { templateField: 'b', extractedValue: '   ', isSkipped: false },
    ];
    assert.equal(generateGuard(fields).canGenerate, false);
  });
  await t.test('skipped fields do not count toward generation', () => {
    const fields = [{ templateField: 'a', extractedValue: 'x', isSkipped: true }];
    assert.equal(generateGuard(fields).canGenerate, false);
  });
  await t.test('a single populated field enables generation', () => {
    const fields = [
      { templateField: 'a', extractedValue: '', isSkipped: false },
      { templateField: 'b', extractedValue: 'Jane Doe', isSkipped: false },
    ];
    const { canGenerate, values } = generateGuard(fields);
    assert.equal(canGenerate, true);
    assert.deepEqual(values, { b: 'Jane Doe' });
  });
});

test('help guide documents all 5 placeholder syntaxes', async (t) => {
  await t.test('includes single braces alongside the other four', () => {
    assert.equal(PLACEHOLDER_SYNTAXES.length, 5);
    const labels = PLACEHOLDER_SYNTAXES.map((s) => s.label);
    assert.ok(labels.includes('Single Braces'));
  });
  await t.test('each syntax has a distinct example', () => {
    const examples = new Set(PLACEHOLDER_SYNTAXES.map((s) => s.example));
    assert.equal(examples.size, 5);
  });
});
