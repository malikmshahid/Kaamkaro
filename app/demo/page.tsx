import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import DemoRoom from "./DemoRoom";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://kaamkaro-six.vercel.app").replace(/\/$/, "");
const demoTranscript =
  "پاکستان میں کام کرواتے وقت صرف کسی کا پروفائل دیکھنا کافی نہیں۔ کام کیا ہے، مکمل کب سمجھا جائے گا، اور ثبوت کیسے پرکھیں گے—یہ پہلے واضح ہونا چاہیے۔ SafarWorks پر اپنی ضرورت English، Urdu یا Roman Urdu میں لکھیں۔ یہ demo گھر کی بیکری کے logo کی فرضی مثال دکھاتا ہے۔ Brief میں deliverables واضح کریں۔ پھر دیکھیں کہ skills، location اور available trust signals سے provider match کیوں relevant ہو سکتا ہے۔ کام جمع ہونے پر اصل فائلوں کو طے شدہ scope کے مطابق review کریں۔ AI مددگار اشارے دے سکتا ہے، مگر فیصلہ انسان کرتا ہے۔ آخر میں sample work receipt دیکھیں—یہ حقیقی record نہیں۔ 45-second interactive demo آزما کر دیکھیں؛ کوئی real task post نہیں ہوتی، کوئی provider شامل نہیں ہوتا، اور کوئی payment نہیں ہوتی۔";

export const metadata: Metadata = {
  title: "SafarWorks Product Demo: From Idea to Proof",
  description:
    "Watch a 53-second Urdu-narrated walkthrough of SafarWorks's sample task flow, from a clear brief to human-reviewed proof. No real job, provider or payment.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "SafarWorks Product Demo — From Idea to Proof",
    description:
      "A real screen recording of SafarWorks's clearly labelled sample demo, with Urdu narration and English captions.",
    url: "/demo",
    images: [{ url: "/safarworks-demo-poster.png", width: 1200, height: 630, alt: "SafarWorks product demo: a job, from idea to proof" }],
    videos: [{ url: "/safarworks-demo.mp4", type: "video/mp4", width: 1600, height: 900 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SafarWorks Product Demo — From Idea to Proof",
    description: "Urdu-narrated walkthrough, English captions; sample flow only.",
    images: ["/safarworks-demo-poster.png"],
  },
};

const videoStructuredData = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "SafarWorks product demo: a job, from idea to proof",
  description:
    "A 53-second Urdu-narrated screen recording of SafarWorks's sample task walkthrough. The profile and receipt are fictional examples; no task is posted, no real provider is shown and no payment is involved.",
  thumbnailUrl: `${siteUrl}/safarworks-demo-poster.png`,
  uploadDate: "2026-11-03",
  duration: "PT53S",
  contentUrl: `${siteUrl}/safarworks-demo.mp4`,
  embedUrl: `${siteUrl}/demo`,
  inLanguage: "ur-PK",
  transcript: demoTranscript,
};

export default function DemoPage() {
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoStructuredData).replace(/</g, "\\u003c") }}
      />
      <DemoRoom />
    </>
  );
}
