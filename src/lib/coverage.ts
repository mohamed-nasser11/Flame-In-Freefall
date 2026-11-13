import { flammability } from './data'
import type { FlammabilityPoint } from './types'

export type CoverageLevel = 'within' | 'edge' | 'outside'

export interface Coverage {
  level: CoverageLevel
  /** Solid-material tests close to the scenario (O2 within 1.5 points, pressure within 15 kPa). */
  nearSolid: FlammabilityPoint[]
  /** Liquid-droplet tests near the scenario; a different kind of fire, reported separately. */
  nearDroplet: FlammabilityPoint[]
  solidO2Range: [number, number]
  message: string
}

const solids = flammability.points.filter((p) => p.fuel_class !== 'liquid_droplet')
const droplets = flammability.points.filter((p) => p.fuel_class === 'liquid_droplet')

const SOLID_O2: [number, number] = [
  Math.min(...solids.map((p) => p.o2_percent)),
  Math.max(...solids.map((p) => p.o2_percent)),
]

/**
 * Compares a cabin atmosphere with the conditions NASA actually tested.
 * This says nothing about whether a cabin is safe; it says how much evidence exists for it.
 */
export function assessCoverage(o2Percent: number, pressureKpa: number): Coverage {
  const nearSolid = solids.filter(
    (p) => Math.abs(p.o2_percent - o2Percent) <= 1.5 && Math.abs(p.pressure_kpa - pressureKpa) <= 15,
  )
  const nearDroplet = droplets.filter(
    (p) => Math.abs(p.o2_percent - o2Percent) <= 2 && Math.abs(p.pressure_kpa - pressureKpa) <= 35,
  )
  const solidO2Close = solids.some((p) => Math.abs(p.o2_percent - o2Percent) <= 4)

  let level: CoverageLevel
  let message: string
  if (nearSolid.length > 0) {
    level = 'within'
    message = `${nearSolid.length} solid-material microgravity tests were run near this oxygen level and pressure.`
  } else if (solidO2Close) {
    level = 'edge'
    message =
      'Solid-material tests exist at a similar oxygen level but at a different pressure, or only a few points away. Treat comparisons with care.'
  } else {
    level = 'outside'
    message = `No solid-material test in this data set was run at this condition. Solid tests cover ${SOLID_O2[0]}–${SOLID_O2[1]}% O2 at about 1 atm.`
  }
  if (level !== 'within' && nearDroplet.length > 0) {
    message += ` The closest evidence is ${nearDroplet.length} FLEX liquid-droplet test groups, which are a different kind of fire.`
  }
  return { level, nearSolid, nearDroplet, solidO2Range: SOLID_O2, message }
}
