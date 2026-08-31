import { action } from "@elgato/streamdeck";

import { PointerPrecisionService } from "../services/pointer-precision.js";
import type { BooleanFeatureClient } from "../toggle-feature-controller.js";
import { ToggleBooleanFeatureAction } from "./toggle-boolean-feature.js";

class PointerPrecisionFeature implements BooleanFeatureClient {
  public readonly id = "pointer-precision";
  readonly #service: PointerPrecisionService;

  public constructor(service: PointerPrecisionService) {
    this.#service = service;
  }

  public async isEnabled(): Promise<boolean> {
    return (await this.#service.getState()).enabled;
  }

  public async toggle(): Promise<boolean> {
    return (await this.#service.toggle()).enabled;
  }
}

@action({ UUID: "com.maecly.gamingtoggles.pointer-precision" })
export class TogglePointerPrecisionAction extends ToggleBooleanFeatureAction {
  public constructor(service: PointerPrecisionService) {
    super(new PointerPrecisionFeature(service), {
      disabled: "Pointer Precision\nOFF",
      enabled: "Pointer Precision\nON"
    });
  }
}
