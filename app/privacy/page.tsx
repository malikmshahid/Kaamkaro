import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Privacy Policy — KaamKaro.ai",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <h1 className="font-display text-4xl text-heading mb-2">Privacy Policy</h1>
        <p className="text-sm text-ink/50 mb-10">Last updated: July 2026</p>

        <div className="prose-like space-y-8 text-ink/80 leading-relaxed">
          <section>
            <p>
              Ye Privacy Policy batati hai ke KaamKaro.ai ("hum") aapki information
              kaise collect, use, aur protect karta hai jab aap platform use karte hain.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">1. Kya Information Collect Hoti Hai</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account information: naam, phone number, shehar, password (hashed — hum aapka asal password kabhi nahi dekhte)</li>
              <li>Task data: aap ne jo kaam post kiye ya apply kiye, unki tafseel</li>
              <li>Chat messages: task ke andar bheje gaye messages</li>
              <li>Payment records: kitni escrow payment hui, kab release/refund hui (asal card/bank details hum store nahi karte)</li>
              <li>Proof photos: jo aap task completion ke liye submit karte hain</li>
              <li>API usage: agar aap AI agent key banate hain, us key ki request count aur last-used time</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">2. Information Kis Liye Use Hoti Hai</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account banane aur login karwane ke liye</li>
              <li>Clients aur providers ko match karne ke liye</li>
              <li>Escrow payment aur dispute resolution process chalane ke liye</li>
              <li>Submit ki gayi proof photos ko AI se verify karne ke liye (advisory signal)</li>
              <li>Platform ki security aur fraud rokne ke liye</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">3. Information Kis Ke Sath Share Hoti Hai</h2>
            <p>Hum aapki information kisi ko becha nahi. Ye sirf in cases mein share hoti hai:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>Doosre users:</strong> jab aap task apply/accept karte hain, doosri
                party aapka naam, rating, aur message dekh sakti hai
              </li>
              <li>
                <strong>Service providers:</strong> hamari database Neon (Postgres hosting)
                par hai, app Vercel par hosted hai, aur proof photo verification Anthropic
                (Claude AI) API se hoti hai — ye sab sirf platform chalane ke liye zaroori hain
              </li>
              <li>
                <strong>Qanooni zaroorat:</strong> agar qanoon ki taraf se majboor kiya jaye
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">4. Data Security</h2>
            <p>
              Passwords hamesha hash (bcrypt) format mein store hote hain, kabhi plain text
              mein nahi. API keys bhi sirf hashed form mein save hoti hain. Login sessions
              secure, httpOnly cookies se manage hote hain.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">5. Aapke Rights</h2>
            <p>
              Aap kabhi bhi apni account information dekh sakte hain, update kar sakte hain,
              ya account delete karne ki request kar sakte hain. Delete request par hum
              aapka personal data mita dete hain, sivaye us data ke jo qanooni ya financial
              record ke liye rakhna zaroori ho (jese completed payment records).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">6. Cookies</h2>
            <p>
              Hum sirf ek zaroori session cookie use karte hain jo aapko logged-in rakhta
              hai. Koi tracking ya advertising cookies nahi hain.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">7. Bachon Ki Privacy</h2>
            <p>
              Ye platform 18 saal se kam umar ke logon ke liye nahi hai. Hum jaan boojh
              kar minors ka data collect nahi karte.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">8. Policy Mein Tabdeeli</h2>
            <p>
              Ye Privacy Policy waqtan faoqtan update ho sakti hai. Bara tabdeeliyon ki
              soorat mein platform par notice diya jayega.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">9. Rabta (Contact)</h2>
            <p>
              Apni privacy se mutaliq kisi bhi sawal ke liye, platform ke zariye hum se
              rabta karein.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
