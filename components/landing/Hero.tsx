import Link from "next/link";

export function Hero() {
  return (
    <section className="flex gap-18 px-14 py-24 items-center bg-parchment">
      <div className="flex flex-col gap-8 flex-1">
        <span className="overline">写给刚进入职场的你</span>

        <h1 className="font-serif text-[64px] leading-[1.15] text-near-black tracking-tight">
          一份像样的简历，
          <br />
          从说清楚你做过什么
          <br />
          开始。
        </h1>

        <p className="max-w-[580px] text-lg leading-[1.7] text-olive-gray">
          我们不是简历模板工具，也不是花哨的 AI 写手。
          <br />
          我们帮你把课程项目、毕业设计、校园经历里的那些「真正做过的事」，
          <br />
          用职业语言说清楚——让别人愿意约你聊一聊。
        </p>

        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-terracotta text-ivory font-medium"
          >
            开始写我的第一份简历
            <span>→</span>
          </Link>
          <Link
            href="/upload"
            className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white text-near-black font-medium ring-1 ring-border-warm"
          >
            我已经有一份，帮我改一改
          </Link>
        </div>

        <div className="flex items-center gap-6 pt-4 text-[13px] text-stone-gray">
          <span>免费开始</span>
          <span>·</span>
          <span>10 分钟完成首版</span>
          <span>·</span>
          <span>无需信用卡</span>
        </div>
      </div>

      <HeroArt />
    </section>
  );
}

function HeroArt() {
  return (
    <div className="relative w-[520px] h-[620px] rounded-3xl bg-ivory overflow-hidden shrink-0">
      {/* background blobs */}
      <div className="absolute w-[460px] h-[460px] rounded-full bg-warm-sand left-[30px] top-[80px]" />
      <div className="absolute w-[140px] h-[140px] rounded-full bg-terracotta left-[360px] top-[60px]" />

      {/* back paper */}
      <div
        className="absolute w-[320px] h-[440px] bg-ivory rounded-md ring-1 ring-border-warm"
        style={{
          left: 60,
          top: 120,
          transform: "rotate(-6deg)",
        }}
      />

      {/* front paper */}
      <div
        className="absolute w-[320px] h-[440px] bg-white rounded-md ring-1 ring-border-warm p-8 flex flex-col gap-3"
        style={{
          left: 100,
          top: 100,
          transform: "rotate(3deg)",
          boxShadow: "0px 8px 32px rgba(0,0,0,0.08)",
        }}
      >
        <div className="font-serif text-[22px] text-near-black">李思远</div>
        <div className="text-xs text-stone-gray">应届本科 · 前端开发</div>
        <div className="h-px bg-border-warm" />
        <div className="pt-1.5 flex flex-col gap-1.5">
          <div className="text-[11px] font-medium text-terracotta tracking-widest">
            项目经历
          </div>
          <div className="font-serif text-sm text-near-black">
            校园二手交易平台
          </div>
          <p className="text-[11px] leading-[1.6] text-olive-gray">
            独立设计并实现商品发布、搜索与聊天模块，支撑校内日活 800+ 用户。
          </p>
        </div>
        <div className="h-0.5 rounded-sm bg-border-cream" />
        <div className="h-0.5 rounded-sm bg-border-cream" />
        <div className="h-0.5 rounded-sm bg-border-cream w-48" />
        <div className="pt-3 flex flex-col gap-1.5">
          <div className="text-[11px] font-medium text-terracotta tracking-widest">
            技能栈
          </div>
          <div className="flex gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-parchment text-[10px] text-charcoal-warm font-mono">
              Vue 3
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-parchment text-[10px] text-charcoal-warm font-mono">
              Node.js
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-parchment text-[10px] text-charcoal-warm font-mono">
              Redis
            </span>
          </div>
        </div>
      </div>

      {/* decor note */}
      <div
        className="absolute w-[180px] h-[60px] bg-terracotta rounded-3xl flex flex-col justify-center px-4"
        style={{
          left: 300,
          top: 480,
          transform: "rotate(5deg)",
        }}
      >
        <div className="text-xs font-medium text-ivory">AI 帮你改写</div>
        <div className="text-[10px] text-ivory/80">去学生气 · 动作词 · 成果</div>
      </div>

      {/* decor dot */}
      <div className="absolute w-6 h-6 rounded-full bg-near-black left-[80px] top-[480px]" />
    </div>
  );
}
