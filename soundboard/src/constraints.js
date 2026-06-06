(function initConstraintHelpers(root) {
  "use strict";

  const VIRTUAL_DEVICE_ID = "virtual-soundboard-mic";

  function valuesForDeviceId(deviceId) {
    if (typeof deviceId === "string") {
      return [deviceId];
    }

    if (!deviceId || typeof deviceId !== "object") {
      return [];
    }

    return [deviceId.exact, deviceId.ideal]
      .flat()
      .filter((value) => typeof value === "string");
  }

  function requestsVirtualMic(audioConstraints) {
    if (!audioConstraints || audioConstraints === true) {
      return false;
    }

    return valuesForDeviceId(audioConstraints.deviceId).includes(
      VIRTUAL_DEVICE_ID
    );
  }

  function withoutVirtualDevice(audioConstraints) {
    if (!audioConstraints || audioConstraints === true) {
      return true;
    }

    const next = { ...audioConstraints };
    delete next.deviceId;
    return next;
  }

  const helpers = {
    VIRTUAL_DEVICE_ID,
    requestsVirtualMic,
    valuesForDeviceId,
    withoutVirtualDevice
  };

  root.SoundboardConstraintHelpers = helpers;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = helpers;
  }
})(typeof globalThis === "undefined" ? this : globalThis);
