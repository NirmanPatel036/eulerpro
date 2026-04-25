'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const CARDS = [
  {
    img: '/images/cardbg01.png',
    title: 'Scales Without Limits',
    desc: 'Cloud-native architecture handles 500+ concurrent test-takers with zero lag. Auto-scaling infrastructure means you never worry about capacity again.',
  },
  {
    img: '/images/cardbg02.png',
    title: 'Render As Code',
    desc: 'Set the question as plain text or render it as a code snippet - perfect for computer science, math, or any technical field. Clean code block.',
  },
  {
    img: '/images/cardbg03.png',
    title: 'Analytics That Act',
    desc: 'Per-student performance breakdowns, difficulty heat maps, and cohort trend reports — exported as PDF or synced to your LMS in one click.',
  },
];

export default function CardShowcaseSection() {
  return (
    <section className="py-32 px-6 bg-black relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-mono font-semibold text-white leading-tight">
            Built for Modern Exam Teams
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-center text-white/40 font-mono text-sm mb-20 max-w-lg mx-auto"
        >
          EulerPro adapts to institutions of every size — from a single classroom quiz to university-wide finals.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="group rounded-2xl overflow-hidden border border-white/8 bg-[#0e0e0e] hover:border-white/[0.14] transition-colors cursor-default"
            >
              <div className="relative w-full aspect-4/3 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.img}
                  alt={card.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-[#0e0e0e] to-transparent" />
              </div>
              <div className="px-7 pb-8 pt-2">
                <h3 className="text-xl font-mono font-black text-white mb-3 tracking-tight">{card.title}</h3>
                <p className="text-sm font-mono text-white/40 leading-relaxed">{card.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex justify-center mt-16"
        >
          <Link href="/auth/register">
            <button className="px-10 py-4 rounded-xl border border-white/10 font-mono font-black text-xs tracking-[0.2em] text-white/70 hover:text-white hover:border-brand-pink hover:bg-brand-pink/10 transition-all uppercase">
              Get Started Free
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
