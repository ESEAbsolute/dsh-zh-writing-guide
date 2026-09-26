# 中文写作规范 · DeepSeek Harness 插件

把两份公开的中文写作规范做成 Harness 的一等能力，让 Agent 写中文时自动守规矩，并能在交稿前自检。

| 上游规范 | 内容 |
| --- | --- |
| [sparanoid/chinese-copywriting-guidelines](https://github.com/sparanoid/chinese-copywriting-guidelines) 《中文文案排版指北》 | 空格、标点符号、全形与半形、名词大小写 |
| [ruanyf/document-style-guide](https://github.com/ruanyf/document-style-guide) 《中文技术文档的写作规范》 | 标题、文本、段落、数值、标点符号、文档体系与文件名 |

本插件把上面的内容整理为 **11 个主题 / 56 条规则**，并分四层提供：

1. **system prompt 段落**——只放高频、可执行的核心约束（约 1350 字符），每轮请求都生效，不把全量条目塞进上下文。
2. **`zh_writing_guide` 工具**——按主题或关键词取回完整条目、正误示例与注意事项，需要细节时才付 token。
3. **`zh_style_check` 工具**——对成稿做可机械判定的排版自检，返回按行列定位的问题与修改建议。
4. **Web 端「插件」页的配置表单**——上面三项开关、三条个人约定与自检上限都能在界面上直接改，
   改完立刻生效，不用重启、不用手改 YAML。见 [配置页](#配置页web-端)。

## 个人约定（可配置，默认全开）

上游规范把下面三项列为**可选项或争议项**，本插件按使用者的个人习惯把它们定死为规则。
三项都做成了独立的配置开关（配置文件与 [配置页](#配置页web-端) 都能改），**默认全部开启**；
关掉任意一项时，插件会回落到上游口径而不是简单删除内容：

| 配置键 | 默认 | 规范条目 / 自检规则 | 开启时 | 关闭时 |
| --- | --- | --- | --- | --- |
| `cjkDigitSpacing` | `true` | `spacing-cjk-digit` | 中文和数字之间一律加空格，不加即 `error` | 换回「加不加都可，但全文必须统一」，自检静默 |
| `linkSpacing` | `true` | `spacing-link` | 超链接两侧各加一个空格 | 换回「属个人风格，两种写法都正确」，自检静默 |
| `cornerQuotes` | `true` | `punct-quotes` | 简体中文用直角引号「」『』 | 换回「弯引号与直角引号都合法，但须全文统一」，自检静默 |

关闭一项会同时作用于三处，且互相一致：

1. **system prompt 段落**——对应条目整体不再出现（上游本来就允许另一种写法，不必每轮占用 token）；
   三项全关时段落会明确写「本部署未启用个人约定，完全按两份上游规范的原始口径执行」。
2. **`zh_writing_guide`**——规则正文、正误示例与注意事项换成上游口径，目录里点名「已关闭」。
3. **`zh_style_check`**——同名规则不再报告，并在报告末尾写明「已按配置关闭：……」，
   避免「自检通过」被误读成完全合规。

实现上写在 `PREFERENCES`（`lib/guidelines.js`）：每条约定带 `key`、`ruleId`（与规范条目、自检规则同名）
以及 `whenOff` 覆盖文案；单元测试会守住「规范条目 id == 自检规则 id」这条约束——
之前正是这里出过一次真 bug（规范条目叫 `punct-quotes`、自检规则叫 `punct-quote-style`，导致关闭开关时自检静默失效）。

## 安装

插件包可以从 GitHub、本地路径或 tarball 安装，三种写法等价：

```bash
dsh plugin add --profile web github:ESEAbsolute/dsh-zh-writing-guide   # 或
dsh plugin add --profile web /home/abs0/dsh-zh-writing-guide          # 本地目录
```

也可以在侧栏「插件」页点「添加插件」，把同样的 spec 填进去。安装会写入 profile 的
`package.json` / `cordis.patch.yml` / `node_modules`，对该 profile 下所有会话生效并跨重启保留。
本包唯一的运行时依赖是 `@deepseek-ai/schemastery`（`^3.18.4`，提供配置 schema 与 `.volatile()`），
会随安装一起装好；装不上时插件仍然工作，只是退化成静态配置、没有配置表单。

卸载：

```bash
dsh plugin remove --profile web @local/dsh-zh-writing-guide
```

## 配置

配置有两个入口，改的是同一份数据：

1. **图形界面**：侧栏「插件」→ 已安装 → 中文写作规范 → 点开插件卡片或行名右侧的箭头，
   表单里逐项开关，点「保存」。改动写回当前 profile 的 `cordis.patch.yml`，当场生效。
2. **直接写 YAML**：在 `cordis.patch.yml` 该行的 `config` 里写（本包自带的 patch 已经写好默认值）。
   默认全部开启，任何一个键都可以省略：

```yaml
- id: zh-writing-guide
  config:
    promptSection: true      # 是否注册 system prompt 段落
    promptDetail: core       # core | strict，strict 额外注入英文处理与引用规范
    promptOrder: 15000       # 段落排序，内置段落最大值为 10200，故默认排在最后
    guideTool: true          # 是否注册 zh_writing_guide
    styleCheckTool: true     # 是否注册 zh_style_check
    preferences:             # 三条个人约定，默认全开；false 即回落到上游口径
      cjkDigitSpacing: true  # 中文和数字之间应当增加空格
      linkSpacing: true      # 超链接两侧应当增加空格
      cornerQuotes: true     # 简体中文应当使用直角引号
    check:
      maxFindings: 200       # 单次自检最多收集多少条
      reportLimit: 40        # 报告里最多列出多少条
      disabledRules: []      # 额外关闭的规则，例如 [spacing-digit-unit]
```

只想关掉其中一项时的最简写法：

```yaml
- id: zh-writing-guide
  config:
    preferences:
      cornerQuotes: false    # 弯引号与直角引号都用，仅要求全文统一
```

> 两种入口写的是同一行配置：图形界面把改动合并进 profile 的 `cordis.patch.yml`，
> 所以界面里看到的就是文件里的值，反之亦然。

## 配置页（Web 端）

`index.js` 导出 schemastery 的 `Config`，整棵标记 `.volatile()`。Loader 因此把这一行的配置解析成
「活引用」：设置页写字段时不重挂插件，插件每次读数都取最新值。`lib/client.js` 再把表单挂到
「插件」页声明的两个槽位上：

| 槽位 | key | 出现的位置 |
| --- | --- | --- |
| `plugins.row.config` | `@local/dsh-zh-writing-guide#zh-writing-guide` | 插件卡片里那一行右侧的箭头，点进独立配置页 |
| `plugins.bundle.config` | `@local/dsh-zh-writing-guide` | 插件卡片页正文，展开即见表单 |

两个入口读写同一个设置命名空间 `zh-writing-guide`（就是 profile 里那一行的 `id`）。
表单字段与 Host 的 schema 由单元测试锁死一一对应：

| 分组 | 字段 | 控件 |
| --- | --- | --- |
| 段落与工具 | `promptSection`、`promptDetail`、`promptOrder`、`guideTool`、`styleCheckTool` | 复选框 / 下拉 / 非负整数 |
| 个人约定 | `preferences.cjkDigitSpacing`、`preferences.linkSpacing`、`preferences.cornerQuotes` | 复选框 |
| 自检上限 | `check.maxFindings`、`check.reportLimit`、`check.disabledRules` | 非负整数 / 一行一个规则 id 的文本域 |

生效方式分两类，都与「活引用」一致：

- **值型字段**（个人约定、详细度、自检上限）读取时生效：prompt 段落是 thunk，两个工具在 `execute`
  里读配置，所以保存后下一轮对话就是新行为。
- **注册型字段**（是否注册段落、两个工具是否存在）在 `loader/volatile-update` 时当场对账：
  关掉 `guideTool` 会立刻注销工具，打开则立刻注册。
  `promptOrder` 变化会重新挂载段落（排序是注册参数）。

宿主没有 `@deepseek-ai/schemastery`（例如旧版本）时，`Config` 为 `undefined`，Loader 按「无 schema」
处理：插件照旧运行，由 `index.js` 的 `normalizeConfig()` 宽松归一化——非法值回落到默认值，
而不是让整行插件挂掉；代价是这一行不显示配置表单。

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
| `punct-ellipsis` | error | 英文省略号 `...`，或省略号字符数不是 2（只写一个 `…`、连写 `………` 都算错） |
| `punct-enumeration` | warn | 英文并列词之间使用全角逗号 |
| `punct-quotes` | warn | 使用弯引号（**个人约定**：改用直角引号 `「」『』`）；不查弯单引号，避免与英文撇号冲突 |
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
pnpm install                                          # 装 @deepseek-ai/schemastery（测试与运行时同一份依赖）
node --test "test/*.test.mjs"                         # 39 个单元测试，不依赖 DSH 运行时
node scripts/smoke.mjs                                # 打印 prompt 段落、查询输出、自检报告与配置默认值
```

测试分两个文件：`test/plugin.test.mjs` 覆盖 Host 半包（规范数据、工具、配置归一化、活引用、
volatile 热更新、schema 与 patch 的一致性），`test/client.test.mjs` 用手写的 module loader 门面与
极简 React 替身跑 `lib/client.js`（bundle 形状、槽位 key、字段路径与 schema 对齐、表单提交）。

装进 profile 后想确认配置通道是否接通，可以只看 schema 而不启动服务：

```bash
dsh --profile web --dump-config-schema | grep -A 3 '"id": "zh-writing-guide"'
# status 为 "schema"（而不是 "absent"）才说明这一行带上了 Config、设置页能读到它
```

## 许可

插件代码 MIT。规范文本来自上述两个仓库：《中文技术文档的写作规范》为 public domain，
《中文文案排版指北》版权归其作者所有，本插件仅作整理与引用，并在每条主题里保留了来源链接。
