# LeadX Pro AI — Master Implementation Prompt Guide
> Structured step-by-step prompts for an AI coding agent to implement all missing features from the Gap Analysis.

---

## HOW TO USE THIS GUIDE
Each section below is a self-contained prompt. Feed them to your AI agent **one at a time**, in order. Wait for the agent to complete and confirm each step before proceeding to the next. Each prompt includes: context, exact instructions, file targets, and a done-check.

---

## PHASE 1 — DATABASE & DATA MANAGEMENT

### Step 1.1 — Add Unique Constraints to `scraped_companies`

```
CONTEXT:
- Stack: Node.js + TypeScript backend, MySQL 8.0+
- File to modify: apps/backend/src/database/migrations/ (create new migration file)
- The scraped_companies table currently has no UNIQUE constraint on email or website per job

TASK:
Create a new MySQL migration file named `003_add_unique_constraints.sql` inside apps/backend/src/database/migrations/. Write the following changes:

1. Add a composite UNIQUE constraint on (job_id, email) in scraped_companies — skip if email is NULL.
2. Add a composite UNIQUE constraint on (job_id, website) in scraped_companies — skip if website is NULL.
3. Use ALTER TABLE with IF NOT EXISTS guard so it is safe to re-run.
4. Also update the backend bulk-insert logic in apps/backend/src/services/scraping/pipeline.ts to use INSERT IGNORE or ON DUPLICATE KEY UPDATE instead of plain INSERT to gracefully handle duplicates at the app level as well.

DONE CHECK:
- Migration file exists and is valid SQL.
- pipeline.ts uses INSERT IGNORE or ON DUPLICATE KEY UPDATE for bulk company inserts.
- Running the migration twice does not throw errors.
```

---

### Step 1.2 — Automated MySQL Backup Script

```
CONTEXT:
- Stack: Node.js backend, MySQL 8.0+, deployed on Linux
- No backup mechanism currently exists

TASK:
Create the file apps/backend/scripts/backup-db.sh:

1. Read DB credentials from environment variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
2. Generate a timestamped dump file: backups/leadx_YYYY-MM-DD_HH-MM.sql.gz using mysqldump piped to gzip.
3. Retain only the last 7 backup files; delete older ones automatically.
4. Log success or failure with a timestamp to backups/backup.log.

Then create apps/backend/scripts/setup-cron.sh that registers the backup script as a daily cron job at 2:00 AM using `crontab -l | { cat; echo "..."; } | crontab -`.

Also add an npm script to package.json: `"db:backup": "bash apps/backend/scripts/backup-db.sh"`.

DONE CHECK:
- backup-db.sh runs without errors when DB credentials are set.
- Running it twice creates two timestamped files and deletes none (since < 7 exist).
- npm run db:backup works.
```

---

## PHASE 2 — AI FEATURES (Highest Priority)

### Step 2.1 — Install AI Dependencies & Environment Setup

```
CONTEXT:
- Stack: Node.js TypeScript monorepo (NPM Workspaces)
- No AI/LLM integration exists yet
- Use OpenAI SDK (compatible with OpenAI and Gemini via OpenAI-compatible endpoints)

TASK:
In apps/backend/:

1. Run: npm install openai
2. Add to apps/backend/src/config/env.ts (or wherever env vars are validated with Zod):
   - OPENAI_API_KEY: z.string().min(1)
   - AI_MODEL: z.string().default("gpt-4o-mini")
   - AI_ENABLED: z.boolean().default(false)  ← feature flag so it is off until configured

3. Create the file apps/backend/src/services/ai/aiClient.ts:
   - Export a singleton OpenAI client initialized from env config.
   - Export a helper: isAIEnabled(): boolean

4. Add OPENAI_API_KEY= and AI_ENABLED=false to .env.example with a comment explaining where to get the key.

DONE CHECK:
- npm install completes without errors.
- aiClient.ts exports the client and isAIEnabled.
- TypeScript compiles without errors.
```

---

### Step 2.2 — AI Summary & Cold Email Draft Generation

```
CONTEXT:
- File: apps/backend/src/services/ai/leadEnrichment.ts (create new)
- Database table: scraped_companies has columns ai_summary (TEXT) and cold_email_draft (TEXT) — add them via migration if missing
- The scraped_companies record contains: name, email, website, phone, industry, description, location

TASK:
1. Create migration 004_add_ai_columns.sql:
   ALTER TABLE scraped_companies
     ADD COLUMN IF NOT EXISTS ai_summary TEXT NULL,
     ADD COLUMN IF NOT EXISTS cold_email_draft TEXT NULL,
     ADD COLUMN IF NOT EXISTS ai_enriched_at TIMESTAMP NULL;

2. Create apps/backend/src/services/ai/leadEnrichment.ts with two exported async functions:

   a) generateLeadSummary(company: ScrapedCompany): Promise<string>
      - Prompt: "You are a B2B sales analyst. Given the following business data, write a 2-3 sentence professional summary suitable for a salesperson to read before reaching out. Be factual and concise. Data: {JSON.stringify(company)}"
      - Model: env.AI_MODEL, max_tokens: 200
      - Return the summary text.

   b) generateColdEmail(company: ScrapedCompany, senderName: string): Promise<string>
      - Prompt: "Write a short, personalized cold outreach email (under 120 words) from {senderName} to the business {company.name}. Reference their industry ({company.industry}) and website ({company.website}). Be genuine, not pushy. Include a clear CTA. Do not use placeholders."
      - Model: env.AI_MODEL, max_tokens: 300
      - Return the email text.

3. Both functions must: check isAIEnabled() first and throw an AppError("AI features are not enabled") if false; handle OpenAI API errors gracefully and rethrow as AppError.

4. Create apps/backend/src/workers/aiEnrichmentWorker.ts:
   - Register a new BullMQ queue named "ai-enrichment".
   - Worker processes jobs with payload { companyId: number, senderName: string }.
   - Fetches company from DB, calls both functions, updates the DB record, sets ai_enriched_at = NOW().

DONE CHECK:
- Migration applies cleanly.
- Both functions are exported and typed correctly.
- Worker registers without errors on startup.
- TypeScript compiles.
```

---

### Step 2.3 — Auto-Tagging & Lead Prioritization

```
CONTEXT:
- File: apps/backend/src/services/ai/autoTagging.ts (create new)
- scraped_companies table needs: tags JSON NULL, lead_priority ENUM('hot','warm','cold') DEFAULT 'cold'
- Add via migration 005_add_tags_priority.sql

TASK:
1. Create migration 005_add_tags_priority.sql:
   ALTER TABLE scraped_companies
     ADD COLUMN IF NOT EXISTS tags JSON NULL,
     ADD COLUMN IF NOT EXISTS lead_priority ENUM('hot','warm','cold') DEFAULT 'cold';

2. Create apps/backend/src/services/ai/autoTagging.ts:

   Export: classifyLead(company: ScrapedCompany): Promise<{ tags: string[], priority: 'hot' | 'warm' | 'cold' }>

   Prompt the AI with: "Analyze this B2B lead and return ONLY valid JSON (no markdown) with two fields:
   1. tags: array of up to 5 lowercase category strings (e.g. 'saas', 'ecommerce', 'healthcare', 'smb', 'enterprise')
   2. priority: one of 'hot', 'warm', or 'cold' based on data completeness, industry value, and presence of verified email/phone.
   Lead data: {JSON.stringify(company)}"

   Parse the JSON response. If parsing fails, return { tags: [], priority: 'cold' }.

3. Wire this into aiEnrichmentWorker.ts from Step 2.2 — after generating summary and email, also call classifyLead and save tags + lead_priority to DB.

4. Update the Leads.tsx filtering UI:
   - Add a "Priority" filter dropdown: All / Hot / Warm / Cold using the existing filter pattern.
   - Add colored priority badges in the leads table: Hot = red, Warm = amber, Cold = blue.

DONE CHECK:
- Migration applies cleanly.
- classifyLead returns valid typed output.
- Priority badges render in the leads table.
- TypeScript compiles.
```

---

### Step 2.4 — AI Panel in Lead Preview UI

```
CONTEXT:
- Frontend: apps/frontend/src/components/ (React + Tailwind + Radix UI)
- The lead detail panel (or modal) needs an AI section

TASK:
In the lead detail/preview component (LeadPreviewPanel.tsx or similar):

1. Add an "AI Insights" collapsible section at the bottom using Radix UI Accordion.

2. Section contains:
   a) "Summary" tab: displays ai_summary text or a "Generate Summary" button if empty.
   b) "Cold Email" tab: displays cold_email_draft in a read-only textarea with a "Copy" button.
   c) A "Re-generate" button that calls POST /api/leads/:id/ai-enrich.

3. Create the API endpoint POST /api/leads/:id/ai-enrich in apps/backend/src/routes/leads.ts:
   - Adds a job to the "ai-enrichment" BullMQ queue with { companyId: id, senderName: req.user.name }.
   - Returns { queued: true, jobId }.

4. Show a loading skeleton while enrichment is queued (poll GET /api/leads/:id every 3 seconds until ai_enriched_at is set, max 5 attempts).

DONE CHECK:
- Accordion section renders correctly.
- Generate button fires the API and shows loading state.
- Populated summary and email display correctly.
- Copy button copies cold email to clipboard.
```

---

## PHASE 3 — SCHEDULED SCRAPING (Cron Jobs)

### Step 3.1 — Database Schema for Scheduled Jobs

```
CONTEXT:
- Database: MySQL 8.0+
- scrape_jobs table exists; we need to add scheduling fields

TASK:
Create migration 006_add_scheduled_jobs.sql:

ALTER TABLE scrape_jobs
  ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS schedule_cron VARCHAR(100) NULL COMMENT 'Cron expression e.g. 0 9 * * 1',
  ADD COLUMN IF NOT EXISTS schedule_tz VARCHAR(50) DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT TRUE;

Also add index: CREATE INDEX IF NOT EXISTS idx_scheduled_jobs ON scrape_jobs(is_scheduled, next_run_at, schedule_enabled);

Update the shared TypeScript interface for ScrapeJob in packages/shared/src/types/job.ts to include these new fields.

DONE CHECK:
- Migration runs cleanly.
- TypeScript interface updated and compiles.
```

---

### Step 3.2 — Cron Scheduler Service

```
CONTEXT:
- Backend: apps/backend/src/services/
- Install: npm install node-cron (in apps/backend)

TASK:
1. Run: npm install node-cron @types/node-cron in apps/backend.

2. Create apps/backend/src/services/scheduler/jobScheduler.ts:

   a) On startup, load all scrape_jobs where is_scheduled=TRUE AND schedule_enabled=TRUE from DB.
   b) For each, register a node-cron task using schedule_cron and schedule_tz.
   c) When a cron fires: clone the job config, push a new entry to the scrapeQueue (BullMQ), update last_run_at=NOW(), calculate and update next_run_at.
   d) Export: startScheduler(), stopScheduler(), registerJob(jobId), unregisterJob(jobId).

3. Call startScheduler() in the main server startup file (apps/backend/src/index.ts or app.ts) after the DB connection is confirmed.

4. Add API endpoints in apps/backend/src/routes/jobs.ts:
   - PATCH /api/jobs/:id/schedule — body: { cron, tz, enabled }. Validates cron expression using node-cron.validate(), saves to DB, calls registerJob or unregisterJob.
   - GET /api/jobs/:id/schedule — returns schedule config and next_run_at.

DONE CHECK:
- Server starts without errors.
- node-cron.validate() rejects invalid cron strings before saving.
- Registering a job with cron "* * * * *" fires after ~1 minute in local test.
- TypeScript compiles.
```

---

### Step 3.3 — Schedule UI in Job Management

```
CONTEXT:
- Frontend: apps/frontend/src/pages/Jobs.tsx and job create/edit form
- Use existing Radix UI components and Tailwind CSS

TASK:
In the job creation/edit form:

1. Add a "Schedule" toggle (Radix UI Switch) — off by default.

2. When toggled ON, show:
   - A cron expression input field with placeholder "0 9 * * 1" (every Monday 9am).
   - A timezone selector (HTML select populated with a static list of 20 common timezones).
   - A human-readable preview label: "Runs every Monday at 9:00 AM UTC" — generate this using a simple cron-to-text function or the cronstrue library (npm install cronstrue in frontend).
   - A "Pause Schedule" toggle for already-scheduled jobs.

3. In the jobs list table, add a "Schedule" column showing:
   - A clock icon + next_run_at formatted as relative time (e.g. "in 3 hours") for scheduled jobs.
   - A dash for non-scheduled jobs.

DONE CHECK:
- Toggle shows/hides schedule fields correctly.
- Human-readable cron description updates as user types.
- Next run time displays in the jobs table.
```

---

## PHASE 4 — CRM INTEGRATIONS & WEBHOOKS

### Step 4.1 — Webhook Dispatcher

```
CONTEXT:
- Backend: apps/backend/src/services/
- webhook_secret exists in config but no webhook system is built

TASK:
1. Create migration 007_webhook_endpoints.sql:
   CREATE TABLE IF NOT EXISTS webhook_endpoints (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     url VARCHAR(500) NOT NULL,
     secret VARCHAR(100) NOT NULL,
     events JSON NOT NULL COMMENT 'e.g. ["job.completed","job.failed"]',
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );
   CREATE TABLE IF NOT EXISTS webhook_deliveries (
     id INT AUTO_INCREMENT PRIMARY KEY,
     endpoint_id INT NOT NULL,
     event VARCHAR(100) NOT NULL,
     payload JSON NOT NULL,
     status_code INT NULL,
     response_body TEXT NULL,
     delivered_at TIMESTAMP NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints(id) ON DELETE CASCADE
   );

2. Create apps/backend/src/services/webhooks/dispatcher.ts:
   - Export: dispatchWebhook(userId: number, event: string, payload: object): Promise<void>
   - Fetches all active endpoints for userId that include the event in their events array.
   - For each endpoint: POST the payload as JSON, add HMAC-SHA256 signature header X-LeadX-Signature using the endpoint's secret.
   - Log the delivery result to webhook_deliveries.
   - Retry once after 5 seconds on failure (non-2xx or network error).

3. Call dispatchWebhook in the scraping worker when a job completes or fails:
   dispatchWebhook(job.userId, 'job.completed', { jobId, leadsCount, completedAt })
   dispatchWebhook(job.userId, 'job.failed', { jobId, error, failedAt })

4. Add CRUD REST endpoints in apps/backend/src/routes/webhooks.ts:
   GET    /api/webhooks          — list user's endpoints
   POST   /api/webhooks          — create (validate URL format, generate random secret)
   DELETE /api/webhooks/:id      — delete
   GET    /api/webhooks/:id/deliveries — list recent delivery logs

DONE CHECK:
- Migrations apply cleanly.
- POST to a test URL (use https://webhook.site) receives the correct payload and signature header.
- Delivery is logged to DB.
- TypeScript compiles.
```

---

### Step 4.2 — HubSpot CRM Integration

```
CONTEXT:
- Backend: apps/backend/src/services/crm/
- Use HubSpot's REST API v3 (no SDK needed, use native fetch)
- Credentials stored per user in a new crm_connections table

TASK:
1. Create migration 008_crm_connections.sql:
   CREATE TABLE IF NOT EXISTS crm_connections (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL UNIQUE,
     provider ENUM('hubspot','zoho','salesforce') NOT NULL,
     access_token TEXT NOT NULL,
     refresh_token TEXT NULL,
     token_expires_at TIMESTAMP NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );

2. Create apps/backend/src/services/crm/hubspot.ts:
   Export: pushLeadToHubSpot(accessToken: string, company: ScrapedCompany): Promise<{ id: string }>
   - POST to https://api.hubapi.com/crm/v3/objects/contacts with Authorization: Bearer {accessToken}
   - Map fields: email → email, name → firstname (split on first space) + lastname, phone → phone, website → website
   - Return the created HubSpot contact id.
   - On 409 Conflict (already exists), update the existing contact instead (PATCH).

3. Create API endpoints in apps/backend/src/routes/crm.ts:
   POST /api/crm/hubspot/connect    — body: { accessToken }. Verify token by calling GET https://api.hubapi.com/oauth/v1/access-tokens/{token}. Save to crm_connections.
   DELETE /api/crm/hubspot/connect  — removes connection
   POST /api/crm/export/hubspot     — body: { leadIds: number[] }. Pushes each lead. Returns { success: number, failed: number, errors: [] }.

DONE CHECK:
- pushLeadToHubSpot correctly creates a contact in a HubSpot sandbox account.
- 409 conflict is handled without crashing.
- Bulk export endpoint returns a results summary.
- TypeScript compiles.
```

---

## PHASE 5 — PERFORMANCE: API CACHING

### Step 5.1 — Redis Caching for Dashboard & Metadata Endpoints

```
CONTEXT:
- Redis is already running (used by BullMQ)
- Backend uses the ioredis or redis npm package
- Target heavy endpoints: GET /api/dashboard/stats, GET /api/leads/metadata (industry list, etc.)

TASK:
1. Create apps/backend/src/utils/cache.ts:
   - Export: getCache<T>(key: string): Promise<T | null>
   - Export: setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void>
   - Export: invalidateCache(pattern: string): Promise<void> — use Redis SCAN + DEL
   - Use the existing Redis connection from the BullMQ setup (do not create a new connection).

2. Wrap these endpoints with caching:
   - GET /api/dashboard/stats → cache key "dashboard:stats:{userId}", TTL 60 seconds
   - GET /api/leads/metadata  → cache key "leads:metadata:{userId}", TTL 300 seconds

3. Invalidate cache on relevant mutations:
   - When a scrape job completes: invalidate "dashboard:stats:{userId}"
   - When a lead is deleted/updated: invalidate "leads:metadata:{userId}"

4. Add a cache hit/miss header to responses for observability: X-Cache: HIT or X-Cache: MISS

DONE CHECK:
- Second request to /api/dashboard/stats is noticeably faster and returns X-Cache: HIT.
- Cache invalidates after a job completes.
- TypeScript compiles.
```

---

## PHASE 6 — DATA ENRICHMENT

### Step 6.1 — Google Places API Enrichment

```
CONTEXT:
- Backend: apps/backend/src/services/enrichment/
- Google Places API (New) is free-tier friendly for low volume
- scraped_companies needs: google_place_id VARCHAR(255), google_rating DECIMAL(2,1), google_review_count INT, enriched_at TIMESTAMP

TASK:
1. Create migration 009_enrichment_fields.sql:
   ALTER TABLE scraped_companies
     ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255) NULL,
     ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1) NULL,
     ADD COLUMN IF NOT EXISTS google_review_count INT NULL,
     ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP NULL;

2. Add to env config: GOOGLE_PLACES_API_KEY: z.string().optional()

3. Create apps/backend/src/services/enrichment/googlePlaces.ts:
   Export: enrichWithGooglePlaces(company: ScrapedCompany): Promise<Partial<ScrapedCompany>>
   - Call: GET https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input={company.name} {company.location}&inputtype=textquery&fields=place_id,rating,user_ratings_total&key={API_KEY}
   - If a match is found with confidence, return { google_place_id, google_rating, google_review_count, enriched_at: new Date() }
   - If no match or API key missing, return {} silently (do not throw).

4. Create BullMQ queue "enrichment" and worker in apps/backend/src/workers/enrichmentWorker.ts:
   - Process jobs with payload { companyId: number }
   - Fetch company, call enrichWithGooglePlaces, update DB record.

5. Add API endpoint POST /api/leads/:id/enrich — queues an enrichment job, returns { queued: true }.

DONE CHECK:
- Calling enrich for "Starbucks New York" returns a valid place_id and rating.
- Worker updates the DB record.
- Missing API key does not crash the server.
```

---

## PHASE 7 — UI IMPROVEMENTS

### Step 7.1 — Lead Preview Panel (Slide-Out)

```
CONTEXT:
- Frontend: apps/frontend/src/components/leads/
- Use Radix UI Sheet (slide-out panel) — already installed
- Currently no deep-dive view for a single lead

TASK:
Create apps/frontend/src/components/leads/LeadPreviewPanel.tsx:

1. A Radix UI Sheet that opens from the right side when a table row is clicked.
   Width: 480px on desktop, full-width on mobile.

2. Panel sections (top to bottom):
   a) Header: company name (h2), verification status badge, confidence score progress bar.
   b) Contact Info: email (with mailto link), phone (with tel link), website (with external link icon).
   c) Social Links: LinkedIn, Facebook, Twitter icons — clickable if present, grayed if missing.
   d) Metadata: industry tag, location, scraped date, source URL.
   e) AI Insights: (from Step 2.4) — accordion with Summary and Cold Email tabs.
   f) Actions row: "Export This Lead" button, "Push to HubSpot" button (if CRM connected), "Delete" button.

3. Wire it up in apps/frontend/src/pages/Leads.tsx:
   - Add onClick to each table row: setSelectedLead(company); setPreviewOpen(true)
   - Pass selectedLead and open state to LeadPreviewPanel.

DONE CHECK:
- Clicking a row opens the panel with correct data.
- Panel closes on Escape key and overlay click.
- All sections render without layout overflow.
- Panel works on mobile (full-width).
```

---

### Step 7.2 — Saved Searches UI

```
CONTEXT:
- Frontend: apps/frontend/src/pages/Leads.tsx
- Backend: saved_searches table already exists in DB
- API endpoints for saved searches may or may not exist — check first

TASK:
1. If not already present, add to apps/backend/src/routes/savedSearches.ts:
   GET    /api/saved-searches         — list user's saved searches
   POST   /api/saved-searches         — body: { name, filters } — save current filters
   DELETE /api/saved-searches/:id     — delete

2. In the Leads page filter bar, add:
   a) A "Save Search" button — opens a small popover/dialog asking for a name, then POSTs to the API.
   b) A "Saved Searches" dropdown — lists saved searches; clicking one applies all filters instantly.
   c) An "x" icon next to each saved search to delete it.

3. Use React Query (already installed) for all three endpoints — with automatic cache invalidation on create/delete.

DONE CHECK:
- Saving a filter set, navigating away, and returning restores filters from the saved search.
- Deleting a saved search removes it from the dropdown immediately.
- Empty state shown when no saved searches exist.
```

---

## PHASE 8 — PROXY MANAGEMENT

### Step 8.1 — Proxy Pool & Rotation

```
CONTEXT:
- Backend: apps/backend/src/services/scraping/
- proxyEnabled flag already exists in job config types
- No actual proxy rotation logic is implemented

TASK:
1. Create migration 010_proxy_pool.sql:
   CREATE TABLE IF NOT EXISTS proxy_pool (
     id INT AUTO_INCREMENT PRIMARY KEY,
     host VARCHAR(255) NOT NULL,
     port INT NOT NULL,
     username VARCHAR(100) NULL,
     password VARCHAR(100) NULL,
     type ENUM('http','https','socks5') DEFAULT 'http',
     is_active BOOLEAN DEFAULT TRUE,
     fail_count INT DEFAULT 0,
     last_used_at TIMESTAMP NULL,
     last_checked_at TIMESTAMP NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

2. Create apps/backend/src/services/scraping/proxyManager.ts:
   - Export: getNextProxy(): Promise<ProxyConfig | null>
     Uses round-robin selection from active proxies (is_active=TRUE, fail_count < 3).
     Updates last_used_at on selection.
   - Export: markProxyFailed(proxyId: number): Promise<void>
     Increments fail_count; if >= 3, sets is_active=FALSE.
   - Export: markProxySuccess(proxyId: number): Promise<void>
     Resets fail_count to 0.

3. Update the scraping engine (scraper.ts or browser.ts) to:
   - If job.proxyEnabled=TRUE and a proxy is available, pass proxy settings to Puppeteer/Playwright launch args.
   - On request failure, call markProxyFailed; on success, call markProxySuccess.

4. Add admin-only REST endpoints:
   GET    /api/admin/proxies        — list all proxies
   POST   /api/admin/proxies        — add proxy
   DELETE /api/admin/proxies/:id    — remove proxy
   POST   /api/admin/proxies/test   — test a proxy URL, return { ok: boolean, latencyMs: number }

DONE CHECK:
- getNextProxy returns proxies in round-robin order across multiple calls.
- A proxy with fail_count >= 3 is excluded from rotation.
- Scraping job with proxyEnabled=true picks up a proxy from the pool.
- TypeScript compiles.
```

---

## FINAL PHASE — AUTO-PRUNING BACKGROUND JOB

### Step 9.1 — Auto-Prune Invalid/Spam Leads

```
CONTEXT:
- Backend: BullMQ already configured
- Invalid or spam leads accumulate over time with no cleanup

TASK:
1. Add to config: LEAD_RETENTION_DAYS=30 (default 30 — number of days to keep invalid leads)

2. Create apps/backend/src/workers/pruningWorker.ts:
   - Register a BullMQ repeatable job "prune-invalid-leads" with cron: "0 3 * * *" (3 AM daily).
   - Job logic:
     a) DELETE FROM scraped_companies WHERE verification_status IN ('invalid','spam') AND created_at < NOW() - INTERVAL {LEAD_RETENTION_DAYS} DAY
     b) Log: how many rows deleted, timestamp.
     c) Also soft-archive exports older than 90 days: UPDATE exports SET status='archived' WHERE created_at < NOW() - INTERVAL 90 DAY AND status='completed'

3. Register this worker in apps/backend/src/index.ts alongside other workers.

4. Add an admin endpoint GET /api/admin/pruning/preview:
   Returns { invalidLeadsToDelete: number, exportsToArchive: number } — a dry-run count WITHOUT deleting.

DONE CHECK:
- Worker registers and runs the repeatable job schedule without errors.
- Preview endpoint returns accurate counts.
- Deletion query is confirmed with a manual test using a short retention period (e.g. 0 days).
- TypeScript compiles.
```

---

## IMPLEMENTATION ORDER SUMMARY

| Phase | Step | Feature | Priority |
|-------|------|---------|----------|
| 2 | 2.1–2.4 | AI Features (Summary, Email, Tags) | 🔴 Highest |
| 3 | 3.1–3.3 | Scheduled/Cron Scraping | 🔴 High |
| 4 | 4.1–4.2 | Webhooks & HubSpot CRM | 🟠 High |
| 7 | 7.1–7.2 | Lead Preview Panel & Saved Searches | 🟠 High |
| 5 | 5.1 | Redis API Caching | 🟡 Medium |
| 6 | 6.1 | Google Places Enrichment | 🟡 Medium |
| 1 | 1.1–1.2 | DB Constraints & Backup | 🟡 Medium |
| 8 | 8.1 | Proxy Pool & Rotation | 🟢 Low |
| 9 | 9.1 | Auto-Pruning | 🟢 Low |

---

*LeadX Pro AI — Gap Implementation Guide v1.0*
