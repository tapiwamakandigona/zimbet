import { Link } from 'react-router-dom'
import './Landing.css'

export function Landing() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="game-floater g1">✈️</div>
          <div className="game-floater g2">💣</div>
          <div className="game-floater g3">🎰</div>
          <div className="game-floater g4">🎲</div>
          <div className="game-floater g5">🪙</div>
        </div>

        <div className="hero-content">
          <div className="logo-badge">
            <span className="logo-icon">Z</span>
          </div>
          <h1>ZimBet <span className="highlight">Casino</span></h1>
          <p className="tagline">Play Smart. Win Big. Live Forever.</p>

          <div className="hero-cta">
            <Link to="/login" className="btn-primary pulse">
              <span>🚀</span> Play Aviator Live
            </Link>
            <a href="#games" className="btn-secondary">
              See All Games
            </a>
          </div>

          <div className="powered-by">
            <span>Secure Ecosystem by</span>
            <a href="https://tapiwamakandigona.github.io/zimpay/" target="_blank" rel="noopener noreferrer">
              💳 ZimPay
            </a>
          </div>
        </div>
      </section>

      {/* Live Stats Ticker */}
      <div className="ticker-wrap">
        <div className="ticker">
          <div className="ticker-item">🔥 Aviator: 540x Multiplier Just Hit!</div>
          <div className="ticker-item">💎 Mines: $5,000 Jackpot Won</div>
          <div className="ticker-item">🎰 Wheel: 50x Gold Segment Active</div>
          <div className="ticker-item">🚀 1,204 Players Online</div>
          <div className="ticker-item">🔥 Aviator: 540x Multiplier Just Hit!</div>
          <div className="ticker-item">💎 Mines: $5,000 Jackpot Won</div>
        </div>
      </div>

      {/* Featured Games */}
      <section id="games" className="games-showcase">
        <h2>Premium Games</h2>
        <div className="games-grid">
          <div className="game-card aviator">
            <div className="card-emoji">✈️</div>
            <h3>Aviator</h3>
            <p>The world's #1 crash game. Multiplayer excitement.</p>
            <span className="live-pill">● LIVE</span>
          </div>
          <div className="game-card mines">
            <div className="card-emoji">💣</div>
            <h3>Mines</h3>
            <p>Uncover gems, dodge bombs, multiply your cash.</p>
          </div>
          <div className="game-card wheel">
            <div className="card-emoji">🎡</div>
            <h3>Wheel</h3>
            <p>Spin the Wheel of Fortune. 50x Multipliers!</p>
          </div>
          <div className="game-card coin">
            <div className="card-emoji">🪙</div>
            <h3>Coinflip</h3>
            <p>Double or nothing. 50/50 chance to win.</p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="features-section">
        <h2>Why ZimBet?</h2>
        <div className="features">
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <h3>Provably Fair</h3>
            <p>Our algorithms ensure every round is random and verifiable.</p>
          </div>
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <h3>Instant Payouts</h3>
            <p>Direct integration with your ZimPay wallet.</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🎮</span>
            <h3>Immersive</h3>
            <p>Premium sound effects and 3D visuals.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Fly?</h2>
        <p>Join the fastest growing casino community today.</p>
        <Link to="/login" className="btn-primary large">
          <span>🎰</span> Enter Casino
        </Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span>Z</span> ZimBet
          </div>
          <p className="disclaimer">
            18+ only. Play responsibly. ZimBet is a project by Silentics.
          </p>
          <div className="footer-links">
            <a href="https://tapiwamakandigona.github.io/zimpay/" target="_blank" rel="noopener noreferrer">ZimPay</a>
            <span>•</span>
            <a href="https://silentics.org" target="_blank" rel="noopener noreferrer">Silentics</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
