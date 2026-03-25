"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FeatherMessageCircle, FeatherSend, FeatherUsers } from "@subframe/core";
import { apiClient } from "../../refine/axios";
import { useUser } from "../../UserContext.jsx";
import { useI18n } from "../../I18nContext.jsx";
import { Avatar } from "../../ui/components/Avatar";
import { Badge } from "../../ui/components/Badge";
import { Button } from "../../ui/components/Button";
import { TextArea } from "../../ui/components/TextArea";

function TeamConversationPanel({ member }) {
  const { userData } = useUser();
  const { language, t } = useI18n();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const listRef = useRef(null);

  const normalizedUsername = useMemo(
    () => (userData?.username || "").trim().toLowerCase(),
    [userData?.username]
  );
  const currentUserId = useMemo(() => String(userData?.id || ""), [userData?.id]);

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

  useEffect(() => {
    if (!member?.id) {
      setMessages([]);
      setDraft("");
      setFeedback("");
      return;
    }

    let isActive = true;

    const loadMessages = async () => {
      setIsLoading(true);
      setFeedback("");

      try {
        const response = await apiClient.get("/team-messages/", {
          params: { conversation_with: member.id },
        });
        if (!isActive) return;
        const payload = Array.isArray(response.data)
          ? response.data
          : response.data?.results || response.data?.data || [];
        setMessages(payload);
      } catch (error) {
        console.error("Messages could not be loaded:", error);
        if (isActive) setFeedback(t("team.historyError"));
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadMessages();
    return () => {
      isActive = false;
    };
  }, [member?.id, t]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!member?.id || !content) return;

    setIsSending(true);
    setFeedback("");

    try {
      const response = await apiClient.post("/team-messages/", {
        recipient: member.id,
        content,
      });
      setMessages((current) => [...current, response.data]);
      setDraft("");
      setFeedback(t("team.messageSaved"));
    } catch (error) {
      console.error("Message could not be sent:", error);
      setFeedback(t("team.messageError"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <aside className="rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.14)] backdrop-blur lg:p-7">
      <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge variant="neutral" icon={<FeatherMessageCircle />}>
            Team Chat
          </Badge>
          <h3 className="mt-4 font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
            {member?.employee_name
              ? `${member.employee_name} ${t("team.talkingWith")}`
              : t("team.conversationCenter")}
          </h3>
        </div>
        <div className="rounded-[24px] bg-slate-950 px-4 py-3 text-right text-white lg:min-w-[180px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {t("team.selectedPerson")}
          </p>
          <p className="mt-1 text-sm font-bold">{member?.employee_name || t("team.waiting")}</p>
        </div>
      </div>

      {!member ? (
        <div className="mt-6 flex min-h-[260px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-sky-100 text-sky-700">
            <FeatherUsers size={22} />
          </div>
          <p className="mt-5 text-lg font-black tracking-tight text-slate-900">
            {t("team.selectMemberTitle")}
          </p>
        </div>
      ) : (
        <>
          <div
            ref={listRef}
            className="mt-6 flex max-h-[460px] flex-col gap-4 overflow-y-auto rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-4 pr-3"
          >
            {isLoading ? (
              <div className="rounded-[24px] border border-slate-200 bg-white/90 p-6 text-sm text-slate-500">
                {t("team.loadingMessages")}
              </div>
            ) : messages.length > 0 ? (
              messages.map((message) => {
                const senderName = message.sender_details?.username || t("app.user");
                const isCurrentUser =
                  String(message.sender_details?.id || "") === currentUserId ||
                  senderName.trim().toLowerCase() === normalizedUsername;

                return (
                  <div
                    key={message.id}
                    className={`flex w-full ${isCurrentUser ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex max-w-[min(78%,560px)] items-end gap-3 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
                      <Avatar
                        size="small"
                        variant={isCurrentUser ? "neutral" : "brand"}
                        className="mb-1 shrink-0"
                      >
                        {senderName[0]?.toUpperCase() || "U"}
                      </Avatar>
                      <div
                        className={`w-full rounded-[24px] px-4 py-3 shadow-sm ${
                          isCurrentUser
                            ? "rounded-br-[10px] bg-[linear-gradient(180deg,#0f172a,#020617)] text-white"
                            : "rounded-bl-[10px] border border-slate-200 bg-white text-slate-900"
                        }`}
                      >
                        <div
                          className={`mb-2 flex items-center ${
                            isCurrentUser ? "justify-end text-right" : "justify-start text-left"
                          }`}
                        >
                          <div>
                            <p className={`text-sm font-bold ${isCurrentUser ? "text-white" : "text-slate-900"}`}>
                              {senderName}
                            </p>
                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`break-words text-sm leading-7 ${
                            isCurrentUser ? "text-slate-100" : "text-slate-600"
                          }`}
                        >
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/90 p-6 text-sm leading-7 text-slate-500">
                {t("team.noConversation")}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-[28px] border border-slate-200/80 bg-slate-50/75 p-4"
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-end">
              <TextArea label={t("team.newMessage")} variant="filled">
                <TextArea.Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`${member.employee_name}...`}
                  className="min-h-[120px]"
                />
              </TextArea>

              <div className="flex h-full flex-col justify-between gap-4 rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
                {feedback ? <p className="text-sm leading-7 text-slate-500">{feedback}</p> : <div />}
                <Button
                  type="submit"
                  loading={isSending}
                  icon={<FeatherSend />}
                  className="h-12 rounded-2xl bg-slate-950 px-5 text-white"
                >
                  {t("team.sendMessage")}
                </Button>
              </div>
            </div>
          </form>
        </>
      )}
    </aside>
  );
}

export default TeamConversationPanel;
