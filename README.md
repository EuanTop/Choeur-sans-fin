<div align="center">
<h1>Endless Chorus</h1>
<p>A world inside a pumpkin. Another lantern inside that world.</p>
<p><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>
</div>

A real-time Three.js artwork by @EuanTop. A yellow duck swims through purple light halls nested inside hollow pumpkin lanterns. One duck stays with the camera as the continuous 32-second pullback moves from one scale to the next; swans sing from the curved arcades.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5176/`. Default framing is 3:4 portrait. The collapsible panel controls time, swimming, water movement, light and viewpoint, with PNG capture. Enable music in the panel to hear the original synthesized choir and organ score. Side glances and wing gestures share its cue times. The panel and `npm run export` share a frame-accurate 4K export job, producing HEVC/AAC MP4 and an FFV1 RGB/PCM lossless master.

```sh
npm test
npm run build
```

`src/lantern/` contains the hollow shell, arcades, materials, water, character, lighting and scale cycle. The recursive transform `F(x) = 0.2x + (0, 0, -3.6)` shares a fixed point with the pullback, allowing each parent world to replace its child at the loop boundary. Six shared-geometry levels approximate the endless scene.

The local `/__art` API shares panel state and supports exact-time PNG jobs, video export, cancellation and renderer diagnostics. See [control API](docs/control.md) and [credits](docs/credits.md). Generated media and private material stay in ignored `artifacts/`.
