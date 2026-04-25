'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function FooterSection() {
  return (
    <footer className="px-6 pt-32 border-t border-white/5 bg-[#1a0614]">
      <div className="max-w-7xl mx-auto pb-0 flex flex-col lg:grid lg:grid-cols-12 gap-20">
        <div className="lg:col-span-5">
          <div className="flex items-center mb-10">
            <Image src="/logo-cropped.svg" alt="EulerPro" width={160} height={40} className="h-10 w-auto" />
          </div>
          <p className="text-white/30 text-xs font-mono leading-relaxed mb-12 max-w-xs">
            The intelligent proctoring platform for the modern era. SOC 2 compliant, GDPR ready, and AI-driven.
          </p>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-16">
          <div>
            <h5 className="font-mono font-semibold text-[10px] mb-10 text-brand-pink">Product</h5>
            <ul className="space-y-6 font-mono text-[11px] tracking-widest text-white/40">
              <li><Link href="/auth/login" className="hover:text-white transition-colors">EXAMS</Link></li>
              <li><Link href="/#proctoring" className="hover:text-white transition-colors">PROCTORING</Link></li>
              <li><Link href="/auth/login" className="hover:text-white transition-colors">DASHBOARD</Link></li>
              <li><Link href="/#ai-analytics" className="hover:text-white transition-colors">AI ANALYTICS</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-mono font-semibold text-[10px] mb-10 text-brand-pink">Resources</h5>
            <ul className="space-y-6 font-mono text-[11px] tracking-widest text-white/40">
              <li><Link href="/#how-it-works" className="hover:text-white transition-colors">HOW IT WORKS</Link></li>
              <li><Link href="/#features" className="hover:text-white transition-colors">FEATURES</Link></li>
              <li><Link href="/#testimonials" className="hover:text-white transition-colors">TESTIMONIALS</Link></li>
              <li><Link href="/auth/login" className="hover:text-white transition-colors">SIGN IN</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-32 pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-10">
        <p className="font-mono text-[9px] text-white/20 uppercase">© 2026 EulerPro Platform. Built with ❤️ by Team EulerPro.</p>
        <div className="flex gap-10 font-mono text-[9px] text-white/20 uppercase">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        </div>
      </div>

      {/* Paper airplane — bottom centrepiece */}
      <div className="relative flex justify-center mt-10 pointer-events-none select-none overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/footer-img.png"
          alt=""
          className="w-[480px] md:w-[640px] lg:w-[800px] h-auto -mb-30 opacity-80"
          style={{ filter: 'invert(1) brightness(2)' }}
        />
      </div>
    </footer>
  );
}
