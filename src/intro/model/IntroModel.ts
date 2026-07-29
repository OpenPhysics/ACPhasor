/**
 * IntroModel.ts
 *
 * Model for the Intro screen: a single AC circuit element (resistor, inductor,
 * or capacitor) driven by the shared {@link ACSourceModel}. The element sees the
 * full source voltage; the current through it is I = V / Z, so its phase leads
 * or lags the voltage depending on the element:
 *
 *   resistor  → current in phase with voltage
 *   inductor  → current lags voltage by 90°   (Z = +jωL)
 *   capacitor → current leads voltage by 90°  (Z = −j/ωC)
 *
 * A {@link TimeModel} drives the rotating-phasor animation in the view.
 */

import { DerivedProperty, NumberProperty, StringUnionProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Complex } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  CAPACITANCE_DEFAULT_F,
  CAPACITANCE_RANGE_F,
  INDUCTANCE_DEFAULT_H,
  INDUCTANCE_RANGE_H,
  RESISTANCE_DEFAULT_OHMS,
  RESISTANCE_RANGE_OHMS,
} from "../../ACPhasorConstants.js";
import { ACSourceModel } from "../../common/model/ACSourceModel.js";
import { type CircuitElementType, elementImpedance } from "../../common/model/Impedance.js";
import type { Phasor } from "../../common/model/Phasor.js";
import { TimeModel } from "../../common/TimeModel.js";

const ELEMENT_TYPES: readonly CircuitElementType[] = ["resistor", "inductor", "capacitor"];

export class IntroModel implements TModel {
  /** The sinusoidal voltage source driving the element. */
  public readonly source = new ACSourceModel();

  /** Play/pause + elapsed time for the rotating-phasor animation (starts playing). */
  public readonly timer = new TimeModel(true);

  /** Which element is currently connected. */
  public readonly elementTypeProperty = new StringUnionProperty<CircuitElementType>("resistor", {
    validValues: ELEMENT_TYPES,
  });

  /** Resistance R (Ω), used when the resistor is selected. */
  public readonly resistanceProperty = new NumberProperty(RESISTANCE_DEFAULT_OHMS, {
    range: RESISTANCE_RANGE_OHMS,
    units: "Ω",
  });

  /** Inductance L (henries), used when the inductor is selected. */
  public readonly inductanceProperty = new NumberProperty(INDUCTANCE_DEFAULT_H, {
    range: INDUCTANCE_RANGE_H,
  });

  /** Capacitance C (F), used when the capacitor is selected. */
  public readonly capacitanceProperty = new NumberProperty(CAPACITANCE_DEFAULT_F, {
    range: CAPACITANCE_RANGE_F,
    units: "F",
  });

  /** Complex impedance Z of the selected element at the current frequency. */
  public readonly impedanceProperty: TReadOnlyProperty<Complex>;

  /** Voltage phasor across the element — the full source voltage. */
  public readonly voltagePhasorProperty: TReadOnlyProperty<Phasor>;

  /** Current phasor through the element, I = V / Z. */
  public readonly currentPhasorProperty: TReadOnlyProperty<Phasor>;

  /** Phase of current relative to voltage (radians): >0 leads, <0 lags. */
  public readonly phaseDifferenceProperty: TReadOnlyProperty<number>;

  public constructor() {
    this.voltagePhasorProperty = this.source.voltagePhasorProperty;

    this.impedanceProperty = new DerivedProperty(
      [
        this.elementTypeProperty,
        this.resistanceProperty,
        this.inductanceProperty,
        this.capacitanceProperty,
        this.source.angularFrequencyProperty,
      ],
      (type, resistance, inductance, capacitance, angularFrequency) => {
        const value = type === "resistor" ? resistance : type === "inductor" ? inductance : capacitance;
        return elementImpedance(type, value, angularFrequency);
      },
      { valueComparisonStrategy: "equalsFunction" },
    );

    this.currentPhasorProperty = new DerivedProperty(
      [this.voltagePhasorProperty, this.impedanceProperty],
      (voltage, impedance) => voltage.dividedBy(impedance),
      { valueComparisonStrategy: "equalsFunction" },
    );

    this.phaseDifferenceProperty = new DerivedProperty(
      [this.currentPhasorProperty, this.voltagePhasorProperty],
      (current, voltage) => current.phase - voltage.phase,
    );
  }

  public step(dt: number): void {
    const before = this.timer.timeProperty.value;
    this.timer.step(dt);
    this.source.advanceDrivePhase(this.timer.timeProperty.value - before);
  }

  /**
   * Advance the clock and drive phase by one frame while paused. Wire the
   * TimeControlNode step-forward button here so Θ stays locked to the playhead.
   */
  public stepForward(dt: number): void {
    const before = this.timer.timeProperty.value;
    this.timer.stepForward(dt);
    this.source.advanceDrivePhase(this.timer.timeProperty.value - before);
  }

  public reset(): void {
    this.source.reset();
    this.timer.reset();
    this.elementTypeProperty.reset();
    this.resistanceProperty.reset();
    this.inductanceProperty.reset();
    this.capacitanceProperty.reset();
  }

  /**
   * Release the listener graph, in the reverse of construction order — the
   * derived Properties listen to the ones below them, and to the source's.
   * {@link voltagePhasorProperty} is an alias for the source's and is disposed
   * with it.
   */
  public dispose(): void {
    this.phaseDifferenceProperty.dispose();
    this.currentPhasorProperty.dispose();
    this.impedanceProperty.dispose();
    this.capacitanceProperty.dispose();
    this.inductanceProperty.dispose();
    this.resistanceProperty.dispose();
    this.elementTypeProperty.dispose();
    this.timer.dispose();
    this.source.dispose();
  }
}
