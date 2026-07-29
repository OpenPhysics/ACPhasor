/**
 * Fleet-standard memory-leak regression suite (TemplateSingleSim / QubitSketch pattern).
 *
 * Creates a disposable model object inside a function boundary, disposes it, forces
 * garbage collection via global.gc (--expose-gc in vitest.config.ts), then asserts via
 * WeakRef that the object was collected. V8 requires a function boundary (not merely
 * a block scope) so local strong references die when the helper returns.
 */

import { DerivedProperty, Property, StringProperty } from "scenerystack/axon";
import { Range, Vector2 } from "scenerystack/dot";
import { ModelViewTransform2 } from "scenerystack/phetcommon";
import { describe, expect, it } from "vitest";
import { Phasor } from "../src/common/model/Phasor.js";
import { TimeModel } from "../src/common/TimeModel.js";
import { PhaseArcNode } from "../src/common/view/PhaseArcNode.js";
import { PhasorChainNode } from "../src/common/view/PhasorChainNode.js";
import { PhasorNode } from "../src/common/view/PhasorNode.js";
import { SimNumberControl } from "../src/common/view/SimNumberControl.js";
import { PowerModel } from "../src/power/model/PowerModel.js";

/**
 * Force garbage collection with multiple passes. When `earlyExitRef` is supplied
 * the loop bails as soon as the object is confirmed collected. The setTimeout(0)
 * yield after a live deref() avoids the WeakRef macrotask-liveness pin.
 */
async function forceGC(earlyExitRef?: WeakRef<object>): Promise<void> {
  for (let i = 0; i < 15; i++) {
    globalThis.gc?.();
    await new Promise<void>((r) => setTimeout(r, 50));
    if (earlyExitRef !== undefined && earlyExitRef.deref() === undefined) {
      return;
    }
    if (earlyExitRef !== undefined) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}

function createAndDisposeTimeModel(): WeakRef<object> {
  const model = new TimeModel();
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

describe("Memory leak regression", () => {
  it("global.gc is available (--expose-gc)", () => {
    expect(globalThis.gc).toBeDefined();
  });

  it("sanity: plain object is collected", async () => {
    const ref = (() => new WeakRef({ hello: "world" }))();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("TimeModel is collected after dispose", async () => {
    const ref = createAndDisposeTimeModel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("double dispose() does not throw", () => {
    const model = new TimeModel();
    model.dispose();
    expect(() => model.dispose()).not.toThrow();
  });

  it("repeated create/dispose cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 10; i++) {
      refs.push(createAndDisposeTimeModel());
    }
    await forceGC();
    const survivors = refs.filter((r) => r.deref() !== undefined).length;
    expect(survivors).toBe(0);
  });

  /**
   * These view nodes all link Properties owned by someone else — a screen's
   * display phasors, a model's frequency — and those Properties outlive the node
   * by design. A missed unlink is therefore the leak that matters: the model
   * keeps a listener that keeps the whole node graph alive, and it keeps firing.
   *
   * The assertion is on the listener, not on a WeakRef: a scenery Node is reached
   * from enough long-lived machinery that it is not reliably collectable in a
   * test process, so "was it collected" would be a flaky proxy for the thing
   * actually at stake, which is whether the node let go of the Property.
   */
  describe("view nodes that link outside Properties", () => {
    const modelViewTransform = ModelViewTransform2.createSinglePointScaleInvertedYMapping(
      Vector2.ZERO,
      new Vector2(100, 100),
      100,
    );

    it("PhasorNode unlinks its phasor on dispose", () => {
      const phasorProperty = new Property(Phasor.ZERO);
      expect(phasorProperty.hasListeners()).toBe(false);

      const node = new PhasorNode(phasorProperty, modelViewTransform, { showProjection: "real" });
      expect(phasorProperty.hasListeners()).toBe(true);

      node.dispose();
      expect(phasorProperty.hasListeners()).toBe(false);
      expect(() => {
        phasorProperty.value = new Phasor(1, 0);
      }).not.toThrow();
    });

    it("PhasorChainNode unlinks every link and its resultant on dispose", () => {
      const first = new Property(Phasor.ZERO);
      const second = new Property(Phasor.ZERO);
      const resultant = new Property(Phasor.ZERO);

      const node = new PhasorChainNode(
        [
          { property: first, fill: "red", label: "V<sub>R</sub>" },
          { property: second, fill: "green", label: "V<sub>L</sub>" },
        ],
        modelViewTransform,
        { resultant: { property: resultant, fill: "white", label: "V" } },
      );
      expect(first.hasListeners()).toBe(true);
      expect(second.hasListeners()).toBe(true);
      expect(resultant.hasListeners()).toBe(true);

      node.dispose();
      // The chained tails are derived from earlier links, so a link left behind
      // here would go unnoticed until the second phasor in a chain stopped moving.
      expect(first.hasListeners()).toBe(false);
      expect(second.hasListeners()).toBe(false);
      expect(resultant.hasListeners()).toBe(false);
    });

    it("PhaseArcNode unlinks both angles on dispose", () => {
      const fromAngle = new Property(0);
      const toAngle = new Property(Math.PI / 2);

      const node = new PhaseArcNode(fromAngle, toAngle, modelViewTransform);
      expect(fromAngle.hasListeners()).toBe(true);
      expect(toAngle.hasListeners()).toBe(true);

      node.dispose();
      expect(fromAngle.hasListeners()).toBe(false);
      expect(toAngle.hasListeners()).toBe(false);
    });

    it("a power triangle built on a PowerModel lets go of it on dispose", () => {
      // The shape the Power screen actually builds: a chain of Properties derived
      // from the model, feeding a PhasorChainNode. A missed unlink here would
      // leave the model redrawing a triangle belonging to a discarded screen.
      const model = new PowerModel();
      const scale = new DerivedProperty([model.apparentPowerPhasorProperty], () => 1);
      const scaledReal = new DerivedProperty([model.realPowerPhasorProperty, scale], (phasor) => phasor);
      const scaledReactive = new DerivedProperty([model.reactivePowerPhasorProperty, scale], (phasor) => phasor);
      const scaledApparent = new DerivedProperty([model.apparentPowerPhasorProperty, scale], (phasor) => phasor);

      const node = new PhasorChainNode(
        [
          { property: scaledReal, fill: "red", label: "P" },
          { property: scaledReactive, fill: "green", label: "Q" },
        ],
        modelViewTransform,
        { resultant: { property: scaledApparent, fill: "orange", label: "S" } },
      );
      expect(scaledReal.hasListeners()).toBe(true);
      expect(scaledApparent.hasListeners()).toBe(true);

      node.dispose();
      expect(scaledReal.hasListeners()).toBe(false);
      expect(scaledReactive.hasListeners()).toBe(false);
      expect(scaledApparent.hasListeners()).toBe(false);

      // And the model's own Properties go quiet once the derived ones are gone.
      for (const derived of [scaledReal, scaledReactive, scaledApparent, scale]) {
        derived.dispose();
      }
      expect(model.realPowerPhasorProperty.hasListeners()).toBe(false);
      expect(model.apparentPowerPhasorProperty.hasListeners()).toBe(false);
    });

    it("a logarithmic SimNumberControl unbridges from its model Property", () => {
      // The log bridge links the model Property in both directions. Left in
      // place it would go on writing 10^(slider) back into the model after the
      // screen holding it was gone.
      const frequencyProperty = new Property(1);
      const control = new SimNumberControl(
        new StringProperty("Frequency"),
        frequencyProperty,
        new Range(0.02, 5),
        new StringProperty("{{value}} Hz"),
        { decimalPlaces: 2, logarithmic: true },
      );
      expect(frequencyProperty.hasListeners()).toBe(true);

      control.dispose();
      expect(frequencyProperty.hasListeners()).toBe(false);
      frequencyProperty.value = 2;
      expect(frequencyProperty.value).toBe(2);
    });
  });
});
