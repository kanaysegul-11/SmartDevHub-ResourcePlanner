"use client";
import React from "react";
import { useList } from "@refinedev/core";
import Sidebar from "../component/layout/Sidebar";
import Navbar from "../component/dashboard/DashboardNavbar";
import DashboardSummary from "../component/dashboard/DashboardSummary";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { IconWithBackground } from "../ui/components/IconWithBackground";
import { Badge } from "../ui/components/Badge";
import {
  FeatherCode,
  FeatherUsers,
  FeatherCheckCircle,
} from "@subframe/core";

function Dashboard() {
  const { result: snippetsResult, query: snippetsQuery } = useList({
    resource: "snippets",
  });
  const { result: statusResult, query: statusQuery } = useList({
    resource: "status",
  });

  const snippets = snippetsResult?.data ?? [];
  const teamActivities = statusResult?.data ?? [];
  console.log("Dashboard raw", {
    snippetsResult,
    statusResult,
    snippetsStatus: {
      isLoading: snippetsQuery?.isLoading,
      isError: snippetsQuery?.isError,
      error: snippetsQuery?.error,
    },
    statusStatus: {
      isLoading: statusQuery?.isLoading,
      isError: statusQuery?.isError,
      error: statusQuery?.error,
    },
  });
  console.log("Dashboard data", { snippets, teamActivities });

  const stats = {
    totalSnippets: snippets.length,
    activeTeam: teamActivities.length,
    latestSnippet: snippets[0] || null,
  };

  const statCards = [
    {
      key: "snippets",
      label: "Toplam Snippet",
      value: stats.totalSnippets,
      icon: <FeatherCode />,
      iconVariant: "brand",
      valueClassName: "text-slate-800",
      badge: null,
    },
    {
      key: "team",
      label: "Aktif Ekip",
      value: stats.activeTeam,
      icon: <FeatherUsers />,
      iconVariant: "neutral",
      valueClassName: "text-slate-800",
      badge: null,
    },
    {
      key: "system",
      label: "Sistem",
      value: "Çevrimiçi",
      icon: <FeatherCheckCircle />,
      iconVariant: "success",
      valueClassName: "text-success-800",
      badge: <Badge variant="success">Çalışıyor</Badge>,
    },
  ];

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar />

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-default-background">
        <TopbarWithRightNav
          className="sticky top-0 z-10 border-b border-solid border-neutral-border bg-white/95 px-8 py-4 backdrop-blur"
          leftSlot={<Navbar />}
          rightSlot={
            <>
              <Badge variant="neutral" icon={<FeatherCode />}>
                Dashboard
              </Badge>
              <Badge variant="success">Canlı Veri</Badge>
            </>
          }
        />

        <div className="flex w-full flex-col gap-8 px-8 py-8">
          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
            {statCards.map((card) => (
              <div
                key={card.key}
                className="flex items-center gap-4 rounded-2xl border border-solid border-neutral-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <IconWithBackground
                  size="large"
                  square={true}
                  variant={card.iconVariant}
                  icon={card.icon}
                  className="shrink-0"
                />
                <div className="flex min-w-0 grow flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-caption-bold font-caption-bold uppercase tracking-wide text-subtext-color">
                      {card.label}
                    </span>
                    {card.badge}
                  </div>
                  <span className={`text-3xl font-black ${card.valueClassName}`}>
                    {card.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <DashboardSummary stats={stats} teamActivities={teamActivities} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
