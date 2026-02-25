"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
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
  const [stats, setStats] = useState({
    totalSnippets: 0,
    activeTeam: 0,
    latestSnippet: null,
  });
  const [teamActivities, setTeamActivities] = useState([]);

  // 1. Ekip aktivitelerini cek
  useEffect(() => {
    const fetchTeamActivities = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:8000/api/status/", {
          headers: { Authorization: `Token ${token}` },
        });
        setTeamActivities(res.data);
      } catch (err) {
        console.error("Ekip aktiviteleri alinamadi:", err);
      }
    };
    fetchTeamActivities();
  }, []);

  // 2. Istatistikleri cek
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Token ${token}` } };
        const snippetRes = await axios.get("http://localhost:8000/api/snippets/", config);
        const teamRes = await axios.get("http://localhost:8000/api/status/", config);

        setStats({
          totalSnippets: snippetRes.data.length,
          activeTeam: teamRes.data.length,
          latestSnippet: snippetRes.data[0],
        });
      } catch (err) {
        console.error("Dashboard veri hatasi:", err);
      }
    };
    fetchData();
  }, []);

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
