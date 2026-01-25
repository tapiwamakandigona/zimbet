-- =============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Go to: Supabase Dashboard > SQL Editor > New Query
-- Paste this entire file and click "Run"
-- =============================================

-- 1. Create transactions table for audit trail (if not exists)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id),
  receiver_id UUID REFERENCES zimbet_accounts(id),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the transfer_credits function
DROP FUNCTION IF EXISTS transfer_credits(text, int);

CREATE OR REPLACE FUNCTION transfer_credits(
  recipient_username text, 
  amount int
) RETURNS void AS $$
DECLARE
  sender_id uuid := auth.uid();
  recipient_account_id uuid;
BEGIN
  -- Find Recipient
  SELECT id INTO recipient_account_id 
  FROM zimbet_accounts 
  WHERE username = recipient_username;
  
  IF recipient_account_id IS NULL THEN 
    RAISE EXCEPTION 'User not found'; 
  END IF;

  -- Deduct from sender (Atomic Check & Update)
  UPDATE zimbet_accounts 
  SET balance = balance - amount 
  WHERE user_id = sender_id AND balance >= amount;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Insufficient balance'; 
  END IF;

  -- Credit recipient (Atomic)
  UPDATE zimbet_accounts 
  SET balance = balance + amount 
  WHERE id = recipient_account_id;

  -- Audit Log
  INSERT INTO transactions (sender_id, receiver_id, amount, description, status) 
  VALUES (sender_id, recipient_account_id, amount, 'ZimBet P2P Transfer', 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the process_game_result function (for games)
DROP FUNCTION IF EXISTS process_game_result(text, int, float, boolean);

CREATE OR REPLACE FUNCTION process_game_result(
  game_id text,
  bet_amount int,
  multiplier float,
  is_win boolean
) RETURNS json AS $$
DECLARE
  user_idx uuid := auth.uid();
  winnings decimal(10,2) := 0;
BEGIN
  -- Validate
  IF bet_amount < 0 THEN 
    RAISE EXCEPTION 'Negative bet'; 
  END IF;

  -- Server-Side Winnings Calc
  IF is_win THEN
    winnings := floor(bet_amount * multiplier);
    UPDATE zimbet_accounts SET balance = balance + winnings WHERE user_id = user_idx;
  END IF;
  
  -- Update Stats
  UPDATE zimbet_accounts 
  SET total_wagered = COALESCE(total_wagered, 0) + bet_amount,
      total_won = COALESCE(total_won, 0) + winnings,
      total_earnings = COALESCE(total_earnings, 0) + (winnings - bet_amount),
      total_wins = COALESCE(total_wins, 0) + (CASE WHEN is_win THEN 1 ELSE 0 END),
      total_losses = COALESCE(total_losses, 0) + (CASE WHEN is_win THEN 0 ELSE 1 END)
  WHERE user_id = user_idx;

  RETURN json_build_object('new_balance', (SELECT balance FROM zimbet_accounts WHERE user_id = user_idx));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add missing columns if they don't exist
ALTER TABLE zimbet_accounts 
ADD COLUMN IF NOT EXISTS total_wagered DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_won DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_daily_claim TIMESTAMP WITH TIME ZONE;

-- SUCCESS! Functions are now ready to use.
SELECT 'SUCCESS: transfer_credits and process_game_result functions created!' as result;
