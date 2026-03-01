import React from 'react'
import { SCORE_META } from '../constants'

function ScoreRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-mono text-xs" style={{ color }}>{value}</span>
    </div>
  )
}

function WeightSlider({ meta, value, onChange }) {
  const descriptions = {
    quiet:    'Distance from freeways & major roads',
    green:    'Proximity to parks & green spaces',
    activity: 'Density of shops, cafes & restaurants',
    light:    'Low light pollution (darker = better)',
  }
  const weightKey = meta.key.replace('_score', '')

  return (
    <div className="mb-4 border-2 border-[#11472f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
          <span className="text-base font-semibold tracking-wide">{meta.label}</span>
        </div>
        <span className="font-mono text-sm font-medium" style={{ color: meta.color }}>
          {value.toFixed(2)}
        </span>
      </div>
      <p className="text-sm text-muted mb-2 leading-relaxed">{descriptions[weightKey]}</p>
      <input
        type="range"
        min={0} max={1} step={0.01}
        value={value}
        onChange={e => onChange(weightKey, parseFloat(e.target.value))}
        className={meta.sliderClass}
      />
      <div className="mt-2 h-[3px] rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${value * 100}%`, background: meta.color }}
        />
      </div>
    </div>
  )
}

export default function SliderPanel({ weights, updateWeight, topHome }) {
  return (
    <aside className="bg-surface border-r border-border flex flex-col overflow-y-auto px-5 py-6">
      <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-5">
        Preference Weights
      </p>

      {SCORE_META.map(meta => (
        <WeightSlider
          key={meta.key}
          meta={meta}
          value={weights[meta.key.replace('_score', '')]}
          onChange={updateWeight}
        />
      ))}

      <hr className="border-border my-2 mb-6" />

      {/* Top result preview */}
      <div className="bg-surface2 border border-border rounded-xl p-4 mt-auto">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">
          Top Result Preview
        </p>
        {topHome ? (
          <>
            <ScoreRow label="Fit Score"     value={topHome.fit_score?.toFixed(3)    ?? '—'} color="#4fffb0" />
            <ScoreRow label="Quiet Score"   value={topHome.quiet_score.toFixed(3)}           color="#4fffb0" />
            <ScoreRow label="Green Score"   value={topHome.green_score.toFixed(3)}            color="#56cfab" />
            <ScoreRow label="Activity Score" value={topHome.activity_score.toFixed(3)}        color="#7b61ff" />
            <ScoreRow label="Light Score"   value={topHome.light_score.toFixed(3)}            color="#ffd166" />
          </>
        ) : (
          <p className="text-xs text-muted">Loading…</p>
        )}
      </div>
    </aside>
  )
}
