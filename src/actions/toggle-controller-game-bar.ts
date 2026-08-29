import { action } from "@elgato/streamdeck";

import { ToggleXboxSettingAction } from "./toggle-xbox-setting.js";
import {
  CONTROLLER_GAME_BAR_SETTING,
  type RegistryClient
} from "../windows-registry.js";

@action({ UUID: "com.miguelangelstream.windows-xbox-settings.controller-game-bar" })
export class ToggleControllerGameBarAction extends ToggleXboxSettingAction {
  public constructor(registry: RegistryClient) {
    super(registry, CONTROLLER_GAME_BAR_SETTING);
  }
}
