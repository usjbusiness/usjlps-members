import { useEffect, useRef } from 'react'

/** Gold constellation: drifting nodes, links and travelling light pulses (same language as usjlps.org/join). */
export function Net({ density = 1, className = '' }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext('2d')!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, raf = 0, dpr = 1
    type N = { x: number; y: number; vx: number; vy: number; r: number }
    let nodes: N[] = []
    const pulses: { a: number; b: number; t: number; s: number }[] = []
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1); w = c.clientWidth; h = c.clientHeight
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.round(Math.min(90, (w * h) / 16000) * density)
      nodes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18, r: Math.random() * 1.4 + .6 }))
    }
    const D = 150
    const frame = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of nodes) { p.x += p.vx; p.y += p.vy; if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20; if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20 }
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]; const dx = a.x - b.x, dy = a.y - b.y; const d = Math.hypot(dx, dy)
        if (d < D) { ctx.strokeStyle = `rgba(201,165,76,${(1 - d / D) * .22})`; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke() }
      }
      for (const p of nodes) { ctx.fillStyle = 'rgba(233,212,154,.75)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill() }
      if (!reduce && Math.random() < .05 && nodes.length > 2) {
        const a = Math.floor(Math.random() * nodes.length); let best = -1, bd = 1e9
        nodes.forEach((n, k) => { if (k === a) return; const d = Math.hypot(n.x - nodes[a].x, n.y - nodes[a].y); if (d < D && d < bd) { bd = d; best = k } })
        if (best >= 0) pulses.push({ a, b: best, t: 0, s: .012 + Math.random() * .01 })
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]; p.t += p.s; if (p.t >= 1) { pulses.splice(i, 1); continue }
        const A = nodes[p.a], B = nodes[p.b]; const x = A.x + (B.x - A.x) * p.t, y = A.y + (B.y - A.y) * p.t
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7); g.addColorStop(0, 'rgba(255,241,194,.95)'); g.addColorStop(1, 'rgba(201,165,76,0)')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill()
      }
      if (!reduce) raf = requestAnimationFrame(frame)
    }
    resize(); frame()
    const ro = new ResizeObserver(() => { resize(); if (reduce) frame() }); ro.observe(c)
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden && !reduce) raf = requestAnimationFrame(frame) }
    document.addEventListener('visibilitychange', vis)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis) }
  }, [density])
  return <canvas ref={ref} className={`net ${className}`} aria-hidden="true" />
}
