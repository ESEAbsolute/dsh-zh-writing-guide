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

const { Config, normalizeConfig, readConfig } = await import('../index.js');
console.log('\n==================== 配置 schema ====================');
if (Config === undefined) {
  console.log('没有解析到 @deepseek-ai/schemastery：插件按 cordis.patch.yml 的静态配置工作，"插件"页不会出现配置表单。');
} else {
  console.log(`volatile 根节点：${Config.meta.volatile === true}（true 表示这一行的字段可以当场改，不重挂插件）`);
  console.log('schema 默认值：');
  console.log(JSON.stringify(Config['~standard'].validate({}).value.get(), null, 2));
  console.log('归一化后的默认值：');
  console.log(JSON.stringify(normalizeConfig(Config['~standard'].validate({}).value), null, 2));
}
// Loader 传进来的是活引用，这里用一个假引用确认读取路径。
const holder = { value: { promptDetail: 'strict', guideTool: false } };
console.log('活引用读取：', JSON.stringify(readConfig({ get: () => holder.value })));

console.log('\n==================== 插件页配置入口 ====================');
console.log('侧栏「插件」→ 已安装 → 中文写作规范 → 行「中文写作规范」右侧箭头，表单由 lib/client.js 注册到：');
console.log('  plugins.row.config   key = @local/dsh-zh-writing-guide#zh-writing-guide');
console.log('  plugins.bundle.config key = @local/dsh-zh-writing-guide（打开插件卡片即可看到）');
console.log('两个入口都读写设置命名空间 "zh-writing-guide"，写入落在当前 profile 的 cordis.patch.yml。');
