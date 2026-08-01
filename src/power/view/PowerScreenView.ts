/**
 * PowerScreenView.ts
 *
 * View for the Power-in-AC-circuits screen. The left column is one argument read
 * downward: the circuit, then the two signals that drive it, then their product.
 *
 *   v(t) and i(t)  — the same dual-trace scope as the earlier screens, so the
 *                    phase shift between them is a horizontal offset.
 *   p(t) = v·i     — directly below, over the *same* time base. It oscillates at
 *                    twice the frequency, which is visible by lining up the two
 *                    charts, and it is shaded in two colors split at the zero
 *                    crossings: energy into the circuit, and energy handed back.
 *                    The dashed line is the average — the real power P.
 *
 * On the right the power triangle draws P, Q and S with the same
 * {@link PhasorChainNode} the impedance triangle uses, because it is the same
 * triangle scaled by ½·I². Slide the load toward resonance and it flattens onto
 * the P axis as the power factor goes to one, and p(t) stops going negative at
 * the same moment: no energy comes back because none was ever stored.
 *
 * The pictorial circuit at the top makes the same point physically — the
 * resistor's glow is the power it burns, while the inductor's field and the
 * capacitor's plate charge build and collapse without consuming anything.
 */
import { DerivedProperty, Multilink } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import ACPhasorColors from "../../ACPhasorColors.js";
import {
  AC_AMPLITUDE_RANGE_V,
  AC_FREQUENCY_RANGE_HZ,
  CAPACITANCE_RANGE_F,
  INDUCTANCE_RANGE_H,
  POWER_CIRCUIT_SIZE,
  POWER_SCOPE_SIZE,
  POWER_TRIANGLE_DIAL_VIEW_RADIUS,
  RESISTANCE_RANGE_OHMS,
  SCOPE_PERIODS_SHOWN,
  SCREEN_VIEW_MARGIN,
} from "../../ACPhasorConstants.js";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/SimButtonOptions.js";
import { SimPanel } from "../../common/SimPanel.js";
import { DEFAULT_TIME_SPEEDS } from "../../common/TimeModel.js";
import { CircuitDiagramNode } from "../../common/view/CircuitDiagramNode.js";
import { PhaseArcNode } from "../../common/view/PhaseArcNode.js";
import { PhasorChainNode } from "../../common/view/PhasorChainNode.js";
import { PhasorDiagramNode } from "../../common/view/PhasorDiagramNode.js";
import { SimNumberControl } from "../../common/view/SimNumberControl.js";
import { SimReadout } from "../../common/view/SimReadout.js";
import { WaveformNode } from "../../common/view/WaveformNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { PowerModel } from "../model/PowerModel.js";
import { PowerScreenSummaryContent } from "./PowerScreenSummaryContent.js";

const DIAGRAM_MODEL_RADIUS = 1;
// Fraction of the dial radius the power triangle's furthest point reaches.
const NORMALIZATION_TARGET = 0.82;
// Radius of the phase wedge on the power triangle, in model units.
const PHASE_ARC_RADIUS = 0.3;

// Trace indices into the two scopes.
const VOLTAGE_TRACE = 0;
const CURRENT_TRACE = 1;
const POWER_TRACE = 0;

export type PowerScreenViewOptions = ScreenViewOptions;

export class PowerScreenView extends ScreenView {
  private readonly model: PowerModel;
  private readonly circuit: CircuitDiagramNode;
  private readonly signalScope: WaveformNode;
  private readonly powerScope: WaveformNode;

  private readonly disposables: { dispose(): void }[] = [];

  public constructor(model: PowerModel, providedOptions?: PowerScreenViewOptions) {
    const options = optionize<PowerScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new PowerScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    this.model = model;
    const labels = StringManager.getInstance().getLabels();
    const a11y = StringManager.getInstance().getPowerA11yStrings();
    const circuit = model.circuit;

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: ACPhasorColors.backgroundColorProperty,
      }),
    );

    const captionOptions = { font: "14px sans-serif", fill: ACPhasorColors.textColorProperty };

    // ── Pictorial circuit ───────────────────────────────────────────────────
    this.circuit = new CircuitDiagramNode({
      width: POWER_CIRCUIT_SIZE.width,
      height: POWER_CIRCUIT_SIZE.height,
      sourceVoltageProperty: circuit.voltagePhasorProperty,
      elementScale: "peak",
      slots: [
        { type: "resistor", resistanceProperty: circuit.resistanceProperty },
        {
          type: "inductor",
          inductanceProperty: circuit.inductanceProperty,
          inductanceRange: INDUCTANCE_RANGE_H,
          voltageProperty: circuit.inductorVoltageProperty,
        },
        {
          type: "capacitor",
          capacitanceProperty: circuit.capacitanceProperty,
          capacitanceRange: CAPACITANCE_RANGE_F,
          voltageProperty: circuit.capacitorVoltageProperty,
        },
      ],
    });
    this.circuit.left = SCREEN_VIEW_MARGIN + 20;
    this.circuit.top = SCREEN_VIEW_MARGIN;
    this.disposables.push(this.circuit);

    // ── Signal scope: v(t) and i(t) ─────────────────────────────────────────
    // No time-axis labels: it shares the axis with the power scope below it, and
    // the two are meant to be read as one stacked figure.
    this.signalScope = new WaveformNode({
      viewWidth: POWER_SCOPE_SIZE.width,
      viewHeight: POWER_SCOPE_SIZE.height,
      showCursor: true,
      showTimeAxisLabels: false,
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

    // ── Power scope: p(t) = v·i ─────────────────────────────────────────────
    this.powerScope = new WaveformNode({
      viewWidth: POWER_SCOPE_SIZE.width,
      viewHeight: POWER_SCOPE_SIZE.height,
      showCursor: true,
      traces: [
        {
          stroke: ACPhasorColors.powerColorProperty,
          label: "p(t)",
          units: "W",
          // |I| spans decades as the load changes, so p = v·i does too.
          autoScale: true,
          fill: ACPhasorColors.energyDeliveredColorProperty,
          negativeFill: ACPhasorColors.energyReturnedColorProperty,
          showAverageLine: true,
          // The caption reports the average, because for p(t) that is the
          // quantity with a name: the real power.
          captionValue: "average",
        },
      ],
    });

    const scopeColumn = new VBox({
      spacing: 6,
      align: "left",
      children: [this.signalScope, new Text(labels.instantaneousPowerStringProperty, captionOptions), this.powerScope],
    });
    // The column's left edge is the scopes' tick-label gutter, so the plots
    // themselves start a gutter's width in from here.
    scopeColumn.left = SCREEN_VIEW_MARGIN;
    scopeColumn.top = this.circuit.bottom + 20;

    // Legend for the two shaded lobes — the colors are the whole point of the
    // shading, and they carry a meaning no axis label states.
    const shadingLegend = new HBox({
      spacing: 18,
      children: [
        new Text(labels.energyDeliveredStringProperty, {
          font: "12px sans-serif",
          fill: ACPhasorColors.energyDeliveredColorProperty,
        }),
        new Text(labels.energyReturnedStringProperty, {
          font: "12px sans-serif",
          fill: ACPhasorColors.energyReturnedColorProperty,
        }),
      ],
    });
    shadingLegend.left = scopeColumn.left;
    shadingLegend.top = scopeColumn.bottom + 6;

    // ── Power triangle ──────────────────────────────────────────────────────
    const triangleDiagram = new PhasorDiagramNode({
      modelRadius: DIAGRAM_MODEL_RADIUS,
      viewRadius: POWER_TRIANGLE_DIAL_VIEW_RADIUS,
      realAxisLabel: "P",
      imaginaryAxisLabel: "Q",
    });
    // Drawn head to tail always: P + jQ = S is the statement, and it is a
    // right triangle only in that arrangement.
    const scaleProperty = new DerivedProperty(
      [model.apparentPowerPhasorProperty],
      (apparent) => NORMALIZATION_TARGET / Math.max(apparent.amplitude, 1e-6),
    );
    const scaledReal = new DerivedProperty(
      [model.realPowerPhasorProperty, scaleProperty],
      (phasor, scale) => phasor.scaled(scale),
      { valueComparisonStrategy: "equalsFunction" },
    );
    const scaledReactive = new DerivedProperty(
      [model.reactivePowerPhasorProperty, scaleProperty],
      (phasor, scale) => phasor.scaled(scale),
      { valueComparisonStrategy: "equalsFunction" },
    );
    const scaledApparent = new DerivedProperty(
      [model.apparentPowerPhasorProperty, scaleProperty],
      (phasor, scale) => phasor.scaled(scale),
      { valueComparisonStrategy: "equalsFunction" },
    );
    this.disposables.push(scaleProperty, scaledReal, scaledReactive, scaledApparent);

    const powerChain = new PhasorChainNode(
      [
        { property: scaledReal, fill: ACPhasorColors.resistorColorProperty, label: "P" },
        { property: scaledReactive, fill: ACPhasorColors.inductorColorProperty, label: "Q" },
      ],
      triangleDiagram.modelViewTransform,
      {
        resultant: { property: scaledApparent, fill: ACPhasorColors.impedanceColorProperty, label: "S" },
      },
    );
    triangleDiagram.addChild(powerChain);
    // The angle between P and S is φ — the same φ as the impedance triangle's,
    // and the one whose cosine is the power factor.
    const powerPhaseArc = new PhaseArcNode(
      new DerivedProperty([scaledApparent], () => 0),
      new DerivedProperty([scaledApparent], (apparent) => apparent.phase),
      triangleDiagram.modelViewTransform,
      { modelRadius: PHASE_ARC_RADIUS, stroke: ACPhasorColors.impedanceColorProperty },
    );
    triangleDiagram.addChild(powerPhaseArc);
    this.disposables.push(powerChain, powerPhaseArc);

    const triangleColumn = new VBox({
      spacing: 4,
      children: [new Text(labels.powerTriangleStringProperty, captionOptions), triangleDiagram],
    });
    // Third column, between the scopes and the controls: the triangle over its
    // own numbers, so P, Q and S are read as a shape and as values together.
    triangleColumn.left = scopeColumn.right + 24;
    triangleColumn.top = SCREEN_VIEW_MARGIN + 4;

    // ── Readouts ────────────────────────────────────────────────────────────
    const phaseDegrees = new DerivedProperty([circuit.phaseProperty], (phase) => (phase * 180) / Math.PI);
    this.disposables.push(phaseDegrees);

    const readoutPanel = new SimPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [
          new SimReadout(
            labels.realPowerStringProperty,
            model.realPowerProperty,
            labels.wattsPatternStringProperty,
            new Range(0, 1000),
            2,
          ),
          new SimReadout(
            labels.reactivePowerStringProperty,
            model.reactivePowerProperty,
            labels.reactivePowerPatternStringProperty,
            new Range(-1000, 1000),
            2,
          ),
          new SimReadout(
            labels.apparentPowerStringProperty,
            model.apparentPowerProperty,
            labels.voltAmperesPatternStringProperty,
            new Range(0, 1000),
            2,
          ),
          new SimReadout(
            labels.powerFactorStringProperty,
            model.powerFactorProperty,
            labels.plainPatternStringProperty,
            new Range(-1, 1),
            3,
          ),
          new SimReadout(
            labels.phaseStringProperty,
            phaseDegrees,
            labels.degreesPatternStringProperty,
            new Range(-90, 90),
            0,
          ),
        ],
      }),
      { align: "left" },
    );
    readoutPanel.left = triangleColumn.left;
    readoutPanel.top = triangleColumn.bottom + 16;

    // ── Control panel ───────────────────────────────────────────────────────
    const resistanceControl = new SimNumberControl(
      labels.resistanceStringProperty,
      circuit.resistanceProperty,
      RESISTANCE_RANGE_OHMS,
      labels.ohmsPatternStringProperty,
      { decimalPlaces: 0, accessibleName: a11y.controls.resistanceStringProperty },
    );
    const inductanceControl = new SimNumberControl(
      labels.inductanceStringProperty,
      circuit.inductanceProperty,
      INDUCTANCE_RANGE_H,
      labels.henriesPatternStringProperty,
      { decimalPlaces: 1, accessibleName: a11y.controls.inductanceStringProperty },
    );
    const capacitanceControl = new SimNumberControl(
      labels.capacitanceStringProperty,
      circuit.capacitanceProperty,
      CAPACITANCE_RANGE_F,
      labels.faradsPatternStringProperty,
      { decimalPlaces: 1, accessibleName: a11y.controls.capacitanceStringProperty },
    );
    const sourceVoltageControl = new SimNumberControl(
      labels.sourceVoltageStringProperty,
      circuit.source.amplitudeProperty,
      AC_AMPLITUDE_RANGE_V,
      labels.voltsPatternStringProperty,
      { decimalPlaces: 1, accessibleName: a11y.controls.sourceVoltageStringProperty },
    );
    const frequencyControl = new SimNumberControl(
      labels.frequencyStringProperty,
      circuit.source.frequencyProperty,
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

    // ── Time control + reset ────────────────────────────────────────────────
    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timer.timeSpeedProperty,
      timeSpeeds: DEFAULT_TIME_SPEEDS,
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
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
    timeControl.right = resetAllButton.left - 30;

    this.addChild(this.circuit);
    this.addChild(scopeColumn);
    this.addChild(shadingLegend);
    this.addChild(triangleColumn);
    this.addChild(readoutPanel);
    this.addChild(controlPanel);
    this.addChild(timeControl);
    this.addChild(resetAllButton);

    // ── Bindings ────────────────────────────────────────────────────────────
    // Both scopes hold the same number of *source* cycles, which puts exactly
    // twice as many p(t) cycles on the lower chart — the doubling is meant to be
    // read off the pair, so the windows must match.
    this.disposables.push(
      Multilink.multilink([circuit.source.frequencyProperty], (frequency) => {
        const window = SCOPE_PERIODS_SHOWN / Math.max(frequency, 1e-6);
        this.signalScope.setTimeWindow(window);
        this.powerScope.setTimeWindow(window);
      }),
      Multilink.multilink(
        [circuit.voltagePhasorProperty, circuit.source.angularFrequencyProperty],
        (voltage, angularFrequency) =>
          this.signalScope.setTrace(VOLTAGE_TRACE, voltage.amplitude, angularFrequency, voltage.phase),
      ),
      Multilink.multilink(
        [circuit.currentPhasorProperty, circuit.source.angularFrequencyProperty],
        (current, angularFrequency) =>
          this.signalScope.setTrace(CURRENT_TRACE, current.amplitude, angularFrequency, current.phase),
      ),
      // v·i expanded: V·cos(ωt + φᵥ)·I·cos(ωt + φᵢ) = P + S·cos(2ωt + φᵥ + φᵢ).
      // Amplitude S at twice the frequency, riding on the real power. Writing it
      // this way rather than sampling the product point by point is what makes
      // the scope's dashed average line exactly P, by construction.
      Multilink.multilink(
        [
          model.apparentPowerProperty,
          model.realPowerProperty,
          circuit.voltagePhasorProperty,
          circuit.currentPhasorProperty,
          circuit.source.angularFrequencyProperty,
        ],
        (apparent, real, voltage, current, angularFrequency) =>
          this.powerScope.setTrace(POWER_TRACE, apparent, 2 * angularFrequency, voltage.phase + current.phase, real),
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
          timeControl,
          resetAllButton,
        ],
      }),
    );

    this.updateAnimation();
  }

  /** Advance the playheads and the pictorial circuit to the present instant. */
  private updateAnimation(): void {
    const model = this.model;
    const time = model.timer.timeProperty.value;
    const drivePhase = model.circuit.source.drivePhaseProperty.value;
    const angularFrequency = model.circuit.source.angularFrequencyProperty.value;

    this.signalScope.setCursorTime(time, drivePhase);
    // p(t) rides at 2ω, so its phase reference is 2Θ.
    this.powerScope.setCursorTime(time, 2 * drivePhase);
    this.circuit.setState(model.circuit.currentPhasorProperty.value, angularFrequency, drivePhase);
  }

  public reset(): void {
    this.updateAnimation();
  }

  public override step(_dt: number): void {
    this.updateAnimation();
  }

  public override dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    super.dispose();
  }
}
