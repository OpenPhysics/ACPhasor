/**
 * IntroScreen.ts
 *
 * Intro screen — explore a single electromagnetic component (resistor,
 * inductor, or capacitor) driven by an AC source, with its voltage/current
 * phasor. Framework only; model and view are stubs.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import ACPhasorColors from "../ACPhasorColors.js";
import { createIntroIcon } from "../common/ACPhasorScreenIcons.js";
import { IntroModel } from "./model/IntroModel.js";
import { IntroKeyboardHelpContent } from "./view/IntroKeyboardHelpContent.js";
import { IntroScreenView } from "./view/IntroScreenView.js";

type IntroScreenOptions = ScreenOptions & { tandem: Tandem };

export class IntroScreen extends Screen<IntroModel, IntroScreenView> {
  public constructor(options: IntroScreenOptions) {
    super(
      () => new IntroModel(),
      (model) =>
        new IntroScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<IntroScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: ACPhasorColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new IntroKeyboardHelpContent(),
          homeScreenIcon: createIntroIcon(),
          navigationBarIcon: createIntroIcon(),
        },
        options,
      ),
    );
  }
}
