-- ============================================
-- LeadX Pro AI - Complete Database Schema
-- MySQL 8.0+
-- ============================================

CREATE DATABASE IF NOT EXISTS leadx_pro_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE leadx_pro_ai;

-- ============================================
-- 1. Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  refresh_token TEXT NULL,
  last_login DATETIME NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,

  UNIQUE INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_is_active (is_active),
  INDEX idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB;

-- ============================================
-- 2. Scrape Jobs Table
-- ============================================
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(500) NOT NULL,
  target_url TEXT NOT NULL,
  search_query VARCHAR(1000) NULL,
  status ENUM('pending', 'running', 'paused', 'completed', 'failed', 'cancelled', 'retrying') NOT NULL DEFAULT 'pending',
  total_found INT UNSIGNED NOT NULL DEFAULT 0,
  total_verified INT UNSIGNED NOT NULL DEFAULT 0,
  config JSON NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,

  INDEX idx_jobs_user_status (user_id, status),
  INDEX idx_jobs_status (status),
  INDEX idx_jobs_created_at (created_at),
  INDEX idx_jobs_deleted_at (deleted_at),
  CONSTRAINT fk_jobs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- 3. Scraped Companies Table
-- ============================================
CREATE TABLE IF NOT EXISTS scraped_companies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id INT UNSIGNED NOT NULL,
  company_name VARCHAR(500) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  whatsapp VARCHAR(50) NULL,
  website VARCHAR(2048) NULL,
  linkedin VARCHAR(2048) NULL,
  facebook VARCHAR(2048) NULL,
  address TEXT NULL,
  category VARCHAR(255) NULL,
  company_size ENUM('1-10', '11-50', '51-200', '201-1000', '1000+', 'unknown') NOT NULL DEFAULT 'unknown',
  source_url VARCHAR(2048) NOT NULL,
  verification_status ENUM('verified', 'unverified', 'invalid', 'pending') NOT NULL DEFAULT 'pending',
  confidence_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
  website_status ENUM('active', 'inactive', 'unreachable', 'unknown') NOT NULL DEFAULT 'unknown',
  lead_priority ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'low',
  tags JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,

  INDEX idx_companies_job_id (job_id),
  INDEX idx_companies_job_verification (job_id, verification_status),
  INDEX idx_companies_email (email),
  INDEX idx_companies_phone (phone),
  INDEX idx_companies_confidence (confidence_score),
  INDEX idx_companies_category (category),
  INDEX idx_companies_lead_priority (lead_priority),
  INDEX idx_companies_website_status (website_status),
  INDEX idx_companies_verification_status (verification_status),
  INDEX idx_companies_deleted_at (deleted_at),
  INDEX idx_companies_created_at (created_at),
  FULLTEXT INDEX ft_companies_search (company_name, address),
  CONSTRAINT fk_companies_job FOREIGN KEY (job_id) REFERENCES scrape_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- 4. Exports Table
-- ============================================
CREATE TABLE IF NOT EXISTS exports (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  job_id INT UNSIGNED NULL,
  format ENUM('csv', 'excel', 'json') NOT NULL DEFAULT 'csv',
  file_path VARCHAR(1024) NULL,
  file_size BIGINT UNSIGNED NULL,
  total_records INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  download_count INT UNSIGNED NOT NULL DEFAULT 0,
  filters JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,

  INDEX idx_exports_user_id (user_id),
  INDEX idx_exports_status (status),
  INDEX idx_exports_created_at (created_at),
  INDEX idx_exports_deleted_at (deleted_at),
  CONSTRAINT fk_exports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_exports_job FOREIGN KEY (job_id) REFERENCES scrape_jobs(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- 5. Scrape History Table
-- ============================================
CREATE TABLE IF NOT EXISTS scrape_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  action VARCHAR(255) NOT NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_history_job_id (job_id),
  INDEX idx_history_user_id (user_id),
  INDEX idx_history_created_at (created_at),
  CONSTRAINT fk_history_job FOREIGN KEY (job_id) REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- 6. Saved Searches Table
-- ============================================
CREATE TABLE IF NOT EXISTS saved_searches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  filters JSON NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,

  INDEX idx_saved_searches_user (user_id),
  INDEX idx_saved_searches_deleted_at (deleted_at),
  CONSTRAINT fk_saved_searches_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- 7. Activity Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  action VARCHAR(255) NOT NULL,
  entity_type ENUM('user', 'job', 'lead', 'export', 'integration') NOT NULL,
  entity_id INT UNSIGNED NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_activity_user_created (user_id, created_at),
  INDEX idx_activity_action (action),
  INDEX idx_activity_entity (entity_type, entity_id),
  INDEX idx_activity_created_at (created_at),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- 8. Job Results Table
-- ============================================
CREATE TABLE IF NOT EXISTS job_results (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id INT UNSIGNED NOT NULL,
  url VARCHAR(2048) NOT NULL,
  status ENUM('success', 'failed', 'skipped') NOT NULL DEFAULT 'success',
  raw_data JSON NULL,
  processed_data JSON NULL,
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_results_job_id (job_id),
  INDEX idx_results_status (status),
  INDEX idx_results_job_status (job_id, status),
  CONSTRAINT fk_results_job FOREIGN KEY (job_id) REFERENCES scrape_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB;
