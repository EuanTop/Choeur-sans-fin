# Local control

The Vite service binds to `127.0.0.1:5176`. The panel and API use the same state. `palette` accepts `Deep violet` (default) or `Classic violet`; `analog` toggles the deterministic grain/dust finish (default `true`). The finish covers both the artwork and typography and uses the same looping scene clock.

| Request | Result |
|---|---|
| `GET /__art` | Capabilities and scene duration |
| `GET /__art/schema` | Parameters, limits and defaults |
| `GET /__art/state` | State, revision and renderer acknowledgement |
| `PATCH /__art/state` | Atomic `{expectedRevision, patch}` update |
| `POST /__art/capture` | Exact-time PNG job |
| `GET /__art/music/audio` | Latest completed WAV for the current score version |
| `GET /__art/music/score` | Score version, harmony and shared gesture/call times |
| `POST /__art/music/render` | Original stereo WAV job (`revision`, `version`, `idempotencyKey`) |
| `POST /__art/exports` | Frame-accurate video job (`revision`, `profile`, `idempotencyKey`) |
| `GET /__art/jobs` | Current session jobs |
| `GET /__art/jobs/:id` | Status and completed file path |
| `POST /__art/jobs/:id/cancel` | Cancel an unfinished job |
| `GET /__art/diagnostics` | Capture renderer timings, shader errors and recursive scale levels |

Mutations require an `Origin` matching the local Host. Use the current revision; a conflict returns 409. A capture request contains:

```json
{"revision":0,"time":10.3,"width":900,"height":1200,"idempotencyKey":"review-10s"}
```

Poll the returned job ID until `completed` or `failed`. Captures do not pause or seek the live preview. Diagnostics are available after the first capture connects the isolated renderer; they describe its last frame.

Only one capture, music render or video export runs at a time. Request bodies are limited to 64 KiB, dimensions to 64–3840 pixels, pixels to 11,059,200 and session jobs to 100. The existing `artifacts/` destination must be available. Video profiles are `portrait-4k` (2880×3840) and `portrait-hd` (1440×1920), both 3:4, 30fps and 32 seconds. The exporter requires 8 GiB free space, caps the master at 12 GiB and stops after 60 minutes. Output is versioned under `artifacts/exports/`; completed exports are retained.

Music playback needs one user gesture to enable browser audio. The API may prepare WAV without speaker playback. Music and animation share the 32-second clock; the settled middle lap retains convolution and delay tails. Exported video is completely decoded, with sampled master RGB frames and full PCM compared to their sources before publication. Use `npm run export` to start and monitor the same job as the panel. Completed WAV files are kept in ignored `artifacts/audio/`.
