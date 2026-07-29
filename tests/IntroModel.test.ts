/**
 * IntroModel.test.ts
 *
 * Unit tests for the Intro-screen model: single-element phase relationships and
 * impedance selection.
 */

import { describe, expect, it } from "vitest";
import { IntroModel } from "../src/intro/model/IntroModel.js";

describe("IntroModel", () => {
  it("starts with a resistor whose current is in phase with the voltage", () => {
    const model = new IntroModel();
    expect(model.elementTypeProperty.value).toBe("resistor");
    expect(model.phaseDifferenceProperty.value).toBeCloseTo(0);
  });

  it("resistor impedance is purely real", () => {
    const model = new IntroModel();
    model.resistanceProperty.value = 25;
    expect(model.impedanceProperty.value.real).toBeCloseTo(25);
    expect(model.impedanceProperty.value.imaginary).toBeCloseTo(0);
  });

  it("inductor current lags the voltage by 90°", () => {
    const model = new IntroModel();
    model.elementTypeProperty.value = "inductor";
    // I = V / (jωL): current phase is 90° behind the voltage.
    expect(model.phaseDifferenceProperty.value).toBeCloseTo(-Math.PI / 2);
  });

  it("capacitor current leads the voltage by 90°", () => {
    const model = new IntroModel();
    model.elementTypeProperty.value = "capacitor";
    expect(model.phaseDifferenceProperty.value).toBeCloseTo(Math.PI / 2);
  });

  it("current amplitude follows Ohm's law I = V / |Z| for the resistor", () => {
    const model = new IntroModel();
    model.source.amplitudeProperty.value = 10;
    model.resistanceProperty.value = 5;
    expect(model.currentPhasorProperty.value.amplitude).toBeCloseTo(2);
  });

  it("impedance tracks frequency for the inductor", () => {
    const model = new IntroModel();
    model.elementTypeProperty.value = "inductor";
    model.inductanceProperty.value = 2;
    model.source.frequencyProperty.value = 1; // ω = 2π
    expect(model.impedanceProperty.value.imaginary).toBeCloseTo(2 * Math.PI * 2);
  });

  it("advances time only while playing", () => {
    const model = new IntroModel();
    expect(model.timer.isPlayingProperty.value).toBe(true);
    model.step(0.5);
    expect(model.timer.timeProperty.value).toBeCloseTo(0.5);
  });

  it("advances drive phase with the clock, including step-forward while paused", () => {
    const model = new IntroModel();
    model.source.frequencyProperty.value = 1;
    model.step(0.25);
    expect(model.source.drivePhaseProperty.value).toBeCloseTo(Math.PI / 2);

    model.timer.isPlayingProperty.value = false;
    model.step(1);
    expect(model.source.drivePhaseProperty.value).toBeCloseTo(Math.PI / 2);

    model.stepForward(0.25);
    expect(model.source.drivePhaseProperty.value).toBeCloseTo(Math.PI);
  });

  it("keeps drive phase continuous when frequency changes mid-run", () => {
    const model = new IntroModel();
    model.source.frequencyProperty.value = 1;
    model.step(0.125);
    const phaseBefore = model.source.drivePhaseProperty.value;
    const voltageBefore = model.source.instantaneousVoltage();

    model.source.frequencyProperty.value = 3;
    expect(model.source.drivePhaseProperty.value).toBe(phaseBefore);
    expect(model.source.instantaneousVoltage()).toBeCloseTo(voltageBefore);
  });

  it("reset() restores the default element and values", () => {
    const model = new IntroModel();
    model.elementTypeProperty.value = "capacitor";
    model.resistanceProperty.value = 80;
    model.source.frequencyProperty.value = 4;
    model.step(1);
    model.reset();
    expect(model.elementTypeProperty.value).toBe("resistor");
    expect(model.resistanceProperty.value).toBe(10);
    expect(model.source.frequencyProperty.value).toBe(1);
    expect(model.timer.timeProperty.value).toBe(0);
    expect(model.source.drivePhaseProperty.value).toBe(0);
  });
});
