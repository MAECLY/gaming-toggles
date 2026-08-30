import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ToggleSettingController,
  type ToggleActionTarget,
  type ToggleLogger
} from "../src/toggle-setting-controller.ts";
import {
  GAME_MODE_SETTING,
  type RegistryClient,
  type XboxSetting
} from "../src/windows-registry.ts";

function createAction(id = "action-1"): ToggleActionTarget & {
  alerts: number;
  states: number[];
  titles: string[];
} {
  return {
    id,
    alerts: 0,
    states: [],
    titles: [],
    async setState(state) { this.states.push(state); },
    async setTitle(title) { this.titles.push(title); },
    async showAlert() { this.alerts += 1; }
  };
}

function createHarness(initial = true): {
  controller: ToggleSettingController;
  enabled: () => boolean;
  info: string[];
  errors: string[];
} {
  let enabled = initial;
  const registry: RegistryClient = {
    async isEnabled() { return enabled; },
    async setEnabled(_setting: XboxSetting, value: boolean) { enabled = value; },
    async toggle() { enabled = !enabled; return enabled; }
  };
  const info: string[] = [];
  const errors: string[] = [];
  const logger: ToggleLogger = {
    info(message) { info.push(message); },
    error(message) { errors.push(message); }
  };
  return {
    controller: new ToggleSettingController(
      registry,
      GAME_MODE_SETTING,
      { disabled: "OFF_KEY", enabled: "ON_KEY" },
      (key) => `traducido:${key}`,
      logger
    ),
    enabled: () => enabled,
    info,
    errors
  };
}

describe("ToggleSettingController", () => {
  it("refleja el estado de Windows al aparecer y usa la traducción", async () => {
    const { controller } = createHarness(true);
    const action = createAction();

    await controller.willAppear(action);

    assert.deepEqual(action.states, [1]);
    assert.deepEqual(action.titles, ["traducido:ON_KEY"]);
    assert.equal(action.alerts, 0);
  });

  it("alterna funcionalmente, actualiza las teclas visibles y registra éxito", async () => {
    const { controller, enabled, info } = createHarness(true);
    const first = createAction("first");
    const second = createAction("second");
    await controller.willAppear(first);
    await controller.willAppear(second);

    await controller.keyDown(first);

    assert.equal(enabled(), false);
    assert.equal(first.states.at(-1), 0);
    assert.equal(second.states.at(-1), 0);
    assert.match(info.at(-1) ?? "", /AutoGameModeEnabled=0 confirmado/);
  });

  it("deja de refrescar una tecla cuando desaparece", async () => {
    const { controller } = createHarness(true);
    const action = createAction();
    await controller.willAppear(action);
    controller.willDisappear(action.id);

    await controller.refreshAll();

    assert.equal(action.states.length, 1);
  });

  it("muestra alerta y registra el error cuando falla el cambio", async () => {
    const failure = new Error("registro bloqueado");
    const registry: RegistryClient = {
      async isEnabled() { return true; },
      async setEnabled() { throw failure; },
      async toggle() { throw failure; }
    };
    const errors: string[] = [];
    const controller = new ToggleSettingController(
      registry,
      GAME_MODE_SETTING,
      { disabled: "OFF", enabled: "ON" },
      (key) => key,
      { info() {}, error(message) { errors.push(message); } }
    );
    const action = createAction();

    await controller.keyDown(action);

    assert.equal(action.alerts, 1);
    assert.match(errors[0], /No se pudo alternar AutoGameModeEnabled/);
  });

  it("muestra alerta y registra el error cuando falla la lectura inicial", async () => {
    const registry: RegistryClient = {
      async isEnabled() { throw new Error("lectura fallida"); },
      async setEnabled() {},
      async toggle() { return false; }
    };
    const errors: string[] = [];
    const controller = new ToggleSettingController(
      registry,
      GAME_MODE_SETTING,
      { disabled: "OFF", enabled: "ON" },
      (key) => key,
      { info() {}, error(message) { errors.push(message); } }
    );
    const action = createAction();

    await controller.willAppear(action);

    assert.equal(action.alerts, 1);
    assert.match(errors[0], /No se pudo leer AutoGameModeEnabled/);
  });
});
