import type {
  KeyAction,
  KeyDownEvent,
  WillAppearEvent,
  WillDisappearEvent
} from "@elgato/streamdeck";
import { SingletonAction } from "@elgato/streamdeck";

import type { RegistryClient, XboxSetting } from "../windows-registry.js";

type EmptySettings = Record<string, never>;

export abstract class ToggleXboxSettingAction extends SingletonAction<EmptySettings> {
  readonly #visibleActions = new Map<string, KeyAction>();
  readonly #registry: RegistryClient;
  readonly #setting: XboxSetting;
  readonly #refreshTimer: NodeJS.Timeout;
  #refreshing = false;

  protected constructor(registry: RegistryClient, setting: XboxSetting) {
    super();
    this.#registry = registry;
    this.#setting = setting;
    this.#refreshTimer = setInterval(() => void this.#refreshAll(), 2500);
    this.#refreshTimer.unref();
  }

  public override async onWillAppear(ev: WillAppearEvent<EmptySettings>): Promise<void> {
    if (!ev.action.isKey()) {
      return;
    }
    this.#visibleActions.set(ev.action.id, ev.action);
    await this.#refreshAction(ev.action);
  }

  public override onWillDisappear(ev: WillDisappearEvent<EmptySettings>): void {
    this.#visibleActions.delete(ev.action.id);
  }

  public override async onKeyDown(ev: KeyDownEvent<EmptySettings>): Promise<void> {
    try {
      const enabled = await this.#registry.toggle(this.#setting);
      await ev.action.setState(enabled ? 1 : 0);
      await this.#refreshAll();
    } catch (error) {
      console.error(`No se pudo alternar ${this.#setting.valueName}:`, error);
      await ev.action.showAlert();
    }
  }

  async #refreshAll(): Promise<void> {
    if (this.#refreshing || this.#visibleActions.size === 0) {
      return;
    }
    this.#refreshing = true;
    try {
      const enabled = await this.#registry.isEnabled(this.#setting);
      await Promise.all(
        [...this.#visibleActions.values()].map((action) =>
          action.setState(enabled ? 1 : 0)
        )
      );
    } catch (error) {
      console.error(`No se pudo leer ${this.#setting.valueName}:`, error);
    } finally {
      this.#refreshing = false;
    }
  }

  async #refreshAction(action: KeyAction): Promise<void> {
    try {
      const enabled = await this.#registry.isEnabled(this.#setting);
      await action.setState(enabled ? 1 : 0);
    } catch (error) {
      console.error(`No se pudo leer ${this.#setting.valueName}:`, error);
      await action.showAlert();
    }
  }
}
