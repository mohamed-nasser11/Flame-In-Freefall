import type { BurnOutcome, MissionAtmosphere } from '../lib/types'

export const OUTCOME_COLORS: Record<BurnOutcome, { fill: string; stroke: string }> = {
  burned: { fill: '#f97316', stroke: '#fdba74' },
  near_limit: { fill: '#facc15', stroke: '#fde68a' },
  extinguished: { fill: 'transparent', stroke: '#94a3b8' },
  did_not_burn: { fill: 'transparent', stroke: '#38bdf8' },
}

export function shortMissionName(m: MissionAtmosphere) {
  const names: Record<string, string> = {
    ISS: 'ISS',
    'EXPLORATION_8.2_34': 'Exploration (proposed)',
    'EAWG_8.0_32': 'EAWG 2006',
    MARS_HAB: 'Mars (assumed)',
    'SHUTTLE_10.2': 'Shuttle 10.2 psi',
    'ISS_EVA_PREBREATHE_0.7atm_30': 'ISS pre-breathe',
    APOLLO: 'Apollo',
  }
  return names[m.id] ?? m.name
}
