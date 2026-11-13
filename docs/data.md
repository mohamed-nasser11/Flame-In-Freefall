# Data notes

## findings.json

28 findings from nine NASA PSI investigations. Fields:

| Field | Meaning |
| --- | --- |
| `id` | Stable id, `F01` to `F28` |
| `experiment`, `psi_id` | Experiment name(s) and PSI repository id(s) |
| `hazard_type` | `ignition`, `flame_spread`, `material_flammability`, `extinguishment`, `smoke_detection`, `method` |
| `missions` | Missions the finding is relevant to (`ISS`, `Moon`, `Mars`) |
| `finding` | The result in one sentence, as reported |
| `conditions` | Test conditions from the source |
| `safety_implication` | The team's interpretation for spacecraft design |
| `safety_score`, `score_reason` | Team relevance rating 1 to 5 and why; editorial, not a probability |
| `evidence_type` | `result` (25), `objective` (2) or `hypothesis` (1) |
| `source` | Title, URL, local file name and location (page, slide or section) |

## flammability.json

| Block | Count | Use |
| --- | --- | --- |
| `points` | 72 | Map markers: oxygen, pressure, flow speed and direction, outcome, fuel class, data quality, caveats, source page |
| `limits` | 9 | Reference values: microgravity and normal-gravity oxygen limits, the model U-curve, material limiting oxygen indices, the fan-off observation |
| `missions` | 7 | Cabin atmospheres with status (`operational`, `under_study`, `assumption`, ...) and sources |

Points by experiment: BASS 21, FLEX 20, BASS-II 18, Saffire 13. Outcomes: burned 47, extinguished 13, did not burn 7, near limit 5.

## Caveats shown in the interface

1. The 8.2 psia / 34% O2 exploration atmosphere is a proposal under study; NASA states Artemis atmosphere parameters are not finalised.
2. The Mars preset reuses that atmosphere as an assumption.
3. No solid-material test was run at 8.2 psia or above 22.2% O2. The nearest data are FLEX droplet tests at 30 to 34% O2 and about 0.7 atm.
4. FLEX droplets are liquid-fuel fires without forced flow; they are hidden on the map by default and never mixed with solid-material comparisons.
5. 24 BASS fabric points use an assumed ~21% O2 (ISS cabin air); 11 BASS spread rates were read from a plot.
6. Saffire cabin pressure is assumed to be about 1 atm.
7. The U-shaped thin-fuel boundary is a computed model with two labelled values; the rest of its shape is schematic.
8. In partial gravity, buoyancy adds roughly 10 cm/s (Moon) or 15 cm/s (Mars) of induced flow, so the fan-off result from BASS-II may not hold.

## Updating the data

Both files are plain JSON read at build time. After editing, run `npm test`: the tests check ids, ranges, source URLs and that every evidence id used by the risk rules still exists.
