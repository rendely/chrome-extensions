# Packaged soundboard clips

Drop audio files in this directory, then run:

```sh
npm run sync-clips
```

Reload the unpacked extension at `chrome://extensions` and refresh the Google
Meet tab.

Nested directories are supported. Recognized extensions are:

- `.aac`
- `.flac`
- `.m4a`
- `.mp3`
- `.mp4`
- `.oga`
- `.ogg`
- `.opus`
- `.wav`
- `.webm`

Whether a specific file decodes depends on the codecs supported by Chrome.
