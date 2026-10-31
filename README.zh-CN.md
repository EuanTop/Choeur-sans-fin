<div align="center">
<h1>灯里 · Inside the Lantern</h1>
<p>南瓜灯里有一个世界，世界里还有一盏灯。</p>
<p><a href="README.md">English</a> · <b>简体中文</b></p>
</div>

@EuanTop 的 Three.js 实时作品。小黄鸭游过嵌在空心南瓜灯里的紫色光厅，32 秒持续后退的镜头进入下一层尺度。

```sh
npm ci
npm run dev
```

打开 `http://127.0.0.1:5176/`，默认 3:4 竖屏。可收起面板提供时间、游动、水纹、灯光、视角调节与 PNG 截图。当前为视觉开发版，尚未加入配乐和视频导出。

```sh
npm test
npm run build
```

`src/lantern/` 按空心南瓜、廊道、材质、水面、角色、灯光与尺度循环拆分。递归变换 `F(x) = 0.2x + (0, 0, -3.6)` 与后退运动共用不动点，循环接点由外层世界接替内层；六层共享几何近似无限空间。

本机 `/__art` API 与面板共用状态，支持精确时间 PNG 任务与渲染诊断。参见[控制接口](docs/control.md)和[致谢](docs/credits.md)。生成媒体与私人资料位于被忽略的 `artifacts/`。
