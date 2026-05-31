-- ============================================================
-- Migration: 004_add_ai_columns
-- Description: Add columns for AI enrichment features
-- ============================================================

USE leadx_pro_ai;

ALTER TABLE scraped_companies
  ADD COLUMN ai_summary TEXT NULL,
  ADD COLUMN cold_email_draft TEXT NULL,
  ADD COLUMN ai_enriched_at DATETIME NULL;
