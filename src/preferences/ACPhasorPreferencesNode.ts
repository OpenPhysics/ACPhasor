/**
 * ACPhasorPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound
 * to ACPhasorPreferencesModel Properties (whose initial values come from
 * acPhasorQueryParameters).
 */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import ACPhasorColors from "../ACPhasorColors.js";
import ACPhasorNamespace from "../ACPhasorNamespace.js";
import { StringManager } from "../i18n/StringManager.js";
import type { ACPhasorPreferencesModel } from "./ACPhasorPreferencesModel.js";

export class ACPhasorPreferencesNode extends VBox {
  public constructor(preferencesModel: ACPhasorPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    // The Preferences dialog is always white, so use the dark "light control surface"
    // colors (readable on white in both default and projector profiles), not textColorProperty
    // (which is near-white in default mode and would be invisible on the white dialog).
    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: ACPhasorColors.controlSurfaceTextColorProperty,
    });

    const exampleToggleCheckbox = new Checkbox(
      preferencesModel.exampleToggleProperty,
      new Text(prefStrings.exampleToggleStringProperty, {
        font: new PhetFont(14),
        fill: ACPhasorColors.controlSurfaceTextColorProperty,
      }),
      {
        checkboxColor: ACPhasorColors.controlSurfaceTextColorProperty,
        checkboxColorBackground: ACPhasorColors.controlSurfaceColorProperty,
        spacing: 8,
        ...(tandem && { tandem: tandem.createTandem("exampleToggleCheckbox") }),
      },
    );

    super({
      align: "left",
      spacing: 12,
      children: [header, exampleToggleCheckbox],
    });
  }
}

ACPhasorNamespace.register("ACPhasorPreferencesNode", ACPhasorPreferencesNode);
