"use client";

import { useActionState } from "react";
import { signInWithEmail, type SignInState } from "@/app/actions/auth";

export function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signInWithEmail,
    initialError ? { error: decodeURIComponent(initialError) } : null,
  );

  if (state?.sent) {
    return (
      <div className="rounded-2xl bg-warm-sand/60 ring-1 ring-border-warm px-5 py-5">
        <p className="font-serif text-[17px] text-near-black mb-1.5">
          登录链接已发出
        </p>
        <p className="text-[13.5px] text-olive-gray leading-relaxed">
          查收 <span className="text-near-black">{state.email}</span>
          ，点击邮件里的链接即可进入 FirstCV。链接 1 小时内有效。
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/dashboard"} />

      <label className="block">
        <span className="block text-[12.5px] text-olive-gray mb-2 tracking-wide">
          邮箱
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          defaultValue={state?.email}
          placeholder="you@example.com"
          className="w-full rounded-xl bg-white ring-1 ring-border-warm px-4 py-3 text-[14.5px] text-near-black placeholder:text-warm-silver focus:outline-none focus:ring-2 focus:ring-terracotta transition"
        />
      </label>

      {state?.error && (
        <p className="text-[13px] text-error leading-relaxed">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-terracotta text-ivory py-3 text-[14.5px] font-medium hover:bg-coral disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {pending ? "正在发送…" : "发送登录链接"}
      </button>
    </form>
  );
}
