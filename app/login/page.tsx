import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "登录",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="min-h-screen bg-parchment flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[420px]">
        <div className="mb-10 flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-full bg-terracotta" />
          <span className="font-serif text-[15px] text-near-black">
            FirstCV · 札记
          </span>
        </div>

        <div className="rounded-3xl bg-ivory ring-1 ring-border-warm px-8 py-10">
          <p className="overline mb-4">Magic Link · 一次性登录</p>
          <h1 className="font-serif text-[28px] leading-tight text-near-black mb-3">
            先写下你的邮箱
          </h1>
          <p className="text-[14px] text-olive-gray leading-relaxed mb-8">
            我们会把登录链接发到你的邮箱，点开就能进来。
            不用记密码，也不留把柄。
          </p>

          <LoginForm next={params.next} initialError={params.error} />
        </div>

        <p className="mt-8 text-center text-[12.5px] text-stone-gray">
          继续即表示你同意我们不会把你的简历卖给别人。
        </p>
      </div>
    </main>
  );
}
