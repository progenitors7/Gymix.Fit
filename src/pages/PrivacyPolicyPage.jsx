import React from 'react';
import { ShieldCheck, Mail, Lock, Database, Eye, FileText, ChevronLeft } from 'lucide-react';
import Logo from '../components/UI/Logo';

export default function PrivacyPolicyPage() {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-[#0F1117] text-gray-300 font-sans selection:bg-[#3B82F6]/30 selection:text-[#3B82F6]">
      {/* Dynamic Ambient Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#3B82F6]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[600px] h-[600px] bg-[#863BFF]/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Header / Nav */}
      <header className="border-b border-white/5 bg-[#151922]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-black uppercase tracking-wider border border-white/5 transition-all active:scale-[0.98]"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6 drop-shadow-[0_0_8px_rgba(59,130,246,0.2)]" />
            <span className="font-black text-white tracking-tighter text-sm italic uppercase">
              Gymix<span className="text-[#3B82F6]">.Fit</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#3B82F6]/10 text-[#3B82F6] rounded-full text-[10px] font-black uppercase tracking-widest border border-[#3B82F6]/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          Play Store Compliant Document
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic">
          Privacy <span className="text-[#3B82F6]">Policy</span>
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm font-medium max-w-xl mx-auto">
          Last Updated: May 31, 2026. This policy describes how Gymix.Fit collects, secures, and handles your information to provide a safe multi-tenant experience.
        </p>
      </section>

      {/* Core Privacy Content */}
      <main className="max-w-4xl mx-auto px-4 pb-24">
        <div className="bg-[#151922]/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-12">
          
          {/* Quick Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Lock, title: "100% Encrypted", desc: "All user databases, billing records, and auth sessions are encrypted via secure SSL transit." },
              { icon: Database, title: "No Data Sales", desc: "We never sell, rent, or trade your personal information, member logs, or metrics to brokers." },
              { icon: Eye, title: "Owner Control", desc: "Gym owners retain absolute rights over their registered athletes, profiles, and logs." }
            ].map((card, i) => (
              <div key={i} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6]">
                  <card.icon className="w-4 h-4" />
                </div>
                <h4 className="text-white text-sm font-black uppercase tracking-tight">{card.title}</h4>
                <p className="text-gray-400 text-xs font-medium leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="h-px bg-white/5" />

          {/* Section 1 */}
          <article className="space-y-4">
            <h3 className="text-white font-black uppercase italic tracking-tight text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#3B82F6]" />
              1. Information We Collect
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed font-medium">
              Gymix.Fit functions as a multi-tenant platform for gym operations. To deliver these services, we collect:
            </p>
            <ul className="list-disc pl-5 text-gray-400 text-xs space-y-2 leading-relaxed">
              <li><strong>Account Credentials:</strong> Email address, password hashes, full name, and avatar pictures provided during signup.</li>
              <li><strong>Gym Operations Data:</strong> Gym name, location variables, uniquely generated codes, member lists, and billing history logs.</li>
              <li><strong>Check-in Logs & Gamification:</strong> Attendance timestamps, scanned QR Token variables, streak calculations, milestone history, and custom loyalty coin balances.</li>
              <li><strong>Device Access:</strong> Camera access is requested in-app strictly for scanning dynamic rolling QR tokens at the gym entrance. We do not store static camera captures.</li>
            </ul>
          </article>

          {/* Section 2 */}
          <article className="space-y-4">
            <h3 className="text-white font-black uppercase italic tracking-tight text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#3B82F6]" />
              2. How We Secure Your Data
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed font-medium">
              We employ military-grade architecture via **Supabase cloud databases** to secure client configurations:
            </p>
            <ul className="list-disc pl-5 text-gray-400 text-xs space-y-2 leading-relaxed">
              <li><strong>Row-Level Security (RLS):</strong> Every query is isolated using native RLS policies, ensuring gym owners and athletes can only access information explicitly authorized to their registered UUIDs.</li>
              <li><strong>Anti-Cheat Security Skews:</strong> Scanned QR tokens incorporate rolling timestamps. Screens are checked dynamically to prevent screenshots or remote bypasses.</li>
            </ul>
          </article>

          {/* Section 3 */}
          <article className="space-y-4">
            <h3 className="text-white font-black uppercase italic tracking-tight text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-[#3B82F6]" />
              3. Data Sharing & Third-Party Processors
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed font-medium">
              We never disclose user operations data unless necessary to execute essential business transactions. We share data securely with these verified third-party processors:
            </p>
            <ul className="list-disc pl-5 text-gray-400 text-xs space-y-2 leading-relaxed">
              <li><strong>Supabase:</strong> For cloud databases, user authentication services, and serverless edge functions.</li>
              <li><strong>Razorpay:</strong> To process secure subscription billing payments (SaaS plans and physical gym memberships) under Indian payment laws.</li>
              <li><strong>Resend API:</strong> To deliver transactional emails, purchase invoices, and onboarding newsletters.</li>
              <li><strong>WhatsApp Session Gateway:</strong> To relay automated notification reminders (such as expiring plans, attendance check-ins) to members' mobile devices.</li>
            </ul>
          </article>

          {/* Section 4 */}
          <article className="space-y-4">
            <h3 className="text-white font-black uppercase italic tracking-tight text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#3B82F6]" />
              4. Data Retention & Deletion Rights
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed font-medium">
              Gym owners and athletes maintain full ownership over their profiles:
            </p>
            <ul className="list-disc pl-5 text-gray-400 text-xs space-y-2 leading-relaxed">
              <li>Owners can request complete removal of their gym profile, member database records, and transaction logs.</li>
              <li>All database values can be updated instantly inside the Settings page of the dashboard.</li>
              <li>Deletion requests can be initiated at any time by contacting our support team at **support@gymix.fit**.</li>
            </ul>
          </article>

          {/* Section 5 */}
          <article className="space-y-4">
            <h3 className="text-white font-black uppercase italic tracking-tight text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#3B82F6]" />
              5. Contact Us
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed font-medium">
              For any questions, issues, or requests concerning this Privacy Policy or your account operations:
            </p>
            <div className="flex items-center gap-3 p-5 bg-white/[0.02] border border-white/5 rounded-2xl max-w-sm">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-white text-xs font-black uppercase tracking-wider">Email Support</h5>
                <p className="text-[#3B82F6] text-sm font-semibold hover:underline">
                  <a href="mailto:support@gymix.fit">support@gymix.fit</a>
                </p>
              </div>
            </div>
          </article>

        </div>
      </main>
    </div>
  );
}
