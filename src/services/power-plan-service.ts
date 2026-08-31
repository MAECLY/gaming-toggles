import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const POWER_PLAN_GUID_PATTERN =
  /^[{]?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[}]?$/i;
const POWER_PLAN_GUID_IN_TEXT =
  /[{]?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[}]?/i;

export type PowerPlanSlot = "A" | "B";
export type PowerPlanState = PowerPlanSlot | "OTHER";

export type PowerPlan = {
  readonly guid: string;
  readonly name: string;
  readonly active: boolean;
};

export type PowerPlanSelection = {
  readonly planA: string;
  readonly planB: string;
};

export type PowerPlanSnapshot = {
  readonly plans: readonly PowerPlan[];
  readonly activeGuid: string;
  readonly state: PowerPlanState;
};

export type PowerCfgCommandRunner = (args: readonly string[]) => Promise<string>;

export type PowerPlanErrorCode =
  | "INVALID_GUID"
  | "INVALID_SELECTION"
  | "PARSE_FAILED"
  | "PLAN_NOT_INSTALLED"
  | "ACTIVATION_NOT_CONFIRMED";

export class PowerPlanError extends Error {
  public readonly code: PowerPlanErrorCode;

  public constructor(code: PowerPlanErrorCode, message: string) {
    super(message);
    this.name = "PowerPlanError";
    this.code = code;
  }
}

/**
 * Normalizes a Windows power-scheme GUID without ever forwarding arbitrary input
 * to powercfg.exe. Braces and letter casing are accepted for interoperability.
 */
export function normalizePowerPlanGuid(value: string): string {
  const match = POWER_PLAN_GUID_PATTERN.exec(value.trim());
  if (!match) {
    throw new PowerPlanError(
      "INVALID_GUID",
      `El identificador del plan de energía no es un GUID válido: ${value}`
    );
  }
  return match[1].toLowerCase();
}

/** Parses `powercfg.exe /list` without relying on localized labels. */
export function parsePowerPlanList(output: string): readonly PowerPlan[] {
  const plans = new Map<string, PowerPlan>();

  for (const rawLine of output.split(/\r?\n/u)) {
    const guidMatch = POWER_PLAN_GUID_IN_TEXT.exec(rawLine);
    if (!guidMatch) {
      continue;
    }

    const guid = normalizePowerPlanGuid(guidMatch[0]);
    const suffix = rawLine.slice((guidMatch.index ?? 0) + guidMatch[0].length).trim();
    const active = /\*\s*$/u.test(suffix);
    const withoutMarker = suffix.replace(/\*\s*$/u, "").trim();
    const nameMatch = /^\((.*)\)$/u.exec(withoutMarker);
    const name = nameMatch?.[1].trim() || guid;
    const previous = plans.get(guid);

    plans.set(guid, {
      guid,
      name: previous && previous.name !== previous.guid ? previous.name : name,
      active: (previous?.active ?? false) || active
    });
  }

  if (plans.size === 0) {
    throw new PowerPlanError(
      "PARSE_FAILED",
      "Windows no devolvió ningún plan de energía reconocible."
    );
  }

  return [...plans.values()];
}

/** Parses `powercfg.exe /getactivescheme` independently of the OS language. */
export function parseActivePowerPlanGuid(output: string): string {
  const match = POWER_PLAN_GUID_IN_TEXT.exec(output);
  if (!match) {
    throw new PowerPlanError(
      "PARSE_FAILED",
      "Windows no devolvió un plan de energía activo reconocible."
    );
  }
  return normalizePowerPlanGuid(match[0]);
}

export function normalizePowerPlanSelection(
  selection: PowerPlanSelection
): PowerPlanSelection {
  const planA = normalizePowerPlanGuid(selection.planA);
  const planB = normalizePowerPlanGuid(selection.planB);
  if (planA === planB) {
    throw new PowerPlanError(
      "INVALID_SELECTION",
      "Los planes de energía A y B deben ser diferentes."
    );
  }
  return { planA, planB };
}

export function resolvePowerPlanState(
  activeGuid: string,
  selection: PowerPlanSelection
): PowerPlanState {
  const active = normalizePowerPlanGuid(activeGuid);
  const normalized = normalizePowerPlanSelection(selection);
  if (active === normalized.planA) {
    return "A";
  }
  if (active === normalized.planB) {
    return "B";
  }
  return "OTHER";
}

export function createPowerCfgRunner(
  systemRoot = process.env.SystemRoot ?? String.raw`C:\Windows`
): PowerCfgCommandRunner {
  const powerCfg = `${systemRoot}\\System32\\powercfg.exe`;
  return async (args) => {
    const { stdout } = await execFileAsync(powerCfg, [...args], {
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: true
    });
    return stdout;
  };
}

/**
 * Read and switch existing per-machine power schemes. The service deliberately
 * exposes no API for creating, deleting, duplicating, or editing a scheme.
 */
export class PowerPlanService {
  readonly #runCommand: PowerCfgCommandRunner;
  #mutationQueue: Promise<void> = Promise.resolve();

  public constructor(runCommand: PowerCfgCommandRunner = createPowerCfgRunner()) {
    this.#runCommand = runCommand;
  }

  public async listPlans(): Promise<readonly PowerPlan[]> {
    return parsePowerPlanList(await this.#runCommand(["/list"]));
  }

  public async getActivePlanGuid(): Promise<string> {
    return parseActivePowerPlanGuid(
      await this.#runCommand(["/getactivescheme"])
    );
  }

  public async getSnapshot(
    selection: PowerPlanSelection
  ): Promise<PowerPlanSnapshot> {
    const normalized = normalizePowerPlanSelection(selection);
    const [plans, activeGuid] = await Promise.all([
      this.listPlans(),
      this.getActivePlanGuid()
    ]);
    this.#assertInstalled(plans, normalized.planA);
    this.#assertInstalled(plans, normalized.planB);
    return {
      plans,
      activeGuid,
      state: resolvePowerPlanState(activeGuid, normalized)
    };
  }

  public activatePlan(guid: string): Promise<string> {
    const normalized = normalizePowerPlanGuid(guid);
    return this.#enqueueMutation(async () => {
      const plans = await this.listPlans();
      this.#assertInstalled(plans, normalized);
      return this.#activateAndConfirm(normalized);
    });
  }

  public activateSlot(
    slot: PowerPlanSlot,
    selection: PowerPlanSelection
  ): Promise<PowerPlanSnapshot> {
    const normalized = normalizePowerPlanSelection(selection);
    const target = slot === "A" ? normalized.planA : normalized.planB;
    return this.#enqueueMutation(async () => {
      const plans = await this.listPlans();
      this.#assertInstalled(plans, normalized.planA);
      this.#assertInstalled(plans, normalized.planB);
      const activeGuid = await this.#activateAndConfirm(target);
      return {
        plans: plans.map((plan) => ({
          ...plan,
          active: plan.guid === activeGuid
        })),
        activeGuid,
        state: slot
      };
    });
  }

  /** Switches A → B and B/OTHER → A, returning the confirmed Windows state. */
  public toggle(selection: PowerPlanSelection): Promise<PowerPlanSnapshot> {
    const normalized = normalizePowerPlanSelection(selection);
    return this.#enqueueMutation(async () => {
      const plans = await this.listPlans();
      this.#assertInstalled(plans, normalized.planA);
      this.#assertInstalled(plans, normalized.planB);
      const current = await this.getActivePlanGuid();
      const target = current === normalized.planA
        ? normalized.planB
        : normalized.planA;
      const activeGuid = await this.#activateAndConfirm(target);
      return {
        plans: plans.map((plan) => ({
          ...plan,
          active: plan.guid === activeGuid
        })),
        activeGuid,
        state: resolvePowerPlanState(activeGuid, normalized)
      };
    });
  }

  async #activateAndConfirm(guid: string): Promise<string> {
    await this.#runCommand(["/setactive", guid]);
    const activeGuid = await this.getActivePlanGuid();
    if (activeGuid !== guid) {
      throw new PowerPlanError(
        "ACTIVATION_NOT_CONFIRMED",
        `Windows no confirmó la activación del plan de energía ${guid}.`
      );
    }
    return activeGuid;
  }

  #assertInstalled(plans: readonly PowerPlan[], guid: string): void {
    if (!plans.some((plan) => plan.guid === guid)) {
      throw new PowerPlanError(
        "PLAN_NOT_INSTALLED",
        `El plan de energía ${guid} no está instalado.`
      );
    }
  }

  #enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.#mutationQueue
      .catch(() => undefined)
      .then(operation);
    this.#mutationQueue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }
}
