import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchHomes, fetchRankedHomes } from '../api'

const DEFAULT_WEIGHTS = { quiet: 0.25, green: 0.25, activity: 0.25, light: 0.25 }

const REGIONS = {
  'Irvine, CA':           { center: [-117.800, 33.680], bounds: { minLat: 33.60, maxLat: 33.75, minLon: -117.92, maxLon: -117.67 } },
  'Newport Beach, CA':    { center: [-117.929, 33.617], bounds: { minLat: 33.57, maxLat: 33.67, minLon: -118.00, maxLon: -117.84 } },
  'Santa Ana, CA':        { center: [-117.867, 33.745], bounds: { minLat: 33.70, maxLat: 33.79, minLon: -117.95, maxLon: -117.78 } },
  'Anaheim, CA':          { center: [-117.911, 33.836], bounds: { minLat: 33.79, maxLat: 33.89, minLon: -118.00, maxLon: -117.80 } },
  'Fullerton, CA':        { center: [-117.924, 33.870], bounds: { minLat: 33.84, maxLat: 33.92, minLon: -118.00, maxLon: -117.84 } },
  'Garden Grove, CA':     { center: [-117.960, 33.774], bounds: { minLat: 33.74, maxLat: 33.82, minLon: -118.05, maxLon: -117.87 } },
  'Huntington Beach, CA': { center: [-118.000, 33.660], bounds: { minLat: 33.62, maxLat: 33.74, minLon: -118.08, maxLon: -117.92 } },
  'Lake Forest, CA':      { center: [-117.689, 33.647], bounds: { minLat: 33.61, maxLat: 33.70, minLon: -117.78, maxLon: -117.61 } },
  'Orange, CA':           { center: [-117.853, 33.787], bounds: { minLat: 33.75, maxLat: 33.84, minLon: -117.95, maxLon: -117.77 } },
}

function filterByRegion(homes, region) {
  const { bounds } = REGIONS[region] ?? REGIONS['Irvine, CA']
  return homes.filter(h =>
    h.lat >= bounds.minLat && h.lat <= bounds.maxLat &&
    h.lon >= bounds.minLon && h.lon <= bounds.maxLon
  )
}

export function useScoring() {
  const [allHomes, setAllHomes]       = useState([])   // full 350, never changes
  const [rankedHomes, setRankedHomes] = useState([])   // full ranked list from backend
  const [weights, setWeights]         = useState(DEFAULT_WEIGHTS)
  const [activeId, setActiveId]       = useState(null)
  const [loading, setLoading]         = useState(true)
  const [region, setRegion]           = useState('Irvine, CA')
  const [homeCount, setHomeCount]     = useState(10)
  const debounceRef = useRef(null)

  // Load ALL homes once on mount
  useEffect(() => {
    fetchHomes().then(data => {
      setAllHomes(data)
      setLoading(false)
    })
  }, [])

  // Re-rank whenever weights change (debounced) — backend ranks all 350
  useEffect(() => {
    if (allHomes.length === 0) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchRankedHomes(allHomes, weights.quiet, weights.green, weights.activity, weights.light)
        .then(setRankedHomes)
    }, 120)
    return () => clearTimeout(debounceRef.current)
  }, [allHomes, weights])

  const updateWeight = useCallback((key, value) => {
    setWeights(prev => ({ ...prev, [key]: value }))
  }, [])

  const updateRegion = useCallback((newRegion) => {
    setRegion(newRegion)
    setActiveId(null)
  }, [])

  const updateHomeCount = useCallback((count) => {
    setHomeCount(Number(count))
  }, [])

  // Homes visible on map = only those in the selected city
  const homes = filterByRegion(allHomes, region)

  // Ranked homes for the city = ranked list filtered to city homes, then sliced to homeCount
  const cityListingIds = new Set(homes.map(h => h.listing_id))
  const cityRankedHomes = rankedHomes.filter(h => cityListingIds.has(h.listing_id))

  return {
    homes,                                          // map markers (city only)
    rankedHomes: cityRankedHomes.slice(0, homeCount), // sidebar list (top N in city)
    allRankedHomes: cityRankedHomes,                // map colors (all ranked in city)
    weights,
    updateWeight,
    activeId,
    setActiveId,
    loading,
    region,
    updateRegion,
    homeCount,
    updateHomeCount,
    regionCenter: (REGIONS[region] ?? REGIONS['Irvine, CA']).center,
  }
}