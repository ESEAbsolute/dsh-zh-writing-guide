/**
 * 中文写作规范数据集。
 *
 * 内容整理自两份公开规范：
 *   - 《中文文案排版指北》 https://github.com/sparanoid/chinese-copywriting-guidelines
 *   - 《中文技术文档的写作规范》 https://github.com/ruanyf/document-style-guide
 *
 * 本文件是纯数据 + 纯函数，不依赖任何 DSH / Cordis 包，因此可以单独测试。
 * 每条规则保留规范原文口径，并在 sources 冲突时用 `conflict` 字段显式说明。
 *
 * @module dsh-zh-writing-guide/guidelines
 */

/** 两份上游规范的元信息。 */
export const SOURCES = {
  copywriting: {
    id: 'copywriting',
    title: '中文文案排版指北',
    repo: 'https://github.com/sparanoid/chinese-copywriting-guidelines',
    about: '统一中文文案与排版的用法：空格、标点、全形半形、名词大小写。',
  },
  docs: {
    id: 'docs',
    title: '中文技术文档的写作规范',
    repo: 'https://github.com/ruanyf/document-style-guide',
    about: '技术文档的标题、文本、段落、数值、标点符号与文档体系。',
  },
};

/**
 * 全部规范条目。
 * @type {ReadonlyArray<{id: string, title: string, sources: string[], summary: string,
 *   rules: ReadonlyArray<{id: string, title: string, rule: string,
 *     right?: string[], wrong?: string[], notes?: string[]}>}>}
 */
export const TOPICS = [
  {
    id: 'spacing',
    title: '空格与字间距',
    sources: ['copywriting', 'docs'],
    summary: '中文与英文、数字之间的空格；数字与单位之间的空格；链接两侧的空格；全角标点前后不加空格。',
    rules: [
      {
        id: 'spacing-cjk-latin',
        title: '中英文之间加空格',
        rule: '全角中文字符与半角英文字符之间，应有一个半角空格。',
        right: ['在 LeanCloud 上，数据存储是围绕 `AVObject` 进行的。'],
        wrong: ['在LeanCloud上，数据存储是围绕`AVObject`进行的。', '在 LeanCloud上，数据存储是围绕`AVObject` 进行的。'],
        notes: ['例外：依据官方定义格式书写的产品名，如「豆瓣FM」。'],
      },
      {
        id: 'spacing-cjk-digit',
        title: '中文与数字之间加空格',
        preference: true,
        rule: '全角中文字符与半角阿拉伯数字之间，一律加一个半角空格。',
        right: ['今天出去买菜花了 5000 元。', '2011 年 5 月 15 日，我订购了 5 台笔记本电脑与 10 台平板电脑。'],
        wrong: ['今天出去买菜花了 5000元。', '今天出去买菜花了5000元。', '2011年5月15日'],
        notes: [
          '本插件的个人约定：《中文文案排版指北》要求必须加空格；《中文技术文档的写作规范》认为加不加都可以，只要全文统一即可。这里选定前者，即一律加空格，不加即判为错误。',
        ],
      },
      {
        id: 'spacing-digit-unit',
        title: '数字与单位之间加空格',
        rule: '英文单位若不翻译，单位前的阿拉伯数字与单位符号之间应留出空隙。',
        right: ['我家的光纤入屋宽带有 10 Gbps，SSD 一共有 20 TB。', '一部容量为 16 GB 的智能手机。', '1 h = 60 min = 3,600 s'],
        wrong: ['我家的光纤入屋宽带有 10Gbps，SSD 一共有 20TB。'],
        notes: ['例外：度数和百分号与数字之间不加空格——90°、15%。'],
      },
      {
        id: 'spacing-fullwidth-punct',
        title: '全角标点与其他字符之间不加空格',
        rule: '全角标点符号的前后都不加空格。',
        right: ['刚刚买了一部 iPhone，好开心！'],
        wrong: ['刚刚买了一部 iPhone ，好开心！', '刚刚买了一部 iPhone， 好开心！', '他的电脑是 MacBook Air 。'],
      },
      {
        id: 'spacing-link',
        title: '超链接前后增加空格',
        preference: true,
        rule: '链接的锚文本与相邻中文之间，各加一个半角空格。',
        right: ['请 [提交一个 issue](#) 并分配给相关同事。', '访问我们网站的最新动态，请 [点击这里](#) 进行订阅！', '参考 [写作规范](#) 一节。'],
        wrong: ['请[提交一个 issue](#)并分配给相关同事。', '访问我们网站的最新动态，请[点击这里](#)进行订阅！'],
        notes: [
          '本插件的个人约定：上游两份规范都把它列为个人风格（遵循与否语法上都正确）。这里选定为规则，链接紧贴中文时判为问题。',
          '链接两侧是标点、行首、行尾或空格时不算问题。',
        ],
      },
    ],
  },
  {
    id: 'punctuation',
    title: '标点符号',
    sources: ['copywriting', 'docs'],
    summary: '中文用全角标点，不重复标点，省略号用 ……，并列词用顿号，句号在括号之外。',
    rules: [
      {
        id: 'punct-fullwidth',
        title: '中文语句使用全角标点',
        rule: '中文语句的标点符号均应采用全角符号，与全角文字保持视觉一致。',
        right: ['嗨！你知道嘛？今天前台的小妹跟我说「喵」了哎！', '核磁共振成像（NMRI）是什么原理都不知道？JFGI！'],
        wrong: ['嗨! 你知道嘛? 今天前台的小妹跟我说 "喵" 了哎!', '核磁共振成像 (NMRI) 是什么原理都不知道? JFGI!'],
        notes: ['例外：整句为英文时，该句使用英文半角标点。'],
      },
      {
        id: 'punct-no-repeat',
        title: '不重复使用标点符号',
        rule: '感叹号、问号等标点不连用。',
        right: ['德国队竟然战胜了巴西队！', '她竟然对你说「喵」？！'],
        wrong: ['德国队竟然战胜了巴西队！！', '德国队竟然战胜了巴西队！！！！！！！！', '她竟然对你说「喵」？？！！'],
      },
      {
        id: 'punct-english-sentence',
        title: '完整英文整句内部用半角标点',
        rule: '遇到完整的英文整句或特殊名词，其内容使用半角标点。',
        right: ['乔布斯那句话是怎么说的？「Stay hungry, stay foolish.」', '推荐你阅读 *Hackers & Painters: Big Ideas from the Computer Age*，非常有趣。'],
        wrong: ['乔布斯那句话是怎么说的？「Stay hungry，stay foolish。」', '推荐你阅读《Hackers＆Painters：Big Ideas from the Computer Age》，非常有趣。'],
        notes: ['中文句子里夹英文书名、报刊名时，不要借用中文书名号，用英文斜体。'],
      },
      {
        id: 'punct-period-in-paren',
        title: '句末括号加注时句号在括号之外',
        rule: '句子末尾用括号加注时，句号应在括号之外。',
        right: ['关于文件的输出，请参照第 1.3 节（见第 26 页）。'],
        wrong: ['关于文件的输出，请参照第 1.3 节（见第 26 页。）'],
      },
      {
        id: 'punct-comma',
        title: '避免「一逗到底」',
        rule: '逗号表示句子内部的一般性停顿；不要整个段落除了结尾全部使用逗号。',
        wrong: ['本产品适用于单一节点结构，也适用于并行处理结构，无论哪种结构，都可以使用，只要满足条件，就能部署，并且性能良好。'],
      },
      {
        id: 'punct-enumeration',
        title: '并列词语用顿号',
        rule: '句子内部的并列词用全角顿号（、）分隔，不用逗号，即使并列词是英文也是如此。',
        right: ['我最欣赏的科技公司有 Google、Facebook、腾讯、阿里和百度等。'],
        wrong: ['我最欣赏的科技公司有 Google, Facebook, 腾讯, 阿里和百度等。'],
        notes: ['中文句子中并列词的最后一个尽量用「和」连接，读起来更连贯。', '英文句子中并列词语之间仍使用半角逗号（,）。'],
      },
      {
        id: 'punct-quotes',
        title: '引号使用全角符号',
        preference: true,
        rule: '简体中文使用直角引号：外层「」，内层『』。',
        right: [
          '许多人都认为客户服务的核心是「友好」和「专业」。',
          '他解释道：「我要放音乐，可萨利说，『不行！』。」',
          '乔布斯那句话是怎么说的？「Stay hungry, stay foolish.」',
        ],
        wrong: ['许多人都认为客户服务的核心是“友好”和“专业”。', '他解释道：“我要放音乐，可萨利说，‘不行！’。”'],
        notes: [
          '本插件的个人约定：简体中文一律用直角引号；弯引号（“ ”‘ ’）是另一种同样合法的风格，港台与直排场景更常用，这里不采用。',
          '引号里还要用引号时，外层「」，内层『』，前后符号不同。',
          '直角引号同样用于包住英文整句，此时句内标点仍用半角。',
        ],
      },
      {
        id: 'punct-ellipsis',
        title: '省略号用 ……',
        rule: '省略号占两个汉字空间、包含六个点，不与「等」字连用，不使用 。。。 或 ... 等非标准形式。',
        right: ['我们为会餐准备了各色水果，有香蕉、苹果、梨……', '我们为会餐准备了香蕉、苹果、梨等各色水果。'],
        wrong: ['我们为会餐准备了香蕉、苹果、梨…等各色水果。', '5 分钟过去了...'],
        notes: ['中文内容里表示省略时，英文省略号（...）应改为中文省略号（……）。'],
      },
      {
        id: 'punct-exclamation',
        title: '尽量避免感叹号',
        rule: '平静地叙述，尽量避免使用感叹号；不得多个感叹号连用。',
        wrong: ['Lady Gaga 的演唱会真是酷毙了，从没看过这么给力的表演！！！'],
      },
      {
        id: 'punct-dash',
        title: '破折号占两个汉字位置',
        rule: '破折号用于进一步解释，应占两个汉字的位置；若只占一个汉字位置，前后应留一个半角空格。',
        right: ['直觉————尽管它并不总是可靠的————告诉我，这事可能出了些问题。', '直觉 —— 尽管它并不总是可靠的 —— 告诉我，这事可能出了些问题。'],
      },
      {
        id: 'punct-connector',
        title: '连接号',
        rule: '两个名词的复合与图表编号用直线连接号（-，占一个半角字符）；数值范围用波浪连接号（～）或一字线（—），占一个全角字符。',
        right: ['氧化-还原反应', '图 1-1', '2009 年～2011 年', '周围温度：-20 °C 至 -10 °C'],
        notes: ['数值范围前后两个值都建议加上单位。', '波浪连接号也可以用汉字「至」代替。'],
      },
      {
        id: 'punct-colon-time',
        title: '表示时间用半角冒号',
        rule: '全角冒号用于引出解释和说明；表示时间时使用半角冒号（:）。',
        right: ['请确认以下几项内容：时间、地点、活动名称和来宾数量。', '早上 8:00'],
      },
      {
        id: 'punct-line-start',
        title: '点号不出现在行首与标题末尾',
        rule: '句号、问号、叹号、逗号、顿号、分号和冒号不得出现在一行之首；点号不得出现在标题的末尾，而标号（引号、括号、破折号、省略号、书名号等）可以。',
      },
    ],
  },
  {
    id: 'charwidth',
    title: '全形与半形',
    sources: ['copywriting'],
    summary: '数字一律半角；专有名词保留官方大小写；大小写表现交给 CSS。',
    rules: [
      {
        id: 'width-halfwidth-digit',
        title: '数字使用半角字符',
        rule: '阿拉伯数字一律使用半角形式，不得使用全角形式。',
        right: ['这件蛋糕只卖 1000 元。'],
        wrong: ['这件蛋糕只卖 １０００ 元。'],
        notes: ['例外：设计稿、海报中极少量数字为对齐方便可使用全角数字。'],
      },
      {
        id: 'width-brand-case',
        title: '专有名词使用正确的大小写',
        rule: '专有名词保留官方大小写，不要全大写、全小写或改写。',
        right: ['使用 GitHub 登录', '我们的客户有 GitHub、Foursquare、Microsoft Corporation、Google、Facebook, Inc.。'],
        wrong: ['使用 github 登录', '使用 GITHUB 登录', '使用 Github 登录', '我们的客户有 github、foursquare、microsoft corporation、google、facebook, inc.。'],
      },
      {
        id: 'width-css-case',
        title: '大小写表现交给 CSS',
        rule: '页面需要整体全大写／全小写时，HTML 中仍按标准大小写书写，用 text-transform: uppercase / lowercase 定义表现形式。',
      },
    ],
  },
  {
    id: 'nouns',
    title: '名词与缩写',
    sources: ['copywriting', 'docs'],
    summary: '不使用不地道的缩写；英文词汇首次出现给出中文标注。',
    rules: [
      {
        id: 'nouns-no-vague-abbrev',
        title: '不要使用不地道的缩写',
        rule: '技术名词按通行写法书写，不要生造缩写。',
        right: ['我们需要一位熟悉 TypeScript、HTML5，至少理解一种框架（如 React、Next.js）的前端开发者。'],
        wrong: ['我们需要一位熟悉 Ts、h5，至少理解一种框架（如 RJS、nextjs）的 FED。'],
      },
      {
        id: 'nouns-first-use',
        title: '英文词汇首次出现给出中文标注',
        rule: '第一次出现英文词汇时，在括号中给出中文标注；此后再次出现时可直接使用英文缩写。',
        right: ['IOC（International Olympic Committee，国际奥林匹克委员会）。这样定义后，便可以直接使用「IOC」了。'],
      },
    ],
  },
  {
    id: 'sentences',
    title: '句子',
    sources: ['docs'],
    summary: '避免长句；多用简单句、并列句与肯定句；避免双重否定。',
    rules: [
      {
        id: 'sentence-length',
        title: '避免使用长句',
        rule: '不含标点的单句，或以逗号分隔的句子构件，长度尽量在 20 字以内；20～29 字可接受；30～39 字语义必须明确；多于 40 字任何情况下都不能接受。逗号分隔的长句总长度不应超过 100 字或正文的 3 行。',
        right: ['本产品适用于多种体系结构。无论是由一台服务器（单一节点结构），还是由多台服务器（并行处理结构）进行动作控制，均可以使用本产品。'],
        wrong: ['本产品适用于从由一台服务器进行动作控制的单一节点结构到由多台服务器进行动作控制的并行处理程序结构等多种体系结构。'],
      },
      {
        id: 'sentence-simple',
        title: '使用简单句和并列句',
        rule: '尽量使用简单句和并列句，避免使用复合句。',
        right: ['他昨天生病了，没有参加会议。'],
        wrong: ['那个昨天生病的人没有参加会议。'],
      },
      {
        id: 'sentence-positive',
        title: '使用肯定句',
        rule: '同一个意思尽量用肯定句表达，不用否定句。',
        right: ['请确认装置的电源已关闭。'],
        wrong: ['请确认没有接通装置的电源。'],
      },
      {
        id: 'sentence-no-double-negative',
        title: '避免双重否定',
        rule: '不使用双重否定句。',
        right: ['用户必须拥有删除权限，才能删除此文件。'],
        wrong: ['没有删除权限的用户，不能删除此文件。'],
      },
    ],
  },
  {
    id: 'style',
    title: '写作风格',
    sources: ['docs'],
    summary: '主动语态、正式表达、常用词、用对「的地得」、指代明确、少堆形容词。',
    rules: [
      {
        id: 'style-active-voice',
        title: '使用主动语态',
        rule: '尽量不使用被动语态，改为使用主动语态。',
        right: ['假如尚未安装这个软件'],
        wrong: ['假如此软件尚未被安装'],
      },
      {
        id: 'style-formal',
        title: '不使用非正式的语言风格',
        rule: '技术文档使用正式、平实的书面语。',
        right: ['无法参加本次活动，我深感遗憾。'],
        wrong: ['Lady Gaga 的演唱会真是酷毙了，从没看过这么给力的表演！！！'],
      },
      {
        id: 'style-common-words',
        title: '使用现代汉语常用表达',
        rule: '不使用冷僻、生造或者文言文的词语。',
        right: ['这是仅有的两种快速启动的方法。'],
        wrong: ['这是唯二的快速启动的方法。'],
      },
      {
        id: 'style-de-di-de',
        title: '用对「的」「地」「得」',
        rule: '形容词＋的＋名词；副词＋地＋动词；动词＋得＋副词。',
        right: ['她露出了开心的笑容。', '她开心地笑了。', '她笑得很开心。'],
      },
      {
        id: 'style-pronoun',
        title: '代词指代必须明确',
        rule: '使用代词（其、该、此、这等）时，必须明确指代的内容，保证只有一个含义。',
        right: ['从管理系统可以监视两个系统：中继系统和受中继系统直接控制的分配系统。'],
        wrong: ['从管理系统可以监视中继系统和受其直接控制的分配系统。'],
      },
      {
        id: 'style-fewer-adjectives',
        title: '名词前不要堆砌形容词',
        rule: '把长定语拆成独立的句子或分句。',
        right: ['此设备必须在技师的指导下使用，且指导技师必须接受过由本公司举办的正式设备培训。'],
        wrong: ['此设备的使用必须在接受过本公司举办的正式的设备培训的技师的指导下进行。'],
      },
    ],
  },
  {
    id: 'english',
    title: '英文处理',
    sources: ['docs'],
    summary: '复数还原单数、缩写用半角圆点、省略号用中文、书名用书名号。',
    rules: [
      {
        id: 'english-singular',
        title: '英文复数还原为单数',
        rule: '英文原文如果使用了复数形式，翻译成中文时应该还原为单数形式。',
        right: ['……存储在随机存取存储器（RAM）里的信息……'],
        wrong: ['……存储在随机存取存储器（RAMs）里的信息……'],
      },
      {
        id: 'english-abbrev-dot',
        title: '外文缩写使用半角圆点',
        rule: '外文缩写可以使用半角圆点（.）表示缩写。',
        right: ['U.S.A.', 'Apple, Inc.'],
      },
      {
        id: 'english-ellipsis',
        title: '中文里使用中文省略号',
        rule: '表示中文时，英文省略号（...）应改为中文省略号（……）。',
        right: ['5 分钟过去了……'],
        wrong: ['5 minutes later...'],
      },
      {
        id: 'english-title-marks',
        title: '书名与影视名改用书名号',
        rule: '英文书名或电影名改用中文表达时，双引号应改为书名号。',
        right: ['他发表了一篇名为《航空业的未来》的文章。'],
        wrong: ['他发表了一篇名为“The Future of the Aviation”的文章。'],
      },
      {
        id: 'english-proper-noun',
        title: '专有名词首字母大写',
        rule: '专有名词中每个词的第一个字母均应大写，非专有名词则不需要大写。',
        right: ['American Association of Physicists in Medicine（美国医学物理学家协会）', 'online transaction processing（在线事务处理）'],
      },
    ],
  },
  {
    id: 'paragraphs',
    title: '段落',
    sources: ['docs'],
    summary: '一段一主题、中心句在段首、不超过七行、陈述语气、段间空行、引用注明出处。',
    rules: [
      {
        id: 'paragraph-single-topic',
        title: '一个段落一个主题',
        rule: '一个段落只能有一个主题或一个中心句子；中心句子放在段首，对全段内容进行概述，后面陈述的句子为中心句子服务。',
      },
      {
        id: 'paragraph-length',
        title: '控制段落长度',
        rule: '一个段落的长度不能超过七行，最佳段落长度小于等于四行。',
      },
      {
        id: 'paragraph-tone',
        title: '段落使用陈述肯定语气',
        rule: '段落的句子语气要使用陈述和肯定语气，避免使用感叹语气。',
      },
      {
        id: 'paragraph-blank-line',
        title: '段落之间空一行',
        rule: '段落之间使用一个空行隔开；段落开头不要留出空白字符。',
      },
      {
        id: 'paragraph-citation',
        title: '引用注明出处',
        rule: '引用第三方内容时应注明出处；全篇转载需在全文开头显著位置注明作者和出处并链接至原文；使用外部图片必须在图片下方或文末标明来源。',
        right: ['One man’s constant is another man’s variable. — Alan Perlis', '本文转载自 WikiQuote', '本文部分图片来自 Wikipedia'],
      },
    ],
  },
  {
    id: 'numbers',
    title: '数值',
    sources: ['docs'],
    summary: '数字半角、千分号、货币写法、数值范围连接号、「增加了/增加到」的区别。',
    rules: [
      {
        id: 'number-halfwidth',
        title: '阿拉伯数字一律半角',
        rule: '阿拉伯数字一律使用半角形式，不得使用全角形式。',
        right: ['这件商品的价格是 1000 元。'],
        wrong: ['这件商品的价格是 １０００ 元。'],
      },
      {
        id: 'number-thousands',
        title: '千分号',
        rule: '数值为千位以上应添加千分号（半角逗号）；4 位数值可选（1000 与 1,000 都可接受），4 位以上应添加。',
        right: ['XXX 公司的实收资本为 ￥1,258,000 人民币。', '1000', '1,000'],
      },
      {
        id: 'number-currency',
        title: '货币写法',
        rule: '货币应为阿拉伯数字，并在数字前写出货币符号，或在数字后写出货币中文名称。英文货币名称建议参考 ISO 4217。',
        right: ['$1,000', '1,000 美元'],
      },
      {
        id: 'number-range',
        title: '数值范围',
        rule: '表示数值范围时用波浪线（～）或一字线（—）连接；带有单位或百分号时，两个数字建议都加上单位或百分号。',
        right: ['132 kg～234 kg', '67%～89%', '2009 年～2011 年'],
      },
      {
        id: 'number-change',
        title: '变化程度的表示法',
        rule: '数字的增加使用「增加了」「增加到」；减少使用「降低了」「降低到」。「了」表示增量，「到」表示定量。不能用「降低 N 倍」「减少 N 倍」，要用「降低百分之几」「减少百分之几」。',
        right: ['增加到过去的两倍（过去为一，现在为二）', '增加了两倍（过去为一，现在为三）', '降低到百分之八十（定额是一百，现在是八十）', '降低了百分之八十（原来是一百，现在是二十）'],
        wrong: ['降低了三倍'],
      },
    ],
  },
  {
    id: 'titles',
    title: '标题',
    sources: ['docs'],
    summary: '四级标题为限；一级下不直接出现三级；避免孤立编号与上下级同名；谨慎使用四级标题。',
    rules: [
      {
        id: 'title-levels',
        title: '标题层级',
        rule: '标题分为四级：一级标题是文章的标题，二级是主要部分的大标题，三级是二级下面的小标题，四级是三级下面某一方面的小标题。',
      },
      {
        id: 'title-no-skip',
        title: '一级标题下不能直接出现三级标题',
        rule: '标题层级必须连续，中间的层级不能缺失。',
        wrong: ['# 一级标题 紧接 ### 三级标题，缺少二级标题。'],
      },
      {
        id: 'title-no-lonely-number',
        title: '避免孤立编号',
        rule: '同级标题只有一个时应省略该层级，不要出现「独苗」标题。',
        wrong: ['## 二级标题 A 下只有一个 ### 三级标题 A，而同级还有 ## 二级标题 B。'],
      },
      {
        id: 'title-no-repeat',
        title: '下级标题不重复上一级标题的名字',
        rule: '子标题不要与父标题同名。',
        wrong: ['## 概述 紧接 ### 概述。'],
      },
      {
        id: 'title-cautious-h4',
        title: '谨慎使用四级标题',
        rule: '尽量避免四级标题，保持层级简单；三级标题下有并列内容时，建议改用项目列表或加粗序号。',
      },
    ],
  },
  {
    id: 'structure',
    title: '文档体系与文件名',
    sources: ['docs'],
    summary: '软件手册的标准结构；文件名用半角小写加连字符。',
    rules: [
      {
        id: 'structure-manual',
        title: '手册结构',
        rule: '一部完整的手册建议采用：简介（必备）→ 快速上手（可选）→ 入门篇（必备，含环境准备／安装／设置）→ 进阶篇（可选）→ API（可选）→ FAQ（可选）→ 附录（可选，含 Glossary／Recipes／Troubleshooting／ChangeLog／Feedback）。',
      },
      {
        id: 'filename-ascii',
        title: '文件名使用半角字符',
        rule: '文档的文件名不得含有空格，必须使用半角字符，不得使用全角字符（中文不能用于文件名），建议只使用小写字母；README、LICENSE 等说明文件可用大写。',
        right: ['glossary.md', 'troubleshooting.md', 'README'],
        wrong: ['名词解释.md', 'TroubleShooting.md'],
      },
      {
        id: 'filename-hyphen',
        title: '多个单词用连字符分隔',
        rule: '文件名包含多个单词时，单词之间建议使用半角连词线（-）分隔。',
        right: ['advanced-usage.md'],
        wrong: ['advanced_usage.md'],
      },
    ],
  },
];

/** 按 id 索引的主题。 */
export const TOPIC_BY_ID = new Map(TOPICS.map((topic) => [topic.id, topic]));

/** 全部规则 id → 规则（附带所属主题）。 */
export const RULES_BY_ID = new Map(
  TOPICS.flatMap((topic) => topic.rules.map((rule) => [rule.id, { ...rule, topicId: topic.id, topicTitle: topic.title }])),
);

/** 规范条目的总数。 */
export const RULE_COUNT = TOPICS.reduce((total, topic) => total + topic.rules.length, 0);

/**
 * 三条可配置的个人约定。上游规范把它们列为可选项或争议项，本插件默认按个人约定
 * 定死为规则；对应配置项置为 `false` 时回落到上游口径（`whenOff` 覆盖规则正文），
 * 并且自检里的同名规则关闭。
 *
 * @type {ReadonlyArray<{
 *   key: string, ruleId: string, title: string, decided: string, upstream: string,
 *   whenOff: { rule: string, right: readonly string[], wrong: readonly string[], notes: readonly string[] },
 * }>}
 */
export const PREFERENCES = Object.freeze([
  {
    key: 'cjkDigitSpacing',
    ruleId: 'spacing-cjk-digit',
    title: '中文和数字之间应当增加空格',
    decided: '一律加半角空格，不加即判为错误。',
    upstream: '《中文技术文档的写作规范》允许全文统一地不加，只要同一文档内风格一致。',
    whenOff: {
      rule: '全角中文字符与半角阿拉伯数字之间，加不加半角空格都可以，但必须保证风格统一，不能两种风格混杂。',
      right: [
        '2011年5月15日，我订购了5台笔记本电脑与10台平板电脑。',
        '2011 年 5 月 15 日，我订购了 5 台笔记本电脑与 10 台平板电脑。',
      ],
      wrong: ['2011年5月15日，我订购了 5 台笔记本电脑。（同一文档内两种风格混杂）'],
      notes: ['个人约定已关闭，回落到《中文技术文档的写作规范》的口径：加不加都可，但全文必须统一。'],
    },
  },
  {
    key: 'linkSpacing',
    ruleId: 'spacing-link',
    title: '超链接两侧应当增加空格',
    decided: '链接锚文本与相邻中文之间各加一个半角空格。',
    upstream: '两份上游规范都把它列为个人风格，遵循与否语法上都正确。',
    whenOff: {
      rule: '链接锚文本与相邻中文之间是否加空格属个人风格，两种写法都正确，但同一文档内应保持一致。',
      right: ['请[提交一个 issue](#)并分配给相关同事。', '请 [提交一个 issue](#) 并分配给相关同事。'],
      wrong: [],
      notes: ['个人约定已关闭，回落到两份上游规范的原始口径：这是风格选择，不是错误。'],
    },
  },
  {
    key: 'cornerQuotes',
    ruleId: 'punct-quotes',
    title: '简体中文应当使用直角引号',
    decided: '外层「」，内层『』，不使用弯引号（“ ”‘ ’）。',
    upstream: '《中文文案排版指北》把直角引号列为争议项，弯引号同样合法。',
    whenOff: {
      rule: '引用使用全角双引号（“ ”），引号内再用引号时外层双引号、内层单引号（‘ ’）；简体中文也常用直角引号「」『』，但同一份文稿内必须统一。',
      right: [
        '许多人都认为客户服务的核心是“友好”和“专业”。',
        '他认为客户服务的核心是「友好」和「专业」。（直角引号同样合法，但须全文统一）',
      ],
      wrong: [],
      notes: ['个人约定已关闭，回落到《中文文案排版指北》的口径：弯引号与直角引号都合法，关键是在同一份文稿里保持一致。'],
    },
  },
]);

/** 三条个人约定的默认值：全部开启。 */
export const DEFAULT_PREFERENCES = Object.freeze(
  Object.fromEntries(PREFERENCES.map((entry) => [entry.key, true])),
);

/** 按 key 索引的个人约定。 */
export const PREFERENCE_BY_KEY = new Map(PREFERENCES.map((entry) => [entry.key, entry]));

/**
 * 归一化个人约定配置：未知键忽略，非布尔值回落到默认 `true`。
 * @param {unknown} raw
 * @returns {Record<string, boolean>}
 */
export function normalizePreferences(raw) {
  const input = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result = {};
  for (const entry of PREFERENCES) {
    result[entry.key] = typeof input[entry.key] === 'boolean' ? input[entry.key] : true;
  }
  return result;
}

/** 当前被关闭的个人约定所对应的自检规则 id。 */
export function disabledPreferenceRules(preferences) {
  const normalized = normalizePreferences(preferences);
  return PREFERENCES.filter((entry) => normalized[entry.key] === false).map((entry) => entry.ruleId);
}

/** 当前启用的个人约定。 */
export function activePreferences(preferences) {
  const normalized = normalizePreferences(preferences);
  return PREFERENCES.filter((entry) => normalized[entry.key] !== false);
}

/**
 * 按当前配置解析一条规则：个人约定关闭时用 `whenOff` 覆盖正文与示例，
 * 并去掉 `preference` 标记，避免规范查询里出现误导性的「个人约定」标注。
 * @param {object} rule 规范数据里的原始规则
 * @param {ReadonlySet<string>} disabledRuleIds 已被关闭的自检规则 id
 */
function resolveRule(rule, disabledRuleIds) {
  if (rule.preference !== true || !disabledRuleIds.has(rule.id)) return rule;
  const entry = PREFERENCES.find((candidate) => candidate.ruleId === rule.id);
  if (entry === undefined) return rule;
  const { preference: _ignored, ...rest } = rule;
  return { ...rest, ...entry.whenOff, preference: false };
}

/** 全部主题与规则的紧凑目录，用于无参数查询。 */
export function renderIndex(preferences) {
  const active = activePreferences(preferences);
  const lines = [`# 中文写作规范 · 目录（共 ${TOPICS.length} 个主题 / ${RULE_COUNT} 条规则）`, ''];
  if (active.length > 0) {
    lines.push('## 当前生效的个人约定（已覆盖上游规范的可选项与争议项）');
    for (const entry of active) lines.push(`- ${entry.ruleId}（${entry.title}）：${entry.decided}`);
  } else {
    lines.push('## 个人约定：全部关闭，完全按两份上游规范的原始口径执行');
  }
  lines.push('');
  const off = PREFERENCES.filter((entry) => !active.includes(entry));
  if (off.length > 0) {
    lines.push(`已关闭：${off.map((entry) => `${entry.key}（${entry.ruleId}）`).join('、')}`);
    lines.push('');
  }
  for (const topic of TOPICS) {
    const sources = topic.sources.map((id) => SOURCES[id].title).join(' + ');
    lines.push(`## ${topic.id} · ${topic.title}`);
    lines.push(`来源：${sources}`);
    lines.push(`要点：${topic.summary}`);
    lines.push(`条目：${topic.rules.map((rule) => rule.id).join('、')}`);
    lines.push('');
  }
  lines.push('用法：传 topic 取某一主题的完整条目，或传 query 做关键词检索。');
  return lines.join('\n');
}

/**
 * 渲染单条规则。
 * @param {object} rawRule 规范数据里的原始规则
 * @param {'summary'|'full'} detail
 * @param {ReadonlySet<string>} disabledRuleIds 已被关闭的个人约定规则 id
 */
function renderRule(rawRule, detail, disabledRuleIds) {
  const rule = resolveRule(rawRule, disabledRuleIds);
  const lines = [`### ${rule.id} · ${rule.title}`, `规则：${rule.rule}`];
  if (rule.preference === true) {
    lines.push('口径：个人约定——上游规范把它列为可选或争议项，本插件定死为规则（可用 preferences 配置关闭）。');
  }
  if (detail === 'full') {
    if (rule.right?.length) {
      lines.push('正确：');
      for (const sample of rule.right) lines.push(`- ${sample}`);
    }
    if (rule.wrong?.length) {
      lines.push('错误：');
      for (const sample of rule.wrong) lines.push(`- ${sample}`);
    }
    if (rule.notes?.length) {
      lines.push('注意：');
      for (const note of rule.notes) lines.push(`- ${note}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

/** 渲染一个主题的全部规则。 */
function renderTopic(topic, detail, disabledRuleIds) {
  const lines = [
    `# ${topic.title}（topic: ${topic.id}）`,
    `来源：${topic.sources.map((id) => `${SOURCES[id].title} ${SOURCES[id].repo}`).join('；')}`,
    `要点：${topic.summary}`,
    '',
  ];
  for (const rule of topic.rules) lines.push(renderRule(rule, detail, disabledRuleIds));
  return lines.join('\n').trimEnd();
}

/** 关键词检索：命中规则标题、规则正文、示例与备注。 */
function searchRules(query, detail, disabledRuleIds) {
  const needle = query.trim().toLowerCase();
  if (needle === '') return '';
  const hits = [];
  for (const topic of TOPICS) {
    for (const rule of topic.rules) {
      const haystack = [
        topic.id,
        topic.title,
        rule.id,
        rule.title,
        rule.rule,
        ...(rule.right ?? []),
        ...(rule.wrong ?? []),
        ...(rule.notes ?? []),
      ]
        .join('\n')
        .toLowerCase();
      if (haystack.includes(needle)) hits.push({ topic, rule });
    }
  }
  if (hits.length === 0) return '';
  const lines = [`# 关键词「${query}」命中 ${hits.length} 条规则`, ''];
  let currentTopic = '';
  for (const { topic, rule } of hits) {
    if (topic.id !== currentTopic) {
      currentTopic = topic.id;
      lines.push(`## ${topic.title}（${topic.id}）`, '');
    }
    lines.push(renderRule(rule, detail, disabledRuleIds));
  }
  return lines.join('\n').trimEnd();
}

/**
 * 生成规范查询结果。
 * @param {{topic?: string, query?: string, detail?: string, preferences?: unknown}} [request]
 *   `preferences` 是个人约定开关；被关闭的那几条会换成上游口径的正文与示例。
 * @returns {{text: string, matched: number}}
 */
export function buildGuideText(request = {}) {
  const detail = request.detail === 'summary' ? 'summary' : 'full';
  const topicId = typeof request.topic === 'string' ? request.topic.trim() : '';
  const query = typeof request.query === 'string' ? request.query : '';
  const disabledRuleIds = new Set(disabledPreferenceRules(request.preferences));

  if (topicId !== '') {
    const topic = TOPIC_BY_ID.get(topicId);
    if (topic === undefined) {
      const ids = TOPICS.map((entry) => entry.id).join('、');
      return {
        text: `未知主题 "${topicId}"。可用主题：${ids}。\n\n${renderIndex(request.preferences)}`,
        matched: 0,
      };
    }
    return { text: renderTopic(topic, detail, disabledRuleIds), matched: topic.rules.length };
  }

  if (query.trim() !== '') {
    const text = searchRules(query, detail, disabledRuleIds);
    if (text === '') {
      return {
        text: `没有规则命中「${query}」。可以换用更短的关键词，或先查看目录。\n\n${renderIndex(request.preferences)}`,
        matched: 0,
      };
    }
    const matched = (text.match(/^### /gm) ?? []).length;
    return { text, matched };
  }

  return { text: renderIndex(request.preferences), matched: RULE_COUNT };
}
