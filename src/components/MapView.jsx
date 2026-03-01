import React, { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAPBOX_TOKEN } from '../constants'

mapboxgl.accessToken = MAPBOX_TOKEN

function popupHtml(home, rank) {
  const fmt = (value, digits = 3) =>
    Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '-'

  return `
    <div style="font-size:12px;line-height:1.35;min-width:190px">
      <div style="font-weight:700;margin-bottom:6px">
        ${home.address ?? `Home #${home.listing_id}`}
      </div>
      <div style="margin-bottom:4px">Rank: <b>${rank ?? '-'}</b></div>
      <div>Fit: <b>${fmt(home.fit_score)}</b></div>
      <div>Quiet: ${fmt(home.quiet_score)}</div>
      <div>Green: ${fmt(home.green_score)}</div>
      <div>Activity: ${fmt(home.activity_score)}</div>
      <div>Light: ${fmt(home.light_score)}</div>
    </div>
  `
}

function isValidSoCalCoord(lat, lon) {
  return (
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat > 32.5 && lat < 35.0 &&
    lon > -119.0 && lon < -116.5
  )
}

export default function MapView({ homes, rankedHomes, activeId, setActiveId, regionCenter }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const allMarkersRef = useRef([])
  const popupRef = useRef(null)

  // Init map once
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-117.8, 33.68],
      zoom: 11,
      attributionControl: false,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
    popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, offset: 12 })
    popupRef.current.on('close', () => setActiveId(null))
    mapRef.current = map

    return () => {
      popupRef.current?.remove()
      map.remove()
    }
  }, [setActiveId])

  // Fly to region when dropdown changes
  useEffect(() => {
    if (!mapRef.current || !regionCenter) return
    mapRef.current.flyTo({ center: regionCenter, zoom: 11, duration: 800 })
  }, [regionCenter])

  // Build markers once when homes arrive — skip rebuild if same set
  useEffect(() => {
    if (!mapRef.current || homes.length === 0) return
    const map = mapRef.current

    const existingIds = Object.keys(markersRef.current).sort().join(',')
    const newIds = homes.map(h => String(h.listing_id)).sort().join(',')
    if (existingIds === newIds) return

    const addMarkers = () => {
      allMarkersRef.current.forEach((marker) => marker.remove())
      allMarkersRef.current = []
      markersRef.current = {}

      homes.forEach((home) => {
        // Skip bad coordinates
        if (!isValidSoCalCoord(home.lat, home.lon)) return

        const dot = document.createElement('div')
        dot.style.cssText = `
          width:10px;
          height:10px;
          border-radius:50%;
          background:#1f6f46;
          border:2px solid #ffffff;
          box-shadow:0 0 0 1px #1f6f46;
          cursor:pointer;
          transition:transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        `
        dot.addEventListener('click', () => setActiveId(home.listing_id))

        const marker = new mapboxgl.Marker({ element: dot, anchor: 'center' })
          .setLngLat([home.lon, home.lat])
          .addTo(map)

        allMarkersRef.current.push(marker)
        markersRef.current[home.listing_id] = { marker, dot }
      })
    }

    if (map.isStyleLoaded()) addMarkers()
    else map.once('load', addMarkers)
  }, [homes, setActiveId])

  // Update marker colors when ranking changes
  useEffect(() => {
    // Reset all to default first
    Object.values(markersRef.current).forEach(({ dot }) => {
      dot.style.background = '#1f6f46'
      dot.style.boxShadow  = '0 0 0 1px #1f6f46'
    })
    // Apply ranked colors
    rankedHomes.forEach((home, i) => {
      const entry = markersRef.current[home.listing_id]
      if (!entry) return
      const { dot } = entry
      if (i < 3) {
        dot.style.background = '#0f7a43'
        dot.style.boxShadow  = '0 0 0 1px #0f7a43'
      } else {
        dot.style.background = '#1f6f46'
        dot.style.boxShadow  = '0 0 0 1px #1f6f46'
      }
    })
  }, [rankedHomes])

  // Fly to active home + show popup
  useEffect(() => {
    if (!mapRef.current) return

    if (activeId === null) {
      popupRef.current?.remove()
      return
    }

    const home = homes.find((h) => h.listing_id === activeId)
    if (home && isValidSoCalCoord(home.lat, home.lon)) {
      mapRef.current.flyTo({
        center: [home.lon, home.lat],
        zoom: Math.max(mapRef.current.getZoom(), 14),
        duration: 600,
      })

      const rankedEntry = rankedHomes.find((h) => Number(h.listing_id) === Number(activeId)) ?? home
      const rankIndex   = rankedHomes.findIndex((h) => Number(h.listing_id) === Number(activeId))
      const rank        = rankIndex >= 0 ? rankIndex + 1 : null
      const marker      = markersRef.current[activeId]?.marker
      const lngLat      = marker ? marker.getLngLat() : { lng: home.lon, lat: home.lat }

      popupRef.current
        ?.setLngLat([lngLat.lng, lngLat.lat])
        .setHTML(popupHtml(rankedEntry, rank))
        .addTo(mapRef.current)
    }

    Object.entries(markersRef.current).forEach(([id, { dot }]) => {
      const isActive = Number(id) === Number(activeId)
      if (isActive) {
        dot.style.transform = 'scale(1.5)'
        dot.style.boxShadow = `0 0 0 2px #ffffff, 0 0 0 4px ${dot.style.background}`
      } else {
        dot.style.transform = 'scale(1)'
        dot.style.boxShadow =
          dot.style.background === 'rgb(15, 122, 67)' ? '0 0 0 1px #0f7a43' : '0 0 0 1px #1f6f46'
      }
    })
  }, [activeId, homes, rankedHomes])

  return (
    <main className="h-full w-full overflow-hidden">
      <div ref={mapContainerRef} className="h-full w-full" />
    </main>
  )
}