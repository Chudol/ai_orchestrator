import { useEffect, useState } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => scrollTo('hero')} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Orchestrator
          </span>
        </button>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollTo('features')} className="text-sm text-gray-400 hover:text-white transition-colors">
            Features
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all"
          >
            Download
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-gray-400 hover:text-white p-2"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? (
              <><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>
            ) : (
              <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50 px-6 py-4 flex flex-col gap-4">
          <button onClick={() => scrollTo('features')} className="text-sm text-gray-400 hover:text-white transition-colors text-left">
            Features
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium"
          >
            Download
          </a>
        </div>
      )}
    </nav>
  )
}
