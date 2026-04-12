import { useState } from 'react'
import ParticleCanvas from './components/ParticleCanvas'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Footer from './components/Footer'
import Lightbox from './components/Lightbox'

export default function App() {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  return (
    <>
      <ParticleCanvas />
      <div className="relative z-10">
        <Navbar />
        <Hero onImageClick={setLightboxSrc} />
        <Features onImageClick={setLightboxSrc} />
        <Footer />
      </div>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  )
}
