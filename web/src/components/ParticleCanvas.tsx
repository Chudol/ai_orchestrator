import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  opacity: number
}

interface GlowBlob {
  x: number
  y: number
  radius: number
  color: [number, number, number]
  speedX: number
  speedY: number
  phase: number
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let mouseX = -1000
    let mouseY = -1000
    const isMobile = window.innerWidth < 768

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouse)
    }

    const particleCount = isMobile ? 30 : 65
    const connectionDistance = isMobile ? 100 : 140
    const colors = [
      'rgba(255, 255, 255,',
      'rgba(59, 130, 246,',
      'rgba(168, 85, 247,',
      'rgba(96, 165, 250,',
    ]

    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.4 + 0.1,
    }))

    const blobs: GlowBlob[] = [
      { x: 0.3, y: 0.3, radius: 400, color: [59, 130, 246], speedX: 0.0002, speedY: 0.0003, phase: 0 },
      { x: 0.7, y: 0.6, radius: 350, color: [168, 85, 247], speedX: -0.0003, speedY: 0.0002, phase: 2 },
      { x: 0.5, y: 0.8, radius: 300, color: [99, 102, 241], speedX: 0.0002, speedY: -0.0002, phase: 4 },
    ]

    let time = 0

    const animate = () => {
      if (document.hidden) {
        animationId = requestAnimationFrame(animate)
        return
      }

      time++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw glow blobs
      for (const blob of blobs) {
        const bx = (blob.x + Math.sin(time * blob.speedX + blob.phase) * 0.15) * canvas.width
        const by = (blob.y + Math.cos(time * blob.speedY + blob.phase) * 0.15) * canvas.height
        const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, blob.radius)
        gradient.addColorStop(0, `rgba(${blob.color[0]}, ${blob.color[1]}, ${blob.color[2]}, 0.06)`)
        gradient.addColorStop(1, `rgba(${blob.color[0]}, ${blob.color[1]}, ${blob.color[2]}, 0)`)
        ctx.fillStyle = gradient
        ctx.fillRect(bx - blob.radius, by - blob.radius, blob.radius * 2, blob.radius * 2)
      }

      // Update and draw particles
      for (const p of particles) {
        // Mouse repulsion
        if (!isMobile) {
          const dx = p.x - mouseX
          const dy = p.y - mouseY
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            const force = (150 - dist) / 150 * 0.02
            p.vx += (dx / dist) * force
            p.vy += (dy / dist) * force
          }
        }

        p.x += p.vx
        p.y += p.vy

        // Dampen velocity
        p.vx *= 0.999
        p.vy *= 0.999

        // Wrap edges
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color} ${p.opacity})`
        ctx.fill()
      }

      // Draw connections
      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * 0.15
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(148, 163, 184, ${opacity})`
            ctx.stroke()
          }
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
