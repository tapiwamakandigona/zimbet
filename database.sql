-- ZimBet Database Schema
-- Run this in Supabase SQL Editor

-- ZimBet Accounts Table
CREATE TABLE IF NOT EXISTS zimbet_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0 CHECK (balance >= 0),
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ZimBet Matches Table
CREATE TABLE IF NOT EXISTS zimbet_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID REFERENCES zimbet_accounts(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES zimbet_accounts(id) ON DELETE SET NULL,
  bet_amount DECIMAL(10, 2) NOT NULL,
  player1_choice TEXT CHECK (player1_choice IN ('rock', 'paper', 'scissors')),
  player2_choice TEXT CHECK (player2_choice IN ('rock', 'paper', 'scissors')),
  winner_id UUID REFERENCES zimbet_accounts(id) ON DELETE SET NULL,
  is_bot_match BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'choosing', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- House Account (silentics.org) - Create manually or via insert
-- This account receives 10% of all winning pots

-- Enable RLS
ALTER TABLE zimbet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE zimbet_matches ENABLE ROW LEVEL SECURITY;

-- Policies for zimbet_accounts
CREATE POLICY "Users can view their own account"
  ON zimbet_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account"
  ON zimbet_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own account"
  ON zimbet_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Public read for leaderboard
CREATE POLICY "Anyone can view leaderboard data"
  ON zimbet_accounts FOR SELECT
  USING (true);

-- Policies for zimbet_matches
CREATE POLICY "Users can view matches they're in"
  ON zimbet_matches FOR SELECT
  USING (
    player1_id IN (SELECT id FROM zimbet_accounts WHERE user_id = auth.uid())
    OR player2_id IN (SELECT id FROM zimbet_accounts WHERE user_id = auth.uid())
    OR status = 'waiting'
  );

CREATE POLICY "Users can create matches"
  ON zimbet_matches FOR INSERT
  WITH CHECK (
    player1_id IN (SELECT id FROM zimbet_accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update matches they're in"
  ON zimbet_matches FOR UPDATE
  USING (
    player1_id IN (SELECT id FROM zimbet_accounts WHERE user_id = auth.uid())
    OR player2_id IN (SELECT id FROM zimbet_accounts WHERE user_id = auth.uid())
  );

-- Index for faster matchmaking queries
CREATE INDEX IF NOT EXISTS idx_matches_waiting ON zimbet_matches(status, bet_amount) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON zimbet_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON zimbet_matches(player2_id);

-- Function to clean up old completed/cancelled matches (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_matches()
RETURNS void AS $$
BEGIN
  DELETE FROM zimbet_matches
  WHERE status IN ('completed', 'cancelled')
  AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for matches
ALTER PUBLICATION supabase_realtime ADD TABLE zimbet_matches;
