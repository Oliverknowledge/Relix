// Standalone unit test for the pure delivery readiness checker. Bundled with
// esbuild (which resolves the "@/" alias from tsconfig, like coralos:verify) and
// run under node. Kept out of tests/ so `anchor test` is untouched.
import assert from "node:assert/strict";
import {
  checkDeliveryReadiness,
  readinessAttestationMessage,
  type DeliveryReadinessInput
} from "@/app/lib/delivery-readiness";
import type { SpecialistDelivery } from "@/app/lib/specialist-agents";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

function delivery(specialistId: string): SpecialistDelivery {
  return {
    channel: "X launch thread",
    specialistId,
    report: "Launch plan ready.",
    sections: [
      {
        id: "thread",
        title: "Launch thread",
        blocks: [
          { id: "t1", kind: "tweet", label: "Tweet 1", text: "We shipped." }
        ]
      }
    ],
    successMetric: "Measured against your goal: test goal",
    targetAudience: "Test audience",
    timing: "Starts now"
  };
}

function baseInput(overrides: Partial<DeliveryReadinessInput> = {}): DeliveryReadinessInput {
  return {
    awardedBid: { id: "bid-1", specialistId: "tournament" },
    delivery: delivery("tournament"),
    jobContext: { jobId: "job-1", goal: "Get 500 waitlist signups." },
    escrowFunded: true,
    coordinationMode: "coralos",
    coralSessionId: "sess-1",
    coralThreadId: "thread-1",
    ...overrides
  };
}

test("all checks pass on a valid CoralOS-coordinated delivery", () => {
  const result = checkDeliveryReadiness(baseInput());
  assert.equal(result.ready, true);
  assert.equal(result.checks.length, 6);
  assert.ok(result.checks.every((check) => check.passed));
  assert.equal(result.source, "growth-employee-readiness-check");
});

test("specialist mismatch fails and blocks readiness", () => {
  const result = checkDeliveryReadiness(
    baseInput({ delivery: delivery("community") })
  );
  assert.equal(result.ready, false);
  const check = result.checks.find((c) => c.id === "specialist-match");
  assert.equal(check?.passed, false);
});

test("empty delivery fails deliverables and launch-thread checks", () => {
  const empty: SpecialistDelivery = {
    channel: "",
    specialistId: "tournament",
    report: "",
    sections: [],
    successMetric: "",
    targetAudience: "",
    timing: ""
  };
  const result = checkDeliveryReadiness(baseInput({ delivery: empty }));
  assert.equal(result.ready, false);
  assert.equal(
    result.checks.find((c) => c.id === "deliverables-present")?.passed,
    false
  );
  assert.equal(
    result.checks.find((c) => c.id === "launch-thread-present")?.passed,
    false
  );
});

test("unfunded escrow fails the escrow-funded confirmation", () => {
  const result = checkDeliveryReadiness(baseInput({ escrowFunded: false }));
  assert.equal(result.ready, false);
  assert.equal(
    result.checks.find((c) => c.id === "escrow-funded")?.passed,
    false
  );
});

test("fallback run passes id-linkage with a note, not a failure", () => {
  const result = checkDeliveryReadiness(
    baseInput({
      coordinationMode: "local-fallback",
      coralSessionId: undefined,
      coralThreadId: undefined
    })
  );
  const linkage = result.checks.find((c) => c.id === "id-linkage");
  assert.equal(linkage?.passed, true);
  assert.match(linkage?.note ?? "", /local fallback/i);
  // Everything else still valid -> overall ready.
  assert.equal(result.ready, true);
});

test("attestation message is deterministic and reflects the verdict", () => {
  const result = checkDeliveryReadiness(baseInput());
  const message = readinessAttestationMessage(result);
  assert.equal(message, readinessAttestationMessage(result));
  assert.match(message, /jobReady=true/);
  assert.match(message, /awardedBidId=bid-1/);
  assert.match(message, /checks=6\/6/);
});

console.log(`\n${passed} passed`);
