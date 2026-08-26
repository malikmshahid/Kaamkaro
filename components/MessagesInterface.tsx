"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Message = { id: string; body: string; timestamp: string; outgoing: boolean; read: boolean };
type Conversation = { id: string; taskTitle: string; name: string; initials: string; role: string; lastMessage: string; timestamp: string; unread: number; messages: Message[] };

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function MessagesInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId);
  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? conversations.filter((conversation) => `${conversation.name} ${conversation.taskTitle} ${conversation.lastMessage}`.toLowerCase().includes(query)) : conversations;
  }, [conversations, search]);

  async function loadConversations() {
    const res = await fetch("/api/conversations", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load messages");
    setConversations(data.conversations || []);
    setSelectedId((current) => current && data.conversations.some((conversation: Conversation) => conversation.id === current) ? current : data.conversations[0]?.id || null);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadConversations().catch((reason) => setError(reason.message)).finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [selectedId, selectedConversation?.messages.length]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId) return;
    const res = await fetch(`/api/tasks/${selectedId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Could not send message");
    setDraft("");
    await loadConversations();
  }

  async function deleteConversation(conversationId = selectedId) {
    if (!conversationId || !window.confirm("Delete this conversation and all its messages?")) return;
    const res = await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Could not delete conversation");
    setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
    if (selectedId === conversationId) {
      setSelectedId(null);
      setMobileView("list");
    }
  }

  async function deleteMessage(messageId: string) {
    if (!selectedId || !window.confirm("Delete this message?")) return;
    const res = await fetch(`/api/conversations/${selectedId}/messages/${messageId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Could not delete message");
    await loadConversations();
  }

  if (loading) return <section className="rounded-2xl border border-line bg-card p-8 text-sm text-ink/60">Loading messages...</section>;

  return <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm min-h-[min(680px,calc(100vh-220px))]">
    {error && <p className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p>}
    <div className="grid min-h-[min(680px,calc(100vh-220px))] md:grid-cols-[minmax(260px,320px)_1fr]">
      <aside className={`${mobileView === "chat" ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-line bg-paper/50`}>
        <div className="border-b border-line p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">Inbox</p><h2 className="font-display text-2xl text-heading">Conversations</h2><label className="relative mt-4 block"><span className="sr-only">Search conversations</span><input className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" placeholder="Search conversations" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
        <div className="min-h-0 flex-1 overflow-y-auto">{filteredConversations.length === 0 && <p className="p-6 text-sm text-ink/50">No real conversations yet.</p>}{filteredConversations.map((conversation) => <div key={conversation.id} className={`flex gap-3 border-b border-line px-5 py-4 ${selectedId === conversation.id ? "bg-card" : "hover:bg-card"}`}><button type="button" onClick={() => { setSelectedId(conversation.id); setMobileView("chat"); }} className="flex min-w-0 flex-1 gap-3 text-left"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-500">{conversation.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{conversation.name}</span><span className="mt-1 block truncate text-xs text-ink/50">{conversation.lastMessage}</span><span className="mt-1 block truncate text-[11px] text-ink/40">{conversation.taskTitle}</span></span></button><button type="button" onClick={() => deleteConversation(conversation.id)} className="self-start text-sm text-ink/40 hover:text-red-600" aria-label={`Delete chat with ${conversation.name}`} title="Delete chat">🗑</button></div>)}</div>
      </aside>
      <div className={`${mobileView === "list" ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col`}>
        {selectedConversation ? <><header className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-7"><button type="button" onClick={() => setMobileView("list")} className="md:hidden text-sm font-semibold text-green-800">← Back</button><div className="min-w-0"><h2 className="truncate font-display text-xl text-heading">{selectedConversation.name}</h2><p className="truncate text-xs text-ink/50">{selectedConversation.taskTitle}</p></div><button type="button" onClick={() => deleteConversation()} className="ml-auto text-sm font-semibold text-red-600 hover:text-red-800">Delete chat</button></header><div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-paper/30 px-5 py-6 sm:px-8">{selectedConversation.messages.map((message) => <div key={message.id} className={`flex ${message.outgoing ? "justify-end" : "justify-start"}`}><div className={`flex max-w-[82%] flex-col ${message.outgoing ? "items-end" : "items-start"}`}><div className={`break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.outgoing ? "rounded-br-md bg-green-900 text-cream" : "rounded-bl-md border border-line bg-card text-ink"}`}>{message.body}</div><div className="mt-1 flex items-center gap-2 text-[11px] text-ink/40"><span>{formatTimestamp(message.timestamp)}</span>{message.outgoing && <button type="button" onClick={() => deleteMessage(message.id)} className="text-red-600 hover:text-red-800" aria-label="Delete message" title="Delete message">Delete</button>}</div></div></div>)}<div ref={messagesEndRef} aria-hidden="true" /></div><form onSubmit={handleSend} className="border-t border-line bg-card p-4 sm:p-5"><div className="flex items-end gap-3 rounded-xl border border-line bg-paper px-3 py-2 focus-within:ring-2 focus-within:ring-green-700"><label className="sr-only" htmlFor="message-draft">Write a message</label><textarea id="message-draft" rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm focus:outline-none" /><button type="submit" disabled={!draft.trim()} aria-label="Send message" className="h-9 w-9 shrink-0 rounded-full bg-green-900 text-cream disabled:opacity-40">↑</button></div></form></> : <div className="flex flex-1 items-center justify-center px-8 py-16 text-center"><div><div className="mb-5 text-4xl">✉</div><h2 className="font-display text-2xl text-heading">No conversations yet</h2><p className="mt-2 text-sm text-ink/60">Messages will appear here when you chat with someone on a task.</p></div></div>}
      </div>
    </div>
  </section>;
}