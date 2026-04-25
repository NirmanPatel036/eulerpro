'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import FooterSection from '@/components/sections/FooterSection';

export default function TermsPage() {
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
            TERMS OF <br /> SERVICE
          </h1>

          <div className="space-y-12 font-mono text-sm text-white/60 leading-relaxed tracking-tight">
            <section>
              <h2 className="text-white text-lg font-black mb-4 uppercase tracking-[0.2em]">01. Agreement to Terms</h2>
              <p>
                By accessing or using the EulerPro platform, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, you are prohibited from using the platform.
              </p>
            </section>

            <section>
              <h2 className="text-white text-lg font-black mb-4 uppercase tracking-[0.2em]">02. Use License</h2>
              <p>
                EulerPro grants you a personal, non-exclusive, non-transferable license to use the platform for its intended educational and assessment purposes. You may not:
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>Attempt to decompile or reverse engineer any software contained on the platform</li>
                <li>Use the platform to facilitate cheating or academic dishonesty</li>
                <li>Remove any copyright or other proprietary notations</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white text-lg font-black mb-4 uppercase tracking-[0.2em]">03. Proctoring & Conduct</h2>
              <p>
                Users participating in proctored exams consent to real-time monitoring via webcam, microphone, and screen-sharing. EulerPro reserves the right to flag suspicious behavior for review by institutional administrators.
              </p>
            </section>

            <section>
              <h2 className="text-white text-lg font-black mb-4 uppercase tracking-[0.2em]">04. Limitation of Liability</h2>
              <p>
                In no event shall EulerPro or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the EulerPro platform.
              </p>
            </section>

            <section>
              <h2 className="text-white text-lg font-black mb-4 uppercase tracking-[0.2em]">05. Governing Law</h2>
              <p>
                These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which EulerPro operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
              </p>
            </section>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
