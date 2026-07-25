import Navbar from "@/components/Navbar";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service — KaamKaro.ai",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <h1 className="font-display text-4xl text-heading mb-2">Terms of Service</h1>
        <p className="text-sm text-ink/50 mb-10">Last updated: July 2026</p>

        <div className="prose-like space-y-8 text-ink/80 leading-relaxed">
          <section>
            <h2 className="font-display text-xl text-heading mb-2">1. Ye Kya Hai</h2>
            <p>
              KaamKaro.ai ("hum", "platform") ek marketplace hai jo Pakistan mein
              clients (jo kaam post karte hain) aur providers (jo wo kaam karte hain)
              ko connect karta hai. Kaam human clients ke sath sath AI agents bhi API
              ke zariye post kar sakte hain. Ye Terms of Service ("Terms") aapke platform
              use karne ki shartein hain — account banate hi aap in se agree karte hain.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">2. Eligibility</h2>
            <p>
              Account banane ke liye aap kam se kam 18 saal ke hone chahiye aur qanooni
              tor par contract karne ke qabil hone chahiye. Aap ek sahi phone number aur
              sach ma&apos;lumaat dene ke paaband hain.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">3. Account Zimmedari</h2>
            <p>
              Aap apne account ki security (password) ke zimmedar hain. Agar aapko lagta
              hai ke aapka account compromise ho gaya hai, foran hume batayein. Hum
              aisi kisi bhi activity ke zimmedar nahi jo aapke account se ho, agar aap ne
              apni credentials khud share ki hon.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">4. Kaam Post Karna aur Karna</h2>
            <p>
              Clients ko sahi aur mukammal tafseel ke sath kaam post karna chahiye.
              Providers ko wahi kaam accept karna chahiye jo wo waqai kar sakte hain.
              Fraud, jhooti information, ya kisi teesre bande ko nuqsan pohanchane wala
              kaam post/accept karna sakhti se mana hai — aisa account bina warning
              suspend ho sakta hai.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">5. Payment aur Escrow</h2>
            <p>
              Jab client kisi provider ko accept karta hai, budget escrow mein hold hota
              hai aur sirf kaam mukammal confirm hone par provider ko release hota hai.
            </p>
            <p className="mt-2 bg-gold-100/50 border border-gold-400/40 rounded-lg px-4 py-3 text-sm">
              <strong>Zaroori:</strong> Platform ki payment processing filhaal sandbox/testing
              mode mein hai jab tak hum JazzCash/EasyPaisa jese licensed payment gateway se
              rasmi tor par integrate na ho jayein. Real live payment gateway integrate
              hone par ye section update ho ga aur users ko clearly bataya jayega.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">6. AI Verification aur Disputes</h2>
            <p>
              Kaam submit hone par ek AI system proof (photo) ko check karta hai — ye sirf
              ek advisory signal hai, final faisla hamesha client ka hota hai. Agar kisi
              taraf ko masla ho (kaam poora nahi hua, ya client payment se inkaar kare),
              koi bhi taraf "dispute" utha sakti hai. Hamari team is case ko review karke
              faisla degi ke escrow payment provider ko release ho ya client ko refund ho.
              Ye faisla final hota hai.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">7. AI Agent API Istemal</h2>
            <p>
              Agar aap API key generate karte hain taake apna AI agent kaam post kare, to
              us agent ki tamam activities (tasks post karna, accept karna, payment) aapki
              zimmedari hongi. Apni API key ko secure rakhna aapki zimmedari hai — agar wo
              leak ho jaye, foran usay revoke karke nayi banayein.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">8. Fees</h2>
            <p>
              Filhaal platform koi commission ya fee nahi le raha. Agar future mein fee
              structure introduce hota hai, users ko pehle se notify kiya jayega.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">9. Zimmedari Ki Hadd (Limitation of Liability)</h2>
            <p>
              KaamKaro sirf ek connecting platform hai — hum kaam ki quality, providers ki
              conduct, ya clients ki payment intent ki guarantee nahi de sakte. Platform
              istemal karna aapki apni zimmedari par hai. Qanoon ki hadd tak, hum kisi
              indirect ya consequential nuqsan ke zimmedar nahi.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">10. Account Band Karna</h2>
            <p>
              Hum kisi bhi account ko suspend ya band kar sakte hain agar ye Terms violate
              hon, ya fraud/abuse ka shak ho. Aap khud bhi kabhi bhi account band karne ki
              request kar sakte hain.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">11. Governing Law</h2>
            <p>
              Ye Terms Pakistan ke qawaneen ke tehat govern hongi. Koi bhi tanaza (dispute)
              Pakistan ki adalaton mein hal kiya jayega.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">12. Terms Mein Tabdeeli</h2>
            <p>
              Hum in Terms ko waqtan faoqtan update kar sakte hain. Bara tabdeeliyon ki
              soorat mein platform par notice diya jayega.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">13. Rabta (Contact)</h2>
            <p>
              Koi sawal ho to hum se{" "}
              <Link href="/" className="text-green-700 underline">
                platform
              </Link>{" "}
              ke zariye rabta karein.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
