/**
 * PowerScreenView.ts
 *
 * Framework view for the Power-in-AC-circuits screen. Placeholder content only.
 */
import { Node, Rectangle, Text } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import ACPhasorColors from "../../ACPhasorColors.js";
import { SCREEN_VIEW_MARGIN } from "../../ACPhasorConstants.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/SimButtonOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { PowerModel } from "../model/PowerModel.js";
import { PowerScreenSummaryContent } from "./PowerScreenSummaryContent.js";

export class PowerScreenView extends ScreenView {
  public constructor(model: PowerModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new PowerScreenSummaryContent(model),
      ...options,
    });

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: ACPhasorColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    const screenName = StringManager.getInstance().getScreenNames().powerStringProperty;
    const placeholderText = new Text(screenName, {
      font: "bold 36px sans-serif",
      fill: ACPhasorColors.textColorProperty,
      center: this.layoutBounds.center,
    });
    this.addChild(placeholderText);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    this.addChild(
      new Node({
        pdomOrder: [resetAllButton],
      }),
    );
  }

  public reset(): void {
    // TODO: reset view-side Power state
  }

  public override step(_dt: number): void {
    // TODO: Power view animation
  }
}
