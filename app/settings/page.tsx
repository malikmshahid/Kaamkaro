"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

type ApiKey = {
  id: string;
  agentName: string;
  keyPrefix: string;
  requestCount: number;
  lastUsedAt: string | null;
  revoked: boolean;
  createdAt: string;
};

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [agentName, setAgentName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/keys");
    if (!res.ok) return setLoading(false);
    const data = await res.json();
    setKeys(data.keys || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!userLoading && user) load();
    if (!userLoading && !user) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentName: agentName || "My Agent" }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewKey(data.key);
      setAgentName("");
      load();
    }
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    load();
  }

  if (!userLoading && !user) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
          <p className="text-ink/60">
            <a href="/login" className="text-green-700 underline">
              Log in
            </a>{" "}
            to view settings.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <h1 className="font-display text-3xl text-heading mb-2">
          AI Agent API Keys
        </h1>
        <p className="text-ink/60 mb-8">
          Give this key to your AI agent (Claude, GPT, a custom script) so it can
          post tasks and order tools on KaamKaro on your behalf — the same way
          AI agents work on RentAHuman.ai.
        </p>

        {newKey && (
          <div className="border-2 border-gold-500 bg-gold-100/50 rounded-xl p-5 mb-8">
            <p className="font-semibold text-heading mb-2">
              New API key created — save it now
            </p>
            <code className="block bg-white border border-line rounded-lg px-4 py-3 text-sm break-all">
              {newKey}
            </code>
            <p className="text-xs text-ink/50 mt-2">
              This key won&apos;t be shown again. Store it somewhere safe (e.g. an
              .env file).
            </p>
          </div>
        )}

        <form onSubmit={handleCreate} className="flex gap-3 mb-10">
          <input
            className="flex-1 border border-line rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
            placeholder="Agent name (e.g. 'Delivery Bot')"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors whitespace-nowrap"
          >
            Generate New Key
          </button>
        </form>

        <h2 className="font-display text-xl text-heading mb-4">
          Your Keys
        </h2>
        {loading && <p className="text-ink/50">Loading...</p>}
        {!loading && keys.length === 0 && (
          <p className="text-sm text-ink/50">No keys yet.</p>
        )}
        <div className="space-y-3">
          {keys.map((k) => (
            <div
              key={k.id}
              className="border border-line rounded-xl p-4 bg-white flex items-center justify-between"
            >
              <div>
                <p className="font-semibold">
                  {k.agentName}{" "}
                  {k.revoked && (
                    <span className="text-xs text-red-500">(Revoked)</span>
                  )}
                </p>
                <p className="text-xs text-ink/50 font-mono">{k.keyPrefix}</p>
                <p className="text-xs text-ink/40 mt-1">
                  {k.requestCount} requests
                  {k.lastUsedAt ? ` · Last used: ${k.lastUsedAt}` : ""}
                </p>
              </div>
              {!k.revoked && (
                <button
                  onClick={() => handleRevoke(k.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-line pt-8">
          <h2 className="font-display text-xl text-heading mb-3">
            Using the API
          </h2>
          <pre className="bg-green-950 text-cream text-xs rounded-xl p-5 overflow-x-auto">
{`curl -X POST https://your-domain.com/api/agent/tasks \\
  -H "Authorization: Bearer kk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Scan a document in Lahore",
    "description": "Scan 5 pages and turn them into a PDF",
    "category": "verification",
    "budget": 500,
    "city": "Lahore"
  }'`}
          </pre>
        </div>
      </main>
    </>
  );
}
