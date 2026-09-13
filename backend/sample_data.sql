-- backend/sample_data.sql
-- Purpose: Optional sample rows for local testing (run AFTER the main schema)
-- Iteration: 1
-- WARNING: Use only in development. Do not run against production.

-- Sample users (passwords/tokens are handled by Supabase Auth later)
INSERT INTO users (id, email, display_name, avatar_url, gender, is_banned, report_count)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'Alice', NULL, 'female', false, 0),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com',   'Bob',   NULL, 'male',   false, 0),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.com', 'Carol', NULL, 'female', false, 0),
  ('44444444-4444-4444-4444-444444444444', 'dave@example.com',  'Dave',  NULL, 'male',   false, 0)
ON CONFLICT (email) DO NOTHING;

-- Sample waiting queue entries (Alice and Bob waiting)
INSERT INTO waiting_queue (user_id, gender)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'female'),
  ('22222222-2222-2222-2222-222222222222', 'male')
ON CONFLICT (user_id) DO NOTHING;

-- Sample ended session between Carol and Dave
INSERT INTO sessions (id, user1_id, user2_id, started_at, ended_at, status)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '33333333-3333-3333-3333-333333333333',
   '44444444-4444-4444-4444-444444444444',
   now() - interval '2 hours',
   now() - interval '1 hour',
   'ended')
ON CONFLICT DO NOTHING;

-- Sample messages in that session
INSERT INTO messages (session_id, sender_id, content, is_flagged)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Hey! Nice to meet you.', false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Hi Carol, how are you?', false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Doing great, thanks!', false)
ON CONFLICT DO NOTHING;

-- Sample friend relationship (accepted)
INSERT INTO friends (id, requester_id, receiver_id, status)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333333',
   'accepted')
ON CONFLICT DO NOTHING;

-- Sample friend messages
INSERT INTO friend_messages (friend_id, sender_id, content, is_read)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Want to catch up later?', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Sure, free after 6!', false)
ON CONFLICT DO NOTHING;

SELECT 'Sample data inserted successfully' AS result;
