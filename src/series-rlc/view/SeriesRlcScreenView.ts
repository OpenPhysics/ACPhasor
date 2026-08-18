/**
 * SeriesRlcScreenView.ts
 *
 * View for the Series RLC screen. Two phasor diagrams sit side by side and are
 * the point of the screen: the voltage triangle, rotating at ω, and the impedance
 * triangle, which does not rotate because impedance is not a function of time.
 * They are the same shape — divide every voltage by the current the whole loop
 * shares and you get the impedances — and a single checkbox redraws both, either
 * tip to tail (where V_R + V_L + V_C closing onto V *is* Kirchhoff's voltage law)
 * or from a common origin (where the magnitudes and angles compare directly).
 *
 * Below them a dual-trace oscilloscope plots v(t) and i(t) against their own axes
 * over a shared time base, and the pictorial circuit above shows the same current
 * flowing through real-looking parts. A readout panel reports |Z|, the net
 * reactance, the phase, and the resonant frequency, and calls out resonance when
 * the reactances cancel.
 */
import { BooleanProperty, DerivedProperty, Multilink, Property } from "scenerystack/axon";
import { Range, Vector2 } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { Checkbox, RectangularPushButton } from "scenerystack/sun";
import ACPhasorColors from "../../ACPhasorColors.js";
import {
  AC_AMPLITUDE_RANGE_V,
  AC_FREQUENCY_RANGE_HZ,
  CAPACITANCE_RANGE_F,
  INDUCTANCE_RANGE_H,
  RESISTANCE_RANGE_OHMS,
  SCOPE_PERIODS_SHOWN,
  SCREEN_VIEW_MARGIN,
  SERIES_CIRCUIT_SIZE,
  SERIES_IMPEDANCE_DIAL_VIEW_RADIUS,
  SERIES_SCOPE_SIZE,
  SERIES_VOLTAGE_DIAL_VIEW_RADIUS,
} from "../../ACPhasorConstants.js";
import { Phasor } from "../../common/model/Phasor.js";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/SimButtonOptions.js";
import { SimPanel } from "../../common/SimPanel.js";
import { DEFAULT_TIME_SPEEDS } from "../../common/TimeModel.js";
import { CircuitDiagramNode } from "../../common/view/CircuitDiagramNode.js";
import ConfigurableGraph from "../../common/view/graph/ConfigurableGraph.js";
import type { PlottableProperty } from "../../common/view/graph/PlottableProperty.js";
import { PhaseArcNode } from "../../common/view/PhaseArcNode.js";
import { PhasorChainNode } from "../../common/view/PhasorChainNode.js";
import { PhasorDiagramNode } from "../../common/view/PhasorDiagramNode.js";
import { PhasorNode } from "../../common/view/PhasorNode.js";
import { SimNumberControl } from "../../common/view/SimNumberControl.js";
import { SimReadout } from "../../common/view/SimReadout.js";
import { WaveformNode } from "../../common/view/WaveformNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeriesRlcModel } from "../model/SeriesRlcModel.js";
import { SeriesRlcScreenSummaryContent } from "./SeriesRlcScreenSummaryContent.js";

const DIAGRAM_MODEL_RADIUS = 1;
// Fraction of the dial radius the figure's furthest point should reach.
const NORMALIZATION_TARGET = 0.86;
// The current phasor is normalized separately — amps and volts share no scale —
// and drawn a little shorter so it stays legible where it lies along V_R.
const CURRENT_TARGET = 0.55;

/**
 * How far from the origin a set of phasors reaches, counting both arrangements
 * the diagram can be in: each phasor's own length (drawn from a common origin)
 * and every partial sum along the chain (drawn head to tail, where the run can
 * wander further out than any single phasor before closing back).
 *
 * Normalizing against this rather than against the longest phasor fills the dial
 * properly, and taking the maximum over *both* arrangements means ticking the
 * checkbox re-poses the figure without resizing it.
 */
function chainExtent(...phasors: Phasor[]): number {
  let sum = Vector2.ZERO;
  let extent = 0;
  for (const phasor of phasors) {
    sum = sum.plus(phasor.toVector2());
    extent = Math.max(extent, sum.magnitude, phasor.amplitude);
  }
  return Math.max(extent, 1e-6);
}

// Radius of the phase wedge on each diagram, in model units.
const PHASE_ARC_RADIUS = 0.3;

// Trace indices into the dual-trace scope.
const VOLTAGE_TRACE = 0;
const CURRENT_TRACE = 1;

/** A display phasor: normalized, and on the voltage dial also rotated by ωt. */
function displayPhasorProperty(): Property<Phasor> {
  return new Property(Phasor.ZERO, { valueComparisonStrategy: "equalsFunction" });
}

export type SeriesRlcScreenViewOptions = ScreenViewOptions;

export class SeriesRlcScreenView extends ScreenView {
  private readonly model: SeriesRlcModel;
  private readonly circuit: CircuitDiagramNode;
  private readonly scope: WaveformNode;
  private readonly graph: ConfigurableGraph;

  // Voltage phasors as drawn: normalized to the dial and rotating at ω.
  private readonly displaySource = displayPhasorProperty();
  private readonly displayResistor = displayPhasorProperty();
  private readonly displayInductor = displayPhasorProperty();
  private readonly displayCapacitor = displayPhasorProperty();
  private readonly displayCurrent = displayPhasorProperty();

  private readonly disposables: { dispose(): void }[] = [];

  public constructor(model: SeriesRlcModel, providedOptions?: SeriesRlcScreenViewOptions) {
    const options = optionize<SeriesRlcScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new SeriesRlcScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    this.model = model;
    const labels = StringManager.getInstance().getLabels();
    const a11y = StringManager.getInstance().getSeriesRlcA11yStrings();

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: ACPhasorColors.backgroundColorProperty,
      }),
    );

    /** True draws both triangles head to tail; false collapses them to the origin. */
    const tipToTailProperty = new BooleanProperty(true);

    // ── Circuit diagram (R–L–C loop with flowing charges) ───────────────────
    // Across the top: each part shows its own value (bands, windings, plate
    // area) and the capacitor's plates charge and discharge with V_C.
    this.circuit = new CircuitDiagramNode({
      width: SERIES_CIRCUIT_SIZE.width,
      height: SERIES_CIRCUIT_SIZE.height,
      sourceVoltageProperty: model.source.voltagePhasorProperty,
      // Each element takes only a slice of the source voltage here, so scale the
      // plate charge and the inductor's EMF marks to their own peaks rather than
      // to an absolute reference.
      elementScale: "peak",
      slots: [
        { type: "resistor", resistanceProperty: model.resistanceProperty },
        {
          type: "inductor",
          inductanceProperty: model.inductanceProperty,
          inductanceRange: INDUCTANCE_RANGE_H,
          voltageProperty: model.inductorVoltageProperty,
        },
        {
          type: "capacitor",
          capacitanceProperty: model.capacitanceProperty,
          capacitanceRange: CAPACITANCE_RANGE_F,
          voltageProperty: model.capacitorVoltageProperty,
        },
      ],
    });
    this.circuit.left = SCREEN_VIEW_MARGIN + 10;
    this.circuit.top = SCREEN_VIEW_MARGIN;
    this.disposables.push(this.circuit);

    // ── Voltage triangle ────────────────────────────────────────────────────
    const voltageDiagram = new PhasorDiagramNode({
      modelRadius: DIAGRAM_MODEL_RADIUS,
      viewRadius: SERIES_VOLTAGE_DIAL_VIEW_RADIUS,
    });
    const voltageChain = new PhasorChainNode(
      [
        { property: this.displayResistor, fill: ACPhasorColors.resistorColorProperty, label: "V<sub>R</sub>" },
        { property: this.displayInductor, fill: ACPhasorColors.inductorColorProperty, label: "V<sub>L</sub>" },
        { property: this.displayCapacitor, fill: ACPhasorColors.capacitorColorProperty, label: "V<sub>C</sub>" },
      ],
      voltageDiagram.modelViewTransform,
      {
        tipToTailProperty: tipToTailProperty,
        resultant: { property: this.displaySource, fill: ACPhasorColors.textColorProperty, label: "V" },
      },
    );
    voltageDiagram.addChild(voltageChain);
    // The current is on its own scale, so it is drawn thinner: it is here to be
    // compared in angle with V, not in length with the voltages.
    const currentPhasorNode = new PhasorNode(this.displayCurrent, voltageDiagram.modelViewTransform, {
      fill: ACPhasorColors.chargeColorProperty,
      labelString: "I",
      tailWidth: 2,
      headWidth: 9,
      headHeight: 9,
    });
    voltageDiagram.addChild(currentPhasorNode);
    const voltagePhaseArc = new PhaseArcNode(
      new DerivedProperty([this.displayCurrent], (current) => current.phase),
      new DerivedProperty([this.displaySource], (source) => source.phase),
      voltageDiagram.modelViewTransform,
      { modelRadius: PHASE_ARC_RADIUS, stroke: ACPhasorColors.textColorProperty },
    );
    voltageDiagram.addChild(voltagePhaseArc);
    this.disposables.push(voltageChain, currentPhasorNode, voltagePhaseArc);

    // ── Impedance triangle ──────────────────────────────────────────────────
    // Deliberately still: Z is a property of the circuit at this frequency, not
    // of the instant. Its shape is the voltage triangle's, divided through by I.
    const impedanceDiagram = new PhasorDiagramNode({
      modelRadius: DIAGRAM_MODEL_RADIUS,
      viewRadius: SERIES_IMPEDANCE_DIAL_VIEW_RADIUS,
    });
    const displayResistance = displayPhasorProperty();
    const displayReactance = displayPhasorProperty();
    const displayImpedance = displayPhasorProperty();
    const impedanceChain = new PhasorChainNode(
      [
        { property: displayResistance, fill: ACPhasorColors.resistorColorProperty, label: "R" },
        { property: displayReactance, fill: ACPhasorColors.inductorColorProperty, label: "X" },
      ],
      impedanceDiagram.modelViewTransform,
      {
        tipToTailProperty: tipToTailProperty,
        resultant: { property: displayImpedance, fill: ACPhasorColors.impedanceColorProperty, label: "Z" },
      },
    );
    impedanceDiagram.addChild(impedanceChain);
    // Measured from the real axis, where R lies, round to Z.
    const impedancePhaseArc = new PhaseArcNode(
      new DerivedProperty([displayImpedance], () => 0),
      new DerivedProperty([displayImpedance], (impedance) => impedance.phase),
      impedanceDiagram.modelViewTransform,
      { modelRadius: PHASE_ARC_RADIUS, stroke: ACPhasorColors.impedanceColorProperty },
    );
    impedanceDiagram.addChild(impedancePhaseArc);
    this.disposables.push(impedanceChain, impedancePhaseArc);

    const captionOptions = { font: "14px sans-serif", fill: ACPhasorColors.textColorProperty };
    const diagramRow = new HBox({
      spacing: 20,
      align: "top",
      children: [
        new VBox({
          spacing: 4,
          children: [new Text(labels.voltageTriangleStringProperty, captionOptions), voltageDiagram],
        }),
        new VBox({
          spacing: 4,
          children: [new Text(labels.impedanceTriangleStringProperty, captionOptions), impedanceDiagram],
        }),
      ],
    });
    diagramRow.left = SCREEN_VIEW_MARGIN + 20;
    diagramRow.top = this.circuit.bottom + 12;

    const tipToTailCheckbox = new Checkbox(
      tipToTailProperty,
      new Text(labels.tipToTailStringProperty, {
        font: "14px sans-serif",
        fill: ACPhasorColors.textColorProperty,
      }),
      {
        checkboxColor: ACPhasorColors.textColorProperty,
        checkboxColorBackground: ACPhasorColors.panelBackgroundColorProperty,
        accessibleName: a11y.controls.tipToTailStringProperty,
      },
    );
    tipToTailCheckbox.left = diagramRow.left;
    tipToTailCheckbox.top = diagramRow.bottom + 8;

    // ── Oscilloscope ────────────────────────────────────────────────────────
    this.scope = new WaveformNode({
      viewWidth: SERIES_SCOPE_SIZE.width,
      viewHeight: SERIES_SCOPE_SIZE.height,
      showCursor: true,
      traces: [
        {
          stroke: ACPhasorColors.textColorProperty,
          label: "v(t)",
          units: "V",
          maxAmplitude: AC_AMPLITUDE_RANGE_V.max,
        },
        {
          stroke: ACPhasorColors.chargeColorProperty,
          label: "i(t)",
          units: "A",
          axis: "right",
          autoScale: true,
        },
      ],
    });
    this.scope.left = SCREEN_VIEW_MARGIN + 40;
    this.scope.top = tipToTailCheckbox.bottom + 26;

    // ── Control panel ───────────────────────────────────────────────────────
    const resistanceControl = new SimNumberControl(
      labels.resistanceStringProperty,
      model.resistanceProperty,
      RESISTANCE_RANGE_OHMS,
      labels.ohmsPatternStringProperty,
      { decimalPlaces: 0, accessibleName: a11y.controls.resistanceStringProperty },
    );
    const inductanceControl = new SimNumberControl(
      labels.inductanceStringProperty,
      model.inductanceProperty,
      INDUCTANCE_RANGE_H,
      labels.henriesPatternStringProperty,
      { decimalPlaces: 1, accessibleName: a11y.controls.inductanceStringProperty },
    );
    const capacitanceControl = new SimNumberControl(
      labels.capacitanceStringProperty,
      model.capacitanceProperty,
      CAPACITANCE_RANGE_F,
      labels.faradsPatternStringProperty,
      { decimalPlaces: 1, accessibleName: a11y.controls.capacitanceStringProperty },
    );
    const sourceVoltageControl = new SimNumberControl(
      labels.sourceVoltageStringProperty,
      model.source.amplitudeProperty,
      AC_AMPLITUDE_RANGE_V,
      labels.voltsPatternStringProperty,
      { decimalPlaces: 1, accessibleName: a11y.controls.sourceVoltageStringProperty },
    );
    // Logarithmic: resonance for most L–C combinations sits below 1 Hz, and on a
    // linear track that whole region would be the first fifth of the travel.
    const frequencyControl = new SimNumberControl(
      labels.frequencyStringProperty,
      model.source.frequencyProperty,
      AC_FREQUENCY_RANGE_HZ,
      labels.hertzPatternStringProperty,
      {
        decimalPlaces: 2,
        logarithmic: true,
        accessibleName: a11y.controls.frequencyStringProperty,
      },
    );

    const controlPanel = new SimPanel(
      new VBox({
        align: "center",
        spacing: 12,
        children: [resistanceControl, inductanceControl, capacitanceControl, sourceVoltageControl, frequencyControl],
      }),
    );
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = SCREEN_VIEW_MARGIN;

    // ── Readout panel ───────────────────────────────────────────────────────
    const impedanceMagnitude = new DerivedProperty([model.impedanceProperty], (impedance) => impedance.magnitude);
    const phaseDegrees = new DerivedProperty([model.phaseProperty], (phase) => (phase * 180) / Math.PI);

    // The badge confirms what the diagrams already show — at resonance the
    // reactive phasors cancel and both triangles collapse onto a flat line.
    const resonanceBadge = new Text(labels.atResonanceStringProperty, {
      font: "bold 14px sans-serif",
      fill: ACPhasorColors.resonanceHighlightColorProperty,
      visibleProperty: model.isAtResonanceProperty,
    });

    const readoutPanel = new SimPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [
          new SimReadout(
            labels.impedanceStringProperty,
            impedanceMagnitude,
            labels.ohmsPatternStringProperty,
            new Range(0, 1000),
            1,
          ),
          new SimReadout(
            labels.reactanceStringProperty,
            model.reactanceProperty,
            labels.ohmsPatternStringProperty,
            new Range(-1000, 1000),
            1,
          ),
          new SimReadout(
            labels.phaseStringProperty,
            phaseDegrees,
            labels.degreesPatternStringProperty,
            new Range(-90, 90),
            0,
          ),
          new SimReadout(
            labels.resonantFrequencyStringProperty,
            model.resonantFrequencyProperty,
            labels.hertzPatternStringProperty,
            new Range(0, 100),
            2,
          ),
          resonanceBadge,
        ],
      }),
      { align: "left" },
    );
    // Beside the diagrams rather than under the controls: the numbers describe
    // the two triangles, and the right-hand column is already full of sliders.
    readoutPanel.left = diagramRow.right + 25;
    readoutPanel.top = diagramRow.top + 16;

    // ── Time control + reset ────────────────────────────────────────────────
    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timer.timeSpeedProperty,
      timeSpeeds: DEFAULT_TIME_SPEEDS,
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
          // stepForward, not step: the button is only ever pressed while paused.
          listener: () => model.stepForward(1 / 60),
        },
      },
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    // The speed radio buttons make the time control wide enough to reach the
    // reset button, so it is placed off that rather than off the panel above it.
    timeControl.right = resetAllButton.left - 30;

    // ── ConfigurableGraph overlay ──────────────────────────────────────────
    // A draggable Y-vs-X explorer (ported from Resonance) that lets the user
    // plot any two of the screen's live quantities against each other. It starts
    // hidden; the toggle button below shows/hides it. When visible, step() feeds
    // it one sample per frame from the currently selected axes' Properties.
    const sourceAmplitudeProperty = new DerivedProperty([model.voltagePhasorProperty], (v) => v.amplitude);
    const currentAmplitudeProperty = new DerivedProperty([model.currentPhasorProperty], (i) => i.amplitude);
    const resistorAmplitudeProperty = new DerivedProperty([model.resistorVoltageProperty], (v) => v.amplitude);
    const inductorAmplitudeProperty = new DerivedProperty([model.inductorVoltageProperty], (v) => v.amplitude);
    const capacitorAmplitudeProperty = new DerivedProperty([model.capacitorVoltageProperty], (v) => v.amplitude);
    const phaseDegreesProperty = new DerivedProperty([model.phaseProperty], (phase) => (phase * 180) / Math.PI);
    const impedanceMagnitudeProperty = new DerivedProperty([model.impedanceProperty], (z) => z.magnitude);

    const frequencyPlottable: PlottableProperty = {
      name: labels.frequencyStringProperty,
      property: model.source.frequencyProperty,
      unit: "Hz",
    };
    const currentPlottable: PlottableProperty = {
      name: labels.currentStringProperty,
      property: currentAmplitudeProperty,
      unit: "A",
    };
    const plottableProperties: PlottableProperty[] = [
      { name: labels.sourceVoltageStringProperty, property: sourceAmplitudeProperty, unit: "V" },
      currentPlottable,
      { name: "V_R", property: resistorAmplitudeProperty, unit: "V" },
      { name: "V_L", property: inductorAmplitudeProperty, unit: "V" },
      { name: "V_C", property: capacitorAmplitudeProperty, unit: "V" },
      frequencyPlottable,
      { name: labels.phaseStringProperty, property: phaseDegreesProperty, unit: "°" },
      { name: labels.impedanceStringProperty, property: impedanceMagnitudeProperty, unit: "Ω" },
      { name: labels.reactanceStringProperty, property: model.reactanceProperty, unit: "Ω" },
    ];
    this.graph = new ConfigurableGraph(
      plottableProperties,
      frequencyPlottable, // x = frequency
      currentPlottable, // y = current amplitude
      SERIES_SCOPE_SIZE.width,
      SERIES_SCOPE_SIZE.height,
      this,
    );
    this.graph.left = SCREEN_VIEW_MARGIN + 40;
    this.graph.top = tipToTailCheckbox.bottom + 26;
    this.disposables.push(this.graph);

    const graphToggleButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(labels.graphStringProperty, { font: "14px sans-serif" }),
      listener: () => {
        const visible = this.graph.getGraphVisibleProperty();
        visible.value = !visible.value;
        if (visible.value) {
          this.graph.clearData();
        }
      },
      left: SCREEN_VIEW_MARGIN + 40,
      top: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN - 30,
      accessibleName: a11y.controls.graphStringProperty,
    });

    this.addChild(this.circuit);
    this.addChild(diagramRow);
    this.addChild(tipToTailCheckbox);
    this.addChild(this.scope);
    this.addChild(readoutPanel);
    this.addChild(controlPanel);
    this.addChild(timeControl);
    this.addChild(resetAllButton);
    this.addChild(this.graph);
    this.addChild(graphToggleButton);

    // ── Bindings ────────────────────────────────────────────────────────────
    // The impedance triangle is normalized on its own and never rotates.
    this.disposables.push(
      Multilink.multilink(
        [model.resistancePhasorProperty, model.reactancePhasorProperty, model.impedancePhasorProperty],
        (resistance, reactance, impedance) => {
          const scale = NORMALIZATION_TARGET / chainExtent(resistance, reactance);
          displayResistance.value = resistance.scaled(scale);
          displayReactance.value = reactance.scaled(scale);
          displayImpedance.value = impedance.scaled(scale);
        },
      ),
    );

    this.disposables.push(
      // Hold a fixed number of cycles on screen across the frequency range.
      Multilink.multilink([model.source.frequencyProperty], (frequency) => {
        this.scope.setTimeWindow(SCOPE_PERIODS_SHOWN / Math.max(frequency, 1e-6));
      }),
      Multilink.multilink(
        [model.voltagePhasorProperty, model.source.angularFrequencyProperty],
        (voltage, angularFrequency) =>
          this.scope.setTrace(VOLTAGE_TRACE, voltage.amplitude, angularFrequency, voltage.phase),
      ),
      Multilink.multilink(
        [model.currentPhasorProperty, model.source.angularFrequencyProperty],
        (current, angularFrequency) =>
          this.scope.setTrace(CURRENT_TRACE, current.amplitude, angularFrequency, current.phase),
      ),
    );

    this.addChild(
      new Node({
        pdomOrder: [
          resistanceControl,
          inductanceControl,
          capacitanceControl,
          sourceVoltageControl,
          frequencyControl,
          tipToTailCheckbox,
          graphToggleButton,
          timeControl,
          resetAllButton,
        ],
      }),
    );

    this.updateRotatingPhasors();
  }

  /**
   * Re-normalize and re-aim the voltage phasors for the current instant.
   *
   * All four voltages share one scale factor so their relative lengths stay
   * honest, and one rotation so the figure turns rigidly — the shape of the
   * triangle is the physics, and it must not deform as it spins.
   */
  private updateRotatingPhasors(): void {
    const model = this.model;
    const time = model.timer.timeProperty.value;
    const drivePhase = model.source.drivePhaseProperty.value;
    const angularFrequency = model.source.angularFrequencyProperty.value;

    const source = model.voltagePhasorProperty.value;
    const resistor = model.resistorVoltageProperty.value;
    const inductor = model.inductorVoltageProperty.value;
    const capacitor = model.capacitorVoltageProperty.value;
    const current = model.currentPhasorProperty.value;

    const scale = NORMALIZATION_TARGET / chainExtent(resistor, inductor, capacitor);

    this.displaySource.value = source.scaled(scale).rotated(drivePhase);
    this.displayResistor.value = resistor.scaled(scale).rotated(drivePhase);
    this.displayInductor.value = inductor.scaled(scale).rotated(drivePhase);
    this.displayCapacitor.value = capacitor.scaled(scale).rotated(drivePhase);
    // Amps and volts share no scale, so the current gets its own.
    this.displayCurrent.value = new Phasor(CURRENT_TARGET, current.phase + drivePhase);

    this.scope.setCursorTime(time, drivePhase);
    this.circuit.setState(current, angularFrequency, drivePhase);
  }

  public reset(): void {
    this.updateRotatingPhasors();
    this.graph.reset();
  }

  public override step(_dt: number): void {
    this.updateRotatingPhasors();
    // Sample the configurable graph once per frame while it is visible.
    if (this.graph.getGraphVisibleProperty().value) {
      this.graph.addDataPoint();
    }
  }

  public override dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    super.dispose();
  }
}
