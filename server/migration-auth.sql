-- Cloudflare-native identity. Passwords are salted PBKDF2 hashes; tokens are SHA-256 digests.
CREATE TABLE IF NOT EXISTS auth_users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,salt TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth_sessions(refresh_hash TEXT PRIMARY KEY,access_hash TEXT NOT NULL UNIQUE,user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,access_expires INTEGER NOT NULL,refresh_expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(refresh_expires);
