import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  src: string | null
  onClose: () => void
}

export default function Lightbox({ src, onClose }: Props) {
  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 cursor-pointer"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-10 text-gray-400 hover:text-white transition-colors bg-gray-800/60 hover:bg-gray-700/80 rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="5" y1="15" x2="15" y2="5" />
            </svg>
          </button>

          {/* Image */}
          <motion.img
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            src={src}
            alt=""
            className="relative z-10 max-w-full max-h-full rounded-xl shadow-2xl shadow-black/50 object-contain cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
