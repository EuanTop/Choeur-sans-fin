<div align="center">
<h1>露出鸭脚 · Duck Feet</h1>
<p>戴着天鹅头套的小黄鸭，走过一条门窗相望的蜿蜒街巷。</p>
<p><a href="README.md">English</a> · <b>简体中文</b></p>
</div>

@EuanTop 的 Three.js 实时艺术作品。当前为 32 秒视觉开发版，尚未包含配乐和视频导出。

```sh
npm ci
npm run dev
```

打开 `http://127.0.0.1:5176/`。右侧面板可调画幅、时间、动作、风和灯光，并保存 PNG；默认 3:4 竖屏。

曲桥与循环街区共用场景时钟。每户分别设置配色、住户动作、烛光节奏与关窗时序。住户复用系列原始天鹅模型；小黄鸭及头套由程序化几何构建。

```sh
npm test
npm run build
```

`src/` 按角色、建筑、水面、桥面几何、渲染和时序拆分。本机 `/__art` API 与面板共用状态，支持精确时间 PNG 任务与渲染诊断；写入要求同源与版本匹配。参见[控制接口](docs/control.md)和[致谢](docs/credits.md)。

生成媒体和私人工作资料放在被 Git 忽略的 `artifacts/` 中。
