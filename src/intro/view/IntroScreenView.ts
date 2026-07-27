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
import type { Color } from "scenerystack/scenery";
import { Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { RectangularRadioButtonGroup } from "scenerystack/sun";
import ACPhasorColors from "../../ACPhasorColors.js";
import {
  AC_AMPLITUDE_RANGE_V,
  AC_FREQUENCY_RANGE_HZ,
  CAPACITANCE_RANGE_F,
  INDUCTANCE_RANGE_H,
  RESISTANCE_RANGE_OHMS,
  SCREEN_VIEW_MARGIN,
} from "../../ACPhasorConstants.js";
import type { CircuitElementType } from "../../common/model/Impedance.js";
import { Phasor } from "../../common/model/Phasor.js";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
} from "../../common/SimButtonOptions.js";
import { SimPanel } from "../../common/SimPanel.js";
import { PhasorDiagramNode } from "../../common/view/PhasorDiagramNode.js";
import { PhasorNode } from "../../common/view/PhasorNode.js";
import { SimNumberControl } from "../../common/view/SimNumberControl.js";
import { WaveformNode } from "../../common/view/WaveformNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { IntroModel } from "../model/IntroModel.js";
import { IntroScreenSummaryContent } from "./IntroScreenSummaryContent.js";

// Phasor "clock" geometry (model units span the diagram; arrows ride the circle).
const DIAL_MODEL_RADIUS = 1;
const DIAL_ARROW_LENGTH = 0.92;
const DIAL_VIEW_RADIUS = 105;

// Oscilloscope geometry.
const SCOPE_WIDTH = 300;
const SCOPE_HEIGHT = 96;
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
      referenceCircleRadius: DIAL_ARROW_LENGTH,
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
    diagram.left = SCREEN_VIEW_MARGIN + 30;

    // ── Oscilloscope traces ─────────────────────────────────────────────────
    this.voltageScope = new WaveformNode({
      viewWidth: SCOPE_WIDTH,
      viewHeight: SCOPE_HEIGHT,
      timeWindow: SCOPE_TIME_WINDOW,
      maxAmplitude: AC_AMPLITUDE_RANGE_V.max,
      stroke: ACPhasorColors.textColorProperty,
      showCursor: true,
    });
    this.currentScope = new WaveformNode({
      viewWidth: SCOPE_WIDTH,
      viewHeight: SCOPE_HEIGHT,
      timeWindow: SCOPE_TIME_WINDOW,
      autoScale: true, // current amplitude varies widely with |Z|
      stroke: currentColorProperty,
      showCursor: true,
    });

    const scopeFont = new PhetFont(13);
    const scopeStack = new VBox({
      align: "left",
      spacing: 4,
      children: [
        new Text("v(t)", { font: scopeFont, fill: ACPhasorColors.textColorProperty }),
        this.voltageScope,
        new Text("i(t)", { font: scopeFont, fill: currentColorProperty }),
        this.currentScope,
      ],
    });
    scopeStack.top = diagram.bottom + 24;
    scopeStack.left = SCREEN_VIEW_MARGIN + 10;

    // ── Control panel ───────────────────────────────────────────────────────
    const componentLabelFont = new PhetFont(14);
    const componentGroup = new RectangularRadioButtonGroup<CircuitElementType>(
      model.elementTypeProperty,
      [
        {
          value: "resistor",
          createNode: () =>
            new Text(labels.resistorStringProperty, {
              font: componentLabelFont,
              fill: ACPhasorColors.resistorColorProperty,
            }),
        },
        {
          value: "inductor",
          createNode: () =>
            new Text(labels.inductorStringProperty, {
              font: componentLabelFont,
              fill: ACPhasorColors.inductorColorProperty,
            }),
        },
        {
          value: "capacitor",
          createNode: () =>
            new Text(labels.capacitorStringProperty, {
              font: componentLabelFont,
              fill: ACPhasorColors.capacitorColorProperty,
            }),
        },
      ],
      {
        orientation: "horizontal",
        spacing: 6,
        accessibleName: a11y.controls.componentStringProperty,
        radioButtonOptions: {
          baseColor: ACPhasorColors.controlSurfaceColorProperty,
          xMargin: 8,
          yMargin: 6,
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

    // ── Time control + reset ────────────────────────────────────────────────
    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
          listener: () => model.step(1 / 60),
        },
      },
      centerX: scopeStack.centerX,
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
    this.addChild(scopeStack);
    this.addChild(controlPanel);
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

    this.displayVoltageProperty.value = new Phasor(DIAL_ARROW_LENGTH, voltagePhase + rotation);
    this.displayCurrentProperty.value = new Phasor(DIAL_ARROW_LENGTH, currentPhase + rotation);

    this.voltageScope.setCursorTime(time);
    this.currentScope.setCursorTime(time);
  }

  public reset(): void {
    this.updatePhasorClock();
  }

  public override step(_dt: number): void {
    this.updatePhasorClock();
  }
}
