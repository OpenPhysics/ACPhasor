/**
 * WaveformNode.ts
 *
 * A lightweight oscilloscope trace for one sinusoid v(t) = A·cos(ωt + φ),
 * plotted over a fixed time window. The horizontal axis is time (0 at the left
 * edge, `timeWindow` seconds at the right); the vertical axis is the signal,
 * centered, with amplitude `maxAmplitude` mapped to half the node's height.
 *
 * The trace is imperative: call {@link setWaveform} whenever the phasor or
 * frequency changes, and (optionally) {@link setCursorTime} each animation frame
 * to slide a marker along the curve. It intentionally avoids bamboo's chart
 * machinery so it can be dropped in with a couple of numbers.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const scope = new WaveformNode( { viewWidth: 260, viewHeight: 120, timeWindow: 2,
 *                                     maxAmplitude: 10, stroke: color } );
 *   scope.setWaveform( amplitude, angularFrequency, phase );
 *   // in step(): scope.setCursorTime( model.timer.timeProperty.value );
 */

import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, type TColor } from "scenerystack/scenery";
import ACPhasorColors from "../../ACPhasorColors.js";

type SelfOptions = {
  /** Plot width in view pixels (the full time window). */
  viewWidth?: number;
  /** Plot height in view pixels; ±maxAmplitude maps to ±viewHeight/2. */
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
  /** Whether to show a moving cursor dot (see {@link setCursorTime}). */
  showCursor?: boolean;
  /**
   * When true, {@link setWaveform} rescales the vertical axis to the incoming
   * amplitude so the trace always fills the plot. Use for signals whose
   * amplitude varies widely (e.g. current through a reactance).
   */
  autoScale?: boolean;
};

export class WaveformNode extends Node {
  private readonly viewWidth: number;
  private readonly viewHeight: number;
  private readonly timeWindow: number;
  private readonly sampleCount: number;
  private readonly autoScale: boolean;

  // Amplitude that reaches the top/bottom edge. Mutable when autoScale is on.
  private maxAmplitude: number;

  private readonly tracePath: Path;
  private readonly cursorDot: Circle | null;

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
      axisColor: ACPhasorColors.panelBorderColorProperty as TColor,
      showCursor: false,
      autoScale: false,
      ...providedOptions,
    };

    super();

    this.viewWidth = options.viewWidth;
    this.viewHeight = options.viewHeight;
    this.timeWindow = options.timeWindow;
    this.maxAmplitude = options.maxAmplitude;
    this.sampleCount = Math.max(2, Math.floor(options.sampleCount));
    this.autoScale = options.autoScale;

    // Horizontal time axis through the vertical center.
    const midY = options.viewHeight / 2;
    this.addChild(
      new Line(0, midY, options.viewWidth, midY, {
        stroke: options.axisColor,
        lineWidth: 1,
      }),
    );

    this.tracePath = new Path(null, { stroke: options.stroke, lineWidth: 2 });
    this.addChild(this.tracePath);

    this.cursorDot = options.showCursor ? new Circle(4, { fill: options.stroke, center: new Vector2(0, midY) }) : null;
    if (this.cursorDot) {
      this.addChild(this.cursorDot);
    }

    this.updateTrace();
  }

  /** Map a signal value to a view y-coordinate (clamped visually by the caller's amplitude choice). */
  private valueToY(value: number): number {
    return this.viewHeight / 2 - (value / this.maxAmplitude) * (this.viewHeight / 2);
  }

  /** Map a time within the window to a view x-coordinate. */
  private timeToX(time: number): number {
    return (time / this.timeWindow) * this.viewWidth;
  }

  private valueAt(time: number): number {
    return this.amplitude * Math.cos(this.angularFrequency * time + this.phase);
  }

  private updateTrace(): void {
    const shape = new Shape();
    for (let i = 0; i < this.sampleCount; i++) {
      const time = (i / (this.sampleCount - 1)) * this.timeWindow;
      const x = this.timeToX(time);
      const y = this.valueToY(this.valueAt(time));
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    this.tracePath.shape = shape;
  }

  /** Set the sinusoid to plot: A·cos(ωt + φ). Redraws the trace immediately. */
  public setWaveform(amplitude: number, angularFrequency: number, phase: number): void {
    this.amplitude = amplitude;
    this.angularFrequency = angularFrequency;
    this.phase = phase;
    if (this.autoScale) {
      // Fit the trace to its own amplitude; floor avoids a divide-by-zero flat line.
      this.maxAmplitude = Math.max(Math.abs(amplitude), 1e-6);
    }
    this.updateTrace();
    // Keep the cursor consistent with the new curve at x = current position.
    if (this.cursorDot) {
      const time = (this.cursorDot.centerX / this.viewWidth) * this.timeWindow;
      this.cursorDot.centerY = this.valueToY(this.valueAt(time));
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
    this.cursorDot.center = new Vector2(this.timeToX(wrapped), this.valueToY(this.valueAt(wrapped)));
  }
}
