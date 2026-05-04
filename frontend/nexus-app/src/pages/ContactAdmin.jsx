"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FeatherMessageCircle, FeatherShield, FeatherUsers } from "@subframe/core";
import { useLocation } from "react-router-dom";
import Sidebar from "../component/layout/Sidebar";
import TeamConversationPanel from "../component/team/TeamConversationPanel.jsx";
import { useUser } from "../UserContext.jsx";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { apiClient } from "../refine/axios";
import { useI18n } from "../I18nContext.jsx";

function ContactAdmin() {
  const { userData } = useUser();
  const { language, t } = useI18n();
  const location = useLocation();
  const isAdminView = Boolean(userData?.isAdmin);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const chatContactId = new URLSearchParams(location.search).get("chat");
  const chatContactUserId = new URLSearchParams(location.search).get("chatUser");

  const formatMessageTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(language || "en", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const pageCopy = useMemo(
    () =>
      isAdminView
        ? {
            workspace: t("adminInbox.workspace"),
            directLine: t("adminInbox.directLine"),
            title: t("adminInbox.title"),
            heading: t("adminInbox.heading"),
            body: t("adminInbox.body"),
            listLabel: t("adminInbox.conversationList"),
            chooseLabel: t("adminInbox.chooseConversation"),
            chooseBody: t("adminInbox.chooseConversationBody"),
            empty: t("adminInbox.empty"),
          }
        : {
            workspace: t("contactAdmin.workspace"),
            directLine: t("contactAdmin.directLine"),
            title: t("contactAdmin.title"),
            heading: t("contactAdmin.heading"),
            body: t("contactAdmin.body"),
            listLabel: t("contactAdmin.adminList"),
            chooseLabel: t("contactAdmin.chooseAdmin"),
            chooseBody: t("contactAdmin.chooseAdminBody"),
            empty: t("contactAdmin.noAdmins"),
          },
    [isAdminView, t]
  );

  useEffect(() => {
    let ignore = false;

    const syncSelectedContact = (nextContacts) => {
      const routedContact =
        nextContacts.find((item) => String(item.id) === String(chatContactId || "")) ||
        nextContacts.find(
          (item) =>
            String(item.user_details?.id || "") === String(chatContactUserId || "")
        ) ||
        null;

      setSelectedContact((current) => {
        if (routedContact) return routedContact;
        return current && nextContacts.some((item) => item.id === current.id)
          ? nextContacts.find((item) => item.id === current.id) || current
          : nextContacts[0] || null;
      });
    };

    const loadUserContacts = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/admin-contacts/");
        if (ignore) return;
        const nextContacts = Array.isArray(response.data) ? response.data : [];
        setContacts(nextContacts);
        syncSelectedContact(nextContacts);
      } catch {
        if (!ignore) {
          setContacts([]);
          setSelectedContact(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    const loadAdminInbox = async () => {
      setLoading(true);
      try {
        const [statusResponse, messagesResponse, adminContactsResponse] = await Promise.all([
          apiClient.get("/status/"),
          apiClient.get("/team-messages/"),
          apiClient.get("/admin-contacts/"),
        ]);
        if (ignore) return;

        const members = Array.isArray(statusResponse.data) ? statusResponse.data : [];
        const messages = Array.isArray(messagesResponse.data) ? messagesResponse.data : [];
        const adminStatuses = Array.isArray(adminContactsResponse.data)
          ? adminContactsResponse.data
          : [];
        const currentAdminStatus = adminStatuses.find(
          (item) => String(item.user_details?.id || "") === String(userData?.id || "")
        );
        const currentAdminStatusId = String(currentAdminStatus?.id || "");
        const currentUserId = String(userData?.id || "");
        const memberByStatusId = new Map(
          members.map((member) => [String(member.id), member])
        );
        const memberByUserId = new Map(
          members.map((member) => [String(member.user_details?.id || ""), member])
        );
        const conversations = new Map();

        messages.forEach((message) => {
          const senderId = String(message.sender_details?.id || "");
          const recipientStatusId = String(message.recipient || "");
          const sentByCurrentAdmin = senderId === currentUserId;
          const sentToCurrentAdmin =
            Boolean(currentAdminStatusId) && recipientStatusId === currentAdminStatusId;

          if (!sentByCurrentAdmin && !sentToCurrentAdmin) {
            return;
          }

          const partner = sentByCurrentAdmin
            ? memberByStatusId.get(recipientStatusId)
            : memberByUserId.get(senderId);
          if (!partner) {
            return;
          }

          const messageTimestamp = message.edited_at || message.created_at || "";
          const sortTime = new Date(messageTimestamp).getTime() || 0;
          const partnerKey = String(partner.id);
          const existingConversation = conversations.get(partnerKey);

          if (existingConversation && existingConversation.sortTime > sortTime) {
            return;
          }

          conversations.set(partnerKey, {
            ...partner,
            lastMessagePreview: String(message.content || "").trim(),
            lastMessageAt: messageTimestamp,
            lastMessageDirection: sentByCurrentAdmin ? "outgoing" : "incoming",
            sortTime,
          });
        });

        const nextContacts = Array.from(conversations.values())
          .sort((left, right) => {
            if (left.sortTime !== right.sortTime) {
              return right.sortTime - left.sortTime;
            }

            return String(left.employee_name || "").localeCompare(
              String(right.employee_name || ""),
              "tr"
            );
          })
          .map((contact) => {
            const nextContact = { ...contact };
            delete nextContact.sortTime;
            return nextContact;
          });

        setContacts(nextContacts);
        syncSelectedContact(nextContacts);
      } catch {
        if (!ignore) {
          setContacts([]);
          setSelectedContact(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    if (isAdminView) {
      void loadAdminInbox();
    } else {
      void loadUserContacts();
    }

    return () => {
      ignore = true;
    };
  }, [chatContactId, chatContactUserId, isAdminView, userData?.id]);

  return (
    <div className="app-shell flex bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="administrators" showTeamSubmenu={true} logoClickable={true} />

      <div className="app-shell__main relative flex flex-col items-start pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />

        <div className="relative flex w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={
              <Badge variant="neutral" icon={<FeatherMessageCircle />}>
                {pageCopy.workspace}
              </Badge>
            }
            rightSlot={<Badge variant="success">{pageCopy.directLine}</Badge>}
          />

          <div className="flex w-full flex-col gap-8 px-6 pb-10 md:px-8 xl:px-10">
            <section className="rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)] backdrop-blur lg:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {pageCopy.title}
              </p>
              <h1 className="mt-3 font-['Newsreader'] text-4xl font-medium tracking-tight text-slate-950">
                {pageCopy.heading}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                {pageCopy.body}
              </p>
            </section>

            <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)] backdrop-blur lg:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {pageCopy.listLabel}
                </p>
                <p className="mt-3 text-xl font-black tracking-tight text-slate-950">
                  {pageCopy.chooseLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {pageCopy.chooseBody}
                </p>

                {loading ? (
                  <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-500">
                    {t("app.loading")}
                  </div>
                ) : contacts.length ? (
                  <div className="mt-6 space-y-3">
                    {contacts.map((contact) => {
                      const active = selectedContact?.id === contact.id;
                      return (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => setSelectedContact(contact)}
                          className={`w-full rounded-[24px] border p-4 text-left transition ${
                            active
                              ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
                              : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-[18px] ${active ? "bg-white/15 text-white" : "bg-sky-100 text-sky-700"}`}>
                              {isAdminView ? <FeatherUsers size={18} /> : <FeatherShield size={18} />}
                            </div>
                            <div className="min-w-0">
                              <p className="break-words text-base font-black">
                                {contact.employee_name || contact.user_details?.username}
                              </p>
                              <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.18em] ${active ? "text-slate-300" : "text-slate-400"}`}>
                                {contact.position || t("team.noPosition")}
                              </p>
                              {isAdminView ? (
                                <>
                                  <p className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] ${active ? "text-slate-400" : "text-slate-500"}`}>
                                    {contact.lastMessageAt
                                      ? formatMessageTime(contact.lastMessageAt)
                                      : t("team.waiting")}
                                  </p>
                                  <p className={`mt-2 text-sm leading-6 ${active ? "text-slate-200" : "text-slate-600"}`}>
                                    {contact.lastMessagePreview || t("team.waiting")}
                                  </p>
                                </>
                              ) : (
                                <p className={`mt-3 text-sm leading-6 ${active ? "text-slate-200" : "text-slate-600"}`}>
                                  {contact.current_work || t("team.noFocus")}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-500">
                    {pageCopy.empty}
                  </div>
                )}
              </aside>

              <TeamConversationPanel member={selectedContact} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactAdmin;
