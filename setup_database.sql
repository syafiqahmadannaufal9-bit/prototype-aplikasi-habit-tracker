-- ==============================================================================
-- HabitFlow — SETUP DATABASE LENGKAP
-- Jalankan file ini di phpMyAdmin Laragon
-- Database: habit_tracker
-- ==============================================================================

-- 1. Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS habit_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE habit_tracker;

-- ==============================================================================
-- 2. PENGAMANAN & PEMBERSIHAN (Bebas Error Foreign Key)
-- ==============================================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `password_resets`;
DROP TABLE IF EXISTS `progress_logs`;
DROP TABLE IF EXISTS `habit_logs`;
DROP TABLE IF EXISTS `habits`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `app_feedback`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 3. PEMBUATAN STRUKTUR TABEL BARU
-- ==============================================================================

-- [A] Tabel Users (ID Otomatis Berurutan 4 Digit: 0001, 0002, dst.)
CREATE TABLE `users` (
  `id` INT(4) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [B] Tabel Password Resets
CREATE TABLE `password_resets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(4) UNSIGNED ZEROFILL NOT NULL COMMENT 'Relasi ke id di tabel users',
  `token` VARCHAR(255) NOT NULL COMMENT 'Token unik reset password',
  `expires_at` DATETIME NOT NULL COMMENT 'Masa kadaluarsa token pengaman',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token` (`token`),
  KEY `fk_reset_user` (`user_id`),
  CONSTRAINT `fk_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [C] Tabel Categories
CREATE TABLE `categories` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `icon_name` VARCHAR(100) NOT NULL COMMENT 'Nama class ikon Bootstrap Icons (misal: bi-palette)',
  `type` ENUM('standard', 'custom') NOT NULL DEFAULT 'standard',
  `created_by_user_id` INT(4) UNSIGNED ZEROFILL DEFAULT NULL COMMENT 'Null jika standard, terisi id user jika kustom',
  PRIMARY KEY (`id`),
  KEY `fk_created_by_user` (`created_by_user_id`),
  CONSTRAINT `fk_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [D] Tabel Habits
CREATE TABLE `habits` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(4) UNSIGNED ZEROFILL NOT NULL,
  `category_id` INT(11) NOT NULL,
  `habit_name` VARCHAR(100) NOT NULL,
  `goals` VARCHAR(255) DEFAULT NULL COMMENT 'Contoh target: 8 glasses daily',
  `description` TEXT DEFAULT NULL,
  `evaluation_type` ENUM('checklist', 'numeric', 'timer') NOT NULL COMMENT 'Metode tracking progres',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Aktif, 0 = Diarsipkan/Nonaktif',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_habit_user` (`user_id`),
  KEY `fk_habit_category` (`category_id`),
  CONSTRAINT `fk_habit_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_habit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [E] Tabel Progress Logs
CREATE TABLE `progress_logs` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `habit_id` INT(11) NOT NULL,
  `log_date` DATE NOT NULL COMMENT 'Tanggal pencatatan progres',
  `status` TINYINT(1) DEFAULT NULL COMMENT '1 atau 0 untuk evaluasi tipe Checklist',
  `numeric_value` DECIMAL(10,2) DEFAULT NULL COMMENT 'Nilai kuantitas untuk tipe Numeric',
  `timer_value_seconds` INT(11) DEFAULT NULL COMMENT 'Durasi waktu dalam detik untuk tipe Timer',
  `notes` TEXT DEFAULT NULL COMMENT 'Catatan harian user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_habit_date` (`habit_id`, `log_date`),
  KEY `fk_log_habit` (`habit_id`),
  CONSTRAINT `fk_log_habit` FOREIGN KEY (`habit_id`) REFERENCES `habits` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [F] Tabel App Feedback (dipertahankan untuk endpoint /api/feedback)
CREATE TABLE `app_feedback` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(4) UNSIGNED ZEROFILL NOT NULL,
  `rating` TINYINT(1) NOT NULL,
  `comments` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_feedback_user` (`user_id`),
  CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 4. DATA AWAL KATEGORI BAWAAN
-- ==============================================================================
INSERT INTO `categories` (`name`, `icon_name`, `type`) VALUES
('Art',        'bi-palette',     'standard'),
('Study',      'bi-book',        'standard'),
('Entertain',  'bi-controller',  'standard'),
('Meditate',   'bi-moon-stars',  'standard'),
('Work',       'bi-briefcase',   'standard'),
('Sport',      'bi-dribbble',    'standard'),
('Finance',    'bi-wallet2',     'standard');

-- ==============================================================================
-- 5. VERIFIKASI STRUKTUR
-- ==============================================================================
SHOW TABLES;
