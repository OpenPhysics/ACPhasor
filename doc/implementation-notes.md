# Implementation Notes - AC Phasor

An AC phasor simulation with resistor (R), inductor (L), and capacitor (C). The first
two screens are built; the last two are still shells.

## Architecture Overview

```
main.ts
  ├─ IntroScreen              (single component + rotating phasor clock)
  │    ├─ IntroModel
  │    └─ IntroScreenView
  ├─ SeriesRlcScreen          (series RLC + voltage / impedance triangles)
  │    ├─ SeriesRlcModel
  │    └─ SeriesRlcScreenView
  ├─ ResonanceScreen          (frequency sweep + resonance-peak curves)   ← stub
  │    ├─ ResonanceModel
  │    └─ ResonanceScreenView
  └─ PowerScreen              (p(t) = v·i, real/reactive power, power factor) ← stub
       ├─ PowerModel
       └─ PowerScreenView

src/common/model/
  ├─ Phasor.ts                immutable A·cos(ωt+φ) over dot's Complex
  ├─ Impedance.ts             Z_R / Z_L / Z_C, series and resonance helpers
  └─ ACSourceModel.ts         composable sinusoidal source

src/common/view/
  ├─ PhasorDiagramNode.ts     complex-plane backdrop; supplies the transform
  ├─ PhasorNode.ts            one arrow, with optional free tail and projection line
  ├─ PhasorChainNode.ts       an ordered set of phasors, head-to-tail or from the origin
  ├─ PhaseArcNode.ts          the labelled wedge between two angles
  ├─ WaveformNode.ts          multi-trace, dual-axis oscilloscope with a playhead
  ├─ CircuitDiagramNode.ts    pictorial loop with flowing charge
  ├─ ResistorNode / InductorNode / CapacitorNode / ACSourceNode
  ├─ CircuitSymbols.ts        schematic R / L / C glyphs
  ├─ SimNumberControl.ts      pre-themed NumberControl, linear or logarithmic
  └─ SimReadout.ts            one "label + value badge" row

src/common/
  ├─ ACPhasorScreenIcons.ts   home / nav icons for all four screens
  ├─ SimPanel.ts              pre-themed panel (uses ACPhasorColors)
  ├─ SimButtonOptions.ts      flat button / combo-box option bundles
  └─ TimeModel.ts             composable play/pause + elapsed time
```

Data flows Model → View through AXON `Property` objects. The view never integrates
physics; the model never imports scenery.

## Screen intents

| Screen | Purpose | State |
|---|---|---|
| Intro | Pick R, L, or C; rotating V/I phasor clock with the phase angle marked and each tip projected onto the real axis, beside a dual-trace v(t)/i(t) scope | Built |
| Series RLC | Rotating voltage triangle and the static impedance triangle it is similar to, switchable between head-to-tail and common-origin, plus a scope and a resonance callout | Built |
| Resonance | Same RLC circuit swept in frequency; impedance- and current-vs-frequency curves | Stub |
| Power | p(t) = v(t)·i(t) over a cycle; average real power vs. oscillating reactive component | Stub |

## Invariants worth preserving

Three pieces of this codebase exist to stop the layout moving while the physics does.
Breaking any of them shows up as the whole screen jittering once per cycle.

1. **`WaveformNode` freezes its `localBounds` at construction** and clips traces to the
   chart. An auto-scaling axis, a changing tick label, and a retuned time window
   therefore never resize it. Its vertical scale also snaps to a 1–2–5 sequence rather
   than tracking the amplitude, so the axis holds still through small changes.
2. **`CircuitDiagramNode` freezes its footprint at the worst case** — every element of
   every slot visible, every capacitor at full plate size — before applying visibility
   bindings. Anything new that can grow the bounds must be built before that point.
3. **`InductorNode` freezes its own `localBounds` to include the full flux extent.**
   The field loops are hidden at low current, and hidden children are out of bounds, so
   without this the part (and the diagram that sized itself from it) would breathe.

`tests/WaveformNode.test.ts` guards the first of these directly.

## Two decorations that carry the physics

- **The inductor's field loops** (`InductorNode.setFluxState`) sit at radius
  `inner + (k + |i|/i_peak)·spacing`. Their *position* is therefore the field and their
  radial *speed* is `spacing · d|i|/dt`, proportional to |v_L| = |L·di/dt|. The loops
  hang motionless at the current peak, exactly where the ± EMF marks vanish, and race
  through the zero crossing where those marks are strongest. Being a pure function of
  the instantaneous field, it survives pause, step-forward and reset without drifting.
- **The carriers in `CircuitDiagramNode`** are displaced by q(t) = ∫i dt, so their
  velocity is the current. A capacitor cuts the loop and they queue against the plate,
  which makes the visible pile the stored charge.

## Next steps

1. Build the Resonance screen on the existing `Impedance` helpers; it will need
   admittance and Q-factor additions there.
2. Build the Power screen. `WaveformNode`'s multi-trace support covers most of what
   p(t) = v·i needs; shaded regions under a trace do not exist yet.
3. Replace example preferences (`exampleToggle`) when real prefs exist.
