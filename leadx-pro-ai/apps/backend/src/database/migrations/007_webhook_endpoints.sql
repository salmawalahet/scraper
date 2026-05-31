-- Migration 007: Webhook Endpoints & Deliveries
-- ================================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(100) NOT NULL,
  events JSON NOT NULL COMMENT 'e.g. ["job.completed","job.failed"]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  endpoint_id INT UNSIGNED NOT NULL,
  event VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  status_code INT NULL,
  response_body TEXT NULL,
  delivered_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints(id) ON DELETE CASCADE
);
