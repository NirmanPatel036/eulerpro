'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, Zap, Eye, ArrowRight } from 'lucide-react';

function DockIcon({ children, isCenter = false }: { children: React.ReactNode; isCenter?: boolean }) {
  return (
    <motion.div
      whileHover={{ scale: 1.12, y: -6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={
        isCenter
          ? 'w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl -translate-y-2 border-2 border-white/10 bg-[#330c26] cursor-default'
          : 'w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden cursor-default'
      }
    >
      {children}
    </motion.div>
  );
}

export default function HeroSection() {
  return (
    <section id="hero" className="relative pt-40 pb-20 flex flex-col items-center overflow-hidden bg-white">
      <div className="hero-grid-bg" />

      {/* Floating squares */}
      <motion.div className="absolute top-[8%] right-[8%] w-4 h-4 bg-orange-500 rounded-sm" animate={{ y: [0, -8, 0], rotate: [0, 15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-[45%] left-[4%] w-4 h-4 bg-cyan-400 rounded-sm" animate={{ y: [0, 8, 0], rotate: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-[22%] right-[5%] w-4 h-4 bg-brand-pink rounded-sm" animate={{ y: [0, -6, 0], rotate: [0, 20, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-[18%] left-[12%] w-3 h-3 bg-purple-500 rounded-sm" animate={{ y: [0, 10, 0], rotate: [0, -20, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-[12%] left-[45%] w-3 h-3 bg-emerald-400 rounded-sm" animate={{ y: [0, -7, 0], rotate: [0, 12, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-[15%] left-[10%] w-3.5 h-3.5 bg-amber-400 rounded-sm" animate={{ y: [0, 6, 0], rotate: [0, -18, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-[30%] right-[6%] w-3 h-3 bg-blue-500 rounded-sm" animate={{ y: [0, -9, 0], rotate: [0, 25, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-[35%] right-[15%] w-3 h-3 bg-rose-400 rounded-sm" animate={{ y: [0, 5, 0], rotate: [0, -10, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />

      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center">
        {/* macOS dock */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 relative"
        >
          <div className="hero-dock rounded-[32px] px-4 py-3 flex items-end gap-3">
            <DockIcon>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c9/Finder_Icon_macOS_Big_Sur.png" alt="Finder" className="w-full h-full object-cover rounded-xl" />
            </DockIcon>
            <DockIcon>
              <div className="w-full h-full rounded-xl bg-white flex flex-col items-center justify-center overflow-hidden shadow-sm border border-gray-100">
                <div className="bg-red-500 w-full h-1/3 flex items-center justify-center text-[9px] text-white font-bold tracking-tight">FEB</div>
                <div className="flex-grow flex items-center justify-center text-2xl font-light text-gray-800">26</div>
              </div>
            </DockIcon>
            <div className="ml-1 -mr-1.5">
              <DockIcon isCenter>
                <Image src="/symbol.svg" alt="EulerPro" width={48} height={48} className="w-12 h-12" />
              </DockIcon>
            </div>
            <DockIcon>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <Image src="/images/safari.png" alt="Safari" width={48} height={48} className="w-16 h-16 ml-1" />
            </DockIcon>
            <DockIcon>
              <div className="w-full h-full rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" viewBox="0 0 100 100" id="apple-photos" className="w-full h-full">
                    <path fill="#FFF" d="M63.6 5c9 0 13.6 0 18.4 1.5 5.3 1.9 9.5 6.1 11.4 11.4C95 22.8 95 27.3 95 36.4v27.2c0 9 0 13.6-1.5 18.4-1.9 5.3-6.1 9.5-11.4 11.4C77.2 95 72.7 95 63.6 95H36.4c-9 0-13.6 0-18.4-1.5-5.3-2-9.5-6.2-11.5-11.5C5 77.2 5 72.7 5 63.6V36.4c0-9 0-13.6 1.5-18.4 2-5.3 6.2-9.5 11.5-11.5C22.8 5 27.3 5 36.4 5h27.2z"></path>
                    <path fill="#FF7E7B" d="M35.8 38c.9 0 1.7.1 2.5.3-.2-.8-.3-1.7-.3-2.5V23c0-.6.1-1.1.1-1.6-4.7-3.5-11.4-3.1-15.6 1.1s-4.6 10.9-1.1 15.6c.5-.1 1.1-.1 1.6-.1h12.8z"></path>
                    <path fill="#FF6F3F" d="M49.2 47.7c-.6 0-1.1-.1-1.7-.2.1.5.2 1.1.2 1.7.3-.2.5-.4.8-.7.2-.3.4-.5.7-.8z"></path>
                    <path fill="#FFAC00" d="M48.5 31.5c.6.6 1.2 1.3 1.6 2 .5-.7 1-1.4 1.6-2l9-9c.4-.4.7-.7 1.1-1C61.2 15.6 56.1 11 50 11c-6.1 0-11.1 4.5-11.9 10.4.5.3.9.7 1.3 1.1l9.1 9z"></path>
                    <path fill="#FFC300" d="M51 47.7c-.3-.4-.7-.8-.9-1.3-.3.4-.6.9-.9 1.3h.8c.3.1.7 0 1 0z"></path>
                    <path fill="#FF3400" d="M38 35.8c0 .9.1 1.7.3 2.5 4.6 1 8.2 4.6 9.2 9.2.5.1 1.1.2 1.7.2.3-.4.7-.8.9-1.3-2.5-3.9-2.5-9 0-12.9-.5-.7-1-1.4-1.6-2l-9-9c-.4-.4-.9-.8-1.3-1.1-.1.5-.2 1-.2 1.6v12.8z"></path>
                    <path fill="#F0EA0D" d="M62 35.8c0 .9-.1 1.7-.3 2.5.8-.2 1.7-.3 2.5-.3H77c.6 0 1.2.1 1.8.2 3.5-4.7 3.2-11.4-1.1-15.7-4.3-4.3-11.1-4.6-15.8-1 .1.5.1 1 .1 1.5v12.8z"></path>
                    <path fill="#DAE411" d="M52.3 49c0-.5.1-1 .2-1.5-.5.1-1 .2-1.5.2.2.3.5.5.7.8.2.2.4.3.6.5z"></path>
                    <path fill="#EAA200" d="M51.7 31.5c-.6.6-1.2 1.3-1.6 2 2.5 3.9 2.5 9 0 12.9.3.4.6.9.9 1.3.5 0 1-.1 1.5-.2 1-4.6 4.6-8.2 9.2-9.2.2-.8.3-1.7.3-2.5V23c0-.5 0-1-.1-1.5-.4.3-.8.6-1.1 1l-9.1 9z"></path>
                    <path fill="#E63300" d="M50.1 33.5c-2.5 3.9-2.5 9 0 12.9 2.5-3.9 2.5-8.9 0-12.9z"></path>
                    <path fill="#83D567" d="M52.2 50c0 .4 0 .8.1 1.2.5-.4 1-.8 1.5-1.1-.5-.3-1-.7-1.5-1.1 0 .3-.1.7-.1 1z"></path>
                    <path fill="#A2DD50" d="M89 50c0-6-4.4-11-10.2-11.8-.3.5-.7.9-1.1 1.3l-9 9c-.6.6-1.3 1.2-2 1.6.7.5 1.4 1 2 1.6l9 9c.4.4.7.7 1 1.1C84.5 61 89 56.1 89 50z"></path>
                    <path fill="#8BC100" d="M64.2 38c-.9 0-1.7.1-2.5.3-1 4.6-4.6 8.2-9.2 9.2-.1.5-.2 1-.2 1.5.5.4 1 .8 1.5 1.1 3.9-2.5 9-2.5 12.9 0 .7-.5 1.4-1 2-1.6l9-9c.4-.4.8-.9 1.1-1.3-.6-.1-1.2-.2-1.8-.2H64.2z"></path>
                    <path fill="#8D8800" d="M61.7 38.3c-4.6 1-8.2 4.6-9.2 9.2 4.6-1 8.2-4.6 9.2-9.2z"></path>
                    <path fill="#44C899" d="M64.2 62c-.9 0-1.7-.1-2.5-.3.2.8.3 1.7.3 2.5V77c0 .6-.1 1.1-.1 1.7 4.7 3.7 11.5 3.4 15.9-1 4.3-4.3 4.7-11.1 1-15.9-.7.1-1.2.2-1.8.2H64.2z"></path>
                    <path fill="#4EBFBD" d="M51.2 52.3c.4 0 .9.1 1.3.2-.1-.4-.2-.9-.2-1.3-.2.2-.4.3-.6.5s-.3.4-.5.6z"></path>
                    <path fill="#00A33F" d="M68.7 51.7c-.6-.6-1.3-1.2-2-1.6-3.9 2.5-9 2.5-12.9 0-.5.3-1 .7-1.5 1.1 0 .4.1.9.2 1.3 4.6 1 8.2 4.6 9.2 9.2.8.2 1.7.3 2.5.3H77c.6 0 1.1-.1 1.7-.1-.3-.4-.6-.8-1-1.1l-9-9.1z"></path>
                    <path fill="#008D08" d="M53.8 50.1c3.9 2.5 9 2.5 12.9 0-4-2.5-9-2.5-12.9 0z"></path>
                    <path fill="#859ED5" d="M49 52.3c.4.5.8 1 1.1 1.5.3-.5.7-1 1.1-1.5-.4 0-.8-.1-1.2-.1-.3 0-.7.1-1 .1z"></path>
                    <path fill="#6EACDF" d="M51.7 68.7c-.6-.6-1.2-1.3-1.6-2-.5.7-1 1.4-1.6 2l-9 9c-.4.4-.9.8-1.3 1.1C39 84.6 44 89 50 89c6.1 0 11-4.5 11.9-10.3-.4-.3-.8-.6-1.1-1l-9.1-9z"></path>
                    <path fill="#1D7B97" d="M62 64.2c0-.9-.1-1.7-.3-2.5-4.6-1-8.2-4.6-9.2-9.2-.4-.1-.9-.2-1.3-.2-.4.5-.8 1-1.1 1.5 2.5 3.9 2.5 9 0 12.9.5.7 1 1.4 1.6 2l9 9c.4.4.7.7 1.1 1 .1-.6.1-1.1.1-1.7V64.2z"></path>
                    <path fill="#00683A" d="M61.7 61.7c-1-4.6-4.6-8.2-9.2-9.2 1 4.6 4.6 8.2 9.2 9.2z"></path>
                    <path fill="#BE85C1" d="M47.7 51c0 .5-.1 1-.2 1.5.5-.1 1-.2 1.5-.2-.2-.2-.3-.4-.5-.6-.3-.2-.5-.4-.8-.7z"></path>
                    <path fill="#AB86C4" d="M38 64.2c0-.9.1-1.7.3-2.5-.8.2-1.7.3-2.5.3H23c-.5 0-1 0-1.5-.1-3.7 4.7-3.3 11.5 1 15.8 4.3 4.3 11 4.6 15.7 1.1-.1-.6-.2-1.2-.2-1.8V64.2z"></path>
                    <path fill="#5D53A6" d="M48.5 68.7c.6-.6 1.2-1.3 1.6-2-2.5-3.9-2.5-9 0-12.9-.3-.5-.7-1-1.1-1.5-.5 0-1 .1-1.5.2-1 4.6-4.6 8.2-9.2 9.2-.2.8-.3 1.7-.3 2.5V77c0 .6.1 1.2.2 1.8.5-.3.9-.7 1.3-1.1l9-9z"></path>
                    <path fill="#243F76" d="M50.1 66.7c2.5-3.9 2.5-9 0-12.9-2.5 3.9-2.5 8.9 0 12.9z"></path>
                    <path fill="#F1648A" d="M47.7 49.2c-.4.3-.8.7-1.3.9.4.3.9.6 1.3.9 0-.3.1-.7.1-1 0-.3-.1-.6-.1-.8z"></path>
                    <path fill="#E275A8" d="M31.5 51.7c.6-.6 1.3-1.2 2-1.6-.7-.5-1.4-1-2-1.6l-9-9c-.4-.4-.8-.9-1.1-1.3C15.5 38.9 11 43.9 11 50c0 6.1 4.6 11.2 10.5 11.9.3-.4.6-.8 1-1.1l9-9.1z"></path>
                    <path fill="#E40017" d="M31.5 48.5c.6.6 1.3 1.2 2 1.6 3.9-2.5 9-2.5 12.9 0 .4-.3.9-.6 1.3-.9 0-.6-.1-1.1-.2-1.7-4.6-1-8.2-4.6-9.2-9.2-.8-.2-1.7-.3-2.5-.3H23c-.6 0-1.1.1-1.6.1.3.5.7.9 1.1 1.3l9 9.1z"></path>
                    <path fill="#E60000" d="M38.3 38.3c1 4.6 4.6 8.2 9.2 9.2-1-4.6-4.6-8.2-9.2-9.2z"></path>
                    <path fill="#9F3174" d="M35.8 62c.9 0 1.7-.1 2.5-.3 1-4.6 4.6-8.2 9.2-9.2.1-.5.2-1 .2-1.5-.4-.3-.8-.7-1.3-.9-3.9 2.5-9 2.5-12.9 0-.7.5-1.4 1-2 1.6l-9 9c-.4.4-.7.7-1 1.1.5.2 1 .2 1.5.2h12.8z"></path>
                    <path fill="#9F0017" d="M33.5 50.1c3.9 2.5 9 2.5 12.9 0-3.9-2.5-8.9-2.5-12.9 0z"></path>
                    <path fill="#561E5D" d="M38.3 61.7c4.6-1 8.2-4.6 9.2-9.2-4.6 1-8.2 4.6-9.2 9.2z"></path>
                </svg>
              </div>
            </DockIcon>
          </div>
          <div className="absolute -bottom-2 left-1/2 ml-1 -translate-x-1/2 w-1 h-1 bg-gray-400 rounded-full" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-black max-w-4xl mx-auto mb-16"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', fontWeight: 450, lineHeight: 0.92, letterSpacing: '-0.04em' }}
        >
          The exam
          <span className="inline-flex align-middle mx-2 w-[0.85em] h-[0.85em] bg-black rounded-lg items-center justify-center -translate-y-[0.05em]">
            <Shield className="w-[0.5em] h-[0.5em] text-white" />
          </span>
          arena<br />
          to keep
          <span className="inline-flex align-middle mx-2 w-[0.85em] h-[0.85em] bg-black rounded-lg items-center justify-center -translate-y-[0.05em]">
            <Zap className="w-[0.5em] h-[0.5em] text-white fill-white" />
          </span>
          <span className="font-black">integrity </span>and<br />simplicity
          <span className="inline-flex align-middle ml-3 mr-2 w-[0.85em] h-[0.85em] bg-black rounded-lg items-center justify-center -translate-y-[0.05em]">
            <Eye className="w-[0.5em] h-[0.5em] text-white" />
          </span>
          <span className="font-black">intact </span>.
        </motion.h1>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-5"
        >
          <Link href="/auth/register">
            <button className="hero-cta group flex items-center gap-3 px-8 py-4 rounded-xl shadow-lg">
              <svg className="w-5 h-5 text-[#330c26]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span className="font-mono font-bold text-[#330c26] tracking-[0.15em] text-sm uppercase">Get Started Free</span>
              <ArrowRight className="w-4 h-4 text-[#330c26] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
          </Link>
          <p className="font-mono text-xs text-gray-400 tracking-[0.2em] uppercase">
            Free for educators. AI proctoring included.
          </p>
        </motion.div>

        {/* Preview image */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 w-full max-w-6xl mx-auto py-[15%]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/preview-head.png" alt="EulerPro Dashboard Preview" className="w-full h-auto block scale-140" />
        </motion.div>
      </div>

      <style jsx>{`
        .hero-grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px);
          background-size: 24px 24px;
          animation: hero-grid-drift 20s linear infinite;
        }
        @keyframes hero-grid-drift {
          0%   { background-position: 0 0; }
          100% { background-position: 24px 24px; }
        }
        .hero-dock {
          background: rgba(144, 144, 144, 0.2);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(200, 200, 200, 0.35);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 20px 40px rgba(0,0,0,0.08);
        }
        .hero-cta {
          background: linear-gradient(90deg, #f51582 0%, #ff8a00 50%, #ffd600 100%);
          transition: transform 0.2s, opacity 0.2s;
        }
        .hero-cta:hover { opacity: 0.92; transform: scale(1.04); }
        .hero-cta:active { transform: scale(0.97); }
      `}</style>
    </section>
  );
}
