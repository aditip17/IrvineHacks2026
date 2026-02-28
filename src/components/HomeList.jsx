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

function HomeCard({ home, rank, isActive, onClick }) {
  const fitColor = scoreColor(home.fit_score ?? 0)

  return (
    <div
      onClick={onClick}
      className={`
        px-5 py-3 cursor-pointer border-l-2 transition-all duration-150
        ${isActive
          ? 'bg-[rgba(79,255,176,0.04)] border-l-accent'
          : 'border-l-transparent hover:bg-surface2 hover:border-l-border'}
      `}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className={`font-mono text-[10px] font-medium min-w-[24px] ${rank <= 3 ? 'text-accent' : 'text-muted'}`}>
          #{rank}
        </span>
        <span className="text-sm font-bold flex-1">Home {home.home_id}</span>
        <span className="font-mono text-sm font-medium" style={{ color: fitColor }}>
          {(home.fit_score ?? 0).toFixed(3)}
        </span>
      </div>

      <div className="flex gap-1 ml-[34px]">
        {SCORE_META.map(meta => (
          <MiniScoreBar
            key={meta.key}
            value={home[meta.key]}
            color={meta.color}
            label={meta.label[0]}
          />
        ))}
      </div>
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
