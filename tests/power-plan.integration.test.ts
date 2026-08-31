import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PowerPlanService } from "../src/services/power-plan-service.ts";

describe("PowerPlanService Windows integration", { skip: process.platform !== "win32" }, () => {
  it("reads installed and active plans without changing system state", async () => {
    const service = new PowerPlanService();
    const before = await service.getActivePlanGuid();
    const plans = await service.listPlans();
    const after = await service.getActivePlanGuid();

    assert.ok(plans.length > 0);
    assert.ok(plans.some((plan) => plan.guid === before));
    assert.equal(after, before);
  });
});
