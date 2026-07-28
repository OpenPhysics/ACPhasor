/**
 * IntroScreenView.ts
 *
 * View for the Intro screen. A phasor "clock" shows the voltage and current
 * phasors rotating at ω while keeping their fixed phase relationship, with the
 * angle between them drawn as a labelled wedge and a dashed line dropped from
 * each tip onto the real axis — the projection that *is* the instantaneous value.
 * A dual-trace oscilloscope below plots those two values as v(t) and i(t) against
 * their own axes, sharing one playhead with the clock, so the phase difference
 * shows up twice: as an angle on the dial and as a horizontal offset on the
 * scope. A control panel picks the component and sets its value plus the source
 * voltage and frequency.
 */
import { DerivedProperty, Multilink, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { Color } from "scenerystack/scenery";
import { Node, Rectangle, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { RectangularRadioButtonGroup } from "scenerystack/sun";
import ACPhasorColors from "../../ACPhasorColors.js";
import {
  AC_AMPLITUDE_RANGE_V,
  AC_FREQUENCY_RANGE_HZ,
  CAPACITANCE_RANGE_F,
  INDUCTANCE_RANGE_H,
  INTRO_CIRCUIT_SIZE,
  INTRO_DIAL_VIEW_RADIUS,
  INTRO_SCOPE_SIZE,
  RESISTANCE_RANGE_OHMS,
  SCOPE_PERIODS_SHOWN,
  SCREEN_VIEW_MARGIN,
} from "../../ACPhasorConstants.js";
import type { CircuitElementType } from "../../common/model/Impedance.js";
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
import { createElementSymbol } from "../../common/view/CircuitSymbols.js";
import { PhaseArcNode } from "../../common/view/PhaseArcNode.js";
import { PhasorDiagramNode } from "../../common/view/PhasorDiagramNode.js";
import { PhasorNode } from "../../common/view/PhasorNode.js";
import { SimNumberControl } from "../../common/view/SimNumberControl.js";
import { SimReadout } from "../../common/view/SimReadout.js";
import { WaveformNode } from "../../common/view/WaveformNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { IntroModel } from "../model/IntroModel.js";
import { IntroScreenSummaryContent } from "./IntroScreenSummaryContent.js";

// Phasor "clock" geometry (model units span the diagram; arrows ride the circle).
const DIAL_MODEL_RADIUS = 1;
const DIAL_VOLTAGE_ARROW_LENGTH = 0.92;
// The current arrow is drawn shorter so it stays visible where it coincides
// with the voltage arrow (a resistor puts them exactly in phase).
const DIAL_CURRENT_ARROW_LENGTH = 0.62;
// The phase wedge sits inside the shorter of the two arrows, so it reads as the
// angle between them rather than as a ring around the outside.
const DIAL_PHASE_ARC_RADIUS = 0.38;

// Width of the schematic symbol on each element-picker button.
const PICKER_SYMBOL_WIDTH = 50;

// Trace indices into the dual-trace scope.
const VOLTAGE_TRACE = 0;
const CURRENT_TRACE = 1;

export class IntroScreenView extends ScreenView {
  private readonly model: IntroModel;

  // Rotating display phasors (fixed length; only the angle animates).
  private readonly displayVoltageProperty = new Property(Phasor.ZERO, {
    valueComparisonStrategy: "equalsFunction",
  });
  private readonly displayCurrentProperty = new Property(Phasor.ZERO, {
    valueComparisonStrategy: "equalsFunction",
  });

  private readonly scope: WaveformNode;
  private readonly circuit: CircuitDiagramNode;

  public constructor(model: IntroModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new IntroScreenSummaryContent(model),
      ...options,
    });

    this.model = model;
    const labels = StringManager.getInstance().getLabels();
    const a11y = StringManager.getInstance().getIntroA11yStrings();

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: ACPhasorColors.backgroundColorProperty,
      }),
    );

    // Color of the current arrow / trace tracks the selected element.
    const currentColorProperty = new DerivedProperty(
      [
        model.elementTypeProperty,
        ACPhasorColors.resistorColorProperty,
        ACPhasorColors.inductorColorProperty,
        ACPhasorColors.capacitorColorProperty,
      ],
      (type, resistor, inductor, capacitor): Color =>
        type === "resistor" ? resistor : type === "inductor" ? inductor : capacitor,
    );

    // ── Phasor clock ────────────────────────────────────────────────────────
    const diagram = new PhasorDiagramNode({
      modelRadius: DIAL_MODEL_RADIUS,
      viewRadius: INTRO_DIAL_VIEW_RADIUS,
      referenceCircleRadius: DIAL_VOLTAGE_ARROW_LENGTH,
    });
    // The wedge goes on before the arrows so the arrows read over it.
    diagram.addChild(
      new PhaseArcNode(
        new DerivedProperty([this.displayVoltageProperty], (voltage) => voltage.phase),
        new DerivedProperty([this.displayCurrentProperty], (current) => current.phase),
        diagram.modelViewTransform,
        {
          modelRadius: DIAL_PHASE_ARC_RADIUS,
          stroke: currentColorProperty,
        },
      ),
    );
    // The dashed drop from each tip to the real axis lands at that phasor's
    // instantaneous value — the same number the scope is plotting below.
    diagram.addChild(
      new PhasorNode(this.displayVoltageProperty, diagram.modelViewTransform, {
        fill: ACPhasorColors.textColorProperty,
        labelString: "V",
        showProjection: "real",
      }),
    );
    diagram.addChild(
      new PhasorNode(this.displayCurrentProperty, diagram.modelViewTransform, {
        fill: currentColorProperty,
        labelString: "I",
        showProjection: "real",
      }),
    );
    diagram.top = SCREEN_VIEW_MARGIN + 10;
    diagram.left = SCREEN_VIEW_MARGIN + 20;

    // ── Oscilloscope ────────────────────────────────────────────────────────
    // One chart, two axes: v(t) against a fixed voltage scale on the left (the
    // source can never exceed it, so the trace's height reads directly as a
    // voltage) and i(t) against an auto-scaled current axis on the right (the
    // current spans decades as |Z| changes). Sharing a time axis is the point —
    // the phase difference becomes the offset between the two zero crossings.
    this.scope = new WaveformNode({
      viewWidth: INTRO_SCOPE_SIZE.width,
      viewHeight: INTRO_SCOPE_SIZE.height,
      showCursor: true,
      traces: [
        {
          stroke: ACPhasorColors.textColorProperty,
          label: "v(t)",
          units: "V",
          maxAmplitude: AC_AMPLITUDE_RANGE_V.max,
        },
        {
          stroke: currentColorProperty,
          label: "i(t)",
          units: "A",
          axis: "right",
          autoScale: true,
        },
      ],
    });
    this.scope.left = SCREEN_VIEW_MARGIN + 20;

    // ── Circuit diagram (pictorial parts, flowing charge, live polarity) ─────
    this.circuit = new CircuitDiagramNode({
      width: INTRO_CIRCUIT_SIZE.width,
      height: INTRO_CIRCUIT_SIZE.height,
      sourceVoltageProperty: model.source.voltagePhasorProperty,
      slots: [
        {
          typeProperty: model.elementTypeProperty,
          resistanceProperty: model.resistanceProperty,
          inductanceProperty: model.inductanceProperty,
          inductanceRange: INDUCTANCE_RANGE_H,
          capacitanceProperty: model.capacitanceProperty,
          capacitanceRange: CAPACITANCE_RANGE_F,
          // On this screen the element sees the full source voltage.
          voltageProperty: model.voltagePhasorProperty,
        },
      ],
    });

    // ── Control panel ───────────────────────────────────────────────────────
    // The picker shows each element as its schematic symbol rather than its
    // name: the glyph is the notation students meet on every circuit diagram,
    // and it needs no translation.
    const componentGroup = new RectangularRadioButtonGroup<CircuitElementType>(
      model.elementTypeProperty,
      [
        {
          value: "resistor",
          createNode: () => createElementSymbol("resistor", { width: PICKER_SYMBOL_WIDTH }),
          options: { accessibleName: labels.resistorStringProperty },
        },
        {
          value: "inductor",
          createNode: () => createElementSymbol("inductor", { width: PICKER_SYMBOL_WIDTH }),
          options: { accessibleName: labels.inductorStringProperty },
        },
        {
          value: "capacitor",
          createNode: () => createElementSymbol("capacitor", { width: PICKER_SYMBOL_WIDTH }),
          options: { accessibleName: labels.capacitorStringProperty },
        },
      ],
      {
        orientation: "horizontal",
        spacing: 6,
        accessibleName: a11y.controls.componentStringProperty,
        radioButtonOptions: {
          baseColor: ACPhasorColors.controlSurfaceColorProperty,
          xMargin: 10,
          yMargin: 8,
        },
      },
    );

    // One value control per element; only the selected one is visible.
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
    const bindVisibility = (type: CircuitElementType, control: Node) => {
      control.visibleProperty = new DerivedProperty([model.elementTypeProperty], (selected) => selected === type);
    };
    bindVisibility("resistor", resistanceControl);
    bindVisibility("inductor", inductanceControl);
    bindVisibility("capacitor", capacitanceControl);
    const valueControlSlot = new VBox({
      excludeInvisibleChildrenFromBounds: true,
      children: [resistanceControl, inductanceControl, capacitanceControl],
    });

    const sourceVoltageControl = new SimNumberControl(
      labels.sourceVoltageStringProperty,
      model.source.amplitudeProperty,
      AC_AMPLITUDE_RANGE_V,
      labels.voltsPatternStringProperty,
      { decimalPlaces: 1, accessibleName: a11y.controls.sourceVoltageStringProperty },
    );
    // The frequency range spans more than two decades and every resonance in the
    // sim lives in its bottom half, so this slider is divided by ratio.
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
        spacing: 14,
        children: [componentGroup, valueControlSlot, sourceVoltageControl, frequencyControl],
      }),
    );
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = SCREEN_VIEW_MARGIN;

    // ── Readout panel: what the selected element does to the current ────────
    const impedanceMagnitude = new DerivedProperty([model.impedanceProperty], (impedance) => impedance.magnitude);
    const phaseDegrees = new DerivedProperty(
      [model.phaseDifferenceProperty],
      (phaseDifference) => (phaseDifference * 180) / Math.PI,
    );
    const readoutPanel = new SimPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [
          new SimReadout(
            labels.impedanceStringProperty,
            impedanceMagnitude,
            labels.ohmsPatternStringProperty,
            new Range(0, 10000),
            1,
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
    readoutPanel.centerX = controlPanel.centerX;
    readoutPanel.top = controlPanel.bottom + 25;

    // The circuit fills the column between the phasor clock and the controls;
    // the scope runs the full width underneath both.
    this.circuit.centerX = (diagram.right + controlPanel.left) / 2;
    this.circuit.top = SCREEN_VIEW_MARGIN + 15;
    this.scope.top = Math.max(diagram.bottom, this.circuit.bottom) + 30;

    // ── Time control + reset ────────────────────────────────────────────────
    // TimeControlNode is SceneryStack's built-in: play/pause + step buttons and,
    // when given timeSpeedProperty, the speed radio buttons too.
    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timer.timeSpeedProperty,
      timeSpeeds: DEFAULT_TIME_SPEEDS,
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
          // stepForward, not step: the button is only ever pressed while paused.
          listener: () => model.timer.stepForward(1 / 60),
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

    this.addChild(diagram);
    this.addChild(this.circuit);
    this.addChild(this.scope);
    this.addChild(controlPanel);
    this.addChild(readoutPanel);
    this.addChild(timeControl);
    this.addChild(resetAllButton);

    // Hold a fixed number of cycles on screen. Across the frequency range one
    // period runs from 0.2 s to 50 s, so a window fixed in seconds would show a
    // picket fence at one end and a flat line at the other.
    model.source.frequencyProperty.link((frequency) => {
      this.scope.setTimeWindow(SCOPE_PERIODS_SHOWN / Math.max(frequency, 1e-6));
    });

    // Keep the static scope traces in sync with the model (the playhead animates
    // in step()).
    Multilink.multilink(
      [model.voltagePhasorProperty, model.source.angularFrequencyProperty],
      (voltage, angularFrequency) =>
        this.scope.setTrace(VOLTAGE_TRACE, voltage.amplitude, angularFrequency, voltage.phase),
    );
    Multilink.multilink(
      [model.currentPhasorProperty, model.source.angularFrequencyProperty],
      (current, angularFrequency) =>
        this.scope.setTrace(CURRENT_TRACE, current.amplitude, angularFrequency, current.phase),
    );

    this.addChild(
      new Node({
        pdomOrder: [
          componentGroup,
          valueControlSlot,
          sourceVoltageControl,
          frequencyControl,
          timeControl,
          resetAllButton,
        ],
      }),
    );

    this.updatePhasorClock();
  }

  /** Position the rotating display phasors for the current time. */
  private updatePhasorClock(): void {
    const time = this.model.timer.timeProperty.value;
    const angularFrequency = this.model.source.angularFrequencyProperty.value;
    const rotation = angularFrequency * time;
    const voltagePhase = this.model.voltagePhasorProperty.value.phase;
    const currentPhase = this.model.currentPhasorProperty.value.phase;

    this.displayVoltageProperty.value = new Phasor(DIAL_VOLTAGE_ARROW_LENGTH, voltagePhase + rotation);
    this.displayCurrentProperty.value = new Phasor(DIAL_CURRENT_ARROW_LENGTH, currentPhase + rotation);

    this.scope.setCursorTime(time);

    this.circuit.setState(this.model.currentPhasorProperty.value, angularFrequency, time);
  }

  public reset(): void {
    this.updatePhasorClock();
  }

  public override step(_dt: number): void {
    this.updatePhasorClock();
  }
}
