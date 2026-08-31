import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ToggleFeatureController,
  type BooleanFeatureClient,
  type FeatureActionTarget,
  type FeatureLogger
} from "../src/toggle-feature-controller.ts";

function harness(initial = false): {
  action: FeatureActionTarget & { states: number[]; titles: string[]; alerts: number };
  controller: ToggleFeatureController;
  feature: BooleanFeatureClient;
  logs: string[];
} {
  let enabled = initial;
  const logs: string[] = [];
  const feature: BooleanFeatureClient = {
    id: "test-feature",
    async isEnabled() { return enabled; },
    async toggle() { enabled = !enabled; return enabled; }
  };
  const action = {
    id: "key-1",
    states: [] as number[],
    titles: [] as string[],
    alerts: 0,
    async setState(state: number) { this.states.push(state); },
    async setTitle(title: string) { this.titles.push(title); },
    async showAlert() { this.alerts += 1; }
  };
  const logger: FeatureLogger = {
    info(message) { logs.push(`info:${message}`); },
    error(message) { logs.push(`error:${message}`); }
  };
  return {
    action,
    feature,
    logs,
    controller: new ToggleFeatureController(
      feature,
      { disabled: "OFF", enabled: "ON" },
      (key) => `translated:${key}`,
      logger
    )
  };
}

describe("ToggleFeatureController", () => {
  it("renders the real state when a key appears and after a toggle", async () => {
    const { action, controller, logs } = harness(false);
    await controller.willAppear(action);
    await controller.keyDown(action);
    assert.deepEqual(action.states, [0, 1, 1]);
    assert.deepEqual(action.titles, ["translated:OFF", "translated:ON", "translated:ON"]);
    assert.match(logs.at(-1) ?? "", /confirmed by Windows/);
  });

  it("stops refreshing a key after it disappears", async () => {
    const { action, controller } = harness(true);
    await controller.willAppear(action);
    controller.willDisappear(action.id);
    await controller.refreshAll();
    assert.equal(action.states.length, 1);
  });

  it("shows an alert and logs failures without rendering a fake state", async () => {
    const { action, logs } = harness();
    const controller = new ToggleFeatureController(
      { id: "broken", async isEnabled() { return false; }, async toggle() { throw new Error("denied"); } },
      { disabled: "OFF", enabled: "ON" },
      (key) => key,
      { info(message) { logs.push(message); }, error(message) { logs.push(message); } }
    );
    await controller.keyDown(action);
    assert.equal(action.alerts, 1);
    assert.deepEqual(action.states, []);
    assert.match(logs.at(-1) ?? "", /Unable to toggle/);
  });

  it("renders an explicit unavailable state for feature-gated Labs actions", async () => {
    const { action, logs } = harness();
    const controller = new ToggleFeatureController(
      { id: "labs", async isEnabled() { throw new Error("unsupported"); }, async toggle() { throw new Error("unsupported"); } },
      { disabled: "OFF", enabled: "ON", unavailable: "N/A" },
      (key) => `translated:${key}`,
      { info(message) { logs.push(message); }, error(message) { logs.push(message); } }
    );
    await controller.willAppear(action);
    assert.deepEqual(action.states, [2]);
    assert.deepEqual(action.titles, ["translated:N/A"]);
    assert.equal(action.alerts, 1);
  });
});
