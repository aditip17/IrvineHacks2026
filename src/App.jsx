import React, { useState } from 'react'
import SliderPanel from './components/SliderPanel'
import MapView     from './components/MapView'
import HomeList    from './components/HomeList'
import { useScoring } from './hooks/useScoring'

function Header({ region, updateRegion, homeCount, updateHomeCount,
                  filters, updateFilter, resetFilters, propertyTypes }) {
  const [open, setOpen] = useState(false)

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    k === 'propertyType' ? v !== 'Any' : v !== ''
  ).length

  return (
    <header className="col-span-3 flex items-center gap-4 px-6 bg-surface border-b border-border z-10">
      <div className="text-lg font-extrabold tracking-tight font-syne">
        Neighborhood<span className="text-accent">Fit</span>
      </div>

      {/* Region */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted">Region:</span>
        <select
          value={region}
          onChange={e => updateRegion(e.target.value)}
          className="font-mono text-xs text-accent bg-surface2 border border-border px-3 py-1 rounded-full"
        >
          {['Irvine, CA','Newport Beach, CA','Santa Ana, CA','Anaheim, CA',
            'Fullerton, CA','Garden Grove, CA','Huntington Beach, CA',
            'Lake Forest, CA','Orange, CA'].map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Homes count */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted">Homes:</span>
        <select
          value={homeCount}
          onChange={e => updateHomeCount(e.target.value)}
          className="font-mono text-xs text-accent bg-surface2 border border-border px-3 py-1 rounded-full"
        >
          {[10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Filter button */}
      <div className="relative ml-auto">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 font-mono text-xs text-accent bg-surface2 border border-border px-3 py-1 rounded-full hover:bg-[rgba(79,255,176,0.08)] transition-colors"
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-accent text-bg rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute top-9 right-0 bg-surface border border-border rounded-xl shadow-xl p-5 z-50 w-72 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold tracking-widest uppercase text-muted">Filters</span>
              <button onClick={resetFilters} className="text-xs text-accent hover:underline">Reset</button>
            </div>

            {/* Price range */}
            <div>
              <label className="text-xs text-muted block mb-1">Price ($)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min"
                  value={filters.minPrice}
                  onChange={e => updateFilter('minPrice', e.target.value)}
                  className="w-full font-mono text-xs bg-surface2 border border-border rounded-lg px-2 py-1 text-accent placeholder-muted"
                />
                <input type="number" placeholder="Max"
                  value={filters.maxPrice}
                  onChange={e => updateFilter('maxPrice', e.target.value)}
                  className="w-full font-mono text-xs bg-surface2 border border-border rounded-lg px-2 py-1 text-accent placeholder-muted"
                />
              </div>
            </div>

            {/* Beds / Baths */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted block mb-1">Min Beds</label>
                <select value={filters.minBeds} onChange={e => updateFilter('minBeds', e.target.value)}
                  className="w-full font-mono text-xs bg-surface2 border border-border rounded-lg px-2 py-1 text-accent">
                  <option value="">Any</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted block mb-1">Min Baths</label>
                <select value={filters.minBaths} onChange={e => updateFilter('minBaths', e.target.value)}
                  className="w-full font-mono text-xs bg-surface2 border border-border rounded-lg px-2 py-1 text-accent">
                  <option value="">Any</option>
                  {[1,2,3,4].map(n => <option key={n} value={n}>{n}+</option>)}
                </select>
              </div>
            </div>

            {/* Property type */}
            <div>
              <label className="text-xs text-muted block mb-1">Property Type</label>
              <select value={filters.propertyType} onChange={e => updateFilter('propertyType', e.target.value)}
                className="w-full font-mono text-xs bg-surface2 border border-border rounded-lg px-2 py-1 text-accent">
                {propertyTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Days on market */}
            <div>
              <label className="text-xs text-muted block mb-1">Max Days on Market</label>
              <input type="number" placeholder="e.g. 30"
                value={filters.maxDaysOnMarket}
                onChange={e => updateFilter('maxDaysOnMarket', e.target.value)}
                className="w-full font-mono text-xs bg-surface2 border border-border rounded-lg px-2 py-1 text-accent placeholder-muted"
              />
            </div>

            <button onClick={() => setOpen(false)}
              className="mt-1 text-xs font-semibold text-bg bg-accent rounded-lg py-1.5 hover:opacity-90 transition-opacity">
              Apply
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default function App() {
  const {
    homes, rankedHomes, allRankedHomes,
    weights, updateWeight,
    activeId, setActiveId,
    loading,
    region, updateRegion,
    homeCount, updateHomeCount,
    filters, updateFilter, resetFilters,
    propertyTypes,
    regionCenter,
  } = useScoring()

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: '300px 1fr 320px', gridTemplateRows: '56px 1fr' }}>
      <Header
        region={region} updateRegion={updateRegion}
        homeCount={homeCount} updateHomeCount={updateHomeCount}
        filters={filters} updateFilter={updateFilter} resetFilters={resetFilters}
        propertyTypes={propertyTypes}
      />
      <SliderPanel weights={weights} updateWeight={updateWeight} topHome={rankedHomes[0] ?? null} />
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