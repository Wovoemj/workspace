'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'

type ProductLike = {
  id: string | number
  name?: string
  price?: number
  rating?: number
  location?: any
}

function getLatLng(p: ProductLike) {
  const loc = p.location || {}
  const lat = loc?.coordinates?.lat ?? loc?.latitude ?? loc?.lat
  const lng = loc?.coordinates?.lng ?? loc?.longitude ?? loc?.lng
  const nlat = typeof lat === 'number' ? lat : Number(lat)
  const nlng = typeof lng === 'number' ? lng : Number(lng)
  if (!Number.isFinite(nlat) || !Number.isFinite(nlng)) return null
  return { lat: nlat, lng: nlng }
}

declare global {
  interface Window {
    L?: any
  }
}

let leafletLoaderPromise: Promise<any> | null = null

async function ensureLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return null
  if (window.L) return window.L
  if (leafletLoaderPromise) return leafletLoaderPromise

  leafletLoaderPromise = new Promise((resolve, reject) => {
    const linkHref = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    const jsSrc = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

    const ensureLink = () => {
      const existing = document.querySelector(`link[href="${linkHref}"]`)
      if (existing) return
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = linkHref
      document.head.appendChild(link)
    }

    ensureLink()

    const script = document.createElement('script')
    script.src = jsSrc
    script.async = true
    script.onload = () => {
      const L = window.L
      if (!L) {
        reject(new Error('Leaflet loaded but window.L is missing'))
        return
      }

      // Fix default icon urls (CDN).
      const iconBase = 'https://unpkg.com/leaflet@1.9.4/dist/images/'
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: `${iconBase}marker-icon-2x.png`,
        iconUrl: `${iconBase}marker-icon.png`,
        shadowUrl: `${iconBase}marker-shadow.png`,
      })
      resolve(L)
    }
    script.onerror = () => reject(new Error('Failed to load Leaflet JS'))
    document.body.appendChild(script)
  })

  return leafletLoaderPromise
}

type LeafletMapProps = {
  products: ProductLike[]
  selectedId: string | null
  onSelect: (id: string) => void
  heightClass?: string
  style?: CSSProperties
}

export function LeafletMap({ products, selectedId, onSelect, heightClass = 'h-[560px]', style }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())

  const markers = useMemo(() => {
    return products
      .map((p) => {
        const coords = getLatLng(p)
        if (!coords) return null
        return { product: p, coords }
      })
      .filter(Boolean) as Array<{ product: ProductLike; coords: { lat: number; lng: number } }>
  }, [products])

  useEffect(() => {
    let cancelled = false
    async function init() {
      const L = await ensureLeaflet()
      if (cancelled || !L) return
      if (!containerRef.current) return

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  // 1) 产品变化时：重建 marker 并自动适配地图范围
  useEffect(() => {
    const L = typeof window !== 'undefined' ? window.L : null
    const map = mapRef.current
    if (!L || !map) return

    // Remove old markers.
    for (const marker of markersRef.current.values()) {
      try {
        marker.remove()
      } catch {
        // ignore
      }
    }
    markersRef.current.clear()

    const bounds: any[] = []

    for (const m of markers) {
      const id = String(m.product.id)
      bounds.push([m.coords.lat, m.coords.lng])

      const popupHtml = `
        <div style="min-width:140px">
          <div style="font-weight:700; margin-bottom:4px">${m.product.name ? String(m.product.name) : '产品'}</div>
          <div style="font-size:12px; opacity:0.9">${m.product.location?.city ? String(m.product.location.city) : ''}</div>
          <div style="font-size:12px; margin-top:4px; color:#0ea5e9; font-weight:700">¥${Number(m.product.price || 0).toLocaleString()}</div>
        </div>
      `

      const marker = L.marker([m.coords.lat, m.coords.lng])
      marker.addTo(map)
      marker.bindPopup(popupHtml)
      marker.on('click', () => onSelect(id))
      markersRef.current.set(id, marker)
    }

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [40, 40], animate: true })
    }
  }, [markers, onSelect])

  // 2) 选中变化时：只定位到对应 marker
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    if (!markersRef.current.has(selectedId)) return

    const marker = markersRef.current.get(selectedId)
    try {
      const ll = marker.getLatLng()
      map.setView([ll.lat, ll.lng], 14, { animate: true })
      marker.openPopup()
    } catch {
      // ignore
    }
  }, [selectedId])

  return (
    <div
      ref={containerRef}
      className={heightClass}
      style={{
        width: '100%',
        borderRadius: '14px',
        overflow: 'hidden',
        ...style,
      }}
    />
  )
}

