/**
 * TimeModel.ts
 *
 * A reusable, composable timing model for simulations that need play/pause and
 * elapsed-time tracking. Compose it into your screen model rather than
 * extending it.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // In YourModel.ts
 *   import { TimeModel } from "../../common/TimeModel.js";
 *
 *   export class YourModel implements TModel {
 *     public readonly timer = new TimeModel();
 *
 *     public step( dt: number ): void {
 *       this.timer.step( dt );
 *       // use this.timer.timeProperty.value for physics calculations
 *     }
 *
 *     public reset(): void {
 *       this.timer.reset();
 *       // reset other state …
 *     }
 *   }
 *
 * ── View wiring ───────────────────────────────────────────────────────────────
 *
 *   SceneryStack ships a TimeControlNode that binds directly to isPlayingProperty:
 *
 *   import { TimeControlNode } from "scenerystack/scenery-phet";
 *
 *   const timeControl = new TimeControlNode( model.timer.isPlayingProperty, {
 *     // TimeControlNode is SceneryStack's built-in: it draws the play/pause and
 *     // step buttons itself, and — when given a timeSpeedProperty — the speed
 *     // radio buttons too. No custom radio group is needed.
 *     timeSpeedProperty: model.timer.timeSpeedProperty,
 *     timeSpeeds: DEFAULT_TIME_SPEEDS,
 *     ...TIME_CONTROL_SPEED_RADIO_OPTIONS, // theme the radio labels for our panels
 *     playPauseStepButtonOptions: {
 *       ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
 *       stepForwardButtonOptions: {
 *         ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
 *         listener: () => model.timer.stepForward( 1 / 60 ),
 *       },
 *     },
 *   });
 *
 * ── Start paused vs. playing ──────────────────────────────────────────────────
 *
 *   new TimeModel()           // starts paused  (most physics sims)
 *   new TimeModel( true )     // starts playing  (continuous animations)
 */

import { BooleanProperty, EnumerationProperty, NumberProperty } from "scenerystack/axon";
import { TimeSpeed } from "scenerystack/scenery-phet";

/**
 * Playback-rate multiplier applied to dt for each {@link TimeSpeed}. The built-in
 * TimeControlNode only toggles the speed state; the model still has to honor it,
 * so {@link step} scales dt by the current entry here.
 */
const TIME_SPEED_SCALE = new Map<TimeSpeed, number>([
  [TimeSpeed.SLOW, 0.25],
  [TimeSpeed.NORMAL, 1],
  [TimeSpeed.FAST, 2],
]);

/**
 * Speeds offered by the built-in TimeControlNode across the sim, in display
 * order (top to bottom in the vertical radio group). Spread into both
 * {@link TimeModel}'s `timeSpeedProperty.validValues` and TimeControlNode's
 * `timeSpeeds` option so the model and the radio group always agree.
 */
export const DEFAULT_TIME_SPEEDS = [TimeSpeed.NORMAL, TimeSpeed.SLOW];

export class TimeModel {
  /** Whether the simulation clock is running. Bind to TimeControlNode. */
  public readonly isPlayingProperty: BooleanProperty;

  /** Elapsed simulation time in seconds. Resets to 0 on reset(). */
  public readonly timeProperty: NumberProperty;

  /**
   * Current playback speed. Bind to TimeControlNode's `timeSpeedProperty` to get
   * its built-in speed radio buttons; {@link step} scales dt by the matching
   * entry in {@link TIME_SPEED_SCALE}.
   */
  public readonly timeSpeedProperty: EnumerationProperty<TimeSpeed>;

  public constructor(initiallyPlaying = false) {
    this.isPlayingProperty = new BooleanProperty(initiallyPlaying);
    this.timeProperty = new NumberProperty(0, { units: "s" });
    this.timeSpeedProperty = new EnumerationProperty(TimeSpeed.NORMAL, {
      validValues: DEFAULT_TIME_SPEEDS,
    });
  }

  /**
   * Advance the simulation clock by dt seconds, scaled by the current speed.
   * Call this from your model's step() method.
   */
  public step(dt: number): void {
    if (this.isPlayingProperty.value) {
      this.timeProperty.value += dt * (TIME_SPEED_SCALE.get(this.timeSpeedProperty.value) ?? 1);
    }
  }

  /**
   * Advance the clock by dt seconds whether or not it is running. This is what a
   * step-forward button needs: it is pressed precisely when the sim is paused,
   * so {@link step} would ignore it.
   */
  public stepForward(dt: number): void {
    this.timeProperty.value += dt;
  }

  /** Resets clock and playback state to their initial values. */
  public reset(): void {
    this.isPlayingProperty.reset();
    this.timeProperty.reset();
    this.timeSpeedProperty.reset();
  }

  /** Call when the model is no longer needed to free AXON listeners. */
  public dispose(): void {
    this.isPlayingProperty.dispose();
    this.timeProperty.dispose();
    this.timeSpeedProperty.dispose();
  }
}
