/**
 * SimNumberControl.test.ts
 *
 * Covers the logarithmic-slider bridge. The control drives an intermediate
 * log-space Property, and the round trip through 10^log₁₀(x) is not exact, so the
 * risk is that the bridge either drifts, ping-pongs, or fails range validation at
 * the ends of the range — none of which is visible until a slider is dragged.
 */

import { NumberProperty, StringProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { AC_FREQUENCY_RANGE_HZ } from "../src/ACPhasorConstants.js";
import { SimNumberControl } from "../src/common/view/SimNumberControl.js";

describe("SimNumberControl", () => {
  it("builds a linear control", () => {
    const resistanceProperty = new NumberProperty(10, { range: new Range(1, 100) });
    const control = new SimNumberControl(
      new StringProperty("Resistance"),
      resistanceProperty,
      new Range(1, 100),
      new StringProperty("{{value}} Ω"),
      { decimalPlaces: 0 },
    );

    resistanceProperty.value = 47;
    expect(resistanceProperty.value).toBe(47);

    control.dispose();
  });

  describe("logarithmic", () => {
    it("holds the model value through a round trip, including at both ends", () => {
      const frequencyProperty = new NumberProperty(1, { range: AC_FREQUENCY_RANGE_HZ });
      const control = new SimNumberControl(
        new StringProperty("Frequency"),
        frequencyProperty,
        AC_FREQUENCY_RANGE_HZ,
        new StringProperty("{{value}} Hz"),
        { decimalPlaces: 2, logarithmic: true },
      );

      for (const value of [AC_FREQUENCY_RANGE_HZ.min, 0.159, 1, 3.3, AC_FREQUENCY_RANGE_HZ.max]) {
        frequencyProperty.value = value;
        expect(frequencyProperty.value).toBeCloseTo(value, 9);
      }

      control.dispose();
    });

    it("follows a reset of the model Property", () => {
      const frequencyProperty = new NumberProperty(1, { range: AC_FREQUENCY_RANGE_HZ });
      const control = new SimNumberControl(
        new StringProperty("Frequency"),
        frequencyProperty,
        AC_FREQUENCY_RANGE_HZ,
        new StringProperty("{{value}} Hz"),
        { decimalPlaces: 2, logarithmic: true },
      );

      frequencyProperty.value = 4;
      frequencyProperty.reset();
      expect(frequencyProperty.value).toBeCloseTo(1, 9);

      control.dispose();
    });

    it("falls back to a linear slider when the range reaches zero", () => {
      // log₁₀(0) is undefined, so a range starting at zero has to stay linear.
      const amplitudeProperty = new NumberProperty(5, { range: new Range(0, 10) });
      const control = new SimNumberControl(
        new StringProperty("Amplitude"),
        amplitudeProperty,
        new Range(0, 10),
        new StringProperty("{{value}} V"),
        { decimalPlaces: 1, logarithmic: true },
      );

      amplitudeProperty.value = 0;
      expect(amplitudeProperty.value).toBe(0);

      control.dispose();
    });
  });
});
