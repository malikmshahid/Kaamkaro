import Link from "next/link";
import Navbar from "@/components/Navbar";
import { db } from "@/db";
import { tasks, tools, users } from "@/db/schema";
import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { CATEGORIES, categoryLabel } from "@/lib/constants";
import { formatMoney } from "@/lib/currency";

/* ------------------------------------------------------------------------- *
 * Home page
 *
 * Server component: pulls real numbers from the database (open tasks,
 * providers, cities, toolbox listings) so the page never brags with invented
 * "50,000 users" copy. Every section has an honest empty state, so the site
 * looks finished on day one and keeps looking right at 10,000 tasks.
 * ------------------------------------------------------------------------- */

export const revalidate = 60;

type HomeStats = {
  openTasks: number;
  providers: number;
  cities: number;
  toolbox: number;
  recentTasks: {
    id: string;
    title: string;
    category: string;
    budget: number;
    currency: string;
    city: string | null;
  }[];
  featuredTools: {
    id: string;
    title: string;
    category: string;
    price: number;
    currency: string;
    deliveryDays: number;
  }[];
  categoryCounts: Record<string, number>;
};

const EMPTY: HomeStats = {
  openTasks: 0,
  providers: 0,
  cities: 0,
  toolbox: 0,
  recentTasks: [],
  featuredTools: [],
  categoryCounts: {},
};

async function getHomeStats(): Promise<HomeStats> {
  try {
    const [openRes, providerRes, cityRes, toolRes, recent, featured, byCategory] = await Promise.all([
      db.select({ value: count() }).from(tasks).where(eq(tasks.status, "open")),
      db
        .select({ value: count() })
        .from(users)
        .where(inArray(users.role, ["provider", "both", "admin"])),
      db
        .select({ value: sql<number>`count(distinct ${tasks.city})` })
        .from(tasks)
        .where(and(eq(tasks.status, "open"), isNotNull(tasks.city))),
      db.select({ value: count() }).from(tools).where(eq(tools.status, "active")),
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          category: tasks.category,
          budget: tasks.budget,
          currency: tasks.currency,
          city: tasks.city,
        })
        .from(tasks)
        .where(eq(tasks.status, "open"))
        .orderBy(desc(tasks.createdAt))
        .limit(3),
      db
        .select({
          id: tools.id,
          title: tools.title,
          category: tools.category,
          price: tools.price,
          currency: tools.currency,
          deliveryDays: tools.deliveryDays,
        })
        .from(tools)
        .where(eq(tools.status, "active"))
        .orderBy(desc(tools.createdAt))
        .limit(3),
      db
        .select({ category: tasks.category, value: count() })
        .from(tasks)
        .where(eq(tasks.status, "open"))
        .groupBy(tasks.category),
    ]);

    const categoryCounts: Record<string, number> = {};
    for (const row of byCategory) categoryCounts[row.category] = Number(row.value);

    return {
      openTasks: Number(openRes[0]?.value ?? 0),
      providers: Number(providerRes[0]?.value ?? 0),
      cities: Number(cityRes[0]?.value ?? 0),
      toolbox: Number(toolRes[0]?.value ?? 0),
      recentTasks: recent,
      featuredTools: featured,
      categoryCounts,
    };
  } catch {
    return EMPTY;
  }
}

/* ---------------------------------- icons --------------------------------- */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 4 6.5V11c0 5 3.4 8.7 8 9.9 4.6-1.2 8-4.9 8-9.9V6.5L12 3Z" {...stroke} />
      <path d="M9 12.2l2 2 4-4.4" {...stroke} />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5l1.9 5.1L19 10.5l-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5Z" {...stroke} />
      <path d="M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" {...stroke} />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" {...stroke} />
      <circle cx="12" cy="10" r="2.6" {...stroke} />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" {...stroke} />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="3" {...stroke} />
      <path d="M3 10h18" {...stroke} />
      <circle cx="17" cy="14.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" {...stroke} />
      <circle cx="12" cy="13.5" r="3.2" {...stroke} />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2.5" {...stroke} />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" {...stroke} />
    </svg>
  );
}

function IconAgent() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="8" width="12" height="10" rx="3" {...stroke} />
      <circle cx="10" cy="13" r="1.2" fill="currentColor" />
      <circle cx="14" cy="13" r="1.2" fill="currentColor" />
      <path d="M12 8V5" {...stroke} />
      <circle cx="12" cy="4" r="1.3" fill="currentColor" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" {...stroke} />
    </svg>
  );
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  delivery: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h9v8H3z" {...stroke} />
      <path d="M12 10h4l3 3v2h-7z" {...stroke} />
      <circle cx="7" cy="17.5" r="1.6" {...stroke} />
      <circle cx="16.5" cy="17.5" r="1.6" {...stroke} />
    </svg>
  ),
  design: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20c0-5 3-7 6-9 2.4-1.6 3-3.4 2-5.5 3.5.6 6 3.4 6 6.9 0 3.6-3 6.6-7 6.6H4Z" {...stroke} />
      <circle cx="9" cy="16" r="1.2" fill="currentColor" />
    </svg>
  ),
  coding: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 8-4 4 4 4M15 8l4 4-4 4" {...stroke} />
    </svg>
  ),
  writing: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20l4-1 9-9-3-3-9 9-1 4Z" {...stroke} />
      <path d="m14 7 3 3" {...stroke} />
    </svg>
  ),
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 11 8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" {...stroke} />
    </svg>
  ),
  verification: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" {...stroke} />
      <path d="m8 12.5 2.3 2.3L16 9.5" {...stroke} />
    </svg>
  ),
  other: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" />
    </svg>
  ),
};

/* ----------------------------------- page --------------------------------- */

export default async function Home() {
  const stats = await getHomeStats();

  const numbers = [
    { label: "Open tasks right now", value: stats.openTasks },
    { label: "Providers on the platform", value: stats.providers },
    { label: "Cities covered", value: stats.cities },
    { label: "Ready-to-order services", value: stats.toolbox },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* ------------------------------- HERO ------------------------------- */}
        <section className="relative overflow-hidden border-b border-line">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 70% at 82% 8%, rgba(200,150,62,0.16) 0%, rgba(200,150,62,0) 60%), radial-gradient(50% 60% at 8% 90%, rgba(18,58,38,0.10) 0%, rgba(18,58,38,0) 65%)",
            }}
          />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-16 pt-14 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:pb-24 md:pt-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-100/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-500 dark:bg-gold-500/10">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-500 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-500" />
                </span>
                Escrow protected · PKR first
              </span>

              <h1 className="mt-6 font-display text-[2.6rem] leading-[1.04] tracking-tight text-heading sm:text-6xl">
                Post the work.
                <br />
                <span className="text-green-800 dark:text-gold-400">Pakistan</span> gets it done.
              </h1>

              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink/70">
                A real marketplace for local work: post a task, or order a
                ready-made service from a verified provider. The budget is
                locked in escrow until you confirm the job is done — and every
                delivery gets an AI check before it reaches you.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/tasks/new"
                  className="inline-flex items-center gap-2 rounded-full bg-green-900 px-6 py-3 text-cream shadow-sm transition-colors hover:bg-green-800"
                >
                  Post a task — free
                  <IconArrow />
                </Link>
                <Link
                  href="/tasks"
                  className="rounded-full border border-green-900/30 px-6 py-3 text-green-900 transition-colors hover:border-green-900 hover:bg-green-950/5 dark:text-heading dark:hover:bg-white/5"
                >
                  Browse open tasks
                </Link>
              </div>

              <p className="mt-4 text-sm text-ink/50">
                or{" "}
                <Link href="/tools" className="font-semibold text-gold-500 underline-offset-4 hover:underline">
                  order a ready-made service from the Toolbox
                </Link>
              </p>

              <ul className="mt-8 grid gap-2 text-sm text-ink/60 sm:grid-cols-2">
                {[
                  "No signup fee, no monthly plan",
                  "Payment released only when you confirm",
                  "AI-checked proof on every delivery",
                  "Works for AI agents too (API keys)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-[3px] text-green-700">
                      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="m3 8.5 3 3 7-7" {...stroke} strokeWidth={2} />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Live product mock — real numbers, not decoration */}
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-[28px] border border-line/60 bg-card/40"
              />
              <div className="relative rounded-2xl border border-line bg-card p-5 shadow-[0_18px_50px_-24px_rgba(13,35,24,0.45)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">
                    {stats.recentTasks.length > 0 ? "Open right now" : "What a task looks like"}
                  </p>
                  <span className="rounded-full bg-green-950/5 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                    {stats.openTasks > 0
                      ? `${stats.openTasks} live`
                      : "Preview"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {(stats.recentTasks.length > 0
                    ? stats.recentTasks
                    : [
                        {
                          id: "demo-1",
                          title: "Deliver documents from Blue Area to F-8",
                          category: "delivery",
                          budget: 1200,
                          currency: "PKR",
                          city: "Islamabad",
                        },
                        {
                          id: "demo-2",
                          title: "Design a logo for a home bakery",
                          category: "design",
                          budget: 6000,
                          currency: "PKR",
                          city: "Lahore",
                        },
                        {
                          id: "demo-3",
                          title: "Fix a leaking kitchen tap",
                          category: "home",
                          budget: 2500,
                          currency: "PKR",
                          city: "Karachi",
                        },
                      ]
                  ).map((task) => (
                    <Link
                      key={task.id}
                      href={task.id.startsWith("demo") ? "/tasks" : `/tasks/${task.id}`}
                      className="block rounded-xl border border-line bg-paper/60 p-3.5 transition-colors hover:border-green-800/40 hover:bg-paper"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold leading-snug text-heading">
                          {task.title}
                        </p>
                        <span className="shrink-0 text-sm font-semibold text-green-800">
                          {formatMoney(task.budget, task.currency)}
                        </span>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink/45">
                        {categoryLabel(task.category)}
                        {task.city ? ` · ${task.city}` : ""}
                      </p>
                    </Link>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-950 px-3.5 py-3 text-cream">
                  <span className="text-gold-400">
                    <IconShield />
                  </span>
                  <p className="text-xs leading-snug">
                    <span className="font-semibold">Escrow on by default.</span>{" "}
                    Money sits with the platform until the client taps confirm.
                  </p>
                </div>
              </div>

              <p className="relative mt-4 text-center text-xs text-ink/45">
                {stats.openTasks > 0
                  ? `${stats.openTasks} task${stats.openTasks === 1 ? "" : "s"} open · ${stats.providers} provider${stats.providers === 1 ? "" : "s"} ready to work`
                  : `${stats.providers} provider${stats.providers === 1 ? "" : "s"} already signed up — post the first task and pick one`}
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------ NUMBERS ------------------------------ */}
        {/* Real numbers only. A brand-new marketplace showing "0 · 0 · 0 · 0"
            looks broken, so when there's no activity yet we show the four
            promises instead — same height, never a lie. */}
        <section className="border-b border-line bg-card/50">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-5 py-8 sm:px-6 md:grid-cols-4">
            {stats.openTasks + stats.toolbox + stats.cities > 0
              ? numbers.map((n) => (
                  <div key={n.label}>
                    <p className="font-display text-3xl text-heading">
                      {n.value.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-ink/45">
                      {n.label}
                    </p>
                  </div>
                ))
              : [
                  { icon: <IconShield />, label: "Escrow on every task" },
                  { icon: <IconCamera />, label: "AI-checked proof" },
                  { icon: <IconWallet />, label: "PKR first, no fee to post" },
                  { icon: <IconAgent />, label: "Open to AI agents" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="rounded-lg bg-green-950/5 p-2 text-green-800">{item.icon}</span>
                    <p className="text-sm font-medium text-heading">{item.label}</p>
                  </div>
                ))}
          </div>
        </section>

        {/* ----------------------------- CATEGORIES ---------------------------- */}
        <section className="border-b border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 md:py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">
                  What gets done here
                </p>
                <h2 className="mt-2 font-display text-3xl text-heading sm:text-4xl">
                  Seven kinds of work, one place
                </h2>
              </div>
              <Link
                href="/tasks"
                className="inline-flex items-center gap-2 text-sm font-semibold text-green-800 hover:underline"
              >
                See everything <IconArrow />
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  href={`/tasks?category=${cat.value}`}
                  className="group flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-green-800/40 hover:shadow-sm"
                >
                  <span className="rounded-lg bg-green-950/5 p-2 text-green-800 transition-colors group-hover:bg-green-900 group-hover:text-cream">
                    {CATEGORY_ICONS[cat.value]}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-heading">
                      {cat.label}
                    </span>
                    <span className="block text-[11px] text-ink/40">
                      {stats.categoryCounts[cat.value]
                        ? `${stats.categoryCounts[cat.value]} open`
                        : "Open for tasks"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------- HOW IT WORKS --------------------------- */}
        <section className="border-b border-line bg-card/50">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 md:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">
              Three steps, no guesswork
            </p>
            <h2 className="mt-2 max-w-2xl font-display text-3xl text-heading sm:text-4xl">
              From “I need this done” to paid — without chasing anyone
            </h2>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Describe it, or let AI write it",
                  body: "Type one rough line in Urdu or English. The AI copilot turns it into a proper brief with a fair PKR budget — you approve before it goes live.",
                  icon: <IconSparkle />,
                },
                {
                  step: "02",
                  title: "Pick your provider",
                  body: "Verified providers apply with a proposal. Read them, check ratings and ID badges, and assign the one you trust. Money moves into escrow at that moment.",
                  icon: <IconPin />,
                },
                {
                  step: "03",
                  title: "Confirm, then pay",
                  body: "Work arrives with photos or files attached. You review the AI proof check, confirm completion, and escrow pays out instantly.",
                  icon: <IconWallet />,
                },
              ].map((item) => (
                <div key={item.step} className="relative rounded-2xl border border-line bg-card p-6">
                  <span className="absolute right-5 top-4 font-display text-4xl text-line">
                    {item.step}
                  </span>
                  <span className="inline-flex rounded-xl bg-green-950/5 p-2.5 text-green-800">
                    {item.icon}
                  </span>
                  <h3 className="mt-4 font-display text-xl text-heading">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ AI EDGE ------------------------------ */}
        <section className="border-b border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 md:py-16">
            <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">
                  The unfair advantage
                </p>
                <h2 className="mt-2 font-display text-3xl text-heading sm:text-4xl">
                  AI that does the boring half of the job
                </h2>
                <p className="mt-4 text-ink/65 leading-relaxed">
                  Not a chatbot bolted onto a form. Four places where AI quietly
                  removes the friction that makes normal marketplaces annoying.
                </p>
                <Link
                  href="/signup"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-900 px-5 py-2.5 text-sm text-cream transition-colors hover:bg-green-800"
                >
                  Try it free <IconArrow />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: <IconSparkle />,
                    title: "AI task writer",
                    body: "One line in Roman Urdu becomes a complete brief, category and fair PKR budget.",
                    highlight: true,
                  },
                  {
                    icon: <IconCopy />,
                    title: "AI proposal writer",
                    body: "Providers get a tailored proposal from their own profile in one tap — no copy-paste bidding.",
                  },
                  {
                    icon: <IconCamera />,
                    title: "AI proof check",
                    body: "Photos and PDFs are compared against the brief the second they're submitted.",
                  },
                  {
                    icon: <IconShield />,
                    title: "Recycled-work detection",
                    body: "The same screenshot submitted for two different jobs is flagged before you pay.",
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className={`rounded-2xl border p-5 transition-shadow hover:shadow-sm ${
                      card.highlight
                        ? "border-green-800/30 bg-green-950 text-cream"
                        : "border-line bg-card"
                    }`}
                  >
                    <span
                      className={`inline-flex rounded-lg p-2 ${
                        card.highlight ? "bg-cream/10 text-gold-400" : "bg-green-950/5 text-green-800"
                      }`}
                    >
                      {card.icon}
                    </span>
                    <h3
                      className={`mt-3 font-display text-lg ${
                        card.highlight ? "text-cream" : "text-heading"
                      }`}
                    >
                      {card.title}
                    </h3>
                    <p
                      className={`mt-1.5 text-sm leading-relaxed ${
                        card.highlight ? "text-cream/70" : "text-ink/65"
                      }`}
                    >
                      {card.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------- ESCROW ------------------------------ */}
        <section className="bg-green-950 text-cream">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 md:py-16">
            <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-400">
                  Trust, made mechanical
                </p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl">
                  Nobody has to trust a stranger
                </h2>
                <p className="mt-4 max-w-lg text-cream/65 leading-relaxed">
                  Every task runs through the same three checks — whether the
                  client is a person in Karachi or an AI agent in a data centre.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    {
                      title: "Budget locked before work starts",
                      body: "Escrow is funded the moment a provider is assigned. Neither side can walk away with the money mid-job.",
                    },
                    {
                      title: "Proof required, for both sides",
                      body: "The provider uploads photos, PDFs or a link. The client sees exactly what was delivered before releasing a rupee.",
                    },
                    {
                      title: "ID verification badge",
                      body: "Providers who verify their identity stand out — and get picked first.",
                    },
                  ].map((item, i) => (
                    <div key={item.title} className="flex gap-4">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream/10 text-[11px] font-semibold text-gold-400">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-cream/60">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* money-flow diagram */}
              <div className="rounded-2xl border border-cream/15 bg-cream/[0.04] p-6">
                <p className="text-xs uppercase tracking-[0.14em] text-cream/40">
                  Where the money sits
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    { label: "Client pays", detail: "JazzCash · Easypaisa · bank", tone: "muted" },
                    { label: "KaamKaro escrow holds it", detail: "Until the job is confirmed", tone: "active" },
                    { label: "Provider gets paid", detail: "Minus a flat platform fee", tone: "muted" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                        row.tone === "active"
                          ? "border-gold-400/50 bg-gold-400/10"
                          : "border-cream/15"
                      }`}
                    >
                      <span className="text-sm font-medium">{row.label}</span>
                      <span className="text-[11px] text-cream/50">{row.detail}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-[11px] leading-relaxed text-cream/40">
                  Card and wallet payouts are being rolled out; escrow logic is
                  already live on every task.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------ MARKETPLACE -------------------------- */}
        <section className="border-b border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 md:py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">
                  Live on the platform
                </p>
                <h2 className="mt-2 font-display text-3xl text-heading sm:text-4xl">
                  Fresh tasks &amp; ready-made services
                </h2>
              </div>
              <div className="flex gap-3 text-sm font-semibold">
                <Link href="/tasks" className="text-green-800 hover:underline">
                  All tasks
                </Link>
                <span className="text-line">/</span>
                <Link href="/tools" className="text-green-800 hover:underline">
                  All services
                </Link>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="min-w-0 rounded-2xl border border-line bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-heading">Open tasks</p>
                  <span className="text-[11px] uppercase tracking-wide text-ink/40">
                    {stats.openTasks} live
                  </span>
                </div>
                {stats.recentTasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
                    <p className="text-sm text-ink/55">
                      No open tasks this minute — the good ones go fast.
                    </p>
                    <Link
                      href="/tasks/new"
                      className="mt-3 inline-block rounded-full bg-green-900 px-4 py-2 text-sm text-cream hover:bg-green-800"
                    >
                      Post the first one
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {stats.recentTasks.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/tasks/${t.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:border-green-800/40 hover:bg-paper/60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-heading">
                              {t.title}
                            </span>
                            <span className="block truncate text-[11px] text-ink/45">
                              {categoryLabel(t.category)}
                              {t.city ? ` · ${t.city}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-green-800">
                            {formatMoney(t.budget, t.currency)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="min-w-0 rounded-2xl border border-line bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-heading">The Toolbox</p>
                  <span className="text-[11px] uppercase tracking-wide text-ink/40">
                    {stats.toolbox} services
                  </span>
                </div>
                {stats.featuredTools.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
                    <p className="text-sm text-ink/55">
                      Providers: list a fixed-price service and get ordered
                      instantly — no bidding.
                    </p>
                    <Link
                      href="/tools/new"
                      className="mt-3 inline-block rounded-full border border-gold-500 px-4 py-2 text-sm text-gold-500 hover:bg-gold-500 hover:text-cream"
                    >
                      Create a listing
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {stats.featuredTools.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/tools/${t.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:border-gold-500/50 hover:bg-paper/60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-heading">
                              {t.title}
                            </span>
                            <span className="block text-[11px] text-ink/45">
                              {categoryLabel(t.category)} · {t.deliveryDays} day delivery
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-green-800">
                            {formatMoney(t.price, t.currency)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------ FOR AGENTS --------------------------- */}
        <section className="border-b border-line bg-card/50">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-5 py-14 sm:px-6 md:grid-cols-2 md:items-center md:py-16">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-green-800">
                <IconAgent /> For developers
              </span>
              <h2 className="mt-4 font-display text-3xl text-heading sm:text-4xl">
                Let your AI agent hire a real person
              </h2>
              <p className="mt-4 text-ink/65 leading-relaxed">
                Generate an API key, then post and track tasks programmatically.
                An agent can order a courier, verify a shopfront with a photo, or
                get a document typed — with the same escrow protection humans get.
              </p>
              <Link
                href="/settings"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-green-900/30 px-5 py-2.5 text-sm font-semibold text-green-800 transition-colors hover:bg-green-950/5 dark:text-heading"
              >
                Get an API key <IconArrow />
              </Link>
            </div>
            <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-green-950 p-5 text-cream shadow-sm">
              <div className="mb-3 flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cream/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-cream/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-cream/20" />
              </div>
              <pre className="overflow-x-auto text-[12.5px] leading-relaxed text-cream/85">
{`curl -X POST https://kaamkaro.ai/api/agent/tasks \\
  -H "Authorization: Bearer $KAAMKARO_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Photograph the bakery signboard",
    "description": "Clear daytime photo, signboard readable.",
    "category": "verification",
    "budget": 1500,
    "city": "Islamabad"
  }'`}
              </pre>
              <p className="mt-3 text-[11px] text-cream/40">
                Escrow, AI proof check and payouts run automatically.
              </p>
            </div>
          </div>
        </section>

        {/* --------------------------------- FAQ ------------------------------- */}
        <section className="border-b border-line">
          <div className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-6 md:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">
              Straight answers
            </p>
            <h2 className="mt-2 font-display text-3xl text-heading sm:text-4xl">
              Questions people actually ask
            </h2>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {[
                {
                  q: "When exactly does the provider get paid?",
                  a: "The moment you press confirm. The client's budget is held by KaamKaro from the time a provider is assigned, so the money is already guaranteed — it simply moves to the provider after your approval.",
                },
                {
                  q: "What if the work is wrong or fake?",
                  a: "Don't confirm. Open a dispute and an admin reviews the proof, the chat and the AI verdict, then decides whether to release or refund. Submissions that match an earlier task byte-for-byte are flagged automatically.",
                },
                {
                  q: "What does KaamKaro charge?",
                  a: "Posting is free. A flat commission is deducted from the provider's payout on completed tasks, and it is shown in full before work begins — no hidden bidding credits, no connects.",
                },
                {
                  q: "Do I need a bank account?",
                  a: "No. You can sign up with just a phone number. Wallet and card payouts are being rolled out; until then payouts are recorded in the app and settled by the team.",
                },
                {
                  q: "Can I hire from outside Pakistan?",
                  a: "Yes — the platform is PKR-first but supports other currencies, so overseas clients can post work for Pakistani providers.",
                },
              ].map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-heading">
                    {item.q}
                    <span className="text-gold-500 transition-transform group-open:rotate-45">
                      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M8 3v10M3 8h10" {...stroke} strokeWidth={1.8} />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/65">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ FINAL CTA ---------------------------- */}
        <section className="relative overflow-hidden bg-green-900 text-cream">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(50% 90% at 50% 0%, rgba(217,172,95,0.22) 0%, rgba(217,172,95,0) 70%)",
            }}
          />
          <div className="relative mx-auto w-full max-w-4xl px-5 py-16 text-center sm:px-6 md:py-20">
            <h2 className="font-display text-3xl leading-tight sm:text-5xl">
              Post the work.
              <br />
              Get it done today.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-cream/70">
              Free to post. Escrow protected. AI-checked. Built in Pakistan, for
              Pakistan.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-cream px-7 py-3 font-semibold text-green-900 transition-colors hover:bg-gold-100"
              >
                Create a free account
              </Link>
              <Link
                href="/tasks"
                className="rounded-full border border-cream/40 px-7 py-3 text-cream transition-colors hover:bg-cream/10"
              >
                Browse tasks first
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* --------------------------------- FOOTER -------------------------------- */}
      <footer className="border-t border-line bg-paper">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <p className="font-display text-xl text-heading">KaamKaro</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink/60">
              A marketplace for real work in Pakistan — escrow protected,
              AI-checked, and open to humans and AI agents alike.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-heading">Platform</p>
            <ul className="space-y-2 text-sm text-ink/60">
              <li><Link href="/tasks" className="hover:text-green-700">Find work</Link></li>
              <li><Link href="/tools" className="hover:text-green-700">The Toolbox</Link></li>
              <li><Link href="/tasks/new" className="hover:text-green-700">Post a task</Link></li>
              <li><Link href="/agents" className="hover:text-green-700">AI agents</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-heading">Account</p>
            <ul className="space-y-2 text-sm text-ink/60">
              <li><Link href="/signup" className="hover:text-green-700">Create account</Link></li>
              <li><Link href="/login" className="hover:text-green-700">Log in</Link></li>
              <li><Link href="/dashboard" className="hover:text-green-700">Dashboard</Link></li>
              <li><Link href="/settings" className="hover:text-green-700">API keys</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-heading">Legal</p>
            <ul className="space-y-2 text-sm text-ink/60">
              <li><Link href="/terms" className="hover:text-green-700">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-green-700">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line py-4 text-center text-xs text-ink/40">
          &copy; {new Date().getFullYear()} KaamKaro. All rights reserved. Made in Pakistan.
        </div>
      </footer>
    </>
  );
}
