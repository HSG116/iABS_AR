-- Social Media Management Database Schema
-- Created for iABS Social Media Admin Dashboard

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS iabs_social;
USE iabs_social;

-- Social Media Platforms Table
CREATE TABLE IF NOT EXISTS social_platforms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    platform_name VARCHAR(50) NOT NULL UNIQUE,
    platform_key VARCHAR(20) NOT NULL UNIQUE,
    icon_name VARCHAR(50),
    color_hex VARCHAR(7),
    profile_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Social Media Stats Table
CREATE TABLE IF NOT EXISTS social_media_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    platform_id INT NOT NULL,
    follower_count BIGINT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (platform_id) REFERENCES social_platforms(id) ON DELETE CASCADE,
    INDEX idx_platform_updated (platform_id, last_updated)
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('super_admin', 'admin', 'editor') DEFAULT 'editor',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Update History Log Table
CREATE TABLE IF NOT EXISTS update_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    platform_id INT NOT NULL,
    old_count BIGINT,
    new_count BIGINT NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    update_source ENUM('manual', 'api', 'automatic') DEFAULT 'manual',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (platform_id) REFERENCES social_platforms(id) ON DELETE CASCADE,
    INDEX idx_platform_date (platform_id, created_at)
);

-- Insert default social media platforms
INSERT IGNORE INTO social_platforms (platform_name, platform_key, icon_name, color_hex, profile_url) VALUES
('Instagram', 'instagram', 'InstagramIcon', '#E1306C', 'https://www.instagram.com/absq/'),
('TikTok', 'tiktok', 'TikTokIcon', '#FE2C55', 'https://www.tiktok.com/@iabsq'),
('X', 'x', 'XIcon', '#000000', 'https://x.com/iABSq'),
('WhatsApp', 'whatsapp', 'WhatsAppIcon', '#25D366', 'https://www.whatsapp.com/channel/0029VadbqYx5Ui2eInkr7v2E'),
('Snapchat', 'snapchat', 'SnapchatIcon', '#FFFC00', 'https://www.snapchat.com/@iabsq'),
('Discord', 'discord', 'DiscordIcon', '#5865F2', 'https://discord.com/invite/64aggJ9yRA'),
('YouTube', 'youtube', 'YoutubeIcon', '#FF0000', 'https://www.youtube.com/channel/UCdIM7MB-8G-FgE7ld3XAQ8w'),
('Kick', 'kick', 'KickIcon', '#53FC18', 'https://kick.com/iabs');

-- Insert initial stats with current values
INSERT IGNORE INTO social_media_stats (platform_id, follower_count, updated_by) VALUES
((SELECT id FROM social_platforms WHERE platform_key = 'instagram'), 25000, 'admin'),
((SELECT id FROM social_platforms WHERE platform_key = 'tiktok'), 35000, 'admin'),
((SELECT id FROM social_platforms WHERE platform_key = 'x'), 75000, 'admin'),
((SELECT id FROM social_platforms WHERE platform_key = 'whatsapp'), 9100, 'admin'),
((SELECT id FROM social_platforms WHERE platform_key = 'snapchat'), 1200000, 'admin'),
((SELECT id FROM social_platforms WHERE platform_key = 'discord'), 9000, 'admin'),
((SELECT id FROM social_platforms WHERE platform_key = 'youtube'), 37000, 'admin'),
((SELECT id FROM social_platforms WHERE platform_key = 'kick'), 110000, 'admin');

-- Create default admin user (password: admin123)
INSERT IGNORE INTO admin_users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@iabs.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super Admin', 'super_admin');

-- Create view for current stats with platform info
CREATE VIEW current_social_stats AS
SELECT 
    p.id,
    p.platform_name,
    p.platform_key,
    p.icon_name,
    p.color_hex,
    p.profile_url,
    s.follower_count,
    s.last_updated,
    s.updated_by,
    s.is_active
FROM social_platforms p
LEFT JOIN social_media_stats s ON p.id = s.platform_id
WHERE s.is_active = TRUE OR s.is_active IS NULL
ORDER BY p.platform_name;

-- Create view for update history with platform info
CREATE VIEW update_history_view AS
SELECT 
    h.id,
    p.platform_name,
    p.platform_key,
    h.old_count,
    h.new_count,
    h.updated_by,
    h.update_source,
    h.notes,
    h.created_at
FROM update_history h
JOIN social_platforms p ON h.platform_id = p.id
ORDER BY h.created_at DESC;
