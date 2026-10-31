# Local control

The Vite service binds to `127.0.0.1:5176`. The panel and API use the same state.

| Request | Result |
|---|---|
| `GET /__art` | Capabilities and scene duration |
| `GET /__art/schema` | Parameters, limits and defaults |
| `GET /__art/state` | State, revision and renderer acknowledgement |
| `PATCH /__art/state` | Atomic `{expectedRevision, patch}` update |
| `POST /__art/capture` | Exact-time PNG job |
| `GET /__art/jobs` | Current session jobs |
| `GET /__art/jobs/:id` | Status and completed file path |
| `POST /__art/jobs/:id/cancel` | Cancel an unfinished job |
| `GET /__art/diagnostics` | Capture renderer timings, shader errors and household profiles |

Mutations require an `Origin` matching the local Host. Use the current revision; a conflict returns 409. A capture request contains:

```json
{"revision":0,"time":10.3,"width":900,"height":1200,"idempotencyKey":"review-10s"}
```

Poll the returned job ID until `completed` or `failed`. Captures do not pause or seek the live preview. Diagnostics are available after the first capture connects the isolated renderer; they describe its last frame.

Only one capture runs at a time. Request bodies are limited to 64 KiB, dimensions to 64–3840 pixels, pixels to 11,059,200 and session jobs to 100. The existing `artifacts/` destination must be available. No video endpoint is implemented yet.
