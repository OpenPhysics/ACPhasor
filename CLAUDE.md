# CLAUDE.md — AC Phasor

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

AC phasor simulation (framework): electromagnetic components R, L, and C with four
screens — Intro (single element), Series RLC, Resonance (frequency sweep), and Power.
Forked from `SceneryStackTemplate`.

## Key files

| File | Purpose |
|---|---|
| `src/ACPhasorColors.ts` | All `ProfileColorProperty` instances (includes R / L / C accents) |
| `src/ACPhasorConstants.ts` | Named numeric constants (layout px, physics SI units) |
| `src/ACPhasorNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor |
| `src/intro/` | Screen 1 — single element: pick R/L/C, rotating V/I phasor clock with phase arc + projections, dual-trace v(t)/i(t) scope |
| `src/series-rlc/` | Screen 2 — series RLC: rotating voltage triangle + static impedance triangle (tip-to-tail checkbox), scope, resonance callout |
| `src/resonance/` | Screen 3 — resonance & frequency sweep: |I| and φ vs. log f with peak / half-power band marked, impedance triangle, auto-sweep button |
| `src/power/` | Screen 4 — power in AC circuits: p(t)=v·i shaded into delivered/returned lobes, power triangle P+jQ=S, power factor |
| `src/common/ACPhasorScreenIcons.ts` | Home / nav icons for all four screens |
| `src/common/SimPanel.ts` | Pre-themed `Panel` wrapper (uses `ACPhasorColors` automatically) |
| `src/common/SimButtonOptions.ts` | Flat button-appearance option bundles + light-control-surface combo-box options |
| `src/common/TimeModel.ts` | Composable play/pause + elapsed-time model for animated sims |
| `src/common/model/Phasor.ts` | Immutable AC phasor value object (amplitude/phase over dot `Complex`) |
| `src/common/model/Impedance.ts` | R/L/C frequency-domain impedances + series & resonance helpers |
| `src/common/model/ACSourceModel.ts` | Composable sinusoidal-source model (amplitude, frequency, ω, voltage phasor) |
| `src/common/model/RlcCircuitModel.ts` | The series RLC loop shared by screens 2–4: element voltages, Z, I, φ, f₀, Q, half-power band, and off-frequency response helpers |
| `src/common/view/PhasorNode.ts` | Arrow that tracks a `Property<Phasor>`; optional free `tailProperty` and dashed axis projection |
| `src/common/view/PhasorChainNode.ts` | An ordered set of phasors drawn head-to-tail or from a common origin, switched by a Property |
| `src/common/view/PhaseArcNode.ts` | The labelled wedge between two angle Properties |
| `src/common/view/PhasorDiagramNode.ts` | Complex-plane backdrop (axes/grid) that supplies the phasor transform |
| `src/common/view/WaveformNode.ts` | Bamboo oscilloscope: one or more sinusoids against two independent y-axes, shared playhead, frozen footprint, quantized autoScale, retunable time window; a trace may ride a DC offset and shade to zero in two colors |
| `src/common/view/FrequencyResponseNode.ts` | Bamboo chart of a quantity vs. *frequency* on a log axis, with operating-point marker, f₀ line and half-power band |
| `src/common/view/axisScale.ts` | The 1–2–5 `niceStep` / `formatTickValue` pair both charts scale their axes with |
| `src/common/view/graph/ConfigurableGraph.ts` | Draggable/resizable/zoomable Y-vs-X explorer (ported from Resonance): user picks each axis via combo box, plot auto-scales with a fading trail. `step()` feeds it one sample per frame via `addDataPoint()`. Sibling files: `PlottableProperty`, `GraphDataManager`, `GraphControlsPanel`, `GraphInteractionHandler` |
| `src/common/view/SimNumberControl.ts` | Pre-themed `NumberControl` (dark-panel title + light value badge + units pattern); `logarithmic` for decade-spanning ranges |
| `src/common/view/SimReadout.ts` | One "label + value badge" row for info panels |
| `src/common/view/CircuitDiagramNode.ts` | Pictorial single-loop circuit: wire, source, element slots, flowing charge |
| `src/common/view/CircuitElementNode.ts` | Base class for the pictorial elements (terminal convention) |
| `src/common/view/CircuitSymbols.ts` | Schematic R / L / C glyphs shared by the element picker and the screen icons |
| `src/common/view/ResistorNode.ts` | Ceramic resistor: color bands encode R, two-layer heat glow runs cold → red → orange-hot with i²R |
| `src/common/view/InductorNode.ts` | Copper coil on a ferrite core; windings track L, core arrows + external field loops + ± marks show v = L·di/dt |
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

- **`Phasor`** — immutable value object for A·cos(Θ+φ), backed by dot's `Complex`.
  `phasor.times(z)` / `phasor.dividedBy(z)` apply Ohm's law in the frequency domain
  (V = I·Z); `phasor.instantaneousAtDrivePhase(Θ)` recovers the live signal from the
  source's accumulated drive phase (prefer that over `instantaneousValue(ω, t)`, which
  jumps when f changes mid-run).
  Expose phasors through a `Property<Phasor>` with `valueComparisonStrategy: "equalsFunction"`.
- **`Impedance.ts`** — `resistorImpedance` / `inductorImpedance` / `capacitorImpedance`
  (and `elementImpedance`, `seriesRlcImpedance`, `resonant{Angular}Frequency`) return
  `Complex` values that feed straight into `Phasor.times`/`dividedBy`.
- **`ACSourceModel`** — composable source: `amplitudeProperty`, `frequencyProperty`,
  derived `angularFrequencyProperty` (2πf) and `voltagePhasorProperty`, plus
  `drivePhaseProperty` advanced as dΘ/dt = ω so frequency changes stay continuous.
  Compose it into a screen model (`public readonly source = new ACSourceModel()`),
  don't extend it. Call `source.advanceDrivePhase(dtApplied)` from the screen's
  `step` / `stepForward` with the same dt the clock actually applied.
- **`RlcCircuitModel`** — the whole series loop, composed by screens 2, 3 and 4
  (`public readonly circuit = new RlcCircuitModel()`). Never re-derive Z, I, the element
  voltages, f₀, Q or the half-power edges in a screen model; add them here if they are
  missing. Pass `{ resistance, inductance, capacitance }` where a screen needs to open
  on a particular corner of the R–L–C space (the Resonance screen does, so that its
  curve has a visible peak in it from the start). Its `impedanceAt` / `currentAmplitudeAt`
  / `phaseAt` answer for frequencies the circuit is *not* being driven at, without
  touching any Property — that is what a response curve samples. A screen composing it
  re-exports the Properties its view and tests use as its own fields (`SeriesRlcModel`
  and `ResonanceModel` both do) so nothing reaches through `model.circuit.*`; the two
  sampling methods above are the exception, because they are methods, not Properties.

#### Disposal

Anything that links a Property somebody else owns has to let go of it again, and the
suite in `tests/memory-leak.test.ts` is what holds that line. Two rules:

- **Every model has `dispose()`**, disposing its Properties in the reverse of
  construction order (leaves first — a `DerivedProperty` is a listener on the ones it
  was built from) and finishing with the composed `TimeModel` / `ACSourceModel` /
  `RlcCircuitModel`. Never dispose an aliased Property twice: `voltagePhasorProperty` is
  the source's, and `source.dispose()` owns it.
- **Every view node that links a caller's Property has `dispose()`.** Collect them into
  a `private readonly disposables: { dispose(): void }[]` as they are built and release
  them in a `dispose()` override before `super.dispose()` — the pattern all four screen
  views and `CircuitDiagramNode` use. Scenery's `Node.dispose()` does *not* dispose
  children, so a node holding a sub-node that links a model Property must dispose it
  explicitly. Assert the release as `someProperty.hasListeners() === false`, not as a
  collected `WeakRef`.
- **`PhasorDiagramNode`** builds the complex-plane transform; pass its
  `modelViewTransform` to each **`PhasorNode`**, **`PhasorChainNode`** or
  **`PhaseArcNode`** you `addChild`. **`WaveformNode`** is an imperative scope — call
  `setTrace(i, A, ω, φ)` on change and `setCursorTime(t)` in `step`.

#### Drawing a sum: `PhasorChainNode`

Where a set of phasors is known to add up to something — V_R + V_L + V_C = V, or
R + jX = Z — draw it with `PhasorChainNode` rather than as loose `PhasorNode`s. Given a
`tipToTailProperty` it switches between the two arrangements that make different things
obvious, and one checkbox can then drive several diagrams at once:

```typescript
new PhasorChainNode(
  [ { property: displayVR, fill: resistorColor,  label: "V<sub>R</sub>" },
    { property: displayVL, fill: inductorColor,  label: "V<sub>L</sub>" },
    { property: displayVC, fill: capacitorColor, label: "V<sub>C</sub>" } ],
  diagram.modelViewTransform,
  { tipToTailProperty, resultant: { property: displayV, fill: textColor, label: "V" } },
);
```

Labels are `RichText`, so subscripts work. Normalize against the *chain's* extent, not
the longest single phasor, and take the maximum over both arrangements — otherwise the
figure resizes when the checkbox is ticked.

`PhasorNode` gains two options worth knowing: `tailProperty` (what the chain uses) and
`showProjection: "real"`, the dashed drop from the tip onto an axis whose foot is the
signal's instantaneous value — the construction that ties a rotating phasor to the
waveform beside it.

#### `WaveformNode`

A bamboo chart with three rules that keep a scope readable while the physics moves under
it. All three should be preserved in new scopes:

- **Its layout bounds are frozen at construction** and the traces are clipped to the
  chart rectangle, so a changing amplitude or tick label can never move the node — nor
  anything laid out below it.
- **`autoScale` snaps the full scale to a 1–2–5 sequence** rather than tracking the
  amplitude, so the axis holds still through small changes and always reads as round
  numbers. Prefer a fixed `maxAmplitude` where the signal has a known bound (source
  voltage); reserve `autoScale` for signals that span decades (current through a reactance).
- **`setTimeWindow(seconds)` keeps a fixed number of cycles on screen.** Drive it from
  the frequency (`SCOPE_PERIODS_SHOWN / f`): across the 0.02–5 Hz range a window fixed in
  seconds shows a flat line at one end and a picket fence at the other.

Pass `traces` to plot several signals at once. A trace with `axis: "right"` is read
against a second, independently-scaled vertical axis, which is how volts and amps share
one chart — and sharing the time base is the point, because the phase difference then
becomes a horizontal offset you can point at. Each trace's caption is drawn in its own
color, so no separate legend is needed.

A trace can also carry a DC `offset`, shade the area between itself and zero (`fill` /
`negativeFill`, split at the crossings), draw a dashed line at that offset
(`showAverageLine`) and caption the average rather than the peak
(`captionValue: "average"`). That combination is what the Power screen's lower scope is:
p(t) = P + S·cos(2ωt − φ) is a sinusoid at twice the drive frequency sitting on the real
power, and the two shaded colors separate energy delivered from energy handed back.

`tests/WaveformNode.test.ts` guards the frozen footprint against all of this.

#### `FrequencyResponseNode`

The same three rules, one axis over: the horizontal axis is **log₁₀(frequency)** rather
than time, so each decade of the 0.02–5 Hz range gets equal width and the sub-hertz region
where every resonance lives is legible. Also imperative — `setCurve(f => …)` resamples,
`setMarkerFrequency(f)` slides the operating point along the curve, `setResonantFrequency`
and `setBand` mark f₀ and the half-power band.

Keep the curve and the marker on separate updates, as the Resonance screen does: the curve
is a function of R, L, C and the source amplitude only, so a sweep can re-mark it 60 times
a second while the (much more expensive) resample happens only when the circuit changes.
Take the band edges from the model's `lower`/`upperHalfPowerFrequencyProperty` rather than
computing f₀ ± Δf/2 — the two agree only at high Q, and this sim's L–C ranges reach well
below that.

Physics defaults and ranges (amplitude, frequency, R/L/C) live in `ACPhasorConstants.ts`.
The frequency range spans 2.4 decades, so its control is built with
`SimNumberControl`'s `logarithmic: true` — the slider then divides the range by ratio
rather than by difference, and the sub-hertz region where every resonance lives gets as
much travel as the top end.

#### `ConfigurableGraph` (ported from Resonance)

A draggable, resizable, zoomable Y-vs-X explorer overlay — distinct from the two
purpose-built charts above. The user picks which physical quantity goes on each axis
via two combo boxes in the `(Y vs X)` title bar; the plot auto-scales (10% padding,
nice-number ticks) and draws a fading trail of recent points. Wheel/pinch zoom,
drag-to-pan, per-axis zoom, header drag, and corner resize are all built in. A
double-click or the ↻ button returns to auto-scale.

Unlike `WaveformNode`/`FrequencyResponseNode` it takes **arbitrary** data: build a
`PlottableProperty[]` (`{ name, property, unit? }`) from any live `TReadOnlyProperty<number>`
and call `graph.addDataPoint()` once per frame in the screen view's `step` while
`getGraphVisibleProperty().value` is true. It is currently wired into the Series RLC
screen (toggle button bottom-left), defaulting to Current vs. frequency. The Resonance
sub-step (RK4 high-resolution) path was dropped in the port — ACPhasor's models are
single-step — so each axis is sampled at its property's current value. Three colors
(`graphBackgroundProperty`, `gridLinesProperty`, `plotColorProperty`) were added to
`ACPhasorColors.ts` for it; text, panel stroke and panel fill reuse the existing palette.

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
circuit.setState(model.currentPhasorProperty.value, angularFrequency, drivePhase);
```

- A slot takes either a fixed `type` or a live `typeProperty` (all three parts are built
  and the selected one shown). Its optional value Properties drive the drawing:
  resistor color bands encode R, winding count tracks L, plate area grows with C.
- Each element also gets a **live decoration** driven by `setState`, and the three
  together tell one story — R spends energy, L and C store and return it:
  the resistor glows with p = i²R, running from cold through red to orange-hot as two
  glow layers cross-fade; the inductor's core arrows and the closed field loops around
  it follow i while its terminal ± marks follow v = L·di/dt; the capacitor's plates
  carry q = C·v as ± symbols, a charge tint, and field arrows in the gap.
- The inductor's field loops are placed at radius `inner + (k + |i|/i_peak)·spacing`,
  which makes their *position* the field and their radial *speed* proportional to
  |v_L| = |L·di/dt|. So the loops hang motionless at the current peak — exactly where
  the ± marks vanish — and race through the zero crossing where those marks are
  strongest. Keep it a pure function of the instantaneous field rather than an
  integrated scroll, or pause / step-forward / reset will drift out of agreement.
- `elementScale` picks the reference those voltage-driven decorations use:
  `"absolute"` (against `CAPACITOR_SATURATION_CHARGE_C` / `INDUCTOR_SATURATION_EMF_V`)
  where the element sees the source voltage, `"peak"` in a series loop where one
  element's share can be a sliver of it. Pass the element's `voltageProperty` in the
  slot or the decoration has nothing to scale.
- Every element in a slot shares one footprint (`ELEMENT_HALF_WIDTH`) and the diagram
  freezes its layout bounds at construction, so switching type never shifts the screen.
  A decoration that is hidden at rest is out of bounds while hidden, so a part that has
  one must freeze its own `localBounds` at the decoration's full extent —
  `InductorNode` does this for its field loops. Anything that can grow the bounds must
  also be built *before* `CircuitDiagramNode` freezes its own.
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

Baton's compliance check passes. Two documented deviations:

- **IEC resistor band colors in `src/common/view/ResistorNode.ts`** (`BAND_COLORS`,
  `GOLD_BAND_COLOR`, `SILVER_BAND_COLOR`) are fixed standard codes, not themeable UI chrome.
  Putting them in `*Colors.ts` would imply projector remapping that would misrepresent the
  physical color code. The compliance script flags them as possible hardcoded colors; that
  warning is expected.

- **Math-notation axis labels are not localized.** `PhasorDiagramNode`'s `"Re"` / `"Im"`,
  `WaveformNode`'s `"t (s)"` and `FrequencyResponseNode`'s `"f (Hz)"` are quantity symbols
  and SI units, the same notation as the `"V"` / `"I"` / `"V<sub>R</sub>"` phasor labels
  beside them, and they are written identically in every locale the sim ships. All three are
  *options* with these as defaults, so a screen that wants words instead passes a
  `StringProperty` — the Resonance screen does exactly that for its frequency axis.

## Testing

Fleet-standard Vitest layout (keep when forking):

| Path | Purpose |
|---|---|
| `vitest.config.ts` | `happy-dom` environment; `setupFiles: ["./tests/setup.ts"]`; `execArgv: ["--expose-gc"]` |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports |
| `tests/TimeModel.test.ts` | Clock unit tests |
| `tests/{Phasor,Impedance,ACSourceModel,IntroModel,SeriesRlcModel}.test.ts` | Physics: Ohm's law, KVL, the regimes, resonance, triangle similarity |
| `tests/RlcCircuitModel.test.ts` | The shared loop: Q, exact half-power edges, response helpers agreeing with the live Properties |
| `tests/ResonanceModel.test.ts` | The sweep: logarithmic travel, range clamping, wrap, and picking up an outside frequency change |
| `tests/PowerModel.test.ts` | P/Q/S, power factor, and P as the *numerically integrated* average of v·i |
| `tests/WaveformNode.test.ts` | Frozen footprint under rescale / retune, independent y-axes, offset + shaded traces |
| `tests/FrequencyResponseNode.test.ts` | Frozen footprint under curve rescale, marker travel, band and non-finite samples |
| `tests/SimNumberControl.test.ts` | The logarithmic-slider bridge, including both ends of the range |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression for every screen model, plus listener-detach checks for the view nodes that link model Properties |
| `tests/fuzz/fuzz.spec.ts` | Optional Playwright fuzz smoke via joist `?fuzz` |
| `playwright.config.ts` | Chromium project + Vite webServer for fuzz |

- Put unit tests only under root `tests/`, mirroring `src/` (never co-locate or use `__tests__/`).
- Run `npm test`. CI runs the suite when a `test` script is present.
- Expand `memory-leak.test.ts` for any component that adds/removes nodes or links Properties at
  runtime (see OpticsLab for a deep suite). For a **view node**, assert that `dispose()`
  leaves `someProperty.hasListeners()` false rather than asserting a `WeakRef` was
  collected: a scenery `Node` is reached from enough long-lived machinery to make
  collection a flaky proxy, whereas the leftover listener is the actual defect — the
  model keeps the node alive *and* keeps calling into it.
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
