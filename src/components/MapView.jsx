import React, { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAPBOX_TOKEN } from '../constants'

mapboxgl.accessToken = MAPBOX_TOKEN

function fmt(val, digits = 0) {
  return Number.isFinite(Number(val)) ? Number(val).toFixed(digits) : '—'
}

function fmtPrice(val) {
  if (!Number.isFinite(Number(val))) return '—'
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function popupHtml(home, rank) {
  const address = home.address ?? `Home #${home.listing_id}`
  const openHouse = home.next_open_house_start
    ? `<div style="margin-top:6px;padding:4px 6px;background:rgba(79,255,176,0.08);border:1px solid rgba(79,255,176,0.2);border-radius:6px;font-size:10px;color:#4fffb0">
        Open House: ${home.next_open_house_start} – ${home.next_open_house_end ?? ''}
       </div>`
    : ''

  const urlLink = home.url
    ? `<a href="${home.url}" target="_blank" style="display:block;margin-top:8px;text-align:center;font-size:10px;color:#4fffb0;text-decoration:underline">View Listing ↗</a>`
    : ''

  return `
    <div style="font-family:sans-serif;min-width:210px;font-size:12px;line-height:1.5">
      <div style="font-weight:700;font-size:13px;margin-bottom:2px;color:#e8ecf4">${address}</div>
      <div style="color:#5b6278;font-size:11px;margin-bottom:8px">${home.city ?? ''} ${home.zip ?? ''} · Rank #${rank ?? '—'}</div>

      <div style="font-size:20px;font-weight:800;color:#4fffb0;margin-bottom:6px">${fmtPrice(home.price)}</div>

      <div style="display:flex;gap:12px;margin-bottom:6px;color:#e8ecf4">
        <span>🛏 ${fmt(home.beds)} bd</span>
        <span>🚿 ${fmt(home.baths)} ba</span>
        <span>📐 ${home.square_feet ? Number(home.square_feet).toLocaleString() : '—'} sqft</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;color:#5b6278;font-size:11px;margin-bottom:4px">
        <span>$/sqft: <b style="color:#e8ecf4">${fmtPrice(home.price_per_sqft)}</b></span>
        <span>HOA: <b style="color:#e8ecf4">${home.hoa_month ? '$'+Number(home.hoa_month).toLocaleString()+'/mo' : '—'}</b></span>
        <span>Built: <b style="color:#e8ecf4">${fmt(home.year_built)}</b></span>
        <span>Days: <b style="color:#e8ecf4">${fmt(home.days_on_market)}</b></span>
        <span>Type: <b style="color:#e8ecf4">${home.property_type ?? '—'}</b></span>
        <span>Status: <b style="color:#e8ecf4">${home.status ?? '—'}</b></span>
      </div>

      <hr style="border:none;border-top:1px solid #232840;margin:6px 0"/>

      <div style="color:#5b6278;font-size:11px">
        Fit: <b style="color:#4fffb0">${fmt(home.fit_score, 3)}</b>
        &nbsp;·&nbsp; Quiet: ${fmt(home.quiet_score, 2)}
        &nbsp;·&nbsp; Green: ${fmt(home.green_score, 2)}
      </div>

      ${openHouse}
      ${urlLink}
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
  const mapRef          = useRef(null)
  const markersRef      = useRef({})
  const allMarkersRef   = useRef([])
  const popupRef        = useRef(null)

  const rankedHomesRef = useRef(rankedHomes)
  useEffect(() => { rankedHomesRef.current = rankedHomes }, [rankedHomes])

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
    popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, offset: 12, maxWidth: '280px' })
    popupRef.current.on('close', () => setActiveId(null))
    mapRef.current = map
    return () => { popupRef.current?.remove(); map.remove() }
  }, [setActiveId])

  // Fly to region
  useEffect(() => {
    if (!mapRef.current || !regionCenter) return
    mapRef.current.flyTo({ center: regionCenter, zoom: 11, duration: 800 })
  }, [regionCenter])

  // Build markers
  useEffect(() => {
    if (!mapRef.current || homes.length === 0) return
    const map = mapRef.current

    const existingIds = Object.keys(markersRef.current).sort().join(',')
    const newIds = homes.map(h => String(h.listing_id)).sort().join(',')
    if (existingIds === newIds) return

    const addMarkers = () => {
      allMarkersRef.current.forEach(m => m.remove())
      allMarkersRef.current = []
      markersRef.current = {}

      homes.forEach((home) => {
        if (!isValidSoCalCoord(home.lat, home.lon)) return

        const dot = document.createElement('div')
        dot.style.cssText = `
          width:10px;height:10px;border-radius:50%;
          background:#1f6f46;border:2px solid #ffffff;
          box-shadow:0 0 0 1px #1f6f46;cursor:pointer;
          transition:transform 0.15s ease,box-shadow 0.15s ease,background 0.15s ease;
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

  // Update marker colors on re-rank
  useEffect(() => {
    Object.values(markersRef.current).forEach(({ dot }) => {
      dot.style.background = '#1f6f46'
      dot.style.boxShadow  = '0 0 0 1px #1f6f46'
    })
    rankedHomes.forEach((home, i) => {
      const entry = markersRef.current[home.listing_id]
      if (!entry) return
      const color = i < 3 ? '#0f7a43' : '#1f6f46'
      entry.dot.style.background = color
      entry.dot.style.boxShadow  = `0 0 0 1px ${color}`
    })
  }, [rankedHomes])

  // Fly + popup on active
  useEffect(() => {
    if (!mapRef.current) return
    if (activeId === null) { popupRef.current?.remove(); return }

    const home = homes.find(h => h.listing_id === activeId)
    if (home && isValidSoCalCoord(home.lat, home.lon)) {
      mapRef.current.flyTo({ center: [home.lon, home.lat], zoom: Math.max(mapRef.current.getZoom(), 14), duration: 600 })

      const rankedEntry = rankedHomesRef.current.find(h => Number(h.listing_id) === Number(activeId)) ?? home
      const rankIndex   = rankedHomesRef.current.findIndex(h => Number(h.listing_id) === Number(activeId))
      const rank        = rankIndex >= 0 ? rankIndex + 1 : null
      const lngLat      = markersRef.current[activeId]?.marker.getLngLat() ?? { lng: home.lon, lat: home.lat }

      popupRef.current
        ?.setLngLat([lngLat.lng, lngLat.lat])
        .setHTML(popupHtml(rankedEntry ?? home, rank))
        .addTo(mapRef.current)
    }

    Object.entries(markersRef.current).forEach(([id, { dot }]) => {
      const isActive = Number(id) === Number(activeId)
      dot.style.transform = isActive ? 'scale(1.5)' : 'scale(1)'
      dot.style.boxShadow = isActive
        ? `0 0 0 2px #ffffff, 0 0 0 4px ${dot.style.background}`
        : `0 0 0 1px ${dot.style.background}`
    })
  }, [activeId, homes])

  return (
    <main className="h-full w-full overflow-hidden">
      <div ref={mapContainerRef} className="h-full w-full" />
    </main>
  )
}