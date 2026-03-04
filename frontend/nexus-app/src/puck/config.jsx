/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { useList } from "@refinedev/core";
import DashboardSummary from "../component/dashboard/DashboardSummary";
import SentimentChart from "../component/analytics/SentimentChart";
import { Badge } from "../ui/components/Badge";
import { IconWithBackground } from "../ui/components/IconWithBackground";
import {
  FeatherBookOpen,
  FeatherCheckCircle,
  FeatherCode,
  FeatherUsers,
} from "@subframe/core";

const fallbackStats = [
  { label: "Toplam Snippet", value: "0", badgeText: "" },
  { label: "Aktif Ekip", value: "0", badgeText: "" },
  { label: "Sistem", value: "Online", badgeText: "Calisiyor" },
];

function normalizeStatsData(data = fallbackStats) {
  const safe = (Array.isArray(data) ? data : []).filter(
    (item) => item && typeof item === "object"
  );
  const base = safe.length ? safe : fallbackStats;
  const [a, b, c] = base;
  return [
    {
      label: a?.label ?? "Toplam Snippet",
      value: a?.value ?? "0",
      badgeText: a?.badgeText ?? "",
    },
    {
      label: b?.label ?? "Aktif Ekip",
      value: b?.value ?? "0",
      badgeText: b?.badgeText ?? "",
    },
    {
      label: c?.label ?? "Sistem",
      value: c?.value ?? "Online",
      badgeText: c?.badgeText ?? "Calisiyor",
    },
  ];
}

function toSentimentData(comments = [], loading = false) {
  if (loading) {
    return [
      { name: "Memnun", value: 1, color: "#22c55e", percentage: null },
      { name: "Notr", value: 1, color: "#9333ea", percentage: null },
      { name: "Mutsuz", value: 1, color: "#ef4444", percentage: null },
    ];
  }

  const buckets = comments.reduce(
    (acc, c) => {
      const rating = Number(c?.experience_rating);
      if (rating >= 4) acc.happy += 1;
      else if (rating === 3) acc.neutral += 1;
      else if (rating > 0 && rating <= 2) acc.unhappy += 1;
      return acc;
    },
    { happy: 0, neutral: 0, unhappy: 0 }
  );

  const total = comments.length;
  const pct = (x) => (total ? Math.round((x / total) * 100) : 0);

  return [
    {
      name: "Memnun",
      value: pct(buckets.happy),
      color: "#22c55e",
      percentage: pct(buckets.happy),
    },
    {
      name: "Notr",
      value: pct(buckets.neutral),
      color: "#9333ea",
      percentage: pct(buckets.neutral),
    },
    {
      name: "Mutsuz",
      value: pct(buckets.unhappy),
      color: "#ef4444",
      percentage: pct(buckets.unhappy),
    },
  ];
}

function HeroBanner({ title = "Dashboard", subtitle = "" }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-black text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
    </section>
  );
}

function StatsCardsStatic({ data = [] }) {
  const cards = normalizeStatsData(data);
  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {cards.map((card, i) => {
        const icon = i === 0 ? <FeatherCode /> : i === 1 ? <FeatherUsers /> : <FeatherCheckCircle />;
        const iconVariant = i === 0 ? "brand" : i === 1 ? "neutral" : "success";
        return (
          <article
            key={`${card?.label?.toString?.() ?? "card"}-${i}`}
            className="flex items-center gap-4 rounded-2xl border border-solid border-neutral-border bg-white p-5 shadow-sm"
          >
            <IconWithBackground
              size="large"
              square={true}
              variant={iconVariant}
              icon={icon}
              className="shrink-0"
            />
            <div className="flex min-w-0 grow flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-caption-bold font-caption-bold uppercase tracking-wide text-subtext-color">
                  {card?.label?.toString?.() ?? "Yukleniyor"}
                </span>
                {card?.badgeText ? <Badge variant="success">{card.badgeText}</Badge> : null}
              </div>
              <span className="text-3xl font-black text-slate-800">
                {card?.value?.toString?.() ?? "0"}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function StatsCardsLive({ data = [] }) {
  const { result: snippetsResult, query: snippetsQuery } = useList({ resource: "snippets" });
  const { result: teamResult } = useList({ resource: "status" });

  const snippetsCount =
    (typeof snippetsResult?.total === "number" && snippetsResult.total) ||
    (Array.isArray(snippetsResult?.data) ? snippetsResult.data.length : 0);
  const teamCount =
    (typeof teamResult?.total === "number" && teamResult.total) ||
    (Array.isArray(teamResult?.data) ? teamResult.data.length : 0);
  const loading = snippetsQuery?.isLoading || snippetsQuery?.isFetching;

  const base = normalizeStatsData(data);
  const live = [
    { ...base[0], value: loading ? "..." : String(snippetsCount) },
    { ...base[1], value: String(teamCount) },
    base[2],
  ];

  return <StatsCardsStatic data={live} />;
}

function DashboardSummaryLive() {
  const { result: snippetsResult } = useList({ resource: "snippets" });
  const { result: statusResult } = useList({ resource: "status" });

  const snippets = snippetsResult?.data ?? [];
  const teamActivities = statusResult?.data ?? [];
  const stats = {
    totalSnippets: snippets.length,
    activeTeam: teamActivities.length,
    latestSnippet: snippets[0] || null,
  };

  return <DashboardSummary stats={stats} teamActivities={teamActivities} />;
}

function SentimentChartLive() {
  const { result: commentsResult, query: commentsQuery } = useList({ resource: "comments" });
  const comments = commentsResult?.data ?? [];
  const loading = commentsQuery?.isLoading || commentsQuery?.isFetching;
  return <SentimentChart data={toSentimentData(comments, loading)} isLoading={loading} />;
}

function SnippetHighlightsLive({ title = "Snippet Ozetleri", limit = 3 }) {
  const { result: snippetsResult, query: snippetsQuery } = useList({ resource: "snippets" });
  const snippets = (snippetsResult?.data ?? []).slice(0, Math.max(1, Number(limit) || 3));
  const loading = snippetsQuery?.isLoading || snippetsQuery?.isFetching;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-800">
        <FeatherBookOpen size={18} /> {title}
      </h3>
      {loading ? (
        <p className="text-sm text-slate-500">Yukleniyor...</p>
      ) : snippets.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {snippets.map((snippet) => (
            <a
              key={snippet.id}
              href={`/snippets/${snippet.id}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-purple-300"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-purple-600">
                {snippet.language || "unknown"}
              </div>
              <div className="mt-1 line-clamp-1 font-bold text-slate-800">{snippet.title}</div>
              <div className="mt-1 line-clamp-2 text-xs text-slate-500">{snippet.description}</div>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Henüz snippet bulunmuyor.</p>
      )}
    </section>
  );
}

const fields = {
  HeroBanner: {
    title: { type: "text" },
    subtitle: { type: "text" },
  },
  DashboardStatsCards: {
    data: {
      type: "array",
      arrayFields: {
        label: { type: "text" },
        value: { type: "text" },
        badgeText: { type: "text" },
      },
    },
  },
  SnippetHighlights: {
    title: { type: "text" },
    limit: { type: "number" },
  },
  Spacer: {
    size: { type: "number" },
  },
};

export const createDefaultPuckData = () => ({
  content: [
    {
      type: "HeroBanner",
      props: {
        title: "Nexus Dashboard",
        subtitle: "Yerlesim JSON ile yonetilir.",
      },
    },
    {
      type: "DashboardStatsCards",
      props: {
        data: fallbackStats,
      },
    },
    {
      type: "DashboardSummary",
      props: {},
    },
  ],
  root: { props: {} },
  zones: {},
});

export const puckConfig = {
  components: {
    HeroBanner: {
      fields: fields.HeroBanner,
      defaultProps: { title: "Nexus Dashboard", subtitle: "" },
      render: (props = {}) => (
        <HeroBanner
          title={props?.title ?? "Nexus Dashboard"}
          subtitle={props?.subtitle ?? ""}
        />
      ),
    },
    DashboardStatsCards: {
      fields: fields.DashboardStatsCards,
      defaultProps: { data: fallbackStats },
      render: (props = {}) => (
        <StatsCardsLive data={Array.isArray(props?.data) ? props.data : []} />
      ),
    },
    DashboardSummary: {
      fields: {},
      defaultProps: {},
      render: () => <DashboardSummaryLive />,
    },
    SentimentChart: {
      fields: {},
      defaultProps: {},
      render: () => <SentimentChartLive />,
    },
    SnippetHighlights: {
      fields: fields.SnippetHighlights,
      defaultProps: { title: "Snippet Ozetleri", limit: 3 },
      render: (props = {}) => (
        <SnippetHighlightsLive
          title={props?.title ?? "Snippet Ozetleri"}
          limit={props?.limit ?? 3}
        />
      ),
    },
    Spacer: {
      fields: fields.Spacer,
      defaultProps: { size: 24 },
      render: (props = {}) => <div style={{ height: props?.size ?? 24 }} />,
    },
  },
};

export const puckEditorConfig = {
  components: {
    HeroBanner: {
      fields: fields.HeroBanner,
      defaultProps: { title: "Nexus Dashboard", subtitle: "" },
      render: (props = {}) => (
        <HeroBanner
          title={props?.title ?? "Nexus Dashboard"}
          subtitle={props?.subtitle ?? ""}
        />
      ),
    },
    DashboardStatsCards: {
      fields: fields.DashboardStatsCards,
      defaultProps: { data: fallbackStats },
      render: (props = {}) => (
        <StatsCardsStatic data={Array.isArray(props?.data) ? props.data : []} />
      ),
    },
    DashboardSummary: {
      fields: {},
      defaultProps: {},
      render: () => (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          DashboardSummary (Canli veri blogu)
        </section>
      ),
    },
    SentimentChart: {
      fields: {},
      defaultProps: {},
      render: () => (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          SentimentChart (Canli veri blogu)
        </section>
      ),
    },
    SnippetHighlights: {
      fields: fields.SnippetHighlights,
      defaultProps: { title: "Snippet Ozetleri", limit: 3 },
      render: (props = {}) => (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {(props?.title ?? "Snippet Ozetleri").toString()} - limit: {(props?.limit ?? 3).toString()}
        </section>
      ),
    },
    Spacer: {
      fields: fields.Spacer,
      defaultProps: { size: 24 },
      render: (props = {}) => <div style={{ height: props?.size ?? 24 }} />,
    },
  },
};



