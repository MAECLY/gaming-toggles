import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PowerPlanError,
  PowerPlanService,
  normalizePowerPlanGuid,
  normalizePowerPlanSelection,
  parseActivePowerPlanGuid,
  parsePowerPlanList,
  resolvePowerPlanState,
  type PowerCfgCommandRunner
} from "../src/services/power-plan-service.ts";

const BALANCED = "381b4222-f694-41f0-9685-ff5bb260df2e";
const HIGH_PERFORMANCE = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c";
const POWER_SAVER = "a1841308-3541-4fab-bc81-f71556f20b4a";

const ENGLISH_LIST = `Existing Power Schemes (* Active)\r
-----------------------------------\r
Power Scheme GUID: ${BALANCED}  (Balanced) *\r
Power Scheme GUID: ${HIGH_PERFORMANCE}  (High performance)\r
Power Scheme GUID: ${POWER_SAVER}  (Power saver)\r
`;

const SPANISH_LIST = `Esquemas de energía existentes (* activos)\r
------------------------------------------------\r
GUID de esquema de energía: ${BALANCED.toUpperCase()}  (Equilibrado)\r
GUID de esquema de energía: ${HIGH_PERFORMANCE}  (Alto rendimiento (juegos)) *\r
`;

function createMutableRunner(initial = BALANCED): {
  calls: string[][];
  getActive: () => string;
  runner: PowerCfgCommandRunner;
} {
  let active = initial;
  const calls: string[][] = [];
  const names = new Map([
    [BALANCED, "Balanced"],
    [HIGH_PERFORMANCE, "High performance"],
    [POWER_SAVER, "Power saver"]
  ]);
  const runner: PowerCfgCommandRunner = async (args) => {
    calls.push([...args]);
    if (args[0] === "/list") {
      return [...names]
        .map(([guid, name]) =>
          `Power Scheme GUID: ${guid} (${name})${guid === active ? " *" : ""}`
        )
        .join("\r\n");
    }
    if (args[0] === "/getactivescheme") {
      return `Power Scheme GUID: ${active} (${names.get(active) ?? "Custom"})`;
    }
    if (args[0] === "/setactive") {
      active = args[1];
      return "";
    }
    throw new Error(`Unexpected command: ${args.join(" ")}`);
  };
  return { calls, getActive: () => active, runner };
}

describe("powercfg parsers", () => {
  it("parses English plan output and its active marker", () => {
    assert.deepEqual(parsePowerPlanList(ENGLISH_LIST), [
      { guid: BALANCED, name: "Balanced", active: true },
      { guid: HIGH_PERFORMANCE, name: "High performance", active: false },
      { guid: POWER_SAVER, name: "Power saver", active: false }
    ]);
  });

  it("parses Spanish labels, casing, and names containing parentheses", () => {
    assert.deepEqual(parsePowerPlanList(SPANISH_LIST), [
      { guid: BALANCED, name: "Equilibrado", active: false },
      {
        guid: HIGH_PERFORMANCE,
        name: "Alto rendimiento (juegos)",
        active: true
      }
    ]);
  });

  it("extracts the active GUID without depending on translated text", () => {
    assert.equal(
      parseActivePowerPlanGuid(
        `GUID de esquema de energía: {${HIGH_PERFORMANCE.toUpperCase()}} (Alto rendimiento)`
      ),
      HIGH_PERFORMANCE
    );
  });

  it("deduplicates plans and preserves a discovered name and active marker", () => {
    const plans = parsePowerPlanList([
      `Power Scheme GUID: ${BALANCED}`,
      `Power Scheme GUID: ${BALANCED} (Balanced) *`
    ].join("\n"));

    assert.deepEqual(plans, [{ guid: BALANCED, name: "Balanced", active: true }]);
  });

  it("rejects output without recognizable schemes", () => {
    assert.throws(
      () => parsePowerPlanList("No hay planes disponibles"),
      (error: unknown) =>
        error instanceof PowerPlanError && error.code === "PARSE_FAILED"
    );
    assert.throws(
      () => parseActivePowerPlanGuid("Plan desconocido"),
      (error: unknown) =>
        error instanceof PowerPlanError && error.code === "PARSE_FAILED"
    );
  });
});

describe("power plan validation and state", () => {
  it("normalizes braces, whitespace, and casing", () => {
    assert.equal(
      normalizePowerPlanGuid(`  {${BALANCED.toUpperCase()}}  `),
      BALANCED
    );
  });

  it("rejects command-like and malformed GUID input", () => {
    for (const value of ["", `${BALANCED} & whoami`, "/delete", "not-a-guid"]) {
      assert.throws(
        () => normalizePowerPlanGuid(value),
        (error: unknown) =>
          error instanceof PowerPlanError && error.code === "INVALID_GUID"
      );
    }
  });

  it("requires two different A/B plans", () => {
    assert.throws(
      () => normalizePowerPlanSelection({ planA: BALANCED, planB: BALANCED }),
      (error: unknown) =>
        error instanceof PowerPlanError && error.code === "INVALID_SELECTION"
    );
  });

  it("reports A, B, and OTHER deterministically", () => {
    const selection = { planA: BALANCED, planB: HIGH_PERFORMANCE };
    assert.equal(resolvePowerPlanState(BALANCED, selection), "A");
    assert.equal(resolvePowerPlanState(HIGH_PERFORMANCE, selection), "B");
    assert.equal(resolvePowerPlanState(POWER_SAVER, selection), "OTHER");
  });
});

describe("PowerPlanService", () => {
  it("lists schemes and builds an A/B snapshot", async () => {
    const harness = createMutableRunner(HIGH_PERFORMANCE);
    const service = new PowerPlanService(harness.runner);

    const snapshot = await service.getSnapshot({
      planA: BALANCED,
      planB: HIGH_PERFORMANCE
    });

    assert.equal(snapshot.activeGuid, HIGH_PERFORMANCE);
    assert.equal(snapshot.state, "B");
    assert.deepEqual(harness.calls, [["/list"], ["/getactivescheme"]]);
  });

  it("activates only an installed, validated GUID and confirms it", async () => {
    const harness = createMutableRunner();
    const service = new PowerPlanService(harness.runner);

    assert.equal(await service.activatePlan(HIGH_PERFORMANCE), HIGH_PERFORMANCE);
    assert.equal(harness.getActive(), HIGH_PERFORMANCE);
    assert.deepEqual(harness.calls, [
      ["/list"],
      ["/setactive", HIGH_PERFORMANCE],
      ["/getactivescheme"]
    ]);
  });

  it("never calls powercfg for an invalid GUID", async () => {
    const harness = createMutableRunner();
    const service = new PowerPlanService(harness.runner);

    assert.throws(() => service.activatePlan("x & powercfg /delete"));
    assert.deepEqual(harness.calls, []);
  });

  it("does not activate a valid GUID that is not installed", async () => {
    const harness = createMutableRunner();
    const service = new PowerPlanService(harness.runner);
    const missing = "11111111-2222-4333-8444-555555555555";

    await assert.rejects(
      service.activatePlan(missing),
      (error: unknown) =>
        error instanceof PowerPlanError && error.code === "PLAN_NOT_INSTALLED"
    );
    assert.deepEqual(harness.calls, [["/list"]]);
  });

  it("rejects a change that Windows does not confirm", async () => {
    const harness = createMutableRunner();
    const runner: PowerCfgCommandRunner = async (args) => {
      if (args[0] === "/setactive") {
        return "";
      }
      return harness.runner(args);
    };
    const service = new PowerPlanService(runner);

    await assert.rejects(
      service.activatePlan(HIGH_PERFORMANCE),
      (error: unknown) =>
        error instanceof PowerPlanError &&
        error.code === "ACTIVATION_NOT_CONFIRMED"
    );
  });

  it("toggles A to B, B to A, and OTHER to A", async () => {
    const selection = { planA: BALANCED, planB: HIGH_PERFORMANCE };
    const fromA = createMutableRunner(BALANCED);
    const fromB = createMutableRunner(HIGH_PERFORMANCE);
    const fromOther = createMutableRunner(POWER_SAVER);

    assert.equal((await new PowerPlanService(fromA.runner).toggle(selection)).state, "B");
    assert.equal((await new PowerPlanService(fromB.runner).toggle(selection)).state, "A");
    assert.equal((await new PowerPlanService(fromOther.runner).toggle(selection)).state, "A");
  });

  it("activates an explicit slot and marks the returned plan active", async () => {
    const harness = createMutableRunner();
    const service = new PowerPlanService(harness.runner);

    const snapshot = await service.activateSlot("B", {
      planA: BALANCED,
      planB: HIGH_PERFORMANCE
    });

    assert.equal(snapshot.state, "B");
    assert.equal(snapshot.activeGuid, HIGH_PERFORMANCE);
    assert.equal(snapshot.plans.find((plan) => plan.active)?.guid, HIGH_PERFORMANCE);
  });

  it("serializes simultaneous toggles so both presses are honored", async () => {
    const harness = createMutableRunner();
    const service = new PowerPlanService(harness.runner);
    const selection = { planA: BALANCED, planB: HIGH_PERFORMANCE };

    const snapshots = await Promise.all([
      service.toggle(selection),
      service.toggle(selection)
    ]);

    assert.deepEqual(snapshots.map((snapshot) => snapshot.state), ["B", "A"]);
    assert.equal(harness.getActive(), BALANCED);
  });

  it("propagates permission errors without attempting another mutation", async () => {
    const denied = Object.assign(new Error("Access is denied"), { code: 5 });
    const calls: string[][] = [];
    const service = new PowerPlanService(async (args) => {
      calls.push([...args]);
      throw denied;
    });

    await assert.rejects(service.activatePlan(BALANCED), denied);
    assert.deepEqual(calls, [["/list"]]);
  });
});
