import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Landing.css'

export function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { user, zimBetAccount, loading } = useAuth()
  const navigate = useNavigate()

  // Premium Animated Gradient Mesh Background (WebGL-style using Canvas 2D)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight

    // Gradient Blob configuration
    const blobs = [
      { x: 0.2, y: 0.3, radius: 0.4, color: 'rgba(226, 51, 51, 0.3)', vx: 0.0003, vy: 0.0002 },
      { x: 0.8, y: 0.2, radius: 0.35, color: 'rgba(251, 191, 36, 0.2)', vx: -0.0002, vy: 0.0003 },
      { x: 0.5, y: 0.7, radius: 0.45, color: 'rgba(139, 92, 246, 0.25)', vx: 0.0002, vy: -0.0002 },
      { x: 0.1, y: 0.8, radius: 0.3, color: 'rgba(16, 185, 129, 0.15)', vx: 0.0003, vy: -0.0001 },
    ]

    let time = 0
    let animationFrame: number

    const render = () => {
      time += 1

      // Dark base
      ctx.fillStyle = '#0a0a12'
      ctx.fillRect(0, 0, width, height)

      // Draw gradient blobs with organic movement
      blobs.forEach((blob, i) => {
        // Organic sine wave movement
        const offsetX = Math.sin(time * 0.01 + i) * 0.05
        const offsetY = Math.cos(time * 0.01 + i * 1.5) * 0.05

        const x = (blob.x + offsetX) * width
        const y = (blob.y + offsetY) * height
        const radius = blob.radius * Math.min(width, height)

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, blob.color)
        gradient.addColorStop(1, 'transparent')

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
      })

      // Add subtle noise/grain overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.01)'
      for (let i = 0; i < 100; i++) {
        const nx = Math.random() * width
        const ny = Math.random() * height
        ctx.fillRect(nx, ny, 1, 1)
      }

      animationFrame = requestAnimationFrame(render)
    }

    render()

    const resize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // Animated Jackpot Counter
  const [jackpotAmount, setJackpotAmount] = useState(0)
  const targetJackpot = 125847

  useEffect(() => {
    let current = 0
    const duration = 2000
    const step = targetJackpot / (duration / 16)

    const animateJackpot = () => {
      current += step
      if (current < targetJackpot) {
        setJackpotAmount(Math.floor(current))
        requestAnimationFrame(animateJackpot)
      } else {
        setJackpotAmount(targetJackpot)
      }
    }

    // Start animation after a short delay
    const timer = setTimeout(animateJackpot, 500)
    return () => clearTimeout(timer)
  }, [])

  // Responsible Gambling Modal
  const [showGamblingModal, setShowGamblingModal] = useState(false)

  useEffect(() => {
    const hasSeenModal = localStorage.getItem('zimbet_gambling_disclaimer')
    if (!hasSeenModal) {
      setShowGamblingModal(true)
    }
  }, [])

  const acceptGamblingDisclaimer = () => {
    localStorage.setItem('zimbet_gambling_disclaimer', 'accepted')
    setShowGamblingModal(false)
  }

  // Handle card click - redirect appropriately based on auth state
  const handleGameClick = (gameLink: string) => {
    if (user && zimBetAccount) {
      navigate(gameLink)
    } else if (user && !zimBetAccount) {
      navigate('/setup') // User exists but hasn't set up account
    } else {
      navigate('/login')
    }
  }

  // Button text based on auth state
  const getCtaText = () => {
    if (loading) return 'Loading...'
    if (user && zimBetAccount) return 'Go to Dashboard'
    return 'Play Now'
  }

  const getCtaLink = () => {
    if (user && zimBetAccount) return '/dashboard'
    return '/login'
  }

  return (
    <div className="landing-page">
      <canvas ref={canvasRef} className="bg-canvas" />

      <div className="content-wrapper">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <div className="hero-badge pulse-glow">
              <span>🎰</span> Provably Fair Gaming
            </div>
            <h1>
              ZimBet <span className="highlight-text">Casino</span>
            </h1>
            <p className="hero-sub">
              Experience the thrill of fair gaming with instant payouts.<br />
              Powered by <strong>ZimPay</strong>.
            </p>

            <div className="cta-group">
              <Link to={getCtaLink()} className="btn btn-primary btn-lg glow">
                <span>🚀</span> {getCtaText()}
              </Link>
              <a href="https://tapiwamakandigona.github.io/zimpay/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
                Get ZimPay
              </a>
            </div>

            <div className="hero-stats">
              <div className="stat jackpot-counter">
                <span className="val">${jackpotAmount.toLocaleString()}</span>
                <span className="lbl">Total Jackpot</span>
              </div>
              <div className="divider"></div>
              <div className="stat">
                <span className="val">$100</span>
                <span className="lbl">Free Bonus</span>
              </div>
              <div className="divider"></div>
              <div className="stat">
                <span className="val">Instant</span>
                <span className="lbl">Payouts</span>
              </div>
            </div>
          </div>
        </section>

        {/* Ticker */}
        <div className="ticker-wrap">
          <div className="ticker-track">
            <span className="tick win">🔥 New: Plinko game added!</span>
            <span className="tick">🎁 Get $100 FREE when you sign up</span>
            <span className="tick win">💎 Mines: Uncover gems, multiply bets</span>
            <span className="tick">✈️ Aviator: Real-time multiplayer</span>
            <span className="tick win">🔥 New: Plinko game added!</span>
            <span className="tick">🎁 Get $100 FREE when you sign up</span>
            <span className="tick win">💎 Mines: Uncover gems, multiply bets</span>
            <span className="tick">✈️ Aviator: Real-time multiplayer</span>
          </div>
        </div>

        {/* Game Grid */}
        <section className="games-grid-section">
          <h2>Featured Games</h2>
          <div className="grid">
            <div className="card aviator-card tilt" onClick={() => handleGameClick('/casino/aviator')}>
              <div className="card-bg"></div>
              <div className="card-content">
                <div className="card-icon">✈️</div>
                <h3>Aviator</h3>
                <p>Crash Gaming. Multiplayer.</p>
                <span className="badge live">● LIVE</span>
              </div>
            </div>
            <div className="card mines-card tilt" onClick={() => handleGameClick('/casino/mines')}>
              <div className="card-bg"></div>
              <div className="card-content">
                <div className="card-icon">💎</div>
                <h3>Mines</h3>
                <p>Uncover Gems. Multiply Bets.</p>
              </div>
            </div>
            <div className="card wheel-card tilt" onClick={() => handleGameClick('/casino/wheel')}>
              <div className="card-bg"></div>
              <div className="card-content">
                <div className="card-icon">🎡</div>
                <h3>Wheel</h3>
                <p>Spin to Win. 50x Jackpots.</p>
              </div>
            </div>
            <div className="card plinko-card tilt" onClick={() => handleGameClick('/casino/plinko')}>
              <div className="card-bg"></div>
              <div className="card-content">
                <div className="card-icon">🎯</div>
                <h3>Plinko</h3>
                <p>Pegs & Pyramids. 1000x Max.</p>
                <span className="badge new">NEW</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer (Exact ZimPay Style) */}
        <footer className="landing-footer">
          {/* Decorative gradient line */}
          <div className="footer-gradient-line"></div>

          <div className="footer-container">
            <div className="footer-brand">
              <div className="nav-logo">
                <span className="logo-icon">🎰</span>
                <span className="logo-text">ZimBet</span>
              </div>
              <p>A premium casino simulation demonstrating modern web development.</p>

              {/* Social Links */}
              <div className="social-links">
                <a href="https://github.com/tapiwamakandigona" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="GitHub">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                </a>
                <a href="https://tapiwamakandigona.github.io/portfolio/" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Portfolio">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                </a>
                <a href="mailto:silentics.org@gmail.com" className="social-icon" aria-label="Email">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                </a>
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <h4>Quick Links</h4>
                <Link to="/login">Login</Link>
                <a href="https://tapiwamakandigona.github.io/zimpay/#/signup" target="_blank" rel="noopener noreferrer">Sign Up</a>
              </div>
              <div className="footer-col">
                <h4>Developer</h4>
                <a href="https://tapiwamakandigona.github.io/portfolio/" target="_blank" rel="noopener noreferrer">Portfolio</a>
                <a href="https://github.com/tapiwamakandigona" target="_blank" rel="noopener noreferrer">GitHub</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} ZimBet • Designed & Built with 💙 by <a href="https://tapiwamakandigona.github.io/portfolio/" target="_blank" rel="noopener noreferrer">Tapiwa Makandigona</a></p>
          </div>
        </footer>
      </div>

      {/* Responsible Gambling Modal */}
      {showGamblingModal && (
        <div className="gambling-modal-overlay">
          <div className="gambling-modal">
            <div className="gambling-modal-icon">⚠️</div>
            <h2>Bet Responsibly</h2>
            <p>
              ZimBet is a <strong>simulation game</strong> for entertainment purposes only.
              No real money is involved.
            </p>
            <p className="gambling-warning">
              If this were real gambling, remember: Gambling can be addictive.
              Please play responsibly and within your means.
            </p>
            <ul className="gambling-tips">
              <li>✓ Set a budget before you play</li>
              <li>✓ Never chase losses</li>
              <li>✓ Take regular breaks</li>
              <li>✓ Gambling should be fun, not a way to make money</li>
            </ul>
            <button onClick={acceptGamblingDisclaimer} className="btn btn-primary">
              I Understand - Continue
            </button>
            <p className="gambling-age">
              🔞 You must be 18+ to access gambling content
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
