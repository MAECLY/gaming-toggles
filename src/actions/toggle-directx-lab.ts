import { action } from "@elgato/streamdeck";

import {
  AUTO_HDR_SETTING,
  WINDOWED_OPTIMIZATIONS_SETTING,
  type DirectXGamingSetting,
  type DirectXGamingSettingsClientContract
} from "../services/directx-gaming-settings.js";
import type { BooleanFeatureClient } from "../toggle-feature-controller.js";
import { ToggleBooleanFeatureAction } from "./toggle-boolean-feature.js";

class DirectXLabFeature implements BooleanFeatureClient {
  public readonly id: string;
  readonly #client: DirectXGamingSettingsClientContract;
  readonly #setting: DirectXGamingSetting;

  public constructor(
    client: DirectXGamingSettingsClientContract,
    setting: DirectXGamingSetting
  ) {
    this.#client = client;
    this.#setting = setting;
    this.id = `labs-${setting.valueName}`;
  }

  public isEnabled(): Promise<boolean> {
    return this.#client.isEnabled(this.#setting);
  }

  public toggle(): Promise<boolean> {
    return this.#client.toggle(this.#setting);
  }
}

@action({ UUID: "com.maecly.gamingtoggles.auto-hdr" })
export class ToggleAutoHdrAction extends ToggleBooleanFeatureAction {
  public constructor(client: DirectXGamingSettingsClientContract) {
    super(new DirectXLabFeature(client, AUTO_HDR_SETTING), {
      disabled: "Auto HDR LABS\nOFF",
      enabled: "Auto HDR LABS\nON",
      unavailable: "Auto HDR LABS\nUNAVAILABLE"
    });
  }
}

@action({ UUID: "com.maecly.gamingtoggles.windowed-optimizations" })
export class ToggleWindowedOptimizationsAction extends ToggleBooleanFeatureAction {
  public constructor(client: DirectXGamingSettingsClientContract) {
    super(new DirectXLabFeature(client, WINDOWED_OPTIMIZATIONS_SETTING), {
      disabled: "Windowed LABS\nOFF",
      enabled: "Windowed LABS\nON",
      unavailable: "Windowed LABS\nUNAVAILABLE"
    });
  }
}
