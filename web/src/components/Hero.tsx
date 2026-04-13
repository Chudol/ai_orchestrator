import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

interface Props {
  onImageClick: (src: string) => void
}

export default function Hero({ onImageClick }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const imageY = useTransform(scrollYProgress, [0, 1], [0, -80])
  const imageOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3])

  return (
    <section id="hero" ref={ref} className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-12">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <span className="inline-block text-xs md:text-sm font-medium text-gray-400 border border-gray-700/60 rounded-full px-4 py-1.5 bg-gray-900/40 backdrop-blur-sm">
          All-in-one dev environment for Claude Code
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-center max-w-4xl leading-tight"
      >
        Your AI Development{' '}
        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
          Command Center
        </span>
      </motion.h1>

      {/* Subheadline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-6 text-lg md:text-xl text-gray-400 text-center max-w-2xl leading-relaxed"
      >
        Manage multiple Claude Code sessions, terminals, git repos, and configurations &mdash; all in one window.
      </motion.p>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
        className="mt-8 flex gap-4"
      >
        <a
          href="https://github.com/Chudol/solmeron_release/releases/latest/download/Solmeron-arm64.dmg"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm md:text-base transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 active:scale-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
          Download for macOS
        </a>
      </motion.div>

      {/* Hero Screenshot */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        style={{ y: imageY, opacity: imageOpacity }}
        className="mt-16 w-full max-w-5xl"
      >
        <div
          className="rounded-xl overflow-hidden border border-gray-700/50 shadow-2xl shadow-blue-500/10 cursor-pointer"
          onClick={() => onImageClick('./assets/main.png')}
        >
          <img
            src="./assets/main.png"
            alt="Solmeron - Main view with Claude Code session"
            className="w-full block"
            loading="eager"
          />
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
        className="mt-12 text-gray-500 hover:text-gray-300 transition-colors animate-bounce"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </motion.button>
    </section>
  )
}
