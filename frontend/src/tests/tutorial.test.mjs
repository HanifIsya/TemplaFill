import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// In-app tutorial tests — step data integrity + tier gating.
// Mirrors lib/tutorial.ts (plain data module, no DOM needed).
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUIDE_DIR = path.resolve(__dirname, '../../public/guide');

// Mirror of the tutorial step shape from lib/tutorial.ts, loaded from source
// so the test breaks if the data file changes shape.
const tutorialSrc = fs.readFileSync(
  path.resolve(__dirname, '../lib/tutorial.ts'),
  'utf8',
);

function extractSteps() {
  // Parse the exported array literal with a small regex over the source file:
  // each object has id, num, title, body, image, tier. This keeps the test
  // DOM-free without a TS toolchain.
  const steps = [];
  const re =
    /id:\s*'([^']+)',[\s\S]*?num:\s*(\d+),[\s\S]*?title:\s*'([^']+)',[\s\S]*?body:\s*'([^']+)',[\s\S]*?(?:tip:\s*'([^']*)',[\s\S]*?)?image:\s*'([^']+)',[\s\S]*?tier:\s*'(free|pro)'/g;
  let m;
  while ((m = re.exec(tutorialSrc)) !== null) {
    steps.push({
      id: m[1],
      num: Number(m[2]),
      title: m[3],
      body: m[4],
      tip: m[5],
      image: m[6],
      tier: m[7],
    });
  }
  return steps;
}

const steps = extractSteps();

test('T19 — tutorial defines at least one free and one pro step', () => {
  assert.ok(steps.length >= 10, `expected >=10 steps, got ${steps.length}`);
  assert.ok(steps.some((s) => s.tier === 'free'), 'has free steps');
  assert.ok(steps.some((s) => s.tier === 'pro'), 'has pro steps');
});

test('T20 — every tutorial step has required fields', () => {
  for (const s of steps) {
    assert.ok(s.id, `step missing id: ${JSON.stringify(s)}`);
    assert.ok(s.num > 0, `step ${s.id} has invalid num`);
    assert.ok(s.title.length > 3, `step ${s.id} title too short`);
    assert.ok(s.body.length > 20, `step ${s.id} body too short`);
    assert.ok(s.image.startsWith('/guide/'), `step ${s.id} image not under /guide/`);
  }
});

test('T21 — every referenced screenshot exists in public/guide', () => {
  for (const s of steps) {
    const file = path.join(GUIDE_DIR, path.basename(s.image));
    assert.ok(fs.existsSync(file), `missing screenshot for step ${s.id}: ${s.image}`);
    const bytes = fs.statSync(file).size;
    assert.ok(bytes > 5_000, `screenshot ${s.image} suspiciously small (${bytes} bytes)`);
    assert.ok(bytes < 400_000, `screenshot ${s.image} too large for the repo (${bytes} bytes)`);
  }
});

test('T22 — pro steps are gated behind the account tier', () => {
  // Mirror of getTutorialSteps() in lib/tutorial.ts.
  const visible = (tier) => steps.filter((s) => s.tier === 'free' || tier === 'pro');
  const freeVisible = visible('free');
  const proVisible = visible('pro');

  assert.ok(
    freeVisible.every((s) => s.tier === 'free'),
    'free tier must not see pro steps',
  );
  assert.ok(proVisible.length > freeVisible.length, 'pro tier sees more steps');
  assert.equal(proVisible.length, steps.length, 'pro tier sees all steps');
});

test('T23 — step ids are unique and numbers are sequential', () => {
  const ids = steps.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate step ids');
  const nums = steps.map((s) => s.num);
  const sorted = [...nums].sort((a, b) => a - b);
  assert.deepEqual(nums, sorted, 'step numbers must be ascending');
  for (let i = 1; i < nums.length; i++) {
    assert.ok(nums[i] > nums[i - 1], 'step numbers must strictly increase');
  }
});
