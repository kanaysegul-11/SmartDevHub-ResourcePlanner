"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FeatherCheck,
  FeatherMessageCircle,
  FeatherSend,
  FeatherTrash2,
  FeatherUsers,
} from "@subframe/core";
import { apiClient } from "../../refine/axios";
import { useUser } from "../../UserContext.jsx";
import { useI18n } from "../../I18nContext.jsx";
import { Avatar } from "../../ui/components/Avatar";
import { Badge } from "../../ui/components/Badge";
import { Button } from "../../ui/components/Button";
import { TextArea } from "../../ui/components/TextArea";

const EMPTY_FEEDBACK = {
  message: "",
  tone: "neutral",
};

function TeamConversationPanel({
  member,
  dropPreviewMember = null,
  isDropActive = false,
  onPanelDragOver,
  onPanelDragLeave,
  onPanelDrop,
}) {
  const { userData } = useUser();
  const { language, t } = useI18n();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [deleteState, setDeleteState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const listRef = useRef(null);

  const normalizedUsername = useMemo(
    () => (userData?.username || "").trim().toLowerCase(),
    [userData?.username]
  );
  const currentUserId = useMemo(() => String(userData?.id || ""), [userData?.id]);
  const selectedMemberName = member?.employee_name || t("team.waiting");

  const setFeedbackState = (message, tone = "neutral") => {
    if (!message) {
      setFeedback(EMPTY_FEEDBACK);
      return;
    }

    setFeedback({ message, tone });
  };

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

  const getSenderName = (message) =>
    message.sender_details?.username || t("app.user");

  const isCurrentUserMessage = (message) => {
    const senderName = getSenderName(message);
    return (
      String(message.sender_details?.id || "") === currentUserId ||
      senderName.trim().toLowerCase() === normalizedUsername
    );
  };

  const summarizeMessage = (content) => {
    const normalizedContent = String(content || "").trim();
    if (normalizedContent.length <= 120) {
      return normalizedContent;
    }

    return `${normalizedContent.slice(0, 117)}...`;
  };

  const lastMessageTimestamp = messages.length
    ? messages[messages.length - 1]?.edited_at ||
      messages[messages.length - 1]?.created_at
    : "";

  useEffect(() => {
    if (!member?.id) {
      setMessages([]);
      setDraft("");
      setEditingMessageId(null);
      setEditingDraft("");
      setDeleteState(null);
      setFeedback(EMPTY_FEEDBACK);
      return;
    }

    let isActive = true;

    const loadMessages = async () => {
      setIsLoading(true);
      setFeedback(EMPTY_FEEDBACK);
      setEditingMessageId(null);
      setEditingDraft("");
      setDeleteState(null);

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
        if (isActive) setFeedbackState(t("team.historyError"), "error");
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

  const handleDraftKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!member?.id || !content) return;

    setIsSending(true);
    setFeedback(EMPTY_FEEDBACK);

    try {
      const response = await apiClient.post("/team-messages/", {
        recipient: member.id,
        content,
      });
      setMessages((current) => [...current, response.data]);
      setDraft("");
      setFeedbackState(t("team.messageSaved"), "success");
    } catch (error) {
      console.error("Message could not be sent:", error);
      setFeedbackState(t("team.messageError"), "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleStartEdit = (message) => {
    setEditingMessageId(message.id);
    setEditingDraft(message.content || "");
    setFeedback(EMPTY_FEEDBACK);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingDraft("");
  };

  const handleSaveEdit = async (messageId) => {
    const content = editingDraft.trim();
    if (!content) return;

    setIsUpdating(true);
    setFeedback(EMPTY_FEEDBACK);

    try {
      const response = await apiClient.patch(`/team-messages/${messageId}/`, {
        content,
      });
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, ...response.data } : message
        )
      );
      setEditingMessageId(null);
      setEditingDraft("");
      setFeedbackState(t("team.messageUpdated"), "success");
    } catch (error) {
      console.error("Message could not be updated:", error);
      setFeedbackState(t("team.messageUpdateError"), "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDeleteDialog = (message) => {
    setDeleteState({
      id: message.id,
      preview: summarizeMessage(message.content),
      senderName: getSenderName(message),
      canDeleteForEveryone: isCurrentUserMessage(message),
    });
  };

  const handleDeleteMessage = async (scope) => {
    if (!deleteState?.id) return;

    setIsDeleting(true);
    setFeedback(EMPTY_FEEDBACK);

    try {
      await apiClient.post(`/team-messages/${deleteState.id}/remove/`, {
        scope,
      });
      setMessages((current) =>
        current.filter((message) => message.id !== deleteState.id)
      );
      if (editingMessageId === deleteState.id) {
        setEditingMessageId(null);
        setEditingDraft("");
      }
      setDeleteState(null);
      setFeedbackState(
        scope === "everyone"
          ? t("team.messageDeletedForEveryone")
          : t("team.messageDeletedForMe"),
        "success"
      );
    } catch (error) {
      console.error("Message could not be deleted:", error);
      setFeedbackState(t("team.messageDeleteError"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const feedbackClassName =
    feedback.tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : feedback.tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <>
      <aside
        onDragOver={onPanelDragOver}
        onDragLeave={onPanelDragLeave}
        onDrop={onPanelDrop}
        className={`rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.9))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.14)] backdrop-blur transition lg:p-7 ${
          isDropActive ? "ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-100" : ""
        }`}
      >
        <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Badge variant="neutral" icon={<FeatherMessageCircle />}>
              {t("team.chatBadge")}
            </Badge>
            <h3 className="mt-4 font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
              {member?.employee_name
                ? `${t("team.conversationLabel")}: ${member.employee_name}`
                : t("team.conversationCenter")}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              {t("team.chatConnected")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px] lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {t("team.selectedPerson")}
              </p>
              <p className="mt-2 text-sm font-black text-slate-900">
                {selectedMemberName}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {t("team.conversationLabel")}
              </p>
              <p className="mt-2 text-sm font-black text-slate-900">
                {messages.length}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-950 px-4 py-3 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {t("team.lastUpdate")}
              </p>
              <p className="mt-2 text-sm font-bold text-white">
                {lastMessageTimestamp
                  ? formatMessageTime(lastMessageTimestamp)
                  : t("team.waiting")}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`mt-6 rounded-[28px] border border-dashed px-5 py-4 text-sm transition ${
            isDropActive
              ? "border-sky-300 bg-sky-50/85 text-sky-700"
              : "border-slate-200 bg-slate-50/80 text-slate-500"
          }`}
        >
          <p className="font-semibold">
            {isDropActive
              ? t("team.dropMemberToChatActive")
              : t("team.dropMemberToChat")}
          </p>
          <p className="mt-2 leading-6">
            {dropPreviewMember?.employee_name
              ? `${dropPreviewMember.employee_name} ${t("team.dropMemberToChatBody")}`
              : t("team.dropMemberToChatHint")}
          </p>
        </div>

        {!member ? (
          <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-[30px] border border-dashed border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.96))] p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-sky-100 text-sky-700 shadow-[0_16px_30px_rgba(14,165,233,0.18)]">
              <FeatherUsers size={24} />
            </div>
            <p className="mt-5 text-lg font-black tracking-tight text-slate-900">
              {t("team.selectMemberTitle")}
            </p>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-500">
              {t("team.selectMemberBody")}
            </p>
          </div>
        ) : (
          <>
            <div
              ref={listRef}
              className="mt-6 flex max-h-[500px] flex-col gap-4 overflow-y-auto rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(241,245,249,0.76))] p-4 pr-3 shadow-inner"
            >
              {isLoading ? (
                <div className="rounded-[24px] border border-slate-200 bg-white/90 p-6 text-sm text-slate-500">
                  {t("team.loadingMessages")}
                </div>
              ) : messages.length > 0 ? (
                messages.map((message) => {
                  const senderName = getSenderName(message);
                  const isCurrentUser = isCurrentUserMessage(message);
                  const isEditing = editingMessageId === message.id;

                  return (
                    <div
                      key={message.id}
                      className={`group/message flex w-full ${
                        isCurrentUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex max-w-[min(84%,600px)] items-end gap-3 ${
                          isCurrentUser ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <Avatar
                          size="small"
                          variant={isCurrentUser ? "neutral" : "brand"}
                          className="mb-1 shrink-0"
                        >
                          {senderName[0]?.toUpperCase() || "U"}
                        </Avatar>

                        <div
                          className={`w-full rounded-[26px] px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.08)] ${
                            isCurrentUser
                              ? "rounded-br-[10px] bg-[linear-gradient(180deg,#0f172a,#020617)] text-white"
                              : "rounded-bl-[10px] border border-slate-200 bg-white text-slate-900"
                          }`}
                        >
                          <div
                            className={`mb-3 flex items-start justify-between gap-3 ${
                              isCurrentUser ? "flex-row-reverse text-right" : "text-left"
                            }`}
                          >
                            <div>
                              <div
                                className={`flex items-center gap-2 ${
                                  isCurrentUser ? "justify-end" : "justify-start"
                                }`}
                              >
                                <p
                                  className={`text-sm font-bold ${
                                    isCurrentUser ? "text-white" : "text-slate-900"
                                  }`}
                                >
                                  {isCurrentUser ? t("team.you") : senderName}
                                </p>
                                {message.edited_at ? (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                      isCurrentUser
                                        ? "bg-white/10 text-slate-200"
                                        : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {t("team.edited")}
                                  </span>
                                ) : null}
                              </div>
                              <p
                                className={`mt-1 text-[11px] font-medium uppercase tracking-[0.16em] ${
                                  isCurrentUser ? "text-slate-400" : "text-slate-400"
                                }`}
                              >
                                {formatMessageTime(message.edited_at || message.created_at)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 opacity-100 transition md:opacity-0 md:group-hover/message:opacity-100">
                              {isCurrentUser ? (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(message)}
                                  disabled={isUpdating || isDeleting || isEditing}
                                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                                    isCurrentUser
                                      ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  {t("team.editMessage")}
                                </button>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => handleOpenDeleteDialog(message)}
                                disabled={isDeleting}
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                                  isCurrentUser
                                    ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                }`}
                              >
                                <FeatherTrash2 size={12} />
                                {t("team.deleteMessage")}
                              </button>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="rounded-[22px] border border-white/10 bg-white/5 p-3">
                              <TextArea
                                variant="filled"
                                helpText={t("team.sendShortcut")}
                              >
                                <TextArea.Input
                                  value={editingDraft}
                                  onChange={(event) =>
                                    setEditingDraft(event.target.value)
                                  }
                                  onKeyDown={handleDraftKeyDown}
                                  className="min-h-[110px] caret-slate-950 text-slate-950 placeholder:text-slate-400"
                                />
                              </TextArea>

                              <div className="mt-3 flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  disabled={isUpdating}
                                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
                                >
                                  {t("app.cancel")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(message.id)}
                                  disabled={isUpdating || !editingDraft.trim()}
                                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
                                >
                                  <FeatherCheck size={14} />
                                  {t("team.saveEdit")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p
                              className={`break-words text-sm leading-7 ${
                                isCurrentUser ? "text-slate-100" : "text-slate-600"
                              }`}
                            >
                              {message.content}
                            </p>
                          )}
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
              className="mt-6 rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-4 shadow-[0_18px_40px_rgba(148,163,184,0.14)]"
            >
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-end">
                <div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        {t("team.newMessage")}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        {t("team.newMessageHelp")}
                      </p>
                    </div>
                    <Badge variant="neutral">{selectedMemberName}</Badge>
                  </div>

                  <TextArea
                    variant="filled"
                    helpText={t("team.sendShortcut")}
                    className="mt-4"
                  >
                    <TextArea.Input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleDraftKeyDown}
                      placeholder={t("team.messagePlaceholder")}
                      className="min-h-[132px]"
                    />
                  </TextArea>
                </div>

                <div className="flex h-full flex-col justify-between gap-4 rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
                  <div className="rounded-[20px] bg-slate-950 px-4 py-3 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {t("team.selectedPerson")}
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {selectedMemberName}
                    </p>
                  </div>

                  <div
                    className={`min-h-[76px] rounded-[20px] border px-4 py-3 text-sm leading-6 ${feedbackClassName}`}
                  >
                    {feedback.message || t("team.liveTeamMessage")}
                  </div>

                  <Button
                    type="submit"
                    loading={isSending}
                    icon={<FeatherSend />}
                    disabled={!draft.trim() || isSending}
                    className="h-12 rounded-2xl bg-slate-950 px-5 text-white disabled:opacity-60"
                  >
                    {t("team.sendMessage")}
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}
      </aside>

      {deleteState ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[30px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.92))] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-red-100 text-red-600">
                <FeatherTrash2 size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-black tracking-tight text-slate-950">
                  {t("team.deleteMessageTitle")}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {deleteState.canDeleteForEveryone
                    ? t("team.deleteMessageBody")
                    : t("team.deleteMessageMineBody")}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/85 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {deleteState.canDeleteForEveryone
                  ? t("team.you")
                  : deleteState.senderName}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {deleteState.preview}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteState(null)}
                disabled={isDeleting}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {t("app.cancel")}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMessage("self")}
                disabled={isDeleting}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {t("team.deleteForMe")}
              </button>
              {deleteState.canDeleteForEveryone ? (
                <button
                  type="button"
                  onClick={() => handleDeleteMessage("everyone")}
                  disabled={isDeleting}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-60"
                >
                  {t("team.deleteForEveryone")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default TeamConversationPanel;
