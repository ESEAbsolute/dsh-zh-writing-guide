/**
 * 中文写作规范——浏览器半包。
 *
 * 内核按 package.json 的 `dsh.client`（platform: web）扫到本文件，把它随页面下发；
 * 页面里 `window.__ModuleLoader__.load()` 交出工厂，工厂返回 `apply` / `inject`，
 * 于是本插件在浏览器侧也有一根 fiber。这里做三件事：
 *
 *   1. 注册 zh / en 两份文案（`ctx.locale`）；
 *   2. 往插件管理页的 `plugins.row.config` 注册一条 keyed 条目。key 是
 *      `<包名>#<行 id>`（`@local/dsh-zh-writing-guide#zh-writing-guide`，与
 *      cordis.patch.yml 里那一行的 id 一致），页面据此在那行上画「配置」入口；
 *   3. 同时往 `plugins.bundle.config` 注册包名条目，打开插件卡片就能直接看到表单。
 *
 * 配置读写走宿主的 `ctx.configForms`：它的命名空间就是 profile 行 id
 * `zh-writing-guide`，而这个命名空间能被服务，前提正是 Host 半包导出了带
 * `.volatile()` 的 schemastery `Config`（见 index.js）。
 *
 * 本文件是手写的单文件 bundle：只 `require('react')`，不引其它运行时包，因此不需要
 * 构建步骤，也不受 `dsh.client.external` 影响。
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-zh-writing-guide',
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;

    const React = require('react');
    const h = React.createElement;
    const { useMemo, useState } = React;

    /** 包名：既是 Loader 行里的 name，也是插件卡片与 keyed 槽位的键。 */
    const PACKAGE_NAME = '@local/dsh-zh-writing-guide';
    /** 行 id：cordis.patch.yml 的 `- id:`，同时就是设置命名空间。 */
    const ROW_ID = 'zh-writing-guide';
    /** 文案命名空间。 */
    const LOCALE_NS = 'zhWritingGuide';

    /* ---------------------------------------------------------------- 样式 */

    const CSS_TAG_ID = `${PACKAGE_NAME}/config.css`;
    const CSS = [
      '.dshzwg-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:14px;min-width:0}',
      '.dshzwg-groupTitle{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);margin:0}',
      '.dshzwg-group{display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:12px}',
      '.dshzwg-group:first-of-type{border-top:0;padding-top:0}',
      '.dshzwg-fields{display:flex;flex-direction:column;gap:10px}',
      '.dshzwg-field{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.dshzwg-fieldInline{flex-direction:row;align-items:center;gap:8px;flex-wrap:wrap}',
      '.dshzwg-fieldInline .dshzwg-hint{flex-basis:100%;margin:0}',
      '.dshzwg-label{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;cursor:pointer}',
      '.dshzwg-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;margin:0}',
      '.dshzwg-input,.dshzwg-select,.dshzwg-textarea{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:6px 9px;font:inherit;font-size:13px;min-width:0;max-width:320px}',
      '.dshzwg-select{cursor:pointer}',
      '.dshzwg-textarea{width:100%;max-width:100%;min-height:64px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}',
      '.dshzwg-input:focus-visible,.dshzwg-select:focus-visible,.dshzwg-textarea:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}',
      '.dshzwg-check{width:15px;height:15px;accent-color:var(--dsw-alias-button-primary-fill);cursor:pointer;flex:none}',
      '.dshzwg-suffix{color:var(--dsw-alias-label-tertiary);font-size:12px}',
      '.dshzwg-reset{background:none;border:0;color:var(--dsw-alias-link);font:inherit;font-size:12px;cursor:pointer;padding:0}',
      '.dshzwg-reset:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}',
      '.dshzwg-footer{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--dsw-alias-border-l1);padding-top:12px}',
      '.dshzwg-primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border:0;border-radius:7px;padding:6px 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}',
      '.dshzwg-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}',
      '.dshzwg-primary:disabled{opacity:.55;cursor:default}',
      '.dshzwg-ghost{background:none;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);border-radius:7px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}',
      '.dshzwg-ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshzwg-ghost:disabled{opacity:.55;cursor:default}',
      '.dshzwg-status{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '.dshzwg-dirty{color:var(--dsw-alias-state-warn-primary)}',
      '.dshzwg-saved{color:var(--dsw-alias-state-success-primary)}',
      '.dshzwg-error{font-size:12px;color:var(--dsw-alias-state-error-primary);margin:0}',
      '.dshzwg-note{font-size:12px;color:var(--dsw-alias-label-tertiary);margin:0;line-height:1.5}',
    ].join('');
    if (
      typeof document !== 'undefined' &&
      document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_TAG_ID) + ']') === null
    ) {
      const tag = document.createElement('style');
      tag.dataset.plugin = PACKAGE_NAME;
      tag.dataset.pluginCss = CSS_TAG_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    /* ---------------------------------------------------------------- 文案 */

    const DICTS = {
      zh: {
        description: '中文写作与排版规范：system prompt 段落 + 两个工具，可逐项开关。',
        groupPrompt: '段落与工具',
        groupPreferences: '个人约定',
        groupCheck: '自检上限',
        promptSectionLabel: '注册 system prompt 段落',
        promptSectionHint: '关掉后不再向模型注入规范正文，两个工具仍然可用。',
        promptDetailLabel: '段落详细度',
        promptDetailHint: 'core 只给最常用条目；strict 另外带上英文处理与引用规范。',
        promptDetailCore: 'core（默认）',
        promptDetailStrict: 'strict（更全）',
        promptOrderLabel: '段落排序',
        promptOrderHint: '数字越小越靠前；内置段落最大 10200，默认 15000 排在最后。改这里会重新挂载段落。',
        guideToolLabel: '注册 zh_writing_guide 工具',
        guideToolHint: '按主题或关键词取回规范条目与正误示例。',
        styleCheckToolLabel: '注册 zh_style_check 工具',
        styleCheckToolHint: '对成稿做排版自检，返回按行列定位的问题。',
        cjkDigitSpacingLabel: '中文与数字之间加空格',
        cjkDigitSpacingHint: '「花了 5000 元」。上游把这条列为可选项，本部署默认开启。',
        linkSpacingLabel: '链接两侧加空格',
        linkSpacingHint: '「请 [提交一个 issue](#) 并分配」。',
        cornerQuotesLabel: '简体中文用直角引号',
        cornerQuotesHint: '外层「」，内层『』；不用弯引号。',
        maxFindingsLabel: '单次自检最多收集',
        maxFindingsHint: '超出的条目不再收集，报告里会说明被截断。',
        reportLimitLabel: '报告最多列出',
        reportLimitHint: '只影响列出的条数，不影响统计总数。',
        disabledRulesLabel: '额外关闭的规则 id',
        disabledRulesHint: '每行一个，例如 spacing-digit-unit；空表示不额外关闭。',
        disabledRulesPlaceholder: 'spacing-digit-unit',
        save: '保存',
        saving: '保存中……',
        saved: '已保存',
        dirty: '有未保存的改动',
        discard: '放弃改动',
        resetDefault: '恢复默认',
        loading: '正在读取配置……',
        unavailable: '这一行暂时没有配置通道：请确认插件行已开启，且运行时提供 settings 服务。',
        readOnly: '本部署的配置为只读，表单不会写入。',
        saveFailed: '运行时没有接受这些值，已保留供你修改。',
        invalidNumber: '请填非负整数。',
        writeNote: '改动写入当前 profile 的 cordis.patch.yml，无需重启。',
      },
      en: {
        description: 'Chinese writing and typography rules: a system prompt section plus two tools, each switchable.',
        groupPrompt: 'Section and tools',
        groupPreferences: 'House conventions',
        groupCheck: 'Check limits',
        promptSectionLabel: 'Register the system prompt section',
        promptSectionHint: 'Switched off, the rules no longer enter the model context; both tools stay available.',
        promptDetailLabel: 'Section detail',
        promptDetailHint: 'core carries the most used entries; strict adds English handling and citation rules.',
        promptDetailCore: 'core (default)',
        promptDetailStrict: 'strict (fuller)',
        promptOrderLabel: 'Section order',
        promptOrderHint: 'Lower numbers come first; built-in sections reach 10200, so 15000 sits last. Changing this remounts the section.',
        guideToolLabel: 'Register the zh_writing_guide tool',
        guideToolHint: 'Look up rules, correct and incorrect examples by topic or keyword.',
        styleCheckToolLabel: 'Register the zh_style_check tool',
        styleCheckToolHint: 'Check a draft for typography problems with line and column positions.',
        cjkDigitSpacingLabel: 'Space between Chinese and digits',
        cjkDigitSpacingHint: 'As in 「花了 5000 元」. Upstream lists this as optional; this deployment enables it.',
        linkSpacingLabel: 'Space around links',
        linkSpacingHint: 'As in 「请 [提交一个 issue](#) 并分配」.',
        cornerQuotesLabel: 'Corner quotes in Simplified Chinese',
        cornerQuotesHint: 'Outer 「」, inner 『』; never curly quotes.',
        maxFindingsLabel: 'Findings collected per check',
        maxFindingsHint: 'Further findings are not collected; the report says it was truncated.',
        reportLimitLabel: 'Findings listed in the report',
        reportLimitHint: 'Changes the list length only, never the totals.',
        disabledRulesLabel: 'Additional rule ids to disable',
        disabledRulesHint: 'One per line, for example spacing-digit-unit; empty disables nothing extra.',
        disabledRulesPlaceholder: 'spacing-digit-unit',
        save: 'Save',
        saving: 'Saving…',
        saved: 'Saved',
        dirty: 'Unsaved changes',
        discard: 'Discard',
        resetDefault: 'Reset to default',
        loading: 'Reading configuration…',
        unavailable: 'This row has no configuration channel right now: check that the plugin row is on and the runtime serves the settings service.',
        readOnly: 'This deployment stores configuration read-only; the form cannot write.',
        saveFailed: 'The runtime did not accept these values; they were left for you to correct.',
        invalidNumber: 'Enter a non-negative integer.',
        writeNote: 'Writes go to the active profile cordis.patch.yml; no restart needed.',
      },
    };

    /* -------------------------------------------------------------- 字段表 */

    /** 数字输入用的非负整数解析。 */
    function parseCount(raw) {
      const text = String(raw).trim();
      if (!/^\d+$/.test(text)) return null;
      const value = Number(text);
      return Number.isSafeInteger(value) ? value : null;
    }

    /**
     * 表单字段：`path` 必须与 Host 半包 Config schema 里的字段一一对应，写操作按路径提交。
     * `kind` 决定控件与解析：boolean 复选框、select 下拉、number 非负整数、lines 字符串数组。
     */
    const SECTIONS = [
      {
        titleKey: 'groupPrompt',
        fields: [
          {
            key: 'promptSection', path: ['promptSection'], kind: 'boolean',
            labelKey: 'promptSectionLabel', hintKey: 'promptSectionHint', fallback: true,
          },
          {
            key: 'promptDetail', path: ['promptDetail'], kind: 'select',
            labelKey: 'promptDetailLabel', hintKey: 'promptDetailHint', fallback: 'core',
            options: [
              { value: 'core', labelKey: 'promptDetailCore' },
              { value: 'strict', labelKey: 'promptDetailStrict' },
            ],
          },
          {
            key: 'promptOrder', path: ['promptOrder'], kind: 'number',
            labelKey: 'promptOrderLabel', hintKey: 'promptOrderHint', fallback: 15000, suffixKey: null,
          },
          {
            key: 'guideTool', path: ['guideTool'], kind: 'boolean',
            labelKey: 'guideToolLabel', hintKey: 'guideToolHint', fallback: true,
          },
          {
            key: 'styleCheckTool', path: ['styleCheckTool'], kind: 'boolean',
            labelKey: 'styleCheckToolLabel', hintKey: 'styleCheckToolHint', fallback: true,
          },
        ],
      },
      {
        titleKey: 'groupPreferences',
        fields: [
          {
            key: 'cjkDigitSpacing', path: ['preferences', 'cjkDigitSpacing'], kind: 'boolean',
            labelKey: 'cjkDigitSpacingLabel', hintKey: 'cjkDigitSpacingHint', fallback: true,
          },
          {
            key: 'linkSpacing', path: ['preferences', 'linkSpacing'], kind: 'boolean',
            labelKey: 'linkSpacingLabel', hintKey: 'linkSpacingHint', fallback: true,
          },
          {
            key: 'cornerQuotes', path: ['preferences', 'cornerQuotes'], kind: 'boolean',
            labelKey: 'cornerQuotesLabel', hintKey: 'cornerQuotesHint', fallback: true,
          },
        ],
      },
      {
        titleKey: 'groupCheck',
        fields: [
          {
            key: 'maxFindings', path: ['check', 'maxFindings'], kind: 'number',
            labelKey: 'maxFindingsLabel', hintKey: 'maxFindingsHint', fallback: 200,
          },
          {
            key: 'reportLimit', path: ['check', 'reportLimit'], kind: 'number',
            labelKey: 'reportLimitLabel', hintKey: 'reportLimitHint', fallback: 40,
          },
          {
            key: 'disabledRules', path: ['check', 'disabledRules'], kind: 'lines',
            labelKey: 'disabledRulesLabel', hintKey: 'disabledRulesHint',
            placeholderKey: 'disabledRulesPlaceholder', fallback: [],
          },
        ],
      },
    ];

    /** 扁平字段表，供保存时按 key 找路径。 */
    const FIELDS = SECTIONS.flatMap((section) => section.fields);
    const FIELD_BY_KEY = new Map(FIELDS.map((field) => [field.key, field]));

    /* -------------------------------------------------------------- 小工具 */

    /** 读取嵌套路径。 */
    function readPath(value, path) {
      let node = value;
      for (const key of path) {
        if (node === null || typeof node !== 'object') return undefined;
        node = node[key];
      }
      return node;
    }

    /** 把值摊平成可比较的文本，用于判断「改过没有」。 */
    function sameValue(left, right) {
      const a = JSON.stringify(left === undefined ? null : left);
      const b = JSON.stringify(right === undefined ? null : right);
      return a === b;
    }

    /** 控件里的显示值。 */
    function displayValue(field, value) {
      const current = value === undefined ? field.fallback : value;
      if (field.kind === 'lines') return Array.isArray(current) ? current.join('\n') : '';
      if (field.kind === 'boolean') return current === true;
      return current === undefined || current === null ? '' : String(current);
    }

    /** 把草稿解析成要写入的值；非法输入返回 null。 */
    function parseDraft(field, draft) {
      if (field.kind === 'boolean') return draft === true;
      if (field.kind === 'number') return parseCount(draft);
      if (field.kind === 'lines') {
        return String(draft)
          .split(/[\s,，]+/)
          .map((entry) => entry.trim())
          .filter((entry) => entry !== '');
      }
      return String(draft);
    }

    /** 订阅宿主表单：优先用 useSyncExternalStore，React 17 退回 effect + 强制重渲染。 */
    const useStore = typeof React.useSyncExternalStore === 'function'
      ? function useStore(subscribe, getSnapshot) {
        return React.useSyncExternalStore(subscribe, getSnapshot);
      }
      : function useStoreFallback(subscribe, getSnapshot) {
        const [, force] = useState(0);
        React.useEffect(() => subscribe(() => { force((tick) => tick + 1) }), [subscribe]);
        return getSnapshot();
      };

    /** 把宿主 ConfigForm 的订阅面接成 React 快照。 */
    function useFormSnapshot(source) {
      const subscribe = useMemo(() => (onChange) => source.subscribe(onChange), [source]);
      const getSnapshot = useMemo(() => () => source.getSnapshot(), [source]);
      return useStore(subscribe, getSnapshot);
    }

    /* ---------------------------------------------------------------- 组件 */

    /** 一个字段：控件 + 标签 + 说明 + 「恢复默认」。 */
    function Field(props) {
      const { field, t, value, draft, disabled, onChange, onReset } = props;
      const inputId = `dshzwg-${field.key}`;
      const overridden = !sameValue(value, field.fallback);
      const reset = overridden
        ? h('button', {
          type: 'button', className: 'dshzwg-reset', disabled,
          onClick: () => { onReset(field) },
        }, t('resetDefault'))
        : null;

      if (field.kind === 'boolean') {
        return h('div', { className: 'dshzwg-field dshzwg-fieldInline' },
          h('input', {
            id: inputId, className: 'dshzwg-check', type: 'checkbox',
            checked: draft === true, disabled,
            onChange: (event) => { onChange(field, event.target.checked) },
          }),
          h('label', { className: 'dshzwg-label', htmlFor: inputId }, t(field.labelKey)),
          reset,
          h('p', { className: 'dshzwg-hint' }, t(field.hintKey)),
        );
      }

      let control;
      if (field.kind === 'select') {
        control = h('select', {
          id: inputId, className: 'dshzwg-select', value: draft, disabled,
          onChange: (event) => { onChange(field, event.target.value) },
        }, field.options.map((option) => h('option', { key: option.value, value: option.value }, t(option.labelKey))));
      } else if (field.kind === 'number') {
        control = h('input', {
          id: inputId, className: 'dshzwg-input', type: 'number', min: 0, step: 1,
          value: draft, disabled,
          onChange: (event) => { onChange(field, event.target.value) },
        });
      } else {
        control = h('textarea', {
          id: inputId, className: 'dshzwg-textarea', value: draft, disabled, rows: 3,
          placeholder: field.placeholderKey === undefined ? '' : t(field.placeholderKey),
          onChange: (event) => { onChange(field, event.target.value) },
        });
      }

      return h('div', { className: 'dshzwg-field' },
        h('label', { className: 'dshzwg-label', htmlFor: inputId }, t(field.labelKey)),
        control,
        h('p', { className: 'dshzwg-hint' },
          t(field.hintKey),
          reset === null ? null : ' ',
          reset),
      );
    }

    /**
     * 配置卡片：读宿主表单快照，草稿只放在本地 state，点保存才按路径整体提交。
     * @param props.t 本插件命名空间的翻译函数
     * @param props.source 宿主 `ctx.configForms.get('zh-writing-guide')`
     */
    function ConfigCard(props) {
      const { t, source } = props;
      const state = useFormSnapshot(source);
      const [edits, setEdits] = useState({});
      const [saving, setSaving] = useState(false);
      const [failure, setFailure] = useState(null);
      const [saved, setSaved] = useState(false);

      if (state.status === 'loading') {
        return h('div', { className: 'dshzwg-card' }, h('p', { className: 'dshzwg-note' }, t('loading')));
      }
      if (state.status !== 'ready') {
        return h('div', { className: 'dshzwg-card' }, h('p', { className: 'dshzwg-note' }, t('unavailable')));
      }

      const value = state.value ?? {};
      const writable = state.writable !== false;
      const disabled = !writable || saving;
      const dirty = Object.keys(edits).length > 0;
      const readOnly = writable ? null : h('p', { className: 'dshzwg-note' }, t('readOnly'));

      /** 当前显示值：优先草稿，其次宿主快照。 */
      const shownOf = (field) => Object.prototype.hasOwnProperty.call(edits, field.key)
        ? edits[field.key]
        : displayValue(field, readPath(value, field.path));

      const edit = (field, raw) => {
        setSaved(false);
        setFailure(null);
        setEdits((previous) => ({ ...previous, [field.key]: raw }));
      };

      const applyResult = (accepted) => {
        if (accepted) {
          setEdits({});
          setSaved(true);
          setFailure(null);
        } else {
          setFailure(t('saveFailed'));
        }
      };

      const save = async () => {
        const ops = [];
        for (const [key, draft] of Object.entries(edits)) {
          const field = FIELD_BY_KEY.get(key);
          if (field === undefined) continue;
          const parsed = parseDraft(field, draft);
          if (parsed === null) {
            setFailure(t('invalidNumber'));
            return;
          }
          if (sameValue(parsed, readPath(value, field.path))) continue;
          ops.push({ op: 'set', path: field.path, value: parsed });
        }
        if (ops.length === 0) {
          setEdits({});
          setSaved(true);
          return;
        }
        setSaving(true);
        setFailure(null);
        try {
          applyResult(await source.mutate(ops, state.revision));
        } catch (error) {
          setFailure(t('saveFailed'));
        } finally {
          setSaving(false);
        }
      };

      const reset = async (field) => {
        setSaving(true);
        setFailure(null);
        try {
          const accepted = await source.mutate([{ op: 'unset', path: field.path }], state.revision);
          if (accepted) {
            setEdits((previous) => {
              const next = { ...previous };
              delete next[field.key];
              return next;
            });
          }
          applyResult(accepted);
        } catch (error) {
          setFailure(t('saveFailed'));
        } finally {
          setSaving(false);
        }
      };

      const status = saving
        ? h('span', { className: 'dshzwg-status' }, t('saving'))
        : dirty
          ? h('span', { className: 'dshzwg-status dshzwg-dirty' }, t('dirty'))
          : saved
            ? h('span', { className: 'dshzwg-status dshzwg-saved' }, t('saved'))
            : h('span', { className: 'dshzwg-status' }, t('writeNote'));

      return h('div', { className: 'dshzwg-card', 'data-plugin-config-form': ROW_ID },
        readOnly,
        SECTIONS.map((section) => h('section', { className: 'dshzwg-group', key: section.titleKey },
          h('h4', { className: 'dshzwg-groupTitle' }, t(section.titleKey)),
          h('div', { className: 'dshzwg-fields' }, section.fields.map((field) => h(Field, {
            key: field.key,
            field,
            t,
            value: readPath(value, field.path),
            draft: shownOf(field),
            disabled,
            onChange: edit,
            onReset: reset,
          }))),
        )),
        failure === null ? null : h('p', { className: 'dshzwg-error', role: 'alert' }, failure),
        h('div', { className: 'dshzwg-footer' },
          h('button', {
            type: 'button', className: 'dshzwg-primary',
            disabled: disabled || !dirty, onClick: () => { void save() },
          }, t('save')),
          h('button', {
            type: 'button', className: 'dshzwg-ghost',
            disabled: disabled || !dirty,
            onClick: () => { setEdits({}); setSaved(false); setFailure(null) },
          }, t('discard')),
          status,
        ),
      );
    }

    /* --------------------------------------------------------------- 注册 */

    /** 需要的服务：槽位、文案、宿主配置表单。 */
    const inject = ['slots', 'locale', 'configForms'];

    /**
     * 挂上两条配置入口。keyed 槽位的 key 规则见 ui-plugin-manager 的 rowConfigKey：
     * `<包名>#<行 id>`；包名条目则直接以包名为 key，出现在插件卡片页。
     * @param ctx 浏览器侧插件上下文
     */
    function apply(ctx) {
      const bound = ctx.locale.bind(LOCALE_NS);
      ctx.effect(() => ctx.locale.register(LOCALE_NS, DICTS), 'zh-writing-guide: dictionaries');

      const source = ctx.configForms.get(ROW_ID);
      // 槽位渲染时会注入本命名空间的 `t`；万一宿主没给，退回自己绑定的翻译函数。
      const translate = (props) => (typeof props.t === 'function' ? props.t : bound);

      ctx.effect(() => ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
        name: 'plugins.row.config',
        key: `${PACKAGE_NAME}#${ROW_ID}`,
        locale: LOCALE_NS,
      }, (props) => (props.view === 'summary'
        ? translate(props)('description')
        : h(ConfigCard, { t: translate(props), source })))), 'zh-writing-guide: row configuration');

      ctx.effect(() => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
        name: 'plugins.bundle.config',
        key: PACKAGE_NAME,
        locale: LOCALE_NS,
      }, (props) => h(ConfigCard, { t: translate(props), source }))), 'zh-writing-guide: package configuration');
    }

    exports.apply = apply;
    exports.inject = inject;
    // 诊断与测试用：字段路径必须与 Host 半包 Config schema 一一对应，Loader 不读它。
    exports.configurationPaths = FIELDS.map((field) => field.path);
    return module.exports;
  },
});
