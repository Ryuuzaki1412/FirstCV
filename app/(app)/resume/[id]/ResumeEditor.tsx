"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  useForm,
  useFieldArray,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormGetValues,
} from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  cloneResume,
  deleteResume,
  setShareEnabled,
  updateResume,
} from "@/app/actions/resumes";
import { rewriteHighlight, runResumeCheckup } from "@/app/actions/ai";
import { clientEnv } from "@/lib/env";
import type {
  CheckupIssue,
  CheckupResult,
  RewriteBlock,
} from "@/services/ai/schemas";
import {
  experienceKinds,
  experienceKindLabels,
  type ExperienceKind,
  type ResumeContent,
} from "@/lib/resume/schema";
import { jobsSection } from "@/content/landing/sections";

type SaveState =
  | { kind: "idle" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string };

type CheckupState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "result"; data: CheckupResult; at: Date }
  | { kind: "error"; message: string };

type QuotaSnapshot = {
  rewriteUsed: number;
  rewriteLimit: number;
  checkupUsed: number;
  checkupLimit: number;
};

type ShareSnapshot = {
  enabled: boolean;
  token: string | null;
};

const AUTOSAVE_DELAY_MS = 800;

function newId() {
  return crypto.randomUUID();
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ResumeEditor({
  resumeId,
  initialContent,
  initialCheckup,
  initialQuota,
  initialShare,
}: {
  resumeId: string;
  initialContent: ResumeContent;
  initialCheckup: { data: CheckupResult; at: string } | null;
  initialQuota: QuotaSnapshot;
  initialShare: ShareSnapshot;
}) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [isDeleting, startDelete] = useTransition();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [checkup, setCheckup] = useState<CheckupState>(() =>
    initialCheckup
      ? {
          kind: "result",
          data: initialCheckup.data,
          at: new Date(initialCheckup.at),
        }
      : { kind: "idle" },
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [quota, setQuota] = useState<QuotaSnapshot>(initialQuota);

  const canRewrite = quota.rewriteUsed < quota.rewriteLimit;
  const canCheckup = quota.checkupUsed < quota.checkupLimit;

  const notifyRewriteResult = useCallback(
    (outcome: "success" | "quota-exceeded" | "other-error") => {
      setQuota((prev) => {
        if (outcome === "success") {
          return { ...prev, rewriteUsed: prev.rewriteUsed + 1 };
        }
        if (outcome === "quota-exceeded") {
          return { ...prev, rewriteUsed: prev.rewriteLimit };
        }
        return prev;
      });
    },
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
  } = useForm<ResumeContent>({
    defaultValues: initialContent,
  });

  const experiencesField = useFieldArray({ control, name: "experiences" });
  const skillsField = useFieldArray({ control, name: "skills" });
  const awardsField = useFieldArray({ control, name: "awards" });
  const certificationsField = useFieldArray({
    control,
    name: "certifications",
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValuesRef = useRef<ResumeContent>(initialContent);
  const isFirstChangeRef = useRef(true);

  const flushSave = useCallback(async () => {
    setSaveState({ kind: "saving" });
    const result = await updateResume(resumeId, latestValuesRef.current);
    if (result.ok) {
      setSaveState({ kind: "saved", at: new Date() });
    } else {
      setSaveState({ kind: "error", message: result.error });
    }
  }, [resumeId]);

  useEffect(() => {
    const subscription = watch((values) => {
      latestValuesRef.current = values as ResumeContent;
      // RHF fires watch once on mount with the initial values; ignore it.
      if (isFirstChangeRef.current) {
        isFirstChangeRef.current = false;
        return;
      }
      setSaveState({ kind: "dirty" });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
    });
    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [watch, flushSave]);

  // Warn before leaving with unsaved/in-flight changes.
  useEffect(() => {
    const needsGuard =
      saveState.kind === "dirty" ||
      saveState.kind === "saving" ||
      saveState.kind === "error";
    if (!needsGuard) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState.kind]);

  const saveNow = handleSubmit(async (data) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    latestValuesRef.current = data;
    await flushSave();
  });

  // Cmd/Ctrl+S forces a save right away.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveNow();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveNow]);

  const onDelete = () => {
    if (!confirm("确认删除这份简历吗？无法恢复。")) return;
    startDelete(async () => {
      await deleteResume(resumeId);
      router.push("/dashboard");
    });
  };

  const [isCloning, startClone] = useTransition();
  const onClone = async () => {
    // Flush any pending edits first so the clone captures the latest content.
    if (saveState.kind === "dirty" || saveState.kind === "saving") {
      if (timerRef.current) clearTimeout(timerRef.current);
      await flushSave();
    }
    startClone(() => {
      cloneResume(resumeId);
    });
  };

  const triggerCheckup = async () => {
    if (saveState.kind === "dirty" || saveState.kind === "saving") {
      // Flush pending auto-save first so the checkup sees the latest content.
      if (timerRef.current) clearTimeout(timerRef.current);
      await flushSave();
    }
    setPanelOpen(true);
    setCheckup({ kind: "running" });
    const response = await runResumeCheckup(resumeId);
    if (response.ok) {
      setCheckup({ kind: "result", data: response.result, at: new Date() });
      setQuota((prev) => ({ ...prev, checkupUsed: prev.checkupUsed + 1 }));
    } else {
      setCheckup({ kind: "error", message: response.error });
      if (response.error.includes("已用完")) {
        setQuota((prev) => ({ ...prev, checkupUsed: prev.checkupLimit }));
      }
    }
  };

  const onCheckupButtonClick = () => {
    if (checkup.kind === "running") return;
    if (checkup.kind === "result") {
      setPanelOpen((prev) => !prev);
      return;
    }
    if (!canCheckup) {
      setPanelOpen(true);
      setCheckup({
        kind: "error",
        message: `本月 AI 体检已用完（${quota.checkupUsed} / ${quota.checkupLimit}）。下月 1 号重置。`,
      });
      return;
    }
    triggerCheckup();
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8 pb-20">
      <header className="sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 md:py-4 bg-parchment/90 backdrop-blur-sm border-b border-border-warm flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="overline mb-1 md:mb-1.5">编辑 · 简历</p>
          <h1 className="font-serif text-[18px] md:text-[22px] leading-tight text-near-black">
            写下你的经历
          </h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
          <SaveIndicator state={saveState} />
          <button
            type="button"
            onClick={onCheckupButtonClick}
            disabled={checkup.kind === "running"}
            title={
              !canCheckup && checkup.kind !== "result"
                ? `本月体检已用完（${quota.checkupUsed} / ${quota.checkupLimit}）`
                : undefined
            }
            className={
              "rounded-lg px-3 py-1.5 text-[13px] transition disabled:cursor-wait " +
              (!canCheckup && checkup.kind !== "result"
                ? "bg-border-cream text-stone-gray"
                : "bg-warm-sand text-charcoal-warm hover:bg-border-cream disabled:opacity-60")
            }
          >
            {checkup.kind === "running"
              ? "体检中…"
              : checkup.kind === "result"
                ? `体检 · ${checkup.data.overallScore} 分`
                : !canCheckup
                  ? "本月已满"
                  : "体检"}
          </button>
          <a
            href={`/api/resumes/${resumeId}/pdf`}
            className="rounded-lg bg-warm-sand px-3 py-1.5 text-[13px] text-charcoal-warm hover:bg-border-cream transition"
          >
            导出 PDF
          </a>
        </div>
      </header>

      <Section title="目标岗位">
        <TargetRolePicker
          value={watch("targetRole") ?? ""}
          onChange={(v) =>
            setValue("targetRole", v, {
              shouldDirty: true,
              shouldTouch: true,
            })
          }
        />
        <p className="mt-2 text-[12px] text-stone-gray leading-relaxed">
          点下面的标签直接填入，或者在输入框里写得更具体（例如"前端工程师 · React 方向"）。
          留空会按「通用」方向写。
        </p>
      </Section>

      <Section title="基本信息">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="姓名">
            <input
              {...register("basicInfo.name")}
              placeholder="你的名字"
              className={inputClass}
            />
          </Field>
          <Field label="职业定位（一句话）">
            <input
              {...register("basicInfo.headline")}
              placeholder="前端工程师 / 产品经理实习生 ..."
              className={inputClass}
            />
          </Field>
          <Field label="邮箱">
            <input
              {...register("basicInfo.email")}
              type="email"
              placeholder="you@example.com"
              className={inputClass}
            />
          </Field>
          <Field label="手机">
            <input
              {...register("basicInfo.phone")}
              placeholder="+86 ..."
              className={inputClass}
            />
          </Field>
          <Field label="所在地">
            <input
              {...register("basicInfo.location")}
              placeholder="城市"
              className={inputClass}
            />
          </Field>
          <Field label="作品集 / 主页">
            <input
              {...register("basicInfo.portfolioUrl")}
              placeholder="https://"
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section title="个人简介">
        <textarea
          {...register("summary")}
          rows={4}
          placeholder="两三句话写下你是谁、想找什么工作。"
          className={`${inputClass} resize-y leading-relaxed`}
        />
      </Section>

      <Section
        title="经历"
        actions={
          <div className="flex gap-2">
            {experienceKinds.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  const id = newId();
                  experiencesField.append({
                    id,
                    kind,
                    title: "",
                    org: "",
                    role: "",
                    startDate: "",
                    endDate: "",
                    location: "",
                    highlights: [],
                  });
                  // Newly added cards start expanded; no-op against the Set.
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                  });
                }}
                className="rounded-lg bg-warm-sand px-3 py-1.5 text-[12.5px] text-charcoal-warm hover:bg-border-cream transition"
              >
                + {experienceKindLabels[kind]}
              </button>
            ))}
          </div>
        }
      >
        {experiencesField.fields.length === 0 ? (
          <EmptyRow text="还没有添加经历。从上面的按钮开始——教育、项目、实习都可以。" />
        ) : (
          <ul className="space-y-3">
            {experiencesField.fields.map((field, index) => {
              const isCollapsed = collapsed.has(field.id);
              const live = watch(`experiences.${index}`);
              const title = live?.title || "（未命名）";
              const meta = [live?.org, live?.role, dateRange(live?.startDate, live?.endDate)]
                .filter(Boolean)
                .join(" · ");

              return (
                <li
                  key={field.id}
                  className="rounded-2xl bg-ivory ring-1 ring-border-warm"
                >
                  <div className="flex items-center justify-between gap-2 px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(field.id)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <span className="text-[12.5px] text-terracotta tracking-wide shrink-0 w-16">
                        {experienceKindLabels[field.kind as ExperienceKind]}
                      </span>
                      <span className="font-serif text-[15px] text-near-black truncate">
                        {title}
                      </span>
                      <span className="text-[12.5px] text-olive-gray truncate">
                        {meta}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0 text-stone-gray">
                      <IconButton
                        title="上移"
                        disabled={index === 0}
                        onClick={() => experiencesField.move(index, index - 1)}
                      >
                        ↑
                      </IconButton>
                      <IconButton
                        title="下移"
                        disabled={index === experiencesField.fields.length - 1}
                        onClick={() => experiencesField.move(index, index + 1)}
                      >
                        ↓
                      </IconButton>
                      <IconButton
                        title={isCollapsed ? "展开" : "收起"}
                        onClick={() => toggleCollapse(field.id)}
                      >
                        {isCollapsed ? "＋" : "−"}
                      </IconButton>
                      <IconButton
                        title="删除"
                        onClick={() => experiencesField.remove(index)}
                        danger
                      >
                        ×
                      </IconButton>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="border-t border-border-warm px-5 py-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="标题">
                          <input
                            {...register(`experiences.${index}.title`)}
                            placeholder="项目 / 学校 / 公司名称"
                            className={inputClass}
                          />
                        </Field>
                        <Field label="组织 / 机构">
                          <input
                            {...register(`experiences.${index}.org`)}
                            className={inputClass}
                          />
                        </Field>
                        <Field label="角色">
                          <input
                            {...register(`experiences.${index}.role`)}
                            placeholder="主导 / 负责 / 成员 ..."
                            className={inputClass}
                          />
                        </Field>
                        <Field label="地点">
                          <input
                            {...register(`experiences.${index}.location`)}
                            className={inputClass}
                          />
                        </Field>
                        <Field label="开始">
                          <input
                            {...register(`experiences.${index}.startDate`)}
                            placeholder="2024.09"
                            className={inputClass}
                          />
                        </Field>
                        <Field label="结束">
                          <input
                            {...register(`experiences.${index}.endDate`)}
                            placeholder="至今 / 2025.06"
                            className={inputClass}
                          />
                        </Field>
                      </div>
                      <HighlightsEditor
                        control={control}
                        register={register}
                        setValue={setValue}
                        getValues={getValues}
                        resumeId={resumeId}
                        nestIndex={index}
                        canRewrite={canRewrite}
                        onRewriteOutcome={notifyRewriteResult}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section
        title="技能"
        actions={
          <button
            type="button"
            onClick={() =>
              skillsField.append({ id: newId(), category: "", items: [] })
            }
            className="rounded-lg bg-warm-sand px-3 py-1.5 text-[12.5px] text-charcoal-warm hover:bg-border-cream transition"
          >
            + 新增类别
          </button>
        }
      >
        {skillsField.fields.length === 0 ? (
          <EmptyRow text="例如：编程语言、框架、工具。每类一行。" />
        ) : (
          <ul className="space-y-3">
            {skillsField.fields.map((field, index) => (
              <li
                key={field.id}
                className="rounded-xl bg-ivory ring-1 ring-border-warm px-4 py-3 flex flex-wrap items-center gap-3"
              >
                <input
                  {...register(`skills.${index}.category`)}
                  placeholder="类别"
                  className={`${inputClass} w-40`}
                />
                <SkillItemsEditor
                  control={control}
                  register={register}
                  nestIndex={index}
                />
                <button
                  type="button"
                  onClick={() => skillsField.remove(index)}
                  className="text-[12px] text-stone-gray hover:text-error transition shrink-0"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="获奖荣誉"
        actions={
          <button
            type="button"
            onClick={() =>
              awardsField.append({
                id: newId(),
                title: "",
                date: "",
                issuer: "",
              })
            }
            className="rounded-lg bg-warm-sand px-3 py-1.5 text-[12.5px] text-charcoal-warm hover:bg-border-cream transition"
          >
            + 新增一条
          </button>
        }
      >
        {awardsField.fields.length === 0 ? (
          <EmptyRow text="奖学金、比赛名次、荣誉称号——写上时间、标题和颁发机构。" />
        ) : (
          <ul className="space-y-2">
            {awardsField.fields.map((field, index) => (
              <li
                key={field.id}
                className="rounded-xl bg-ivory ring-1 ring-border-warm px-4 py-3 flex flex-wrap items-center gap-3"
              >
                <input
                  {...register(`awards.${index}.date`)}
                  placeholder="2024.10"
                  className={`${inputClass} w-24`}
                />
                <input
                  {...register(`awards.${index}.title`)}
                  placeholder="标题（如 XCTF 全国第 5 名）"
                  className={`${inputClass} flex-1`}
                />
                <input
                  {...register(`awards.${index}.issuer`)}
                  placeholder="颁发机构"
                  className={`${inputClass} w-44`}
                />
                <button
                  type="button"
                  onClick={() => awardsField.remove(index)}
                  className="text-[12px] text-stone-gray hover:text-error transition shrink-0"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="证书"
        actions={
          <button
            type="button"
            onClick={() =>
              certificationsField.append({
                id: newId(),
                title: "",
                date: "",
                issuer: "",
              })
            }
            className="rounded-lg bg-warm-sand px-3 py-1.5 text-[12.5px] text-charcoal-warm hover:bg-border-cream transition"
          >
            + 新增一条
          </button>
        }
      >
        {certificationsField.fields.length === 0 ? (
          <EmptyRow text="CET-6、AWS、CKA 等——时间、名称、颁发机构（可选）。" />
        ) : (
          <ul className="space-y-2">
            {certificationsField.fields.map((field, index) => (
              <li
                key={field.id}
                className="rounded-xl bg-ivory ring-1 ring-border-warm px-4 py-3 flex flex-wrap items-center gap-3"
              >
                <input
                  {...register(`certifications.${index}.date`)}
                  placeholder="2024.06"
                  className={`${inputClass} w-24`}
                />
                <input
                  {...register(`certifications.${index}.title`)}
                  placeholder="证书名称（如 OSCP）"
                  className={`${inputClass} flex-1`}
                />
                <input
                  {...register(`certifications.${index}.issuer`)}
                  placeholder="颁发机构（可留空）"
                  className={`${inputClass} w-44`}
                />
                <button
                  type="button"
                  onClick={() => certificationsField.remove(index)}
                  className="text-[12px] text-stone-gray hover:text-error transition shrink-0"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {panelOpen && checkup.kind !== "idle" && (
        <CheckupPanel
          state={checkup}
          onDismiss={() => setPanelOpen(false)}
          onRerun={triggerCheckup}
        />
      )}

      <SharePanel resumeId={resumeId} initial={initialShare} />

      <footer className="flex items-center justify-between pt-4 border-t border-border-warm">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-[13px] text-stone-gray hover:text-error disabled:opacity-50 transition"
          >
            {isDeleting ? "删除中…" : "删除这份简历"}
          </button>
          <button
            type="button"
            onClick={onClone}
            disabled={isCloning}
            className="text-[13px] text-stone-gray hover:text-near-black disabled:opacity-50 transition"
            title="基于这份内容复制一份，用来针对不同岗位改写"
          >
            {isCloning ? "克隆中…" : "克隆成新版本"}
          </button>
        </div>
        <p className="text-[12px] text-stone-gray">
          Cmd / Ctrl + S 立即保存
        </p>
      </footer>
    </form>
  );
}

function dateRange(start?: string, end?: string) {
  if (!start && !end) return "";
  return `${start ?? ""} – ${end ?? ""}`.trim();
}

function HighlightsEditor({
  control,
  register,
  setValue,
  getValues,
  resumeId,
  nestIndex,
  canRewrite,
  onRewriteOutcome,
}: {
  control: Control<ResumeContent>;
  register: UseFormRegister<ResumeContent>;
  setValue: UseFormSetValue<ResumeContent>;
  getValues: UseFormGetValues<ResumeContent>;
  resumeId: string;
  nestIndex: number;
  canRewrite: boolean;
  onRewriteOutcome: (
    outcome: "success" | "quota-exceeded" | "other-error",
  ) => void;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `experiences.${nestIndex}.highlights` as never,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12.5px] text-olive-gray">亮点 / 产出</span>
        <button
          type="button"
          onClick={() => append("" as never)}
          className="text-[12px] text-terracotta hover:underline"
        >
          + 新增一条
        </button>
      </div>
      {fields.length === 0 ? (
        <p className="text-[12.5px] text-stone-gray">
          每一条写一句话——用动词开头，尽量带上数字和具体结果。
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, hi) => (
            <HighlightRow
              key={field.id}
              register={register}
              setValue={setValue}
              getValues={getValues}
              resumeId={resumeId}
              nestIndex={nestIndex}
              highlightIndex={hi}
              onRemove={() => remove(hi)}
              canRewrite={canRewrite}
              onRewriteOutcome={onRewriteOutcome}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type RewriteState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; block: RewriteBlock }
  | { kind: "error"; message: string };

function HighlightRow({
  register,
  setValue,
  getValues,
  resumeId,
  nestIndex,
  highlightIndex,
  onRemove,
  canRewrite,
  onRewriteOutcome,
}: {
  register: UseFormRegister<ResumeContent>;
  setValue: UseFormSetValue<ResumeContent>;
  getValues: UseFormGetValues<ResumeContent>;
  resumeId: string;
  nestIndex: number;
  highlightIndex: number;
  onRemove: () => void;
  canRewrite: boolean;
  onRewriteOutcome: (
    outcome: "success" | "quota-exceeded" | "other-error",
  ) => void;
}) {
  const [rewrite, setRewrite] = useState<RewriteState>({ kind: "idle" });

  const fieldPath =
    `experiences.${nestIndex}.highlights.${highlightIndex}` as const;

  const triggerRewrite = async () => {
    const current = getValues(fieldPath) ?? "";
    if (!current.trim()) {
      setRewrite({ kind: "error", message: "先写一句再改写" });
      return;
    }
    const experience = getValues(`experiences.${nestIndex}`);
    const context: Record<string, string> = {
      类型: experienceKindLabels[experience.kind as ExperienceKind],
    };
    if (experience.title) context["名称"] = experience.title;
    if (experience.org) context["机构"] = experience.org;
    if (experience.role) context["角色"] = experience.role;

    if (!canRewrite) {
      setRewrite({ kind: "error", message: "本月 AI 改写已用完" });
      return;
    }
    setRewrite({ kind: "loading" });
    const response = await rewriteHighlight({
      resumeId,
      text: current,
      context,
    });
    if (response.ok) {
      setRewrite({ kind: "result", block: response.result });
      onRewriteOutcome("success");
    } else {
      setRewrite({ kind: "error", message: response.error });
      onRewriteOutcome(
        response.error.includes("已用完") ? "quota-exceeded" : "other-error",
      );
    }
  };

  const accept = () => {
    if (rewrite.kind !== "result") return;
    setValue(fieldPath, rewrite.block.rewritten, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setRewrite({ kind: "idle" });
  };

  return (
    <li className="space-y-2">
      <div className="flex items-start gap-2">
        <span className="pt-2.5 text-olive-gray">·</span>
        <textarea
          {...register(fieldPath)}
          rows={2}
          className={`${inputClass} flex-1 resize-y`}
          placeholder="主导了什么 / 做出了什么 / 带来了什么结果"
        />
        <div className="pt-1 flex flex-col gap-1 items-center">
          <button
            type="button"
            onClick={triggerRewrite}
            disabled={rewrite.kind === "loading" || !canRewrite}
            title={canRewrite ? "AI 改写这一条" : "本月 AI 改写已用完"}
            className={
              "text-[11px] disabled:opacity-50 disabled:cursor-not-allowed " +
              (canRewrite
                ? "text-terracotta hover:underline disabled:cursor-wait"
                : "text-stone-gray")
            }
          >
            {rewrite.kind === "loading"
              ? "改写中…"
              : !canRewrite
                ? "已满"
                : "✨ 改写"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="删除这一条"
            className="text-[12px] text-stone-gray hover:text-error"
          >
            ×
          </button>
        </div>
      </div>
      {rewrite.kind === "result" && (
        <RewritePreview
          block={rewrite.block}
          onAccept={accept}
          onDiscard={() => setRewrite({ kind: "idle" })}
        />
      )}
      {rewrite.kind === "error" && (
        <p className="ml-4 text-[12px] text-error">{rewrite.message}</p>
      )}
    </li>
  );
}

function RewritePreview({
  block,
  onAccept,
  onDiscard,
}: {
  block: RewriteBlock;
  onAccept: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="motion-slide-in-soft ml-4 rounded-2xl bg-parchment ring-1 ring-border-warm px-4 py-4 space-y-3">
      <div>
        <p className="text-[11px] text-stone-gray mb-1 tracking-wide">原文</p>
        <p className="text-[13px] text-olive-gray leading-relaxed line-through decoration-stone-gray/60">
          {block.original}
        </p>
      </div>
      <div>
        <p className="text-[11px] text-terracotta mb-1 tracking-wide">
          AI 改写
        </p>
        <p className="text-[13.5px] text-near-black leading-relaxed">
          {block.rewritten}
        </p>
      </div>
      {block.reasons.length > 0 && (
        <div>
          <p className="text-[11px] text-stone-gray mb-1 tracking-wide">
            为什么这样改
          </p>
          <ul className="text-[12.5px] text-olive-gray leading-relaxed space-y-0.5">
            {block.reasons.map((r, i) => (
              <li key={i}>· {r}</li>
            ))}
          </ul>
        </div>
      )}
      {block.preservedFacts.length > 0 && (
        <div>
          <p className="text-[11px] text-stone-gray mb-1 tracking-wide">
            保留的事实
          </p>
          <p className="text-[12px] text-olive-gray leading-relaxed">
            {block.preservedFacts.join("、")}
          </p>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onAccept}
          className="rounded-lg bg-terracotta text-ivory px-3 py-1.5 text-[12.5px] font-medium hover:bg-coral transition"
        >
          采用
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-lg bg-warm-sand text-charcoal-warm px-3 py-1.5 text-[12.5px] hover:bg-border-cream transition"
        >
          放弃
        </button>
      </div>
    </div>
  );
}

function SkillItemsEditor({
  control,
  register,
  nestIndex,
}: {
  control: Control<ResumeContent>;
  register: UseFormRegister<ResumeContent>;
  nestIndex: number;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `skills.${nestIndex}.items` as never,
  });

  return (
    <div className="flex-1 flex flex-wrap items-center gap-2">
      {fields.map((field, si) => (
        <span
          key={field.id}
          className="inline-flex items-center gap-1 rounded-lg bg-warm-sand px-2 py-1"
        >
          <input
            {...register(`skills.${nestIndex}.items.${si}` as const)}
            className="bg-transparent text-[13px] text-near-black outline-none w-24"
          />
          <button
            type="button"
            onClick={() => remove(si)}
            className="text-[11px] text-stone-gray hover:text-error"
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => append("" as never)}
        className="text-[12px] text-terracotta hover:underline"
      >
        + 添加
      </button>
    </div>
  );
}

function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-[20px] text-near-black">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] text-olive-gray mb-1.5 tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-ivory/60 ring-1 ring-dashed ring-border-warm px-5 py-6 text-center">
      <p className="text-[13px] text-stone-gray leading-relaxed">{text}</p>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[14px] transition ${
        danger
          ? "hover:bg-error/10 hover:text-error"
          : "hover:bg-warm-sand hover:text-near-black"
      } disabled:opacity-30 disabled:pointer-events-none`}
    >
      {children}
    </button>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state.kind === "idle") {
    return <span className="text-[12.5px] text-stone-gray">等待输入</span>;
  }
  if (state.kind === "dirty") {
    return (
      <span className="text-[12.5px] text-olive-gray flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-olive-gray animate-pulse" />
        编辑中
      </span>
    );
  }
  if (state.kind === "saving") {
    return (
      <span className="text-[12.5px] text-olive-gray flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse" />
        保存中…
      </span>
    );
  }
  if (state.kind === "saved") {
    return (
      <span className="text-[12.5px] text-olive-gray">
        已保存 · {formatTime(state.at)}
      </span>
    );
  }
  return (
    <span className="text-[12.5px] text-error">保存失败：{state.message}</span>
  );
}

const inputClass =
  "w-full rounded-xl bg-white ring-1 ring-border-warm px-3 py-2 text-[14px] text-near-black placeholder:text-warm-silver focus:outline-none focus:ring-2 focus:ring-terracotta transition";

function SharePanel({
  resumeId,
  initial,
}: {
  resumeId: string;
  initial: ShareSnapshot;
}) {
  const [state, setState] = useState<ShareSnapshot>(initial);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = state.enabled && state.token
    ? `${clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/r/${state.token}`
    : null;

  const toggle = (nextEnabled: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await setShareEnabled(resumeId, nextEnabled);
      if (res.ok) {
        setState({ enabled: nextEnabled, token: res.token ?? state.token });
      } else {
        setError(res.error);
      }
    });
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("复制失败，请手动选中链接");
    }
  };

  return (
    <section className="rounded-3xl bg-ivory ring-1 ring-border-warm px-6 md:px-8 py-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="overline mb-1.5">分享这份简历</p>
          <h2 className="font-serif text-[17px] text-near-black">
            给 HR 一个链接，而不是一份附件
          </h2>
        </div>
        <button
          type="button"
          onClick={() => toggle(!state.enabled)}
          disabled={pending}
          className={
            "rounded-lg px-3 py-1.5 text-[12.5px] transition disabled:opacity-60 " +
            (state.enabled
              ? "bg-warm-sand text-charcoal-warm hover:bg-border-cream"
              : "bg-terracotta text-ivory hover:bg-coral")
          }
        >
          {pending
            ? "处理中…"
            : state.enabled
              ? "关闭分享"
              : "生成分享链接"}
        </button>
      </div>

      {state.enabled && url ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              onClick={(e) => e.currentTarget.select()}
              className="flex-1 rounded-lg bg-white ring-1 ring-border-warm px-3 py-2 text-[13px] text-near-black font-mono"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-lg bg-warm-sand text-charcoal-warm px-3 py-2 text-[13px] hover:bg-border-cream transition"
            >
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          <p className="text-[12px] text-stone-gray leading-relaxed">
            任何拿到这个链接的人都能直接查看你最新版本的 PDF。每次编辑器改动会
            在大约 1 分钟内同步过去（CDN 缓存）。
          </p>
        </div>
      ) : (
        <p className="text-[13px] text-olive-gray leading-relaxed">
          开启后生成一个只读链接，对方不需要登录。想关的时候随时关，旧链接会立刻失效。
        </p>
      )}

      {error ? (
        <p className="mt-2 text-[12.5px] text-error">{error}</p>
      ) : null}
    </section>
  );
}

function TargetRolePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {jobsSection.categories.map((cat) => {
          const active = value.trim() === cat.name;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onChange(active ? "" : cat.name)}
              className={
                "rounded-full px-3.5 py-1.5 text-[12.5px] ring-1 transition-all duration-200 " +
                (active
                  ? "bg-terracotta text-ivory ring-terracotta shadow-[0_6px_18px_-12px_rgba(201,100,66,0.8)]"
                  : "bg-white text-charcoal-warm ring-border-warm hover:ring-terracotta hover:text-near-black")
              }
            >
              {cat.name}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="或者写得更具体，例如「前端工程师 · React 方向」"
        className={inputClass}
      />
    </div>
  );
}

const dimensionLabels: Record<keyof CheckupResult["dimensionScores"], string> =
  {
    structure: "结构",
    jobMatch: "岗位匹配",
    professionalTone: "专业语气",
    outcome: "产出描述",
    conciseness: "简洁度",
  };

const severityOrder: Record<CheckupIssue["severity"], number> = {
  critical: 0,
  moderate: 1,
  suggestion: 2,
};

const severityStyle: Record<
  CheckupIssue["severity"],
  { label: string; className: string }
> = {
  critical: {
    label: "需要修改",
    className: "bg-error/10 text-error ring-error/20",
  },
  moderate: {
    label: "可以更好",
    className: "bg-terracotta/10 text-terracotta ring-terracotta/20",
  },
  suggestion: {
    label: "建议",
    className: "bg-warm-sand text-charcoal-warm ring-border-warm",
  },
};

function CheckupPanel({
  state,
  onDismiss,
  onRerun,
}: {
  state: Exclude<CheckupState, { kind: "idle" }>;
  onDismiss: () => void;
  onRerun: () => void;
}) {
  return (
    <section className="motion-slide-in-soft rounded-3xl bg-ivory ring-1 ring-border-warm px-8 py-7">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="overline mb-1.5">AI 体检报告</p>
          <h2 className="font-serif text-[20px] text-near-black">
            {state.kind === "running"
              ? "正在读你的简历，别走开…"
              : state.kind === "error"
                ? "体检失败"
                : "这份简历的五项打分"}
          </h2>
        </div>
        <div className="flex gap-2 shrink-0">
          {state.kind === "result" && (
            <button
              type="button"
              onClick={onRerun}
              className="rounded-lg bg-warm-sand text-charcoal-warm px-3 py-1.5 text-[12.5px] hover:bg-border-cream transition"
            >
              重新体检
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg text-stone-gray px-2.5 py-1.5 text-[12.5px] hover:text-near-black transition"
          >
            收起
          </button>
        </div>
      </div>

      {state.kind === "running" && (
        <p className="text-[13.5px] text-olive-gray leading-relaxed">
          DeepSeek 正在按 5 个维度通读你的简历，一般 10-20 秒。
        </p>
      )}

      {state.kind === "error" && (
        <p className="text-[13.5px] text-error leading-relaxed">
          {state.message}
        </p>
      )}

      {state.kind === "result" && <CheckupReport data={state.data} />}
    </section>
  );
}

function CheckupReport({ data }: { data: CheckupResult }) {
  const sortedIssues = [...data.issues].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-[auto_1fr] gap-5 sm:gap-8 items-start">
        <div className="flex flex-col items-center">
          <span className="font-serif text-[44px] sm:text-[52px] leading-none text-near-black">
            {data.overallScore}
          </span>
          <span className="text-[11px] text-stone-gray mt-1 tracking-wide">
            总分 · 满分 100
          </span>
        </div>
        <p className="text-[13.5px] sm:text-[14px] text-charcoal-warm leading-relaxed pt-1">
          {data.summary}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {(Object.keys(dimensionLabels) as Array<
          keyof CheckupResult["dimensionScores"]
        >).map((key) => {
          const score = data.dimensionScores[key];
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11.5px] text-olive-gray">
                  {dimensionLabels[key]}
                </span>
                <span className="text-[13px] text-near-black tabular-nums">
                  {score}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-warm-sand overflow-hidden">
                <div
                  className="h-full bg-terracotta rounded-full transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {sortedIssues.length > 0 && (
        <div>
          <p className="text-[12.5px] text-olive-gray tracking-wide mb-3">
            共 {sortedIssues.length} 条建议（按严重度排序）
          </p>
          <ul className="space-y-3">
            {sortedIssues.map((issue, i) => {
              const sev = severityStyle[issue.severity];
              const dim = dimensionLabels[
                issue.dimension as keyof typeof dimensionLabels
              ] ?? issue.dimension;
              return (
                <li
                  key={i}
                  className="rounded-2xl bg-white ring-1 ring-border-warm px-5 py-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`rounded-md ring-1 px-2 py-0.5 text-[11px] font-medium ${sev.className}`}
                    >
                      {sev.label}
                    </span>
                    <span className="text-[11.5px] text-stone-gray">
                      {dim}
                    </span>
                    {issue.section && (
                      <span className="text-[11.5px] text-stone-gray">
                        · {issue.section}
                      </span>
                    )}
                  </div>
                  <p className="font-serif text-[14.5px] text-near-black mb-1.5 leading-snug">
                    {issue.title}
                  </p>
                  <p className="text-[13px] text-olive-gray leading-relaxed">
                    {issue.detail}
                  </p>
                  {issue.suggestedRewrite && (
                    <div className="mt-3 rounded-xl bg-parchment px-4 py-2.5">
                      <p className="text-[11px] text-terracotta tracking-wide mb-1">
                        可以这样写
                      </p>
                      <p className="text-[13px] text-near-black leading-relaxed">
                        {issue.suggestedRewrite}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
