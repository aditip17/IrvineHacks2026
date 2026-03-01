import React from 'react'
import { scoreColor } from '../constants'

function fmtPrice(val) {
  if (!Number.isFinite(Number(val))) return null
  const n = Number(val)
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  return '$' + (n / 1_000).toFixed(0) + 'K'
}

function generateBlurb(home) {
  const scores = [
    { label: 'quiet',    val: home.quiet_score    },
    { label: 'green',    val: home.green_score    },
    { label: 'active',   val: home.activity_score },
    { label: 'dark sky', val: home.light_score    },
  ].sort((a, b) => b.val - a.val)

  const blurbs = {
    quiet:    'Low traffic noise with minimal freeway disruption',
    green:    'Excellent access to parks and green spaces nearby',
    active:   'Vibrant area with shops, cafes and restaurants close by',
    'dark sky': 'Low light pollution — great for evenings outdoors',
  }
  const top = scores[0]
  const second = scores[1]
  return `${blurbs[top.label]}, with ${second.label === 'active' ? 'a lively' : 'good'} ${second.label} environment.`
}

function HomeCard({ home, rank, isActive, onClick }) {
  const fitColor = scoreColor(home.fit_score ?? 0)
  const price    = fmtPrice(home.price)

  return (
    <div
      onClick={onClick}
      className={`
        px-5 py-4 mb-2 mx-3 rounded-xl cursor-pointer border-2 transition-all duration-150
        ${isActive ? 'bg-[rgba(17,71,47,0.06)] border-accent' : 'border-[#11472f] hover:bg-surface2'}
      `}
    >
      {/* Row 1: rank + address + fit score */}
      <div className="flex items-center gap-2.5 mb-1">
        <span className={`font-mono text-[10px] font-medium min-w-[24px] ${rank <= 3 ? 'text-accent' : 'text-muted'}`}>
          #{rank}
        </span>
        <span className="text-sm font-bold flex-1 truncate">{home.address ?? `Home ${home.listing_id}`}</span>
        <span className="font-mono text-sm font-medium" style={{ color: fitColor }}>
          {((home.fit_score ?? 0) * 100).toFixed(1)}%
        </span>
      </div>

      {/* Row 2: price + beds/baths/sqft */}
      <div className="flex items-center gap-3 ml-[34px] mb-1">
        {price && (
          <span className="font-mono text-sm font-bold text-accent">{price}</span>
        )}
        {home.beds != null && (
          <span className="text-xs text-muted">{home.beds} bd</span>
        )}
        {home.baths != null && (
          <span className="text-xs text-muted">{home.baths} ba</span>
        )}
        {home.square_feet != null && (
          <span className="text-xs text-muted">{Number(home.square_feet).toLocaleString()} sqft</span>
        )}
      </div>

      {/* Row 3: sensory blurb */}
      <p className="text-xs text-muted ml-[34px] leading-relaxed">
        {generateBlurb(home)}
      </p>

      {/* Row 4: open house badge if present */}
      {home.next_open_house_start && (
        <div className="ml-[34px] mt-1.5 inline-block text-[10px] text-accent bg-[rgba(79,255,176,0.08)] border border-[rgba(79,255,176,0.2)] rounded-full px-2 py-0.5">
          Open House: {home.next_open_house_start}
        </div>
      )}
    </div>
  )
}

export default function HomeList({ rankedHomes, activeId, setActiveId, loading }) {
  return (
    <aside className="bg-surface border-l border-border flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted">Ranked Homes</h2>
        <span className="font-mono text-[10px] text-accent bg-[rgba(79,255,176,0.08)] border border-[rgba(79,255,176,0.2)] rounded-full px-2 py-0.5">
          {rankedHomes.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
            <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            <span className="text-xs">Loading homes…</span>
          </div>
        ) : rankedHomes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-muted">No homes match your filters</span>
          </div>
        ) : (
          rankedHomes.map((home, i) => (
            <HomeCard
              key={home.listing_id}
              home={home}
              rank={i + 1}
              isActive={activeId === home.listing_id}
              onClick={() => setActiveId(home.listing_id)}
            />
          ))
        )}
      </div>
    </aside>
  )
}