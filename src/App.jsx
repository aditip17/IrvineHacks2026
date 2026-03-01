import React from 'react'
import SliderPanel from './components/SliderPanel'
import MapView     from './components/MapView'
import HomeList    from './components/HomeList'
import { useScoring } from './hooks/useScoring'

function Header({ region, updateRegion, homeCount, updateHomeCount }) {
  return (
    <header className="col-span-3 flex items-center gap-4 px-6 bg-surface border-b border-border z-10">
      <div className="text-lg font-extrabold tracking-tight font-syne">
        Neighborhood<span className="text-accent">Fit</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted">Region:</span>
        <select
          value={region}
          onChange={e => updateRegion(e.target.value)}
          className="font-mono text-xs text-accent bg-surface2 border border-border px-3 py-1 rounded-full"
        >
          <option>Irvine, CA</option>
          <option>Newport Beach, CA</option>
          <option>Santa Ana, CA</option>
          <option>Anaheim, CA</option>
          <option>Fullerton, CA</option>
          <option>Garden Grove, CA</option>
          <option>Huntington Beach, CA</option>
          <option>Lake Forest, CA</option>
          <option>Orange, CA</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted">Homes:</span>
        <select
          value={homeCount}
          onChange={e => updateHomeCount(e.target.value)}
          className="font-mono text-xs text-accent bg-surface2 border border-border px-3 py-1 rounded-full"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </header>
  )
}

export default function App() {
  const {
    homes,
    rankedHomes,
    allRankedHomes,
    weights,
    updateWeight,
    activeId,
    setActiveId,
    loading,
    region,
    updateRegion,
    homeCount,
    updateHomeCount,
    regionCenter,
  } = useScoring()

  return (
    <div
      className="grid h-screen"
      style={{ gridTemplateColumns: '300px 1fr 320px', gridTemplateRows: '56px 1fr' }}
    >
      <Header
        region={region}
        updateRegion={updateRegion}
        homeCount={homeCount}
        updateHomeCount={updateHomeCount}
      />

      <SliderPanel
        weights={weights}
        updateWeight={updateWeight}
        topHome={rankedHomes[0] ?? null}
      />

      <MapView
        homes={homes}
        rankedHomes={allRankedHomes}
        activeId={activeId}
        setActiveId={setActiveId}
        regionCenter={regionCenter}
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