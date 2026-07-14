import { useEffect, useRef } from 'react'

export default function BinaryRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let columns: number
    let drops: number[]

    const chars = '01'
    const fontSize = 14

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
      columns = Math.floor(canvas!.width / fontSize)
      drops = new Array(columns).fill(1).map(() => Math.random() * -100)
    }

    function draw() {
      ctx!.fillStyle = 'rgba(10, 14, 20, 0.05)'
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)
      ctx!.fillStyle = '#00ff9d'
      ctx!.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        ctx!.fillText(char, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas!.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }

      animationId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="binary-rain" />
}
