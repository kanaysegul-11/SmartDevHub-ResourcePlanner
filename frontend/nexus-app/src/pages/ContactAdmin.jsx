"use client";

import React, { useEffect, useState } from "react";
import { FeatherMessageCircle, FeatherShield } from "@subframe/core";
import { useLocation } from "react-router-dom";
import Sidebar from "../component/layout/Sidebar";
import TeamConversationPanel from "../component/team/TeamConversationPanel.jsx";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { apiClient } from "../refine/axios";
import { useI18n } from "../I18nContext.jsx";

function ContactAdmin() {
  const { t } = useI18n();
  const location = useLocation();
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const chatAdminId = new URLSearchParams(location.search).get("chat");
  const chatAdminUserId = new URLSearchParams(location.search).get("chatUser");

  useEffect(() => {
    let ignore = false;

    const loadAdmins = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/admin-contacts/");
        if (ignore) return;
        const nextAdmins = Array.isArray(response.data) ? response.data : [];
        setAdmins(nextAdmins);
        const routedAdmin =
          nextAdmins.find((item) => String(item.id) === String(chatAdminId || "")) ||
          nextAdmins.find(
            (item) => String(item.user_details?.id || "") === String(chatAdminUserId || "")
          ) ||
          null;

        setSelectedAdmin((current) => {
          if (routedAdmin) return routedAdmin;
          return current && nextAdmins.some((item) => item.id === current.id)
            ? current
            : nextAdmins[0] || null;
        });
      } catch {
        if (!ignore) {
          setAdmins([]);
          setSelectedAdmin(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadAdmins();
    return () => {
      ignore = true;
    };
  }, [chatAdminId, chatAdminUserId]);

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="administrators" showTeamSubmenu={true} logoClickable={true} />

      <div className="relative flex grow flex-col items-start self-stretch overflow-y-auto pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />

        <div className="relative flex w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={
              <Badge variant="neutral" icon={<FeatherMessageCircle />}>
                {t("contactAdmin.workspace")}
              </Badge>
            }
            rightSlot={<Badge variant="success">{t("contactAdmin.directLine")}</Badge>}
          />

          <div className="flex w-full flex-col gap-8 px-6 pb-10 md:px-8 xl:px-10">
            <section className="rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)] backdrop-blur lg:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {t("contactAdmin.title")}
              </p>
              <h1 className="mt-3 font-['Newsreader'] text-4xl font-medium tracking-tight text-slate-950">
                {t("contactAdmin.heading")}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                {t("contactAdmin.body")}
              </p>
            </section>

            <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)] backdrop-blur lg:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {t("contactAdmin.adminList")}
                </p>
                <p className="mt-3 text-xl font-black tracking-tight text-slate-950">
                  {t("contactAdmin.chooseAdmin")}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t("contactAdmin.chooseAdminBody")}
                </p>

                {loading ? (
                  <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-500">
                    {t("app.loading")}
                  </div>
                ) : admins.length ? (
                  <div className="mt-6 space-y-3">
                    {admins.map((admin) => {
                      const active = selectedAdmin?.id === admin.id;
                      return (
                        <button
                          key={admin.id}
                          type="button"
                          onClick={() => setSelectedAdmin(admin)}
                          className={`w-full rounded-[24px] border p-4 text-left transition ${
                            active
                              ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
                              : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-[18px] ${active ? "bg-white/15 text-white" : "bg-sky-100 text-sky-700"}`}>
                              <FeatherShield size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="break-words text-base font-black">
                                {admin.employee_name || admin.user_details?.username}
                              </p>
                              <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.18em] ${active ? "text-slate-300" : "text-slate-400"}`}>
                                {admin.position || t("team.noPosition")}
                              </p>
                              <p className={`mt-3 text-sm leading-6 ${active ? "text-slate-200" : "text-slate-600"}`}>
                                {admin.current_work || t("team.noFocus")}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-500">
                    {t("contactAdmin.noAdmins")}
                  </div>
                )}
              </aside>

              <TeamConversationPanel member={selectedAdmin} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactAdmin;
