/**
 * FrequencyResponseNode.ts
 *
 * A bamboo chart of one quantity against driving frequency — the resonance curve
 * |I(f)| and the phase curve φ(f) on the Resonance screen. Where
 * {@link WaveformNode} plots a signal against *time*, this plots a circuit's
 * response against the frequency it is driven at: a curve that exists all at
 * once, with a marker showing where on it the circuit presently sits.
 *
 * Three things make it readable, and each mirrors a rule the oscilloscope
 * already follows:
 *
 *  - **Logarithmic frequency axis.** The range spans 2.4 decades and every
 *    resonance worth finding lives in its lowest one. On a linear axis those
 *    peaks would all be crushed against the left edge; in log space each decade
 *    gets equal width, exactly as on the frequency slider that drives it.
 *  - **Frozen footprint.** Layout bounds are fixed at construction and the curve
 *    is clipped to the chart rectangle, so a peak that shoots up when R is
 *    lowered never moves the node or its siblings.
 *  - **Quantized vertical scale.** An auto-scaling axis snaps full scale to the
 *    1–2–5 sequence, so the axis holds still through small changes and its
 *    labels stay round.
 *
 * The curve is imperative, like the scope's traces: hand {@link setCurve} a
 * function of frequency whenever the circuit changes, and move the operating
 * point with {@link setMarkerFrequency}.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const chart = new FrequencyResponseNode( {
 *     viewWidth: 620, viewHeight: 150,
 *     frequencyRange: AC_FREQUENCY_RANGE_HZ,
 *     stroke: currentColor, label: "|I|", units: "A", autoScale: true,
 *   } );
 *   chart.setCurve( ( f ) => model.circuit.currentAmplitudeAt( f ) );
 *   chart.setMarkerFrequency( model.circuit.source.frequencyProperty.value );
 *   chart.setResonantFrequency( model.circuit.resonantFrequencyProperty.value );
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import {
  AxisLine,
  ChartRectangle,
  ChartTransform,
  GridLineSet,
  LinePlot,
  TickLabelSet,
  TickMarkSet,
} from "scenerystack/bamboo";
import { Bounds2, Range, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { type EmptySelfOptions, Orientation, optionize } from "scenerystack/phet-core";
import { Circle, type Font, Line, Node, Path, type TColor, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import ACPhasorColors from "../../ACPhasorColors.js";
import { applyChartRescale, formatTickValue, niceStep } from "./axisScale.js";

/** Width reserved outside the chart for the vertical tick labels (px). */
const Y_LABEL_GUTTER = 40;

/** Height reserved below the chart for frequency tick labels and the axis caption (px). */
const FREQUENCY_AXIS_GUTTER = 28;

/** Height reserved above the chart for the caption row (px). */
const CAPTION_GUTTER = 18;

/** Samples across the width. The peak can be narrow, so this is generous. */
const DEFAULT_SAMPLE_COUNT = 300;

type FrequencyResponseNodeSelfOptions = {
  /** Plot width in view pixels (the full frequency range). */
  viewWidth?: number;
  /** Plot height in view pixels. */
  viewHeight?: number;
  /** Frequency range spanned by the width (Hz). Must be strictly positive. */
  frequencyRange: Range;
  /** Number of sample points across the width. */
  sampleCount?: number;
  /** Curve color; the caption, marker dot and value readout follow it. */
  stroke?: TColor;
  /** Caption for the curve (e.g. "|I|"). */
  label?: string;
  /** Unit symbol shown with the curve's value at the marker ("A", "°", …). */
  units?: string | null;
  /**
   * Fixed vertical range. Omit (or pass null) together with `autoScale` to have
   * the axis follow the curve; the phase curve wants a fixed ±90° instead.
   */
  yRange?: Range | null;
  /**
   * Rescale the vertical axis to the curve's peak, snapped to the 1–2–5
   * sequence. Use it where the peak spans decades — |I| at resonance is V/R,
   * which moves by a factor of 100 across the resistance range.
   */
  autoScale?: boolean;
  /** Smallest full scale `autoScale` may choose. */
  minimumFullScale?: number;
  /** Whether to label the frequency axis; turn off for the upper chart of a stack. */
  showFrequencyAxisLabels?: boolean;
  /** Caption under the frequency axis; pass a StringProperty to follow the locale. */
  frequencyAxisLabel?: string | TReadOnlyProperty<string>;
  /** Axis color. */
  axisColor?: TColor;
  /** Grid line color. */
  gridColor?: TColor;
  /** Tick-label and caption color. */
  labelColor?: TColor;
  /** Color of the dashed line marking the resonant frequency. */
  resonanceColor?: TColor;
  /** Font for tick labels. */
  labelFont?: Font;
  /** Font for the caption row. */
  captionFont?: Font;
};

export type FrequencyResponseNodeOptions = FrequencyResponseNodeSelfOptions;

export class FrequencyResponseNode extends Node {
  private readonly chartTransform: ChartTransform;
  private readonly linePlot: LinePlot;
  private readonly marker: Line;
  private readonly markerDot: Circle;
  private readonly resonanceLine: Line;
  private readonly bandPath: Path;
  private readonly yGridLineSet: GridLineSet;
  private readonly yTickMarkSet: TickMarkSet;
  private readonly yTickLabelSet: TickLabelSet;
  private readonly captionText: Text | null;

  private readonly frequencyRange: Range;
  private readonly sampleCount: number;
  private readonly autoScale: boolean;
  private readonly minimumFullScale: number;
  private readonly label: string;
  private readonly units: string | null;

  /** Boxed so the tick-label factory, built during construction, can read it later. */
  private readonly verticalScale: { min: number; max: number };

  /** The curve presently plotted, kept so the marker can be re-read off it. */
  private curve: ((frequency: number) => number) | null = null;
  private markerFrequency: number;

  public constructor(providedOptions: FrequencyResponseNodeOptions) {
    const options = optionize<FrequencyResponseNodeOptions, FrequencyResponseNodeSelfOptions, EmptySelfOptions>()(
      {
        viewWidth: 500,
        viewHeight: 140,
        sampleCount: DEFAULT_SAMPLE_COUNT,
        stroke: ACPhasorColors.accentColorProperty as TColor,
        label: "",
        units: null as string | null,
        yRange: null as Range | null,
        autoScale: false,
        minimumFullScale: 0,
        showFrequencyAxisLabels: true,
        // Math notation by default, as on the scope's time axis; the Resonance
        // screen overrides it with a localized StringProperty, which is what this
        // option is for.
        frequencyAxisLabel: "f (Hz)" as string | TReadOnlyProperty<string>,
        axisColor: ACPhasorColors.textColorProperty as TColor,
        gridColor: ACPhasorColors.panelBorderColorProperty as TColor,
        labelColor: ACPhasorColors.textColorProperty as TColor,
        resonanceColor: ACPhasorColors.resonanceHighlightColorProperty as TColor,
        labelFont: new PhetFont(10),
        captionFont: new PhetFont(12),
      },
      providedOptions,
    );

    super();

    this.frequencyRange = options.frequencyRange;
    this.sampleCount = Math.max(2, Math.floor(options.sampleCount));
    this.autoScale = options.autoScale;
    this.minimumFullScale = options.minimumFullScale;
    this.label = options.label;
    this.units = options.units;
    this.markerFrequency = options.frequencyRange.min;

    const initialRange = options.yRange ?? new Range(0, Math.max(1, options.minimumFullScale));
    this.verticalScale = { min: initialRange.min, max: initialRange.max };

    // x is log₁₀(f), not f: the model-space range is in decades, and every
    // frequency handed to this node is mapped through log10 on the way in.
    this.chartTransform = new ChartTransform({
      viewWidth: options.viewWidth,
      viewHeight: options.viewHeight,
      modelXRange: new Range(Math.log10(this.frequencyRange.min), Math.log10(this.frequencyRange.max)),
      modelYRange: initialRange,
    });

    const chartRectangle = new ChartRectangle(this.chartTransform, {
      stroke: options.gridColor,
      lineWidth: 1,
    });

    // One grid line and label per decade; the ticks then read 0.01, 0.1, 1 …
    // which is the whole point of putting the axis in log space.
    const xTickMarkSet = new TickMarkSet(this.chartTransform, Orientation.HORIZONTAL, 1, {
      edge: "min",
      extent: 4,
      stroke: options.axisColor,
    });
    const xGridLineSet = new GridLineSet(this.chartTransform, Orientation.HORIZONTAL, 1, {
      stroke: options.gridColor,
      lineWidth: 0.5,
    });

    const spacing = this.tickSpacing;
    this.yGridLineSet = new GridLineSet(this.chartTransform, Orientation.VERTICAL, spacing, {
      stroke: options.gridColor,
      lineWidth: 0.5,
    });
    this.yTickMarkSet = new TickMarkSet(this.chartTransform, Orientation.VERTICAL, spacing, {
      edge: "min",
      extent: 4,
      stroke: options.axisColor,
    });
    this.yTickLabelSet = new TickLabelSet(this.chartTransform, Orientation.VERTICAL, spacing, {
      edge: "min",
      extent: 6,
      createLabel: (value: number) =>
        new Text(formatTickValue(value, this.tickSpacing), {
          font: options.labelFont,
          fill: options.labelColor,
        }),
    });

    const chart = new Node({
      children: [
        chartRectangle,
        xGridLineSet,
        this.yGridLineSet,
        // Only drawn where zero is inside the range: the phase axis straddles it,
        // the current axis starts there.
        new AxisLine(this.chartTransform, Orientation.HORIZONTAL, {
          stroke: options.axisColor,
          lineWidth: 1,
        }),
        xTickMarkSet,
        this.yTickMarkSet,
        this.yTickLabelSet,
      ],
    });

    if (options.showFrequencyAxisLabels) {
      chart.addChild(
        new TickLabelSet(this.chartTransform, Orientation.HORIZONTAL, 1, {
          edge: "min",
          extent: 6,
          // The axis value is a decade exponent; the reader wants the frequency.
          createLabel: (value: number) =>
            new Text(formatTickValue(10 ** value, 10 ** value), {
              font: options.labelFont,
              fill: options.labelColor,
            }),
        }),
      );
      chart.addChild(
        new Text(options.frequencyAxisLabel, {
          font: options.labelFont,
          fill: options.labelColor,
          centerX: options.viewWidth / 2,
          top: options.viewHeight + 16,
        }),
      );
    }

    // Curve, markers and band share a clipped layer, so a peak that overshoots
    // the range is cut at the border instead of growing the node.
    const clippedLayer = new Node({
      clipArea: Shape.bounds(chartRectangle.getShape().bounds.dilated(1)),
    });

    // Half-power band, drawn first so everything else reads on top of it.
    this.bandPath = new Path(null, { fill: options.resonanceColor, opacity: 0.12 });
    clippedLayer.addChild(this.bandPath);

    this.resonanceLine = new Line(0, 0, 0, options.viewHeight, {
      stroke: options.resonanceColor,
      lineWidth: 1.5,
      lineDash: [5, 4],
      visible: false,
    });
    clippedLayer.addChild(this.resonanceLine);

    this.linePlot = new LinePlot(this.chartTransform, [], {
      stroke: options.stroke,
      lineWidth: 2,
    });
    clippedLayer.addChild(this.linePlot);

    // The operating point: where on the curve the circuit presently sits.
    this.marker = new Line(0, 0, 0, options.viewHeight, {
      stroke: options.labelColor,
      lineWidth: 1,
    });
    clippedLayer.addChild(this.marker);
    this.markerDot = new Circle(4, { fill: options.stroke });
    clippedLayer.addChild(this.markerDot);

    this.addChild(chart);
    this.addChild(clippedLayer);

    // Caption above the chart, in the curve's color: label plus the value at the
    // marker, so the curve reads as a number as well as a shape.
    this.captionText =
      options.label === ""
        ? null
        : new Text(options.label, {
            font: options.captionFont,
            fill: options.stroke,
            leftBottom: new Vector2(0, -3),
          });
    if (this.captionText) {
      this.addChild(this.captionText);
    }

    // Freeze the footprint: the curve, the caption and the tick labels all change
    // at run time, and none of them may move this node or its siblings.
    this.localBounds = new Bounds2(
      -Y_LABEL_GUTTER,
      -CAPTION_GUTTER,
      options.viewWidth,
      options.viewHeight + (options.showFrequencyAxisLabels ? FREQUENCY_AXIS_GUTTER : 4),
    );

    this.setMarkerFrequency(this.frequencyRange.min);
  }

  /** Vertical tick spacing for the present scale, on the 1–2–5 sequence. */
  private get tickSpacing(): number {
    return niceStep((this.verticalScale.max - this.verticalScale.min) / 4);
  }

  /** Map a frequency to the chart's model x, which is its decade exponent. */
  private toModelX(frequency: number): number {
    return Math.log10(Math.max(frequency, Number.MIN_VALUE));
  }

  /**
   * Plot `valueAt` across the frequency range, rescaling the vertical axis to it
   * when this chart auto-scales. Call it whenever the circuit changes — R, L, C
   * or the source amplitude all reshape the curve.
   */
  public setCurve(valueAt: (frequency: number) => number): void {
    this.curve = valueAt;

    const minX = this.toModelX(this.frequencyRange.min);
    const maxX = this.toModelX(this.frequencyRange.max);
    const dataSet: Vector2[] = [];
    let peak = 0;
    for (let i = 0; i < this.sampleCount; i++) {
      const x = minX + ((maxX - minX) * i) / (this.sampleCount - 1);
      const value = valueAt(10 ** x);
      // A non-finite sample (a lossless circuit exactly at resonance) is skipped
      // rather than plotted, which breaks the line where it belongs.
      if (Number.isFinite(value)) {
        dataSet.push(new Vector2(x, value));
        peak = Math.max(peak, Math.abs(value));
      }
    }
    this.linePlot.setDataSet(dataSet);

    if (this.autoScale) {
      const fullScale = Math.max(niceStep(peak), this.minimumFullScale);
      if (fullScale !== this.verticalScale.max) {
        this.verticalScale.max = fullScale;
        this.updateVerticalScale();
      }
    }

    this.updateMarkerDot();
  }

  /** Re-span the vertical axis and re-space everything read against it. */
  private updateVerticalScale(): void {
    const newRange = new Range(this.verticalScale.min, this.verticalScale.max);
    const spacing = this.tickSpacing;
    applyChartRescale(
      this.chartTransform.modelYRange.getLength(),
      newRange.getLength(),
      () => this.chartTransform.setModelYRange(newRange),
      () => {
        this.yGridLineSet.setSpacing(spacing);
        this.yTickMarkSet.setSpacing(spacing);
        this.yTickLabelSet.setSpacing(spacing);
      },
    );
    // Labels are cached by value, and the number of decimals just changed.
    this.yTickLabelSet.invalidateTickLabelSet();
  }

  /**
   * Move the operating-point marker to the given drive frequency. The dot rides
   * the curve, so the readout in the caption is the circuit's present response.
   */
  public setMarkerFrequency(frequency: number): void {
    this.markerFrequency = frequency;
    const x = this.chartTransform.modelToViewX(this.toModelX(frequency));
    this.marker.setLine(x, 0, x, this.chartTransform.viewHeight);
    this.updateMarkerDot();
  }

  /** Put the marker dot on the curve at the marker frequency, and caption its value. */
  private updateMarkerDot(): void {
    const value = this.curve ? this.curve(this.markerFrequency) : 0;
    const safeValue = Number.isFinite(value) ? value : this.verticalScale.max;
    this.markerDot.center = this.chartTransform.modelToViewXY(this.toModelX(this.markerFrequency), safeValue);

    if (this.captionText) {
      const formatted = formatTickValue(safeValue, this.tickSpacing / 10);
      this.captionText.string = `${this.label} ${formatted}${unitsSuffix(this.units)}`;
    }
  }

  /**
   * Mark the resonant frequency with a dashed vertical line. Pass a
   * non-positive or non-finite frequency to hide it.
   */
  public setResonantFrequency(frequency: number): void {
    const visible = frequency > 0 && Number.isFinite(frequency);
    this.resonanceLine.visible = visible;
    if (visible) {
      const x = this.chartTransform.modelToViewX(this.toModelX(frequency));
      this.resonanceLine.setLine(x, 0, x, this.chartTransform.viewHeight);
    }
  }

  /**
   * Shade the half-power band [low, high] — the width of the resonance, which is
   * what the quality factor is a measure of. Pass an empty or invalid band to
   * hide it.
   */
  public setBand(low: number, high: number): void {
    if (!(low > 0 && high > low && Number.isFinite(high))) {
      this.bandPath.shape = null;
      return;
    }
    const left = this.chartTransform.modelToViewX(this.toModelX(low));
    const right = this.chartTransform.modelToViewX(this.toModelX(high));
    this.bandPath.shape = Shape.rect(left, 0, right - left, this.chartTransform.viewHeight);
  }
}

/**
 * The unit part of a caption. Degrees are written tight against the number
 * ("31.5°"); every other unit is a separate word ("0.43 A"), which is the
 * convention the rest of the sim's value patterns follow.
 */
function unitsSuffix(units: string | null): string {
  if (units === null) {
    return "";
  }
  return units === "°" ? units : ` ${units}`;
}
