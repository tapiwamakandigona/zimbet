# 🎰 ZimBet — Premium Casino & Betting Experience

A browser-based casino platform featuring multiple provably fair games, user accounts, and wallet management via ZimPay. Built with React and Vite, backed by Supabase, and deployed as a static site on GitHub Pages.

**Live site:** [tapiwamakandigona.github.io/zimbet](https://tapiwamakandigona.github.io/zimbet/)

---

## Games

| Game | Description |
|------|-------------|
| ✈️ **Aviator** | Crash-style game — cash out before the multiplier crashes |
| 💣 **Mines** | Minesweeper-inspired betting game |
| 🎡 **Wheel** | Spin-the-wheel game |
| 🔵 **Plinko** | Ball-drop game with variable payouts |
| 🪙 **Coinflip** | Classic coin toss |
| 🎲 **Dice** | Dice roll game |

## Tech Stack

- **Frontend:** React (with React Router), built with [Vite](https://vitejs.dev/)
- **Backend / Auth:** [Supabase](https://supabase.com/) (authentication, database, real-time)
- **Deployment:** GitHub Pages (`gh-pages` branch)
- **PWA:** Web app manifest for installability on mobile

## Branch Structure

| Branch | Purpose |
|--------|---------|
| `main` (or source branch) | Source code (React/Vite project) |
| `gh-pages` | Production build output — **this branch** |

> **Note:** This branch (`gh-pages`) contains only the compiled/bundled production assets. To work on the source code, switch to the main development branch.

## Deployment

The site is deployed automatically to GitHub Pages from the `gh-pages` branch. The production build is generated with:

```bash
npm run build
```

The build output (`dist/`) is then published to this branch.

## Local Development

To run locally from source (on the development branch):

```bash
npm install
npm run dev
```

## Author

**Tapiwa Makandigona**

## License

All rights reserved. See the project owner for licensing information.
