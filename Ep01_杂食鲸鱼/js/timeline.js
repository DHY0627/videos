/* 本文件是时长与字幕的唯一真源。
 * 时间轴按旁白实测长度排布：场景内首句 = 场景起点 + 0.8s，
 * 句间留 0.30s，场景尾部留 0.4s，场景时长向上取 0.5 秒倍数。
 * 改动后需同步 index.html 的 data-cf-duration 与 script.md 的分镜表。
 */
window.TIMELINE = {
  fps: 60,
  duration: 120.0,
  totalFrames: 7200,
  scenes: [
    { id: 'intro', name: '片头', num: '', start: 0.0, duration: 6.0 },
    { id: 'who', name: '01 我是谁', num: '01', start: 6.0, duration: 28.0 },
    { id: 'do', name: '02 这个账号干什么', num: '02', start: 34.0, duration: 23.0 },
    { id: 'dont', name: '03 这个账号不干什么', num: '03', start: 57.0, duration: 20.5 },
    { id: 'how', name: '04 一期视频是怎么来的', num: '04', start: 77.5, duration: 20.0 },
    { id: 'welcome', name: '05 欢迎来观看', num: '05', start: 97.5, duration: 13.5 },
    { id: 'outro', name: '片尾', num: '', start: 111.0, duration: 9.0 }
  ],
  subtitles: [
    { start: 6.8, end: 8.45, text: '我是杂食鲸鱼' },
    { start: 8.75, end: 10.77, text: '这个账号主要做一件事' },
    { start: 11.07, end: 13.71, text: '讲解我自己写的代码项目' },
    { start: 14.01, end: 17.4, text: '从想法到能跑，整个过程都讲' },
    { start: 17.7, end: 21.81, text: '这个账号背后有一个 AI 在跟我一起干活' },
    { start: 22.11, end: 25.95, text: '内容我想的，观点我出的，错我认的' },
    { start: 26.25, end: 29.77, text: '它负责快，我负责决定要不要' },
    { start: 30.07, end: 33.49, text: '这不是模型演示，这是一个人的频道' },
    { start: 34.8, end: 37.2, text: '第一件，把项目拆开讲' },
    { start: 37.5, end: 40.38, text: '为什么这么设计，取舍在哪' },
    { start: 40.68, end: 43.47, text: '第二件，保证你真能跑起来' },
    { start: 43.77, end: 47.22, text: '代码能下载，环境怎么搭我写清楚' },
    { start: 47.52, end: 50.33, text: '第三件，把踩过的坑也讲出来' },
    { start: 50.63, end: 53.48, text: '我翻过的车，基本都在视频里' },
    { start: 53.78, end: 56.41, text: '能复现，才算真讲明白了' },
    { start: 57.8, end: 59.71, text: '不搬运别人的项目' },
    { start: 60.01, end: 62.78, text: '别人的东西，标清楚出处' },
    { start: 63.08, end: 64.28, text: '不标题党' },
    { start: 64.32, end: 67.68, text: '封面写什么，内容就得有什么' },
    { start: 67.98, end: 69.79, text: '不讲没有来源的数字' },
    { start: 70.09, end: 72.58, text: '不确定的事，就说不知道' },
    { start: 72.88, end: 74.31, text: '不承诺做不到的事' },
    { start: 74.61, end: 76.77, text: '也不接让我说假话的合作' },
    { start: 78.3, end: 81.29, text: '一期视频通常从一个问题开始' },
    { start: 81.59, end: 84.47, text: '我先查资料，确认值不值得做' },
    { start: 84.77, end: 88.1, text: '然后动手，直到它能跑起来' },
    { start: 88.4, end: 91.13, text: '中间每一步，我都留下记录' },
    { start: 91.43, end: 94.55, text: '你看的那个项目，代码是公开的' },
    { start: 94.85, end: 96.9, text: '你也可以自己拉下来跑一遍' },
    { start: 98.3, end: 100.18, text: '如果你也在写自己的项目' },
    { start: 100.48, end: 102.5, text: '如果你也想把代码讲明白' },
    { start: 102.8, end: 104.0, text: '欢迎来观看' },
    { start: 104.2, end: 106.97, text: '我会一直在这儿，慢慢做' },
    { start: 107.27, end: 110.29, text: '从这一期开始，我们正式认识' }
  ]
};
