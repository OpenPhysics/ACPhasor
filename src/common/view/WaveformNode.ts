/**
 * WaveformNode.ts
 *
 * A bamboo oscilloscope trace for one sinusoid v(t) = A·cos(ωt + φ), plotted
 * over a fixed time window. The horizontal axis is time (0 at the left edge,
 * `timeWindow` seconds at the right); the vertical axis is the signal, centered
 * on zero, with labelled ticks and grid lines on both axes so the trace can be
 * read quantitatively rather than as a shape.
 *
 * Two properties keep the scope steady while the physics changes underneath it:
 *
 *  - **Fixed footprint.** The node's layout bounds are frozen at construction
 *    (chart + tick-label gutters), and the trace and cursor are clipped to the
 *    chart rectangle. Amplitude changes therefore never move the node, so a
 *    sibling laid out below one of these never drifts.
 *  - **Quantized vertical scale.** With `autoScale`, the full-scale value snaps
 *    to a 1–2–5 sequence (…, 0.5, 1, 2, 5, 10, …) instead of tracking the
 *    amplitude continuously, so the axis holds still through small changes and
 *    the tick labels always read as round numbers when it does move.
 *
 * The trace is imperative: call {@link setWaveform} whenever the phasor or
 * frequency changes, and (optionally) {@link setCursorTime} each animation frame
 * to slide a marker along the curve.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const scope = new WaveformNode( { viewWidth: 260, viewHeight: 120, timeWindow: 2,
 *                                     maxAmplitude: 10, units: "V", stroke: color } );
 *   scope.setWaveform( amplitude, angularFrequency, phase );
 *   // in step(): scope.setCursorTime( model.timer.timeProperty.value );
 */

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
import { Orientation } from "scenerystack/phet-core";
import { Circle, type Font, Node, type TColor, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import ACPhasorColors from "../../ACPhasorColors.js";

/** Width reserved to the left of the chart for the vertical tick labels (px). */
const Y_LABEL_GUTTER = 34;

/** Height reserved below the chart for the time tick labels and axis caption (px). */
const TIME_AXIS_GUTTER = 28;

/** Height reserved above the chart for the label / peak-value captions (px). */
const CAPTION_GUTTER = 18;

type SelfOptions = {
  /** Plot width in view pixels (the full time window). */
  viewWidth?: number;
  /** Plot height in view pixels; ±full scale maps to ±viewHeight/2. */
  viewHeight?: number;
  /** Duration in seconds spanned by the plot width. */
  timeWindow?: number;
  /** Signal amplitude that reaches the top/bottom edge of the plot. */
  maxAmplitude?: number;
  /** Number of sample points across the width (higher = smoother). */
  sampleCount?: number;
  /** Trace color. */
  stroke?: TColor;
  /** Axis color. */
  axisColor?: TColor;
  /** Grid line color. */
  gridColor?: TColor;
  /** Tick-label and caption color. */
  labelColor?: TColor;
  /** Whether to show a moving cursor dot (see {@link setCursorTime}). */
  showCursor?: boolean;
  /**
   * When true, {@link setWaveform} rescales the vertical axis to the incoming
   * amplitude so the trace always fills the plot. The scale snaps to a 1–2–5
   * sequence rather than following the amplitude exactly. Use for signals whose
   * amplitude varies widely (e.g. current through a reactance).
   */
  autoScale?: boolean;
  /** Smallest full-scale value `autoScale` may choose; keeps tiny signals from filling the plot. */
  minimumFullScale?: number;
  /** Unit symbol for the vertical axis ("V", "A", …); appended to the peak caption. */
  units?: string | null;
  /** Caption drawn at the chart's top-left corner (e.g. "v(t)"); null hides it. */
  label?: string | null;
  /** Whether to caption the trace's peak value at the chart's top-right corner. */
  showPeakValue?: boolean;
  /**
   * Whether to label the time axis. Turn off for the upper scope of a stack
   * that shares one time axis with the scope below it.
   */
  showTimeAxisLabels?: boolean;
  /** Caption under the time axis, shown with the time tick labels. */
  timeAxisLabel?: string;
  /** Font for tick labels. */
  labelFont?: Font;
  /** Font for the corner captions. */
  captionFont?: Font;
};

export class WaveformNode extends Node {
  private readonly chartTransform: ChartTransform;
  private readonly timeWindow: number;
  private readonly sampleCount: number;
  private readonly autoScale: boolean;
  private readonly minimumFullScale: number;
  private readonly units: string | null;

  // Signal value that reaches the top/bottom edge. Mutable when autoScale is on.
  private fullScale: number;

  private readonly linePlot: LinePlot;
  private readonly cursorDot: Circle | null;
  private readonly peakText: Text | null;

  // Vertical grid / tick sets, respaced whenever the full scale changes.
  private readonly yGridLineSet: GridLineSet;
  private readonly yTickMarkSet: TickMarkSet;
  private readonly yTickLabelSet: TickLabelSet;

  // Current waveform parameters, used by both the trace and the cursor.
  private amplitude = 0;
  private angularFrequency = 0;
  private phase = 0;

  public constructor(providedOptions?: SelfOptions) {
    const options = {
      viewWidth: 260,
      viewHeight: 120,
      timeWindow: 2,
      maxAmplitude: 10,
      sampleCount: 200,
      stroke: ACPhasorColors.accentColorProperty as TColor,
      axisColor: ACPhasorColors.textColorProperty as TColor,
      gridColor: ACPhasorColors.panelBorderColorProperty as TColor,
      labelColor: ACPhasorColors.textColorProperty as TColor,
      showCursor: false,
      autoScale: false,
      minimumFullScale: 0,
      units: null as string | null,
      label: null as string | null,
      showPeakValue: true,
      showTimeAxisLabels: true,
      timeAxisLabel: "t (s)",
      labelFont: new PhetFont(10),
      captionFont: new PhetFont(12),
      ...providedOptions,
    };

    super();

    this.timeWindow = options.timeWindow;
    this.sampleCount = Math.max(2, Math.floor(options.sampleCount));
    this.autoScale = options.autoScale;
    this.minimumFullScale = options.minimumFullScale;
    this.units = options.units;
    this.fullScale = options.maxAmplitude;

    this.chartTransform = new ChartTransform({
      viewWidth: options.viewWidth,
      viewHeight: options.viewHeight,
      modelXRange: new Range(0, options.timeWindow),
      modelYRange: new Range(-this.fullScale, this.fullScale),
    });

    // Ticks every half of full scale: labels land on -M, -M/2, 0, M/2, M.
    const yTickSpacing = this.fullScale / 2;
    const xTickSpacing = niceStep(options.timeWindow / 6);

    const chartRectangle = new ChartRectangle(this.chartTransform, {
      stroke: options.gridColor,
      lineWidth: 1,
    });

    this.yGridLineSet = new GridLineSet(this.chartTransform, Orientation.VERTICAL, yTickSpacing, {
      stroke: options.gridColor,
      lineWidth: 0.5,
    });
    this.yTickMarkSet = new TickMarkSet(this.chartTransform, Orientation.VERTICAL, yTickSpacing, {
      edge: "min",
      extent: 4,
      stroke: options.axisColor,
    });
    this.yTickLabelSet = new TickLabelSet(this.chartTransform, Orientation.VERTICAL, yTickSpacing, {
      edge: "min",
      extent: 6,
      createLabel: (value: number) =>
        new Text(formatTickValue(value, this.fullScale / 2), {
          font: options.labelFont,
          fill: options.labelColor,
        }),
    });

    const chart = new Node({
      children: [
        chartRectangle,
        new GridLineSet(this.chartTransform, Orientation.HORIZONTAL, xTickSpacing, {
          stroke: options.gridColor,
          lineWidth: 0.5,
        }),
        this.yGridLineSet,
        // Zero line: the time axis the trace swings about.
        new AxisLine(this.chartTransform, Orientation.HORIZONTAL, {
          stroke: options.axisColor,
          lineWidth: 1,
        }),
        // "min" is the bottom edge: model y increases up the screen.
        new TickMarkSet(this.chartTransform, Orientation.HORIZONTAL, xTickSpacing, {
          edge: "min",
          extent: 4,
          stroke: options.axisColor,
        }),
        this.yTickMarkSet,
        this.yTickLabelSet,
      ],
    });

    // The time axis is labelled only where it is read: a stack of scopes over
    // the same window labels the bottom one and lets the others sit closer.
    if (options.showTimeAxisLabels) {
      chart.addChild(
        new TickLabelSet(this.chartTransform, Orientation.HORIZONTAL, xTickSpacing, {
          edge: "min",
          extent: 6,
          createLabel: (value: number) =>
            new Text(formatTickValue(value, xTickSpacing), {
              font: options.labelFont,
              fill: options.labelColor,
            }),
        }),
      );
      chart.addChild(
        new Text(options.timeAxisLabel, {
          font: options.labelFont,
          fill: options.labelColor,
          centerX: options.viewWidth / 2,
          top: options.viewHeight + 16,
        }),
      );
    }

    // Trace and cursor live in a clipped layer, so an over-range signal is cut
    // off at the chart border instead of growing the node.
    this.linePlot = new LinePlot(this.chartTransform, [], {
      stroke: options.stroke,
      lineWidth: 2,
    });
    this.cursorDot = options.showCursor
      ? new Circle(4, { fill: options.stroke, center: this.chartTransform.modelToViewXY(0, 0) })
      : null;
    const clippedLayer = new Node({
      // Dilated by the trace's half-width so a peak that sits exactly on full
      // scale keeps its full stroke instead of being shaved by the border.
      clipArea: Shape.bounds(chartRectangle.getShape().bounds.dilated(1)),
      children: this.cursorDot ? [this.linePlot, this.cursorDot] : [this.linePlot],
    });

    this.addChild(chart);
    this.addChild(clippedLayer);

    // Captions above the chart: what is plotted (left) and its peak value (right).
    if (options.label !== null) {
      this.addChild(
        new Text(options.label, {
          font: options.captionFont,
          fill: options.labelColor,
          leftBottom: new Vector2(0, -4),
        }),
      );
    }
    this.peakText = options.showPeakValue
      ? new Text("", {
          font: options.captionFont,
          fill: options.labelColor,
        })
      : null;
    if (this.peakText) {
      this.addChild(this.peakText);
    }

    // Freeze the footprint: tick-label text and trace amplitude both change at
    // run time, and neither may be allowed to move this node or its siblings.
    this.localBounds = new Bounds2(
      -Y_LABEL_GUTTER,
      -CAPTION_GUTTER,
      options.viewWidth,
      options.viewHeight + (options.showTimeAxisLabels ? TIME_AXIS_GUTTER : 4),
    );

    this.updateTrace();
    this.updatePeakText();
  }

  private valueAt(time: number): number {
    return this.amplitude * Math.cos(this.angularFrequency * time + this.phase);
  }

  private updateTrace(): void {
    const dataSet: Vector2[] = [];
    for (let i = 0; i < this.sampleCount; i++) {
      const time = (i / (this.sampleCount - 1)) * this.timeWindow;
      dataSet.push(new Vector2(time, this.valueAt(time)));
    }
    this.linePlot.setDataSet(dataSet);
  }

  /** Re-space the vertical grid, ticks and labels after a full-scale change. */
  private updateVerticalScale(): void {
    this.chartTransform.setModelYRange(new Range(-this.fullScale, this.fullScale));
    const spacing = this.fullScale / 2;
    this.yGridLineSet.setSpacing(spacing);
    this.yTickMarkSet.setSpacing(spacing);
    this.yTickLabelSet.setSpacing(spacing);
    // Labels are cached by value; the cache must be dropped when the scale (and
    // therefore the number of decimals) changes.
    this.yTickLabelSet.invalidateTickLabelSet();
  }

  private updatePeakText(): void {
    if (!this.peakText) {
      return;
    }
    const value = formatTickValue(Math.abs(this.amplitude), this.fullScale / 2);
    this.peakText.string = this.units === null ? value : `${value} ${this.units}`;
    this.peakText.rightBottom = new Vector2(this.chartTransform.viewWidth, -3);
  }

  /** Set the sinusoid to plot: A·cos(ωt + φ). Redraws the trace immediately. */
  public setWaveform(amplitude: number, angularFrequency: number, phase: number): void {
    this.amplitude = amplitude;
    this.angularFrequency = angularFrequency;
    this.phase = phase;

    if (this.autoScale) {
      const scale = Math.max(niceStep(Math.abs(amplitude)), this.minimumFullScale);
      if (scale !== this.fullScale) {
        this.fullScale = scale;
        this.updateVerticalScale();
      }
    }

    this.updateTrace();
    this.updatePeakText();

    // Keep the cursor consistent with the new curve at its current position.
    if (this.cursorDot) {
      const time = this.chartTransform.viewToModelX(this.cursorDot.centerX);
      this.cursorDot.center = this.chartTransform.modelToViewXY(time, this.valueAt(time));
    }
  }

  /**
   * Slide the cursor dot to the point on the curve at the given absolute time.
   * The time is wrapped into the visible window so the marker cycles across it.
   * No-op unless the node was created with `showCursor: true`.
   */
  public setCursorTime(time: number): void {
    if (!this.cursorDot) {
      return;
    }
    const wrapped = ((time % this.timeWindow) + this.timeWindow) % this.timeWindow;
    this.cursorDot.center = this.chartTransform.modelToViewXY(wrapped, this.valueAt(wrapped));
  }
}

/**
 * Round a positive value up to the next entry of the 1–2–5 sequence
 * (…, 0.2, 0.5, 1, 2, 5, 10, …). Used both for the auto-scaled full scale and
 * for tick spacing, so axis labels are always round numbers.
 */
function niceStep(value: number): number {
  if (!(value > 0 && Number.isFinite(value))) {
    return 1;
  }
  const decade = 10 ** Math.floor(Math.log10(value));
  const normalized = value / decade; // in [1, 10)
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * decade;
}

/**
 * Format an axis value with just enough decimals to distinguish neighbouring
 * ticks, trimming trailing zeros so labels stay short ("2.5", "0.05", "10").
 */
function formatTickValue(value: number, spacing: number): string {
  const decimals = Math.max(0, Math.min(6, Math.ceil(-Math.log10(spacing)) + 1));
  return Number(value.toFixed(decimals)).toString();
}
