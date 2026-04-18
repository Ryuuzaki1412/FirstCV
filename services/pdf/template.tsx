import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import path from "node:path";
import {
  experienceKindLabels,
  type Award,
  type Certification,
  type Experience,
  type ExperienceKind,
  type ResumeContent,
  type SkillGroup,
} from "@/lib/resume/schema";

export type PdfLocale = "zh" | "en";

const experienceKindLabelsEn: Record<ExperienceKind, string> = {
  education: "Education",
  project: "Projects",
  internship: "Experience",
};

const sectionLabels = {
  zh: {
    targetRolePrefix: "目标方向",
    summary: "个人简介",
    skills: "技能",
    awards: "获奖荣誉",
    certifications: "证书",
    fallbackCategory: "其他",
    fallbackName: "未命名简历",
    unnamedExperience: "（未命名）",
  },
  en: {
    targetRolePrefix: "Target",
    summary: "Summary",
    skills: "Skills",
    awards: "Awards",
    certifications: "Certifications",
    fallbackCategory: "Other",
    fallbackName: "Untitled Resume",
    unnamedExperience: "(Untitled)",
  },
} as const;

function pickKindLabels(locale: PdfLocale) {
  return locale === "en" ? experienceKindLabelsEn : experienceKindLabels;
}

// Register fonts once per process; later renders reuse the cache.
const fontsDir = path.join(process.cwd(), "public/fonts");

Font.register({
  family: "NotoSansSC",
  fonts: [
    { src: path.join(fontsDir, "NotoSansSC-Regular.otf"), fontWeight: 400 },
    { src: path.join(fontsDir, "NotoSansSC-Medium.otf"), fontWeight: 500 },
  ],
});

Font.register({
  family: "NotoSerifSC",
  src: path.join(fontsDir, "NotoSerifSC-Regular.otf"),
});

// Disable automatic hyphenation — it mangles CJK word boundaries.
Font.registerHyphenationCallback((word) => [word]);

const c = {
  ink: "#141413",
  body: "#3D3D3A",
  muted: "#5E5D59",
  faint: "#87867F",
  accent: "#C96442",
  separator: "#C0BFB8",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontFamily: "NotoSansSC",
    fontSize: 10.5,
    color: c.body,
    lineHeight: 1.5,
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  // Header
  headerBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  overline: {
    fontSize: 9.5,
    color: c.accent,
    letterSpacing: 0.6,
  },
  name: {
    fontFamily: "NotoSerifSC",
    fontSize: 32,
    lineHeight: 1.18,
    color: c.ink,
  },
  headline: {
    fontSize: 13,
    color: c.muted,
    lineHeight: 1.45,
  },

  // Contact row
  contactRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  contactItem: {
    fontSize: 10,
    color: c.faint,
  },
  contactSep: {
    fontSize: 10,
    color: c.separator,
  },

  // Accent rule
  rule: {
    width: 36,
    height: 1.5,
    backgroundColor: c.accent,
  },

  // Summary
  summary: {
    fontSize: 10.5,
    color: c.muted,
    lineHeight: 1.65,
  },

  // Target role overline under rule (if summary absent)
  targetRoleLine: {
    fontSize: 9.5,
    color: c.faint,
    letterSpacing: 0.4,
  },

  // Section header row
  sectionHeader: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionBar: {
    width: 3,
    height: 11,
    backgroundColor: c.accent,
  },
  sectionTitle: {
    fontFamily: "NotoSerifSC",
    fontSize: 13,
    color: c.ink,
    lineHeight: 1.2,
  },

  // Experience card
  expCard: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 10,
  },
  expTitleRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  expTitle: {
    fontFamily: "NotoSerifSC",
    fontSize: 12.5,
    color: c.ink,
    lineHeight: 1.3,
    flex: 1,
  },
  expDates: {
    fontSize: 10,
    color: c.faint,
    letterSpacing: 0.4,
  },
  expMeta: {
    fontSize: 10,
    color: c.muted,
    lineHeight: 1.5,
  },

  // Highlights
  highlightsGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    paddingTop: 4,
  },
  highlightRow: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
  },
  highlightBullet: {
    fontSize: 11,
    color: c.accent,
    lineHeight: 1.6,
  },
  highlightText: {
    fontSize: 10.5,
    color: c.body,
    lineHeight: 1.6,
    flex: 1,
  },

  // Two-column rows (skill / award / cert)
  twoColRow: {
    display: "flex",
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  colLabel: {
    width: 72,
    fontSize: 10,
    color: c.faint,
    lineHeight: 1.6,
    letterSpacing: 0.4,
  },
  colBody: {
    flex: 1,
  },
  colBodyText: {
    fontSize: 10.5,
    color: c.body,
    lineHeight: 1.6,
  },
  itemTitle: {
    fontFamily: "NotoSerifSC",
    fontSize: 11,
    color: c.ink,
    lineHeight: 1.4,
  },
  itemMeta: {
    fontSize: 10,
    color: c.muted,
    lineHeight: 1.5,
  },
});

function ContactRow({ content }: { content: ResumeContent }) {
  const parts = [
    content.basicInfo.location,
    content.basicInfo.phone,
    content.basicInfo.email,
    content.basicInfo.portfolioUrl,
  ].filter((p) => p.trim());
  if (parts.length === 0) return null;
  return (
    <View style={styles.contactRow}>
      {parts.map((part, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Text style={styles.contactItem}>{part}</Text>
          {i < parts.length - 1 ? (
            <Text style={styles.contactSep}>·</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );
}

function ExperienceCard({
  exp,
  unnamedLabel,
}: {
  exp: Experience;
  unnamedLabel: string;
}) {
  const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
  const meta = [exp.role, exp.org, exp.location].filter(Boolean).join(" · ");
  const highlights = exp.highlights.filter((h) => h.trim());

  return (
    <View style={styles.expCard} wrap={false}>
      <View style={styles.expTitleRow}>
        <Text style={styles.expTitle}>{exp.title || unnamedLabel}</Text>
        {dates ? <Text style={styles.expDates}>{dates}</Text> : null}
      </View>
      {meta ? <Text style={styles.expMeta}>{meta}</Text> : null}
      {highlights.length > 0 ? (
        <View style={styles.highlightsGroup}>
          {highlights.map((h, i) => (
            <View key={i} style={styles.highlightRow}>
              <Text style={styles.highlightBullet}>·</Text>
              <Text style={styles.highlightText}>{h}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ExperienceSection({
  kind,
  items,
  locale,
}: {
  kind: ExperienceKind;
  items: Experience[];
  locale: PdfLocale;
}) {
  const labels = sectionLabels[locale];
  return (
    <View>
      <SectionHeader label={pickKindLabels(locale)[kind]} />
      {items.map((exp) => (
        <ExperienceCard
          key={exp.id}
          exp={exp}
          unnamedLabel={labels.unnamedExperience}
        />
      ))}
    </View>
  );
}

function SkillsSection({
  skills,
  locale,
}: {
  skills: SkillGroup[];
  locale: PdfLocale;
}) {
  const labels = sectionLabels[locale];
  const useful = skills.filter(
    (s) => s.category.trim() || s.items.some((i) => i.trim()),
  );
  if (useful.length === 0) return null;
  return (
    <View>
      <SectionHeader label={labels.skills} />
      {useful.map((g) => (
        <View key={g.id} style={styles.twoColRow}>
          <Text style={styles.colLabel}>
            {g.category || labels.fallbackCategory}
          </Text>
          <Text style={[styles.colBodyText, { flex: 1 }]}>
            {g.items.filter((i) => i.trim()).join("  ·  ")}
          </Text>
        </View>
      ))}
    </View>
  );
}

function AwardsSection({
  awards,
  locale,
}: {
  awards: Award[];
  locale: PdfLocale;
}) {
  const labels = sectionLabels[locale];
  const useful = awards.filter((a) => a.title.trim() || a.date.trim());
  if (useful.length === 0) return null;
  return (
    <View>
      <SectionHeader label={labels.awards} />
      {useful.map((a) => (
        <View key={a.id} style={styles.twoColRow} wrap={false}>
          <Text style={styles.colLabel}>{a.date}</Text>
          <View style={styles.colBody}>
            <Text style={styles.itemTitle}>{a.title}</Text>
            {a.issuer.trim() ? (
              <Text style={styles.itemMeta}>{a.issuer}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function CertificationsSection({
  certs,
  locale,
}: {
  certs: Certification[];
  locale: PdfLocale;
}) {
  const labels = sectionLabels[locale];
  const useful = certs.filter((x) => x.title.trim() || x.date.trim());
  if (useful.length === 0) return null;
  return (
    <View>
      <SectionHeader label={labels.certifications} />
      {useful.map((cert) => {
        const title = cert.issuer.trim()
          ? `${cert.title} · ${cert.issuer}`
          : cert.title;
        return (
          <View key={cert.id} style={styles.twoColRow} wrap={false}>
            <Text style={styles.colLabel}>{cert.date}</Text>
            <Text style={[styles.itemTitle, { flex: 1 }]}>{title}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ResumeDocument({
  content,
  locale = "zh",
}: {
  content: ResumeContent;
  locale?: PdfLocale;
}) {
  const {
    basicInfo,
    targetRole,
    summary,
    experiences,
    skills,
    awards,
    certifications,
  } = content;

  const labels = sectionLabels[locale];
  const displayName = basicInfo.name.trim() || labels.fallbackName;
  const groups: Record<ExperienceKind, Experience[]> = {
    education: [],
    project: [],
    internship: [],
  };
  for (const exp of experiences) {
    groups[exp.kind as ExperienceKind]?.push(exp);
  }
  const nonEmptyKinds = (
    ["project", "education", "internship"] as ExperienceKind[]
  ).filter((k) => groups[k].length > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBlock}>
          {targetRole.trim() ? (
            <Text style={styles.overline}>
              {labels.targetRolePrefix} · {targetRole}
            </Text>
          ) : null}
          <Text style={styles.name}>{displayName}</Text>
          {basicInfo.headline.trim() ? (
            <Text style={styles.headline}>{basicInfo.headline}</Text>
          ) : null}
        </View>

        <ContactRow content={content} />

        <View style={styles.rule} />

        {summary.trim() ? (
          <Text style={styles.summary}>{summary}</Text>
        ) : null}

        {nonEmptyKinds.map((kind) => (
          <ExperienceSection
            key={kind}
            kind={kind}
            items={groups[kind]}
            locale={locale}
          />
        ))}

        <SkillsSection skills={skills} locale={locale} />
        <AwardsSection awards={awards} locale={locale} />
        <CertificationsSection certs={certifications} locale={locale} />
      </Page>
    </Document>
  );
}
