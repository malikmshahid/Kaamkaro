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
  const { user, loading: userLoading, setUser } = useUser();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [agentName, setAgentName] = useState("");

  // Profile fields (name, city, address, gender, phone, bio, skills, hourlyRate)
  const [profileName, setProfileName] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileGender, setProfileGender] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileSkills, setProfileSkills] = useState("");
  const [profileHourlyRate, setProfileHourlyRate] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Profile photo
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name || "");
    setProfileCity(user.city || "");
    setProfileAddress(user.address || "");
    setProfileGender(user.gender || "");
    setProfilePhone(user.phone || "");
    setProfileBio(user.bio || "");
    setProfileSkills(user.skills || "");
    setProfileHourlyRate(user.hourlyRate != null ? String(user.hourlyRate) : "");
  }, [user]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError("");
    const formData = new FormData();
    formData.append("photo", file);
    const res = await fetch("/api/profile/photo", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    setPhotoUploading(false);
    if (!res.ok) {
      setPhotoError(data.error || "Could not upload photo");
      return;
    }
    if (user) setUser({ ...user, photoUrl: data.photoUrl });
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileError("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profileName,
        city: profileCity,
        address: profileAddress,
        gender: profileGender,
        phone: profilePhone,
        bio: profileBio,
        skills: profileSkills,
        hourlyRate: profileHourlyRate ? Number(profileHourlyRate) : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setProfileSaving(false);
    if (!res.ok) {
      setProfileError(data.error || "Could not save changes");
      return;
    }
    setProfileSaved(true);
    if (user)
      setUser({
        ...user,
        name: profileName,
        city: profileCity || null,
        address: profileAddress || null,
        gender: profileGender || null,
        phone: profilePhone,
      });
  }

  // Email change (two-step: request OTP -> verify OTP)
  const [newEmail, setNewEmail] = useState("");
  const [emailStep, setEmailStep] = useState<"idle" | "otp-sent">("idle");
  const [otpInput, setOtpInput] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  async function handleRequestEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError("");
    setEmailMessage("");
    const res = await fetch("/api/profile/email/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail }),
    });
    const data = await res.json().catch(() => ({}));
    setEmailLoading(false);
    if (!res.ok) {
      setEmailError(data.error || "Something went wrong");
      return;
    }
    setEmailStep("otp-sent");
    setEmailMessage(data.message || "Verification code sent");
  }

  async function handleVerifyEmailOtp(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError("");
    const res = await fetch("/api/profile/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: otpInput }),
    });
    const data = await res.json().catch(() => ({}));
    setEmailLoading(false);
    if (!res.ok) {
      setEmailError(data.error || "Could not verify code");
      return;
    }
    setEmailMessage("Email address updated successfully.");
    setEmailStep("idle");
    setNewEmail("");
    setOtpInput("");
    if (user) setUser({ ...user, email: data.email });
  }
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Agent Marketplace listing (one per user)
  const [listingName, setListingName] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [listingCategories, setListingCategories] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingDeliveryHours, setListingDeliveryHours] = useState("1");
  const [listingSaved, setListingSaved] = useState(false);
  const [listingSaving, setListingSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/keys");
    if (!res.ok) return setLoading(false);
    const data = await res.json();
    setKeys(data.keys || []);
    setLoading(false);
  }

  async function handleSaveListing(e: React.FormEvent) {
    e.preventDefault();
    setListingSaving(true);
    setListingSaved(false);
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: listingName,
        description: listingDescription,
        categories: listingCategories,
        pricePerTaskPkr: listingPrice ? Number(listingPrice) : null,
        avgDeliveryHours: Number(listingDeliveryHours) || 1,
      }),
    });
    setListingSaving(false);
    if (res.ok) setListingSaved(true);
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
          Your Profile
        </h1>
        <p className="text-ink/60 mb-8">
          Update your name and details. Changing your email requires a
          verification code sent to the new address.
        </p>

        <div className="mb-8 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-card border border-line flex items-center justify-center">
            {user?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoUrl} alt="Profile photo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-ink/30">
                {(user?.name || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <label className="inline-block rounded-full border border-line px-4 py-2 text-sm cursor-pointer hover:bg-card transition-colors">
              {photoUploading ? "Uploading..." : "Change Photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                disabled={photoUploading}
                className="hidden"
              />
            </label>
            {photoError && <p className="text-sm text-red-500 mt-1">{photoError}</p>}
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3 mb-6">
          <div>
            <label className="text-sm text-ink/60 mb-1 block">Name</label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-ink/60 mb-1 block">Gender</label>
            <select
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              value={profileGender}
              onChange={(e) => setProfileGender(e.target.value)}
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-ink/60 mb-1 block">
              Contact number
            </label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
            />
            <p className="text-xs text-ink/40 mt-1">
              Note: unlike email, phone number changes aren&apos;t SMS-verified yet.
            </p>
          </div>
          <div>
            <label className="text-sm text-ink/60 mb-1 block">City</label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              value={profileCity}
              onChange={(e) => setProfileCity(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-ink/60 mb-1 block">Address</label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              value={profileAddress}
              onChange={(e) => setProfileAddress(e.target.value)}
              placeholder="Street address (optional)"
            />
          </div>
          <div>
            <label className="text-sm text-ink/60 mb-1 block">Bio</label>
            <textarea
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              rows={3}
              value={profileBio}
              onChange={(e) => setProfileBio(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-ink/60 mb-1 block">
              Skills (comma-separated)
            </label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              value={profileSkills}
              onChange={(e) => setProfileSkills(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-ink/60 mb-1 block">
              Hourly rate (PKR, optional)
            </label>
            <input
              type="number"
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              value={profileHourlyRate}
              onChange={(e) => setProfileHourlyRate(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {profileSaving ? "Saving..." : "Save Profile"}
          </button>
          {profileSaved && (
            <p className="text-sm text-green-700">Profile updated.</p>
          )}
          {profileError && (
            <p className="text-sm text-red-500">{profileError}</p>
          )}
        </form>

        <div className="border-t border-line pt-6 mb-12">
          <h2 className="font-display text-xl text-heading mb-2">Email</h2>
          <p className="text-sm text-ink/60 mb-4">
            Current email:{" "}
            <span className="font-medium">{user?.email || "Not set"}</span>
          </p>

          {emailStep === "idle" && (
            <form onSubmit={handleRequestEmailChange} className="flex gap-3">
              <input
                type="email"
                className="flex-1 border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="New email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={emailLoading}
                className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {emailLoading ? "Sending..." : "Send Code"}
              </button>
            </form>
          )}

          {emailStep === "otp-sent" && (
            <form onSubmit={handleVerifyEmailOtp} className="flex gap-3">
              <input
                className="flex-1 border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="6-digit code"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                maxLength={6}
                required
              />
              <button
                type="submit"
                disabled={emailLoading}
                className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {emailLoading ? "Verifying..." : "Verify"}
              </button>
            </form>
          )}

          {emailMessage && (
            <p className="text-sm text-green-700 mt-2">{emailMessage}</p>
          )}
          {emailError && (
            <p className="text-sm text-red-500 mt-2">{emailError}</p>
          )}
        </div>

        <h2 className="font-display text-xl text-heading mb-2 border-t border-line pt-8">
          AI Agent API Keys
        </h2>
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
            <code className="block bg-card border border-line rounded-lg px-4 py-3 text-sm break-all">
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
            className="flex-1 border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
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
              className="border border-line rounded-xl p-4 bg-card flex items-center justify-between"
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
          <h2 className="font-display text-xl text-heading mb-2">
            🤖 Your Agent Marketplace Listing
          </h2>
          <p className="text-ink/60 mb-6 text-sm">
            List your AI agent so humans can hire it directly from the{" "}
            <a href="/agents" className="text-green-700 underline">
              Agent Marketplace
            </a>
            . One listing per account — saving again updates it.
          </p>
          <form onSubmit={handleSaveListing} className="space-y-3 mb-4">
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="Agent name (e.g. 'Document Scanner Bot')"
              value={listingName}
              onChange={(e) => setListingName(e.target.value)}
              required
            />
            <textarea
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="What does this agent do?"
              rows={3}
              value={listingDescription}
              onChange={(e) => setListingDescription(e.target.value)}
              required
            />
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="Categories, comma-separated (e.g. coding,writing)"
              value={listingCategories}
              onChange={(e) => setListingCategories(e.target.value)}
              required
            />
            <div className="flex gap-3">
              <input
                type="number"
                className="flex-1 border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="Starting price (PKR, optional)"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
              />
              <input
                type="number"
                className="w-40 border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="Avg hours"
                value={listingDeliveryHours}
                onChange={(e) => setListingDeliveryHours(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={listingSaving}
              className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              {listingSaving ? "Saving..." : "Save Listing"}
            </button>
            {listingSaved && (
              <p className="text-sm text-green-700">
                Saved — your agent is now visible in the marketplace.
              </p>
            )}
          </form>
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
