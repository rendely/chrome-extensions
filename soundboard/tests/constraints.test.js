const test = require("node:test");
const assert = require("node:assert/strict");

const {
  VIRTUAL_DEVICE_ID,
  requestsVirtualMic,
  withoutVirtualDevice
} = require("../src/constraints.js");

test("recognizes direct virtual device constraints", () => {
  assert.equal(
    requestsVirtualMic({ deviceId: VIRTUAL_DEVICE_ID }),
    true
  );
});

test("recognizes exact and ideal virtual device constraints", () => {
  assert.equal(
    requestsVirtualMic({ deviceId: { exact: VIRTUAL_DEVICE_ID } }),
    true
  );
  assert.equal(
    requestsVirtualMic({ deviceId: { ideal: [VIRTUAL_DEVICE_ID] } }),
    true
  );
});

test("does not intercept normal microphone requests", () => {
  assert.equal(requestsVirtualMic(true), false);
  assert.equal(requestsVirtualMic({ deviceId: "default" }), false);
  assert.equal(requestsVirtualMic({ echoCancellation: true }), false);
});

test("removes the synthetic device before opening the real microphone", () => {
  assert.deepEqual(
    withoutVirtualDevice({
      deviceId: { exact: VIRTUAL_DEVICE_ID },
      echoCancellation: false
    }),
    { echoCancellation: false }
  );
});
