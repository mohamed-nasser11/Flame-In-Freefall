export type HazardType =
  | 'ignition'
  | 'flame_spread'
  | 'material_flammability'
  | 'extinguishment'
  | 'smoke_detection'
  | 'method'

export type EvidenceType = 'result' | 'objective' | 'hypothesis'

export type MissionTag = 'ISS' | 'Moon' | 'Mars'

export interface SourceRef {
  title: string
  file?: string | null
  url: string
  location?: string
}

export interface Finding {
  id: string
  experiment: string
  psi_id: string
  hazard_type: HazardType
  missions: MissionTag[]
  finding: string
  conditions: string
  safety_implication: string
  safety_score: number
  score_reason: string
  evidence_type: EvidenceType
  source: SourceRef
}

export interface FindingsDataset {
  dataset: string
  version: string
  date: string
  notes: string
  hazard_types: HazardType[]
  findings: Finding[]
}

export type BurnOutcome = 'burned' | 'extinguished' | 'did_not_burn' | 'near_limit'

export type FuelClass = 'thin_solid' | 'thick_solid' | 'liquid_droplet'

export interface PointSource {
  title: string
  url: string
  file: string | null
  page: string
}

export interface FlammabilityPoint {
  id: string
  experiment: string
  psi_id: string
  material: string
  geometry: string
  flow_direction: string
  o2_percent: number
  pressure_kpa: number
  flow_velocity_cm_s: number
  outcome: BurnOutcome
  outcome_detail: string
  flame_spread_mm_s: number | null
  fuel_class: FuelClass
  data_quality: 'reported' | 'read_from_figure'
  uncertain: string[]
  source: PointSource
}

export interface FlammabilityLimit {
  id: string
  type: 'model_curve' | 'minimum_o2' | 'safety_margin' | 'material_1g_limit' | 'observation'
  description: string
  o2_percent?: number
  condition?: string
  curve_points?: { flow_velocity_cm_s: number; o2_percent: number }[]
  values?: Record<string, number>
  uncertain?: string[]
  source: PointSource
}

export type MissionStatus =
  | 'operational'
  | 'under_study'
  | 'historical'
  | 'historical_recommendation'
  | 'test_condition'
  | 'assumption'

export interface MissionAtmosphere {
  id: string
  name: string
  status: MissionStatus
  o2_percent: number
  pressure_psia: number
  pressure_kpa: number
  o2_partial_pressure_kpa: number
  ventilation_cm_s: { min: number; max: number; note: string } | null
  gravity: string
  sources: PointSource[]
  uncertain?: string[]
}

export interface FlammabilityDataset {
  dataset: string
  version: string
  date: string
  description: string
  points: FlammabilityPoint[]
  limits: FlammabilityLimit[]
  missions: MissionAtmosphere[]
}
