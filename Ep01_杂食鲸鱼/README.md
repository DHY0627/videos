# 视频名称：Ep01_杂食鲸鱼

第一期：账号自我介绍。定位是「讲解我自己写的代码项目」。

---

## 成片

| 项 | 值 |
| --- | --- |
| 下载 | [Ep01_1080p60.mp4](https://github.com/DHY0627/videos/releases/download/ep01/Ep01_1080p60.mp4)（10.9 MB） |
| 版本页 | [Releases · ep01](https://github.com/DHY0627/videos/releases/tag/ep01) |

成片不进 Git 仓库：它是产物，不是源码，而且每次改一句台词都会让仓库膨胀十几 MB。
本目录只放「能重建这条片子的代码」，素材与成片另行获取。

## 基本信息

| 项目 | 值 |
| --- | --- |
| 成片时长 | 120.0 s（2 分钟） |
| 分辨率 | 1920 × 1080 |
| 帧率 | 60 fps |
| 总帧数 | 7200 帧（帧对齐校验通过，120.0 × 60 = 7200） |
| 画面比例 | 16:9，devicePixelRatio = 1 |
| 字幕 | 34 条硬字幕，另有 `subtitles/subtitles.json` 独立文件 |
| 场景数 | 7（片头 1 + 正文 5 + 公用结尾 1） |
| 背景 | 纯黑 `#000000` |

时长由 `js/timeline.js` 与 `window.VIDEO.duration` 共同声明，四处一致
（`script.md` 分镜表、`index.html` 的 `data-cf-duration`、`js/timeline.js`、运行时 `window.VIDEO.duration`）。

---

## 观看方式

直接双击 `index.html` 即可在浏览器中播放（无需服务器、无需构建）。

| 操作 | 作用 |
| --- | --- |
| 打开页面 | 自动从 0 秒开始播放，播完自动循环 |
| 空格 | 暂停 / 继续 |
| R | 从片头重播 |
| 点击画面 | 暂停 / 继续 |
| `index.html?t=60` | 从第 60 秒开始播放 |
| `index.html?once=1` | 只播一次，不循环 |

页面同时实现逐帧渲染契约 `window.VIDEO`，供合成软件外部驱动：

```js
window.VIDEO = {
  duration: 120,
  fps: 60,
  totalFrames: 7200,
  ready: Promise,       // 字体与初始化完成
  seek(time),           // 纯函数，可乱序调用，幂等
  play(from), pause(), restart(), isPlaying()
}
```

检测到宿主注入 `window.__cf`（合成软件的虚拟时钟）时**不自动播放**，
由宿主逐帧调用 `seek(t)` 驱动，避免两套时间源互相干扰。

---

## 内容结构

| 段落 | 场景 | 时间 | 时长 | 内容 |
| --- | --- | --- | --- | --- |
| 片头 | intro | 0.0 – 6.0 | 6.0 s | 台号、账号名、一句话定位 |
| 01 | who | 6.0 – 34.0 | 28.0 s | 我是谁：账号定位、我和 AI 的分工 |
| 02 | do | 34.0 – 57.0 | 23.0 s | 这个账号干什么：拆开讲 / 保证能跑 / 把坑讲透 |
| 03 | dont | 57.0 – 77.5 | 20.5 s | 这个账号不干什么：六条界限 |
| 04 | how | 77.5 – 97.5 | 20.0 s | 一期视频是怎么来的：问题 → 资料 → 动手 → 记录 |
| 05 | welcome | 97.5 – 111.0 | 13.5 s | 欢迎来观看 |
| 结尾 | outro | 111.0 – 120.0 | 9.0 s | 公用结尾动画 |

全片 34 条字幕，单句 0.95 – 4.11 s，字幕起止与旁白语音起止一致。
各场景逐句时间表见 `script.md`。

---

## 公用结尾组件

结尾动画独立成可复用组件，其他视频可直接引用：

```
resource/outro/
  outro.js           母版（自包含样式，宿主只需引一个 js）
  outro-preview.html 独立预览页，双击可看

Ep01_杂食鲸鱼/js/
  outro.js           本期使用的副本
```

**为什么每期要放一份副本**：合成软件 chromaframe 以 HTML 所在目录
（`Ep01_杂食鲸鱼/`）作为本地站点根，并且用路径二次校验阻止 `..` 逃逸。
所以页面里写 `../resource/outro/outro.js` 在它那里取不到（浏览器双击打开却能取到），
表现为结尾场景整段空白且不报错。因此每期把母版复制一份到自己的 `js/` 目录。

改完母版后同步副本并校验一致：

```powershell
Copy-Item "resource\outro\outro.js" "Ep01_杂食鲸鱼\js\outro.js" -Force
(Get-FileHash "resource\outro\outro.js").Hash -eq (Get-FileHash "Ep01_杂食鲸鱼\js\outro.js").Hash
```

用法：

```html
<script src="js/outro.js"></script>
<script>
  var inst = window.OUTRO.mount(document.querySelector('.scene-outro'));
  // 在逐帧回调里驱动：
  window.OUTRO.render(inst, time, startTime, duration);
</script>
```

组件对外暴露：

```js
window.OUTRO = {
  duration: 9.0,
  account: '杂食鲸鱼',
  model: 'DeepSeek V4.1 Flash 1017',
  closing: '谢谢观看',
  mount(root),                  // 挂载并注入样式，返回实例
  render(inst, t, s, d)         // 逐帧渲染
}
```

元素时刻（相对场景起点）：账号名 0.5 s 起自左淡入、乘号 1.05 s 起缩放、
模型名 1.35 s 起自右淡入、分隔线 1.9 s 起横向展开、结语 2.35 s 起上浮淡入，
最后 1.0 s 整体淡出。组件背景透明，沿用宿主画面底色（本片为纯黑）。

预览页 `resource/outro/outro-preview.html` 同样支持空格、R、`?t=`、`?once=1`。

---

## 音频清单

背景音乐与旁白已接入，音效等待素材。

| 文件名 | 放置位置 | 用途 | 时长 | 状态 |
| --- | --- | --- | --- | --- |
| `bgm_01.mp3` | `resource/audio/bgm/` | 全片背景音乐 | 取 0 – 120 s | **已接入** |
| `voice_01.wav` | `resource/audio/voice/` | 全片旁白（34 句拼接） | 120.0 s | **已生成** |
| `voice_01.wav` | `resource/audio/voice/` | 旁白主干（34 句拼接） | 120.0 s | **已生成** |
| `sfx_bed.wav` | `resource/audio/` | 音效轨（转场 + 文本 + 落版） | 120.0 s | **已生成** |
| `mix3.wav` | `resource/audio/` | 成片音轨（BGM + 旁白 + 音效） | 120.0 s | **已生成** |
| `whoosh_01.mp3` | `resource/audio/sfx/` | 场景转场音 | 0.967 s | **已接入** |
| `tick_01.mp3` | `resource/audio/sfx/` | 文本逐条出现音 | 0.131 s | **已接入** |
| `outro_01.mp3` | `resource/audio/sfx/` | 结尾落版音 | 1.254 s | **已接入** |

### 旁白是怎么来的

旁白不是手录，是用用户指定的参考音色做 AI 语音克隆。

| 项 | 说明 |
| --- | --- |
| 引擎 | MOSS-TTS-Nano，本地 CPU 推理 |
| 模式 | `voice_clone`，只用参考音频，不接受参考文字稿 |
| 参考音色 | 用户提供的单声道样本，约 21 s |
| 生成方式 | 34 句逐句生成，同一进程只加载一次模型，每句固定 seed |
| 为什么逐句 | 整段生成时长不可控、断句会漂移，逐句才能让字幕与语音严格对齐 |
| 后处理 | 每句裁掉首尾静音（−45 dBFS 阈值，前后各留 60 ms） |
个别句子口播不满意时可以单独重录，不必重跑 34 句。做法：

1. 用不同 `seed` 生成 6–8 个候选，逐个测量「去静音后的有效时长、峰值、内部停顿」；
2. 剔除有长停顿（> 0.12 s）、削波、时长离谱的坏样本；
3. 剩余候选里选语速最从容的（有效时长最长），必要时补增益；
4. 只替换 `voice_01.wav` 里那一个句位，重新混音，再用 `-c:v copy` 换音轨。

已重录：第 15 句「不搬运别人的项目」（57.80 s 句位）。原生成偏短促，重录后有效
时长 1.69 s、峰值 −8.1 dBFS、无内部停顿。
| 拼接 | 按 `js/timeline.js` 的起点放进 120 s 空轨，不做时间拉伸 |
| 语速 | 平均 4.2 汉字/秒（最快 5.5、最慢 3.3） |

**时间轴因此是按旁白实测长度倒推的**，不是先定 120 s 再塞内容。
换音色或改台词后，必须重新生成旁白并重算 `js/timeline.js`。

### 背景音乐处理说明

原始文件：`LAKEY INSPIRED - That Girl`（用户提供的无版权可商用素材包），
mp3 / 44.1 kHz / 立体声 / 174.17 s / 原始响度 **−9.9 LUFS**。

原始素材不被直接使用，另生成一条成片音轨 `resource/audio/mix3.wav`：

| 处理 | 参数 | 原因 |
| --- | --- | --- |
| 裁切 | 取 0 – 120 s | 与成片时长严格对齐 |
| 淡入 | 0 → 2.5 s | 原曲 0 – 18 s 本身是安静前奏（RMS 约 −17 dB），配合片头的极简画面 |
| 淡出 | 117 → 120 s | 收在片尾署名之后，避免硬切 |
| 响度归一化 | `loudnorm I=-24 TP=-2 LRA=11` | 有旁白时 BGM 必须退到背景，−24 LUFS 才能不抢话 |
| 侧链压缩 | `threshold −26 dB / ratio 3 / attack 25 ms / release 500 ms` | 旁白一起声就把音乐压低约 8 dB，说完自动回位 |
### 音效清单与插入点

| 文件 | 用途 | 时长 | 插入位置 | 混入增益 |
| --- | --- | --- | --- | --- |
| `whoosh_01.mp3` | 场景转场 | 0.967 s | 6.0 / 34.0 / 57.0 / 77.5 / 97.5 / 111.0 s，共 6 次 | ×0.85 |
| `tick_01.mp3` | 文本逐条出现 | 0.131 s | 34 条字幕各自的起点 | ×0.40 |
| `outro_01.mp3` | 结尾落版 | 1.254 s | 113.35 s（「谢谢观看」出现后 5 s） | ×0.75 |

音效由 `resource/audio/sfx_bed.wav` 单独成轨，峰值 −4.9 dBFS、RMS −33.2 dBFS。
增益刻意压得低：文字音宁可听不清也不能盖住旁白。整轨在最终混音里再随旁白一起归一化。

### 混音链路与两个已修的坑

```
BGM   → 裁 0–120s → 淡入 2.5s / 淡出 3s → 归一化 −24 LUFS → 44.1kHz 立体声 ┐
                                                                            ├→ 侧链压缩（旁白当侧链，压低约 8dB）
旁白  → 44.1kHz 立体声 → asplit=2 → 一份当侧链、一份进混音 ────────────────┤
音效轨 → 直接进混音 ────────────────────────────────────────────────────────┘
                                                                            ↓
                                        三轨相加 → 补足 120.000s → 归一化 −15 LUFS
```

- **坑 1：同一个滤器标签被用两次，旁白会静默消失。** 最初写成
  `[bgm][voc]sidechaincompress=…[duck];[duck][voc]amix=…`，`[voc]` 同时被
  `sidechaincompress` 和 `amix` 消费。ffmpeg **不报错**，但旁白被侧链那一路吃掉，
  混音里只剩 BGM。实测旁白区间只比纯 BGM 高 0.9 dB（正常应高 5 dB 以上）。
  修法是显式 `asplit=2` 复制成两份再分别使用。**这个错误听起来完全正常，
  只能靠逐段测 RMS 抓出来。**
- **坑 2：`loudnorm` 默认输出 192 kHz。** 末尾不加 `aformat=sample_rates=44100`，
  chromaframe 的编码器会把 AAC 压到 96000 Hz，违反 44.1 kHz 的要求。
- `amix` 必须 `duration=longest` + 末尾 `apad=whole_dur=120,atrim=0:120`，
  否则配 `loudnorm` 会让成片缩短到 117.16 s。

### 替换音轨不重渲染

画面已经渲好、只是音轨要改时，不必再跑一遍 14 分钟的逐帧渲染：

```
ffmpeg -i 成片.mp4 -i mix3.wav -map 0:v:0 -map 1:a:0 \
       -c:v copy -c:a aac -b:a 192k -ar 44100 -ac 2 \
       -shortest -movflags +faststart 输出.mp4
```

`-c:v copy` 直接复制视频流，只重编码音频，耗时约 10 秒。实测成片内音轨与
`mix3.wav` 逐段测量误差 < 0.01 dB。
| 整轨归一化 | `loudnorm I=-15 TP=-1.5 LRA=11` | 成片整体响度对齐平台常见水平 |
| 格式 | WAV / 44.1 kHz / 立体声 / 16 bit | 交给合成软件混流，成片再编码为 AAC |

选曲与画面对齐的考虑：原曲 0 – 18 s 安静渐入对应片头；约 20 s 进入主体节拍，
对应场景 01 的讲解段；约 90 s 出现一次 breakdown（RMS −17 dB），恰好落在
场景 05「欢迎来观看」之前，形成一次自然的呼吸。

实测 ducking 效果：无旁白段 BGM 约 −26.5 dB，旁白段降到 −34 dB 左右，
退后约 8 dB，旁白清晰且音乐仍在。

成片必须有音轨：AAC 44.1 kHz 立体声。

---

## 技术规格

- 纯原生 HTML5 + CSS3 + ES2020，无框架、无构建工具、无 npm 依赖。
- 动画实现：**不使用任何 CSS `@keyframes` 或 `transition`**。全部动画由
  `js/scenes.js` 在 `requestAnimationFrame` 中按时间计算，逐帧写入行内 `style`。
  原因：合成软件会把 `performance.now` / `Date.now` / `requestAnimationFrame`
  替换为虚拟时钟，并自行暂停与 seek 文档动画；若再用 CSS 动画，会与虚拟时钟
  叠加产生相位差，导致逐帧录制画面抖动。
- `renderAt(t)` 是纯函数：同一 `t` 必须得到同一画面，支持乱序 seek（已实测幂等）。
- 只动 `transform` 与 `opacity`，无旋转翻转、无 3D、无粒子。
- 字体栈：正文 `"HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", system-ui, sans-serif`；
  等宽 `"JetBrains Mono", Consolas, "Courier New", monospace`。
- 安全区：上下各 96 px、左右各 120 px，全部内容实测未越界。
- 字幕：距底 8%、最大宽 80%、42 px、`rgba(11,14,19,0.72)` 底板、圆角 8 px、
  内边距 12 px 24 px，单条不超过 2 行。
- 色板：`--bg-0:#000` `--bg-1:#0a0d12` `--bg-2:#141920` `--line:#242c38`
  `--text-1:#e8eaed` `--text-2:#a8b0bd` `--text-3:#6b7482`
  `--accent:#5b9dd9` `--accent-2:#d9a441` `--danger:#d96b6b`。

---

## 偏离项记录

| 偏离项 | 规范原文 | 实际做法 | 原因与依据 |
| --- | --- | --- | --- |
| 背景纯黑 | 第 4 节：禁止纯黑 `#000` | 使用 `#000000` | 用户明确要求「背景使用纯黑背景」。按规范第 1 节优先级，用户当前对话指令优先于其余章节 |
| 片头技术行 | 规范 4/5 未禁，但本片不出现 | 片头只保留台号、账号名、一句定位，不写分辨率/帧率/时长 | 用户要求「把它当成一个真正的视频」；技术规格行会让普通观众出戏 |
| 时长 | 第 9 节：成片建议 30 – 180 s | 120.0 s | 用户要求「约 2 分钟」，正好落在目标上 |

### 例外记录

- 读取了工作区外本地资源的原因与范围：按用户指令中给出的合成软件路径，只读取了
  该目录下的说明文档与 `assets/controller.js`，用于确认逐帧渲染的时钟注入方式与
  截图时序；**未复制、未修改**该目录任何文件，项目产出物中不含其绝对路径。
- 读取了工作区外的一个 BGM 文件：用户直接给出了该文件的完整路径，指定用它作为本片
  背景音乐。只读取了这一个音频文件，复制进 `resource/audio/bgm/bgm_01.mp3` 后即为
  唯一副本，源文件未改动。项目产出物中不记录该外部路径。
- 读取了工作区外的语音合成程序：用户指定了本地 TTS 程序目录与专用 Python 环境，
  用于把 34 句台词生成旁白。只读取该目录的源码与示例音频以确认调用方式，
  **未修改、未复制**其文件；生成结果写入本项目的 `resource/audio/voice/`。
- 读取了工作区外的参考音色文件：用户直接提供了该音频路径，指定用它作为旁白音色。
  只读取了这一个文件，未做副本，产出物中不记录其路径。
- 读取了工作区外的音效目录：用户直接给出了该目录，并指定「随便选」。从其中挑选了
  三个文件（转场、文本、落版）复制进 `resource/audio/sfx/` 并重命名为统一编号；
  其余文件未读取。
- 除上述五项外，未访问用户目录或任何其他外部路径。

---

## 自检结果

| 检查项 | 结果 |
| --- | --- |
| `index.html` 双击可开（`file://`） | 通过，无控制台报错 |
| 打开即自动播放 | 通过，`file://` 与 `http://` 两种方式均实测 |
| 相邻时刻画面不同（动画真实存在） | 通过，20.0 s 与 20.6 s 截图哈希不同 |
| `seek` 幂等与乱序安全 | 通过，乱序跳到 100 s / 12 s 后回到 40 s，两次截图哈希一致 |
| 安全区不越界 | 通过，25 个采样帧 0 处越界 |
| 场景内容不压字幕 | 通过，25 个采样帧 0 处重叠 |
| 旁白已接入且逐句对齐 | 通过，34 句字幕起止 = 语音起止 |
| 成片音轨 44.1 kHz | 通过，AAC LC / 44100 Hz / 立体声 |
| BGM 与旁白 ducking | 通过，旁白段音乐退后约 8 dB |
| 四处时长声明一致 | 通过，均为 120 / 7200 |
| 帧对齐（`round(T×fps)`） | 通过，7200 = round(120.0 × 60) |
| 时长为 0.5 的整数倍 | 通过，120.0 是 0.5 的整数倍 |
| 字幕规格（时长/字数/距底/宽度） | 通过，见 `script.md` 第五张表 |
| 无纯白 `#fff` | 通过 |
| 无 CSS `@keyframes` / `transition` | 通过 |

成片（`output/Ep01_杂食鲸鱼_1080p60.mp4`，11.47 MB）实测：

| 检查项 | 实测值 |
| --- | --- |
| 容器 / 时长 | MP4 / 120.000 s |
| 视频 | H.264 / 1920×1080 / 60 fps / yuv420p / **7200 帧** |
| 音频 | AAC / **44.1 kHz** / 立体声 / 192 kbps |
| 响度 | **−15.0 LUFS**，LRA 4.2 LU，True Peak −1.5 dBFS |
| 音轨内容 | BGM + 34 句旁白 + 6 转场音 + 34 文本音 + 1 落版音，已用 `-c:v copy` 替换进成片 |
| 旁白对齐 | 34 句，字幕起止 = 语音起止，逐句实测 |
| 有声段抽查 | 10 / 30 / 50 / 70 / 90 / 100 / 115 s 均有声（−22.5 ~ −14.8 dB RMS） |
| 画面内容抽查 | 抽 13 帧确认片头、五个场景、落版与公用结尾均有内容（非空帧） |
| 渲染耗时 | 858.9 s（约 14.3 分钟，8.4 帧/秒） |

页面自检使用无头浏览器把视口锁定为 1920 × 1080 后逐帧 `seek` 截图完成，
覆盖片头、五个场景的入场/中段/落版以及公用结尾共 25 个时刻。
成片另用 `ffmpeg -ss` 按时间抽帧逐张目视复核——**这一步不能省**，
`seek` 验证通过不代表合成软件渲染出来的画面是对的（见「重新录制」里的排查说明）。

---

## 重新录制

```bat
REM 带背景音乐与旁白（当前使用的命令）
cd /d <项目根目录>
"<合成软件目录>\Chromaframe.exe" -render -html "Ep01_杂食鲸鱼\index.html" ^
  -out "Ep01_杂食鲸鱼\output\Ep01_杂食鲸鱼_1080p60.mp4" ^
  -audio "resource\audio\mix3.wav" ^
  -width 1920 -height 1080 -duration 120 -fps 60 *> "render.log"

REM 静音版（不传 -audio）
"<合成软件目录>\Chromaframe.exe" -render -html "Ep01_杂食鲸鱼\index.html" ^
  -out "Ep01_杂食鲸鱼\output\Ep01_杂食鲸鱼_1080p60.mp4" ^
  -width 1920 -height 1080 -duration 120 -fps 60 *> "render.log"
```

> 必须把输出重定向到文件（`*> render.log`），**不要用管道接 `| Out-String`**。
> 渲染会打印 7200 行进度日志，管道缓冲区写满后会阻塞子进程，表现为渲染卡住
> 十几分钟后报 `第 N 帧截图失败：context canceled`。这是录制失败最常见的原因。

> **渲染出来是空画面（只有背景）时的排查顺序**：先抽一帧看有没有文字，再检查
> `js/scenes.js` 的 `embedded` 分支。合成软件注入 `__cf` 后会接管
> `requestAnimationFrame` 与 `performance.now()`，逐帧流程是
> 「先 `__cf.setTime(t)` 拨到虚拟时间，再执行上一帧登记的回调」。因此
> embedded 分支必须让 `loop()` 处于读时钟状态（`anchor = 0; running = true`），
> 否则 `loop()` 每帧都渲染 `lastSeek`（初始 0），成片会全是第一帧的空场。
> 只靠 `window.VIDEO.seek()` 验证发现不了这个问题——必须实际渲染一段再抽帧。

实测速度约 **8–9 帧/秒**，7200 帧约需 **14 分钟**。渲染期间不要关闭窗口或
让机器休眠。

> 另外不要把 `will-change` 写进样式：每个 `will-change` 都会为该元素建立一个
> 独立合成层，在软件渲染下 17 个图层足以让 Chrome 渲染进程在 1700 帧左右
> 耗尽内存并断连（表现为 `context canceled`）。`translate3d` 本身已经足够。

输出规格：H.264（libx264，crf 18，yuv420p，bt709）+ AAC 192 kbps / 44.1 kHz 立体声，
文件名固定 `output/Ep01_杂食鲸鱼_1080p60.mp4`。

---

## 文件清单

```
Ep01_杂食鲸鱼/
  index.html                 单入口，双击可开
  README.md                  本文件
  script.md                  分镜脚本与逐句时间表
  css/style.css              全部样式，无动画
  js/timeline.js             时长、场景表、34 条字幕时间（唯一真源）
  js/scenes.js               逐帧渲染器与播放控制
  subtitles/subtitles.json   独立字幕文件
  output/                    成片输出目录
  assets/img/  assets/fonts/ 预留素材目录

resource/
  outro/outro.js             公用结尾组件
  outro/outro-preview.html   结尾组件独立预览页
  audio/bgm/bgm_01.mp3       背景音乐原文件
  audio/mix3.wav             成片音轨（BGM + 旁白 + 音效，已裁切/淡入淡出/ducking/归一化）
  audio/voice/voice_01.wav   旁白主干（34 句拼接，120.0 s）
  audio/sfx/                 音效三件（whoosh_01 / tick_01 / outro_01）
  audio/sfx_bed.wav           音效轨（120.0 s）
```
