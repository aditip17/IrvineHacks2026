import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchHomes, fetchRankedHomes } from '../api'

const DEFAULT_WEIGHTS = { quiet: 0.25, green: 0.25, activity: 0.25, light: 0.25 }
const DEFAULT_REGION = 'Irvine'

function normalizeHomes(rows) {
  return rows
    .map((row) => ({
      ...row,
      home_id: row.home_id ?? row.listing_id,
      lat: Number(row.lat),
      lon: Number(row.lon),
    }))
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon) && row.home_id != null)
}

export function useScoring() {
  const [homes, setHomes]             = useState([])
  const [rankedHomes, setRankedHomes] = useState([])
  const [weights, setWeights]         = useState(DEFAULT_WEIGHTS)
  const [region, setRegion]           = useState(DEFAULT_REGION)
  const [activeId, setActiveId]       = useState(null)
  const [loading, setLoading]         = useState(true)
  const debounceRef = useRef(null)

  // Load homes whenever region changes
  useEffect(() => {
    setLoading(true)
    fetchHomes(region)
      .then((data) => {
        const normalized = normalizeHomes(data)
        setHomes(normalized)
        setRankedHomes([])
        setActiveId(null)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load homes', err)
        setHomes([])
        setRankedHomes([])
        setLoading(false)
      })
  }, [region])

  // Re-rank whenever homes or weights change (debounced)
  useEffect(() => {
    if (homes.length === 0) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchRankedHomes(
        homes,
        weights.quiet,
        weights.green,
        weights.activity,
        weights.light,
        region
      )
        .then((data) => setRankedHomes(normalizeHomes(data)))
        .catch((err) => {
          console.error('Failed to rank homes', err)
          setRankedHomes([])
        })
    }, 120)
    return () => clearTimeout(debounceRef.current)
  }, [homes, weights, region])

  const updateWeight = useCallback((key, value) => {
    setWeights(prev => ({ ...prev, [key]: value }))
  }, [])

  return {
    homes,
    rankedHomes,
    weights,
    updateWeight,
    activeId,
    setActiveId,
    loading,
    region,
    setRegion,
  }
}
