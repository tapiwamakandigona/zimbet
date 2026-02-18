# ZimBet - Casino Gaming Platform

[![Live Demo](https://img.shields.io/badge/Play_Now-Live-brightgreen?style=for-the-badge)](https://tapiwamakandigona.github.io/zimbet/)
[![GitHub](https://img.shields.io/badge/Source-GitHub-black?style=for-the-badge&logo=github)](https://github.com/tapiwamakandigona/zimbet)

A full-featured casino gaming platform with 6 provably fair games, real-time leaderboards, wallet system, and daily bonuses. Built with React, TypeScript, Supabase, and Matter.js physics.

## Games

| Game | Description | RTP |
|------|-------------|-----|
| **Aviator** | Cash out before the crash. Multiplier rises until it crashes. | 97% |
| **Coinflip** | Heads or tails - classic 50/50. | 98% |
| **Dice** | Roll under/over a target number. | 98% |
| **Mines** | Navigate a grid, avoid mines. More tiles = bigger multiplier. | 97% |
| **Plinko** | Drop a ball through pegs. Physics-based with Matter.js. | 97% |
| **Wheel** | Spin the wheel for multipliers. | 96% |

## Features

- **Provably Fair** - Verifiable game outcomes using cryptographic hashing
- **Real-Time Leaderboard** - Compete with other players
- **Wallet System** - Deposit, withdraw, track balance
- **Daily Bonuses** - Log in daily for free credits
- **Sound Effects** - Immersive audio experience
- **Mobile Responsive** - Full touch support
- **Dark Theme** - Premium UI with smooth animations
- **Authentication** - Secure account system via Supabase

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI components |
| TypeScript | Type safety |
| React Router 7 | Client-side routing |
| Supabase | Auth, database, real-time |
| Matter.js | Physics engine (Plinko) |
| Vite | Build tooling |
| GitHub Pages | Hosting |

## Architecture

```
src/
├── components/        # Shared UI (Wallet, Leaderboard, Toast, etc.)
├── context/           # Auth context with Supabase
├── lib/               # Game engines, audio, Supabase client
│   ├── aviatorEngine.ts   # Aviator crash algorithm
│   ├── gameEngine.ts      # Core game logic
│   ├── audio.ts           # Sound manager
│   └── supabase.ts        # Database client
├── pages/
│   ├── CasinoLobby.tsx    # Game selection
│   ├── FeatureDashboard.tsx # Main dashboard
│   ├── Landing.tsx         # Landing page
│   ├── Login.tsx           # Authentication
│   └── games/             # Individual game pages
│       ├── Aviator.tsx
│       ├── Coinflip.tsx
│       ├── Dice.tsx
│       ├── Mines.tsx
│       ├── Plinko.tsx
│       └── Wheel.tsx
└── main.tsx
```

## Getting Started

```bash
git clone https://github.com/tapiwamakandigona/zimbet.git
cd zimbet
npm install
npm run dev
```

## Database Setup

See [SUPABASE_SETUP.sql](./SUPABASE_SETUP.sql) for the complete database schema.

## Deploy

```bash
npm run deploy
```

## License

MIT - See [LICENSE](./LICENSE)
