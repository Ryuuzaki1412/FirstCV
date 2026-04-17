import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { createResume, listResumes } from "@/app/actions/resumes";
import { parseResumeContent } from "@/lib/resume/schema";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const resumes = await listResumes();
  const greetingName = user.displayName ?? user.email.split("@")[0];

  return (
    <div className="mx-auto max-w-3xl">
      <p className="overline mb-5">Dashboard · 起点</p>
      <h1 className="font-serif text-[34px] leading-tight text-near-black mb-3">
        {greetingName}，欢迎回来。
      </h1>
      <p className="text-[15px] text-olive-gray leading-relaxed max-w-xl mb-10">
        先建一份简历开始吧——你写好基本信息和经历，AI 会帮你把它变成一份
        看起来像样的 CV。
      </p>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-[20px] text-near-black">我的简历</h2>
          <form action={createResume}>
            <button
              type="submit"
              className="rounded-xl bg-terracotta text-ivory px-4 py-2 text-[14px] font-medium hover:bg-coral transition"
            >
              新建简历
            </button>
          </form>
        </div>

        {resumes.length === 0 ? (
          <div className="rounded-3xl bg-ivory ring-1 ring-border-warm px-8 py-12 text-center">
            <p className="font-serif text-[17px] text-near-black mb-2">
              还没有开始。
            </p>
            <p className="text-[13.5px] text-olive-gray max-w-sm mx-auto leading-relaxed">
              点击"新建简历"，从基本信息开始写起。你随时可以改、随时可以删。
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {resumes.map((resume) => {
              const content = parseResumeContent(resume.currentVersionJson);
              const title =
                content.basicInfo.name || content.basicInfo.headline || "未命名简历";
              const subtitle = content.basicInfo.headline || "还没有写个人定位";
              return (
                <li key={resume.id}>
                  <Link
                    href={`/resume/${resume.id}`}
                    className="block rounded-2xl bg-ivory ring-1 ring-border-warm px-6 py-5 hover:ring-terracotta transition"
                  >
                    <div className="flex items-baseline justify-between gap-4 mb-1.5">
                      <p className="font-serif text-[17px] text-near-black truncate">
                        {title}
                      </p>
                      <span className="text-[12px] text-stone-gray shrink-0">
                        {formatDate(resume.updatedAt)}
                      </span>
                    </div>
                    <p className="text-[13.5px] text-olive-gray truncate">
                      {subtitle}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-ivory ring-1 ring-border-warm px-8 py-6">
        <p className="text-[12.5px] text-stone-gray mb-1 tracking-wide">
          当前账户
        </p>
        <p className="font-serif text-[15px] text-near-black mb-0.5">
          {user.email}
        </p>
        <p className="text-[12.5px] text-olive-gray">
          套餐：{user.plan} · 语言：{user.locale}
        </p>
      </section>
    </div>
  );
}
