import { API_BASE, MOCK_HOMES, computeLocalRank } from './constants'

export async function fetchHomes() {
  try {
    const res = await fetch(`${API_BASE}/homes`)
    if (!res.ok) throw new Error('Bad response')
    return await res.json()
  } catch {
    console.warn('[NeighborhoodFit] /homes unreachable — using mock data')
    return MOCK_HOMES
  }
}

export async function fetchRankedHomes(homes, quiet, green, activity, light) {
  try {
    const res = await fetch(`${API_BASE}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        w_quiet:    quiet,
        w_green:    green,
        w_activity: activity,
        w_light:    light,
      }),
    })
    if (!res.ok) throw new Error('Bad response')
    return await res.json()
  } catch {
    console.warn('[Neighborhood] /score unreachable — scoring locally')
    return computeLocalRank(homes, quiet, green, activity, light)
  }
}
