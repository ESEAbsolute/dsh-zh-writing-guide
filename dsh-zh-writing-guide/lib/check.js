/**
 * 中文排版自检引擎。
 *
 * 只覆盖可以机械判定的规则，因此会先屏蔽代码块、行内代码、URL、邮箱、
 * Markdown 链接目标与 HTML 标签，避免在代码上误报。
 * 每条规则都标注 severity：error 是明确违反规范，warn 是规范建议，
 * info 是两份规范口径不一致、只能提示风格统一。
 *
 * @module dsh-zh-writing-guide/check
 */

const MASK = '\uE000';

/** 需要屏蔽的非正文区域，按顺序应用。 */
const MASKERS = [
  /```[\s\S]*?```/g,
  /~~~[\s\S]*?~~~/g,
  /`[^`\n]*`/g,
  /\bhttps?:\/\/[^\s<>()[\]「」，。；]+/g,
  /\bwww\.[^\s<>()[\]「」，。；]+/g,
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  // 链接目标保留 `]`（用后行断言），这样 `[锚文本]` + 掩码仍是可识别的链接形态，
  // spacing-link 才能同时覆盖「代码块里的链接不检查」与「检查锚文本两侧空格」。
  /(?<=\])\([^)\n]*\)/g,
  /<\/?[A-Za-z][^<>\n]{0,200}>/g,
];

/** 半角标点 → 全角标点。 */
const FULLWIDTH = new Map([
  [',', '，'],
  ['.', '。'],
  [':', '：'],
  [';', '；'],
  ['!', '！'],
  ['?', '？'],
  ['(', '（'],
  [')', '）'],
]);

/** 数字后需要空格的单位符号（不含度数与百分号，它们不加空格）。 */
const UNITS = new Set([
  'KB', 'MB', 'GB', 'TB', 'PB',
  'Kbps', 'Mbps', 'Gbps', 'bps',
  'GHz', 'MHz', 'kHz', 'Hz',
  'kg', 'g', 'mg', 'km', 'm', 'cm', 'mm',
  'ms', 'ns', 'min', 'h', 's',
  'W', 'kW', 'V', 'mA', 'mAh', 'dpi', 'ppi', 'px',
]);

const HAN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
const LATIN = /[A-Za-z]/;
const DIGIT = /[0-9]/;
const PUNCT = new Set([',', '.', ':', ';', '!', '?', '(', ')']);

/** 屏蔽非正文区域，保持字符串长度与换行位置不变，便于回算行列号。 */
function maskProse(text) {
  let masked = text;
  for (const pattern of MASKERS) {
    masked = masked.replace(pattern, (match) => MASK.repeat(match.length));
  }
  return masked;
}

function isHan(ch) {
  return ch !== undefined && ch !== MASK && HAN.test(ch);
}

function isLatin(ch) {
  return ch !== undefined && LATIN.test(ch);
}

function isDigit(ch) {
  return ch !== undefined && DIGIT.test(ch);
}

/** 计算 0 基索引对应的行列号（1 基）。 */
function locate(text, index) {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
      lineStart = i + 1;
    }
  }
  return { line, column: index - lineStart + 1, lineStart };
}

/** 取出该索引所在行的可读文本。 */
function lineOf(text, lineStart) {
  let end = text.indexOf('\n', lineStart);
  if (end < 0) end = text.length;
  const raw = text.slice(lineStart, end).trim();
  return raw.length > 160 ? `${raw.slice(0, 160)}…` : raw;
}

/** 估算一段文本的「字数」：汉字按 1 字，英文/数字词按 1 字。 */
function measure(segment) {
  const han = (segment.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) ?? []).length;
  const words = (segment.match(/[A-Za-z0-9][A-Za-z0-9._-]*/g) ?? []).length;
  return han + words;
}

function hasHan(line) {
  return HAN.test(line);
}

/**
 * 执行一次自检。
 * @param {string} text 待检查文本
 * @param {{disabledRules?: readonly string[], maxFindings?: number}} [options]
 * @returns {{findings: Array<object>, scannedChars: number, maskedChars: number, truncated: boolean}}
 */
export function checkText(text, options = {}) {
  const disabled = new Set(options.disabledRules ?? []);
  const maxFindings = Number.isFinite(options.maxFindings) ? options.maxFindings : 200;
  const findings = [];
  const seen = new Set();

  if (typeof text !== 'string' || text.trim() === '') {
    return { findings, scannedChars: 0, maskedChars: 0, truncated: false };
  }

  const masked = maskProse(text);
  let maskedChars = 0;
  for (let i = 0; i < masked.length; i++) if (masked[i] === MASK) maskedChars += 1;

  const add = (rule, severity, index, message, suggestion) => {
    if (disabled.has(rule)) return;
    const key = `${rule}@${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (findings.length >= maxFindings) return;
    const { line, column, lineStart } = locate(text, index);
    findings.push({ rule, severity, line, column, message, suggestion, context: lineOf(text, lineStart) });
  };

  // ── 空格：中英文、中文数字、数字单位 ────────────────────────────────
  for (let i = 0; i + 1 < masked.length; i++) {
    const a = masked[i];
    const b = masked[i + 1];
    if (a === MASK || b === MASK) continue;
    if (isHan(a) && isLatin(b)) {
      add('spacing-cjk-latin', 'error', i + 1, '中文与英文之间缺少空格', `在「${a}」与「${b}」之间插入一个半角空格`);
    } else if (isLatin(a) && isHan(b)) {
      add('spacing-cjk-latin', 'error', i + 1, '英文与中文之间缺少空格', `在「${a}」与「${b}」之间插入一个半角空格`);
    } else if (isHan(a) && isDigit(b)) {
      add('spacing-cjk-digit', 'error', i + 1, '中文与数字之间缺少空格', `在「${a}」与「${b}」之间插入一个半角空格（个人约定：一律加空格）`);
    } else if (isDigit(a) && isHan(b)) {
      add('spacing-cjk-digit', 'error', i + 1, '数字与中文之间缺少空格', `在「${a}」与「${b}」之间插入一个半角空格（个人约定：一律加空格）`);
    }
  }

  // ── 空格：链接锚文本与相邻中文 ─────────────────────────────────────
  // maskProse 用后行断言把 `(url)` 换成等长掩码、保留 `]`，因此 `[锚文本]` + 掩码
  // 就是一条链接，且代码块、行内代码里的链接天然被排除。
  for (const match of masked.matchAll(/\[[^\]\n]*\]\uE000/gu)) {
    const start = match.index ?? 0;
    let end = start + match[0].length;
    while (end < masked.length && masked[end] === MASK) end += 1;
    const before = masked[start - 1];
    const after = masked[end];
    if (before !== undefined && isHan(before)) {
      add('spacing-link', 'warn', start, '链接锚文本前缺少空格', '在链接前插入一个半角空格（个人约定）');
    }
    if (after !== undefined && isHan(after)) {
      add('spacing-link', 'warn', end, '链接锚文本后缺少空格', '在链接后插入一个半角空格（个人约定）');
    }
  }

  // ── 空格：数字与单位 ───────────────────────────────────────────────
  const unitRe = /(\d+(?:[.,]\d+)?)([A-Za-z]{1,4})(?![\p{L}\p{N}])/gu;
  for (const match of masked.matchAll(unitRe)) {
    const number = match[1];
    const unit = match[2];
    if (number === undefined || unit === undefined || !UNITS.has(unit)) continue;
    const at = match.index ?? 0;
    const before = masked.slice(Math.max(0, at - 12), at);
    if (!hasHan(before + masked.slice(at, at + 24))) continue;
    if (at > 0 && /[\p{L}\p{N}.]/.test(masked[at - 1] ?? '')) continue;
    add('spacing-digit-unit', 'warn', at + number.length, `数字与单位「${unit}」之间缺少空格`, `写作 ${number} ${unit}`);
  }

  // ── 空格：全角标点前后不加空格 ─────────────────────────────────────
  for (const match of masked.matchAll(/[ \t]+([，。！？；：、）】》」』…—])/g)) {
    const at = (match.index ?? 0) + match[0].length - 1;
    add('spacing-fullwidth-punct', 'error', at, '全角标点前不应有空格', `删除「${match[1]}」前的空格`);
  }
  for (const match of masked.matchAll(/([（【《「『])[ \t]+/g)) {
    add('spacing-fullwidth-punct', 'error', match.index ?? 0, '全角标点后不应有空格', `删除「${match[1]}」后的空格`);
  }
  for (const match of masked.matchAll(/([，。！？；：、])[ \t]+(?=[^ \t\r\n])/g)) {
    const at = match.index ?? 0;
    add('spacing-fullwidth-punct', 'error', at, '全角标点后不应有空格', `删除「${match[1]}」后的空格`);
  }

  // ── 标点：中文语句应使用全角标点 ───────────────────────────────────
  for (let i = 0; i < masked.length; i++) {
    const ch = masked[i];
    if (ch === undefined || !PUNCT.has(ch)) continue;
    let prev = i - 1;
    while (prev >= 0 && masked[prev] === ' ') prev -= 1;
    let next = i + 1;
    while (next < masked.length && masked[next] === ' ') next += 1;
    const prevCh = masked[prev];
    const nextCh = masked[next];
    if (!isHan(prevCh) && !isHan(nextCh)) continue;
    if ((ch === ',' || ch === '.') && isDigit(masked[i - 1]) && isDigit(masked[i + 1])) continue;
    if (ch === '.' && (isDigit(masked[i - 1]) || isDigit(masked[i + 1]))) continue;
    if (ch === '.' && (masked[i - 1] === '.' || masked[i + 1] === '.')) continue;
    if (ch === ':' && isDigit(masked[i - 1]) && isDigit(masked[i + 1])) continue;
    const full = FULLWIDTH.get(ch);
    const extra = ch === ',' ? '；并列词语之间应使用顿号（、）' : '';
    add('punct-fullwidth', 'error', i, `中文语句中的半角标点「${ch}」`, `改为全角「${full}」${extra}`);
  }

  // ── 标点：不重复使用 ───────────────────────────────────────────────
  for (const match of masked.matchAll(/[！？!?]{2,}|。{2,}/g)) {
    add('punct-repeat', 'error', match.index ?? 0, '重复使用了标点符号', `只保留一个标点：${match[0].trim().slice(0, 8)}`);
  }

  // ── 标点：省略号 ───────────────────────────────────────────────────
  for (const match of masked.matchAll(/\.{3,}/g)) {
    add('punct-ellipsis', 'error', match.index ?? 0, '使用了英文省略号或非标准省略号', '中文省略号写作 ……（两个省略号字符，共六点）');
  }
  for (const match of masked.matchAll(/(?:…|⋯)(?!(?:…|⋯))/g)) {
    add('punct-ellipsis', 'error', match.index ?? 0, '省略号只写了一个字符', '中文省略号占两个汉字宽度，写作 ……');
  }

  // ── 标点：并列词语用顿号 ───────────────────────────────────────────
  {
    let lineStart = 0;
    for (const line of masked.split('\n')) {
      if (hasHan(line)) {
        const matches = [...line.matchAll(/[A-Za-z0-9]，[ \t]*[A-Za-z0-9]/g)];
        if (matches.length >= 2) {
          for (const match of matches) {
            add(
              'punct-enumeration',
              'warn',
              lineStart + (match.index ?? 0),
              '英文并列词语之间使用了全角逗号',
              '中文并列词语用顿号（、），英文并列词语用半角逗号（,）',
            );
          }
        }
      }
      lineStart += line.length + 1;
    }
  }

  // ── 标点：点号不出现在行首、标题末尾 ───────────────────────────────
  for (const match of masked.matchAll(/^[ \t]*([，。！？；：、])/gm)) {
    add('punct-line-start', 'warn', (match.index ?? 0) + match[0].length - 1, '点号出现在行首', `把「${match[1]}」移到上一行行末`);
  }
  for (const match of masked.matchAll(/^#{1,6}[ \t][^\n]*?([，。、；：])[ \t]*$/gm)) {
    add('punct-heading-end', 'warn', (match.index ?? 0) + match[0].length - 1, '标题末尾出现点号', '点号不出现在标题末尾（引号、括号、叹号、问号等标号可以）');
  }

  // ── 全角数字与全角字母 ─────────────────────────────────────────────
  for (const match of masked.matchAll(/[\uFF10-\uFF19]/g)) {
    add('width-fullwidth-digit', 'error', match.index ?? 0, '使用了全角阿拉伯数字', `改为半角 ${String.fromCharCode(match[0].charCodeAt(0) - 0xFEE0)}`);
  }
  for (const match of masked.matchAll(/[\uFF21-\uFF3A\uFF41-\uFF5A\uFF06]/g)) {
    add('width-fullwidth-latin', 'warn', match.index ?? 0, '使用了全角英文或全角「＆」', '英文内容使用半角字符');
  }

  // ── 标点：简体中文使用直角引号 ─────────────────────────────────────
  // 只查弯双引号：弯单引号 ’ 与英文撇号同形，查它会大量误报。
  for (const match of masked.matchAll(/[“”]/g)) {
    add('punct-quote-style', 'warn', match.index ?? 0, '使用了弯引号', '简体中文改用直角引号：外层「」，内层『』（个人约定）');
  }

  // ── 数值：变化程度 ─────────────────────────────────────────────────
  for (const match of masked.matchAll(/(?:降低|减少)(?:了|到)?\s*(?:\d+|[零一二三四五六七八九十百千万两]+)\s*倍/g)) {
    add('number-change-multiple', 'error', match.index ?? 0, '使用了「降低/减少 N 倍」的表示法', '改用「降低百分之几」或「减少百分之几」');
  }

  // ── 句子：长句 ─────────────────────────────────────────────────────
  {
    let lineStart = 0;
    for (const line of masked.split('\n')) {
      if (line.length > 45 && hasHan(line)) {
        for (const clause of line.split(/[。！？；!?;]+/)) {
          for (const segment of clause.split(/[，,、]/)) {
            const count = measure(segment);
            if (count > 40 && !disabled.has('sentence-too-long')) {
              const at = lineStart + Math.max(0, line.indexOf(segment));
              add('sentence-too-long', 'warn', at, `句子构件过长（约 ${count} 字）`, '单个构件最好 20 字以内，超过 40 字不可接受；拆成短句');
            }
          }
          if (measure(clause) > 100) {
            add('sentence-too-long', 'warn', lineStart, `逗号分隔的长句过长（约 ${measure(clause)} 字）`, '总长度不应超过 100 字或正文的 3 行');
          }
        }
      }
      lineStart += line.length + 1;
    }
  }

  findings.sort((a, b) => a.line - b.line || a.column - b.column);
  return {
    findings,
    scannedChars: text.length,
    maskedChars,
    truncated: findings.length >= maxFindings,
  };
}

const ORDER = { error: 0, warn: 1, info: 2 };
const LABEL = { error: 'error', warn: 'warn', info: 'info' };

/**
 * 把自检结果渲染成给人（和模型）读的报告。
 * @param {{findings: Array<object>, scannedChars: number, maskedChars: number, truncated: boolean}} result
 * @param {{limit?: number}} [options]
 * @returns {string}
 */
export function renderCheckReport(result, options = {}) {
  const limit = options.limit ?? 40;
  const { findings } = result;
  if (findings.length === 0) {
    return `中文排版自检通过：未发现可机械判定的问题（检查 ${result.scannedChars} 字符，已跳过 ${result.maskedChars} 字符的代码/链接区域）。`;
  }
  const counts = { error: 0, warn: 0, info: 0 };
  for (const finding of findings) counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
  const lines = [
    `中文排版自检：发现 ${findings.length} 处可疑（error ${counts.error} / warn ${counts.warn} / info ${counts.info}）`,
    `检查 ${result.scannedChars} 字符，已跳过 ${result.maskedChars} 字符的代码块、行内代码与链接。`,
    '',
  ];
  const shown = [...findings]
    .sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.line - b.line || a.column - b.column)
    .slice(0, limit);
  shown.forEach((finding, index) => {
    lines.push(`${index + 1}. 第 ${finding.line} 行第 ${finding.column} 列 [${LABEL[finding.severity]}] ${finding.rule} · ${finding.message}`);
    if (finding.context !== '') lines.push(`   > ${finding.context}`);
    lines.push(`   修正：${finding.suggestion}`);
    lines.push('');
  });
  if (findings.length > shown.length) lines.push(`（其余 ${findings.length - shown.length} 处已省略）`);
  return lines.join('\n').trimEnd();
}
