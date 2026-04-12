import { motion } from 'framer-motion'
import type { Feature } from '../data/features'

interface Props {
  feature: Feature
  index: number
  onImageClick: (src: string) => void
}

export default function FeatureCard({ feature, index, onImageClick }: Props) {
  const isReversed = index % 2 === 1

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${isReversed ? 'lg:direction-rtl' : ''}`}>
      {/* Screenshot */}
      <motion.div
        initial={{ opacity: 0, x: isReversed ? 60 : -60 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className={isReversed ? 'lg:order-2' : ''}
      >
        <div
          className="rounded-xl overflow-hidden border border-gray-700/40 shadow-2xl shadow-blue-500/5 group cursor-pointer"
          onClick={() => onImageClick(feature.image)}
        >
          <img
            src={feature.image}
            alt={feature.title}
            className="w-full block transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, x: isReversed ? -60 : 60 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
        className={isReversed ? 'lg:order-1' : ''}
      >
        <h3 className="text-2xl md:text-3xl font-bold text-white">{feature.title}</h3>
        <p className="mt-2 text-sm md:text-base text-purple-400 font-medium">{feature.subtitle}</p>
        <p className="mt-4 text-gray-400 leading-relaxed">{feature.description}</p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {feature.highlights.map((h) => (
            <div key={h} className="flex items-start gap-2">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-400 mt-0.5 shrink-0"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm text-gray-300">{h}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
