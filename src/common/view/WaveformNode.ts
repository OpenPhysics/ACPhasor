/**
 * WaveformNode.ts
 *
 * A bamboo oscilloscope plotting one or more sinusoids A·cos(ωt + φ) over a
 * shared time window. The horizontal axis is time (0 at the left edge,
 * `timeWindow` seconds at the right); each trace is read against one of two
 * vertical axes, so signals in different units — volts and amps, say — can share
 * a chart and their phase relationship becomes a horizontal offset you can point
 * at.
 *
 * Three properties keep the scope steady while the physics changes underneath it:
 *
 *  - **Fixed footprint.** The node's layout bounds are frozen at construction
 *    (chart + tick-label gutters + caption row), and the traces and playhead are
 *    clipped to the chart rectangle. Amplitude changes therefore never move the
 *    node, so a sibling laid out below one of these never drifts.
 *  - **Quantized vertical scale.** With `autoScale`, a trace's full-scale value
 *    snaps to a 1–2–5 sequence (…, 0.5, 1, 2, 5, 10, …) instead of tracking the
 *    amplitude continuously, so the axis holds still through small changes and
 *    the tick labels always read as round numbers when it does move. Each of the
 *    two axes scales independently.
 *  - **Retunable window.** {@link setTimeWindow} re-spans the time axis, so a
 *    caller can hold a fixed number of cycles on screen across a frequency range
 *    that spans decades. The x ticks re-space onto the same 1–2–5 sequence.
 *
 * The traces are imperative: call {@link setTrace} (or {@link setWaveform} for a
 * single-trace scope) whenever a phasor or the frequency changes, and
 * {@link setCursorTime} each animation frame to slide the playhead along.
 *
 * A trace may also ride on a constant `offset` and shade the area between itself
 * and the zero line, in two colors split at the crossings. That combination is
 * what instantaneous power needs: p(t) = P + S·cos(2ωt − φ) is a sinusoid at
 * twice the drive frequency sitting on the real power, the dashed average line
 * *is* P, and the two shaded colors separate the energy delivered to the circuit
 * from the energy handed back.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // Single trace — `stroke` / `label` / `units` describe it directly.
 *   const scope = new WaveformNode( { viewWidth: 260, viewHeight: 120, timeWindow: 2,
 *                                     maxAmplitude: 10, units: "V", stroke: color } );
 *   scope.setWaveform( amplitude, angularFrequency, phase );
 *
 *   // Dual trace against two axes — volts on the left, amps on the right.
 *   const scope = new WaveformNode( {
 *     traces: [
 *       { stroke: voltageColor, label: "v(t)", units: "V", maxAmplitude: 10 },
 *       { stroke: currentColor, label: "i(t)", units: "A", axis: "right", autoScale: true },
 *     ],
 *   } );
 *   scope.setTrace( 0, voltage.amplitude, omega, voltage.phase );
 *   scope.setTrace( 1, current.amplitude, omega, current.phase );
 *   // in step(): scope.setCursorTime( model.timer.timeProperty.value, model.source.drivePhaseProperty.value );
 *
 *   // Instantaneous power: a 2ω sinusoid on a DC offset, shaded and averaged.
 *   const scope = new WaveformNode( {
 *     traces: [ { stroke: powerColor, label: "p(t)", units: "W", autoScale: true,
 *                 fill: deliveredColor, negativeFill: returnedColor,
 *                 showAverageLine: true, captionValue: "average" } ],
 *   } );
 *   scope.setTrace( 0, apparentPower, 2 * omega, voltage.phase + current.phase, realPower );
 *   // Power rides at 2ω, so pass 2·Θ as the drive-phase reference:
 *   // scope.setCursorTime( time, 2 * drivePhase );
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
import { type EmptySelfOptions, Orientation, optionize } from "scenerystack/phet-core";
import { Circle, type Font, HBox, Line, Node, Path, type TColor, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import ACPhasorColors from "../../ACPhasorColors.js";
import { applyChartRescale, formatTickValue, niceStep } from "./axisScale.js";

/** Width reserved outside the chart for a set of vertical tick labels (px). */
const Y_LABEL_GUTTER = 34;

/** Height reserved below the chart for the time tick labels and axis caption (px). */
const TIME_AXIS_GUTTER = 28;

/** Height reserved above the chart for the per-trace caption row (px). */
const CAPTION_GUTTER = 18;

/** Which vertical axis a trace is read against. */
export type WaveformAxis = "left" | "right";

/** One sinusoid on the scope, with the caption and scaling that go with it. */
export type WaveformTraceOptions = {
  /** Trace color; the caption and playhead dot follow it. */
  stroke: TColor;
  /** Caption for this trace (e.g. "v(t)"). */
  label: string;
  /** Unit symbol shown with the trace's peak value ("V", "A", …). */
  units?: string | null;
  /** Vertical axis this trace is plotted against. */
  axis?: WaveformAxis;
  /** Signal amplitude that reaches the top/bottom edge, when not auto-scaling. */
  maxAmplitude?: number;
  /**
   * Constant the sinusoid rides on, so the trace is offset + A·cos(ωt + φ).
   * Instantaneous power needs it: p(t) is a sinusoid at 2ω sitting on the real
   * power, and that offset is the only part of it that does not average away.
   * Usually set per frame through {@link WaveformNode.setTrace}.
   */
  offset?: number;
  /**
   * When true, this trace's axis rescales to the incoming amplitude so the trace
   * always fills the plot, snapping to a 1–2–5 sequence rather than following the
   * amplitude exactly. Use for signals whose amplitude varies widely (e.g.
   * current through a reactance).
   */
  autoScale?: boolean;
  /** Smallest full-scale value `autoScale` may choose; keeps tiny signals from filling the plot. */
  minimumFullScale?: number;
  /**
   * Shade the area between the trace and the zero line where the trace is
   * positive. For instantaneous power that area *is* the energy delivered to the
   * circuit over the interval, so the shape carries the quantity.
   */
  fill?: TColor;
  /**
   * Shading where the trace is negative — energy flowing back out of the
   * circuit, which is worth a different color from energy going in. Defaults to
   * {@link fill}.
   */
  negativeFill?: TColor;
  /**
   * Draw a dashed horizontal line at the trace's offset. On a p(t) trace that
   * line is the real power: the part of the swing that does not average away.
   */
  showAverageLine?: boolean;
  /**
   * Which number the caption reports: the signal's peak amplitude (the default),
   * or its average — the offset it swings about, which is the meaningful figure
   * for a trace that has one.
   */
  captionValue?: "peak" | "average";
};

type WaveformNodeSelfOptions = {
  /** Plot width in view pixels (the full time window). */
  viewWidth?: number;
  /** Plot height in view pixels; ±full scale maps to ±viewHeight/2. */
  viewHeight?: number;
  /** Duration in seconds spanned by the plot width. */
  timeWindow?: number;
  /** Number of sample points across the width (higher = smoother). */
  sampleCount?: number;
  /**
   * The traces to plot. When omitted, a single left-axis trace is built from the
   * `stroke` / `label` / `units` / `maxAmplitude` / `autoScale` options below.
   */
  traces?: WaveformTraceOptions[] | null;
  /** Axis color. */
  axisColor?: TColor;
  /** Grid line color. */
  gridColor?: TColor;
  /** Tick-label and caption color. */
  labelColor?: TColor;
  /** Whether to show a playhead: a vertical line plus a dot on each trace. */
  showCursor?: boolean;
  /** Whether to caption each trace's peak value alongside its label. */
  showPeakValue?: boolean;
  /**
   * Whether to label the time axis. Turn off for the upper scope of a stack that
   * shares one time axis with the scope below it.
   */
  showTimeAxisLabels?: boolean;
  /** Caption under the time axis, shown with the time tick labels. */
  timeAxisLabel?: string;
  /** Font for tick labels. */
  labelFont?: Font;
  /** Font for the caption row. */
  captionFont?: Font;

  // ── Single-trace shorthand (ignored when `traces` is given) ─────────────────
  /** Trace color. */
  stroke?: TColor;
  /** Caption drawn at the chart's top-left corner (e.g. "v(t)"); null hides it. */
  label?: string | null;
  /** Unit symbol for the vertical axis ("V", "A", …); appended to the peak caption. */
  units?: string | null;
  /** Signal amplitude that reaches the top/bottom edge of the plot. */
  maxAmplitude?: number;
  /** See {@link WaveformTraceOptions.autoScale}. */
  autoScale?: boolean;
  /** See {@link WaveformTraceOptions.minimumFullScale}. */
  minimumFullScale?: number;
};

export type WaveformNodeOptions = WaveformNodeSelfOptions;

/**
 * One vertical axis: its transform, the grid and ticks that read against it, and
 * the full-scale value they are spaced by.
 */
type VerticalAxis = {
  chartTransform: ChartTransform;
  gridLineSet: GridLineSet | null;
  tickMarkSet: TickMarkSet;
  tickLabelSet: TickLabelSet;
  /**
   * Signal value reaching the top/bottom edge; mutable when a trace auto-scales.
   * Boxed because the tick-label factory needs to read whatever scale is in force
   * when a label is built, and it runs during the axis's own construction.
   */
  scale: { fullScale: number };
  /** Whether any trace on this axis auto-scales. */
  autoScale: boolean;
  minimumFullScale: number;
};

/** One plotted sinusoid and the caption that reports it. */
type Trace = {
  linePlot: LinePlot;
  axis: VerticalAxis;
  cursorDot: Circle | null;
  peakText: Text | null;
  /** Shading between the trace and zero, above and below the line. */
  positiveFillPath: Path | null;
  negativeFillPath: Path | null;
  /** Dashed line at the trace's offset — its average value. */
  averageLine: Line | null;
  units: string | null;
  captionValue: "peak" | "average";
  amplitude: number;
  angularFrequency: number;
  phase: number;
  /** Constant the sinusoid rides on; the trace is offset + A·cos(ωt + φ). */
  offset: number;
};

export class WaveformNode extends Node {
  /** Time axis, shared by every trace. Also owns the x grid and ticks. */
  private readonly timeAxisTransform: ChartTransform;
  private readonly xGridLineSet: GridLineSet;
  private readonly xTickMarkSet: TickMarkSet;
  private readonly xTickLabelSet: TickLabelSet | null;

  private readonly leftAxis: VerticalAxis;
  private readonly rightAxis: VerticalAxis | null;
  private readonly traces: Trace[];

  private readonly playhead: Line | null;
  private readonly sampleCount: number;
  private timeWindow: number;

  /**
   * When set, traces evaluate as A·cos(Θ + φ + ω·(t − t_cursor)) so the playhead
   * value tracks an accumulated drive phase Θ instead of ω·t. Null keeps the
   * legacy A·cos(ωt + φ) form (tests and callers that never pass a drive phase).
   */
  private drivePhaseReference: number | null = null;

  /** Last playhead position in the visible window (seconds), for the Θ form above. */
  private cursorWrappedTime = 0;

  public constructor(providedOptions?: WaveformNodeOptions) {
    const options = optionize<WaveformNodeOptions, WaveformNodeSelfOptions, EmptySelfOptions>()(
      {
        viewWidth: 260,
        viewHeight: 120,
        timeWindow: 2,
        sampleCount: 200,
        axisColor: ACPhasorColors.textColorProperty as TColor,
        gridColor: ACPhasorColors.panelBorderColorProperty as TColor,
        labelColor: ACPhasorColors.textColorProperty as TColor,
        showCursor: false,
        showPeakValue: true,
        showTimeAxisLabels: true,
        // Quantity symbol plus SI unit, deliberately not localized — same
        // convention as the "Re"/"Im" axes of PhasorDiagramNode. Override it to
        // pass a localized string where a screen wants words instead.
        timeAxisLabel: "t (s)",
        labelFont: new PhetFont(10),
        captionFont: new PhetFont(12),
        stroke: ACPhasorColors.accentColorProperty as TColor,
        label: null as string | null,
        units: null as string | null,
        maxAmplitude: 10,
        autoScale: false,
        minimumFullScale: 0,
        traces: null,
      },
      providedOptions,
    );

    super();

    this.timeWindow = options.timeWindow;
    this.sampleCount = Math.max(2, Math.floor(options.sampleCount));

    // A scope built the old way — one stroke, one label, one scale — is just a
    // one-element trace list, so the two constructions share everything below.
    const traceOptions: WaveformTraceOptions[] = options.traces ?? [
      {
        stroke: options.stroke,
        label: options.label ?? "",
        units: options.units,
        maxAmplitude: options.maxAmplitude,
        autoScale: options.autoScale,
        minimumFullScale: options.minimumFullScale,
      },
    ];
    const usesRightAxis = traceOptions.some((trace) => trace.axis === "right");

    this.timeAxisTransform = new ChartTransform({
      viewWidth: options.viewWidth,
      viewHeight: options.viewHeight,
      modelXRange: new Range(0, this.timeWindow),
      modelYRange: new Range(-1, 1),
    });

    // Build one vertical axis per side. Each takes its scale from the traces
    // assigned to it, so volts and amps never have to share a number line.
    const createVerticalAxis = (side: WaveformAxis): VerticalAxis => {
      const own = traceOptions.filter((trace) => (trace.axis ?? "left") === side);
      const fullScale = own.length > 0 ? Math.max(...own.map((trace) => trace.maxAmplitude ?? 10)) : 1;
      const scale = { fullScale: fullScale };
      const chartTransform = new ChartTransform({
        viewWidth: options.viewWidth,
        viewHeight: options.viewHeight,
        modelXRange: new Range(0, this.timeWindow),
        modelYRange: new Range(-fullScale, fullScale),
      });
      return {
        chartTransform: chartTransform,
        // Only the left axis draws grid lines; a second set would double them up.
        gridLineSet:
          side === "left"
            ? new GridLineSet(chartTransform, Orientation.VERTICAL, fullScale / 2, {
                stroke: options.gridColor,
                lineWidth: 0.5,
              })
            : null,
        tickMarkSet: new TickMarkSet(chartTransform, Orientation.VERTICAL, fullScale / 2, {
          edge: side === "left" ? "min" : "max",
          extent: 4,
          stroke: options.axisColor,
        }),
        tickLabelSet: new TickLabelSet(chartTransform, Orientation.VERTICAL, fullScale / 2, {
          edge: side === "left" ? "min" : "max",
          extent: 6,
          // Formatted against whatever scale is in force when the label is
          // built, which is why the scale is read out of a box: this factory is
          // called from the TickLabelSet constructor a few lines above.
          createLabel: (value: number) =>
            new Text(formatTickValue(value, scale.fullScale / 2), {
              font: options.labelFont,
              // Tick labels are the only cue to which trace a right-hand axis
              // belongs to, so they carry that trace's color.
              fill: side === "left" ? options.labelColor : (own[0]?.stroke ?? options.labelColor),
            }),
        }),
        scale: scale,
        autoScale: own.some((trace) => trace.autoScale === true),
        minimumFullScale: own.length > 0 ? Math.max(...own.map((trace) => trace.minimumFullScale ?? 0)) : 0,
      };
    };

    this.leftAxis = createVerticalAxis("left");
    this.rightAxis = usesRightAxis ? createVerticalAxis("right") : null;

    const xTickSpacing = niceStep(this.timeWindow / 6);
    const chartRectangle = new ChartRectangle(this.timeAxisTransform, {
      stroke: options.gridColor,
      lineWidth: 1,
    });
    this.xGridLineSet = new GridLineSet(this.timeAxisTransform, Orientation.HORIZONTAL, xTickSpacing, {
      stroke: options.gridColor,
      lineWidth: 0.5,
    });
    // "min" is the bottom edge: model y increases up the screen.
    this.xTickMarkSet = new TickMarkSet(this.timeAxisTransform, Orientation.HORIZONTAL, xTickSpacing, {
      edge: "min",
      extent: 4,
      stroke: options.axisColor,
    });

    const chart = new Node({
      children: [
        chartRectangle,
        this.xGridLineSet,
        ...(this.leftAxis.gridLineSet ? [this.leftAxis.gridLineSet] : []),
        // Zero line: the time axis the traces swing about.
        new AxisLine(this.timeAxisTransform, Orientation.HORIZONTAL, {
          stroke: options.axisColor,
          lineWidth: 1,
        }),
        this.xTickMarkSet,
        this.leftAxis.tickMarkSet,
        this.leftAxis.tickLabelSet,
        ...(this.rightAxis ? [this.rightAxis.tickMarkSet, this.rightAxis.tickLabelSet] : []),
      ],
    });

    // The time axis is labelled only where it is read: a stack of scopes over the
    // same window labels the bottom one and lets the others sit closer.
    if (options.showTimeAxisLabels) {
      this.xTickLabelSet = new TickLabelSet(this.timeAxisTransform, Orientation.HORIZONTAL, xTickSpacing, {
        edge: "min",
        extent: 6,
        createLabel: (value: number) =>
          new Text(formatTickValue(value, this.xTickSpacing), {
            font: options.labelFont,
            fill: options.labelColor,
          }),
      });
      chart.addChild(this.xTickLabelSet);
      chart.addChild(
        new Text(options.timeAxisLabel, {
          font: options.labelFont,
          fill: options.labelColor,
          centerX: options.viewWidth / 2,
          top: options.viewHeight + 16,
        }),
      );
    } else {
      this.xTickLabelSet = null;
    }

    // Traces and playhead live in a clipped layer, so an over-range signal is cut
    // off at the chart border instead of growing the node.
    const clippedLayer = new Node({
      // Dilated by the trace's half-width so a peak that sits exactly on full
      // scale keeps its full stroke instead of being shaved by the border.
      clipArea: Shape.bounds(chartRectangle.getShape().bounds.dilated(1)),
    });

    this.traces = traceOptions.map((trace) => {
      const axis = (trace.axis ?? "left") === "right" && this.rightAxis ? this.rightAxis : this.leftAxis;

      // Shading goes down first, then the average line, then the curve on top of
      // both — the curve is the boundary of its own shaded area and must stay
      // crisp against it.
      const positiveFillPath = trace.fill ? new Path(null, { fill: trace.fill, opacity: 0.35 }) : null;
      const negativeFillPath = trace.fill
        ? new Path(null, { fill: trace.negativeFill ?? trace.fill, opacity: 0.35 })
        : null;
      if (positiveFillPath) {
        clippedLayer.addChild(positiveFillPath);
      }
      if (negativeFillPath) {
        clippedLayer.addChild(negativeFillPath);
      }

      const averageLine = trace.showAverageLine
        ? new Line(0, 0, options.viewWidth, 0, {
            stroke: trace.stroke,
            lineWidth: 1.5,
            lineDash: [6, 4],
          })
        : null;
      if (averageLine) {
        clippedLayer.addChild(averageLine);
      }

      const linePlot = new LinePlot(axis.chartTransform, [], {
        stroke: trace.stroke,
        lineWidth: 2,
      });
      clippedLayer.addChild(linePlot);
      return {
        linePlot: linePlot,
        axis: axis,
        cursorDot: options.showCursor
          ? new Circle(4, { fill: trace.stroke, center: axis.chartTransform.modelToViewXY(0, 0) })
          : null,
        peakText: options.showPeakValue ? new Text("", { font: options.captionFont, fill: trace.stroke }) : null,
        positiveFillPath: positiveFillPath,
        negativeFillPath: negativeFillPath,
        averageLine: averageLine,
        units: trace.units ?? null,
        captionValue: trace.captionValue ?? "peak",
        amplitude: 0,
        angularFrequency: 0,
        phase: 0,
        offset: trace.offset ?? 0,
      };
    });

    // The playhead sits under the dots so a dot is never bisected by its own line.
    this.playhead = options.showCursor
      ? new Line(0, 0, 0, options.viewHeight, {
          stroke: options.labelColor,
          lineWidth: 1,
          lineDash: [3, 3],
        })
      : null;
    if (this.playhead) {
      clippedLayer.addChild(this.playhead);
    }
    for (const trace of this.traces) {
      if (trace.cursorDot) {
        clippedLayer.addChild(trace.cursorDot);
      }
    }

    this.addChild(chart);
    this.addChild(clippedLayer);

    // Caption row above the chart: one "label peak units" group per trace, each
    // drawn in its own trace color, so a dual-trace scope needs no legend below
    // it. Each group is pinned to its own slot along the width and grows
    // rightward from there, so a peak value gaining a digit never nudges its
    // neighbours.
    traceOptions.forEach((traceOption, index) => {
      const tokens: Node[] = [];
      if (traceOption.label !== "") {
        tokens.push(new Text(traceOption.label, { font: options.captionFont, fill: traceOption.stroke }));
      }
      const peakText = this.traces[index]?.peakText;
      if (peakText) {
        tokens.push(peakText);
      }
      if (tokens.length === 0) {
        return;
      }
      this.addChild(
        new HBox({
          spacing: 6,
          align: "bottom",
          children: tokens,
          leftBottom: new Vector2((index * options.viewWidth) / traceOptions.length, -3),
        }),
      );
    });

    // Freeze the footprint: tick-label text, caption text, and trace amplitude
    // all change at run time, and none of them may move this node or its siblings.
    this.localBounds = new Bounds2(
      -Y_LABEL_GUTTER,
      -CAPTION_GUTTER,
      options.viewWidth + (this.rightAxis ? Y_LABEL_GUTTER : 0),
      options.viewHeight + (options.showTimeAxisLabels ? TIME_AXIS_GUTTER : 4),
    );

    for (const trace of this.traces) {
      this.updateTrace(trace);
      this.updatePeakText(trace);
    }
  }

  /** Time-axis tick spacing for the present window, on the 1–2–5 sequence. */
  private get xTickSpacing(): number {
    return niceStep(this.timeWindow / 6);
  }

  private valueAt(trace: Trace, time: number): number {
    const argument =
      this.drivePhaseReference !== null
        ? this.drivePhaseReference + trace.phase + trace.angularFrequency * (time - this.cursorWrappedTime)
        : trace.angularFrequency * time + trace.phase;
    return trace.offset + trace.amplitude * Math.cos(argument);
  }

  private updateTrace(trace: Trace): void {
    const dataSet: Vector2[] = [];
    for (let i = 0; i < this.sampleCount; i++) {
      const time = (i / (this.sampleCount - 1)) * this.timeWindow;
      dataSet.push(new Vector2(time, this.valueAt(trace, time)));
    }
    trace.linePlot.setDataSet(dataSet);
    this.updateShading(trace, dataSet);

    if (trace.averageLine) {
      const y = trace.axis.chartTransform.modelToViewY(trace.offset);
      trace.averageLine.setLine(0, y, trace.axis.chartTransform.viewWidth, y);
    }
  }

  /**
   * Redraw the area between a trace and the zero line, in two colors split at
   * the zero crossings. Each run of constant sign becomes one closed polygon
   * that follows the curve out and returns along the axis.
   */
  private updateShading(trace: Trace, samples: Vector2[]): void {
    if (!(trace.positiveFillPath && trace.negativeFillPath)) {
      return;
    }
    const transform = trace.axis.chartTransform;
    const positive = new Shape();
    const negative = new Shape();

    for (const run of signedRuns(samples)) {
      const first = run.points[0];
      const last = run.points[run.points.length - 1];
      if (!(first && last) || run.points.length < 2) {
        continue;
      }
      const shape = run.sign < 0 ? negative : positive;
      shape.moveToPoint(transform.modelToViewXY(first.x, 0));
      for (const point of run.points) {
        shape.lineToPoint(transform.modelToViewXY(point.x, point.y));
      }
      shape.lineToPoint(transform.modelToViewXY(last.x, 0));
      shape.close();
    }

    trace.positiveFillPath.shape = positive;
    trace.negativeFillPath.shape = negative;
  }

  /** Re-space one axis's grid, ticks and labels after a full-scale change. */
  private updateVerticalScale(axis: VerticalAxis): void {
    const newRange = new Range(-axis.scale.fullScale, axis.scale.fullScale);
    const spacing = axis.scale.fullScale / 2;
    applyChartRescale(
      axis.chartTransform.modelYRange.getLength(),
      newRange.getLength(),
      () => axis.chartTransform.setModelYRange(newRange),
      () => {
        axis.gridLineSet?.setSpacing(spacing);
        axis.tickMarkSet.setSpacing(spacing);
        axis.tickLabelSet.setSpacing(spacing);
      },
    );
    // Labels are cached by value; the cache must be dropped when the scale (and
    // therefore the number of decimals) changes.
    axis.tickLabelSet.invalidateTickLabelSet();
  }

  private updatePeakText(trace: Trace): void {
    if (!trace.peakText) {
      return;
    }
    const reported = trace.captionValue === "average" ? trace.offset : Math.abs(trace.amplitude);
    const value = formatTickValue(reported, trace.axis.scale.fullScale / 2);
    trace.peakText.string = trace.units === null ? value : `${value} ${trace.units}`;
  }

  /** Move one trace's playhead dot to its value at `time`. */
  private updateCursorDot(trace: Trace, time: number): void {
    if (trace.cursorDot) {
      trace.cursorDot.center = trace.axis.chartTransform.modelToViewXY(time, this.valueAt(trace, time));
    }
  }

  /** The playhead's present time, or 0 when there is no playhead. */
  private get cursorTime(): number {
    return this.playhead ? this.timeAxisTransform.viewToModelX(this.playhead.x1) : 0;
  }

  /**
   * Set trace `index` to the sinusoid offset + A·cos(ωt + φ). Redraws it
   * immediately, and rescales its axis when that axis auto-scales.
   *
   * `offset` is zero for an ordinary signal; instantaneous power is the case
   * that needs it, riding at 2ω on top of the real power.
   */
  public setTrace(index: number, amplitude: number, angularFrequency: number, phase: number, offset = 0): void {
    const trace = this.traces[index];
    if (!trace) {
      return;
    }
    trace.amplitude = amplitude;
    trace.angularFrequency = angularFrequency;
    trace.phase = phase;
    trace.offset = offset;

    if (trace.axis.autoScale) {
      // An auto-scaling axis follows the largest of the traces on it, so two
      // signals sharing an axis stay comparable. An offset trace is measured
      // from zero to its furthest excursion, not by its amplitude alone.
      const peak = Math.max(
        ...this.traces
          .filter((other) => other.axis === trace.axis)
          .map((other) => Math.abs(other.offset) + Math.abs(other.amplitude)),
      );
      const scale = Math.max(niceStep(peak), trace.axis.minimumFullScale);
      if (scale !== trace.axis.scale.fullScale) {
        trace.axis.scale.fullScale = scale;
        this.updateVerticalScale(trace.axis);
        // Every trace on the rescaled axis needs its caption re-rounded.
        for (const other of this.traces) {
          if (other.axis === trace.axis) {
            this.updatePeakText(other);
          }
        }
      }
    }

    this.updateTrace(trace);
    this.updatePeakText(trace);
    // Keep the playhead dot consistent with the new curve at its position.
    this.updateCursorDot(trace, this.cursorTime);
  }

  /**
   * Set the sinusoid to plot on a single-trace scope: A·cos(ωt + φ). Sugar for
   * `setTrace( 0, … )`.
   */
  public setWaveform(amplitude: number, angularFrequency: number, phase: number): void {
    this.setTrace(0, amplitude, angularFrequency, phase);
  }

  /**
   * Re-span the time axis. Use it to hold a fixed number of cycles on screen as
   * the frequency changes: a window fixed in seconds shows a flat line at the
   * bottom of a decades-wide frequency range and a picket fence at the top.
   *
   * The tick spacing re-snaps to the 1–2–5 sequence, so the labels stay round.
   */
  public setTimeWindow(seconds: number): void {
    if (!(seconds > 0 && Number.isFinite(seconds)) || seconds === this.timeWindow) {
      return;
    }
    // The playhead is a position in the window, so hold it where it sits
    // proportionally rather than letting it jump when the span changes.
    const cursorFraction = this.timeWindow > 0 ? this.cursorTime / this.timeWindow : 0;

    const previousWindow = this.timeWindow;
    this.timeWindow = seconds;
    const range = new Range(0, seconds);
    const spacing = this.xTickSpacing;
    applyChartRescale(
      previousWindow,
      seconds,
      () => {
        this.timeAxisTransform.setModelXRange(range);
        this.leftAxis.chartTransform.setModelXRange(range);
        this.rightAxis?.chartTransform.setModelXRange(range);
      },
      () => {
        this.xGridLineSet.setSpacing(spacing);
        this.xTickMarkSet.setSpacing(spacing);
        this.xTickLabelSet?.setSpacing(spacing);
      },
    );
    this.xTickLabelSet?.invalidateTickLabelSet();

    for (const trace of this.traces) {
      this.updateTrace(trace);
    }
    this.setCursorTime(cursorFraction * seconds);
  }

  /**
   * Slide the playhead to the given absolute time, carrying every trace's dot
   * with it. The time is wrapped into the visible window so the marker cycles
   * across it. No-op unless the node was created with `showCursor: true`.
   *
   * Pass `drivePhaseReference` (the source's accumulated Θ, or 2Θ on a 2ω power
   * scope) so the playhead value stays continuous when frequency changes. With
   * it set, each trace reads A·cos(Θ + φ + ω·(t − t_cursor)) at window time t.
   */
  public setCursorTime(time: number, drivePhaseReference?: number): void {
    if (!this.playhead) {
      return;
    }
    const wrapped = ((time % this.timeWindow) + this.timeWindow) % this.timeWindow;
    this.cursorWrappedTime = wrapped;
    if (drivePhaseReference !== undefined) {
      this.drivePhaseReference = drivePhaseReference;
    }
    const x = this.timeAxisTransform.modelToViewX(wrapped);
    this.playhead.setLine(x, 0, x, this.timeAxisTransform.viewHeight);
    for (const trace of this.traces) {
      this.updateCursorDot(trace, wrapped);
    }
  }
}

/**
 * Split a sampled curve into runs of constant sign, cutting each run at the
 * interpolated zero crossing. Shading the runs separately is what lets p(t) show
 * energy delivered and energy returned in two colors, with the boundary landing
 * exactly on the zero line rather than a sample short of it.
 */
function signedRuns(samples: Vector2[]): { sign: number; points: Vector2[] }[] {
  const runs: { sign: number; points: Vector2[] }[] = [];
  let points: Vector2[] = [];
  let sign = 0;

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (!sample) {
      continue;
    }
    const sampleSign = Math.sign(sample.y);
    const previous = samples[i - 1];

    if (points.length === 0) {
      points.push(sample);
      sign = sampleSign;
      continue;
    }
    if (previous && sampleSign !== 0 && sign !== 0 && sampleSign !== sign) {
      // Linear crossing between the two samples; both runs share the point, so
      // no sliver of background shows through between them.
      const t = previous.x + ((sample.x - previous.x) * (0 - previous.y)) / (sample.y - previous.y);
      const crossing = new Vector2(t, 0);
      points.push(crossing);
      runs.push({ sign: sign, points: points });
      points = [crossing, sample];
      sign = sampleSign;
      continue;
    }
    points.push(sample);
    if (sign === 0) {
      sign = sampleSign;
    }
  }
  if (points.length > 1) {
    runs.push({ sign: sign, points: points });
  }
  return runs;
}
