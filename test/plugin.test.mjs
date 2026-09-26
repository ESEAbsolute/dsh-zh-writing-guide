/**
 * 插件单元测试：不依赖 DSH 运行时，直接用 node --test 跑。
 * 用一个假的 ctx 记录 systemPrompt / tools 的注册调用。
 *
 *   node --test dsh-zh-writing-guide/test/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { apply, normalizeConfig } from '../index.js';
import {
  buildGuideText,
  DEFAULT_PREFERENCES,
  disabledPreferenceRules,
  PREFERENCES,
  RULES_BY_ID,
  TOPICS,
  TOPIC_BY_ID,
} from '../lib/guidelines.js';
import { buildPromptSection } from '../lib/prompt.js';
import { CHECK_RULE_IDS, checkText, renderCheckReport } from '../lib/check.js';

/** 记录注册行为的最小 ctx 替身。 */
function fakeCtx() {
  const recorded = { sections: [], tools: [], effects: 0, injected: [] };
  const scoped = {
    effect(factory, label) {
      recorded.effects += 1;
      const dispose = factory();
      assert.equal(typeof dispose, 'function', `effect ${label} 必须返回 disposer`);
      return dispose;
    },
    tools: {
      register(definition) {
        recorded.tools.push(definition);
        return () => {};
      },
    },
  };
  return {
    recorded,
    effect(factory, label) {
      recorded.effects += 1;
      const dispose = factory();
      assert.equal(typeof dispose, 'function', `effect ${label} 必须返回 disposer`);
      return dispose;
    },
    systemPrompt: {
      section(section) {
        recorded.sections.push(section);
        return () => {};
      },
    },
    inject(deps, callback) {
      recorded.injected.push(deps);
      callback(scoped);
      return { dispose() {} };
    },
  };
}

test('规范数据集自洽：id 唯一、来源合法、规则非空', () => {
  const topicIds = new Set();
  for (const topic of TOPICS) {
    assert.ok(!topicIds.has(topic.id), `主题 id 重复：${topic.id}`);
    topicIds.add(topic.id);
    assert.ok(topic.rules.length > 0, `主题 ${topic.id} 没有规则`);
    for (const rule of topic.rules) {
      assert.match(rule.id, /^[a-z0-9-]+$/, `规则 id 不合法：${rule.id}`);
      assert.ok(rule.rule.trim().length > 0, `规则 ${rule.id} 缺少正文`);
      assert.ok(RULES_BY_ID.has(rule.id), `规则 ${rule.id} 未进索引`);
    }
  }
});

test('个人约定与规范数据一一对应', () => {
  assert.equal(PREFERENCES.length, 3);
  for (const preference of PREFERENCES) {
    const rule = RULES_BY_ID.get(preference.ruleId);
    assert.ok(rule, `个人约定指向不存在的规则：${preference.ruleId}`);
    assert.equal(rule.preference, true, `规则 ${preference.ruleId} 必须标记 preference`);
    assert.ok(rule.notes.some((note) => note.includes('个人约定')), `规则 ${preference.ruleId} 应说明这是个人约定`);
  }
  const marked = [...RULES_BY_ID.values()].filter((rule) => rule.preference === true);
  assert.equal(marked.length, PREFERENCES.length, '被标记的规则数应与个人约定数一致');
});

test('个人约定的规则 id 必须同时是规范条目 id 与自检规则 id', () => {
  // 这条断言防住过一类真 bug：规范条目叫 punct-quotes、自检规则叫 punct-quote-style，
  // 结果关闭个人约定时自检规则并没有被关掉。
  assert.deepEqual(
    Object.keys(DEFAULT_PREFERENCES).sort(),
    PREFERENCES.map((entry) => entry.key).sort(),
  );
  for (const preference of PREFERENCES) {
    assert.ok(RULES_BY_ID.has(preference.ruleId), `规范数据里没有 ${preference.ruleId}`);
    assert.ok(
      CHECK_RULE_IDS.includes(preference.ruleId),
      `自检规则里没有 ${preference.ruleId}，关闭个人约定时会静默失效`,
    );
    assert.equal(typeof preference.whenOff?.rule, 'string', `${preference.ruleId} 缺少 whenOff.rule`);
  }
  assert.deepEqual(disabledPreferenceRules({}), []);
  assert.deepEqual(
    disabledPreferenceRules({ cjkDigitSpacing: false, linkSpacing: true, cornerQuotes: false }).sort(),
    ['punct-quotes', 'spacing-cjk-digit'],
  );
});

test('工具参数 schema 落在 Harness 支持的 JSON Schema 子集内', () => {
  const ctx = fakeCtx();
  apply(ctx, {});
  assert.equal(ctx.recorded.tools.length, 2);

  const supported = new Set(['type', 'oneOf', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const', 'description', 'title', 'default', 'examples']);
  const walk = (node, path) => {
    assert.equal(typeof node, 'object', `${path} 必须是对象`);
    for (const key of Object.keys(node)) assert.ok(supported.has(key), `${path}.${key} 不受支持`);
    if (node.properties) for (const [key, child] of Object.entries(node.properties)) walk(child, `${path}.properties.${key}`);
    if (node.items) walk(node.items, `${path}.items`);
  };
  for (const tool of ctx.recorded.tools) {
    walk(tool.parameters, `${tool.name}.parameters`);
    walk(tool.output.schema, `${tool.name}.output.schema`);
    assert.equal(typeof tool.output.render, 'function');
    assert.equal(typeof tool.execute, 'function');
  }
});

test('工具返回值与其 output.schema 一致', async () => {
  const ctx = fakeCtx();
  apply(ctx, {});
  const [guide, check] = ctx.recorded.tools;

  const guideValue = await guide.execute({ topic: 'punctuation' });
  assert.deepEqual(Object.keys(guideValue), ['text']);
  assert.ok(guideValue.text.includes('punct-ellipsis'));
  assert.equal(guide.output.render({}, guideValue)[0].type, 'text');

  const checkValue = await check.execute({ text: '在LeanCloud上，數據儲存是圍繞`AVObject`進行的。' });
  assert.deepEqual(Object.keys(checkValue), ['text']);

  await assert.rejects(() => check.execute({ text: '   ' }), /非空/);
  await assert.rejects(() => guide.execute({ topic: '不存在的主题' }), /未知主题/);
});

test('prompt 段落包含核心约束且不含全量条目', () => {
  const core = buildPromptSection();
  assert.ok(core.includes('# 中文写作与排版规范'));
  assert.ok(core.includes('10 Gbps'));
  assert.ok(core.includes('……'));
  const strict = buildPromptSection({ detail: 'strict' });
  assert.ok(strict.length > core.length);
  assert.ok(strict.includes('U.S.A.'));
});

test('个人约定默认全部开启，prompt 里三项都在', () => {
  const core = buildPromptSection();
  assert.ok(core.includes('中文与数字之间一律加一个半角空格'));
  assert.ok(core.includes('链接锚文本与相邻中文之间各加一个空格'));
  assert.ok(core.includes('简体中文用直角引号'));
  assert.ok(core.includes('本部署启用的个人约定'));
});

test('逐项关闭个人约定：prompt 条目消失，且不影响其他条', () => {
  const digitOff = buildPromptSection({ preferences: { cjkDigitSpacing: false } });
  assert.ok(!digitOff.includes('中文与数字之间一律加一个半角空格'), '数字条目应消失');
  assert.ok(digitOff.includes('中文与英文之间一律加一个半角空格'), '中英文条目应保留');
  assert.ok(digitOff.includes('链接锚文本与相邻中文之间各加一个空格'), '其他个人约定应保留');

  const linkOff = buildPromptSection({ preferences: { linkSpacing: false } });
  assert.ok(!linkOff.includes('链接锚文本与相邻中文之间各加一个空格'));
  assert.ok(linkOff.includes('中文与数字之间一律加一个半角空格'));

  const quoteOff = buildPromptSection({ preferences: { cornerQuotes: false } });
  assert.ok(!quoteOff.includes('简体中文用直角引号'));
  assert.ok(quoteOff.includes('不重复使用标点'), '同组的非个人约定条目应保留');
});

test('全部关闭个人约定时 prompt 明确说明回落上游口径', () => {
  const core = buildPromptSection({
    preferences: { cjkDigitSpacing: false, linkSpacing: false, cornerQuotes: false },
  });
  assert.ok(core.includes('本部署未启用个人约定'));
  assert.ok(!core.includes('本部署启用的个人约定'));
  assert.ok(core.includes('中文语句用全角标点'), '普通条目不受影响');
});

test('配置归一化：非法值回落，默认开启全部能力', () => {
  const defaults = normalizeConfig(undefined);
  assert.equal(defaults.promptSection, true);
  assert.equal(defaults.promptDetail, 'core');
  assert.equal(defaults.promptOrder, 15000);
  assert.equal(defaults.guideTool, true);
  assert.equal(defaults.styleCheckTool, true);
  assert.deepEqual(defaults.preferences, { cjkDigitSpacing: true, linkSpacing: true, cornerQuotes: true });
  assert.deepEqual(defaults.check.disabledRules, []);

  const custom = normalizeConfig({
    promptSection: false,
    promptDetail: 'strict',
    promptOrder: 30,
    guideTool: 'yes',
    preferences: { linkSpacing: false, cornerQuotes: 'no', 未知项: false },
    check: { disabledRules: ['spacing-cjk-digit', 42], maxFindings: Number.NaN },
  });
  assert.equal(custom.promptSection, false);
  assert.equal(custom.promptDetail, 'strict');
  assert.equal(custom.promptOrder, 30);
  assert.equal(custom.guideTool, true, '非布尔值回落为默认 true');
  assert.deepEqual(custom.preferences, { cjkDigitSpacing: true, linkSpacing: false, cornerQuotes: true });
  assert.deepEqual(custom.check.disabledRules, ['spacing-cjk-digit']);
  assert.equal(custom.check.maxFindings, 200);
});

test('个人约定贯通到两个工具：关闭后查询与自检同步生效', async () => {
  const off = fakeCtx();
  apply(off, { preferences: { cjkDigitSpacing: false, linkSpacing: false, cornerQuotes: false } });
  const [offGuide, offCheck] = off.recorded.tools;

  // prompt 段落
  const prompt = off.recorded.sections[0].text();
  assert.ok(prompt.includes('本部署未启用个人约定'));
  assert.ok(!prompt.includes('链接锚文本与相邻中文之间各加一个空格'));

  // 规范目录点名已关闭项
  const index = await offGuide.execute({});
  assert.ok(index.text.includes('已关闭：cjkDigitSpacing（spacing-cjk-digit）'), index.text.slice(0, 400));
  assert.ok(index.text.includes('个人约定：全部关闭'));

  // 条目换回上游口径，且不再标注「个人约定」
  const spacing = await offGuide.execute({ topic: 'spacing' });
  assert.ok(spacing.text.includes('加不加半角空格都可以'));
  assert.ok(spacing.text.includes('属个人风格，两种写法都正确'));
  assert.ok(!spacing.text.includes('口径：个人约定'));

  const punct = await offGuide.execute({ topic: 'punctuation' });
  assert.ok(punct.text.includes('引号内再用引号时外层双引号、内层单引号'));
  assert.ok(!punct.text.includes('不使用弯引号'));

  // 自检：三条规则全部静默，并在报告里点名（点名行本身含规则 id，所以要匹配条目格式）
  const report = await offCheck.execute({
    text: '这是2011年发布的版本，请[提交一个 issue](#)并分配，他认为核心是“友好”。',
  });
  for (const rule of ['spacing-cjk-digit', 'spacing-link', 'punct-quotes']) {
    assert.ok(!report.text.includes(`] ${rule} ·`), `不应报出 ${rule}：${report.text}`);
  }
  assert.ok(
    report.text.includes('已按配置关闭：spacing-cjk-digit、spacing-link、punct-quotes'),
    report.text,
  );

  // 同样的文本，默认（全开）时报出三条规则
  const on = fakeCtx();
  apply(on, {});
  const [, onCheck] = on.recorded.tools;
  const onReport = await onCheck.execute({
    text: '这是2011年发布的版本，请[提交一个 issue](#)并分配，他认为核心是“友好”。',
  });
  for (const rule of ['spacing-cjk-digit', 'spacing-link', 'punct-quotes']) {
    assert.ok(onReport.text.includes(rule), `默认应报出 ${rule}`);
  }
});

test('关闭开关后不再注册对应能力', () => {
  const ctx = fakeCtx();
  apply(ctx, { promptSection: false, guideTool: false, styleCheckTool: false });
  assert.equal(ctx.recorded.sections.length, 0);
  assert.equal(ctx.recorded.tools.length, 0);
  assert.equal(ctx.recorded.injected.length, 0);

  const only = fakeCtx();
  apply(only, { guideTool: false });
  assert.equal(only.recorded.tools.length, 1);
  assert.equal(only.recorded.tools[0].name, 'zh_style_check');
});

test('规范查询：目录、主题、关键词三条路径', () => {
  const index = buildGuideText();
  assert.ok(index.text.includes('spacing'));
  assert.ok(index.text.includes('structure'));
  assert.equal(index.matched, TOPICS.reduce((total, topic) => total + topic.rules.length, 0));

  const topic = buildGuideText({ topic: 'numbers' });
  assert.ok(topic.text.includes('number-thousands'));
  assert.ok(topic.text.includes('降低到百分之八十'));

  const summary = buildGuideText({ topic: 'numbers', detail: 'summary' });
  assert.ok(!summary.text.includes('降低到百分之八十'), 'summary 不应带示例');

  const search = buildGuideText({ query: '省略号' });
  assert.ok(search.matched >= 1);
  assert.ok(search.text.includes('punct-ellipsis'));

  const miss = buildGuideText({ query: '不存在的关键词xyz' });
  assert.equal(miss.matched, 0);
  assert.ok(miss.text.includes('没有规则命中'));
});

test('自检：中英文空格', () => {
  const { findings } = checkText('在LeanCloud上，數據儲存是圍繞`AVObject`進行的。');
  const rules = findings.map((finding) => finding.rule);
  assert.ok(rules.includes('spacing-cjk-latin'));
  assert.ok(!rules.includes('punct-fullwidth'), '全角标点不应被误判');
});

test('自检：代码块与行内代码不误报', () => {
  const text = '示例：\n\n```js\nconst a=1; 中文english\n```\n\n以及 `中文english` 和 https://example.com/中文english 都不该报。';
  const { findings } = checkText(text);
  assert.equal(findings.length, 0, `不应有发现，实际：${JSON.stringify(findings)}`);
});

test('自检：全角数字、重复标点、省略号、降低 N 倍', () => {
  const { findings } = checkText('这件商品的价格是１０００元！！\n\n就这样...\n\n降低了三倍。');
  const rules = new Set(findings.map((finding) => finding.rule));
  assert.ok(rules.has('width-fullwidth-digit'));
  assert.ok(rules.has('punct-repeat'));
  assert.ok(rules.has('punct-ellipsis'));
  assert.ok(rules.has('number-change-multiple'));
});

test('自检：全角标点旁的冗余空格', () => {
  const { findings } = checkText('刚买了一个 iPhone ，好开心！\n\n刚买了一个 iPhone， 好开心！');
  const spaced = findings.filter((finding) => finding.rule === 'spacing-fullwidth-punct');
  assert.equal(spaced.length, 2, `应报 2 处，实际 ${spaced.length}`);
});

test('自检：中文与数字之间一律要求空格（个人约定）', () => {
  const { findings } = checkText('2011年5月15日，我订购了5台笔记本电脑。');
  const digit = findings.filter((finding) => finding.rule === 'spacing-cjk-digit');
  assert.ok(digit.length >= 3, `应逐处报告，实际 ${digit.length}`);
  assert.ok(digit.every((finding) => finding.severity === 'error'), '个人约定下不加空格即为错误');

  const ok = checkText('2011 年 5 月 15 日，我订购了 5 台笔记本电脑。');
  assert.ok(!ok.findings.some((finding) => finding.rule === 'spacing-cjk-digit'), '加空格后不应报告');
});

test('自检：链接锚文本与相邻中文的空格（个人约定）', () => {
  const bad = checkText('请[提交一个 issue](#)并分配给相关同事。');
  const link = bad.findings.filter((finding) => finding.rule === 'spacing-link');
  assert.equal(link.length, 2, `前后各应报一处，实际 ${link.length}`);

  const good = checkText('请 [提交一个 issue](#) 并分配给相关同事。');
  assert.ok(!good.findings.some((finding) => finding.rule === 'spacing-link'), '已加空格不应报告');

  const punctuation = checkText('参考[写作规范](#)，然后继续。');
  assert.equal(
    punctuation.findings.filter((finding) => finding.rule === 'spacing-link').length,
    1,
    '链接后紧跟全角标点只报前面一处',
  );

  const inCode = checkText('```md\n请[提交一个 issue](#)并分配。\n```\n');
  assert.ok(!inCode.findings.some((finding) => finding.rule === 'spacing-link'), '代码块里的链接不该报');
});

test('自检：简体中文使用直角引号（个人约定）', () => {
  const curly = checkText('他认为客户服务的核心是“友好”和“专业”。');
  const hits = curly.findings.filter((finding) => finding.rule === 'punct-quotes');
  assert.equal(hits.length, 4, `两对弯引号共四处，实际 ${hits.length}`);

  const corner = checkText('他认为客户服务的核心是「友好」和「专业」。');
  assert.ok(!corner.findings.some((finding) => finding.rule === 'punct-quotes'), '直角引号不应报告');

  const apostrophe = checkText('One man’s constant is another man’s variable。');
  assert.ok(!apostrophe.findings.some((finding) => finding.rule === 'punct-quotes'), '英文撇号不是弯引号问题');
});

test('自检：命中全角标点、单位空格与长句', () => {
  const { findings } = checkText(
    '核磁共振成像 (NMRI) 是什麼原理都不知道? JFGI!\n\n' +
      '我家的光纤入屋宽带有 10Gbps，SSD 一共有 20TB。\n\n' +
      '本产品适用于从由一台服务器进行动作控制的单一节点结构到由多台服务器进行动作控制的并行处理程序结构等多种体系结构。',
  );
  const rules = new Set(findings.map((finding) => finding.rule));
  assert.ok(rules.has('punct-fullwidth'));
  assert.ok(rules.has('spacing-digit-unit'));
  assert.ok(rules.has('sentence-too-long'));
});

test('自检：可以按规则 id 关闭', () => {
  const text = '在LeanCloud上进行测试。';
  const on = checkText(text);
  assert.ok(on.findings.some((finding) => finding.rule === 'spacing-cjk-latin'));
  const off = checkText(text, { disabledRules: ['spacing-cjk-latin'] });
  assert.ok(!off.findings.some((finding) => finding.rule === 'spacing-cjk-latin'));
});

test('自检：行列号指向原文位置', () => {
  const { findings } = checkText('第一行。\n第二行有English混排。');
  const hit = findings.find((finding) => finding.rule === 'spacing-cjk-latin');
  assert.ok(hit, '应命中中英文混排');
  assert.equal(hit.line, 2);
  assert.ok(hit.context.includes('第二行'));
});

test('报告渲染：通过态与问题态', () => {
  const clean = renderCheckReport(checkText('这是一段完全规范的中文。'));
  assert.ok(clean.includes('自检通过'));

  const dirty = renderCheckReport(checkText('在LeanCloud上进行测试。'), { limit: 5 });
  assert.ok(dirty.includes('spacing-cjk-latin'));
  assert.ok(dirty.includes('修正：'));
});

test('每个主题都能渲染出完整内容', () => {
  for (const topic of TOPICS) {
    const { text } = buildGuideText({ topic: topic.id });
    assert.ok(text.includes(topic.title), `主题 ${topic.id} 渲染缺失标题`);
    for (const rule of topic.rules) assert.ok(text.includes(rule.id), `主题 ${topic.id} 渲染缺失规则 ${rule.id}`);
    assert.ok(TOPIC_BY_ID.has(topic.id));
  }
});
