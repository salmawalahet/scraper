-- ============================================
-- Migration: Add Scheduled Jobs Columns
-- ============================================

ALTER TABLE scrape_jobs
  ADD COLUMN is_scheduled BOOLEAN DEFAULT FALSE,
  ADD COLUMN schedule_cron VARCHAR(100) NULL COMMENT 'Cron expression e.g. 0 9 * * 1',
  ADD COLUMN schedule_tz VARCHAR(50) DEFAULT 'UTC',
  ADD COLUMN next_run_at TIMESTAMP NULL,
  ADD COLUMN last_run_at TIMESTAMP NULL,
  ADD COLUMN schedule_enabled BOOLEAN DEFAULT TRUE;

CREATE INDEX idx_scheduled_jobs ON scrape_jobs(is_scheduled, next_run_at, schedule_enabled);
