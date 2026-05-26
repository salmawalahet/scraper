-- ============================================
-- LeadX Pro AI - Seed Data
-- ============================================

USE leadx_pro_ai;

-- Admin user (password: admin123)
-- bcrypt hash for 'admin123'
INSERT INTO users (email, password_hash, name, role, is_active) VALUES
  ('admin@leadxpro.ai', '$2a$12$T782ELx5Tf3bom4oIMzA2.IywfXZ4bUWOum9H3J4foQehu5JOsyZ2', 'Admin User', 'admin', TRUE)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name);

-- Demo user (password: admin123)
INSERT INTO users (email, password_hash, name, role, is_active) VALUES
  ('demo@leadxpro.ai', '$2a$12$T782ELx5Tf3bom4oIMzA2.IywfXZ4bUWOum9H3J4foQehu5JOsyZ2', 'Demo User', 'user', TRUE)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name);
