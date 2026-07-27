/**
 * SeriesRlcScreenView.ts
 *
 * View for the Series RLC screen. A phasor diagram draws the resistor, inductor,
 * capacitor, and source voltage phasors from a common origin, normalized so the
 * largest fills the dial; because V_R + V_L + V_C = V, the element phasors sum to
 * the source phasor. A readout panel reports |Z|, net reactance, and phase, and a
 * control panel sets R, L, C, source voltage, and frequency.
 */
import { DerivedProperty, Multilink, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { NumberDisplay, PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import ACPhasorColors from "../../ACPhasorColors.js";
import {
  AC_AMPLITUDE_RANGE_V,
  AC_FREQUENCY_RANGE_HZ,
  CAPACITANCE_RANGE_F,
  INDUCTANCE_RANGE_H,
  RESISTANCE_RANGE_OHMS,
  SCREEN_VIEW_MARGIN,
} from "../../ACPhasorConstants.js";
import { Phasor } from "../../common/model/Phasor.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/SimButtonOptions.js";
import { SimPanel } from "../../common/SimPanel.js";
import { PhasorDiagramNode } from "../../common/view/PhasorDiagramNode.js";
import { PhasorNode } from "../../common/view/PhasorNode.js";
import { SimNumberControl } from "../../common/view/SimNumberControl.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeriesRlcModel } from "../model/SeriesRlcModel.js";
import { SeriesRlcScreenSummaryContent } from "./SeriesRlcScreenSummaryContent.js";

const DIAGRAM_MODEL_RADIUS = 1;
const DIAGRAM_VIEW_RADIUS = 135;
// Fraction of the dial radius the largest phasor should reach.
const NORMALIZATION_TARGET = 0.9;

export class SeriesRlcScreenView extends ScreenView {
  public constructor(model: SeriesRlcModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new SeriesRlcScreenSummaryContent(model),
      ...options,
    });

    const labels = StringManager.getInstance().getLabels();
    const a11y = StringManager.getInstance().getSeriesRlcA11yStrings();

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: ACPhasorColors.backgroundColorProperty,
      }),
    );

    // ── Phasor diagram (voltage triangle) ───────────────────────────────────
    const diagram = new PhasorDiagramNode({
      modelRadius: DIAGRAM_MODEL_RADIUS,
      viewRadius: DIAGRAM_VIEW_RADIUS,
    });

    // Normalized display phasors: all four scaled by their common max so the
    // largest reaches NORMALIZATION_TARGET and their relative lengths are honest.
    const displaySource = new Property(Phasor.ZERO, { valueComparisonStrategy: "equalsFunction" });
    const displayResistor = new Property(Phasor.ZERO, { valueComparisonStrategy: "equalsFunction" });
    const displayInductor = new Property(Phasor.ZERO, { valueComparisonStrategy: "equalsFunction" });
    const displayCapacitor = new Property(Phasor.ZERO, {
      valueComparisonStrategy: "equalsFunction",
    });

    Multilink.multilink(
      [
        model.voltagePhasorProperty,
        model.resistorVoltageProperty,
        model.inductorVoltageProperty,
        model.capacitorVoltageProperty,
      ],
      (source, resistor, inductor, capacitor) => {
        const maxMagnitude = Math.max(
          source.amplitude,
          resistor.amplitude,
          inductor.amplitude,
          capacitor.amplitude,
          1e-6,
        );
        const scale = NORMALIZATION_TARGET / maxMagnitude;
        displaySource.value = source.scaled(scale);
        displayResistor.value = resistor.scaled(scale);
        displayInductor.value = inductor.scaled(scale);
        displayCapacitor.value = capacitor.scaled(scale);
      },
    );

    diagram.addChild(
      new PhasorNode(displaySource, diagram.modelViewTransform, {
        fill: ACPhasorColors.textColorProperty,
        labelString: "V",
      }),
    );
    diagram.addChild(
      new PhasorNode(displayResistor, diagram.modelViewTransform, {
        fill: ACPhasorColors.resistorColorProperty,
        labelString: "VR",
      }),
    );
    diagram.addChild(
      new PhasorNode(displayInductor, diagram.modelViewTransform, {
        fill: ACPhasorColors.inductorColorProperty,
        labelString: "VL",
      }),
    );
    diagram.addChild(
      new PhasorNode(displayCapacitor, diagram.modelViewTransform, {
        fill: ACPhasorColors.capacitorColorProperty,
        labelString: "VC",
      }),
    );
    diagram.top = SCREEN_VIEW_MARGIN + 20;
    diagram.left = SCREEN_VIEW_MARGIN + 40;

    // ── Readout panel ───────────────────────────────────────────────────────
    const impedanceMagnitude = new DerivedProperty([model.impedanceProperty], (impedance) => impedance.magnitude);
    const phaseDegrees = new DerivedProperty([model.phaseProperty], (phase) => (phase * 180) / Math.PI);

    const readoutPanel = new SimPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [
          this.createReadout(
            labels.impedanceStringProperty,
            impedanceMagnitude,
            labels.ohmsPatternStringProperty,
            new Range(0, 1000),
            1,
          ),
          this.createReadout(
            labels.reactanceStringProperty,
            model.reactanceProperty,
            labels.ohmsPatternStringProperty,
            new Range(-1000, 1000),
            1,
          ),
          this.createReadout(
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
    readoutPanel.left = diagram.left;
    readoutPanel.top = diagram.bottom + 20;

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
        children: [resistanceControl, inductanceControl, capacitanceControl, sourceVoltageControl, frequencyControl],
      }),
    );
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = SCREEN_VIEW_MARGIN;

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
    this.addChild(readoutPanel);
    this.addChild(controlPanel);
    this.addChild(resetAllButton);

    this.addChild(
      new Node({
        pdomOrder: [
          resistanceControl,
          inductanceControl,
          capacitanceControl,
          sourceVoltageControl,
          frequencyControl,
          resetAllButton,
        ],
      }),
    );
  }

  /** A "label  value-badge" row for the readout panel. */
  private createReadout(
    label: TReadOnlyProperty<string>,
    numberProperty: TReadOnlyProperty<number>,
    valuePattern: TReadOnlyProperty<string>,
    displayRange: Range,
    decimalPlaces: number,
  ): Node {
    return new HBox({
      spacing: 8,
      children: [
        new Text(label, {
          font: new PhetFont(14),
          fill: ACPhasorColors.textColorProperty,
        }),
        new NumberDisplay(numberProperty, displayRange, {
          valuePattern,
          decimalPlaces,
          textOptions: {
            font: new PhetFont(14),
            fill: ACPhasorColors.controlSurfaceTextColorProperty,
          },
          backgroundFill: ACPhasorColors.controlSurfaceColorProperty,
          backgroundStroke: ACPhasorColors.panelBorderColorProperty,
        }),
      ],
    });
  }

  public reset(): void {
    // Display phasors and readouts update from model Properties automatically.
  }

  public override step(_dt: number): void {
    // Static diagram — nothing to animate.
  }
}
