/**
 * ResonanceScreenView.ts
 *
 * View for the Resonance & frequency-sweep screen. Where the previous screens
 * draw the circuit at *this* frequency, this one draws it at *every* frequency:
 * two stacked curves over a shared logarithmic frequency axis, with the circuit's
 * present operating point riding along them.
 *
 *  - **|I| vs f** — the resonance peak. Its height is V/R, its centre is
 *    f₀ = 1/(2π√(LC)), and the shaded band is the half-power width Δf = f₀/Q.
 *    Lower R and the peak grows taller *and* narrower; that is the quality
 *    factor, made visible as a shape rather than stated as a number.
 *  - **φ vs f** — the same story told as phase, swinging from −90° (capacitive)
 *    through zero at the peak to +90° (inductive).
 *
 * Below them the impedance triangle from the Series RLC screen reappears, and it
 * is the third telling: as the sweep crosses f₀ the reactance leg shrinks to
 * nothing and the triangle collapses flat onto the resistance axis, at exactly
 * the moment the marker crosses the peak and the phase curve crosses zero.
 *
 * The Sweep button walks the drive frequency across the range so the three
 * happen together, on their own, repeatedly.
 */
import { DerivedProperty, Multilink } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { RectangularPushButton } from "scenerystack/sun";
import ACPhasorColors from "../../ACPhasorColors.js";
import {
  AC_AMPLITUDE_RANGE_V,
  AC_FREQUENCY_RANGE_HZ,
  CAPACITANCE_RANGE_F,
  INDUCTANCE_RANGE_H,
  RESISTANCE_RANGE_OHMS,
  RESONANCE_CURVE_SIZE,
  RESONANCE_IMPEDANCE_DIAL_VIEW_RADIUS,
  RESONANCE_PHASE_CURVE_SIZE,
  SCREEN_VIEW_MARGIN,
} from "../../ACPhasorConstants.js";
import {
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
} from "../../common/SimButtonOptions.js";
import { SimPanel } from "../../common/SimPanel.js";
import { FrequencyResponseNode } from "../../common/view/FrequencyResponseNode.js";
import { PhaseArcNode } from "../../common/view/PhaseArcNode.js";
import { PhasorChainNode } from "../../common/view/PhasorChainNode.js";
import { PhasorDiagramNode } from "../../common/view/PhasorDiagramNode.js";
import { SimNumberControl } from "../../common/view/SimNumberControl.js";
import { SimReadout } from "../../common/view/SimReadout.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { ResonanceModel } from "../model/ResonanceModel.js";
import { ResonanceScreenSummaryContent } from "./ResonanceScreenSummaryContent.js";

const DIAGRAM_MODEL_RADIUS = 1;
// Fraction of the dial radius the impedance triangle's furthest point reaches.
const NORMALIZATION_TARGET = 0.86;
// Radius of the phase wedge on the impedance triangle, in model units.
const PHASE_ARC_RADIUS = 0.3;

/**
 * Smallest full scale the resonance curve will shrink to (A). Without a floor,
 * a circuit driven far from resonance with a large R would auto-scale its own
 * noise-level current to fill the plot and the peak would look the same as ever.
 */
const MINIMUM_CURRENT_FULL_SCALE = 0.05;

export type ResonanceScreenViewOptions = ScreenViewOptions;

export class ResonanceScreenView extends ScreenView {
  private readonly model: ResonanceModel;
  private readonly currentCurve: FrequencyResponseNode;
  private readonly phaseCurve: FrequencyResponseNode;

  private readonly disposables: { dispose(): void }[] = [];

  public constructor(model: ResonanceModel, providedOptions?: ResonanceScreenViewOptions) {
    const options = optionize<ResonanceScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new ResonanceScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    this.model = model;
    const labels = StringManager.getInstance().getLabels();
    const a11y = StringManager.getInstance().getResonanceA11yStrings();

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: ACPhasorColors.backgroundColorProperty,
      }),
    );

    const captionOptions = { font: "14px sans-serif", fill: ACPhasorColors.textColorProperty };

    // ── Response curves ─────────────────────────────────────────────────────
    // Stacked over one frequency axis, labelled only on the lower chart: the two
    // curves are read against each other, and the peak of one lines up with the
    // zero crossing of the other.
    this.currentCurve = new FrequencyResponseNode({
      viewWidth: RESONANCE_CURVE_SIZE.width,
      viewHeight: RESONANCE_CURVE_SIZE.height,
      frequencyRange: AC_FREQUENCY_RANGE_HZ,
      stroke: ACPhasorColors.chargeColorProperty,
      label: "|I|",
      units: "A",
      autoScale: true,
      minimumFullScale: MINIMUM_CURRENT_FULL_SCALE,
      showFrequencyAxisLabels: false,
    });

    this.phaseCurve = new FrequencyResponseNode({
      viewWidth: RESONANCE_PHASE_CURVE_SIZE.width,
      viewHeight: RESONANCE_PHASE_CURVE_SIZE.height,
      frequencyRange: AC_FREQUENCY_RANGE_HZ,
      stroke: ACPhasorColors.impedanceColorProperty,
      label: "φ",
      units: "°",
      // Fixed: the phase is bounded by ±90° for any series RLC circuit, and a
      // scale that never moves is what makes "it crosses zero here" readable.
      yRange: new Range(-90, 90),
      showFrequencyAxisLabels: true,
      frequencyAxisLabel: labels.frequencyAxisStringProperty,
    });

    const curveColumn = new VBox({
      spacing: 10,
      align: "left",
      children: [
        new Text(labels.currentVsFrequencyStringProperty, captionOptions),
        this.currentCurve,
        new Text(labels.phaseVsFrequencyStringProperty, captionOptions),
        this.phaseCurve,
      ],
    });
    // The column's left edge is the charts' tick-label gutter, not their plots;
    // the plots themselves start a gutter's width further in.
    curveColumn.left = SCREEN_VIEW_MARGIN + 10;
    curveColumn.top = SCREEN_VIEW_MARGIN + 4;

    // ── Impedance triangle ──────────────────────────────────────────────────
    // The same figure as on the Series RLC screen, kept here because it is the
    // clearest statement of what the sweep is doing: X → 0 and Z → R.
    const impedanceDiagram = new PhasorDiagramNode({
      modelRadius: DIAGRAM_MODEL_RADIUS,
      viewRadius: RESONANCE_IMPEDANCE_DIAL_VIEW_RADIUS,
    });
    // The triangle is drawn head to tail, so its furthest point is the tip of Z
    // itself — normalize against that and the figure fills the dial at any R.
    const chainScaleProperty = new DerivedProperty(
      [model.impedancePhasorProperty],
      (impedance) => NORMALIZATION_TARGET / Math.max(impedance.amplitude, 1e-6),
    );

    const scaledResistance = new DerivedProperty(
      [model.resistancePhasorProperty, chainScaleProperty],
      (phasor, scale) => phasor.scaled(scale),
      { valueComparisonStrategy: "equalsFunction" },
    );
    const scaledReactance = new DerivedProperty(
      [model.reactancePhasorProperty, chainScaleProperty],
      (phasor, scale) => phasor.scaled(scale),
      { valueComparisonStrategy: "equalsFunction" },
    );
    const scaledImpedance = new DerivedProperty(
      [model.impedancePhasorProperty, chainScaleProperty],
      (phasor, scale) => phasor.scaled(scale),
      { valueComparisonStrategy: "equalsFunction" },
    );
    this.disposables.push(chainScaleProperty, scaledResistance, scaledReactance, scaledImpedance);

    const impedanceChain = new PhasorChainNode(
      [
        { property: scaledResistance, fill: ACPhasorColors.resistorColorProperty, label: "R" },
        { property: scaledReactance, fill: ACPhasorColors.inductorColorProperty, label: "X" },
      ],
      impedanceDiagram.modelViewTransform,
      {
        resultant: { property: scaledImpedance, fill: ACPhasorColors.impedanceColorProperty, label: "Z" },
      },
    );
    impedanceDiagram.addChild(impedanceChain);
    const impedancePhaseArc = new PhaseArcNode(
      new DerivedProperty([scaledImpedance], () => 0),
      new DerivedProperty([scaledImpedance], (impedance) => impedance.phase),
      impedanceDiagram.modelViewTransform,
      { modelRadius: PHASE_ARC_RADIUS, stroke: ACPhasorColors.impedanceColorProperty },
    );
    impedanceDiagram.addChild(impedancePhaseArc);
    this.disposables.push(impedanceChain, impedancePhaseArc);

    const triangleColumn = new VBox({
      spacing: 4,
      children: [new Text(labels.impedanceTriangleStringProperty, captionOptions), impedanceDiagram],
    });

    // ── Readouts ────────────────────────────────────────────────────────────
    const phaseDegrees = new DerivedProperty([model.phaseProperty], (phase) => (phase * 180) / Math.PI);
    const impedanceMagnitude = new DerivedProperty([model.impedanceProperty], (impedance) => impedance.magnitude);
    this.disposables.push(phaseDegrees, impedanceMagnitude);

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
            labels.resonantFrequencyStringProperty,
            model.resonantFrequencyProperty,
            labels.hertzPatternStringProperty,
            new Range(0, 100),
            2,
          ),
          new SimReadout(
            labels.qualityFactorStringProperty,
            model.qualityFactorProperty,
            labels.plainPatternStringProperty,
            new Range(0, 100),
            2,
          ),
          new SimReadout(
            labels.bandwidthStringProperty,
            model.bandwidthProperty,
            labels.hertzPatternStringProperty,
            new Range(0, 1000),
            2,
          ),
          new SimReadout(
            labels.impedanceStringProperty,
            impedanceMagnitude,
            labels.ohmsPatternStringProperty,
            new Range(0, 10000),
            1,
          ),
          new SimReadout(
            labels.currentAmplitudeStringProperty,
            model.currentAmplitudeProperty,
            labels.amperesPatternStringProperty,
            new Range(0, 100),
            3,
          ),
          new SimReadout(
            labels.phaseStringProperty,
            phaseDegrees,
            labels.degreesPatternStringProperty,
            new Range(-90, 90),
            0,
          ),
          resonanceBadge,
        ],
      }),
      { align: "left" },
    );

    const bottomRow = new HBox({
      spacing: 24,
      align: "top",
      children: [triangleColumn, readoutPanel],
    });
    bottomRow.left = curveColumn.left + 10;
    bottomRow.top = curveColumn.bottom + 14;

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
    // Logarithmic, and here it matters twice over: the slider then moves the
    // marker across the chart at a constant speed, because the chart's frequency
    // axis is logarithmic too.
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

    // ── Sweep button ────────────────────────────────────────────────────────
    // One button, two labels: it is the same control in both states, and a pair
    // of buttons would leave one of them dead at any moment.
    const sweepLabelProperty = new DerivedProperty(
      [model.isSweepingProperty, labels.sweepStringProperty, labels.stopSweepStringProperty],
      (isSweeping, sweep, stop) => (isSweeping ? stop : sweep),
    );
    this.disposables.push(sweepLabelProperty);
    const sweepButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(sweepLabelProperty, { font: "16px sans-serif", fill: LIGHT_SURFACE_TEXT_FILL }),
      baseColor: ACPhasorColors.controlSurfaceColorProperty,
      minWidth: 92,
      listener: () => {
        model.isSweepingProperty.value = !model.isSweepingProperty.value;
      },
      accessibleName: a11y.controls.sweepStringProperty,
    });
    sweepButton.centerX = controlPanel.centerX;
    sweepButton.top = controlPanel.bottom + 20;

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });

    this.addChild(curveColumn);
    this.addChild(bottomRow);
    this.addChild(controlPanel);
    this.addChild(sweepButton);
    this.addChild(resetAllButton);

    // ── Bindings ────────────────────────────────────────────────────────────
    // The curves are a function of R, L, C and the source amplitude — everything
    // except the drive frequency, which only moves the marker along them. Keeping
    // the two apart is what lets a sweep re-mark 60 times a second while the
    // curve itself is resampled only when the circuit actually changes.
    this.disposables.push(
      Multilink.multilink(
        [model.resistanceProperty, model.inductanceProperty, model.capacitanceProperty, model.source.amplitudeProperty],
        () => this.updateCurves(),
      ),
      Multilink.multilink(
        [model.resonantFrequencyProperty, model.lowerHalfPowerFrequencyProperty, model.upperHalfPowerFrequencyProperty],
        (resonantFrequency, lower, upper) => {
          this.currentCurve.setResonantFrequency(resonantFrequency);
          this.phaseCurve.setResonantFrequency(resonantFrequency);
          // The true half-power edges, not f₀ ± Δf/2: at the low quality factors
          // this sim's L–C ranges reach, the difference is visible on the chart.
          this.currentCurve.setBand(lower, upper);
        },
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
          sweepButton,
          resetAllButton,
        ],
      }),
    );

    this.updateCurves();
    this.updateMarkers();
  }

  /**
   * Resample both curves for the circuit's present R, L, C and source amplitude.
   * These go through `model.circuit` rather than the re-exported Properties
   * because they are methods: they answer for frequencies the circuit is *not*
   * being driven at, which is exactly what a response curve is made of.
   */
  private updateCurves(): void {
    const circuit = this.model.circuit;
    this.currentCurve.setCurve((frequency) => circuit.currentAmplitudeAt(frequency));
    this.phaseCurve.setCurve((frequency) => (circuit.phaseAt(frequency) * 180) / Math.PI);
  }

  /** Slide the operating point along both curves to the present drive frequency. */
  private updateMarkers(): void {
    const frequency = this.model.source.frequencyProperty.value;
    this.currentCurve.setMarkerFrequency(frequency);
    this.phaseCurve.setMarkerFrequency(frequency);
  }

  public reset(): void {
    this.updateCurves();
    this.updateMarkers();
  }

  public override step(_dt: number): void {
    // The sweep writes the frequency straight into the model, so the marker is
    // re-read every frame rather than linked — one place that knows where the
    // operating point is, whether it moved by slider or by sweep.
    this.updateMarkers();
  }

  public override dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    super.dispose();
  }
}
