import React from 'react'
import SliderPanel from './components/SliderPanel'
import MapView     from './components/MapView'
import HomeList    from './components/HomeList'
import { useScoring } from './hooks/useScoring'

function Header({ homeCount }) {
  return (
    <header className="col-span-3 flex items-center gap-4 px-6 bg-surface border-b border-border z-10">
      <div className="text-lg font-extrabold tracking-tight font-syne">
        Home<span className="text-accent">Score</span>
      </div>
      <div className="font-mono text-[10px] text-muted bg-surface2 border border-border px-2 py-1 rounded">
        SPATIAL INTELLIGENCE v1.0
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <div className="font-mono text-xs text-muted bg-surface2 border border-border px-3 py-1 rounded-full">
          Region: <b className="text-accent">Irvine, CA</b>
        </div>
        <div className="font-mono text-xs text-muted bg-surface2 border border-border px-3 py-1 rounded-full">
          Homes: <b className="text-accent">{homeCount || '—'}</b>
        </div>
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
