/**
 * IntroScreenView.ts
 *
 * View for the Intro screen. A phasor "clock" shows the voltage and current
 * phasors rotating at ω while keeping their fixed phase relationship; two
 * oscilloscope traces below show the actual v(t) and i(t) waveforms. A control
 * panel picks the component and sets its value plus the source voltage and
 * frequency.
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
  RESISTANCE_RANGE_OHMS,
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
const DIAL_VIEW_RADIUS = 115;

// Width of the schematic symbol on each element-picker button.
const PICKER_SYMBOL_WIDTH = 50;

// Oscilloscope geometry.
const SCOPE_WIDTH = 600;
const SCOPE_HEIGHT = 100;
const SCOPE_TIME_WINDOW = 3; // seconds shown across the width

export class IntroScreenView extends ScreenView {
  private readonly model: IntroModel;

  // Rotating display phasors (fixed length; only the angle animates).
  private readonly displayVoltageProperty = new Property(Phasor.ZERO, {
    valueComparisonStrategy: "equalsFunction",
  });
  private readonly displayCurrentProperty = new Property(Phasor.ZERO, {
    valueComparisonStrategy: "equalsFunction",
  });

  private readonly voltageScope: WaveformNode;
  private readonly currentScope: WaveformNode;
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
      viewRadius: DIAL_VIEW_RADIUS,
      referenceCircleRadius: DIAL_VOLTAGE_ARROW_LENGTH,
    });
    diagram.addChild(
      new PhasorNode(this.displayVoltageProperty, diagram.modelViewTransform, {
        fill: ACPhasorColors.textColorProperty,
        labelString: "V",
      }),
    );
    diagram.addChild(
      new PhasorNode(this.displayCurrentProperty, diagram.modelViewTransform, {
        fill: currentColorProperty,
        labelString: "I",
      }),
    );
    diagram.top = SCREEN_VIEW_MARGIN + 10;
    diagram.left = SCREEN_VIEW_MARGIN + 20;

    // ── Oscilloscope traces ─────────────────────────────────────────────────
    // The voltage scope keeps a fixed vertical scale (the source can never
    // exceed it), so the trace's height reads directly as a voltage.
    this.voltageScope = new WaveformNode({
      viewWidth: SCOPE_WIDTH,
      viewHeight: SCOPE_HEIGHT,
      timeWindow: SCOPE_TIME_WINDOW,
      maxAmplitude: AC_AMPLITUDE_RANGE_V.max,
      stroke: ACPhasorColors.textColorProperty,
      showCursor: true,
      label: "v(t)",
      units: "V",
      showTimeAxisLabels: false, // shared with the current scope directly below
    });
    this.currentScope = new WaveformNode({
      viewWidth: SCOPE_WIDTH,
      viewHeight: SCOPE_HEIGHT,
      timeWindow: SCOPE_TIME_WINDOW,
      autoScale: true, // current amplitude varies widely with |Z|
      stroke: currentColorProperty,
      showCursor: true,
      label: "i(t)",
      units: "A",
    });

    const scopeStack = new VBox({
      align: "left",
      spacing: 12,
      children: [this.voltageScope, this.currentScope],
    });
    scopeStack.left = SCREEN_VIEW_MARGIN + 20;

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
    const frequencyControl = new SimNumberControl(
      labels.frequencyStringProperty,
      model.source.frequencyProperty,
      AC_FREQUENCY_RANGE_HZ,
      labels.hertzPatternStringProperty,
      { decimalPlaces: 1, accessibleName: a11y.controls.frequencyStringProperty },
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
    // the scopes run the full width underneath both.
    this.circuit.centerX = (diagram.right + controlPanel.left) / 2;
    this.circuit.top = SCREEN_VIEW_MARGIN + 15;
    scopeStack.top = Math.max(diagram.bottom, this.circuit.bottom) + 20;

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
      centerX: controlPanel.centerX,
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

    this.addChild(diagram);
    this.addChild(this.circuit);
    this.addChild(scopeStack);
    this.addChild(controlPanel);
    this.addChild(readoutPanel);
    this.addChild(timeControl);
    this.addChild(resetAllButton);

    // Keep the static scope traces in sync with the model (cursor animates in step()).
    Multilink.multilink(
      [model.voltagePhasorProperty, model.source.angularFrequencyProperty],
      (voltage, angularFrequency) => this.voltageScope.setWaveform(voltage.amplitude, angularFrequency, voltage.phase),
    );
    Multilink.multilink(
      [model.currentPhasorProperty, model.source.angularFrequencyProperty],
      (current, angularFrequency) => this.currentScope.setWaveform(current.amplitude, angularFrequency, current.phase),
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

    this.voltageScope.setCursorTime(time);
    this.currentScope.setCursorTime(time);

    this.circuit.setState(this.model.currentPhasorProperty.value, angularFrequency, time);
  }

  public reset(): void {
    this.updatePhasorClock();
  }

  public override step(_dt: number): void {
    this.updatePhasorClock();
  }
}
