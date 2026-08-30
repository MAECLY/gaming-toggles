import type {
  RegistryClient,
  XboxSetting
} from "./windows-registry.js";

export type LocalizedStateTitles = {
  readonly disabled: string;
  readonly enabled: string;
};

export interface ToggleActionTarget {
  readonly id: string;
  setState(state: number): Promise<void>;
  setTitle(title: string): Promise<void>;
  showAlert(): Promise<void>;
}

export interface ToggleLogger {
  info(message: string): void;
  error(message: string, error: unknown): void;
}

export class ToggleSettingController {
  readonly #visibleActions = new Map<string, ToggleActionTarget>();
  readonly #registry: RegistryClient;
  readonly #setting: XboxSetting;
  readonly #titles: LocalizedStateTitles;
  readonly #translate: (key: string) => string;
  readonly #logger: ToggleLogger;
  #refreshing = false;

  public constructor(
    registry: RegistryClient,
    setting: XboxSetting,
    titles: LocalizedStateTitles,
    translate: (key: string) => string,
    logger: ToggleLogger
  ) {
    this.#registry = registry;
    this.#setting = setting;
    this.#titles = titles;
    this.#translate = translate;
    this.#logger = logger;
  }

  public async willAppear(action: ToggleActionTarget): Promise<void> {
    this.#visibleActions.set(action.id, action);
    await this.#refreshAction(action);
  }

  public willDisappear(actionId: string): void {
    this.#visibleActions.delete(actionId);
  }

  public async keyDown(action: ToggleActionTarget): Promise<void> {
    try {
      const enabled = await this.#registry.toggle(this.#setting);
      await this.#renderAction(action, enabled);
      await this.refreshAll();
      this.#logger.info(
        `${this.#setting.valueName}=${enabled ? 1 : 0} confirmado por Windows.`
      );
    } catch (error) {
      this.#logger.error(
        `No se pudo alternar ${this.#setting.valueName}.`,
        error
      );
      await action.showAlert();
    }
  }

  public async refreshAll(): Promise<void> {
    if (this.#refreshing || this.#visibleActions.size === 0) {
      return;
    }
    this.#refreshing = true;
    try {
      const enabled = await this.#registry.isEnabled(this.#setting);
      await Promise.all(
        [...this.#visibleActions.values()].map((action) =>
          this.#renderAction(action, enabled)
        )
      );
    } catch (error) {
      this.#logger.error(
        `No se pudo leer ${this.#setting.valueName}.`,
        error
      );
    } finally {
      this.#refreshing = false;
    }
  }

  async #refreshAction(action: ToggleActionTarget): Promise<void> {
    try {
      const enabled = await this.#registry.isEnabled(this.#setting);
      await this.#renderAction(action, enabled);
    } catch (error) {
      this.#logger.error(
        `No se pudo leer ${this.#setting.valueName}.`,
        error
      );
      await action.showAlert();
    }
  }

  async #renderAction(action: ToggleActionTarget, enabled: boolean): Promise<void> {
    await action.setState(enabled ? 1 : 0);
    const titleKey = enabled ? this.#titles.enabled : this.#titles.disabled;
    await action.setTitle(this.#translate(titleKey));
  }
}
