import type { Tier } from './types';

/**
 * In-app tutorial content (screenshots live in `public/guide/`).
 *
 * Steps are filtered by tier: `tier: 'pro'` steps only render for signed-in
 * account users. Keep this data plain (no JSX) so it stays unit-testable in
 * the DOM-free test suite.
 */
export interface TutorialStep {
  /** Stable id, also used as the test key. */
  id: string;
  /** Step number shown in the UI. */
  num: number;
  title: string;
  body: string;
  /** Optional secondary paragraph for extra guidance. */
  tip?: string;
  /** Image path under /guide/ (public folder). */
  image: string;
  /** Which tier this step belongs to. */
  tier: Tier;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  // ----- Free tier walkthrough -----
  {
    id: 'landing',
    num: 1,
    title: 'Open TemplaFill',
    body:
      'Go to templa-fill.vercel.app. The free tier needs no sign-up: you get 5 extraction jobs per day per network, and the counter in the banner shows how many are left today.',
    tip: 'The Navbar badge shows "Free · Gemini" while you are on the free tier.',
    image: '/guide/01-landing.jpg',
    tier: 'free',
  },
  {
    id: 'upload',
    num: 2,
    title: 'Open the Upload Screen',
    body:
      'Click "Start Document Processing". You will see two drop zones: one for the source PDF (the document to read) and one for the template (the file to fill in).',
    image: '/guide/02-upload-empty.jpg',
    tier: 'free',
  },
  {
    id: 'demo',
    num: 3,
    title: 'Load the Sample Pair (recommended for your first try)',
    body:
      'Click "Load Sample Contract and Template Pair" to load a demo contract PDF and a Word template with {{placeholders}}. The green checks confirm both files are ready.',
    tip: 'To use your own files instead, drag them into the two boxes. The source must be a text-based PDF; the template can be .docx, .xlsx, or .pptx.',
    image: '/guide/03-upload-demo.jpg',
    tier: 'free',
  },
  {
    id: 'example-source',
    num: 4,
    title: 'Inside the Example Source PDF',
    body:
      'The sample source is a one-page contract holding the facts to extract: contract number CTR-2026-889, signing date 2026-08-15, party PT Maju Jaya, and contract value $50,000. It never mentions a witness — so the witness field will stay unfilled. The AI only fills what the source actually says.',
    tip: 'Your own source must be a text-based PDF with a real text layer; scanned images need OCR first.',
    image: '/guide/21-example-source.jpg',
    tier: 'free',
  },
  {
    id: 'example-template',
    num: 5,
    title: 'Inside the Example Template',
    body:
      'The template is a Word document with {{placeholder}} markers where the values should go. Each marker name — like {{contract_number}} — tells TemplaFill which fact to look for in the source PDF.',
    tip: 'Placeholders can also use <<field>>, [field], {field}, or __field__ syntax — all are supported.',
    image: '/guide/22-example-template.jpg',
    tier: 'free',
  },
  {
    id: 'example-result',
    num: 6,
    title: 'What the Filled Result Looks Like',
    body:
      'After extraction, every placeholder that matched a source fact is replaced by its value, with the original formatting preserved. Here {{witness_name}} stays as-is because the source has no witness — which is why you should always review fields before downloading.',
    image: '/guide/23-example-result.jpg',
    tier: 'free',
  },
  {
    id: 'processing',
    num: 7,
    title: 'Start the AI Extraction',
    body:
      'Click "Begin Extraction". Four stages run automatically: PDF text/table extraction, semantic chunking and embedding, template placeholder inspection, and structured AI extraction.',
    tip: 'A typical document finishes in well under a minute. You can leave the tab open; it polls the server for progress.',
    image: '/guide/04-processing.jpg',
    tier: 'free',
  },
  {
    id: 'review-split',
    num: 8,
    title: 'Review Extracted Values (Split View)',
    body:
      'Every field is shown with its extracted value, a confidence score, and the source page. The left panel shows the exact snippet from the source document that the value came from.',
    tip: 'Green "High" means the AI found the value verbatim. Red "Missing" means it was not found and needs manual entry or a re-extract hint.',
    image: '/guide/05-review-split.jpg',
    tier: 'free',
  },
  {
    id: 'review-table',
    num: 9,
    title: 'Review in Table View',
    body:
      'Switch to "Table" view for a compact spreadsheet-style overview — ideal for templates with many fields. All the same actions are available on each row.',
    image: '/guide/06-review-table.jpg',
    tier: 'free',
  },
  {
    id: 'citation',
    num: 10,
    title: 'Check the Source Citation',
    body:
      'Click "Source p.1" (or "View Citation") on any field to open the citation modal. It shows the exact excerpt from the PDF, the extracted value, and the similarity score.',
    image: '/guide/07-citation.jpg',
    tier: 'free',
  },
  {
    id: 'reextract',
    num: 11,
    title: 'Re-Extract a Field with a Hint',
    body:
      'If a value looks wrong, click "Re-extract" and type a hint such as "Look at the signature block on page 2". The AI re-runs extraction for that field only, with your hint as extra context.',
    image: '/guide/08-reextract.jpg',
    tier: 'free',
  },
  {
    id: 'editing-open',
    num: 12,
    title: 'Edit a Value Manually',
    body:
      'Click "Edit" on a row to change the value by hand. Type the corrected text, then click the green check to save (or the cross to cancel).',
    image: '/guide/09-editing-open.jpg',
    tier: 'free',
  },
  {
    id: 'edited',
    num: 13,
    title: 'Saved Edits Are Marked',
    body:
      'Saved edits replace the extracted value and a "Field Updated" toast confirms the change. You can keep editing, re-extracting, or skip fields you do not need.',
    image: '/guide/09-edited.jpg',
    tier: 'free',
  },
  {
    id: 'download',
    num: 14,
    title: 'Generate and Download the Filled Document',
    body:
      'Click "Generate Filled Document" at the bottom of the review screen. On the Export step, download the populated document or a JSON audit log of every value and edit.',
    tip: 'Generated files and uploads are purged from the server within 24 hours — download what you need.',
    image: '/guide/10-download.jpg',
    tier: 'free',
  },
  {
    id: 'history',
    num: 15,
    title: 'Find Past Sessions in History',
    body:
      'The clock icon in the Navbar opens your recent sessions. History is stored only in your browser (localStorage) — never on a server database — and each entry can be downloaded as a JSON metadata record.',
    image: '/guide/11-history.jpg',
    tier: 'free',
  },
  {
    id: 'account-request',
    num: 16,
    title: 'Hit the Free Daily Limit? Request an Account',
    body:
      'After 5 free jobs in a day you will see this screen. The account tier runs on DeepSeek instead of Google, keeps documents off Google entirely, and raises the limit to 50 jobs/day. Send an email and the owner replies with the shared credentials.',
    image: '/guide/12-account-request.jpg',
    tier: 'free',
  },
  {
    id: 'login',
    num: 17,
    title: 'Sign In to the Account Tier',
    body:
      'Click "Sign in" in the Navbar and enter the shared username and password you received by email. There is no self-registration.',
    image: '/guide/13-login.jpg',
    tier: 'free',
  },

  // ----- Account tier walkthrough (only shown to signed-in users) -----
  {
    id: 'pro-navbar',
    num: 18,
    title: 'Account Tier Active',
    body:
      'After signing in, the Navbar badge switches to "Account · DeepSeek" and the landing banner confirms that documents are no longer sent to Google. Your daily limit becomes 50 jobs.',
    image: '/guide/14-pro-navbar.jpg',
    tier: 'pro',
  },
  {
    id: 'pro-processing',
    num: 19,
    title: 'Processing Runs on DeepSeek',
    body:
      'The pipeline is identical, but extraction runs on the DeepSeek engine with no Google embedding calls at all — retrieval is bypassed and document chunks are sent sequentially to DeepSeek.',
    image: '/guide/15-pro-processing.jpg',
    tier: 'pro',
  },
  {
    id: 'pro-review',
    num: 20,
    title: 'DeepSeek Provenance Badges',
    body:
      'Each extracted field is labelled "DeepSeek" instead of "Gemini 3.6 Flash". If the DeepSeek API is ever unavailable, the job falls back to the local heuristic engine only — never to Google.',
    image: '/guide/16-pro-review.jpg',
    tier: 'pro',
  },
  {
    id: 'pro-download',
    num: 21,
    title: 'Export from the Account Tier',
    body:
      'Confirm and download exactly as on the free tier. The audit log records the DeepSeek engine as the extractor for every field.',
    image: '/guide/17-pro-download.jpg',
    tier: 'pro',
  },
];

/** Steps visible for a given tier (pro steps require the account tier). */
export function getTutorialSteps(tier: Tier): TutorialStep[] {
  return TUTORIAL_STEPS.filter((step) => step.tier === 'free' || tier === 'pro');
}

/** True when the signed-out user is missing the account-only walkthrough. */
export function hasHiddenProSteps(tier: Tier): boolean {
  return tier !== 'pro' && TUTORIAL_STEPS.some((step) => step.tier === 'pro');
}
