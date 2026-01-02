import { Link } from 'react-router-dom'
import './Landing.css'

export function Landing() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="floating-emoji e1">🪨</div>
          <div className="floating-emoji e2">📄</div>
          <div className="floating-emoji e3">✂️</div>
          <div className="floating-emoji e4">💰</div>
          <div className="floating-emoji e5">🏆</div>
        </div>
        
        <div className="hero-content">
          <div className="logo-badge">
            <span className="logo-icon">🎰</span>
          </div>
          <h1>ZimBet</h1>
          <p className="tagline">Rock Paper Scissors.<br />Real Stakes. Real Wins.</p>
          
          <div className="hero-cta">
            <Link to="/login" className="btn-primary">
              <span>🎮</span> Play Now
            </Link>
            <a href="#how-it-works" className="btn-secondary">
              Learn More
            </a>
          </div>

          <div className="powered-by">
            <span>Powered by</span>
            <a href="https://tapiwamakandigona.github.io/zimpay/" target="_blank" rel="noopener noreferrer">
              💳 ZimPay
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <span className="stat-value">$10-$500</span>
          <span className="stat-label">Bet Tiers</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⚡</span>
          <span className="stat-value">10s</span>
          <span className="stat-label">Quick Matches</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏆</span>
          <span className="stat-value">90%</span>
          <span className="stat-label">Winner Payout</span>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-section">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-icon">💳</div>
            <h3>Connect ZimPay</h3>
            <p>Login with your ZimPay credentials and fund your account</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-icon">💵</div>
            <h3>Choose Your Bet</h3>
            <p>Select from $10, $20, $50, $100, or $500 tiers</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-icon">⚔️</div>
            <h3>Battle</h3>
            <p>Face real players or the bot in Rock Paper Scissors</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-icon">🏆</div>
            <h3>Win Big</h3>
            <p>Winner takes 90% of the pot (10% house fee)</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <h2>Why ZimBet?</h2>
        <div className="features">
          <div className="feature">
            <span className="feature-icon">🤖</span>
            <h3>Bot Fallback</h3>
            <p>No human opponent? Play against our smart bot anytime</p>
          </div>
          <div className="feature">
            <span className="feature-icon">📊</span>
            <h3>Live Leaderboard</h3>
            <p>Compete for top spots in wins, earnings, and win rate</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <h3>Secure</h3>
            <p>Powered by ZimPay's trusted banking infrastructure</p>
          </div>
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <h3>Instant Matches</h3>
            <p>20 second matchmaking, 10 second rounds</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Win?</h2>
        <p>Join ZimBet and test your luck against players worldwide</p>
        <Link to="/login" className="btn-primary large">
          <span>🎰</span> Start Playing
        </Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span>🎰</span> ZimBet
          </div>
          <p className="disclaimer">
            🎮 This is a simulation game. Play responsibly.
          </p>
          <div className="footer-links">
            <a href="https://tapiwamakandigona.github.io/zimpay/" target="_blank" rel="noopener noreferrer">
              ZimPay
            </a>
            <span>•</span>
            <a href="https://silentics.org" target="_blank" rel="noopener noreferrer">
              Silentics
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
