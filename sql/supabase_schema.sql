-- Supabase / PostgreSQL initial schema for Streaming IdeaTrade

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- User profiles (linked to Supabase Auth `auth.users` via `id`)
CREATE TABLE IF NOT EXISTS user_profiles (
  id text PRIMARY KEY,
  display_name text,
  email text,
  data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Player aggregated history
CREATE TABLE IF NOT EXISTS player_history (
  player_id text PRIMARY KEY,
  player_name text,
  total_games integer DEFAULT 0,
  total_profit numeric DEFAULT 0,
  average_profit numeric DEFAULT 0,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  data jsonb,
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_player_history_average_profit ON player_history (average_profit DESC);

-- Game results (each finished multiplayer game)
CREATE TABLE IF NOT EXISTS game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text,
  symbol text,
  duration integer,
  player_count integer,
  end_time timestamptz,
  results jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_results_end_time ON game_results (end_time DESC);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id text PRIMARY KEY,
  code text,
  host_id text,
  settings jsonb,
  state jsonb,
  created_at timestamptz DEFAULT now()
);

-- Room players
CREATE TABLE IF NOT EXISTS room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text REFERENCES rooms(id) ON DELETE CASCADE,
  player_id text,
  player_name text,
  portfolio jsonb,
  joined_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players (room_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_players_room_player ON room_players (room_id, player_id);

-- Trades (per-user/per-room trade events)
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  room_id text,
  symbol text,
  action text,
  quantity numeric,
  price numeric,
  portfolio jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades (user_id);
CREATE INDEX IF NOT EXISTS idx_trades_room_id ON trades (room_id);

-- Quiz history
CREATE TABLE IF NOT EXISTS quiz_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  quizzes jsonb,
  total_quizzes integer DEFAULT 0,
  average_score numeric DEFAULT 0,
  last_quiz_date timestamptz,
  level_assessment_done boolean DEFAULT false,
  data jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_history_user_id ON quiz_history (user_id);

-- Individual game history (solo and multiplayer per-user records)
CREATE TABLE IF NOT EXISTS game_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  game_type text,
  result text,
  score numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  profit_percentage numeric DEFAULT 0,
  final_balance numeric DEFAULT 0,
  difficulty text,
  market text,
  symbol text,
  duration integer,
  total_trades integer DEFAULT 0,
  game_mode text,
  room_code text,
  data jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history (user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history (created_at DESC);

-- Additional helper tables can be added: achievements, notifications, leaderboards snapshots, etc.

-- Note: Consider adding Row Level Security (RLS) policies if you want to enable Supabase Auth-based restrictions.
