<div align="center">
<h1>Duck Feet</h1>
<p>A yellow duck in a swan hood. A winding street of watching windows.</p>
<p><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>
</div>

A real-time Three.js artwork by @EuanTop. The 32-second scene is in visual development; music and video export are not included yet.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5176/`. The right panel controls framing, time, gestures, breeze and lighting, and saves PNG images. Default framing is 3:4 portrait.

The curved bridge and modular town share one scene clock. Households have individual palettes, resident gestures, candle rhythms and shutter timings. Residents reuse the series' original swan model; the duck and its hood are procedural geometry.

```sh
npm test
npm run build
```

`src/` separates characters, architecture, water, bridge geometry, rendering and timing. The local `/__art` API shares panel state and supports exact-time PNG jobs and renderer diagnostics. Mutations require a matching Origin and revision. See [control API](docs/control.md) and [credits](docs/credits.md).

Generated media and private working material stay in the ignored `artifacts/` directory.
