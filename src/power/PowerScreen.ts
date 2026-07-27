/**
 * PowerScreen.ts
 *
 * Power-in-AC-circuits screen — instantaneous power p(t) = v(t)·i(t) over a
 * cycle, with the average (real) power and the oscillating (reactive)
 * component shaded separately and a power-factor readout tied to cos φ.
 * Framework only.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import ACPhasorColors from "../ACPhasorColors.js";
import { createPowerIcon } from "../common/ACPhasorScreenIcons.js";
import { PowerModel } from "./model/PowerModel.js";
import { PowerKeyboardHelpContent } from "./view/PowerKeyboardHelpContent.js";
import { PowerScreenView } from "./view/PowerScreenView.js";

type PowerScreenOptions = ScreenOptions & { tandem: Tandem };

export class PowerScreen extends Screen<PowerModel, PowerScreenView> {
  public constructor(options: PowerScreenOptions) {
    super(
      () => new PowerModel(),
      (model) =>
        new PowerScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<PowerScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: ACPhasorColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new PowerKeyboardHelpContent(),
          homeScreenIcon: createPowerIcon(),
          navigationBarIcon: createPowerIcon(),
        },
        options,
      ),
    );
  }
}
