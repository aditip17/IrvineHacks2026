import React from 'react'
import SliderPanel from './components/SliderPanel'
import MapView     from './components/MapView'
import HomeList    from './components/HomeList'
import { useScoring } from './hooks/useScoring'

function Header({ homeCount }) {
  return (
    <header className="col-span-3 flex items-center gap-4 px-6 bg-surface border-b border-border z-10">
      <div className="text-lg font-extrabold tracking-tight font-syne">
        Neighborhood<span className="text-accent">Fit</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted">Region:</span>
        <select className="font-mono text-xs text-accent bg-surface2 border border-border px-3 py-1 rounded-full">
          <option>Irvine, CA</option>
          <option>Newport Beach, CA</option>
          <option>Santa Ana, CA</option>
          <option>Anaheim, CA</option>
          <option>Fullerton, CA</option>
          <option>Garden Grove, CA</option>
          <option>Hunington, CA</option>
          <option>Lake Forest, CA</option>
          <option>Orange, CA</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted">Homes:</span>
        <select className="font-mono text-xs text-accent bg-surface2 border border-border px-3 py-1 rounded-full">
          <option>10</option>
          <option>25</option>
          <option>50</option>
          <option>100</option>
        </select>
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
  } = useScoring()

  return (
    <div
      className="grid h-screen"
      style={{ gridTemplateColumns: '300px 1fr 320px', gridTemplateRows: '56px 1fr' }}
    >
      <Header homeCount={homes.length} />

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
