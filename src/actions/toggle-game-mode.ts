import { action } from "@elgato/streamdeck";

import { ToggleXboxSettingAction } from "./toggle-xbox-setting.js";
import {
  GAME_MODE_SETTING,
  type RegistryClient
} from "../windows-registry.js";

@action({ UUID: "com.miguelangelstream.windows-xbox-settings.game-mode" })
export class ToggleGameModeAction extends ToggleXboxSettingAction {
  public constructor(registry: RegistryClient) {
    super(registry, GAME_MODE_SETTING);
  }
}
