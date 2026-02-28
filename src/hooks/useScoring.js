import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchHomes, fetchRankedHomes } from '../api'

const DEFAULT_WEIGHTS = { quiet: 0.25, green: 0.25, activity: 0.25, light: 0.25 }

export function useScoring() {
  const [homes, setHomes]             = useState([])
  const [rankedHomes, setRankedHomes] = useState([])
  const [weights, setWeights]         = useState(DEFAULT_WEIGHTS)
  const [activeId, setActiveId]       = useState(null)
  const [loading, setLoading]         = useState(true)
  const debounceRef = useRef(null)

  // Load homes once on mount
  useEffect(() => {
    fetchHomes().then(data => {
      setHomes(data)
      setLoading(false)
    })
  }, [])

  // Re-rank whenever homes or weights change (debounced)
  useEffect(() => {
    if (homes.length === 0) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchRankedHomes(homes, weights.quiet, weights.green, weights.activity, weights.light)
        .then(setRankedHomes)
    }, 120)
    return () => clearTimeout(debounceRef.current)
  }, [homes, weights])

  const updateWeight = useCallback((key, value) => {
    setWeights(prev => ({ ...prev, [key]: value }))
  }, [])

  return { homes, rankedHomes, weights, updateWeight, activeId, setActiveId, loading }
}
