'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import FooterSection from '@/components/sections/FooterSection';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-brand-pink selection:text-white">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 px-6 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo-cropped.svg" alt="EulerPro" width={140} height={36} className="h-9 w-auto" priority />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="font-mono text-[10px] tracking-widest font-black text-white/50 hover:text-white transition-colors">SIGN IN</Link>
            <Link href="/auth/register">
              <Button className="bg-brand-pink text-white hover:bg-white hover:text-black transition-all font-mono font-black text-[10px] tracking-widest h-10 px-6 rounded-full shadow-lg shadow-brand-pink/20">
                GET STARTED
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-7xl font-mono font-semibold tracking-tighter mb-12 text-brand-pink">
            PRIVACY <br /> POLICY
          </h1>

          <div className="space-y-12 font-mono text-sm text-white/60 leading-relaxed tracking-tight">
            <section>
              <h2 className="text-white text-lg font-black mb-4 uppercase tracking-[0.2em]">01. Introduction</h2>
              <p>
                At EulerPro, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information when you use our intelligent proctoring platform. We are committed to ensuring that your data is handled with the highest level of security and in compliance with GDPR and SOC 2 standards.
              </p>
            </section>

            <section>
              <h2 className="text-white text-lg font-black mb-4 uppercase tracking-[0.2em]">02. Data Collection</h2>
              <p>
                To provide our proctoring services, we may collect:
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>Account information (name, email, institution)</li>
                <li>Biometric data (facial recognition for identity verification)</li>
                <li>Device information (browser type, OS, IP address)</li>
                <li>Exam session data (video/audio recordings, screen activity)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white text-lg font-black mb-4 uppercase tracking-[0.2em]">03. How We Use Data</h2>
              <p>
                Your data is used exclusively for:
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>Maintaining academic integrity during exams</li>
                <li>Verifying candidate identity</li>
                <li>Improving our AI detection algorithms</li>
                <li>Providing technical support</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white text-lg font-black mb-4 uppercase tracking-[0.2em]">04. Security</h2>
              <p>
                We employ industry-standard encryption (AES-256) for data at rest and TLS 1.3 for data in transit. Access to sensitive session data is strictly limited to authorized institutional administrators and EulerPro technical staff on a need-to-know basis.
              </p>
            </section>

            <section>
              <h2 className="text-white text-lg font-black mb-4 uppercase tracking-[0.2em]">05. Contact</h2>
              <p>
                If you have questions about our privacy practices, please contact our Data Protection Officer at nirman0511@gmail.com.
              </p>
            </section>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
