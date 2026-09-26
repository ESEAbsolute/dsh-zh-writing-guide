# 中文写作规范 · DeepSeek Harness 插件

把两份公开的中文写作规范做成 Harness 的一等能力，让 Agent 写中文时自动守规矩，并能在交稿前自检。

| 上游规范 | 内容 |
| --- | --- |
| [sparanoid/chinese-copywriting-guidelines](https://github.com/sparanoid/chinese-copywriting-guidelines) 《中文文案排版指北》 | 空格、标点符号、全形与半形、名词大小写 |
| [ruanyf/document-style-guide](https://github.com/ruanyf/document-style-guide) 《中文技术文档的写作规范》 | 标题、文本、段落、数值、标点符号、文档体系与文件名 |

本插件把上面的内容整理为 **11 个主题 / 56 条规则**，并分三层提供：

1. **system prompt 段落** —— 只放高频、可执行的核心约束（约 1350 字符），每轮请求都生效，不把全量条目塞进上下文。
2. **`zh_writing_guide` 工具** —— 按主题或关键词取回完整条目、正误示例与注意事项，需要细节时才付 token。
3. **`zh_style_check` 工具** —— 对成稿做可机械判定的排版自检，返回按行列定位的问题与修改建议。

## 个人约定（本插件选定口径）

上游规范把下面三项列为**可选项或争议项**，本插件按使用者的个人习惯把它们定死为规则。
实现上写在 `PREFERENCES`（`lib/guidelines.js`）里，三条规则都带 `preference: true`，
规范查询会显式标注「个人约定」，单元测试保证两者不会漂移。

| 规则 id | 约定 | 上游口径 |
| --- | --- | --- |
| `spacing-cjk-digit` | 中文和数字之间**要**加空格，不加即判为 `error` | 指北要求加；写作规范允许全文统一地不加 |
| `spacing-link` | 超链接前后**应当**增加空格 | 两份规范都列为个人风格 |
| `punct-quotes` | 简体中文**应当**使用直角引号「」『』，不用弯引号 | 上游把直角引号列为争议项 |

想让某一项回到上游的可选口径，用 `check.disabledRules` 关掉对应的自检规则即可；
prompt 段落里的文字改动需要直接改 `lib/prompt.js`。

## 安装

插件包位于工作区的 `dsh-zh-writing-guide/`，用 `plugin_manager` 以绝对路径安装：

```jsonc
// plugin_manager
{ "action": "install_bundle", "target": "/home/abs0/harness-plugin-creation/dsh-zh-writing-guide" }
```

安装会写入 profile 的 `package.json` / `cordis.patch.yml` / `node_modules`，对该 profile 下所有会话生效并跨重启保留。
卸载：

```jsonc
{ "action": "remove_bundle", "target": "@local/dsh-zh-writing-guide" }
```

## 配置

配置写在 `cordis.patch.yml` 该行的 `config` 里（本包自带的 patch 已经写好默认值）。
默认全部开启，任何一个键都可以省略：

```yaml
- id: zh-writing-guide
  config:
    promptSection: true      # 是否注册 system prompt 段落
    promptDetail: core       # core | strict，strict 额外注入英文处理与引用规范
    promptOrder: 15000       # 段落排序，内置段落最大值为 10200，故默认排在最后
    guideTool: true          # 是否注册 zh_writing_guide
    styleCheckTool: true     # 是否注册 zh_style_check
    check:
      maxFindings: 200       # 单次自检最多收集多少条
      reportLimit: 40        # 报告里最多列出多少条
      disabledRules: []      # 关闭指定规则，例如 [spacing-cjk-digit, spacing-digit-unit]
```

> 本包**不导出 schemastery 的 `Config`**：profile 的 `node_modules` 里没有 `@deepseek-ai/schemastery`
> 之外的 Harness 运行时包，跨包 import 会在加载期报 `ERR_MODULE_NOT_FOUND`。因此配置由
> `index.js` 的 `normalizeConfig()` 宽松归一化——非法值回落到默认值，而不是让整行插件挂掉。
> 代价是 Plugin Manager 里这一行不显示配置表单。

## 工具

### `zh_writing_guide`

| 参数 | 说明 |
| --- | --- |
| `topic` | 主题 id，省略则返回目录。可选：`spacing`、`punctuation`、`charwidth`、`nouns`、`sentences`、`style`、`english`、`paragraphs`、`numbers`、`titles`、`structure` |
| `query` | 关键词检索，例如「省略号」「空格」「标题」；与 `topic` 同时给出时以 `topic` 为准 |
| `detail` | `summary` 只给规则正文；`full`（默认）附带正确/错误示例与注意事项 |

### `zh_style_check`

传入待检查文本，返回报告。当前覆盖的规则：

| 规则 id | severity | 判定 |
| --- | --- | --- |
| `spacing-cjk-latin` | error | 中英文之间缺少空格 |
| `spacing-cjk-digit` | error | 中文与数字之间缺少空格（**个人约定**：一律加空格） |
| `spacing-digit-unit` | warn | 数字与单位之间缺少空格（`10Gbps` → `10 Gbps`），度数与百分号豁免 |
| `spacing-link` | warn | 链接锚文本与相邻中文之间缺少空格（**个人约定**） |
| `spacing-fullwidth-punct` | error | 全角标点旁出现空格 |
| `punct-fullwidth` | error | 中文语句里使用半角标点 |
| `punct-repeat` | error | 重复标点（`！！`、`？？`、`！？`、`。。`） |
| `punct-ellipsis` | error | `...`、`。。。` 或只写一个 `…` |
| `punct-enumeration` | warn | 英文并列词之间使用全角逗号 |
| `punct-quote-style` | warn | 使用弯引号（**个人约定**：改用直角引号 `「」『』`）；不查弯单引号，避免与英文撇号冲突 |
| `punct-line-start` | warn | 点号出现在行首 |
| `punct-heading-end` | warn | 标题末尾出现点号 |
| `width-fullwidth-digit` | error | 使用全角阿拉伯数字 |
| `width-fullwidth-latin` | warn | 使用全角英文字母或全角 `＆` |
| `number-change-multiple` | error | 「降低 N 倍」「减少 N 倍」 |
| `sentence-too-long` | warn | 句子构件超过 40 字，或逗号长句超过 100 字 |

自检前会屏蔽代码块、行内代码、URL、邮箱、链接目标与 HTML 标签，避免在代码上误报；
屏蔽时保持字符串长度与换行位置不变，因此报告里的行列号始终指向原文。
`spacing-link` 借助掩码只检查锚文本两侧的空格，链接 URL 与代码块里的链接都不会被当作正文。

## 开发与验证

```bash
node --test dsh-zh-writing-guide/test/plugin.test.mjs   # 20 个单元测试，不依赖 DSH 运行时
node dsh-zh-writing-guide/scripts/smoke.mjs             # 打印 prompt 段落、查询输出与自检报告
```

## 许可

插件代码 MIT。规范文本来自上述两个仓库：《中文技术文档的写作规范》为 public domain，
《中文文案排版指北》版权归其作者所有，本插件仅作整理与引用，并在每条主题里保留了来源链接。
