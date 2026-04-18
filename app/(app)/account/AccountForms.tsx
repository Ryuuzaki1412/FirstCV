"use client";

import { useActionState } from "react";
import {
  updateDisplayName,
  updateLocale,
  type AccountUpdateState,
} from "@/app/actions/account";

export function AccountForms({
  email,
  displayName,
  locale,
}: {
  email: string;
  displayName: string;
  locale: string;
}) {
  return (
    <section className="rounded-3xl bg-ivory ring-1 ring-border-warm px-8 py-6 space-y-6">
      <EmailField email={email} />
      <NameField initial={displayName} />
      <LocaleField initial={locale} />
    </section>
  );
}

function EmailField({ email }: { email: string }) {
  return (
    <div>
      <label className="block text-[12px] text-olive-gray mb-1.5 tracking-wide">
        邮箱
      </label>
      <input
        readOnly
        value={email}
        className="w-full rounded-xl bg-parchment ring-1 ring-border-warm px-3 py-2 text-[14px] text-near-black cursor-not-allowed"
      />
      <p className="mt-1.5 text-[11.5px] text-stone-gray">
        邮箱绑定登录，无法直接在这里修改。
      </p>
    </div>
  );
}

function NameField({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState<AccountUpdateState, FormData>(
    updateDisplayName,
    null,
  );

  return (
    <form action={action}>
      <label
        htmlFor="displayName"
        className="block text-[12px] text-olive-gray mb-1.5 tracking-wide"
      >
        显示名
      </label>
      <div className="flex items-center gap-2">
        <input
          id="displayName"
          name="displayName"
          defaultValue={initial}
          placeholder="例如 夏禾壮"
          maxLength={120}
          className="flex-1 rounded-xl bg-white ring-1 ring-border-warm px-3 py-2 text-[14px] text-near-black placeholder:text-warm-silver focus:outline-none focus:ring-2 focus:ring-terracotta transition"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-terracotta text-ivory px-4 py-2 text-[13px] font-medium hover:bg-coral disabled:opacity-60 transition"
        >
          {pending ? "保存中…" : "保存"}
        </button>
      </div>
      <FormNotice state={state} />
    </form>
  );
}

function LocaleField({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState<AccountUpdateState, FormData>(
    updateLocale,
    null,
  );

  return (
    <form action={action}>
      <label
        htmlFor="locale"
        className="block text-[12px] text-olive-gray mb-1.5 tracking-wide"
      >
        界面语言
      </label>
      <div className="flex items-center gap-2">
        <select
          id="locale"
          name="locale"
          defaultValue={initial}
          disabled={pending}
          className="flex-1 rounded-xl bg-white ring-1 ring-border-warm px-3 py-2 text-[14px] text-near-black focus:outline-none focus:ring-2 focus:ring-terracotta transition"
        >
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English（开发中）</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-warm-sand text-charcoal-warm px-4 py-2 text-[13px] hover:bg-border-cream disabled:opacity-60 transition"
        >
          {pending ? "切换中…" : "切换"}
        </button>
      </div>
      <FormNotice state={state} />
    </form>
  );
}

function FormNotice({ state }: { state: AccountUpdateState }) {
  if (!state) return null;
  return (
    <p
      className={
        "mt-2 text-[12px] " +
        (state.ok ? "text-olive-gray" : "text-error")
      }
    >
      {state.ok ? state.message : state.error}
    </p>
  );
}
