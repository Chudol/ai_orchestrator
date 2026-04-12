import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  direction?: 'up' | 'left' | 'right'
  delay?: number
  className?: string
}

export default function ScrollReveal({ children, direction = 'up', delay = 0, className }: Props) {
  const offsets = {
    up: { x: 0, y: 40 },
    left: { x: -60, y: 0 },
    right: { x: 60, y: 0 },
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: offsets[direction].x, y: offsets[direction].y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
