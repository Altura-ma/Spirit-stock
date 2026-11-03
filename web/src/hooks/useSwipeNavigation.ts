import { useRef, TouchEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const MIN_DISTANCE = 70 // px
const MAX_ANGLE_RATIO = 0.6 // |dy| / |dx| must stay below this to count as horizontal
const MAX_DURATION = 600 // ms

/** True if the touch started on something that handles horizontal gestures itself. */
function isIgnoredTarget(target: EventTarget | null): boolean {
  let el = target as HTMLElement | null
  while (el && el !== document.body) {
    if (el.dataset?.noSwipe !== undefined) return true
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflowX = getComputedStyle(el).overflowX
      if (overflowX === 'auto' || overflowX === 'scroll') return true
    }
    el = el.parentElement
  }
  return false
}

/**
 * Swipe left/right on the page content to move between the bottom-nav tabs.
 * `paths` are the tab routes in display order; `exactRoots` are matched exactly (e.g. "/").
 */
export function useSwipeNavigation(paths: string[], exactRoots: string[] = []) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const start = useRef<{ x: number; y: number; t: number; ignore: boolean } | null>(null)

  const currentIndex = (() => {
    // Longest matching prefix wins so "/supplier/catalog" beats "/supplier".
    let best = -1, bestLen = -1
    paths.forEach((p, i) => {
      const match = exactRoots.includes(p) ? pathname === p : pathname === p || pathname.startsWith(p + '/')
      if (match && p.length > bestLen) { best = i; bestLen = p.length }
    })
    return best
  })()

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) { start.current = null; return }
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY, t: Date.now(), ignore: isIgnoredTarget(e.target) }
  }

  const onTouchEnd = (e: TouchEvent) => {
    const s = start.current
    start.current = null
    if (!s || s.ignore || currentIndex < 0) return
    // Only swipe from a top-level tab page, not from nested screens (forms, details).
    if (paths[currentIndex] !== pathname) return
    if (document.querySelector('[data-modal-open]')) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Date.now() - s.t > MAX_DURATION) return
    if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dy) / Math.abs(dx) > MAX_ANGLE_RATIO) return
    const next = dx < 0 ? currentIndex + 1 : currentIndex - 1
    if (next < 0 || next >= paths.length) return
    if ('vibrate' in navigator) navigator.vibrate?.(5)
    navigate(paths[next])
  }

  return { onTouchStart, onTouchEnd, currentIndex }
}
