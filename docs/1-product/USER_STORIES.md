# User Stories

> Format: **As a [role], I want to [action], so that [benefit].**
> Each story includes acceptance criteria for implementation and testing.

---

## Epic 1: File Upload & Management

### US-001: Upload Source PDF
**As a** user, **I want to** upload a source PDF document, **so that** the system can extract data from it.

**Acceptance Criteria:**
- [ ] User can click "Upload" or drag-and-drop a PDF file
- [ ] System accepts PDF files up to 50MB / 500 pages
- [ ] System rejects non-PDF files with a clear error message
- [ ] Upload progress bar is visible during upload
- [ ] After upload, a preview/summary of the PDF is shown (page count, detected text length)

### US-002: Upload Template Document
**As a** user, **I want to** upload a template document (.docx, .xlsx, or .pptx), **so that** the system knows which fields to fill.

**Acceptance Criteria:**
- [ ] User can upload .docx, .xlsx, or .pptx files
- [ ] System rejects unsupported file types with a clear error message
- [ ] After upload, system shows detected placeholder fields in the template
- [ ] User can see a preview of the template structure

### US-003: View Detected Template Fields
**As a** user, **I want to** see the list of detected placeholder fields in my template, **so that** I can verify the system understood my template correctly.

**Acceptance Criteria:**
- [ ] All placeholder fields are listed with their names
- [ ] Each field shows its location in the template (e.g., "Page 1, paragraph 3")
- [ ] User can rename a field's label if the auto-detected name is unclear
- [ ] User can manually add a field that wasn't auto-detected

---

## Epic 2: Data Extraction & Mapping

### US-010: Automatic Data Extraction
**As a** user, **I want** the system to automatically extract relevant data from my source PDF for each template field, **so that** I don't have to manually search through hundreds of pages.

**Acceptance Criteria:**
- [ ] System processes the PDF and extracts candidate values for each template field
- [ ] Processing status is shown (progress bar or status messages)
- [ ] Processing completes within 60 seconds for a 100-page PDF
- [ ] If a field's data is not found, it's marked as "Not Found" (not hallucinated)

### US-011: View Mapping Results
**As a** user, **I want to** see a clear mapping of template fields to extracted values, **so that** I can review what the AI found.

**Acceptance Criteria:**
- [ ] Two-column layout: template field name on left, extracted value on right
- [ ] Each value has a confidence indicator (high/medium/low)
- [ ] Fields are grouped logically (or in template order)
- [ ] "Not Found" fields are visually distinct

### US-012: View Source Reference
**As a** user, **I want to** see exactly where in the source PDF each extracted value came from, **so that** I can verify it's correct.

**Acceptance Criteria:**
- [ ] Each extracted value has a clickable "Source" link
- [ ] Clicking the link shows the relevant section of the source PDF with the value highlighted
- [ ] Source reference includes page number and surrounding context (2-3 sentences)

### US-013: Edit Extracted Values
**As a** user, **I want to** manually edit or correct any extracted value, **so that** the final document is accurate.

**Acceptance Criteria:**
- [ ] Each field value is editable inline
- [ ] User can clear a value and type a new one
- [ ] User can mark a field as "Skip" (leave blank in output)
- [ ] Edited values are visually marked as "manually edited"

### US-014: Re-extract a Specific Field
**As a** user, **I want to** ask the AI to try again for a specific field (maybe with a hint), **so that** I can get a better extraction without re-running the whole process.

**Acceptance Criteria:**
- [ ] Each field has a "Re-extract" button
- [ ] User can optionally provide a hint (e.g., "look for this on page 5" or "the date is near the signature section")
- [ ] Re-extraction only processes the specified field, not the whole document
- [ ] Original value is preserved until user accepts the new one

---

## Epic 3: Document Generation & Download

### US-020: Generate Filled Document
**As a** user, **I want to** generate the final filled template document, **so that** I can use it for my work.

**Acceptance Criteria:**
- [ ] User clicks "Generate" after reviewing all fields
- [ ] System produces the filled document in the same format as the uploaded template
- [ ] All placeholder fields are replaced with extracted (or manually edited) values
- [ ] Original template formatting is preserved (fonts, styles, layout)

### US-021: Download Filled Document
**As a** user, **I want to** download the generated document, **so that** I can use it offline.

**Acceptance Criteria:**
- [ ] Download button is prominently placed after generation
- [ ] File downloads in the original template format (.docx, .xlsx, or .pptx)
- [ ] Filename is descriptive (e.g., `Template_Name_Filled_2026-09-23.docx`)

### US-022: Download Extraction Summary
**As a** user, **I want to** download a summary report of all extracted fields, **so that** I have a record of what was extracted and from where.

**Acceptance Criteria:**
- [ ] Summary report includes: field name, extracted value, source page, confidence score
- [ ] Report is downloadable as PDF or CSV
- [ ] Report includes timestamp and source/template file names

---

## Epic 4: User Experience

### US-030: Onboarding / First-Time Experience
**As a** first-time user, **I want to** understand how TemplaFill works within 30 seconds, **so that** I can start using it immediately.

**Acceptance Criteria:**
- [ ] Landing page clearly explains the 3-step process (Upload → Review → Download)
- [ ] A demo/example is available (pre-loaded source + template) so users can try without uploading
- [ ] Tooltips or brief instructions appear on first use

### US-031: Error Handling
**As a** user, **I want** clear error messages when something goes wrong, **so that** I know what to do next.

**Acceptance Criteria:**
- [ ] File type/size errors show specific limits and accepted formats
- [ ] Processing errors suggest actions (retry, upload different file, contact support)
- [ ] Network errors are handled gracefully with retry option
- [ ] No generic "Something went wrong" messages — always specific

### US-032: Processing History (Phase 2)
**As a** returning user, **I want to** see my previous document processing sessions, **so that** I can re-download or re-use previous results.

**Acceptance Criteria:**
- [ ] History shows: date, source file name, template name, status
- [ ] User can re-download previously generated documents (within retention period)
- [ ] User can delete history entries
- [ ] History is stored in the browser (`tf_history` in `localStorage`) only, never synced to a server

---

## Epic 5: Tiers & Access (Phase 6)

### US-040: Use the Free Tier Anonymously
**As a** visitor, **I want to** process documents without creating an account, **so that** I can try TemplaFill immediately.

**Acceptance Criteria:**
- [ ] No sign-up, email, or credentials required for the free tier
- [ ] Free tier is capped at 5 jobs/day per network (IP)
- [ ] A visible notice explains that the free tier uses Google's free API and that prompts may be used by Google to improve its services
- [ ] The notice also warns that the free quota may be rate-limited

### US-041: Understand and Hit the Free Quota
**As a** free-tier user, **I want to** see how many jobs I have left and be guided when I run out, **so that** I know what to do next.

**Acceptance Criteria:**
- [ ] A quota countdown shows remaining free jobs today (e.g., "2 of 5 free jobs remaining today")
- [ ] The 6th job in a day is blocked with a clear "daily limit reached" state
- [ ] A request-an-account screen shows the contact email `hanif.isya.annafi-2024@fst.unair.ac.id`
- [ ] The screen explains that there is no self-registration and that accounts are granted by request

### US-042: Sign In to the Account Tier
**As an** approved user, **I want to** sign in with the shared credentials, **so that** I can use the faster, Google-free engine.

**Acceptance Criteria:**
- [ ] A login modal accepts a shared username and password
- [ ] Wrong credentials show a single generic error (no user enumeration)
- [ ] On success, the Navbar badge switches from `Free · Gemini` to `Account · DeepSeek`
- [ ] A "Sign out" control returns the user to the free tier
- [ ] The tier token persists across reloads (HttpOnly cookie + `localStorage` fallback) for 30 days

### US-043: Process on the Account Tier
**As a** signed-in user, **I want** my documents processed on DeepSeek, **so that** they are not sent to Google.

**Acceptance Criteria:**
- [ ] Account-tier jobs run on DeepSeek with zero Google calls (no Gemini extraction or embeddings)
- [ ] If DeepSeek fails, the job falls back to the local heuristic engine only — never to Google
- [ ] Extracted fields show a `DeepSeek` engine badge
- [ ] Account tier has a much higher daily cap than the free tier

### US-044: Review Tier Privacy Honestly
**As a** privacy-conscious user, **I want** the Help guide to explain both tiers, **so that** I can choose the right one.

**Acceptance Criteria:**
- [ ] The Help privacy tab explains free tier (Google Gemini free API) and account tier (DeepSeek) separately
- [ ] DeepSeek retention/training wording stays generic until verified in writing
- [ ] Both tiers are stated to apply Selective PII Masking
- [ ] The guide clarifies that "browser-local history" means storage, not processing

---

## Domain-Specific User Story Examples

These illustrate how different professionals would use TemplaFill:

### Legal
> **As a** paralegal, **I want to** upload a 200-page court filing (PDF) and my firm's case summary template (.docx), **so that** TemplaFill extracts case number, parties, dates, charges, and relevant facts into the template automatically.

### HR / Recruitment
> **As a** recruiter, **I want to** upload a candidate's CV (PDF) and an offer letter template (.docx), **so that** TemplaFill fills in the candidate's name, position applied for, education, experience, and start date automatically.

### Finance
> **As an** accountant, **I want to** upload a financial statement PDF and a quarterly report template (.xlsx), **so that** TemplaFill extracts revenue figures, expenses, net income, and key ratios into the correct spreadsheet cells.

### Education
> **As a** university administrator, **I want to** upload a student's transcript PDF and a graduation certificate template (.docx), **so that** TemplaFill fills in the student's name, student ID, program, GPA, and graduation date.

### Government
> **As a** government clerk, **I want to** upload a citizen's application documents (PDF) and a processing form template (.docx), **so that** TemplaFill fills in personal details, document numbers, and dates into the standard form.
