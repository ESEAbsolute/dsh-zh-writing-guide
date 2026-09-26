/**
 * 中文写作规范——DeepSeek Harness Host 插件。
 *
 * 把《中文文案排版指北》与《中文技术文档的写作规范》做成 Harness 的一等能力：
 *   1. 在 system prompt 中注册一段「中文写作与排版规范」核心约束；
 *   2. 注册 `zh_writing_guide` 工具，按主题或关键词查询完整条目与正误示例；
 *   3. 注册 `zh_style_check` 工具，对成稿做可机械判定的排版自检。
 *
 * 配置分两层：
 *   1. {@link Config}——schemastery schema，整棵标记 `.volatile()`。Loader 因此把
 *      这一行的配置解析成「活引用」：在「插件」页写字段时不重挂插件，本模块每次读数
 *      都取最新值（prompt 段落是 thunk，工具在 `execute` 里读）。
 *   2. {@link normalizeConfig}——宽松归一化，非法值回落到默认值；schema 缺失或字段
 *      类型意外时，插件照常工作。
 *
 * `@deepseek-ai/schemastery` 只在 `import()` 成功后使用：解析不到时 `Config` 为
 * `undefined`，Loader 按「无 schema」处理，插件退化成只认 cordis.patch.yml 的静态配置，
 * 而不是整行加载失败。
 *
 * 浏览器半包在 `lib/client.js`：package.json 的 `dsh.client` 与 `exports["./client"]`
 * 让内核把它随页面下发，它再把配置表单注册进插件管理页的 `plugins.row.config`。
 *
 * @module @local/dsh-zh-writing-guide
 */

import {
  buildGuideText,
  disabledPreferenceRules,
  normalizePreferences,
  RULE_COUNT,
  TOPICS,
  TOPIC_BY_ID,
} from './lib/guidelines.js';
import { buildPromptSection } from './lib/prompt.js';
import { checkText, renderCheckReport } from './lib/check.js';

/** Cordis 插件名。 */
export const name = 'zh-writing-guide';

/** 必须存在的服务；`tools` 通过 ctx.inject 按需等待。 */
export const inject = ['systemPrompt'];

/** system prompt 段落的注册名，全局唯一。 */
const PROMPT_SECTION_NAME = 'plugin:zh-writing-guide';

/** 默认段落顺序：排在全部内置段落之后（内置最大值为 10200）。 */
const DEFAULT_PROMPT_ORDER = 15000;

/** 工具名。 */
const GUIDE_TOOL_NAME = 'zh_writing_guide';
const CHECK_TOOL_NAME = 'zh_style_check';

/** 自检默认上限，与 cordis.patch.yml 的注释一致。 */
const DEFAULT_MAX_FINDINGS = 200;
const DEFAULT_REPORT_LIMIT = 40;

/** 三条个人约定的默认值：上游列为可选项，本部署默认全开。 */
const DEFAULT_PREFERENCES = {
  cjkDigitSpacing: true,
  linkSpacing: true,
  cornerQuotes: true,
};

/** 工具返回值 schema：`{ text: string }`。 */
const TEXT_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: { text: { type: 'string' } },
};

/**
 * 装配 schemastery 的 `Config`。
 *
 * 整棵 schema 标记 `.volatile()`：本插件的每个字段都是「可当场改」的活配置，没有
 * 需要重挂才生效的普通字段，一个根级标记比逐字段标记更难漏。代价是 volatile 不能
 * 嵌套（schemastery 在解析期就会抛「volatile fields require a fixed object path」），
 * 因此子节点一律不再标 `.volatile()`。
 *
 * @returns {Promise<unknown>} schema；拿不到 schemastery 或版本过旧时返回 `undefined`
 */
async function loadConfigSchema() {
  const module = await import('@deepseek-ai/schemastery');
  const z = module.default ?? module;
  const schema = z.object({
    promptSection: z.boolean().default(true),
    promptDetail: z.union([z.const('core'), z.const('strict')]).default('core'),
    promptOrder: z.natural().default(DEFAULT_PROMPT_ORDER),
    guideTool: z.boolean().default(true),
    styleCheckTool: z.boolean().default(true),
    preferences: z.object({
      cjkDigitSpacing: z.boolean().default(DEFAULT_PREFERENCES.cjkDigitSpacing),
      linkSpacing: z.boolean().default(DEFAULT_PREFERENCES.linkSpacing),
      cornerQuotes: z.boolean().default(DEFAULT_PREFERENCES.cornerQuotes),
    }).default({ ...DEFAULT_PREFERENCES }),
    check: z.object({
      maxFindings: z.natural().default(DEFAULT_MAX_FINDINGS),
      reportLimit: z.natural().default(DEFAULT_REPORT_LIMIT),
      disabledRules: z.array(z.string()).default([]),
    }).default({
      maxFindings: DEFAULT_MAX_FINDINGS,
      reportLimit: DEFAULT_REPORT_LIMIT,
      disabledRules: [],
    }),
  });
  // schemastery < 3.18.2 没有 volatile()：退回普通 schema，配置照旧校验，只是不能热改。
  return typeof schema.volatile === 'function' ? schema.volatile() : schema;
}

/**
 * 配置 schema。导出名必须是 `Config`：Loader 从这里取 schema，`@deepseek-ai/dsh-settings`
 * 也据此把本行暴露成设置命名空间 `zh-writing-guide`，插件管理页的配置表单才有值可读写。
 * @type {unknown}
 */
export const Config = await loadConfigSchema().catch(() => undefined);

function asBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asStringList(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : [];
}

/**
 * 判断一个值是不是 Loader 传来的活引用。`createVolatile()` 返回的是
 * `Object.freeze({ get, [write]: ... })`，自有键只有 `get`（`write` 是 Symbol）。
 * @param {unknown} value 待判断的值
 * @returns {boolean} 是活引用时为 true
 */
function isVolatileRef(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.get === 'function' &&
    Object.keys(value).length <= 1
  );
}

/**
 * 取出当前配置的普通对象快照。字段标了 `.volatile()` 时，Loader 传进来的是活引用
 * 而不是对象，这里按引用取值，于是每次读都是最新配置。
 * @param {unknown} raw `apply` 收到的 `config`
 * @returns {Record<string, unknown>} 当前配置
 */
export function readConfig(raw) {
  let value = raw;
  for (let depth = 0; depth < 5 && isVolatileRef(value); depth += 1) value = value.get();
  return asObject(value);
}

/**
 * 宽松归一化配置：非法值回落到默认值，而不是让整行插件挂掉。schema 已经把值校验过
 * 一遍，这里是第二道保险，也让没有 schema 的旧部署行为不变。
 * @param {unknown} raw `cordis.patch.yml` 里该行的 `config`，或 Loader 给的活引用
 * @returns {{promptSection: boolean, promptDetail: 'core'|'strict', promptOrder: number,
 *   guideTool: boolean, styleCheckTool: boolean, preferences: Record<string, boolean>,
 *   check: {maxFindings: number, reportLimit: number, disabledRules: string[]}}}
 */
export function normalizeConfig(raw) {
  const input = readConfig(raw);
  const check = asObject(input.check);
  return {
    promptSection: asBoolean(input.promptSection, true),
    promptDetail: input.promptDetail === 'strict' ? 'strict' : 'core',
    promptOrder: asNumber(input.promptOrder, DEFAULT_PROMPT_ORDER),
    guideTool: asBoolean(input.guideTool, true),
    styleCheckTool: asBoolean(input.styleCheckTool, true),
    preferences: normalizePreferences(input.preferences),
    check: {
      maxFindings: asNumber(check.maxFindings, DEFAULT_MAX_FINDINGS),
      reportLimit: asNumber(check.reportLimit, DEFAULT_REPORT_LIMIT),
      disabledRules: asStringList(check.disabledRules),
    },
  };
}

/**
 * `zh_writing_guide` 的工具定义。
 * @param {() => ReturnType<typeof normalizeConfig>} current 读取当前配置的函数
 */
function guideToolDefinition(current) {
  const topicIds = TOPICS.map((topic) => topic.id);
  return {
    name: GUIDE_TOOL_NAME,
    description:
      `查询中文写作与排版规范（《中文文案排版指北》+《中文技术文档的写作规范》，共 ${TOPICS.length} 个主题 / ${RULE_COUNT} 条规则）。` +
      '在撰写或修改中文文档、文案、注释、提交信息之前调用，取回某主题的完整条目、正误示例与注意事项。' +
      '不传参数返回主题目录；传 topic 取单个主题；传 query 做关键词检索。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        topic: {
          type: 'string',
          enum: topicIds,
          description: `主题 id，可选值：${topicIds.join('、')}。省略则返回目录。`,
        },
        query: {
          type: 'string',
          description: '关键词检索，例如「省略号」「空格」「标题」「数值」「大小写」。与 topic 同时给出时以 topic 为准。',
        },
        detail: {
          type: 'string',
          enum: ['summary', 'full'],
          description: 'summary 只给规则正文；full 附带正确/错误示例与注意事项。默认 full。',
        },
      },
    },
    output: {
      schema: TEXT_OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    isConcurrencySafe: () => true,
    presentCall: () => ({ card: 'generic', title: '查询中文写作规范', kind: 'other' }),
    async execute(args) {
      const request = asObject(args);
      const topic = typeof request.topic === 'string' ? request.topic.trim() : '';
      const query = typeof request.query === 'string' ? request.query : '';
      const detail = request.detail === 'summary' ? 'summary' : 'full';
      if (topic !== '' && !TOPIC_BY_ID.has(topic)) {
        throw new Error(`未知主题 "${topic}"；可用主题：${TOPICS.map((entry) => entry.id).join('、')}`);
      }
      const { text } = buildGuideText({ topic, query, detail, preferences: current().preferences });
      return { text };
    },
  };
}

/**
 * `zh_style_check` 的工具定义。
 * @param {() => ReturnType<typeof normalizeConfig>} current 读取当前配置的函数
 */
function styleCheckToolDefinition(current) {
  return {
    name: CHECK_TOOL_NAME,
    description:
      '对中文文本做排版自检，返回按行列定位的问题与修改建议。' +
      '检查中英文之间缺少空格、中文与数字之间缺少空格、数字与单位之间缺少空格、链接锚文本与相邻中文之间缺少空格、' +
      '中文语句里的半角标点、全角标点旁的冗余空格、重复标点、省略号写法、弯引号（应改用直角引号）、全角数字、' +
      '「降低 N 倍」、过长句子等。代码块与行内代码会被整体跳过，链接只检查锚文本两侧的空格、不检查 URL 本身。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['text'],
      properties: {
        text: {
          type: 'string',
          description: '待检查的中文文本，可直接传入 Markdown 原文。',
        },
      },
    },
    output: {
      schema: TEXT_OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    isConcurrencySafe: () => true,
    presentCall: () => ({ card: 'generic', title: '中文排版自检', kind: 'other' }),
    async execute(args) {
      const request = asObject(args);
      const text = typeof request.text === 'string' ? request.text : '';
      if (text.trim() === '') throw new Error('zh_style_check 需要非空的 text 参数');
      const config = current();
      // 关闭的个人约定同时关掉对应的自检规则，命令式关闭项优先且不会被覆盖。
      const offByPreference = disabledPreferenceRules(config.preferences);
      const result = checkText(text, {
        disabledRules: [...offByPreference, ...config.check.disabledRules],
        maxFindings: config.check.maxFindings,
      });
      return {
        text: renderCheckReport(result, {
          limit: config.check.reportLimit,
          offRules: offByPreference,
        }),
      };
    },
  };
}

/**
 * 注册 prompt 段落、两个工具，并声明本插件自带配置页。
 *
 * 配置是活的（`Config` 整棵 `.volatile()`）：字段值在每次读取时生效，而「段落/工具是否
 * 存在」属于注册事实，必须在 volatile 更新后对账一次。Loader 的 `loader/volatile-update`
 * 只送给本行自己的监听器，因此这里直接 `ctx.on` 即可。
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx 插件上下文
 * @param {unknown} rawConfig 该行的 `config`（标了 `.volatile()` 时是活引用）
 */
export function apply(ctx, rawConfig) {
  const current = () => normalizeConfig(rawConfig);

  /** 已注册的 prompt 段落：`null` 表示当前未注册。 */
  let promptRegistration = null;
  /** 工具名 -> 注销函数。 */
  const toolRegistrations = new Map();
  /** `tools` 服务，到位前先记下不注册。 */
  let toolsService = null;

  /** 让段落的存在与顺序对齐配置。 */
  const syncPromptSection = () => {
    const config = current();
    if (!config.promptSection) {
      promptRegistration?.dispose();
      promptRegistration = null;
      return;
    }
    if (promptRegistration !== null && promptRegistration.order === config.promptOrder) return;
    promptRegistration?.dispose();
    const order = config.promptOrder;
    promptRegistration = {
      order,
      dispose: ctx.systemPrompt.section({
        name: PROMPT_SECTION_NAME,
        order,
        text: () => {
          const live = current();
          return buildPromptSection({ detail: live.promptDetail, preferences: live.preferences });
        },
      }),
    };
  };

  /** 让两个工具的存在对齐配置。 */
  const syncTools = () => {
    if (toolsService === null) return;
    const config = current();
    const wanted = new Map();
    if (config.guideTool) wanted.set(GUIDE_TOOL_NAME, () => guideToolDefinition(current));
    if (config.styleCheckTool) wanted.set(CHECK_TOOL_NAME, () => styleCheckToolDefinition(current));
    for (const [toolName, dispose] of toolRegistrations) {
      if (wanted.has(toolName)) continue;
      dispose();
      toolRegistrations.delete(toolName);
    }
    for (const [toolName, makeDefinition] of wanted) {
      if (toolRegistrations.has(toolName)) continue;
      toolRegistrations.set(toolName, toolsService.register(makeDefinition()));
    }
  };

  const syncAll = () => {
    syncPromptSection();
    syncTools();
  };

  ctx.effect(
    () => {
      syncPromptSection();
      return () => {
        promptRegistration?.dispose();
        promptRegistration = null;
      };
    },
    'zh-writing-guide.prompt-section',
  );

  ctx.inject(['tools'], (scoped) => {
    toolsService = scoped.tools;
    scoped.effect(
      () => {
        syncTools();
        return () => {
          for (const dispose of toolRegistrations.values()) dispose();
          toolRegistrations.clear();
        };
      },
      'zh-writing-guide.tools',
    );
  });

  // 配置页由本插件自己的浏览器半包提供（lib/client.js 注册进插件管理页的
  // `plugins.row.config`），所以告诉 settings 不要再按 schema 自动生成一份。
  // settings 服务缺席时（旧部署）静默跳过，插件其余部分照常。
  ctx.inject(['settings'], (scoped) => {
    scoped.effect(
      () => scoped.settings.configure({ auto: false }, ctx.fiber),
      'zh-writing-guide.settings-presentation',
    );
  });

  ctx.on('loader/volatile-update', () => {
    syncAll();
  });
}
