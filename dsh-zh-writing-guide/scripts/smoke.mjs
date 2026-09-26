/**
 * 开发用冒烟脚本：打印 prompt 段落、规范查询输出和自检报告，
 * 用来肉眼确认输出质量（不参与运行时）。
 *
 *   node dsh-zh-writing-guide/scripts/smoke.mjs
 */
import { buildGuideText, disabledPreferenceRules } from '../lib/guidelines.js';
import { buildPromptSection } from '../lib/prompt.js';
import { checkText, renderCheckReport } from '../lib/check.js';

const SAMPLE = [
  '# 快速上手（Quick Start）',
  '',
  '本产品适用于从由一台服务器进行动作控制的单一节点结构到由多台服务器进行动作控制的并行处理程序结构等多种体系结构。',
  '',
  '在LeanCloud上，數據儲存是圍繞 `AVObject` 進行的。今天出去買菜花了5000元。',
  '',
  '我家的光纖入屋寬頻有 10Gbps，SSD 一共有 20TB。角度為 90° ，新 MacBook Pro 有 15% 的性能提升。',
  '',
  '这件商品的价格是１０００元！！就这样...降低了三倍。',
  '',
  '我最欣赏的科技公司有 Google, Facebook, 腾讯, 阿里和百度等。',
  '',
  '请确认以下几项内容： 时间、地点、活动名称和来宾数量。',
  '',
  '更多信息见 https://example.com/中文english 或运行 `npm run 中文english`。',
  '',
  '这是2011年发布的版本，请[提交一个 issue](#)并分配给相关同事，他认为客户服务的核心是“友好”。',
  '',
  '```bash',
  'echo 中文english 100Gbps',
  '```',
  '',
  '参考 图 1-1，以及 2009 年～2011 年 的数据。',
].join('\n');

console.log('==================== system prompt 段落（core，个人约定全开） ====================');
console.log(buildPromptSection());
console.log(`\n（core ${buildPromptSection().length} 字符 / strict ${buildPromptSection({ detail: 'strict' }).length} 字符）`);

const ALL_OFF = { cjkDigitSpacing: false, linkSpacing: false, cornerQuotes: false };
console.log('\n==================== 个人约定全关时的差异 ====================');
const on = buildPromptSection();
const off = buildPromptSection({ preferences: ALL_OFF });
console.log(`core ${on.length} → ${off.length} 字符`);
console.log(off.split('\n').filter((line) => line.includes('个人约定')).join('\n'));

console.log('\n==================== 规范目录（截断） ====================');
console.log(buildGuideText().text.split('\n').slice(0, 14).join('\n'));

console.log('\n==================== 个人约定关闭后的条目回落 ====================');
const offTopic = buildGuideText({ topic: 'spacing', preferences: { cjkDigitSpacing: false, linkSpacing: false } });
console.log(offTopic.text.split('\n').filter((line) => line.startsWith('###') || line.startsWith('规则：')).join('\n'));

console.log('\n==================== 关键词查询：省略号 ====================');
console.log(buildGuideText({ query: '省略号' }).text);

console.log('\n==================== 自检报告（全开） ====================');
console.log(renderCheckReport(checkText(SAMPLE)));

console.log('\n==================== 自检报告（个人约定全关） ====================');
const disabled = disabledPreferenceRules(ALL_OFF);
console.log(
  renderCheckReport(checkText(SAMPLE, { disabledRules: disabled }), { offRules: disabled }),
);
