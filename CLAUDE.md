# CLAUDE.md — AC Phasor

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

AC phasor simulation (framework): electromagnetic components R, L, and C with four
screens — Intro (single element), Series RLC, Resonance (frequency sweep), and Power.
Forked from `TemplateSingleSim`.

## Key files

| File | Purpose |
|---|---|
| `src/ACPhasorColors.ts` | All `ProfileColorProperty` instances (includes R / L / C accents) |
| `src/ACPhasorConstants.ts` | Named numeric constants (layout px, physics SI units) |
| `src/ACPhasorNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor |
| `src/intro/` | Screen 1 — single element: pick R/L/C, rotating V/I phasor clock + v(t)/i(t) scopes |
| `src/series-rlc/` | Screen 2 — series RLC: normalized voltage-triangle phasor diagram + Z/reactance/phase readouts |
| `src/resonance/` | Screen 3 — resonance & frequency sweep: adapts Resonance-sim driven-oscillator math (stub) |
| `src/power/` | Screen 4 — power in AC circuits: p(t)=v·i, real/reactive power, power factor (stub) |
| `src/common/ACPhasorScreenIcons.ts` | Home / nav icons for all four screens |
| `src/common/SimPanel.ts` | Pre-themed `Panel` wrapper (uses `ACPhasorColors` automatically) |
| `src/common/SimButtonOptions.ts` | Flat button-appearance option bundles + light-control-surface combo-box options |
| `src/common/TimeModel.ts` | Composable play/pause + elapsed-time model for animated sims |
| `src/common/model/Phasor.ts` | Immutable AC phasor value object (amplitude/phase over dot `Complex`) |
| `src/common/model/Impedance.ts` | R/L/C frequency-domain impedances + series & resonance helpers |
| `src/common/model/ACSourceModel.ts` | Composable sinusoidal-source model (amplitude, frequency, ω, voltage phasor) |
| `src/common/view/PhasorNode.ts` | Arrow that tracks a `Property<Phasor>` on a `ModelViewTransform2` |
| `src/common/view/PhasorDiagramNode.ts` | Complex-plane backdrop (axes/grid) that supplies the phasor transform |
| `src/common/view/WaveformNode.ts` | Bamboo oscilloscope for one sinusoid v(t)=A·cos(ωt+φ): labelled axes, frozen footprint, quantized autoScale |
| `src/common/view/SimNumberControl.ts` | Pre-themed `NumberControl` (dark-panel title + light value badge + units pattern) |
| `src/common/view/SimReadout.ts` | One "label + value badge" row for info panels |
| `src/common/view/CircuitDiagramNode.ts` | Pictorial single-loop circuit: wire, source, element slots, flowing charge |
| `src/common/view/CircuitElementNode.ts` | Base class for the pictorial elements (terminal convention) |
| `src/common/view/CircuitSymbols.ts` | Schematic R / L / C glyphs shared by the element picker and the screen icons |
| `src/common/view/ResistorNode.ts` | Ceramic resistor: color bands encode R, heat glow follows i²R |
| `src/common/view/InductorNode.ts` | Copper coil on a ferrite core; windings track L, flux arrows and ± marks show v = L·di/dt |
| `src/common/view/CapacitorNode.ts` | Capacitor-Lab-style plates: perspective plates, plate charges, E-field arrows |
| `src/common/view/ACSourceNode.ts` | AC source body with live terminal polarity marks |
| `scripts/generate-icons.ts` | PNG icons from `public/icons/icon.svg` |

## Common components

### SimPanel

Every control panel and info box in the sim should use `SimPanel` so that
default/projector color switching is automatic:

```typescript
import { SimPanel } from "../../common/SimPanel.js";
const panel = new SimPanel(content);              // uses ACPhasorColors defaults
const panel = new SimPanel(content, { xMargin: 20 }); // override any PanelOption
```

### TimeModel

For simulations with animation, compose `TimeModel` into your screen model:

```typescript
import { TimeModel } from "../../common/TimeModel.js";

export class MyModel implements TModel {
  public readonly timer = new TimeModel();   // starts paused; pass true to auto-play

  public step(dt: number): void {
    this.timer.step(dt);
    // use this.timer.timeProperty.value for physics
  }
  public reset(): void { this.timer.reset(); /* … */ }
}
```

Wire the view to `TimeControlNode` from `scenerystack/scenery-phet` binding on
`model.timer.isPlayingProperty`. Give its step-forward button
`listener: () => model.timer.stepForward(1 / 60)` — `step()` ignores dt while paused,
which is exactly when that button is pressed.

### SimButtonOptions

SceneryStack's push/round buttons default to a 3-D/beveled look; every button in the sim
should be flat instead. Spread these into the relevant options object:

```typescript
import { FLAT_RESET_ALL_BUTTON_OPTIONS, FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../../common/SimButtonOptions.js";

const resetAllButton = new ResetAllButton({ ...FLAT_RESET_ALL_BUTTON_OPTIONS, listener: () => {...} });
const exampleButton = new RectangularPushButton({ ...FLAT_RECTANGULAR_BUTTON_OPTIONS, content, listener });
```

`FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS` spreads into `TimeControlNode`'s `playPauseStepButtonOptions`;
`TIME_CONTROL_SPEED_RADIO_OPTIONS` fixes `TimeControlNode`'s speed-radio label color, which
otherwise defaults to black text on the sim's dark default-mode panels. `SIM_COMBO_BOX_OPTIONS`
themes a `ComboBox`'s button/list chrome to the light control surface below; pair item labels
with `LIGHT_SURFACE_TEXT_FILL` (not `ACPhasorColors.textColorProperty`, which is for panel-fill text).

`ACPhasorColors.ts` backs this with a "light control surfaces" section —
`controlSurfaceColorProperty`, `controlSurfaceDisabledColorProperty`,
`controlSurfaceTextColorProperty` — identical white/dark-text values in both default and
projector profiles, so any component that must stay light regardless of theme (combo boxes,
flat buttons, editable fields) keeps readable contrast automatically.

### Phasor domain stack (`common/model` + `common/view`)

The four screens share one physics vocabulary. Build screen models and views on
these rather than re-deriving the complex math:

- **`Phasor`** — immutable value object for A·cos(ωt+φ), backed by dot's `Complex`.
  `phasor.times(z)` / `phasor.dividedBy(z)` apply Ohm's law in the frequency domain
  (V = I·Z); `phasor.instantaneousValue(ω, t)` recovers the time-domain signal.
  Expose phasors through a `Property<Phasor>` with `valueComparisonStrategy: "equalsFunction"`.
- **`Impedance.ts`** — `resistorImpedance` / `inductorImpedance` / `capacitorImpedance`
  (and `elementImpedance`, `seriesRlcImpedance`, `resonant{Angular}Frequency`) return
  `Complex` values that feed straight into `Phasor.times`/`dividedBy`.
- **`ACSourceModel`** — composable source: `amplitudeProperty`, `frequencyProperty`,
  derived `angularFrequencyProperty` (2πf) and `voltagePhasorProperty`. Compose it into
  a screen model (`public readonly source = new ACSourceModel()`), don't extend it.
- **`PhasorDiagramNode`** builds the complex-plane transform; pass its
  `modelViewTransform` to each **`PhasorNode`** you `addChild`. **`WaveformNode`** is an
  imperative scope — call `setWaveform(A, ω, φ)` on change and `setCursorTime(t)` in `step`.

`WaveformNode` is a bamboo chart with two rules that keep a scope readable while the
physics moves under it, and both should be preserved in new scopes:

- **Its layout bounds are frozen at construction** and the trace is clipped to the chart
  rectangle, so a changing amplitude or tick label can never move the node — nor anything
  laid out below it. Stack scopes freely in a `VBox`.
- **`autoScale` snaps the full scale to a 1–2–5 sequence** rather than tracking the
  amplitude, so the axis holds still through small changes and always reads as round
  numbers. Prefer a fixed `maxAmplitude` where the signal has a known bound (source
  voltage); reserve `autoScale` for signals that span decades (current through a reactance).

Captions carry the scale: `label` (top-left), the peak value with `units` (top-right), and
time ticks that only the bottom scope of a stack labels (`showTimeAxisLabels: false` above).

Physics defaults and ranges (amplitude, frequency, R/L/C) live in `ACPhasorConstants.ts`.

### Pictorial circuit (`CircuitDiagramNode` + element nodes)

Screens draw the circuit with parts, not schematic symbols, in the spirit of PhET's
Capacitor Lab: Basics. Declare the loop once and let it bind to the model:

```typescript
const circuit = new CircuitDiagramNode({
  width: INTRO_CIRCUIT_SIZE.width,
  height: INTRO_CIRCUIT_SIZE.height,
  sourceVoltageProperty: model.source.voltagePhasorProperty,
  slots: [{ type: "capacitor", capacitanceProperty, capacitanceRange, voltageProperty }],
});
// each frame:
circuit.setState(model.currentPhasorProperty.value, angularFrequency, time);
```

- A slot takes either a fixed `type` or a live `typeProperty` (all three parts are built
  and the selected one shown). Its optional value Properties drive the drawing:
  resistor color bands encode R, winding count tracks L, plate area grows with C.
- Each element also gets a **live decoration** driven by `setState`, and the three
  together tell one story — R spends energy, L and C store and return it:
  the resistor glows with p = i²R; the inductor's flux arrows follow i while its
  terminal ± marks follow v = L·di/dt, so the arrows peak exactly when the marks
  vanish; the capacitor's plates carry q = C·v as ± symbols, a charge tint, and
  field arrows in the gap.
- `elementScale` picks the reference those voltage-driven decorations use:
  `"absolute"` (against `CAPACITOR_SATURATION_CHARGE_C` / `INDUCTOR_SATURATION_EMF_V`)
  where the element sees the source voltage, `"peak"` in a series loop where one
  element's share can be a sliver of it. Pass the element's `voltageProperty` in the
  slot or the decoration has nothing to scale.
- Every element in a slot shares one footprint (`ELEMENT_HALF_WIDTH`) and the diagram
  freezes its layout bounds at construction, so switching type never shifts the screen.
- Carriers ride the rounded wire path and hide where a part covers it; their sway is
  the charge q(t) = ∫i dt, so the motion is the current. **A capacitor cuts the loop**:
  carriers queue against the plate they are flowing toward (`pilePitch` apart) and
  thin out at the other, so the pile you see *is* the stored charge. Keep the sway cap
  at a few carrier spacings — the queue and the gap both need room to be visible.

### Schematic symbols (`CircuitSymbols`)

Anywhere an element is *named* rather than drawn — the Intro screen's element picker,
the screen icons — use the shared glyph, not a word:

```typescript
import { createElementSymbol } from "../../common/view/CircuitSymbols.js";
createNode: () => createElementSymbol("inductor", { width: 50 }),
options: { accessibleName: labels.inductorStringProperty },   // screen readers still say it
```

Each factory takes `width`, `height` (glyph extent: zigzag peak-to-peak, winding
radius, plate length), `lineWidth`, `stroke` (defaults to the element's accent color),
and `showLeads`. Symbols are centered on the origin and drawn along the y = 0 wire
line, so they can be dropped into a button, a wire run, or an icon canvas by
translation alone. Keep the a11y name on the button: the glyph carries the meaning
visually, the string carries it to the PDOM.

## Accessibility

This template is the **canonical accessibility reference** for OpenPhysics sims. It ships with
the three required layers wired up: PDOM names, a per-screen `*ScreenSummaryContent`, and an explicit
`pdomOrder` + keyboard-help content. A11y strings live under the `a11y` key in each locale
JSON, exposed via `StringManager.getIntroA11yStrings()` (and series / parallel counterparts).
When building real content, make `currentDetailsContent` a live `DerivedProperty` over model
state and add `accessibleName`s to every interactive node. Full convention and checklist:
[Baton/ACCESSIBILITY.md](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).

## Compliance carve-outs

Baton's compliance check passes. One documented deviation:

- **IEC resistor band colors in `src/common/view/ResistorNode.ts`** (`BAND_COLORS`,
  `GOLD_BAND_COLOR`, `SILVER_BAND_COLOR`) are fixed standard codes, not themeable UI chrome.
  Putting them in `*Colors.ts` would imply projector remapping that would misrepresent the
  physical color code. The compliance script flags them as possible hardcoded colors; that
  warning is expected.

## Testing

Fleet-standard Vitest layout (keep when forking):

| Path | Purpose |
|---|---|
| `vitest.config.ts` | `happy-dom` environment; `setupFiles: ["./tests/setup.ts"]`; `execArgv: ["--expose-gc"]` |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports |
| `tests/TimeModel.test.ts` | Sample model unit tests — replace with real physics tests |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |
| `tests/fuzz/fuzz.spec.ts` | Optional Playwright fuzz smoke via joist `?fuzz` |
| `playwright.config.ts` | Chromium project + Vite webServer for fuzz |

- Put unit tests only under root `tests/`, mirroring `src/` (never co-locate or use `__tests__/`).
- Run `npm test`. CI runs the suite when a `test` script is present.
- Expand `memory-leak.test.ts` for any component that adds/removes nodes or links Properties at
  runtime (see OpticsLab for a deep suite).
- Optional: `npm run test:fuzz` / `test:fuzz:quick` (not part of default CI).

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run build:single` | Single-file build mode |
| `npm run check` | TypeScript (`tsc --noEmit` + scripts project) |
| `npm run lint` / `npm run fix` | Biome check / auto-fix |
| `npm test` | Vitest unit tests |
| `npm run test:fuzz` | Playwright fuzz smoke |
| `npm run test:fuzz:quick` | 10s fuzz |
| `npm run icons` | Regenerate PWA icons |

## Multi-screen sims

Full guide: [`doc/multi-screen.md`](doc/multi-screen.md)

Summary:
- Create a new screen folder mirroring `src/intro/` for each screen
- Add screen-name keys to all locale JSON files
- Expose new `StringProperty` getters in `StringManager.getScreenNames()`
- For shared state, create a root model passed to each per-screen model
- Add factories to `src/common/ACPhasorScreenIcons.ts`; wire `homeScreenIcon` + `navigationBarIcon` on each Screen
- Register all screens in the `screens` array in `main.ts`

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
