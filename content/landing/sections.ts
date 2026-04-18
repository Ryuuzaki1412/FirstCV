/**
 * Landing page copy.
 * Keys here are referenced from components/landing/*. Edit copy here, not in JSX.
 */

export const productSection = {
  overline: "我们做什么",
  title: "FirstCV 只做三件事",
  subtitle:
    "不是简历模板库，不是自由生成器，不替你讲故事——我们只帮你把经历说清楚。",
  features: [
    {
      label: "写",
      title: "结构化编辑器",
      body: "按教育 / 项目 / 实习分段，填空起步。基本信息、经历、技能、奖项、证书一次搞定；每一次修改自动保存。",
    },
    {
      label: "改",
      title: "AI 逐句改写",
      body: "选一条口水话亮点，AI 在 5 秒内改成带动词、带数字的职业表达。每一次改写都告诉你为什么，以及保留了哪些原始事实。",
    },
    {
      label: "审",
      title: "AI 全局体检",
      body: "按结构 / 岗位匹配 / 专业语气 / 产出 / 简洁五个维度打分，逐条指出问题并给出修改方向——像一位资深 HR 为你读完简历。",
    },
  ],
} as const;

export const jobsSection = {
  overline: "岗位方向",
  title: "我们尤其擅长这些方向",
  subtitle:
    "AI 改写和体检按岗位调节提示词，不写「通用」风格——每一条建议都针对你想去的位置。",
  categories: [
    { key: "frontend", name: "前端工程师", tags: "React · Vue · TypeScript" },
    { key: "backend", name: "后端工程师", tags: "Go · Java · Node.js" },
    { key: "product", name: "产品经理", tags: "用户洞察 · 需求 · 迭代" },
    { key: "data", name: "数据分析", tags: "SQL · Python · 指标" },
    { key: "design", name: "设计师", tags: "UI · UX · 交互" },
    { key: "marketing", name: "市场 / 运营", tags: "内容 · 增长 · 投放" },
    { key: "ai", name: "算法 / AI", tags: "ML · NLP · LLM 工程" },
    { key: "security", name: "网络安全", tags: "Web · 红队 · 二进制" },
  ],
} as const;

export const philosophySection = {
  overline: "写作理念",
  title: "我们不替你吹牛，也不替你讲故事",
  subtitle: "我们只帮你把真正做过的事说清楚。",
  principles: [
    {
      label: "不捏造",
      body: "AI 绝不虚构事实；缺少数字时提示你补充，不替你编一个。",
    },
    {
      label: "去学生气",
      body: "把「参加了」「学习了」「了解了」换成「主导」「独立完成」「梳理」「推动」。",
    },
    {
      label: "用动词开头",
      body: "简历的每一条都以动作开头——读者想看你做了什么，不是你是什么。",
    },
    {
      label: "带结果",
      body: "有数字写数字，没数字写具体影响——人数、频率、带来的改变。",
    },
  ],
} as const;

export const pricingSection = {
  overline: "价格",
  title: "现在免费，你慢慢用",
  subtitle: "上线初期免费给所有应届生使用。后面会出付费版，但永远保留免费档。",
  tiers: [
    {
      key: "free",
      name: "免费",
      price: "¥0",
      priceUnit: "一直",
      description: "刚找工作、写第一份简历，这一档够用了。",
      features: [
        "无限份数的简历",
        "完整结构化编辑器",
        "每月 30 次 AI 改写",
        "每月 5 次 AI 体检",
        "每月 3 次 PDF 上传解析",
        "A4 PDF 导出",
      ],
      ctaLabel: "开始免费使用",
      ctaHref: "/login",
      highlighted: true,
    },
    {
      key: "pro",
      name: "专业版",
      price: "$9",
      priceUnit: "/ 月",
      description: "针对投递密度高、多岗位并行的求职场景。",
      features: [
        "不限次 AI 改写 / 体检",
        "不限次 PDF 上传解析",
        "一份内容 · 多岗位版本",
        "中文 / 英文双语导出（规划中）",
        "优先邮件支持",
      ],
      ctaLabel: "升级到 Pro",
      ctaHref: "/billing/start",
      highlighted: false,
    },
  ],
} as const;
