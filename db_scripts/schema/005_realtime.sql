-- ============================================================
-- CMS DATABASE SCHEMA — Supabase Realtime
-- Run: After 001_tables.sql
--
-- Enables WebSocket subscriptions for live updates.
-- Frontend listens to these tables for real-time UI refresh.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE workgroups;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE site_checkins;
