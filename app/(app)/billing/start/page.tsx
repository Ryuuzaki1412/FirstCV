import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { verifySession } from "@/lib/auth/dal";
import { startProCheckout } from "@/app/actions/billing";
import { PRO_PLAN } from "@/config/plans";

export default async function BillingStartPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const { userId } = await verifySession();
  const sp = await searchParams;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, plan: true },
  });

  if (user?.plan === "pro") {
    return (
      <div className="mx-auto max-w-xl py-6">
        <p className="overline mb-5">已是专业版</p>
        <h1 className="font-serif text-[30px] leading-tight text-near-black mb-3">
          你已经是 Pro 用户
        </h1>
        <p className="text-[14px] text-olive-gray leading-relaxed mb-8">
          不限次 AI 改写 / 体检 / PDF 解析 都已解锁。
        </p>
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl bg-terracotta text-ivory px-5 py-2.5 text-[14px] font-medium hover:bg-coral transition"
        >
          回到 Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-6">
      <p className="overline mb-5">订阅 · {PRO_PLAN.name}</p>
      <h1 className="font-serif text-[30px] leading-tight text-near-black mb-3">
        升级到 FirstCV {PRO_PLAN.name}
      </h1>
      <p className="text-[14px] text-olive-gray leading-relaxed mb-8">
        点击下面的按钮会跳转到 Stripe 结账页。付完回到这里你会看到确认。
      </p>

      <section className="rounded-3xl bg-ivory ring-1 ring-border-warm px-8 py-8 mb-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif text-[22px] text-near-black">
            {PRO_PLAN.name}
          </h2>
          <p className="text-[13px] text-stone-gray tracking-wide">
            {PRO_PLAN.priceUnit}
          </p>
        </div>
        <p className="font-serif text-[36px] leading-none text-near-black mb-5">
          {PRO_PLAN.priceDisplay}
          <span className="text-[14px] text-olive-gray tracking-wide ml-2">
            USD
          </span>
        </p>
        <ul className="space-y-2 text-[13.5px] text-charcoal-warm leading-relaxed">
          <li>· 不限次 AI 改写 / 体检</li>
          <li>· 不限次 PDF 上传解析</li>
          <li>· 一份内容 · 多岗位版本（克隆已支持）</li>
          <li>· 优先问题反馈</li>
        </ul>
      </section>

      {sp.canceled ? (
        <p className="text-[13px] text-stone-gray mb-4">
          上次结账被取消了。随时可以重新开始。
        </p>
      ) : null}

      <form action={startProCheckout} className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-xl bg-terracotta text-ivory px-6 py-3 text-[14px] font-medium hover:bg-coral transition"
        >
          前往结账
        </button>
        <Link
          href="/dashboard"
          className="text-[13px] text-stone-gray hover:text-near-black transition"
        >
          暂不升级
        </Link>
      </form>

      <p className="mt-8 text-[12px] text-stone-gray leading-relaxed">
        账户 {user?.email} · 结账由 Stripe 处理，我们不接触你的卡号。
      </p>
    </div>
  );
}
