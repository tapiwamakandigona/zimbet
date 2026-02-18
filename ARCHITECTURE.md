# Architecture

## Overview

ZimBet is a multi-game casino platform with provably fair gaming, real-time features, and a wallet system.

## Tech Stack

```
React 19 -> React Router 7 -> Supabase (auth + DB) -> Matter.js (physics)
```

## Game Engine (`lib/gameEngine.ts`)

Central game engine handling:
- Bet validation against wallet balance
- Outcome generation with provably fair algorithms
- Win/loss calculation
- Wallet balance updates via Supabase
- Game history logging

## Provably Fair System (`components/ProvablyFair.tsx`)

Each game outcome is verifiable:
1. Server generates a seed hash before the bet
2. Client provides a nonce
3. Outcome = HMAC-SHA256(server_seed + client_nonce)
4. After reveal, user can verify the hash matches

## Games

### Aviator (`lib/aviatorEngine.ts`)
- Multiplier curve: exponential growth with random crash point
- Real-time multiplier display with animation
- Cash-out at any time before crash

### Plinko (`pages/games/Plinko.tsx`)
- Matter.js physics simulation
- Ball drops through pegs with realistic collisions
- Multiplier determined by landing bucket
- Risk levels (low/medium/high) adjust peg layout

### Mines (`pages/games/Mines.tsx`)
- 5x5 grid with configurable mine count
- Progressive multiplier per safe tile revealed
- Cash-out available after each safe reveal

### Coinflip, Dice, Wheel
- Standard casino games with provably fair outcomes
- Animated result displays

## Wallet System (`components/Wallet.tsx`)

- Balance tracking in Supabase
- Transaction history
- Deposit/withdraw flows
- Real-time balance updates

## Audio (`lib/audio.ts`)

- Sound effects for wins, losses, bets, UI interactions
- Background ambient sounds
- Volume control and mute toggle
