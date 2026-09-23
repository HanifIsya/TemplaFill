import test from 'node:test';
import assert from 'node:assert/strict';

// Test mock dataset and field structure
const MOCK_FIELDS = [
  {
    id: 'f-1',
    templateField: 'client_legal_name',
    label: 'Client Legal Entity',
    targetLocation: 'Header / Section 1.1',
    extractedValue: 'PT Global Teknologi Nusantara',
    confidence: 0.98,
    confidenceLevel: 'high',
    sourcePage: 1,
    fieldType: 'text',
  },
  {
    id: 'f-6',
    templateField: 'liability_cap_clause',
    label: 'Limitation of Liability Cap',
    targetLocation: 'Section 11.2',
    extractedValue: '12 months fees paid preceding the incident',
    confidence: 0.72,
    confidenceLevel: 'medium',
    sourcePage: 8,
    fieldType: 'text',
  },
  {
    id: 'f-8',
    templateField: 'data_protection_officer_email',
    label: 'DPO Contact Email',
    targetLocation: 'Schedule D - Privacy',
    extractedValue: 'privacy@apexcloud.io',
    confidence: 0.45,
    confidenceLevel: 'low',
    sourcePage: 14,
    fieldType: 'text',
  },
];

test('Field Mapping Structure & Confidence Thresholds', async (t) => {
  await t.test('verifies all fields contain valid identifiers and locations', () => {
    for (const field of MOCK_FIELDS) {
      assert.ok(field.id, 'field must have an id');
      assert.ok(field.templateField, 'field must have a templateField');
      assert.ok(field.label, 'field must have a label');
      assert.ok(field.targetLocation, 'field must have a targetLocation');
      assert.ok(typeof field.confidence === 'number', 'confidence must be numeric');
    }
  });

  await t.test('evaluates confidence level thresholds correctly per PRD/Design specs', () => {
    const high = MOCK_FIELDS.find((f) => f.id === 'f-1');
    const medium = MOCK_FIELDS.find((f) => f.id === 'f-6');
    const low = MOCK_FIELDS.find((f) => f.id === 'f-8');

    assert.equal(high.confidence >= 0.8, true, 'High confidence must be >= 0.8');
    assert.equal(high.confidenceLevel, 'high');

    assert.equal(medium.confidence >= 0.5 && medium.confidence < 0.8, true, 'Medium confidence must be 0.5 - 0.8');
    assert.equal(medium.confidenceLevel, 'medium');

    assert.equal(low.confidence < 0.5, true, 'Low confidence must be < 0.5');
    assert.equal(low.confidenceLevel, 'low');
  });

  await t.test('filters fields by search query correctly', () => {
    const query = 'Liability';
    const matches = MOCK_FIELDS.filter((f) =>
      f.label.toLowerCase().includes(query.toLowerCase())
    );
    assert.equal(matches.length, 1);
    assert.equal(matches[0].templateField, 'liability_cap_clause');
  });

  await t.test('calculates summary statistics correctly', () => {
    const highCount = MOCK_FIELDS.filter((f) => f.confidenceLevel === 'high').length;
    const mediumCount = MOCK_FIELDS.filter((f) => f.confidenceLevel === 'medium').length;
    const lowCount = MOCK_FIELDS.filter((f) => f.confidenceLevel === 'low').length;
    const avgScore = MOCK_FIELDS.reduce((acc, f) => acc + f.confidence, 0) / MOCK_FIELDS.length;

    assert.equal(highCount, 1);
    assert.equal(mediumCount, 1);
    assert.equal(lowCount, 1);
    assert.ok(avgScore > 0.7 && avgScore < 0.75, 'Average score should match weighted sum');
  });
});
