import React from 'react'
import { SCORE_META, scoreColor } from '../constants'

function MiniScoreBar({ value, color, label }) {
  return (
    <div className="flex-1">
      <div className="h-[3px] rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(value * 100).toFixed(1)}%`, background: color }}
        />
      </div>
      <div className="font-mono text-[9px] text-muted mt-0.5">
        {label} {(value * 100).toFixed(0)}%
      </div>
    </div>
  )
}

function generateBlurb(home) {
  const scores = [
    { label: 'quiet',    val: home.quiet_score    },
    { label: 'green',    val: home.green_score    },
    { label: 'active',   val: home.activity_score },
    { label: 'dark sky', val: home.light_score    },
  ].sort((a, b) => b.val - a.val)

  const top = scores[0]
  const second = scores[1]

  const blurbs = {
    quiet:    'Low traffic noise with minimal freeway disruption',
    green:    'Excellent access to parks and green spaces nearby',
    active:   'Vibrant area with shops, cafes and restaurants close by',
    'dark sky': 'Low light pollution — great for evenings outdoors',
  }

  return `${blurbs[top.label]}, with ${second.label === 'active' ? 'a lively' : 'good'} ${second.label} environment.`
}

function HomeCard({ home, rank, isActive, onClick }) {
  const fitColor = scoreColor(home.fit_score ?? 0)

  return (
    <div
      onClick={onClick}
      className={`
        px-5 py-5 mb-2 mx-3 rounded-xl cursor-pointer border-2 transition-all duration-150
        ${isActive
          ? 'bg-[rgba(17,71,47,0.06)] border-accent'
          : 'border-[#11472f] hover:bg-surface2'}
      `}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className={`font-mono text-[10px] font-medium min-w-[24px] ${rank <= 3 ? 'text-accent' : 'text-muted'}`}>
          #{rank}
        </span>
        <span className="text-base font-bold flex-1">{home.address ?? `Home ${home.home_id}`}</span>
        <span className="font-mono text-sm font-medium" style={{ color: fitColor }}>
          {((home.fit_score ?? 0)*100).toFixed(1)}%
        </span>
      </div>

      <p className="text-xs text-muted mt-2 ml-[34px] leading-relaxed">
          {generateBlurb(home)}
      </p>
    </div>
  )
}

export default function HomeList({ rankedHomes, activeId, setActiveId, loading }) {
  return (
    <aside className="bg-surface border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted">
          Ranked Homes
        </h2>
        <span className="font-mono text-[10px] text-accent bg-[rgba(79,255,176,0.08)] border border-[rgba(79,255,176,0.2)] rounded-full px-2 py-0.5">
          {rankedHomes.length}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
            <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            <span className="text-xs">Loading homes…</span>
          </div>
        ) : rankedHomes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-muted">No homes found</span>
          </div>
        ) : (
          rankedHomes.map((home, i) => (
            <HomeCard
              key={home.home_id}
              home={home}
              rank={i + 1}
              isActive={activeId === home.home_id}
              onClick={() => setActiveId(home.home_id)}
            />
          ))
        )}
      </div>
    </aside>
  )
}
