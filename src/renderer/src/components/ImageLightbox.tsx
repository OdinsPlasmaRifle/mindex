import { useState, useEffect, useCallback, useRef } from 'react'
import { CloseIcon } from './icons'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 5
const ZOOM_STEP = 0.25

interface ImageLightboxProps {
  src: string
  alt: string
  onClose: () => void
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps): React.JSX.Element {
  const [view, setView] = useState({ zoom: 1, panX: 0, panY: 0 })
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const resetView = useCallback(() => {
    setView({ zoom: 1, panX: 0, panY: 0 })
  }, [])

  const zoomAtCenter = useCallback((delta: number) => {
    setView((v) => ({
      ...v,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom + delta))
    }))
  }, [])

  // Prevent background page scroll while lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case '=':
        case '+':
          zoomAtCenter(ZOOM_STEP)
          break
        case '-':
          zoomAtCenter(-ZOOM_STEP)
          break
        case '0':
          resetView()
          break
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, zoomAtCenter, resetView])

  // Use a native wheel listener with { passive: false } so preventDefault() actually works.
  // React's onWheel uses passive listeners by default, which can't prevent page scroll.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      const cx = e.clientX - window.innerWidth / 2
      const cy = e.clientY - window.innerHeight / 2
      setView((v) => {
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom + delta))
        const ratio = newZoom / v.zoom
        const newPanX = cx - (cx - v.panX) * ratio
        const newPanY = cy - (cy - v.panY) * ratio
        return { zoom: newZoom, panX: newPanX, panY: newPanY }
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setView((v) => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }))
  }, [])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current) onClose()
    },
    [onClose]
  )

  const isZoomed = view.zoom !== 1 || view.panX !== 0 || view.panY !== 0
  const zoomPercent = Math.round(view.zoom * 100)

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors cursor-pointer"
      >
        <CloseIcon className="w-8 h-8" />
      </button>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1.5 text-white">
        <button onClick={() => zoomAtCenter(-ZOOM_STEP)} className="p-1.5 hover:bg-white/15 rounded-full transition-colors cursor-pointer" title="Zoom out (-)">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M5 12h14" />
          </svg>
        </button>
        <span className="text-xs font-medium w-12 text-center select-none">{zoomPercent}%</span>
        <button onClick={() => zoomAtCenter(ZOOM_STEP)} className="p-1.5 hover:bg-white/15 rounded-full transition-colors cursor-pointer" title="Zoom in (+)">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </button>
        {isZoomed && (
          <button onClick={resetView} className="p-1.5 hover:bg-white/15 rounded-full transition-colors cursor-pointer ml-1" title="Reset (0)">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
            </svg>
          </button>
        )}
      </div>

      {/* Image */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl select-none"
        style={{
          transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
          cursor: dragging.current ? 'grabbing' : 'grab'
        }}
        draggable={false}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  )
}
