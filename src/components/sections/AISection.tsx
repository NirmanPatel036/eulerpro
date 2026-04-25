'use client';

import { motion } from 'framer-motion';
import { Brain, TrendingUp, FileText, Cpu } from 'lucide-react';

export default function AISection() {
  return (
    <section className="py-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[3rem] overflow-hidden min-h-125 p-8 md:p-10 lg:p-12 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 40%, #f5f5f5 100%)' }}
        >
          <div className="relative z-10 grid md:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
            {/* Left */}
            <div className="text-[#1a1a2e]">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 mb-6"
              >
                <span className="text-[12px] font-mono font-black tracking-[0.25em] text-emerald-700 uppercase">Our Approach to AI</span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl md:text-5xl lg:text-6xl font-mono font-semibold leading-[0.95] tracking-tight mb-8"
              >
                AI Where It<br />Counts
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="flex flex-wrap gap-3 mb-10"
              >
                {['AI Question Generation', 'Smart Rubrics', 'Adaptive Difficulty', 'Format Conversion'].map(chip => (
                  <motion.span
                    key={chip}
                    whileHover={{ scale: 1.05, y: -2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="px-5 py-2 rounded-full border border-black/10 bg-white font-mono text-xs font-bold text-black/50 shadow-sm cursor-default"
                  >
                    {chip}
                  </motion.span>
                ))}
              </motion.div>

              <motion.ul
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="space-y-5"
              >
                {[
                  'Generate exam questions from any source material in seconds',
                  'Respect teacher agency, while saving hours of prep time',
                  'Prioritize quality and pedagogical alignment',
                ].map((li, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.55 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0" />
                    <p className="text-base font-mono font-medium text-black/50 leading-relaxed">{li}</p>
                  </motion.li>
                ))}
              </motion.ul>
            </div>

            {/* Right */}
            <div className="hidden md:grid grid-cols-2 gap-4 lg:gap-5 relative">
              <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 border-l-2 border-dashed border-black/8 pointer-events-none z-0" />
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 border-t-2 border-dashed border-black/8 pointer-events-none z-0" />
              {[
                { icon: <Brain className="w-6 h-6 text-pink-500" />, label: 'Instant Prompts', desc: 'Paste any syllabus, notes, or PDF — get exam-ready questions in seconds.' },
                { icon: <TrendingUp className="w-6 h-6 text-emerald-500" />, label: "Bloom's Alignment", desc: 'Auto-tags every question by cognitive level so your exams are balanced.' },
                { icon: <FileText className="w-6 h-6 text-amber-500" />, label: 'Marking Blueprints', desc: 'AI drafts detailed rubrics with point breakdowns you can edit and reuse.' },
                { icon: <Cpu className="w-6 h-6 text-sky-500" />, label: 'One-Click Export', desc: 'Convert between MCQ, short-answer, essay, and coding formats instantly.' },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
                  whileHover={{ y: -6, scale: 1.03 }}
                  className="bg-white rounded-2xl py-6 px-5 shadow-lg border border-black/4 cursor-default flex flex-col gap-4 h-50 relative z-10"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">{card.icon}</div>
                  <span className="font-mono font-bold text-sm text-[#1a1a2e] tracking-tight">{card.label}</span>
                  <p className="text-xs font-mono text-black/40 leading-relaxed">{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
