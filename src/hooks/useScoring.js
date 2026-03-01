import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

export const DEFAULT_FILTERS = {
  minPrice:      '',
  maxPrice:      '',
  minBeds:       '',
  minBaths:      '',
  propertyType:  'Any',
  maxDaysOnMarket: '',
}

function applyFilters(homes, filters) {
  return homes.filter(h => {
    if (filters.minPrice      !== '' && (h.price      ?? Infinity) < Number(filters.minPrice))      return false
    if (filters.maxPrice      !== '' && (h.price      ?? 0)        > Number(filters.maxPrice))      return false
    if (filters.minBeds       !== '' && (h.beds       ?? 0)        < Number(filters.minBeds))       return false
    if (filters.minBaths      !== '' && (h.baths      ?? 0)        < Number(filters.minBaths))      return false
    if (filters.maxDaysOnMarket !== '' && (h.days_on_market ?? Infinity) > Number(filters.maxDaysOnMarket)) return false
    if (filters.propertyType  !== 'Any' && h.property_type !== filters.propertyType) return false
    return true
  })
}

export function useScoring() {
  const [allHomes, setAllHomes]       = useState([])
  const [rankedHomes, setRankedHomes] = useState([])
  const [weights, setWeights]         = useState(DEFAULT_WEIGHTS)
  const [activeId, setActiveId]       = useState(null)
  const [loading, setLoading]         = useState(true)
  const [region, setRegion]           = useState('Irvine, CA')
  const [homeCount, setHomeCount]     = useState(10)
  const [filters, setFilters]         = useState(DEFAULT_FILTERS)
  const debounceRef = useRef(null)

  useEffect(() => {
    fetchHomes().then(data => {
      setAllHomes(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (allHomes.length === 0) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchRankedHomes(allHomes, weights.quiet, weights.green, weights.activity, weights.light)
        .then(setRankedHomes)
    }, 120)
    return () => clearTimeout(debounceRef.current)
  }, [allHomes, weights])

  const updateWeight     = useCallback((key, value) => setWeights(prev => ({ ...prev, [key]: value })), [])
  const updateRegion     = useCallback((r) => { setRegion(r); setActiveId(null) }, [])
  const updateHomeCount  = useCallback((n) => setHomeCount(Number(n)), [])
  const updateFilter     = useCallback((key, value) => setFilters(prev => ({ ...prev, [key]: value })), [])
  const resetFilters     = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  // Derive property types from loaded data
  const propertyTypes = useMemo(() => {
    const types = [...new Set(allHomes.map(h => h.property_type).filter(Boolean))]
    return ['Any', ...types.sort()]
  }, [allHomes])

  // 1. Filter by region bounding box
  const regionBounds = (REGIONS[region] ?? REGIONS['Irvine, CA']).bounds
  const regionHomes = allHomes.filter(h =>
    h.lat >= regionBounds.minLat && h.lat <= regionBounds.maxLat &&
    h.lon >= regionBounds.minLon && h.lon <= regionBounds.maxLon
  )

  // 2. Apply listing filters
  const filteredHomes = applyFilters(regionHomes, filters)

  // 3. Get ranked list for filtered homes only
  const filteredIds = new Set(filteredHomes.map(h => h.listing_id))
  const filteredRanked = rankedHomes.filter(h => filteredIds.has(h.listing_id))

  return {
    homes:            filteredHomes,                        // map markers
    rankedHomes:      filteredRanked.slice(0, homeCount),   // sidebar list (top N)
    allRankedHomes:   filteredRanked,                       // map colors (all in region)
    weights,          updateWeight,
    activeId,         setActiveId,
    loading,
    region,           updateRegion,
    homeCount,        updateHomeCount,
    filters,          updateFilter,    resetFilters,
    propertyTypes,
    regionCenter: (REGIONS[region] ?? REGIONS['Irvine, CA']).center,
  }
}