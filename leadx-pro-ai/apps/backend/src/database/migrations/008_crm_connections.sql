-- Migration 008: CRM Connections
-- ================================================

CREATE TABLE IF NOT EXISTS crm_connections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  provider ENUM('hubspot','zoho','salesforce') NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NULL,
  token_expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
