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

-- =============================================
-- FORENSIC AUDIT UPDATES (Security & Integrity)
-- =============================================

-- 1. Schema Updates for Granular Stats
ALTER TABLE zimbet_accounts 
ADD COLUMN IF NOT EXISTS total_wagered DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_won DECIMAL(10, 2) DEFAULT 0;

-- 2. Transaction Table for Audit Trail
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id),
  receiver_id UUID REFERENCES zimbet_accounts(id), -- Receiver is profiled via zimbet_accounts
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Secure Atomic Transfer (Wallet.tsx Fix)
CREATE OR REPLACE FUNCTION transfer_credits(
  recipient_username text, 
  amount int
) returns void as $$
declare
  sender_id uuid := auth.uid();
  recipient_account_id uuid;
begin
  -- Find Recipient
  select id into recipient_account_id from zimbet_accounts where username = recipient_username;
  if recipient_account_id is null then raise exception 'User not found'; end if;

  -- Deduct (Atomic Check & Update)
  update zimbet_accounts 
  set balance = balance - amount 
  where user_id = sender_id and balance >= amount;
  
  if not found then raise exception 'Insufficient balance'; end if;

  -- Credit (Atomic)
  update zimbet_accounts 
  set balance = balance + amount 
  where id = recipient_account_id;

  -- Audit Log
  insert into transactions (sender_id, receiver_id, amount, description, status) 
  values (sender_id, recipient_account_id, amount, 'ZimBet P2P Transfer', 'completed');
end;
$$ language plpgsql security definer;

-- 4. Secure Game Processing (Mines.tsx Fix)
CREATE OR REPLACE FUNCTION process_game_result(
  game_id text,
  bet_amount int,
  multiplier float,
  is_win boolean
) returns json as $$
declare
  user_idx uuid := auth.uid();
  winnings decimal(10,2) := 0;
begin
  -- Validate
  if bet_amount < 0 then raise exception 'Negative bet'; end if;

  -- Server-Side Winnings Calc
  if is_win then
    winnings := floor(bet_amount * multiplier);
    update zimbet_accounts set balance = balance + winnings where user_id = user_idx;
  end if;
  
  -- Update Stats
  update zimbet_accounts 
  set total_wagered = total_wagered + bet_amount,
      total_won = total_won + winnings,
      total_earnings = total_earnings + (winnings - bet_amount),
      total_wins = total_wins + (CASE WHEN is_win THEN 1 ELSE 0 END),
      total_losses = total_losses + (CASE WHEN is_win THEN 0 ELSE 1 END)
  where user_id = user_idx;

  return json_build_object('new_balance', (select balance from zimbet_accounts where user_id = user_idx));
end;
$$ language plpgsql security definer;
