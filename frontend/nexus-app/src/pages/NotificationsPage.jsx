"use client";

import React from "react";
import { FeatherBell } from "@subframe/core";
import Sidebar from "../component/layout/Sidebar";
import NotificationsPanel from "../component/settings/NotificationsPanel";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { useI18n } from "../I18nContext.jsx";

function NotificationsPage() {
  const { t } = useI18n();

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar activeItem="notifications" showTeamSubmenu={true} logoClickable={true} />

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-default-background">
        <TopbarWithRightNav
          className="border-b border-solid border-neutral-border bg-white px-4 py-3 sm:px-6 md:px-8"
          leftSlot={
            <Badge variant="neutral" icon={<FeatherBell />}>
              {t("notifications.workspace")}
            </Badge>
          }
          rightSlot={<Badge variant="success">{t("settings.secure")}</Badge>}
        />

        <div className="w-full px-4 py-6 sm:px-6 md:px-8 md:py-10">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2.5rem] sm:p-8 lg:p-12">
            <NotificationsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationsPage;
