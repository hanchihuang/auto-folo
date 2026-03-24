# auto-folo 中文说明

`auto-folo` 是一个用于批量向 Folo 订阅源的命令行工具。

它针对的就是这类输入场景：

- 本地有一个 HTML 文件
- 文件里包含一批 `"姓名": "https://x.com/..."` 映射
- 希望把这些人尽可能自动转换成 Folo 可订阅的 RSSHub 源

这个项目已经封装成了可直接执行的 CLI 工程，而不是一次性的临时脚本。

## 主要能力

- 解析本地 HTML，提取 `姓名 -> x.com 链接`
- 对 `https://x.com/<handle>` 这种直接主页链接，自动转换为 `rsshub://twitter/user/<handle>`
- 直接调用 Folo 的真实订阅接口
- 每处理一个人都写入状态，支持断点续跑
- 自动导出“无法解析句柄”的清单
- 遇到 Folo 的 RSSHub 配额限制时，明确停止并报告原因

## 不做什么

- 不绕过 Folo 平台限制
- 不假装“搜索成功”
- 不对 `x.com/search?...` 这种链接瞎猜真实句柄

## 环境要求

- Node.js 20+
- 一个有效的 Folo 登录 Cookie
- 一个包含 `姓名 -> x.com 链接` 的 HTML 文件

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/hanchihuang/auto-folo.git
cd auto-folo
```

### 2. 配置 `.env`

```bash
cp .env.example .env
```

编辑 `.env`：

```env
FOLO_COOKIE_STRING=你的完整 Folo Cookie
INPUT_HTML=/绝对路径/大模型专家名单提取.html
FORCE_RECHECK=0
STOP_ON_QUOTA=1
```

### 3. 运行

Linux / macOS:

```bash
./run.sh
```

Windows:

```bat
run.bat
```

或者：

```bash
npm run follow
```

### 4. 查看报告

```bash
npm run report
```

## 句柄覆写

如果输入里出现了：

```json
"Abhimanyu Dubey": "https://x.com/search?q=Abhimanyu%20Dubey&src=typed_query"
```

这种链接本身没有真实句柄。要在 `handle_overrides.json` 里补：

```json
{
  "Abhimanyu Dubey": "real_x_handle"
}
```

然后重跑即可。

## 重要限制

如果 Folo 返回：

```text
MAX_RSSHUB_SUBSCRIPTIONS exceeded
```

说明不是脚本问题，而是你当前账号的 RSSHub 配额已满。

## 示例文件

- [examples/input.sample.html](/home/user/图片/auto-folo/examples/input.sample.html)
- [examples/handle_overrides.example.json](/home/user/图片/auto-folo/examples/handle_overrides.example.json)

## 许可证

MIT
