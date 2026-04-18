import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { verifySession } from "@/lib/auth/dal";

export default async function BillingSuccessPage() {
  const { userId } = await verifySession();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { plan: true },
  });

  const isPro = user?.plan === "pro";

  return (
    <div className="mx-auto max-w-xl py-6">
      <p className="overline mb-5">
        {isPro ? "升级完成" : "付款处理中"}
      </p>
      <h1 className="font-serif text-[32px] leading-tight text-near-black mb-3">
        {isPro ? "谢谢你支持 FirstCV" : "付款已提交，正在等确认"}
      </h1>
      <p className="text-[14px] text-olive-gray leading-relaxed mb-8">
        {isPro
          ? "Pro 版功能已解锁——不限次 AI 改写、体检和上传解析。现在可以把你手里的每一份简历都打磨到位。"
          : "Stripe 刚完成结账，我们正在通过 webhook 接收确认。一般几秒钟内账户就会升级，如果超过一分钟还没变化，联系我们。"}
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-xl bg-terracotta text-ivory px-5 py-2.5 text-[14px] font-medium hover:bg-coral transition"
        >
          回到 Dashboard
        </Link>
        {!isPro ? (
          <Link
            href="/billing/success"
            className="text-[13px] text-stone-gray hover:text-near-black transition"
          >
            刷新状态
          </Link>
        ) : null}
      </div>
    </div>
  );
}
