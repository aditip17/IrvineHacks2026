import React, { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAPBOX_TOKEN } from '../constants'

mapboxgl.accessToken = MAPBOX_TOKEN

function buildPopupHTML(home, rank) {
  const fmt = (value, digits = 2) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-'

  const rows = [
    ['Fit Score', fmt(home.fit_score, 3)],
    ['Quiet', fmt(home.quiet_score)],
    ['Green', fmt(home.green_score)],
    ['Activity', fmt(home.activity_score)],
    ['Light', fmt(home.light_score)],
    ['POIs (500m)', fmt(home.poi_count_500m, 2)],
  ]

  return `
    <div style="font-family:'Syne',sans-serif">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#e8ecf4">
        Home #${home.home_id} <span style="font-size:11px;color:#5b6278;font-weight:400">· Rank #${rank}</span>
      </div>
      ${rows
        .map(
          ([label, value]) => `
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#5b6278;margin-bottom:4px">
          <span>${label}</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#e8ecf4">${value}</span>
        </div>`
        )
        .join('')}
    </div>
  `
}

export default function MapView({ homes, rankedHomes, activeId, setActiveId }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const allMarkersRef = useRef([])
  const popupRef = useRef(null)
  const initialFitDone = useRef(false)
  const rankedHomesRef = useRef(rankedHomes)
  const hideHoverOverlays = () => {
    Object.values(markersRef.current).forEach(({ rankEl }) => {
      rankEl.style.opacity = '0'
    })
    popupRef.current?.remove()
  }

  useEffect(() => {
    rankedHomesRef.current = rankedHomes
  }, [rankedHomes])

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-117.8, 33.68],
      zoom: 12.5,
      attributionControl: false,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
    popupRef.current = new mapboxgl.Popup({ closeButton: false, offset: 14 })
    map.on('movestart', hideHoverOverlays)
    mapRef.current = map

    return () => {
      map.off('movestart', hideHoverOverlays)
      map.remove()
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || homes.length === 0) return

    const map = mapRef.current
    const addMarkers = () => {
      popupRef.current?.remove()
      allMarkersRef.current.forEach((marker) => marker.remove())
      allMarkersRef.current = []
      markersRef.current = {}

      homes.forEach((home) => {
        const el = document.createElement('div')
        el.style.cssText = 'position:relative;cursor:pointer'
        let marker = null

        const rankEl = document.createElement('div')
        rankEl.id = `mrank-${home.home_id}`
        rankEl.style.cssText = `
          position:absolute;top:-20px;left:50%;transform:translateX(-50%);
          font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:500;
          background:#12161f;border:1px solid #232840;border-radius:3px;
          padding:1px 4px;color:#4fffb0;white-space:nowrap;
          opacity:0;transition:opacity 0.2s;pointer-events:none;
        `
        rankEl.textContent = '#-'

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
          hideHoverOverlays()
          rankEl.style.opacity = '1'
          const ranked = rankedHomesRef.current
          const entry = ranked.find((row) => row.home_id === home.home_id)
          const rank = entry ? ranked.indexOf(entry) + 1 : '-'
          const lngLat = marker ? marker.getLngLat() : { lng: home.lon, lat: home.lat }
          popupRef.current
            .setLngLat([lngLat.lng, lngLat.lat])
            .setHTML(buildPopupHTML(entry ?? home, rank))
            .addTo(map)
        })

        el.addEventListener('mouseleave', () => {
          rankEl.style.opacity = '0'
          popupRef.current?.remove()
        })

        el.addEventListener('click', () => setActiveId(home.home_id))

        marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([home.lon, home.lat])
          .addTo(map)

        allMarkersRef.current.push(marker)
        markersRef.current[home.home_id] = { marker, dot, rankEl }
      })

      if (!initialFitDone.current && homes.length > 1) {
        const lons = homes.map((h) => h.lon)
        const lats = homes.map((h) => h.lat)
        map.fitBounds(
          [
            [Math.min(...lons) - 0.01, Math.min(...lats) - 0.01],
            [Math.max(...lons) + 0.01, Math.max(...lats) + 0.01],
          ],
          { padding: 60, duration: 1000 }
        )
        initialFitDone.current = true
      }
    }

    if (map.isStyleLoaded()) addMarkers()
    else map.once('load', addMarkers)
  }, [homes, setActiveId])

  useEffect(() => {
    rankedHomes.forEach((home, i) => {
      const entry = markersRef.current[home.home_id]
      if (!entry) return
      const { dot, rankEl } = entry
      const size = i < 3 ? '20px' : '14px'
      dot.style.background = '#11472f'
      dot.style.border = '3px solid #ffffff'
      dot.style.boxShadow = '0 0 0 2px #11472f'
      dot.style.width = size
      dot.style.height = size
      rankEl.textContent = `#${i + 1}`
    })
  }, [rankedHomes])

  useEffect(() => {
    if (activeId === null || !mapRef.current) return

    const home = homes.find((h) => h.home_id === activeId)
    if (home) {
      mapRef.current.flyTo({
        center: [home.lon, home.lat],
        zoom: Math.max(mapRef.current.getZoom(), 14),
        duration: 600,
      })
    }

    Object.entries(markersRef.current).forEach(([id, { dot }]) => {
      const isActive = Number(id) === Number(activeId)
      dot.style.transform = isActive ? 'scale(1.6)' : 'scale(1)'
      dot.style.boxShadow = isActive ? `0 0 12px ${dot.style.background}` : 'none'
    })
  }, [activeId, homes])

  return (
    <main className="relative overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 bg-bg/80 backdrop-blur border border-border rounded-lg px-3 py-2 pointer-events-none">
        <span className="font-mono text-xs text-muted">
          Ranked: <b className="text-accent">{rankedHomes.length}</b> homes
          &nbsp;·&nbsp; Click marker or list item
        </span>
      </div>
    </main>
  )
}
