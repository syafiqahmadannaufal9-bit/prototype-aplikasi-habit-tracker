-- ============================================
-- SETUP DATABASE: habit_tracker
-- Jalankan file ini di phpMyAdmin Laragon
-- ============================================

-- 1. Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS habit_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. Gunakan database habit_tracker
USE habit_tracker;

-- 3. Hapus tabel lama jika ada (agar tidak konflik)
DROP TABLE IF EXISTS users;

-- 4. Buat tabel users dengan kolom yang lengkap
CREATE TABLE users (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,   -- UUID dari Node.js
  username    VARCHAR(50)  NOT NULL UNIQUE,         -- Username unik
  full_name   VARCHAR(100) NOT NULL,                -- Nama lengkap
  email       VARCHAR(100) NOT NULL UNIQUE,         -- Email unik
  password_hash VARCHAR(255) NOT NULL,              -- Password (hash)
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Verifikasi struktur tabel
DESCRIBE users;
