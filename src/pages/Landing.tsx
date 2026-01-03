import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import './Landing.css'

export function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { user, zimBetAccount, loading } = useAuth()
  const navigate = useNavigate()

  // Particle System
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight

    const particles: { x: number, y: number, vx: number, vy: number, size: number, alpha: number }[] = []
    const particleCount = Math.min(80, (width * height) / 15000)

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.1
      })
    }

    let animationFrame: number

    const render = () => {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, width, height)

      // Draw connections
      ctx.strokeStyle = 'rgba(226, 51, 51, 0.04)'
      ctx.lineWidth = 1

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        ctx.fillStyle = `rgba(226, 51, 51, ${p.alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()

        // Connect nearby
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }
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
              <div className="stat">
                <span className="val">6</span>
                <span className="lbl">Games</span>
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
    </div>
  )
}
