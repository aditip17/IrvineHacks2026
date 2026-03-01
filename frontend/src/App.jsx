import React from 'react'
import MapView from './components/MapView'
import SliderPanel from './components/SliderPanel'
import HomeList from './components/HomeList'
import { useScoring } from './hooks/useScoring'

const REGIONS = [
  'Irvine',
  'Newport Beach',
  'Santa Ana',
  'Anaheim',
  'Fullerton',
  'Garden Grove',
  'Huntington Beach',
  'Lake Forest',
  'Orange',
]

function Header({ homeCount, region, setRegion }) {
  return (
    <header className="col-span-3 z-10 flex items-center gap-4 border-b border-border bg-surface px-5">
      <div className="text-lg font-semibold text-accent">NeighborhoodFit</div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Region:</span>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded border border-border bg-white px-2 py-1 text-xs text-accent"
        >
          {REGIONS.map((name) => (
            <option key={name} value={name}>{name}, CA</option>
          ))}
        </select>
      </div>
      <div className="text-xs text-muted">Homes: {homeCount}</div>
    </header>
  )
}

function LoadingBadge({ loading }) {
  if (!loading) return null
  return (
    <div className="absolute right-3 top-3 z-20 rounded border border-gray-300 bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-sm backdrop-blur">
      Loading homes...
    </div>
  )
}

export default function App() {
  const {
    homes,
    rankedHomes,
    weights,
    updateWeight,
    activeId,
    setActiveId,
    loading,
    region,
    setRegion,
  } = useScoring()

  const topRankedHomes = rankedHomes.slice(0, 25)

  return (
    <div
      className="grid h-screen"
      style={{ gridTemplateColumns: '300px 1fr 340px', gridTemplateRows: '56px 1fr' }}
    >
      <Header homeCount={homes.length} region={region} setRegion={setRegion} />

      <SliderPanel
        weights={weights}
        updateWeight={updateWeight}
        topHome={rankedHomes[0] ?? null}
      />

      <div className="relative">
        <LoadingBadge loading={loading} />
        <MapView
          homes={homes}
          rankedHomes={rankedHomes}
          activeId={activeId}
          setActiveId={setActiveId}
        />
      </div>

      <HomeList
        rankedHomes={topRankedHomes}
        activeId={activeId}
        setActiveId={setActiveId}
        loading={loading}
      />
    </div>
  )
}
