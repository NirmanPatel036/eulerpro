'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Clock, Shield, Mail } from 'lucide-react';

const BAD_PASSWORDS = [
  'P@ssw0rd!2024',
  'ExamUser#87!',
  'Stud3nt$ecure',
  'Qu1zTak3r@99',
  'L0g1nHard!123',
  'S3cur3Ex@m!!',
];

const SAMPLE_CODES = ['F3K9PQ', 'M7XBNT', 'R2HJCW', 'A9YLVZ', 'T5DKGQ'];

function AnimatedInviteCode({ code }: { code: string }) {
  return (
    <div className="flex gap-2 justify-center">
      {code.split('').map((ch, i) => (
        <motion.div
          key={`${i}-${ch}`}
          initial={{ opacity: 0, y: -20, rotateX: -90 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="w-12 h-14 md:w-14 md:h-16 rounded-xl flex items-center justify-center font-mono font-black text-2xl md:text-3xl text-[#330c26] shadow-lg border-b-4"
          style={{ background: 'white', borderBottomColor: '#67e8f9', perspective: '400px' }}
        >
          {ch}
        </motion.div>
      ))}
    </div>
  );
}

export default function InviteCodeSection() {
  const [codeIdx, setCodeIdx] = useState(0);
  const [passIdx, setPassIdx] = useState(0);
  const [strikeVisible, setStrikeVisible] = useState(true);

  useEffect(() => {
    const codeTimer = setInterval(() => {
      setCodeIdx(i => (i + 1) % SAMPLE_CODES.length);
    }, 2200);
    return () => clearInterval(codeTimer);
  }, []);

  useEffect(() => {
    const passTimer = setInterval(() => {
      setStrikeVisible(false);
      setTimeout(() => {
        setPassIdx(i => (i + 1) % BAD_PASSWORDS.length);
        setStrikeVisible(true);
      }, 300);
    }, 1800);
    return () => clearInterval(passTimer);
  }, []);

  const features = [
    { icon: <Key className="w-4 h-4" />, label: '6-char code', desc: 'One short alphanumeric code — no capitals policy, no reset emails.' },
    { icon: <Clock className="w-4 h-4" />, label: 'Expires after use', desc: 'Each code is single-session and auto-expires once the exam ends.' },
    { icon: <Shield className="w-4 h-4" />, label: 'Zero phishing surface', desc: 'No passwords to steal, no accounts to brute-force, ever.' },
  ];

  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[3rem] overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #a3e4ff 0%, #67e8f9 50%, #a5f3fc 100%)' }}
        >
          <div className="absolute -top-20 -right-20 w-[480px] h-[480px] bg-white/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-16 w-[360px] h-[360px] bg-cyan-300/30 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 grid md:grid-cols-2 gap-0 items-stretch">
            {/* Left: copy */}
            <div className="p-10 md:p-12 lg:p-14 flex flex-col justify-between">
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="font-mono font-black text-[10px] tracking-[0.3em] mb-8 text-[#330c26]/60 uppercase underline decoration-2 underline-offset-8"
                >
                  INTEGRITY FIRST
                </motion.p>

                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-mono font-semibold leading-[0.92] tracking-tighter mb-6 text-[#330c26]"
                >
                  No More<br />Complex<br />Passwords.
                </motion.h3>

                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  className="mb-8 flex items-center gap-3"
                >
                  <span className="font-mono text-[10px] tracking-widest text-[#330c26]/40 uppercase font-bold shrink-0">Instead of</span>
                  <motion.span
                    animate={{ opacity: strikeVisible ? 1 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="font-mono font-black text-sm text-[#330c26]/50 line-through decoration-[#f51582] decoration-2"
                  >
                    {BAD_PASSWORDS[passIdx]}
                  </motion.span>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="font-mono text-sm leading-relaxed text-[#330c26]/60 mb-10 max-w-sm"
                >
                  Students join with a <strong className="text-[#330c26]">6-character alphanumeric invite code</strong> — no brute bypass, no password reset emails, no friction. Just paste the code and go.
                </motion.p>

                <div className="space-y-4">
                  {features.map((f, i) => (
                    <motion.div
                      key={f.label}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#330c26]/10 flex items-center justify-center text-[#330c26] shrink-0 mt-0.5">
                        {f.icon}
                      </div>
                      <div>
                        <p className="font-mono font-black text-xs text-[#330c26] mb-0.5">{f.label}</p>
                        <p className="font-mono text-xs text-[#330c26]/50 leading-relaxed">{f.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: demo card */}
            <div className="flex items-center justify-center p-10 md:p-12 lg:p-14 border-t md:border-t-0 md:border-l border-[#330c26]/10">
              <div className="w-full max-w-sm space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-white rounded-3xl p-6 shadow-2xl border border-[#330c26]/05"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#330c26] flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/symbol.svg" alt="EulerPro" className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-mono font-black text-xs text-[#330c26] leading-none">EulerPro</p>
                      <p className="font-mono text-[10px] text-gray-400 mt-0.5">Exam Invite</p>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="ml-auto px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-mono font-black text-[9px] tracking-widest"
                    >
                      LIVE
                    </motion.div>
                  </div>

                  <p className="font-mono text-xs text-gray-500 mb-2">Mathematics — Final Exam</p>
                  <p className="font-mono font-black text-sm text-[#330c26] mb-6">Scheduled: Mar 12, 2026 · 10:00 AM</p>

                  <p className="font-mono text-[10px] text-gray-400 tracking-widest mb-3 uppercase">Your access code</p>

                  <AnimatedInviteCode key={codeIdx} code={SAMPLE_CODES[codeIdx]} />

                  <p className="font-mono text-[9px] text-center text-gray-400 mt-3 tracking-wide">
                    Expires 15 min after exam starts • Single use
                  </p>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full mt-6 h-12 rounded-2xl font-mono font-black text-sm text-white shadow-lg"
                    style={{ background: 'linear-gradient(90deg,#f51582,#ff6b6b)' }}
                  >
                    Enter Exam →
                  </motion.button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.45 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-[#330c26]/10 text-center">
                    <p className="font-mono font-black text-2xl text-[#330c26] mb-1">6</p>
                    <p className="font-mono text-[9px] tracking-widest text-[#330c26]/50 uppercase">Characters</p>
                    <p className="font-mono text-[9px] text-[#330c26]/40 mt-1">That's all it takes</p>
                  </div>
                  <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-[#330c26]/10 text-center">
                    <p className="font-mono font-black text-2xl text-[#330c26] mb-1">0</p>
                    <p className="font-mono text-[9px] tracking-widest text-[#330c26]/50 uppercase">Hassle</p>
                    <p className="font-mono text-[9px] text-[#330c26]/40 mt-1">No cliche approach</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
