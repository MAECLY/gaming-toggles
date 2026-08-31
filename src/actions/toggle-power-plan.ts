import type {
  DidReceiveSettingsEvent,
  KeyDownEvent,
  PropertyInspectorDidAppearEvent,
  SendToPluginEvent,
  WillAppearEvent,
  WillDisappearEvent
} from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";

import {
  PowerPlanService,
  type PowerPlanSelection,
  type PowerPlanState
} from "../services/power-plan-service.js";

export type PowerPlanActionSettings = {
  planA?: string;
  planB?: string;
};

type PowerPlanMessage = { command?: string };

@action({ UUID: "com.maecly.gamingtoggles.power-plan" })
export class TogglePowerPlanAction extends SingletonAction<PowerPlanActionSettings> {
  readonly #service: PowerPlanService;
  readonly #visible = new Map<string, WillAppearEvent<PowerPlanActionSettings>["action"]>();
  readonly #refreshTimer: NodeJS.Timeout;
  #refreshing = false;

  public constructor(service: PowerPlanService) {
    super();
    this.#service = service;
    this.#refreshTimer = setInterval(() => void this.#refreshAll(), 5000);
    this.#refreshTimer.unref();
  }

  public override async onWillAppear(
    ev: WillAppearEvent<PowerPlanActionSettings>
  ): Promise<void> {
    if (!ev.action.isKey()) return;
    this.#visible.set(ev.action.id, ev.action);
    await this.#initializeAndRender(ev.action, ev.payload.settings);
  }

  public override onWillDisappear(
    ev: WillDisappearEvent<PowerPlanActionSettings>
  ): void {
    this.#visible.delete(ev.action.id);
  }

  public override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<PowerPlanActionSettings>
  ): Promise<void> {
    if (ev.action.isKey()) {
      await this.#render(ev.action, ev.payload.settings);
    }
  }

  public override async onKeyDown(
    ev: KeyDownEvent<PowerPlanActionSettings>
  ): Promise<void> {
    if (!ev.action.isKey()) return;
    try {
      const selection = this.#selection(ev.payload.settings);
      if (!selection) {
        throw new Error("Two different power plans must be configured.");
      }
      const snapshot = await this.#service.toggle(selection);
      await this.#renderState(ev.action, snapshot.state);
      this.#log("info", `Power plan ${snapshot.activeGuid} confirmed by Windows.`);
      await this.#refreshAll();
    } catch (error) {
      this.#log("error", "Unable to switch the Windows power plan.", error);
      await ev.action.showAlert();
    }
  }

  public override async onPropertyInspectorDidAppear(
    ev: PropertyInspectorDidAppearEvent<PowerPlanActionSettings>
  ): Promise<void> {
    await this.#sendPlans();
  }

  public override async onSendToPlugin(
    ev: SendToPluginEvent<PowerPlanMessage, PowerPlanActionSettings>
  ): Promise<void> {
    if (ev.payload.command === "getPowerPlans") {
      await this.#sendPlans();
    } else if (ev.payload.command === "settingsChanged" && ev.action.isKey()) {
      await this.#render(ev.action, await ev.action.getSettings());
    }
  }

  async #initializeAndRender(
    target: WillAppearEvent<PowerPlanActionSettings>["action"],
    settings: PowerPlanActionSettings
  ): Promise<void> {
    try {
      if (!this.#selection(settings)) {
        const plans = await this.#service.listPlans();
        const active = await this.#service.getActivePlanGuid();
        const other = plans.find((plan) => plan.guid !== active);
        if (other) {
          settings = { planA: active, planB: other.guid };
          await target.setSettings(settings);
        }
      }
      if (target.isKey()) await this.#render(target, settings);
    } catch (error) {
      this.#log("error", "Unable to initialize the power-plan action.", error);
      if (target.isKey()) {
        await target.setState(2);
        await target.setTitle(streamDeck.i18n.translate("Power Plan\nSETUP"));
        await target.showAlert();
      }
    }
  }

  async #render(
    target: WillAppearEvent<PowerPlanActionSettings>["action"],
    settings: PowerPlanActionSettings
  ): Promise<void> {
    if (!target.isKey()) return;
    const selection = this.#selection(settings);
    if (!selection) {
      await target.setState(2);
      await target.setTitle(streamDeck.i18n.translate("Power Plan\nSETUP"));
      return;
    }
    try {
      const snapshot = await this.#service.getSnapshot(selection);
      await this.#renderState(target, snapshot.state);
    } catch (error) {
      this.#log("error", "Unable to read the active Windows power plan.", error);
      await target.setState(2);
      await target.setTitle(streamDeck.i18n.translate("Power Plan\nOTHER"));
    }
  }

  async #renderState(
    target: WillAppearEvent<PowerPlanActionSettings>["action"],
    state: PowerPlanState
  ): Promise<void> {
    if (!target.isKey()) return;
    const index = state === "A" ? 0 : state === "B" ? 1 : 2;
    await target.setState(index);
    await target.setTitle(streamDeck.i18n.translate(`Power Plan\n${state}`));
  }

  async #sendPlans(): Promise<void> {
    try {
      const [plans, activeGuid] = await Promise.all([
        this.#service.listPlans(),
        this.#service.getActivePlanGuid()
      ]);
      await streamDeck.ui.sendToPropertyInspector({
        type: "powerPlans",
        plans: plans.map((plan) => ({ ...plan })),
        activeGuid
      });
    } catch (error) {
      this.#log("error", "Unable to list Windows power plans.", error);
      await streamDeck.ui.sendToPropertyInspector({
        type: "powerPlans",
        plans: [],
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async #refreshAll(): Promise<void> {
    if (this.#refreshing || this.#visible.size === 0) return;
    this.#refreshing = true;
    try {
      await Promise.all([...this.#visible.values()].map(async (target) => {
        try {
          await this.#render(target, await target.getSettings());
        } catch (error) {
          this.#log("error", "Unable to refresh a visible power-plan action.", error);
        }
      }));
    } finally {
      this.#refreshing = false;
    }
  }

  #selection(settings: PowerPlanActionSettings): PowerPlanSelection | undefined {
    return settings.planA && settings.planB && settings.planA !== settings.planB
      ? { planA: settings.planA, planB: settings.planB }
      : undefined;
  }

  #log(level: "info" | "error", message: string, error?: unknown): void {
    if (level === "info") streamDeck.logger.info(message);
    else streamDeck.logger.error(message, error);
  }
}
