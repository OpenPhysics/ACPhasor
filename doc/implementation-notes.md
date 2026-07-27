# Implementation Notes - AC Phasor

Framework scaffold for an AC phasor simulation with resistor (R), inductor (L), and
capacitor (C). Physics and interactive UI are still TODO; this document describes the
three-screen shell.

## Architecture Overview

```
main.ts
  ├─ IntroScreen              (single component + phasor)
  │    ├─ IntroModel
  │    └─ IntroScreenView
  ├─ SeriesRlcScreen          (series RLC + impedance phasors)
  │    ├─ SeriesRlcModel
  │    └─ SeriesRlcScreenView
  └─ ParallelRlcScreen        (parallel RLC + admittance / current phasors)
       ├─ ParallelRlcModel
       └─ ParallelRlcScreenView

src/common/
  ├─ ACPhasorScreenIcons.ts   home / nav icons for all three screens
  ├─ SimPanel.ts              pre-themed panel (uses ACPhasorColors)
  ├─ SimButtonOptions.ts      flat button / combo-box option bundles
  └─ TimeModel.ts             composable play/pause + elapsed time

src/preferences/
  ├─ ACPhasorPreferencesModel
  ├─ ACPhasorPreferencesNode
  └─ acPhasorQueryParameters
```

Data flows Model → View through AXON `Property` objects. The view never integrates
physics; the model never imports scenery.

## Screen intents (to implement)

| Screen | Purpose |
|---|---|
| Intro | Pick R, L, or C; show AC drive and that component's V/I phasor |
| Series RLC | Series combination; impedance phasor sum |
| Parallel RLC | Parallel combination; branch-current / admittance phasors |

## Next steps

1. Add shared circuit / phasor model types under `src/common/model/` (or per-screen).
2. Replace placeholder `Text` in each `*ScreenView` with circuit diagram + phasor diagram.
3. Wire `TimeModel` + `TimeControlNode` when animation of rotating phasors is needed.
4. Flesh out `doc/model.md` with SI equations for Z_R, Z_L, Z_C and series/parallel equivalents.
5. Replace example preferences (`exampleToggle`) when real prefs exist.
