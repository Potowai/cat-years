const COLORS = [
  '#EF6A2F',
  '#F2C34A',
  '#6E9E78',
  '#4A8DB8',
  '#8A5A83',
  '#EC9A86',
]

export async function celebrate() {
  if (typeof window === 'undefined') return
  const { default: confetti } = await import('canvas-confetti')
  confetti({
    particleCount: 110,
    spread: 78,
    startVelocity: 42,
    origin: { y: 0.32 },
    colors: COLORS,
    scalar: 1.1,
  })
  window.setTimeout(
    () =>
      confetti({
        particleCount: 70,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.5 },
        colors: COLORS,
      }),
    130,
  )
  window.setTimeout(
    () =>
      confetti({
        particleCount: 70,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.5 },
        colors: COLORS,
      }),
    240,
  )
}
