import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { AiDisclaimer } from "@/components/ai-disclaimer";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useLocalStorage } from "@/hooks/use-local-storage";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Chatbot — Workplace AI" },
      { name: "description", content: "Chat with your AI workplace assistant." },
    ],
  }),
  component: ChatPage,
});

const STORAGE_KEY = "wpa:chat:messages";

const STARTERS = [
  "Draft a polite follow-up email to a client who hasn't replied in a week.",
  "Brainstorm 5 agenda items for a weekly engineering 1:1.",
  "Explain the difference between OKRs and KPIs in 3 bullets.",
  "Rewrite this Slack message to sound more professional: 'hey can u send the file asap'.",
];

function ChatPage() {
  const [stored, setStored] = useLocalStorage<UIMessage[]>(STORAGE_KEY, []);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    id: "workplace-chat",
    messages: stored,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (err) => toast.error(err.message || "Chat error"),
  });

  // Persist
  useEffect(() => {
    if (status === "ready" || status === "error") {
      setStored(messages);
    }
  }, [messages, status, setStored]);

  // Focus textarea
  useEffect(() => {
    textareaRef.current?.focus();
  }, [status]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  };

  const handleClear = () => {
    setMessages([]);
    setStored([]);
    toast.success("Chat cleared");
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-4xl flex-col">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="AI Chatbot"
          description="A conversational AI helper for drafting, brainstorming, and quick workplace questions."
          icon={<MessageSquare className="h-5 w-5" />}
        />
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-card">
        <Conversation className="flex-1">
          <ConversationContent>
            {messages.length === 0 && (
              <div className="mx-auto max-w-md py-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-elegant">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold">How can I help you today?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try one of these to get started:
                </p>
                <div className="mt-5 grid gap-2 text-left">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        sendMessage({ text: s });
                      }}
                      className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm text-foreground/90 transition-colors hover:border-primary/50 hover:bg-accent/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              return (
                <Message key={m.id} from={m.role === "user" ? "user" : "assistant"}>
                  <MessageContent>
                    {m.role === "assistant" ? (
                      <article className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-headings:font-display prose-pre:bg-background/60">
                        <ReactMarkdown>{text || " "}</ReactMarkdown>
                      </article>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{text}</p>
                    )}
                  </MessageContent>
                </Message>
              );
            })}

            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer>Thinking…</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border/60 bg-background/40 p-3">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your work…"
              disabled={isLoading}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={status}
                disabled={!input.trim() && !isLoading}
                onClick={isLoading ? () => stop() : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
          <div className="mt-2">
            <AiDisclaimer />
          </div>
        </div>
      </div>
    </div>
  );
}
