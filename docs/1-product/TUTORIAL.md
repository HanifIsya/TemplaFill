# TemplaFill — Visual Tutorial (Step by Step)

> **Audience**: first-time users — no technical background required.
> **App**: <https://templa-fill.vercel.app> · **In-app version**: click **Guide** in the Navbar → **1. Tutorial** tab (screenshots included, account steps unlock after sign-in).
> **Last Updated**: 2026-09-27

This tutorial walks through the complete workflow with a screenshot for every step. It has two parts:

- **Part A — Free Tier** (no account needed): steps 1–14.
- **Part B — Account Tier** (signed-in users only): steps 15–18.

All screenshots use the built-in demo files, so you can follow along safely.

The same walkthrough is built into the app: open **Guide** in the Navbar and select the **1. Tutorial** tab.

![In-app tutorial tab](../../frontend/public/guide/18-help-modal.jpg)

---

## Part A — Free Tier (No Account Needed)

### Step 1 — Open TemplaFill

Go to **https://templa-fill.vercel.app**. The free tier needs no sign-up: you get **5 extraction jobs per day per network**, and the banner shows how many are left today.

> **Tip**: The Navbar badge shows `Free · Gemini` while you are on the free tier.

![Step 1 — Landing page](../../frontend/public/guide/01-landing.jpg)

---

### Step 2 — Open the Upload Screen

Click **Start Document Processing**. You will see two drop zones: one for the **source PDF** (the document to read) and one for the **template** (the file to fill in).

![Step 2 — Upload screen](../../frontend/public/guide/02-upload-empty.jpg)

---

### Step 3 — Load the Sample Pair (recommended for your first try)

Click **Load Sample Contract and Template Pair**. A demo contract PDF and a Word template with `{{placeholders}}` load automatically, and green checks confirm both files are ready.

> **Tip**: To use your own files instead, drag them into the two boxes. The source must be a **text-based PDF**; the template can be **.docx**, **.xlsx**, or **.pptx**.

![Step 3 — Demo files loaded](../../frontend/public/guide/03-upload-demo.jpg)

---

### Step 4 — Start the AI Extraction

Click **Begin Extraction**. Four stages run automatically:

1. PDF text and table extraction
2. Semantic chunking and indexing
3. Template placeholder inspection
4. Structured AI extraction

> **Tip**: A typical document finishes in well under a minute. You can leave the tab open — it polls the server for progress.

![Step 4 — Processing](../../frontend/public/guide/04-processing.jpg)

---

### Step 5 — Review Extracted Values (Split View)

Every field appears with its extracted value, a **confidence score**, and the **source page**. The left panel shows the exact snippet the value came from.

> **Tip**: Green **High** means the AI found the value verbatim. Red **Missing** means it was not found — enter it manually or use a re-extract hint (step 8).

![Step 5 — Review, split view](../../frontend/public/guide/05-review-split.jpg)

---

### Step 6 — Review in Table View

Switch to **Table** view for a compact spreadsheet-style overview — ideal for templates with many fields. All actions are available on each row.

![Step 6 — Review, table view](../../frontend/public/guide/06-review-table.jpg)

---

### Step 7 — Check the Source Citation

Click **Source p.1** (or **View Citation**) on any field to open the citation modal: the exact excerpt from the PDF, the extracted value, and the similarity score.

![Step 7 — Citation modal](../../frontend/public/guide/07-citation.jpg)

---

### Step 8 — Re-Extract a Field with a Hint

If a value looks wrong, click **Re-extract** and type a hint such as *"Look at the signature block on page 2"*. The AI re-runs extraction for that field only, with your hint as extra context.

![Step 8 — Re-extract modal](../../frontend/public/guide/08-reextract.jpg)

---

### Step 9 — Edit a Value Manually

Click **Edit** on a row to change the value by hand. Type the corrected text, then click the **green check** to save (or the **cross** to cancel).

![Step 9 — Editing a value](../../frontend/public/guide/09-editing-open.jpg)

---

### Step 10 — Saved Edits Are Marked

Saved edits replace the extracted value and a **Field Updated** toast confirms the change. You can keep editing, re-extracting, or skip fields you do not need.

![Step 10 — Saved edit](../../frontend/public/guide/09-edited.jpg)

---

### Step 11 — Generate and Download the Filled Document

Click **Generate Filled Document** at the bottom of the review screen. On the Export step, download the **populated document** or a **JSON audit log** of every value and edit.

> **Tip**: Generated files and uploads are purged from the server within 24 hours — download what you need.

![Step 11 — Download](../../frontend/public/guide/10-download.jpg)

---

### Step 12 — Find Past Sessions in History

The **clock icon** in the Navbar opens your recent sessions. History is stored only in your browser (localStorage) — never on a server database — and each entry can be downloaded as a JSON metadata record.

![Step 12 — History](../../frontend/public/guide/11-history.jpg)

---

### Step 13 — Hit the Free Daily Limit? Request an Account

After 5 free jobs in a day you will see this screen. The **account tier** runs on DeepSeek instead of Google, keeps documents off Google entirely, and raises the limit to **50 jobs/day**. Send an email and the owner replies with the shared credentials.

![Step 13 — Daily limit / request account](../../frontend/public/guide/12-account-request.jpg)

---

### Step 14 — Sign In to the Account Tier

Click **Sign in** in the Navbar and enter the shared username and password you received by email. There is no self-registration.

![Step 14 — Login modal](../../frontend/public/guide/13-login.jpg)

---

## Part B — Account Tier (Signed-In Users Only)

> The following steps appear in the in-app tutorial **only after you sign in** (Navbar → Guide → Tutorial).

### Step 15 — Account Tier Active

After signing in, the Navbar badge switches to `Account · DeepSeek` and the landing banner confirms documents are no longer sent to Google. Your daily limit becomes 50 jobs.

![Step 15 — Account tier active](../../frontend/public/guide/14-pro-navbar.jpg)

---

### Step 16 — Processing Runs on DeepSeek

The pipeline is identical, but extraction runs on the **DeepSeek engine** with no Google embedding calls at all — retrieval is bypassed and document chunks are sent sequentially to DeepSeek.

![Step 16 — Processing on DeepSeek](../../frontend/public/guide/15-pro-processing.jpg)

---

### Step 17 — DeepSeek Provenance Badges

Each extracted field is labelled **DeepSeek** instead of `Gemini 3.6 Flash`. If the DeepSeek API is ever unavailable, the job falls back to the **local heuristic engine only** — never to Google.

![Step 17 — DeepSeek badges](../../frontend/public/guide/16-pro-review.jpg)

---

### Step 18 — Export from the Account Tier

Confirm and download exactly as on the free tier. The audit log records the DeepSeek engine as the extractor for every field.

![Step 18 — Account export](../../frontend/public/guide/17-pro-download.jpg)

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| **"Free Daily Limit Reached"** | You have used all 5 free jobs for today. Wait for the daily reset (server time) or request an account tier. |
| **A field shows "Missing"** | The value was not found in the PDF. Edit it manually (step 9) or re-extract with a hint (step 8). |
| **"Heuristic Fallback Active" warning** | The AI provider was temporarily unavailable, so the local engine filled in what it could. Review those fields carefully. |
| **Backend "waking up"** | The free hosting sleeps after inactivity; the first request can take up to a minute. The banner shows progress. |
| **Scanned PDF gives no text** | TemplaFill needs a digital text layer. Run OCR on scanned documents first. |
| **Placeholders not detected** | Check your template uses one of the 5 syntaxes: `{{field}}`, `<<field>>`, `[field]`, `{field}`, `__field__`. |

---

## Privacy Notes (Both Tiers)

- **Selective PII Masking** runs on every tier: NPWP, NIK/KTP, bank accounts, emails, and phone numbers are replaced with surrogate tokens before any AI call, then restored locally after extraction.
- **Free tier**: document text goes to Google's free Gemini API (its terms allow prompt data to be used to improve Google's products).
- **Account tier**: documents go to DeepSeek instead — no Google calls at all. DeepSeek's published terms do not commit to excluding API inputs from training or to a fixed retention period, so no such claim is made here.
- Uploads are held in server RAM only and purged within 24 hours; session history lives in your browser.
