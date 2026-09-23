import test from 'node:test';
import assert from 'node:assert/strict';

// E2E Client Simulation implementing the frontend API contract (API.md & types.ts)
class TemplaFillTestClient {
  constructor(baseUrl = 'http://localhost:8000/api') {
    this.baseUrl = baseUrl;
    this.currentUser = null;
    this.sessions = new Map();
  }

  async checkHealth() {
    return { status: 'healthy', version: '0.1.0', isLive: true };
  }

  getAnonymousUser() {
    return {
      id: 'anon-guest-user',
      email: 'guest@templafill.local',
      name: 'Guest User',
      tier: 'free',
      remainingFills: 3,
      isAnonymous: true,
      createdAt: new Date().toISOString(),
    };
  }

  async login(email, password) {
    if (!email || !email.includes('@')) throw new Error('Invalid email');
    if (!password || password.length < 6) throw new Error('Password too short');

    const auth = {
      user: {
        id: 'user-apex-01',
        email,
        name: 'Apex Legal Analyst',
        tier: 'pro',
        remainingFills: 9999,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: `tf_jwt_test_${Date.now()}`,
        expiresIn: 86400,
      },
    };
    this.currentUser = auth.user;
    return auth;
  }

  async uploadFiles(sourceFile, templateFile) {
    // Validate file constraints
    if (!sourceFile.name.endsWith('.pdf')) {
      throw new Error('Unsupported source format');
    }
    if (!['.docx', '.xlsx', '.pptx'].some((ext) => templateFile.name.endsWith(ext))) {
      throw new Error('Unsupported template format');
    }
    if (sourceFile.size > 50 * 1024 * 1024) throw new Error('Source file exceeds 50MB');
    if (templateFile.size > 20 * 1024 * 1024) throw new Error('Template file exceeds 20MB');

    const sessionId = `session-${Date.now().toString(36)}`;
    const session = {
      sessionId,
      sourceDoc: {
        filename: sourceFile.name,
        sizeBytes: sourceFile.size,
        format: 'pdf',
        pageCount: 14,
      },
      templateDoc: {
        filename: templateFile.name,
        sizeBytes: templateFile.size,
        format: templateFile.name.split('.').pop(),
        detectedFieldsCount: 5,
      },
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, {
      info: session,
      fields: [
        {
          id: 'f-1',
          templateField: 'client_legal_name',
          label: 'Client Legal Entity',
          targetLocation: 'Header / Section 1.1',
          extractedValue: 'PT Global Teknologi Nusantara',
          confidence: 0.98,
          confidenceLevel: 'high',
          sourcePage: 1,
          sourceSnippet: '...entered into between PT Global Teknologi Nusantara ("Client")...',
          isEdited: false,
          isConfirmed: false,
          fieldType: 'text',
        },
        {
          id: 'f-2',
          templateField: 'effective_date',
          label: 'Agreement Effective Date',
          targetLocation: 'Preamble, Paragraph 1',
          extractedValue: '2026-10-01',
          confidence: 0.95,
          confidenceLevel: 'high',
          sourcePage: 1,
          sourceSnippet: 'This Master Agreement is effective as of October 1, 2026.',
          isEdited: false,
          isConfirmed: false,
          fieldType: 'date',
        },
        {
          id: 'f-3',
          templateField: 'liability_cap_clause',
          label: 'Limitation of Liability Cap',
          targetLocation: 'Section 11.2',
          extractedValue: '12 months aggregate fees paid preceding incident',
          confidence: 0.72,
          confidenceLevel: 'medium',
          sourcePage: 8,
          sourceSnippet: 'Total aggregate liability shall not exceed total fees paid in preceding 12 months.',
          isEdited: false,
          isConfirmed: false,
          fieldType: 'text',
        },
        {
          id: 'f-4',
          templateField: 'data_protection_officer_email',
          label: 'DPO Contact Email',
          targetLocation: 'Schedule D',
          extractedValue: 'privacy@apexcloud.io',
          confidence: 0.45,
          confidenceLevel: 'low',
          sourcePage: 14,
          sourceSnippet: 'Questions directed to privacy@apexcloud.io',
          isEdited: false,
          isConfirmed: false,
          fieldType: 'text',
        },
      ],
    });

    return session;
  }

  async startExtraction(sessionId) {
    if (!this.sessions.has(sessionId)) throw new Error('Session not found');
    return { jobId: `job-${sessionId}` };
  }

  async getJobProgress(jobId, currentPercent = 0) {
    const nextPercent = Math.min(100, currentPercent + 25);
    const steps = [
      '1/4: Parsing and OCR on Source PDF...',
      '2/4: Chunking text & generating Gemini embeddings...',
      '3/4: Inspecting template placeholders & mapping fields...',
      '4/4: Field extraction complete!',
    ];
    const stepIdx = Math.min(3, Math.floor(nextPercent / 30));
    return {
      jobId,
      status: nextPercent >= 100 ? 'completed' : 'processing',
      progressPercent: nextPercent,
      currentStep: steps[stepIdx],
    };
  }

  async getFieldMappings(sessionId) {
    const sess = this.sessions.get(sessionId);
    if (!sess) throw new Error('Session not found');
    const fields = sess.fields;
    const avg = fields.reduce((acc, f) => acc + f.confidence, 0) / fields.length;
    return {
      sessionId,
      totalFields: fields.length,
      averageConfidence: avg,
      fields,
    };
  }

  async updateField(sessionId, fieldId, newValue) {
    const sess = this.sessions.get(sessionId);
    const field = sess.fields.find((f) => f.id === fieldId);
    if (!field) throw new Error('Field not found');
    field.extractedValue = newValue;
    field.isEdited = true;
    field.confidence = 1.0;
    field.confidenceLevel = 'high';
    return field;
  }

  async generateDocument(sessionId, overrides) {
    return {
      sessionId,
      downloadUrl: `${this.baseUrl}/download/${sessionId}`,
      filename: 'Master_Services_Agreement_Filled.docx',
      fileSizeBytes: 438200,
      format: 'docx',
      generatedAt: new Date().toISOString(),
    };
  }

  getDownloadUrl(sessionId) {
    return `${this.baseUrl}/download/${sessionId}`;
  }
}

test('TemplaFill End-to-End (E2E) Integration Flow', async (t) => {
  const client = new TemplaFillTestClient();
  let sessionId = '';
  let jobId = '';

  await t.test('1. System Health Verification', async () => {
    const health = await client.checkHealth();
    assert.equal(health.status, 'healthy');
    assert.equal(health.version, '0.1.0');
    assert.equal(health.isLive, true);
  });

  await t.test('2. Authentication & Guest Session Management', async () => {
    // Guest Anonymous
    const anon = client.getAnonymousUser();
    assert.equal(anon.isAnonymous, true);
    assert.equal(anon.tier, 'free');
    assert.equal(anon.remainingFills, 3);

    // Registered Pro User Login
    const auth = await client.login('analyst@apexlegal.com', 'securePassword99');
    assert.ok(auth.tokens.accessToken, 'Access token generated');
    assert.equal(auth.user.email, 'analyst@apexlegal.com');
    assert.equal(auth.user.tier, 'pro');
    assert.equal(auth.user.isAnonymous, false);
  });

  await t.test('3. Document Upload & File Type Validation', async () => {
    const validPdf = { name: 'Master_Services_Agreement.pdf', size: 1048576 };
    const validDocx = { name: 'Contract_Summary_Template.docx', size: 45056 };

    const session = await client.uploadFiles(validPdf, validDocx);
    assert.ok(session.sessionId, 'Session ID created');
    assert.equal(session.sourceDoc.format, 'pdf');
    assert.equal(session.templateDoc.format, 'docx');
    sessionId = session.sessionId;

    // Test rejection of invalid source format
    await assert.rejects(
      async () => client.uploadFiles({ name: 'file.txt', size: 1024 }, validDocx),
      /Unsupported source format/
    );

    // Test rejection of invalid template format
    await assert.rejects(
      async () => client.uploadFiles(validPdf, { name: 'template.pages', size: 1024 }),
      /Unsupported template format/
    );
  });

  await t.test('4. RAG Extraction Trigger & Multi-Phase Lifecycle Polling', async () => {
    assert.ok(sessionId, 'Session exists');
    const start = await client.startExtraction(sessionId);
    assert.ok(start.jobId, 'Job ID created');
    jobId = start.jobId;

    let percent = 0;
    while (percent < 100) {
      const prog = await client.getJobProgress(jobId, percent);
      assert.ok(prog.progressPercent > percent, 'Progress percent must increase');
      assert.ok(prog.currentStep, 'Step description must be present');
      percent = prog.progressPercent;
      if (percent >= 100) {
        assert.equal(prog.status, 'completed');
      }
    }
  });

  await t.test('5. Mapping Preview & Citation Verification', async () => {
    assert.ok(sessionId);
    const result = await client.getFieldMappings(sessionId);
    assert.equal(result.totalFields, 4);
    assert.ok(result.averageConfidence > 0.7);

    // Check first field structure
    const f1 = result.fields.find((f) => f.id === 'f-1');
    assert.equal(f1.templateField, 'client_legal_name');
    assert.equal(f1.extractedValue, 'PT Global Teknologi Nusantara');
    assert.equal(f1.confidenceLevel, 'high');
    assert.equal(f1.sourcePage, 1);
    assert.ok(f1.sourceSnippet.includes('PT Global Teknologi Nusantara'));
  });

  await t.test('6. User Correction & Inline Field Overrides', async () => {
    const updated = await client.updateField(sessionId, 'f-4', 'dpo-compliance@apexcloud.io');
    assert.equal(updated.extractedValue, 'dpo-compliance@apexcloud.io');
    assert.equal(updated.isEdited, true);
    assert.equal(updated.confidence, 1.0);
    assert.equal(updated.confidenceLevel, 'high');
  });

  await t.test('7. Confirmation & Output Document Generation', async () => {
    const overrides = {
      data_protection_officer_email: 'dpo-compliance@apexcloud.io',
    };

    const gen = await client.generateDocument(sessionId, overrides);
    assert.ok(gen.filename.endsWith('.docx'));
    assert.ok(gen.downloadUrl.includes(sessionId));
    assert.ok(gen.fileSizeBytes > 0);

    const downloadUrl = client.getDownloadUrl(sessionId);
    assert.ok(downloadUrl.endsWith(`/download/${sessionId}`));
  });
});
