/**
 * system prompt 段落文本的组装。
 *
 * 只在 system prompt 里放「高频、可执行」的核心约束；完整条目留给
 * `zh_writing_guide` 工具按需查询，避免每轮请求都付出全量 token 成本。
 *
 * @module dsh-zh-writing-guide/prompt
 */

import { activePreferences, normalizePreferences } from './guidelines.js';

/** 来源标注（进入 prompt，帮助模型在需要时追溯原文）。 */
export const PROMPT_SOURCES =
  '《中文文案排版指北》(github.com/sparanoid/chinese-copywriting-guidelines) 与 ' +
  '《中文技术文档的写作规范》(github.com/ruanyf/document-style-guide)';

/**
 * 核心规则。分组只影响展示，不影响语义。
 * 带 `preference` 的条目由对应的个人约定开关控制：关闭时该条整体不出现在 prompt 里，
 * 上游对这些写法本身就允许两种口径，不必再占用每轮请求的 token。
 *
 * @type {ReadonlyArray<{heading: string, items: readonly ({text: string, preference?: string} | string)[]}>}
 */
export const CORE_RULES = [
  {
    heading: '空格与字符',
    items: [
      '中文与英文之间一律加一个半角空格（在 LeanCloud 上、围绕 `AVObject` 进行）。',
      {
        preference: 'cjkDigitSpacing',
        text: '中文与数字之间一律加一个半角空格（花了 5000 元、2011 年 5 月）。',
      },
      '数字与单位之间加空格（10 Gbps、20 TB、16 GB），但度数和百分号不加（90°、15%）。',
      {
        preference: 'linkSpacing',
        text: '链接锚文本与相邻中文之间各加一个空格（请 [提交一个 issue](#) 并分配）。',
      },
      '全角标点前后不加空格（买了一个 iPhone，好开心）。',
      '阿拉伯数字一律半角（1000 元，不是 １０００ 元）；专有名词保留官方大小写（GitHub、TypeScript、Next.js），不用 Ts、h5、RJS 这类不地道缩写。',
    ],
  },
  {
    heading: '标点符号',
    items: [
      '中文语句用全角标点；整句为英文时该句用半角标点。',
      {
        preference: 'cornerQuotes',
        text: '简体中文用直角引号：外层「」，内层『』；不使用弯引号（“ ”‘ ’）。',
      },
      '不重复使用标点（不用 ！！、？？、！？）；感叹号尽量少用。',
      '省略号用 ……（六点、占两个字），不与「等」连用，不用 ... 或 。。。',
      '并列词语用顿号（Google、Facebook、腾讯），最后一个可用「和」连接。',
      '句末用括号加注时，句号写在括号之外；点号不出现在行首，也不出现在标题末尾。',
      '数值范围用 ～ 或 —（2009 年～2011 年），两端都带单位；复合名词与图表编号用 -（图 1-1）。',
    ],
  },
  {
    heading: '句子',
    items: [
      '避免长句：单句或以逗号分隔的构件最好 20 字以内，超过 40 字不可接受；逗号分隔的长句总长不超过 100 字。',
      '多用简单句、并列句与肯定句，避免复合句、否定句、双重否定与被动语态。',
      '不使用非正式语气，不用冷僻、生造或文言词语；名称前不要堆砌形容词。',
      '用对「的／地／得」；代词必须指代明确。',
    ],
  },
  {
    heading: '段落与文档',
    items: [
      '一段只讲一个主题，中心句放段首；段落不超过七行（最佳四行以内）；段间空一行，段首不缩进；用陈述肯定语气。',
      '标题最多四级，层级不跳级（一级标题下不直接出现三级），避免同级只有一个标题的孤立编号，子标题不与父标题同名。',
      '文件名不含空格、只用半角小写，多个单词用连字符（advanced-usage.md）。',
      '引用第三方内容注明出处；转载在开头注明作者与出处；外部图片标明来源。',
    ],
  },
  {
    heading: '数值',
    items: [
      '千位以上加千分号（1,258,000，四位数可选）；货币写作 $1,000 或 1,000 美元。',
      '区分「增加了／增加到」「降低了／降低到」；不说「降低 N 倍」，要说「降低百分之几」。',
    ],
  },
];

/**
 * 渲染注入 system prompt 的段落文本。
 * @param {{ detail?: 'core' | 'strict', preferences?: unknown }} [options]
 *   `core`（默认）只给高频约束；`strict` 额外追加英文处理与引用规范。
 *   `preferences` 是三个个人约定开关；关闭的项其条目不再进入 prompt。
 * @returns {string}
 */
export function buildPromptSection(options = {}) {
  const preferences = normalizePreferences(options.preferences);
  const groups = options.detail === 'strict' ? [...CORE_RULES, ...STRICT_RULES] : CORE_RULES;
  const lines = [
    '# 中文写作与排版规范',
    `撰写或修改任何中文内容（回复、文档、注释、提交信息、文案）时遵守以下规则。完整条目可用工具 zh_writing_guide 按主题或关键词查询，成稿可用 zh_style_check 自检。规范来源：${PROMPT_SOURCES}。`,
    '',
  ];
  const active = activePreferences(preferences);
  if (active.length > 0) {
    lines.push(`本部署启用的个人约定（覆盖上游规范中的可选项与争议项）：${active.map((entry) => entry.title).join('；')}。`, '');
  } else {
    lines.push('本部署未启用个人约定，完全按两份上游规范的原始口径执行。', '');
  }
  for (const group of groups) {
    const items = group.items
      .filter((item) => typeof item === 'string' || preferences[item.preference] !== false)
      .map((item) => (typeof item === 'string' ? item : item.text));
    if (items.length === 0) continue;
    lines.push(`## ${group.heading}`);
    for (const item of items) lines.push(`- ${item}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

/** `detail: 'strict'` 时额外注入的规则。 */
export const STRICT_RULES = [
  {
    heading: '英文处理',
    items: [
      '英文复数译为中文时还原单数；外文缩写用半角圆点（U.S.A.、Apple, Inc.）。',
      '中文里的省略号用 ……；英文书名或电影名改用中文表达时用书名号《》。',
      '英文词汇首次出现时在括号中给出中文标注，此后可直接使用缩写。',
      '专有名词每个词首字母大写，非专有名词不大写。',
    ],
  },
  {
    heading: '引用与出处',
    items: [
      '引用他人内容必须注明出处；全篇转载在开头显著位置注明作者与出处并链接原文。',
      '使用外部图片在图片下方或文末标明来源。',
    ],
  },
];
