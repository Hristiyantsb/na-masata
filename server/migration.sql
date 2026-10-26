-- Dedicated Cloudflare D1 database. Backups are opt-in; photos are never stored.
CREATE TABLE IF NOT EXISTS subscriptions (
 user_id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, subscription_id TEXT NOT NULL UNIQUE,
 plan TEXT NOT NULL CHECK(plan IN ('menu','plus')), interval TEXT NOT NULL CHECK(interval IN ('month','year')),
 status TEXT NOT NULL, period_end INTEGER NOT NULL, cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
 event_created INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, received_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT NOT NULL,bucket INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(key,bucket));
CREATE TABLE IF NOT EXISTS product_cache (barcode TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS product_search_cache (query TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at INTEGER NOT NULL);
-- Optional explicit cloud backups. A null payload is a deletion tombstone, not food data.
CREATE TABLE IF NOT EXISTS user_backups (user_id TEXT PRIMARY KEY, revision TEXT NOT NULL, payload TEXT, updated_at TEXT NOT NULL);
