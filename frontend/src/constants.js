export const MAPBOX_TOKEN =
  'pk.eyJ1Ijoicm9oaXRzcHJvaiIsImEiOiJjbW02cXI1bG8wa3JoMndxM24xZWZibGN4In0.qlSno2dqONQ7rbsK9pBjQQ'

export const API_BASE = 'http://localhost:8000'

export const MOCK_HOMES = [
  { home_id:1,  lat:33.680, lon:-117.800, dist_to_freeway:0.20, dist_to_major_road:0.10, dist_to_park:0.30, poi_count_500m:12, dist_to_industrial:0.5, light_pollution_score:0.80, quiet_score:0.82, green_score:0.74, activity_score:0.45, light_score:0.30 },
  { home_id:2,  lat:33.685, lon:-117.790, dist_to_freeway:0.55, dist_to_major_road:0.40, dist_to_park:0.60, poi_count_500m:5,  dist_to_industrial:0.8, light_pollution_score:0.30, quiet_score:0.65, green_score:0.88, activity_score:0.20, light_score:0.75 },
  { home_id:3,  lat:33.675, lon:-117.810, dist_to_freeway:0.10, dist_to_major_road:0.05, dist_to_park:0.15, poi_count_500m:22, dist_to_industrial:0.2, light_pollution_score:0.95, quiet_score:0.40, green_score:0.50, activity_score:0.90, light_score:0.10 },
  { home_id:4,  lat:33.692, lon:-117.795, dist_to_freeway:0.80, dist_to_major_road:0.70, dist_to_park:0.80, poi_count_500m:2,  dist_to_industrial:1.0, light_pollution_score:0.10, quiet_score:0.92, green_score:0.95, activity_score:0.10, light_score:0.95 },
  { home_id:5,  lat:33.670, lon:-117.785, dist_to_freeway:0.45, dist_to_major_road:0.35, dist_to_park:0.45, poi_count_500m:9,  dist_to_industrial:0.6, light_pollution_score:0.50, quiet_score:0.60, green_score:0.62, activity_score:0.40, light_score:0.55 },
  { home_id:6,  lat:33.688, lon:-117.820, dist_to_freeway:0.60, dist_to_major_road:0.55, dist_to_park:0.20, poi_count_500m:15, dist_to_industrial:0.4, light_pollution_score:0.70, quiet_score:0.72, green_score:0.80, activity_score:0.60, light_score:0.35 },
  { home_id:7,  lat:33.665, lon:-117.800, dist_to_freeway:0.30, dist_to_major_road:0.25, dist_to_park:0.70, poi_count_500m:7,  dist_to_industrial:0.7, light_pollution_score:0.40, quiet_score:0.55, green_score:0.55, activity_score:0.30, light_score:0.65 },
  { home_id:8,  lat:33.678, lon:-117.775, dist_to_freeway:0.70, dist_to_major_road:0.60, dist_to_park:0.50, poi_count_500m:18, dist_to_industrial:0.3, light_pollution_score:0.85, quiet_score:0.78, green_score:0.68, activity_score:0.75, light_score:0.20 },
  { home_id:9,  lat:33.695, lon:-117.805, dist_to_freeway:0.90, dist_to_major_road:0.80, dist_to_park:0.90, poi_count_500m:1,  dist_to_industrial:1.0, light_pollution_score:0.05, quiet_score:0.96, green_score:0.98, activity_score:0.05, light_score:0.98 },
  { home_id:10, lat:33.672, lon:-117.815, dist_to_freeway:0.35, dist_to_major_road:0.30, dist_to_park:0.35, poi_count_500m:11, dist_to_industrial:0.5, light_pollution_score:0.60, quiet_score:0.58, green_score:0.60, activity_score:0.45, light_score:0.50 },
]

export const SCORE_META = [
  { key: 'quiet_score',    label: 'Quiet',    color: '#4fffb0', sliderClass: 'slider-quiet'    },
  { key: 'green_score',    label: 'Green',    color: '#56cfab', sliderClass: 'slider-green'    },
  { key: 'activity_score', label: 'Activity', color: '#7b61ff', sliderClass: 'slider-activity' },
  { key: 'light_score',    label: 'Light',    color: '#ffd166', sliderClass: 'slider-light'    },
]

export function scoreColor(score) {
  if (score >= 0.75) return '#4fffb0'
  if (score >= 0.55) return '#ffd166'
  return '#ff6b6b'
}

export function computeLocalRank(homes, wq, wg, wa, wl) {
  return [...homes]
    .map(h => ({
      ...h,
      fit_score: +(wq * h.quiet_score + wg * h.green_score + wa * h.activity_score + wl * h.light_score).toFixed(3),
    }))
    .sort((a, b) => b.fit_score - a.fit_score)
}
