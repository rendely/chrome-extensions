# Meet Virtual Soundboard Microphone

A dependency-free Chrome extension that mixes a real microphone with local
audio clips and exposes the mixed `MediaStreamTrack` to Google Meet.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this repository.
4. Open or refresh `https://meet.google.com/`.

## Use

1. Open the **Soundboard** panel in the lower-right corner of Meet.
2. Load one or more local audio files, or add files to the repository's
   `clips/` directory.
3. In Meet, open **Settings > Audio**.
4. Select **Virtual Soundboard Mic** as the microphone.
5. Use the clip buttons while in the call. The sliders control microphone and
   clip gain before the mix reaches Meet.
6. Turn on **Stadium announcer** to lower the voice by one octave and apply
   announcer EQ, arena-style reverb, and echo to the microphone. Soundboard
   clips are not affected.

Files selected from the panel are held in memory and must be loaded again after
refreshing the page.

## Packaged clips folder

Audio files placed under `clips/` are loaded automatically. Nested directories
are supported.

After adding or removing files:

1. Run `npm run sync-clips`.
2. Open `chrome://extensions`.
3. Reload **Meet Virtual Soundboard Microphone**.
4. Refresh the Meet tab.

Chrome extensions cannot reliably enumerate or watch arbitrary files in their
unpacked source directory. The sync command generates `clips/index.json`, which
the extension loads directly.

## How it works

The extension injects at `document_start` in Chrome's `MAIN` JavaScript world.
It wraps the page-visible `MediaDevices.enumerateDevices()` and
`MediaDevices.getUserMedia()` methods. When Meet requests the synthetic device,
the extension opens the real microphone with the native API and returns a clone
of a `MediaStreamAudioDestinationNode` output track.

The mixer and controls live in the Meet page rather than an extension popup, so
closing extension UI cannot tear down the `AudioContext`.

## Limitations

- This is a Meet-specific JavaScript shim, not an operating-system audio device.
- It depends on Meet obtaining media through the page's patched
  `navigator.mediaDevices` object and may break when Meet changes its internals.
- Other tabs and native applications cannot select this microphone.
- Meet may cache its device list. Refresh the Meet tab after loading or
  reloading the extension.
- Files loaded through the panel are decoded locally and are not persisted.

## Development

```sh
npm test
npm run check
```
