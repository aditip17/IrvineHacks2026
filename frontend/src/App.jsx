import React from 'react'
import SliderPanel from './components/SliderPanel'
import MapView     from './components/MapView'
import HomeList    from './components/HomeList'
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
    <header className="col-span-3 flex items-center gap-4 px-6 bg-surface border-b border-border z-10">
      <div className="text-lg font-extrabold tracking-tight font-syne">
        Neighborhood<span className="text-accent">Fit</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted">Region:</span>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="font-mono text-xs text-accent bg-surface2 border border-border px-3 py-1 rounded-full"
        >
          {REGIONS.map((name) => (
            <option key={name} value={name}>{name}, CA</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted">Homes:</span>
        <span className="font-mono text-xs text-accent bg-surface2 border border-border px-3 py-1 rounded-full">
          {homeCount}
        </span>
      </div>
    </header>
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

  return (
    <div
      className="grid h-screen"
      style={{ gridTemplateColumns: '300px 1fr 320px', gridTemplateRows: '56px 1fr' }}
    >
      <Header homeCount={homes.length} region={region} setRegion={setRegion} />

      <SliderPanel
        weights={weights}
        updateWeight={updateWeight}
        topHome={rankedHomes[0] ?? null}
      />

      <MapView
        homes={homes}
        rankedHomes={rankedHomes}
        activeId={activeId}
        setActiveId={setActiveId}
      />

      <HomeList
        rankedHomes={rankedHomes}
        activeId={activeId}
        setActiveId={setActiveId}
        loading={loading}
      />
    </div>
  )
}
