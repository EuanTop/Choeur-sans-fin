<div align="center">
<h1>Duck Feet</h1>
<p>A duck in a swan paper lantern, on a Halloween canal bridge.</p>
<p><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>
</div>

An interactive Three.js scene by @EuanTop. Visual work in progress; story, music and the final video are under review.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5176/`. The collapsible panel controls framing, time, gestures, light and translucency. PNG capture is available; video export is not implemented in this version.

```sh
npm test
npm run build
```

`src/` contains the town, characters, story clock and dual-pass fluid reveal. The local `/__art` API shares the panel state and supports exact-time PNG jobs. API mutations require a matching Origin and state revision.

Generated media and private working material belong in the ignored `artifacts/` directory. See [credits](docs/credits.md) for asset provenance.
