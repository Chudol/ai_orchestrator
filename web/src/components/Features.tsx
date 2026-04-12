import { features } from '../data/features'
import FeatureCard from './FeatureCard'
import ScrollReveal from './ScrollReveal'

interface Props {
  onImageClick: (src: string) => void
}

export default function Features({ onImageClick }: Props) {
  return (
    <section id="features" className="py-24 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              Built for{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                serious development
              </span>
            </h2>
            <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to manage Claude Code sessions, terminals, git repos, and configuration in a single powerful interface.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-24 md:space-y-32">
          {features.map((feature, i) => (
            <FeatureCard key={feature.id} feature={feature} index={i} onImageClick={onImageClick} />
          ))}
        </div>
      </div>
    </section>
  )
}
