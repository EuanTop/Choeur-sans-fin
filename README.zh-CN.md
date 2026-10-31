<div align="center">
<h1>露出鸭脚 · Duck Feet</h1>
<p>一只穿着天鹅纸灯的小黄鸭，一座万圣节运河小桥。</p>
<p><a href="README.md">English</a> · <b>简体中文</b></p>
</div>

@EuanTop 的 Three.js 交互作品。目前处于视觉迭代阶段，剧情、配乐和最终成片尚未定稿。

```sh
npm ci
npm run dev
```

打开 `http://127.0.0.1:5176/`。右侧面板可调画幅、时间、动作、灯光和纸灯透视，并保存 PNG；本版尚未实现视频导出。

```sh
npm test
npm run build
```

`src/` 按场景、角色、剧情时钟和双通道流体透视拆分。本机 `/__art` API 与面板共用状态，支持精确时间 PNG 任务；写入要求同源与版本匹配。

生成媒体和私人工作资料放在被 Git 忽略的 `artifacts/`。素材来源见[致谢](docs/credits.md)。
