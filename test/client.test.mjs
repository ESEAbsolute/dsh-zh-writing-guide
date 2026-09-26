/**
 * 浏览器半包（lib/client.js）的单元测试：不依赖浏览器与 DSH 运行时，
 * 用手写的 module loader 门面 + 极简 React 替身把 bundle 跑起来。
 *
 *   node --test dsh-zh-writing-guide/test/
 *
 * 覆盖三件事：
 *   1. bundle 形状——`window.__ModuleLoader__.load({id, factory})`、只 require 平台内建模块；
 *   2. 注册面——`plugins.row.config` 的 key 必须是「包名#行 id」，另加包名条目；
 *   3. 表单行为——字段路径与 Host schema 对齐、编辑后按路径提交、非法数字不提交。
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

/** bundle 里声明的包名，必须与 package.json 一致。 */
const PACKAGE_NAME = '@local/dsh-zh-writing-guide';
/** 行 id，等于 cordis.patch.yml 里的 id，也是设置命名空间。 */
const ROW_ID = 'zh-writing-guide';

/**
 * 极简 React 替身：足够跑通"渲染一次 → 触发回调 → 重新渲染"。
 * `useState` 的真实值存在闭包数组里，`useMemo` 每次重算（对测试够用）。
 */
function createFakeReact() {
  const cells = [];
  const React = {
    createElement(type, props, ...children) {
      return { type, props: props ?? {}, children };
    },
    Fragment: Symbol('Fragment'),
    useState(initial) {
      const index = React.__cursor.current++;
      if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial;
      return [
        cells[index],
        (next) => {
          cells[index] = typeof next === 'function' ? next(cells[index]) : next;
        },
      ];
    },
    useMemo(factory) {
      return factory();
    },
    useEffect() {},
    useSyncExternalStore(_subscribe, getSnapshot) {
      return getSnapshot();
    },
    __cursor: { current: 0 },
    __reset() {
      React.__cursor.current = 0;
    },
  };
  return React;
}

/** 展开函数组件，得到一棵只有宿主节点的树，便于查找控件。 */
function renderTree(element, React) {
  React.__reset();
  const expand = (node) => {
    if (node === null || node === undefined || typeof node === 'boolean') return [];
    if (Array.isArray(node)) return node.flatMap(expand);
    if (typeof node === 'string' || typeof node === 'number') return [{ text: String(node) }];
    if (typeof node.type === 'function') return expand(node.type(node.props));
    return [{ type: node.type, props: node.props, children: (node.children ?? []).flatMap(expand) }];
  };
  return expand(element);
}

/** 深度优先查找第一个满足条件的宿主节点。 */
function findNode(nodes, predicate) {
  for (const node of nodes) {
    if (node.type !== undefined && predicate(node)) return node;
    const hit = findNode(node.children ?? [], predicate);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/** 深度优先收集所有纯文本，用来断言提示文案。 */
function textOf(nodes) {
  return nodes.map((node) => (node.text ?? '') + textOf(node.children ?? [])).join('');
}

/**
 * 加载 lib/client.js：装上 module loader 门面与最小 DOM，返回工厂产物。
 * @returns {Promise<{handoff: object, exports: object, specifiers: string[], styleTags: object[], React: object}>}
 */
async function loadClientBundle() {
  const code = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
  const styleTags = [];
  const document = {
    querySelector: () => null,
    createElement: () => ({ dataset: {}, textContent: '' }),
    head: { appendChild: (tag) => styleTags.push(tag) },
  };
  const React = createFakeReact();
  const specifiers = [];
  const modules = new Map([['react', React]]);
  let handoff;
  const window = { __ModuleLoader__: { load: (registration) => { handoff = registration; } } };

  // bundle 是「在 window 作用域里执行的一段脚本」，这里用 Function 复刻同一件事。
  // oxlint 风格：仅测试夹具，不走 eval 语义以外的东西。
  const run = new Function('window', 'document', 'require', code);
  run(window, document, (specifier) => {
    specifiers.push(specifier);
    if (!modules.has(specifier)) throw new Error(`暂不支持的外部模块：${specifier}`);
    return modules.get(specifier);
  });

  assert.ok(handoff, 'bundle 必须调用 window.__ModuleLoader__.load()');
  return { handoff, exports: handoff.factory((specifier) => {
    if (!specifiers.includes(specifier)) specifiers.push(specifier);
    return modules.get(specifier);
  }), specifiers, styleTags, React };
}

/** 记录客户端注册行为的最小 ctx 替身。 */
function fakeClientCtx(snapshot) {
  const recorded = {
    locales: [],
    registrations: [],
    injections: [],
    mutations: [],
    forms: [],
  };
  const form = {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    mutate: async (ops, revision) => {
      recorded.mutations.push({ ops, revision });
      return true;
    },
  };
  return {
    recorded,
    form,
    effect(factory, label) {
      const dispose = factory();
      assert.equal(typeof dispose, 'function', `effect ${label} 必须返回 disposer`);
      return dispose;
    },
    locale: {
      bind: () => (key) => key,
      register(namespace, dicts) {
        recorded.locales.push({ namespace, dicts });
        return () => {};
      },
    },
    configForms: {
      get(namespace) {
        recorded.forms.push(namespace);
        return form;
      },
    },
    slots: {
      inject(name, register) {
        recorded.injections.push(name);
        return register();
      },
      register(options, component) {
        recorded.registrations.push({ ...options, component });
        return () => {};
      },
    },
  };
}

/** 按真实 slots.register(options, component) 语义收集注册项。 */
function collectRegistrations(ctx) {
  const registered = [];
  ctx.slots.register = (options, component) => {
    registered.push({ ...options, component });
    return () => {};
  };
  return registered;
}

/** 字段全默认值的快照，等价于设置命名空间刚被服务时的样子。 */
function readySnapshot(overrides = {}) {
  return {
    status: 'ready',
    value: {
      promptSection: true,
      promptDetail: 'core',
      promptOrder: 15000,
      guideTool: true,
      styleCheckTool: true,
      preferences: { cjkDigitSpacing: true, linkSpacing: true, cornerQuotes: true },
      check: { maxFindings: 200, reportLimit: 40, disabledRules: [] },
      ...overrides,
    },
    base: undefined,
    user: undefined,
    revision: 7,
    writable: true,
    mode: 'host',
  };
}

test('bundle 形状：id 正确、只 require 平台内建模块、注入自己的样式', async () => {
  const { handoff, exports, specifiers, styleTags } = await loadClientBundle();
  assert.equal(handoff.id, PACKAGE_NAME);
  assert.equal(typeof exports.apply, 'function');
  assert.deepEqual(exports.inject, ['slots', 'locale', 'configForms']);
  assert.deepEqual(
    [...new Set(specifiers)].sort(),
    ['react'],
    '浏览器半包只允许 require 平台种子表里的模块',
  );
  assert.equal(styleTags.length, 1, '工厂执行时应注入一份样式');
  assert.equal(styleTags[0].dataset.plugin, PACKAGE_NAME);
  assert.equal(styleTags[0].dataset.pluginCss, `${PACKAGE_NAME}/config.css`);
  assert.ok(styleTags[0].textContent.includes('.dshzwg-card'));
});

test('注册面：行配置 key 为「包名#行 id」，另注册包名条目', async () => {
  const { exports } = await loadClientBundle();
  const ctx = fakeClientCtx(readySnapshot());
  exports.apply(ctx);

  assert.deepEqual(ctx.recorded.forms, [ROW_ID], '设置命名空间就是 profile 行 id');
  assert.deepEqual(ctx.recorded.injections, ['plugins.row.config', 'plugins.bundle.config']);
  const keys = ctx.recorded.registrations.map((entry) => `${entry.name}=${entry.key}`);
  assert.deepEqual(keys, [
    'plugins.row.config=@local/dsh-zh-writing-guide#zh-writing-guide',
    'plugins.bundle.config=@local/dsh-zh-writing-guide',
  ]);
  for (const entry of ctx.recorded.registrations) assert.equal(entry.locale, 'zhWritingGuide');

  const { dicts } = ctx.recorded.locales[0];
  assert.deepEqual(Object.keys(dicts).sort(), ['en', 'zh']);
  assert.deepEqual(
    Object.keys(dicts.zh).sort(),
    Object.keys(dicts.en).sort(),
    '中英文案键必须一一对应',
  );
  assert.ok(dicts.zh.description.includes('中文写作'));
  assert.ok(dicts.en.description.includes('Chinese'));
});

test('字段路径与 Host 半包 Config schema 一一对应', async () => {
  const { exports } = await loadClientBundle();
  const { Config } = await import('../index.js');
  assert.ok(Config, 'Host 半包应当导出 Config（schemastery 可用时）');

  const declared = new Set();
  const walk = (schema, prefix) => {
    const dict = schema.dict ?? {};
    if (Object.keys(dict).length === 0) {
      declared.add(prefix.join('.'));
      return;
    }
    for (const [key, child] of Object.entries(dict)) walk(child, [...prefix, key]);
  };
  walk(Config, []);

  const fromClient = exports.configurationPaths.map((path) => path.join('.'));
  assert.deepEqual(
    [...fromClient].sort(),
    [...declared].sort(),
    '客户端表单字段与 Host schema 的叶子字段必须完全一致',
  );
});

test('表单：渲染全部字段，标签走文案表', async () => {
  const { exports, React } = await loadClientBundle();
  const ctx = fakeClientCtx(readySnapshot());
  const registered = collectRegistrations(ctx);
  exports.apply(ctx);
  assert.equal(registered.length, 2);

  const tree = renderTree(registered[0].component({ view: 'page', t: (key) => key }), React);
  assert.ok(findNode(tree, (node) => node.props['data-plugin-config-form'] === ROW_ID));

  const controls = [];
  const collect = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'input' || node.type === 'textarea' || node.type === 'select') controls.push(node);
      collect(node.children ?? []);
    }
  };
  collect(tree);
  // 段落与工具 5 项 + 个人约定 3 项 + 自检 3 项
  assert.deepEqual(controls.map((node) => node.props.id), [
    'dshzwg-promptSection',
    'dshzwg-promptDetail',
    'dshzwg-promptOrder',
    'dshzwg-guideTool',
    'dshzwg-styleCheckTool',
    'dshzwg-cjkDigitSpacing',
    'dshzwg-linkSpacing',
    'dshzwg-cornerQuotes',
    'dshzwg-maxFindings',
    'dshzwg-reportLimit',
    'dshzwg-disabledRules',
  ]);
  assert.ok(textOf(tree).includes('promptSectionLabel'), '标签走 t() 取文案');
  assert.ok(textOf(tree).includes('writeNote'), '页脚给出写入位置说明');
});

test('表单：编辑复选框后保存，提交 set(path, value) 与读取时的 revision', async () => {
  const { exports, React } = await loadClientBundle();
  const ctx = fakeClientCtx(readySnapshot());
  const registered = collectRegistrations(ctx);
  exports.apply(ctx);

  const t = (key) => key;
  const page = () => renderTree(registered[0].component({ view: 'page', t }), React);

  let tree = page();
  const checkbox = findNode(tree, (node) => node.props.id === 'dshzwg-promptSection');
  assert.ok(checkbox, '应有 promptSection 复选框');
  assert.equal(checkbox.props.checked, true);
  checkbox.props.onChange({ target: { checked: false } });

  tree = page();
  const save = findNode(tree, (node) => node.props.className === 'dshzwg-primary');
  assert.equal(save.props.disabled, false, '有改动时保存按钮可用');
  await save.props.onClick();

  assert.deepEqual(ctx.recorded.mutations, [
    { ops: [{ op: 'set', path: ['promptSection'], value: false }], revision: 7 },
  ]);

  // 保存后再渲染：按钮回到不可用，状态文案变成「已保存」
  tree = page();
  assert.equal(findNode(tree, (node) => node.props.className === 'dshzwg-primary').props.disabled, true);
  assert.ok(textOf(tree).includes('saved'));
});

test('表单：数值非法时不提交，并给出提示', async () => {
  const { exports, React } = await loadClientBundle();
  const ctx = fakeClientCtx(readySnapshot());
  const registered = collectRegistrations(ctx);
  exports.apply(ctx);

  const t = (key) => key;
  const page = () => renderTree(registered[0].component({ view: 'page', t }), React);

  let tree = page();
  const order = findNode(tree, (node) => node.props.id === 'dshzwg-promptOrder');
  order.props.onChange({ target: { value: '不是数字' } });
  tree = page();
  await findNode(tree, (node) => node.props.className === 'dshzwg-primary').props.onClick();

  assert.deepEqual(ctx.recorded.mutations, [], '非法输入不产生写入');
  tree = page();
  assert.ok(textOf(tree).includes('invalidNumber'), '应提示输入非法');

  // 修成合法值后可以正常提交
  tree = page();
  findNode(tree, (node) => node.props.id === 'dshzwg-promptOrder').props.onChange({ target: { value: '30' } });
  tree = page();
  await findNode(tree, (node) => node.props.className === 'dshzwg-primary').props.onClick();
  assert.deepEqual(ctx.recorded.mutations, [
    { ops: [{ op: 'set', path: ['promptOrder'], value: 30 }], revision: 7 },
  ]);
});

test('表单：嵌套对象与字符串数组按路径提交', async () => {
  const { exports, React } = await loadClientBundle();
  const ctx = fakeClientCtx(readySnapshot());
  const registered = collectRegistrations(ctx);
  exports.apply(ctx);

  const t = (key) => key;
  const page = () => renderTree(registered[0].component({ view: 'page', t }), React);

  let tree = page();
  findNode(tree, (node) => node.props.id === 'dshzwg-cornerQuotes').props.onChange({ target: { checked: false } });
  tree = page();
  findNode(tree, (node) => node.props.id === 'dshzwg-disabledRules').props.onChange({
    target: { value: 'spacing-digit-unit, sentence-too-long\n' },
  });
  tree = page();
  await findNode(tree, (node) => node.props.className === 'dshzwg-primary').props.onClick();

  assert.deepEqual(ctx.recorded.mutations, [
    {
      ops: [
        { op: 'set', path: ['preferences', 'cornerQuotes'], value: false },
        { op: 'set', path: ['check', 'disabledRules'], value: ['spacing-digit-unit', 'sentence-too-long'] },
      ],
      revision: 7,
    },
  ]);
});

test('表单：状态不可用时给出说明，而不是渲染空表', async () => {
  const { exports, React } = await loadClientBundle();
  const ctx = fakeClientCtx({ status: 'unavailable', value: undefined, revision: undefined, writable: false, mode: 'memory' });
  const registered = collectRegistrations(ctx);
  exports.apply(ctx);

  const tree = renderTree(registered[0].component({ view: 'page', t: (key) => key }), React);
  assert.ok(textOf(tree).includes('unavailable'));
  assert.equal(findNode(tree, (node) => node.type === 'input'), undefined, '不应渲染任何控件');
});

test('表单：summary 视图只给一行说明', async () => {
  const { exports } = await loadClientBundle();
  const ctx = fakeClientCtx(readySnapshot());
  const registered = collectRegistrations(ctx);
  exports.apply(ctx);
  const summary = registered[0].component({ view: 'summary', t: (key) => key });
  assert.equal(summary, 'description');
});
