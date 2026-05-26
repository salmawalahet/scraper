-- ============================================
-- Migration 003: Add Unique Constraints to scraped_companies
-- Purpose: Prevent duplicate leads within the same scrape job
-- Safe to re-run: Uses DROP IF EXISTS + CREATE pattern
-- ============================================

-- NOTE: MySQL does not support UNIQUE constraints that skip NULLs
-- natively on composite keys the way PostgreSQL does. However,
-- MySQL's UNIQUE index DOES allow multiple NULL values by default
-- (as per SQL standard). So (job_id, NULL) will NOT conflict with
-- another (job_id, NULL). This is exactly the behavior we want:
--   - Two leads in the same job with email=NULL → allowed
--   - Two leads in the same job with email='a@b.com' → blocked

-- Step 1: Remove existing duplicate emails within the same job
-- (keep the one with the highest confidence_score, or the earliest created)
-- This ensures the ALTER TABLE does not fail on pre-existing duplicates.
DELETE sc1 FROM scraped_companies sc1
INNER JOIN scraped_companies sc2
ON sc1.job_id = sc2.job_id
  AND sc1.email = sc2.email
  AND sc1.email IS NOT NULL
  AND (
    sc1.confidence_score < sc2.confidence_score
    OR (sc1.confidence_score = sc2.confidence_score AND sc1.id > sc2.id)
  );

-- Step 2: Remove existing duplicate websites within the same job
DELETE sc1 FROM scraped_companies sc1
INNER JOIN scraped_companies sc2
ON sc1.job_id = sc2.job_id
  AND sc1.website = sc2.website
  AND sc1.website IS NOT NULL
  AND (
    sc1.confidence_score < sc2.confidence_score
    OR (sc1.confidence_score = sc2.confidence_score AND sc1.id > sc2.id)
  );

-- Step 3: Add composite UNIQUE constraint on (job_id, email)
-- DROP first to make this migration idempotent
SET @constraint_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'scraped_companies'
    AND INDEX_NAME = 'uq_companies_job_email'
);

SET @drop_sql = IF(@constraint_exists > 0,
  'ALTER TABLE scraped_companies DROP INDEX uq_companies_job_email',
  'SELECT 1'
);
PREPARE stmt FROM @drop_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE scraped_companies
  ADD UNIQUE INDEX uq_companies_job_email (job_id, email);

-- Step 4: Add composite UNIQUE constraint on (job_id, website)
SET @constraint_exists2 = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'scraped_companies'
    AND INDEX_NAME = 'uq_companies_job_website'
);

SET @drop_sql2 = IF(@constraint_exists2 > 0,
  'ALTER TABLE scraped_companies DROP INDEX uq_companies_job_website',
  'SELECT 1'
);
PREPARE stmt2 FROM @drop_sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

ALTER TABLE scraped_companies
  ADD UNIQUE INDEX uq_companies_job_website (job_id, website(255));

-- ============================================
-- Verification: Show the new indexes
-- ============================================
SHOW INDEX FROM scraped_companies WHERE Key_name LIKE 'uq_%';
