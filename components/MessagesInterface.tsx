"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  body: string;
  timestamp: string;
  outgoing: boolean;
  read: boolean;
};

type Conversation = {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: "online" | "away" | "offline";
  accent: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  messages: Message[];
};

const initialConversations: Conversation[] = [
  {
    id: "sana",
    name: "Sana Malik",
    initials: "SM",
    role: "Brand designer",
    status: "online",
    accent: "bg-gold-100 text-gold-500",
    lastMessage: "I can share the first draft this evening.",
    timestamp: "10:42 AM",
    unread: 0,
    messages: [
      { id: "sana-1", body: "Hi! I saw your task about the launch assets.", timestamp: "10:18 AM", outgoing: false, read: true },
      { id: "sana-2", body: "Yes, I would love to help. Do you already have the copy ready?", timestamp: "10:24 AM", outgoing: false, read: true },
      { id: "sana-3", body: "The copy is ready and the brief is attached to the task.", timestamp: "10:31 AM", outgoing: true, read: true },
      { id: "sana-4", body: "I can share the first draft this evening.", timestamp: "10:42 AM", outgoing: false, read: true },
    ],
  },
  {
    id: "hamza",
    name: "Hamza Raza",
    initials: "HR",
    role: "Content writer",
    status: "away",
    accent: "bg-green-950/10 text-green-800",
    lastMessage: "Thanks, that timeline works for me.",
    timestamp: "Yesterday",
    unread: 1,
    messages: [
      { id: "hamza-1", body: "I have reviewed the task details.", timestamp: "Yesterday, 4:12 PM", outgoing: false, read: false },
      { id: "hamza-2", body: "Thanks, that timeline works for me.", timestamp: "Yesterday, 4:18 PM", outgoing: true, read: true },
    ],
  },
  {
    id: "ayesha",
    name: "Ayesha Khan",
    initials: "AK",
    role: "Photographer",
    status: "offline",
    accent: "bg-cream text-green-800",
    lastMessage: "Here are a few location ideas.",
    timestamp: "Mon",
    unread: 0,
    messages: [
      { id: "ayesha-1", body: "Here are a few location ideas.", timestamp: "Mon, 1:08 PM", outgoing: false, read: true },
    ],
  },
  {
    id: "umar",
    name: "Umar Siddiqui",
    initials: "US",
    role: "Web developer",
    status: "online",
    accent: "bg-gold-100 text-gold-500",
    lastMessage: "The dashboard is looking good.",
    timestamp: "Sun",
    unread: 0,
    messages: [
      { id: "umar-1", body: "The dashboard is looking good.", timestamp: "Sun, 11:30 AM", outgoing: false, read: true },
    ],
  },
];

const statusLabel = {
  online: "Online",
  away: "Away",
  offline: "Offline",
};

export default function MessagesInterface() {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>("sana");
  const [mobileView, setMobileView] = useState<"list" | "chat">("chat");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId);
  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter(
      (conversation) =>
        conversation.name.toLowerCase().includes(query) ||
        conversation.lastMessage.toLowerCase().includes(query),
    );
  }, [conversations, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId, selectedConversation?.messages.length]);

  function selectConversation(id: string) {
    setSelectedId(id);
    setMobileView("chat");
    setDraft("");
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id ? { ...conversation, unread: 0, messages: conversation.messages.map((message) => ({ ...message, read: true })) } : conversation,
      ),
    );
  }

  function startNewMessage() {
    setSelectedId(null);
    setMobileView("chat");
    setDraft("");
  }

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId) return;

    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedId
          ? {
              ...conversation,
              lastMessage: body,
              timestamp,
              messages: [...conversation.messages, { id: `${selectedId}-${Date.now()}`, body, timestamp, outgoing: true, read: false }],
            }
          : conversation,
      ),
    );
    setDraft("");
  }

  return (
    <section className="border border-line rounded-2xl bg-card overflow-hidden shadow-sm min-h-[min(680px,calc(100vh-220px))]">
      <div className="grid min-h-[min(680px,calc(100vh-220px))] md:grid-cols-[minmax(260px,320px)_1fr]">
        <aside className={`${mobileView === "chat" ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-line bg-paper/50`}>
          <div className="border-b border-line p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gold-500 font-semibold">Inbox</p>
                <h2 className="font-display text-2xl text-heading">Conversations</h2>
              </div>
              <button
                type="button"
                onClick={startNewMessage}
                aria-label="Start a new message"
                className="h-9 w-9 rounded-full bg-green-900 text-cream text-xl leading-none hover:bg-green-800 transition-colors"
              >
                +
              </button>
            </div>
            <label className="relative block">
              <span className="sr-only">Search conversations</span>
              <span className="absolute left-3 top-2.5 text-ink/40" aria-hidden="true">⌕</span>
              <input
                className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="Search conversations"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredConversations.length === 0 && (
              <p className="p-6 text-sm text-ink/50">No conversations found.</p>
            )}
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => selectConversation(conversation.id)}
                className={`flex w-full gap-3 border-b border-line px-5 py-4 text-left transition-colors hover:bg-card ${selectedId === conversation.id ? "bg-card" : ""}`}
              >
                <Avatar conversation={conversation} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${conversation.unread ? "font-bold text-heading" : "font-semibold"}`}>{conversation.name}</span>
                    <span className="shrink-0 text-[11px] text-ink/40">{conversation.timestamp}</span>
                  </span>
                  <span className={`mt-1 block truncate text-xs ${conversation.unread ? "font-semibold text-ink/70" : "text-ink/50"}`}>{conversation.lastMessage}</span>
                </span>
                {conversation.unread > 0 && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-label={`${conversation.unread} unread messages`} />}
              </button>
            ))}
          </div>
        </aside>

        <div className={`${mobileView === "list" ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col`}>
          {selectedConversation ? (
            <>
              <header className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-7">
                <button type="button" onClick={() => { setSelectedId(null); setMobileView("list"); }} className="md:hidden text-sm font-semibold text-green-800" aria-label="Back to conversations">← Back</button>
                <Avatar conversation={selectedConversation} />
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl text-heading">{selectedConversation.name}</h2>
                  <p className="text-xs text-ink/50"><span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${selectedConversation.status === "online" ? "bg-green-700" : selectedConversation.status === "away" ? "bg-gold-500" : "bg-ink/30"}`} />{statusLabel[selectedConversation.status]} · {selectedConversation.role}</p>
                </div>
                <button type="button" onClick={startNewMessage} className="ml-auto hidden text-sm font-semibold text-green-800 hover:text-gold-500 sm:block">New message</button>
              </header>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-paper/30 px-5 py-6 sm:px-8">
                <div className="mx-auto max-w-md text-center text-xs text-ink/40">Today</div>
                {selectedConversation.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.outgoing ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] sm:max-w-[68%] ${message.outgoing ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.outgoing ? "rounded-br-md bg-green-900 text-cream" : "rounded-bl-md border border-line bg-card text-ink"}`}>
                        {message.body}
                      </div>
                      <div className={`mt-1 flex items-center gap-1.5 text-[11px] text-ink/40 ${message.outgoing ? "mr-1" : "ml-1"}`}>
                        <span>{message.timestamp}</span>
                        {message.outgoing && <span className={message.read ? "text-green-700" : "text-ink/30"} aria-label={message.read ? "Read" : "Sent"}>{message.read ? "✓✓" : "✓"}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} aria-hidden="true" />
              </div>

              <form onSubmit={handleSend} className="border-t border-line bg-card p-4 sm:p-5">
                <div className="flex items-end gap-3 rounded-xl border border-line bg-paper px-3 py-2 focus-within:ring-2 focus-within:ring-green-700">
                  <label className="sr-only" htmlFor="message-draft">Write a message</label>
                  <textarea
                    id="message-draft"
                    rows={1}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Write a message..."
                    className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm focus:outline-none"
                  />
                  <button type="submit" disabled={!draft.trim()} aria-label="Send message" className="h-9 w-9 shrink-0 rounded-full bg-green-900 text-cream transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40">↑</button>
                </div>
                <p className="mt-2 hidden text-[11px] text-ink/40 sm:block">Press Enter to send · Shift + Enter for a new line</p>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 text-3xl text-gold-500">✉</div>
              <h2 className="font-display text-2xl text-heading">Your messages, in one place</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-ink/60">Choose a conversation from your inbox or start a new message to keep your work moving.</p>
              <button type="button" onClick={() => selectConversation(conversations[0].id)} className="mt-6 rounded-full bg-green-900 px-5 py-2.5 text-sm font-semibold text-cream hover:bg-green-800 transition-colors">View latest conversation</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Avatar({ conversation }: { conversation: Conversation }) {
  return (
    <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${conversation.accent}`}>
      {conversation.initials}
      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card ${conversation.status === "online" ? "bg-green-700" : conversation.status === "away" ? "bg-gold-500" : "bg-ink/25"}`} />
    </span>
  );
}
