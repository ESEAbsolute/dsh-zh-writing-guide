/**
 * 中文写作规范 —— DeepSeek Harness Host 插件。
 *
 * 把《中文文案排版指北》与《中文技术文档的写作规范》做成 Harness 的一等能力：
 *   1. 在 system prompt 中注册一段「中文写作与排版规范」核心约束；
 *   2. 注册 `zh_writing_guide` 工具，按主题或关键词查询完整条目与正误示例；
 *   3. 注册 `zh_style_check` 工具，对成稿做可机械判定的排版自检。
 *
 * 本文件刻意只依赖相对路径模块与 Node 内置能力：profile 的 node_modules
 * 里没有 `@deepseek-ai/*` 运行时包，任何跨包 import 都会在加载期报
 * ERR_MODULE_NOT_FOUND。因此不导出 schemastery 的 `Config`，配置在
 * {@link normalizeConfig} 里做宽松归一化，键名含义见 README 与 cordis.patch.yml。
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

/** 工具返回值 schema：`{ text: string }`。 */
const TEXT_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: { text: { type: 'string' } },
};

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
 * 宽松归一化配置：非法值回落到默认值，而不是让整行插件挂掉。
 * @param {unknown} raw `cordis.patch.yml` 里该行的 `config`
 * @returns {{promptSection: boolean, promptDetail: 'core'|'strict', promptOrder: number,
 *   guideTool: boolean, styleCheckTool: boolean, preferences: Record<string, boolean>,
 *   check: {maxFindings: number, reportLimit: number, disabledRules: string[]}}}
 */
export function normalizeConfig(raw) {
  const input = asObject(raw);
  const check = asObject(input.check);
  return {
    promptSection: asBoolean(input.promptSection, true),
    promptDetail: input.promptDetail === 'strict' ? 'strict' : 'core',
    promptOrder: asNumber(input.promptOrder, DEFAULT_PROMPT_ORDER),
    guideTool: asBoolean(input.guideTool, true),
    styleCheckTool: asBoolean(input.styleCheckTool, true),
    preferences: normalizePreferences(input.preferences),
    check: {
      maxFindings: asNumber(check.maxFindings, 200),
      reportLimit: asNumber(check.reportLimit, 40),
      disabledRules: asStringList(check.disabledRules),
    },
  };
}

/**
 * `zh_writing_guide` 的工具定义。
 * @param {ReturnType<typeof normalizeConfig>} config 归一化后的插件配置
 */
function guideToolDefinition(config) {
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
      const { text } = buildGuideText({ topic, query, detail, preferences: config.preferences });
      return { text };
    },
  };
}

/**
 * `zh_style_check` 的工具定义。
 * @param {ReturnType<typeof normalizeConfig>} config 归一化后的插件配置
 */
function styleCheckToolDefinition(config) {
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
 * 注册 prompt 段落与两个工具。
 * @param {import('@deepseek-ai/cordis').Context} ctx 插件上下文
 * @param {unknown} rawConfig 该行的 `config`
 */
export function apply(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig);

  if (config.promptSection) {
    ctx.effect(
      () =>
        ctx.systemPrompt.section({
          name: PROMPT_SECTION_NAME,
          order: config.promptOrder,
          text: () => buildPromptSection({ detail: config.promptDetail, preferences: config.preferences }),
        }),
      'zh-writing-guide.prompt-section',
    );
  }

  if (config.guideTool || config.styleCheckTool) {
    ctx.inject(['tools'], (scoped) => {
      if (config.guideTool) {
        scoped.effect(() => scoped.tools.register(guideToolDefinition(config)), 'zh-writing-guide.tool.guide');
      }
      if (config.styleCheckTool) {
        scoped.effect(
          () => scoped.tools.register(styleCheckToolDefinition(config)),
          'zh-writing-guide.tool.style-check',
        );
      }
    });
  }
}
