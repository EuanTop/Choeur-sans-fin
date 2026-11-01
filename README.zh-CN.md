<div align="center">
<h1>无尽合唱 · Endless Chorus</h1>
<p>南瓜灯里有一个世界，世界里还有一盏灯。</p>
<p><a href="README.md">English</a> · <b>简体中文</b></p>
</div>

@EuanTop 的 Three.js 实时作品。镜头跟随一只小黄鸭，嵌在空心南瓜里的紫色光厅不断延伸；弧形门廊中的天鹅组成合唱队。完整尺度循环为 32 秒。

```sh
npm ci
npm run dev
```

打开 `http://127.0.0.1:5176/`，默认 3:4 竖屏、深紫配色与动态模拟颗粒；面板可切换旧配色或关闭颗粒。可收起面板提供时间、游动、水纹、灯光、视角调节与 PNG 截图。面板内可开启原创合唱与管风琴配乐；侧头、抖翅与音乐共用提示点。面板和 `npm run export` 使用同一逐帧 4K 导出任务，生成 HEVC/AAC MP4 与 FFV1 RGB/PCM 无损母版。

```sh
npm test
npm run build
```

`src/lantern/` 按空心南瓜、廊道、材质、水面、角色、灯光与尺度循环拆分。递归变换 `F(x) = 0.2x + (0, 0, -3.6)` 与后退运动共用不动点，循环接点由外层世界接替内层；六层共享几何近似无限空间。

本机 `/__art` API 与面板共用状态，支持精确时间 PNG、视频导出、取消任务与渲染诊断。参见[控制接口](docs/control.md)和[致谢](docs/credits.md)。生成媒体与私人资料位于被忽略的 `artifacts/`。
