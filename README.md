# ZimBet - Premium Crypto Casino

ZimBet is a premium crypto casino and sports betting platform offering a variety of provably fair games including Aviator, Mines, Wheel, and Plinko.

## Features

- **Provably Fair Gaming**: Verify every roll and game outcome.
- **Crypto Payments**: Fast and secure transactions via ZimPay.
- **Responsive Design**: Optimized for mobile and desktop play.
- **PWA Support**: Installable as a Progressive Web App.

## Deployment

This repository contains the production build of the ZimBet application.

### Hosting

The site is designed to be hosted on GitHub Pages or any static site provider. The base path is configured for `/zimbet/`.

### Development

This branch (`gh-pages` or deployment branch) contains compiled assets. For development, please switch to the source branch (typically `main` or `master`).

## Games

- **Aviator**: Crash game logic.
- **Mines**: Classic minesweeper style betting.
- **Plinko**: Ball drop game.
- **Wheel**: Spin the wheel.
- **Coinflip**: Heads or tails.

## Security

Security headers are implemented via meta tags in `index.html` including Content Security Policy (CSP) and Referrer Policy.
