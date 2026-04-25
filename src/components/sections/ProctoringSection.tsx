'use client';

import { motion } from 'framer-motion';
import { Clock, Camera, Activity, CheckCircle, ScanFace } from 'lucide-react';

const PROCTORING_EVENTS = [
  { time: '14:02', event: 'Face not detected', severity: 'HIGH', color: '#ef4444', student: 'Aryan K.' },
  { time: '14:05', event: 'Multiple faces in frame', severity: 'HIGH', color: '#ef4444', student: 'Priya S.' },
  { time: '14:09', event: 'Tab switch detected', severity: 'MED', color: '#f59e0b', student: 'Aryan K.' },
  { time: '14:13', event: 'Mobile phone in frame', severity: 'HIGH', color: '#ef4444', student: 'Riya M.' },
  { time: '14:18', event: 'Unusual eye movement', severity: 'LOW', color: '#22c55e', student: 'Priya S.' },
  { time: '14:22', event: 'Copy-paste attempt blocked', severity: 'MED', color: '#f59e0b', student: 'Dev P.' },
];

export default function ProctoringSection() {
  return (
    <section id="proctoring" className="py-24 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <p className="text-xs font-semibold tracking-widest uppercase font-mono mb-4 text-white">AI Proctoring</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight font-mono">
            Catch<ScanFace className="inline w-16 h-16" /> every anomaly,<br />
            <span className="text-yellow-500">in real time</span>⚡️
          </h2>
          <p className="mt-4 text-lg max-w-xl text-white/40">
            YOLOv8-powered face detection, liveness checks, and behavioral analysis — all running silently in the background.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl overflow-hidden"
          style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 0 80px rgba(245,21,130,0.05)' }}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 8px #22c55e' }} />
              <span className="text-sm font-semibold text-white font-mono">Proctoring Dashboard</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>LIVE</span>
            </div>
            <div className="flex items-center gap-3">
              {[{ label: 'HIGH', count: 3, color: '#ef4444' }, { label: 'MED', count: 2, color: '#f59e0b' }, { label: 'LOW', count: 1, color: '#22c55e' }].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold" style={{ color: item.color }}>{item.count}</span>
                  <span className="text-xs text-white/30">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3">
            {/* Students panel */}
            <div className="col-span-1 p-4 hidden sm:block" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs text-white/30 font-mono mb-3 uppercase tracking-wider">Students</p>
              <div className="flex flex-col gap-1">
                {[
                  { name: 'Aryan K.', status: 'flagged', progress: 60 },
                  { name: 'Priya S.', status: 'flagged', progress: 72 },
                  { name: 'Riya M.', status: 'flagged', progress: 45 },
                  { name: 'Dev P.', status: 'active', progress: 80 },
                  { name: 'Harsh T.', status: 'active', progress: 55 },
                  { name: 'Neha R.', status: 'completed', progress: 100 },
                ].map(s => (
                  <motion.div
                    key={s.name}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors cursor-default"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.status === 'flagged' ? '#ef4444' : s.status === 'completed' ? '#22c55e' : '#f59e0b' }} />
                      <span className="text-xs text-white/70">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${s.progress}%`, background: s.status === 'flagged' ? '#ef4444' : '#f51582' }} />
                      </div>
                      <span className="text-[10px] text-white/30 font-mono w-6">{s.progress}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Flag timeline */}
            <div className="col-span-1 md:col-span-2 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Live Flag Feed</p>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-brand-pink" />
                  <span className="text-xs text-white/40 font-mono">6 events this session</span>
                </div>
              </div>

              <div className="relative h-64 overflow-hidden mask-fade-v">
                <motion.div
                  animate={{ y: [0, -432] }}
                  transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                  className="flex flex-col gap-2"
                >
                  {[...PROCTORING_EVENTS, ...PROCTORING_EVENTS].map((flag, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl px-4 py-3 bg-white/[0.01] hover:bg-white/[0.04] transition-colors cursor-default shrink-0 border border-white/[0.04]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 w-12 shrink-0">
                          <Clock className="w-3 h-3 text-white/20" />
                          <span className="text-[10px] text-white/30 font-mono">{flag.time}</span>
                        </div>
                        <div className="w-px h-4 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="flex flex-col">
                          <span className="text-xs text-white/70">{flag.event}</span>
                          <span className="text-[10px] text-white/30">{flag.student}</span>
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded cursor-default"
                        style={{ background: `${flag.color}18`, color: flag.color, border: `1px solid ${flag.color}35` }}
                      >
                        {flag.severity}
                      </span>
                    </div>
                  ))}
                </motion.div>
              </div>

              <div
                className="mt-4 rounded-xl overflow-hidden flex items-center justify-center gap-3 py-6 px-4"
                style={{ background: 'linear-gradient(135deg, rgba(51,12,38,0.4) 0%, rgba(17,17,17,0.8) 100%)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <Camera className="w-5 h-5 text-white/20" />
                <span className="text-xs text-white/25 font-mono">Live camera feeds — 6 students active</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map(j => (
                    <div key={j} className="w-8 h-6 rounded" style={{ background: `rgba(245,21,130,${0.05 + j * 0.03})`, border: '1px solid rgba(245,21,130,0.15)' }} />
                  ))}
                  <span className="text-[10px] text-white/25 font-mono ml-1">+3</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap gap-3 mt-8 justify-center"
        >
          {['Face Verification', 'Liveness Detection', 'Tab Switch Detection', 'Copy-Paste Blocking', 'Phone Detection', 'Eye Movement Analysis'].map(badge => (
            <motion.div
              key={badge}
              whileHover={{ scale: 1.06, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 cursor-default"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <CheckCircle className="w-3 h-3 shrink-0 text-brand-pink" />
              <span className="text-xs text-white/50">{badge}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
