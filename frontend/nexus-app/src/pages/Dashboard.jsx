"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import Sidebar from "../component/layout/Sidebar";
import Navbar from "../component/dashboard/DashboardNavbar";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { FeatherCode } from "@subframe/core";
import PuckErrorBoundary from "../component/common/PuckErrorBoundary";
import { createDefaultPuckData, puckConfig } from "../puck/config";
import {
  fetchPageConfig,
  PAGE_CONFIG_UPDATED_EVENT,
  PAGE_KEY_DASHBOARD_LAYOUT,
} from "../puck/pageConfigApi";

function Dashboard() {
  const [data, setData] = useState(() => createDefaultPuckData());
  const [isLoading, setIsLoading] = useState(true);

  const loadLayout = useCallback(async (setLoading = false) => {
    try {
      if (setLoading) {
        setIsLoading(true);
      }
      const payload = await fetchPageConfig(PAGE_KEY_DASHBOARD_LAYOUT);
      setData(payload);
    } catch (error) {
      console.error("Dashboard layout load error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSafely = async (setLoading = false) => {
      if (!isMounted) {
        return;
      }
      await loadLayout(setLoading);
    };

    const handleFocus = () => {
      loadSafely();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadSafely();
      }
    };

    const handleConfigUpdate = (event) => {
      if (event?.detail?.pageKey === PAGE_KEY_DASHBOARD_LAYOUT) {
        loadSafely();
      }
    };

    loadSafely(true);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(PAGE_CONFIG_UPDATED_EVENT, handleConfigUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(PAGE_CONFIG_UPDATED_EVENT, handleConfigUpdate);
    };
  }, [loadLayout]);

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar activeItem="dashboard" showTeamSubmenu={true} logoClickable={true} />

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-default-background">
        <TopbarWithRightNav
          className="sticky top-0 z-10 border-b border-solid border-neutral-border bg-white/95 px-8 py-4 backdrop-blur"
          leftSlot={<Navbar />}
          rightSlot={
            <>
              <Badge variant="neutral" icon={<FeatherCode />}>
                Dashboard
              </Badge>
              <Badge variant="success">Canli Veri</Badge>
            </>
          }
        />

        <div className="flex w-full flex-col gap-8 px-8 py-8">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500">
              Dashboard yerlesimi yukleniyor...
            </div>
          ) : (
            <PuckErrorBoundary>
              <Render config={puckConfig} data={data} />
            </PuckErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
