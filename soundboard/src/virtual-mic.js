(function installVirtualMicrophone() {
  "use strict";

  if (window.__meetVirtualSoundboardInstalled) {
    return;
  }
  window.__meetVirtualSoundboardInstalled = true;

  const VIRTUAL_DEVICE_ID = "virtual-soundboard-mic";
  const VIRTUAL_DEVICE_LABEL = "Virtual Soundboard Mic";
  const MESSAGE_SOURCE = "meet-virtual-soundboard-extension";
  const {
    requestsVirtualMic,
    withoutVirtualDevice
  } = window.SoundboardConstraintHelpers;
  const mediaDevices = navigator.mediaDevices;

  if (!mediaDevices?.getUserMedia || !mediaDevices?.enumerateDevices) {
    console.warn("[Soundboard] MediaDevices API is unavailable.");
    return;
  }

  const nativeGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
  const nativeEnumerateDevices =
    mediaDevices.enumerateDevices.bind(mediaDevices);

  const state = {
    context: null,
    destination: null,
    micGain: null,
    clipGain: null,
    compressor: null,
    micStream: null,
    micSource: null,
    lastPhysicalAudioConstraints: true,
    clips: [],
    activeSources: new Set(),
    playbacks: new Map(),
    clipButtons: new Map(),
    progressFrame: null,
    statusElement: null,
    clipListElement: null
  };

  function setStatus(message, isError = false) {
    if (!state.statusElement) {
      return;
    }
    state.statusElement.textContent = message;
    state.statusElement.dataset.error = String(isError);
  }

  function ensureAudioGraph() {
    if (state.context) {
      return state.context;
    }

    const AudioContextConstructor =
      window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextConstructor();
    const destination = context.createMediaStreamDestination();
    const micGain = context.createGain();
    const clipGain = context.createGain();
    const compressor = context.createDynamicsCompressor();

    micGain.gain.value = 1;
    clipGain.gain.value = 1;
    compressor.threshold.value = -12;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    micGain.connect(compressor);
    clipGain.connect(compressor);
    compressor.connect(destination);

    state.context = context;
    state.destination = destination;
    state.micGain = micGain;
    state.clipGain = clipGain;
    state.compressor = compressor;
    return context;
  }

  async function ensureMicrophone() {
    const context = ensureAudioGraph();
    await context.resume();

    const liveTrack = state.micStream?.getAudioTracks().find(
      (track) => track.readyState === "live"
    );
    if (liveTrack) {
      return;
    }

    setStatus("Requesting microphone access...");
    const micStream = await nativeGetUserMedia({
      audio: state.lastPhysicalAudioConstraints,
      video: false
    });

    state.micSource?.disconnect();
    state.micStream?.getTracks().forEach((track) => track.stop());
    state.micStream = micStream;
    state.micSource = context.createMediaStreamSource(micStream);
    state.micSource.connect(state.micGain);
    setStatus("Mixer ready");
  }

  async function createVirtualCapture(constraints) {
    await ensureMicrophone();

    const mixedTrack = state.destination.stream.getAudioTracks()[0].clone();
    const tracks = [mixedTrack];

    if (constraints.video) {
      try {
        const videoStream = await nativeGetUserMedia({
          audio: false,
          video: constraints.video
        });
        tracks.push(...videoStream.getVideoTracks());
      } catch (error) {
        mixedTrack.stop();
        throw error;
      }
    }

    setStatus("Virtual microphone active in Meet");
    return new MediaStream(tracks);
  }

  async function patchedGetUserMedia(constraints = {}) {
    if (!requestsVirtualMic(constraints.audio)) {
      if (constraints.audio) {
        state.lastPhysicalAudioConstraints = constraints.audio;
      }
      return nativeGetUserMedia(constraints);
    }

    state.lastPhysicalAudioConstraints = withoutVirtualDevice(
      constraints.audio
    );
    return createVirtualCapture(constraints);
  }

  async function patchedEnumerateDevices() {
    const devices = await nativeEnumerateDevices();
    if (devices.some((device) => device.deviceId === VIRTUAL_DEVICE_ID)) {
      return devices;
    }

    const groupId =
      devices.find((device) => device.kind === "audioinput")?.groupId || "";
    const virtualDevice = {
      deviceId: VIRTUAL_DEVICE_ID,
      groupId,
      kind: "audioinput",
      label: VIRTUAL_DEVICE_LABEL,
      toJSON() {
        return {
          deviceId: this.deviceId,
          groupId: this.groupId,
          kind: this.kind,
          label: this.label
        };
      }
    };

    return [...devices, virtualDevice];
  }

  Object.defineProperty(mediaDevices, "getUserMedia", {
    configurable: true,
    value: patchedGetUserMedia
  });
  Object.defineProperty(mediaDevices, "enumerateDevices", {
    configurable: true,
    value: patchedEnumerateDevices
  });

  async function decodeAndAddClip(name, bytes, source) {
    const context = ensureAudioGraph();
    const buffer = await context.decodeAudioData(bytes);
    state.clips.push({
      id: crypto.randomUUID(),
      name,
      source,
      buffer
    });
  }

  async function addClips(files) {
    for (const file of files) {
      try {
        const bytes = await file.arrayBuffer();
        await decodeAndAddClip(file.name, bytes, "local");
      } catch (error) {
        console.error("[Soundboard] Could not decode clip:", file.name, error);
        setStatus(`Could not load ${file.name}`, true);
      }
    }

    renderClipList();
    if (state.clips.length) {
      setStatus(`${state.clips.length} clip(s) loaded`);
    }
  }

  async function addPackagedClips(clips) {
    let loaded = 0;

    for (const clip of clips) {
      if (state.clips.some((candidate) => candidate.source === clip.path)) {
        continue;
      }

      try {
        const response = await fetch(clip.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        await decodeAndAddClip(
          clip.name,
          await response.arrayBuffer(),
          clip.path
        );
        loaded += 1;
      } catch (error) {
        console.error(
          "[Soundboard] Could not load packaged clip:",
          clip.path,
          error
        );
      }
    }

    renderClipList();
    if (loaded) {
      setStatus(`${state.clips.length} clip(s) loaded`);
    } else if (!state.clips.length) {
      setStatus("No audio files found in the clips folder");
    }
  }

  async function playClip(clip) {
    try {
      const context = ensureAudioGraph();
      await context.resume();
      const source = context.createBufferSource();
      const startTime = context.currentTime;
      source.buffer = clip.buffer;
      source.connect(state.clipGain);
      source.addEventListener("ended", () => {
        state.activeSources.delete(source);
        state.playbacks.delete(source);
        source.disconnect();
        updatePlaybackProgress();
      });
      state.activeSources.add(source);
      state.playbacks.set(source, {
        clip,
        startTime,
        duration: clip.buffer.duration
      });
      source.start();
      updatePlaybackProgress();
      setStatus(`Playing ${clip.name}`);
    } catch (error) {
      console.error("[Soundboard] Playback failed:", error);
      setStatus("Clip playback failed", true);
    }
  }

  function stopAllClips() {
    state.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // The source may already have ended.
      }
    });
    state.activeSources.clear();
    state.playbacks.clear();
    updatePlaybackProgress();
    setStatus("Playback stopped");
  }

  function updatePlaybackProgress() {
    if (state.progressFrame !== null) {
      cancelAnimationFrame(state.progressFrame);
      state.progressFrame = null;
    }

    const context = state.context;
    const progressByClip = new Map();

    if (context) {
      state.playbacks.forEach((playback) => {
        const elapsed = Math.max(0, context.currentTime - playback.startTime);
        const progress = Math.min(1, elapsed / playback.duration);
        const current = progressByClip.get(playback.clip.id);

        if (!current || playback.startTime > current.startTime) {
          progressByClip.set(playback.clip.id, {
            progress,
            startTime: playback.startTime
          });
        }
      });
    }

    state.clipButtons.forEach((button, clipId) => {
      const playback = progressByClip.get(clipId);
      const progress = playback?.progress || 0;
      button.style.setProperty("--playback-progress", `${progress * 100}%`);
      button.classList.toggle("playing", Boolean(playback));
      button.setAttribute("aria-pressed", String(Boolean(playback)));
    });

    if (state.playbacks.size) {
      state.progressFrame = requestAnimationFrame(updatePlaybackProgress);
    }
  }

  function renderClipList() {
    const list = state.clipListElement;
    if (!list) {
      return;
    }
    list.replaceChildren();
    state.clipButtons.clear();

    if (!state.clips.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Load audio files to create soundboard buttons.";
      list.append(empty);
      return;
    }

    state.clips.forEach((clip) => {
      const card = document.createElement("div");
      card.className = "clip";

      const play = document.createElement("button");
      play.type = "button";
      play.className = "clip-name";
      play.textContent = clip.name;
      play.title = `Play ${clip.name}`;
      play.setAttribute("aria-pressed", "false");
      play.addEventListener("click", () => playClip(clip));
      state.clipButtons.set(clip.id, play);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.textContent = "X";
      remove.title = `Remove ${clip.name}`;
      remove.setAttribute("aria-label", `Remove ${clip.name}`);
      remove.addEventListener("click", () => {
        state.clips = state.clips.filter((candidate) => candidate !== clip);
        renderClipList();
      });

      card.append(play, remove);
      list.append(card);
    });

    updatePlaybackProgress();
  }

  function createSlider(labelText, initialValue, onInput) {
    const label = document.createElement("label");
    label.className = "gain";

    const text = document.createElement("span");
    text.textContent = labelText;

    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "2";
    input.step = "0.05";
    input.value = String(initialValue);
    input.addEventListener("input", () => onInput(Number(input.value)));

    label.append(text, input);
    return label;
  }

  function mountPanel() {
    if (!document.documentElement || document.getElementById("soundboard-host")) {
      return;
    }

    const host = document.createElement("div");
    host.id = "soundboard-host";
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      .launcher, .panel, button, input { font: 13px Arial, sans-serif; }
      .launcher {
        position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
        border: 0; border-radius: 999px; padding: 11px 16px;
        color: #fff; background: #1a73e8; box-shadow: 0 3px 12px #0005;
        cursor: pointer;
      }
      .panel {
        position: fixed; right: 16px; bottom: 64px; z-index: 2147483647;
        width: min(760px, max(520px, 33.333vw));
        max-width: calc(100vw - 32px);
        height: min(760px, calc(100vh - 96px));
        overflow: auto; box-sizing: border-box; padding: 14px;
        color: #202124; background: #fff; border: 1px solid #dadce0;
        border-radius: 12px; box-shadow: 0 6px 24px #0005;
      }
      .panel[hidden] { display: none; }
      .header { display: flex; align-items: center; justify-content: space-between; }
      h2 { margin: 0; font: 600 16px Arial, sans-serif; }
      .status { margin: 8px 0 12px; color: #5f6368; font-size: 12px; }
      .status[data-error="true"] { color: #b3261e; }
      .controls { display: flex; gap: 8px; margin-bottom: 12px; }
      button {
        border: 1px solid #dadce0; border-radius: 7px; padding: 7px 10px;
        color: #202124; background: #fff; cursor: pointer;
      }
      button:hover { background: #f1f3f4; }
      .primary { color: #fff; background: #1a73e8; border-color: #1a73e8; }
      .primary:hover { background: #1557b0; }
      .gains { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
      .gain { display: grid; grid-template-columns: 78px 1fr; align-items: center; margin: 7px 0; }
      .gain input { width: 100%; }
      .clips { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
      .clip { position: relative; min-width: 0; }
      .clip-name {
        --playback-progress: 0%;
        display: block; width: 100%; min-height: 86px; padding: 12px 24px 12px 12px;
        overflow: hidden; text-align: left; overflow-wrap: anywhere;
        color: #174ea6;
        background:
          linear-gradient(
            to right,
            #8ab4f8 0,
            #8ab4f8 var(--playback-progress),
            #e8f0fe var(--playback-progress),
            #e8f0fe 100%
          );
        border-color: #aecbfa;
      }
      .clip-name:hover {
        background:
          linear-gradient(
            to right,
            #669df6 0,
            #669df6 var(--playback-progress),
            #d2e3fc var(--playback-progress),
            #d2e3fc 100%
          );
      }
      .clip-name.playing {
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px #1a73e833;
      }
      .remove {
        position: absolute; top: 5px; right: 5px; width: 22px; height: 22px;
        padding: 0; color: #b3261e; background: #fff; border-radius: 999px;
        font-size: 10px; line-height: 20px;
      }
      .empty { grid-column: 1 / -1; padding: 32px 8px; color: #5f6368; text-align: center; }
      .hint { margin: 12px 0 0; color: #5f6368; font-size: 11px; line-height: 1.4; }
      input[type="file"] { display: none; }
      @media (max-width: 700px) {
        .panel { width: calc(100vw - 32px); }
        .gains { grid-template-columns: 1fr; gap: 0; }
      }
    `;

    const launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "launcher";
    launcher.textContent = "Soundboard";

    const panel = document.createElement("section");
    panel.className = "panel";
    panel.hidden = true;

    const header = document.createElement("div");
    header.className = "header";
    const title = document.createElement("h2");
    title.textContent = VIRTUAL_DEVICE_LABEL;
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    header.append(title, close);

    const status = document.createElement("div");
    status.className = "status";
    status.textContent = "Load clips, then select the virtual mic in Meet.";
    state.statusElement = status;

    const controls = document.createElement("div");
    controls.className = "controls";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "audio/*";
    fileInput.multiple = true;
    const load = document.createElement("button");
    load.type = "button";
    load.className = "primary";
    load.textContent = "Load clips";
    const stop = document.createElement("button");
    stop.type = "button";
    stop.textContent = "Stop all";
    controls.append(fileInput, load, stop);

    const gains = document.createElement("div");
    gains.className = "gains";
    gains.append(
      createSlider("Microphone", 1, (value) => {
        ensureAudioGraph().resume();
        state.micGain.gain.value = value;
      }),
      createSlider("Clips", 1, (value) => {
        ensureAudioGraph().resume();
        state.clipGain.gain.value = value;
      })
    );

    const clipList = document.createElement("div");
    clipList.className = "clips";
    state.clipListElement = clipList;

    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent =
      'In Meet, open Settings > Audio and choose "Virtual Soundboard Mic". Refresh Meet after installing or reloading the extension.';

    load.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      addClips([...fileInput.files]);
      fileInput.value = "";
    });
    stop.addEventListener("click", stopAllClips);
    launcher.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
    });
    close.addEventListener("click", () => {
      panel.hidden = true;
    });

    panel.append(header, status, controls, gains, clipList, hint);
    shadow.append(style, panel, launcher);
    document.documentElement.append(host);
    renderClipList();
  }

  if (document.documentElement) {
    mountPanel();
  } else {
    document.addEventListener("readystatechange", mountPanel, { once: true });
  }

  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      event.data?.source !== MESSAGE_SOURCE ||
      !["packaged-clips", "packaged-clips-error"].includes(event.data?.type)
    ) {
      return;
    }

    if (event.data.type === "packaged-clips-error") {
      console.error("[Soundboard] Packaged clip scan failed:", event.data.message);
      setStatus(`Clip folder scan failed: ${event.data.message}`, true);
      return;
    }

    if (!Array.isArray(event.data.clips)) {
      return;
    }
    addPackagedClips(event.data.clips);
  });

  window.postMessage({
    source: MESSAGE_SOURCE,
    type: "request-packaged-clips"
  }, "*");

  console.info("[Soundboard] Virtual microphone shim installed.");
})();
