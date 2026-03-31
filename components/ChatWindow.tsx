"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

type ChatMessageType = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatMode = "ai" | "standard";

type ChatWindowProps = {
  eventId: string;
  onDraftUpdate?: (draft: Record<string, unknown>) => void;
  onMissingUpdate?: (missing: string[]) => void;
  onSavingChange?: (saving: boolean) => void;
};

export default function ChatWindow({
  eventId,
  onDraftUpdate,
  onMissingUpdate,
  onSavingChange,
}: ChatWindowProps) {
  const { dictionary, language } = useLanguage();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const templateInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const bootstrappedRef = useRef<Record<ChatMode, boolean>>({
    ai: false,
    standard: false,
  });
  const [mode, setMode] = useState<ChatMode>("ai");
  const [messagesByMode, setMessagesByMode] = useState<
    Record<ChatMode, ChatMessageType[]>
  >({
    ai: [],
    standard: [],
  });
  const messages = messagesByMode[mode];
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showMarketingActions, setShowMarketingActions] = useState(false);
  const focusInput = useCallback(() => {
    if (!inputRef.current) {
      return;
    }
    inputRef.current.focus();
    inputRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  const replaceMessages = useCallback((target: ChatMode, next: ChatMessageType[]) => {
    setMessagesByMode((prev) => ({ ...prev, [target]: next }));
  }, []);

  const appendMessage = useCallback((target: ChatMode, message: ChatMessageType) => {
    setMessagesByMode((prev) => ({
      ...prev,
      [target]: [...prev[target], message],
    }));
  }, []);

  const sendToChat = useCallback(
    async (nextMessages: ChatMessageType[], targetMode: ChatMode) => {
      setIsSending(true);
      onSavingChange?.(true);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            language,
            messages: nextMessages,
            mode: targetMode,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          const detail =
            payload?.detail ?? payload?.error ?? `HTTP ${response.status}`;
          throw new Error(detail);
        }

        const assistantMessage: ChatMessageType = {
          role: "assistant",
          content: payload.reply ?? "OK",
        };

        replaceMessages(targetMode, [...nextMessages, assistantMessage]);
        if (payload.draft) {
          onDraftUpdate?.(payload.draft);
        }
        if (payload.missing) {
          onMissingUpdate?.(payload.missing);
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : "";
        const message = detail
          ? `${t(dictionary, "chat_send_failed")} (${detail})`
          : t(dictionary, "chat_send_failed");
        appendMessage(targetMode, {
          role: "system",
          content: message,
        });
      } finally {
        setIsSending(false);
        onSavingChange?.(false);
        setTimeout(() => {
          focusInput();
        }, 50);
      }
    },
    [
      eventId,
      language,
      dictionary,
      onDraftUpdate,
      onMissingUpdate,
      onSavingChange,
      focusInput,
      appendMessage,
      replaceMessages,
    ]
  );

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }
    const userMessage: ChatMessageType = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    replaceMessages(mode, nextMessages);
    setInput("");
    setTimeout(() => {
      focusInput();
    }, 0);
    await sendToChat(nextMessages, mode);
  };

  const isImageFile = (file: File) =>
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif)$/i.test(file.name);

  const handleTemplateUpload = async (file: File) => {
    setIsUploadingTemplate(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/templates/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Upload error");
      }

      appendMessage(mode, {
        role: "system",
        content: t(dictionary, "template_upload_success", {
          name: payload.template?.name ?? file.name,
        }),
      });
    } catch {
      appendMessage(mode, {
        role: "system",
        content: t(dictionary, "template_upload_failed"),
      });
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/events/${eventId}/image`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Image upload error");
      }

      if (payload?.event) {
        onDraftUpdate?.(payload.event);
      }
      appendMessage(mode, {
        role: "system",
        content: t(dictionary, "chat_image_upload_success", {
          name: file.name,
        }),
      });
    } catch {
      appendMessage(mode, {
        role: "system",
        content: t(dictionary, "image_upload_failed"),
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSelectExistingTemplate = () => {
    document
      .getElementById("template-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    appendMessage(mode, {
      role: "system",
      content: t(dictionary, "chat_template_select_existing_hint"),
    });
  };

  useEffect(() => {
    if (bootstrappedRef.current[mode] || messagesByMode[mode].length > 0) {
      return;
    }
    bootstrappedRef.current[mode] = true;
    void sendToChat([], mode);
  }, [mode, messagesByMode, sendToChat]);

  const handleNewChat = () => {
    replaceMessages(mode, []);
    bootstrappedRef.current[mode] = false;
    setTimeout(() => {
      void sendToChat([], mode);
    }, 0);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isSending]);

  return (
    <div className="flex h-full flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {t(dictionary, "chat_kicker")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          {t(dictionary, mode === "ai" ? "chat_ai_title" : "chat_standard_title")}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {t(dictionary, mode === "ai" ? "chat_ai_subtitle" : "chat_standard_subtitle")}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {t(dictionary, "chat_mode_label")}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={mode === "ai" ? "default" : "outline"}
              onClick={() => setMode("ai")}
            >
              {t(dictionary, "chat_mode_ai")}
            </Button>
            <Button
              type="button"
              variant={mode === "standard" ? "default" : "outline"}
              onClick={() => setMode("standard")}
            >
              {t(dictionary, "chat_mode_standard")}
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={handleNewChat}>
            {t(dictionary, "chat_new_session")}
          </Button>
        </div>
      </header>

      <div
        className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) {
            if (isImageFile(dropped)) {
              handleImageUpload(dropped);
            } else {
              handleTemplateUpload(dropped);
            }
          }
        }}
      >
        {messages.map((message, index) => (
          <ChatMessage
            key={`${message.role}-${index}`}
            role={message.role}
            content={message.content}
          />
        ))}
        {isSending && (
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {t(dictionary, "chat_typing")}
          </div>
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {t(dictionary, "chat_input_label")}
        </label>
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder={t(dictionary, "chat_input_placeholder")}
          className="mt-3"
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || input.trim().length === 0}
          >
            {t(dictionary, "chat_send")}
          </Button>
          {(isUploadingTemplate || isUploadingImage) && (
            <span className="text-xs text-slate-500">
              {isUploadingImage
                ? t(dictionary, "image_working")
                : t(dictionary, "chat_uploading")}
            </span>
          )}
        </div>
        <input
          ref={templateInputRef}
          type="file"
          accept=".md,.markdown,.html,.htm,text/markdown,text/html"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              handleTemplateUpload(file);
              event.currentTarget.value = "";
            }
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              handleImageUpload(file);
              event.currentTarget.value = "";
            }
          }}
        />
        <div className="mt-4 grid gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-sm text-slate-700">
              {t(dictionary, "chat_add_image_question")}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingImage}
              >
                {t(dictionary, "chat_yes")}
              </Button>
              <Button type="button" variant="ghost">
                {t(dictionary, "chat_no")}
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-sm text-slate-700">
              {t(dictionary, "chat_generate_materials_question")}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMarketingActions(true)}
              >
                {t(dictionary, "chat_yes")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowMarketingActions(false)}
              >
                {t(dictionary, "chat_no")}
              </Button>
            </div>
            {showMarketingActions && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => templateInputRef.current?.click()}
                  disabled={isUploadingTemplate}
                >
                  {t(dictionary, "chat_upload_template_action")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectExistingTemplate}
                >
                  {t(dictionary, "chat_select_existing_template_action")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
