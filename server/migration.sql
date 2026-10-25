-- Dedicated Cloudflare D1 database. No food diaries/photos are stored server-side in this version.
CREATE TABLE IF NOT EXISTS subscriptions (
 user_id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, subscription_id TEXT NOT NULL UNIQUE,
 plan TEXT NOT NULL CHECK(plan IN ('menu','plus')), interval TEXT NOT NULL CHECK(interval IN ('month','year')),
 status TEXT NOT NULL, period_end INTEGER NOT NULL, cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
 event_created INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, received_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT NOT NULL,bucket INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(key,bucket));
CREATE TABLE IF NOT EXISTS product_cache (barcode TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at INTEGER NOT NULL);
