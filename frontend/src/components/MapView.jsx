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
        ${home.address ?? `Home #${home.home_id}`}
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

export default function MapView({ homes, rankedHomes, activeId, setActiveId }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const allMarkersRef = useRef([])
  const popupRef = useRef(null)
  const initialFitDone = useRef(false)

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
    popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, offset: 12 })
    popupRef.current.on('close', () => setActiveId(null))
    mapRef.current = map

    return () => {
      popupRef.current?.remove()
      map.remove()
    }
  }, [setActiveId])

  useEffect(() => {
    if (!mapRef.current || homes.length === 0) return

    const map = mapRef.current
    const addMarkers = () => {
      allMarkersRef.current.forEach((marker) => marker.remove())
      allMarkersRef.current = []
      markersRef.current = {}

      homes.forEach((home) => {
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
        dot.addEventListener('click', () => setActiveId(home.home_id))

        const marker = new mapboxgl.Marker({ element: dot, anchor: 'center' })
          .setLngLat([home.lon, home.lat])
          .addTo(map)

        allMarkersRef.current.push(marker)
        markersRef.current[home.home_id] = { marker, dot }
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
      const { dot } = entry
      if (i < 3) {
        dot.style.background = '#0f7a43'
        dot.style.boxShadow = '0 0 0 1px #0f7a43'
      } else {
        dot.style.background = '#1f6f46'
        dot.style.boxShadow = '0 0 0 1px #1f6f46'
      }
    })
  }, [rankedHomes])

  useEffect(() => {
    if (!mapRef.current) return

    if (activeId === null) {
      popupRef.current?.remove()
      return
    }

    const home = homes.find((h) => h.home_id === activeId)
    if (home) {
      mapRef.current.flyTo({
        center: [home.lon, home.lat],
        zoom: Math.max(mapRef.current.getZoom(), 14),
        duration: 600,
      })

      const rankedEntry = rankedHomes.find((h) => Number(h.home_id) === Number(activeId)) ?? home
      const rankIndex = rankedHomes.findIndex((h) => Number(h.home_id) === Number(activeId))
      const rank = rankIndex >= 0 ? rankIndex + 1 : null
      const marker = markersRef.current[activeId]?.marker
      const lngLat = marker ? marker.getLngLat() : { lng: home.lon, lat: home.lat }

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
