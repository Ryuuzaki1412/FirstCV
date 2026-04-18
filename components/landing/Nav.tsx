import Link from "next/link";

export function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 md:px-14 h-16 md:h-18 bg-parchment">
      <div className="flex items-center gap-6 md:gap-10 min-w-0">
        <Link href="/" className="flex items-center gap-2 md:gap-2.5 shrink-0">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-terracotta text-ivory font-serif text-sm">
            札
          </span>
          <span className="font-serif text-lg md:text-xl text-near-black">
            FirstCV
          </span>
          <span className="hidden sm:inline text-sm text-stone-gray">
            · 札记
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-7 text-[15px] text-dark-warm">
          <Link href="#product">产品</Link>
          <Link href="#jobs">岗位方向</Link>
          <Link href="#philosophy">写作理念</Link>
          <Link href="#pricing">定价</Link>
        </div>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        <Link
          href="/login"
          className="px-3 md:px-3.5 py-2 rounded-lg bg-warm-sand text-charcoal-warm text-[13px] md:text-[15px] font-medium"
        >
          登录
        </Link>
        <Link
          href="/dashboard"
          className="px-3 md:px-4 py-2 rounded-lg bg-terracotta text-ivory text-[13px] md:text-[15px] font-medium whitespace-nowrap"
        >
          <span className="sm:hidden">开始</span>
          <span className="hidden sm:inline">开始写第一份</span>
        </Link>
      </div>
    </nav>
  );
}
