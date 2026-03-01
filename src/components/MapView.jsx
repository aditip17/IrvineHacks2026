import React, { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAPBOX_TOKEN, scoreColor } from '../constants'

mapboxgl.accessToken = MAPBOX_TOKEN

function buildPopupHTML(home, rank) {
  const rows = [
    ['Fit Score',      home.fit_score?.toFixed(3) ?? '—'],
    ['Quiet',          home.quiet_score.toFixed(2)],
    ['Green',          home.green_score.toFixed(2)],
    ['Activity',       home.activity_score.toFixed(2)],
    ['Light',          home.light_score.toFixed(2)],
    ['POIs (500m)',    home.poi_count_500m],
  ]
  return `
    <div style="font-family:'Syne',sans-serif">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#e8ecf4">
        Home #${home.home_id} <span style="font-size:11px;color:#5b6278;font-weight:400">· Rank #${rank}</span>
      </div>
      ${rows.map(([l, v]) => `
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#5b6278;margin-bottom:4px">
          <span>${l}</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#e8ecf4">${v}</span>
        </div>`).join('')}
    </div>
  `
}

export default function MapView({ homes, rankedHomes, activeId, setActiveId }) {
  const mapContainerRef = useRef(null)
  const mapRef          = useRef(null)
  const markersRef      = useRef({})   // home_id → { marker, el }
  const popupRef        = useRef(null)
  const initialFitDone  = useRef(false)

  // Init map once
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-117.800, 33.680],
      zoom: 12.5,
      attributionControl: false,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
    popupRef.current = new mapboxgl.Popup({ closeButton: false, offset: 14 })
    mapRef.current = map

    return () => map.remove()
  }, [])

  // Build markers when homes arrive
  useEffect(() => {
    if (!mapRef.current || homes.length === 0) return

    const map = mapRef.current

    const addMarkers = () => {
      // Clear old markers
      Object.values(markersRef.current).forEach(({ marker }) => marker.remove())
      markersRef.current = {}

      homes.forEach(home => {
        const el = document.createElement('div')
        el.style.cssText = 'position:relative;cursor:pointer'

        const rankEl = document.createElement('div')
        rankEl.id = `mrank-${home.home_id}`
        rankEl.style.cssText = `
          position:absolute;top:-20px;left:50%;transform:translateX(-50%);
          font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:500;
          background:#12161f;border:1px solid #232840;border-radius:3px;
          padding:1px 4px;color:#4fffb0;white-space:nowrap;
          opacity:0;transition:opacity 0.2s;pointer-events:none;
        `
        rankEl.textContent = '#—'

        const dot = document.createElement('div')
        dot.id = `mdot-${home.home_id}`
        dot.style.cssText = `
          width:14px;height:14px;border-radius:50%;
          background:#11472f;border:3px solid #ffffff;box-shadow:0 0 0 2px #11472f;
          transition:transform 0.2s,box-shadow 0.2s,width 0.3s,height 0.3s;
        `

        el.appendChild(rankEl)
        el.appendChild(dot)

        el.addEventListener('mouseenter', () => {
          rankEl.style.opacity = '1'
          const ranked = rankedHomesRef.current
          const entry  = ranked.find(r => r.home_id === home.home_id)
          const rank   = ranked.indexOf(entry) + 1
          if (entry) {
            popupRef.current
              .setLngLat([home.lon, home.lat])
              .setHTML(buildPopupHTML(entry, rank))
              .addTo(map)
          }
        })
        el.addEventListener('mouseleave', () => {
          rankEl.style.opacity = '0'
          popupRef.current.remove()
        })
        el.addEventListener('click', () => setActiveId(home.home_id))

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([home.lon, home.lat])
          .addTo(map)

        markersRef.current[home.home_id] = { marker, el, dot, rankEl }
      })

      // Fit bounds once
      if (!initialFitDone.current && homes.length > 1) {
        const lons = homes.map(h => h.lon)
        const lats = homes.map(h => h.lat)
        map.fitBounds(
          [[Math.min(...lons) - 0.01, Math.min(...lats) - 0.01],
           [Math.max(...lons) + 0.01, Math.max(...lats) + 0.01]],
          { padding: 60, duration: 1000 }
        )
        initialFitDone.current = true
      }
    }

    if (map.isStyleLoaded()) addMarkers()
    else map.on('load', addMarkers)
  }, [homes, setActiveId])

  // Keep a ref to rankedHomes so popup handler can access latest without re-adding listeners
  const rankedHomesRef = useRef(rankedHomes)
  useEffect(() => { rankedHomesRef.current = rankedHomes }, [rankedHomes])

  // Update marker colors & ranks when ranking changes
  useEffect(() => {
    rankedHomes.forEach((home, i) => {
      const entry = markersRef.current[home.home_id]
      if (!entry) return
      const { dot, rankEl } = entry
      const color = scoreColor(home.fit_score ?? 0)
      const size  = i < 3 ? '20px' : '14px'
      dot.style.background = '#11472f'
      dot.style.border = '3px solid #ffffff'
      dot.style.boxShadow = '0 0 0 2px #11472f'
      dot.style.width       = size
      dot.style.height      = size
      rankEl.textContent    = `#${i + 1}`
    })
  }, [rankedHomes])

  // Fly to active home & highlight its marker
  useEffect(() => {
    if (activeId === null || !mapRef.current) return

    const home = homes.find(h => h.home_id === activeId)
    if (home) {
      mapRef.current.flyTo({
        center: [home.lon, home.lat],
        zoom: Math.max(mapRef.current.getZoom(), 14),
        duration: 600,
      })
    }

    // Visual highlight
    Object.entries(markersRef.current).forEach(([id, { dot }]) => {
      const isActive = parseInt(id) === activeId
      dot.style.transform = isActive ? 'scale(1.6)' : 'scale(1)'
      dot.style.boxShadow = isActive ? `0 0 12px ${dot.style.background}` : 'none'
    })
  }, [activeId, homes])

  return (
    <main className="relative overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Overlay badge */}
      <div className="absolute top-4 left-4 bg-bg/80 backdrop-blur border border-border rounded-lg px-3 py-2 pointer-events-none">
        <span className="font-mono text-xs text-muted">
          Ranked: <b className="text-accent">{rankedHomes.length}</b> homes
          &nbsp;·&nbsp; Click marker or list item
        </span>
      </div>
    </main>
  )
}
