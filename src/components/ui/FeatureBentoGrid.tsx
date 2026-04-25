'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   Card 1 — Secure Access  (matrix rain + shield)
───────────────────────────────────────────────────────────── */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Use monospace advance width as BOTH column step and row step for zero gaps
    const FONT_SIZE = 20;
    const FONT = `bold ${FONT_SIZE}px 'Courier New', monospace`;
    ctx.font = FONT;
    // In Courier New every glyph has the same advance width
    const CHAR_W = ctx.measureText('M').width;
    const CHAR_H = FONT_SIZE; // line height = font size for tight packing

    let raf: number;
    let last = 0;
    const fps = 12;
    let cells: string[] = [];

    const buildCells = () => {
      const cols = Math.ceil(canvas.width / CHAR_W) + 2;
      const rows = Math.ceil(canvas.height / CHAR_H) + 2;
      cells = Array.from({ length: cols * rows }, () =>
        CHARS[Math.floor(Math.random() * CHARS.length)]
      );
    };
    buildCells();

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 1000 / fps) return;
      last = t;

      const cols = Math.ceil(canvas.width / CHAR_W) + 2;
      const rows = Math.ceil(canvas.height / CHAR_H) + 2;

      if (cells.length !== cols * rows) buildCells();

      // randomise ~8% of cells each frame
      const count = Math.floor(cols * rows * 0.08);
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * cols * rows);
        cells[idx] = CHARS[Math.floor(Math.random() * CHARS.length)];
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const cx = canvas.width / 2;
      const cy = canvas.height * 0.38;
      const shieldR = Math.min(canvas.width, canvas.height) * 0.38;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * CHAR_W;
          const y = r * CHAR_H;
          const dist = Math.hypot(x + CHAR_W / 2 - cx, y + CHAR_H / 2 - cy);
          if (dist < shieldR * 0.58) continue;
          const fade = Math.min(1, (dist - shieldR * 0.58) / (shieldR * 0.55));
          ctx.globalAlpha = 0.30 * fade;
          ctx.fillStyle = '#6b7280';
          ctx.fillText(cells[r * cols + c], x, y);
        }
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function SecureAccessCard() {
  return (
    <div className="bg-white flex flex-col h-full min-h-[280px] shadow-sm overflow-hidden">
      {/* Shield area — canvas is ONLY here, not behind text */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center py-8">
        <MatrixBackground />

        {/* Shield */}
        <div className="relative z-10">
          <svg viewBox="0 0 100 115" style={{ width: 148, height: 162 }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="shieldGrad" x1="30%" y1="0%" x2="70%" y2="100%">
                <stop offset="0%" stopColor="#f9fafb" />
                <stop offset="40%" stopColor="#e5e7eb" />
                <stop offset="100%" stopColor="#d1d5db" />
              </linearGradient>
              {/* Shield-shaped shadow: radialGradient clipped by the path itself */}
              <radialGradient id="shieldShadow" cx="50%" cy="52%" r="52%" fx="50%" fy="52%">
                <stop offset="0%" stopColor="#111827" stopOpacity="0.9" />
                <stop offset="45%" stopColor="#374151" stopOpacity="0.5" />
                <stop offset="75%" stopColor="#6b7280" stopOpacity="0.15" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              {/* Clip path = exact shield shape */}
              <clipPath id="shieldClip">
                <path d="M50 4 L6 22 L6 55 C6 80 26 101 50 110 C74 101 94 80 94 55 L94 22 Z" />
              </clipPath>
            </defs>
            {/* Base shield fill */}
            <path
              d="M50 4 L6 22 L6 55 C6 80 26 101 50 110 C74 101 94 80 94 55 L94 22 Z"
              fill="url(#shieldGrad)"
              stroke="#d1d5db"
              strokeWidth="1"
            />
            {/* Dark overlay — rendered as a full rect but clipped to shield shape */}
            <rect
              x="0" y="0" width="100" height="115"
              fill="url(#shieldShadow)"
              clipPath="url(#shieldClip)"
            />
          </svg>
        </div>
      </div>

      {/* Text section — pure white bg, no canvas */}
      <div className="px-7 pb-7 pt-1 bg-white">
        <h3 className="text-base font-bold text-gray-900 mb-1.5">Secure access</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your exams and student data stay encrypted end-to-end, ensuring complete integrity and privacy throughout every session.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Card 2 — One-flow Process  (AI task list animation)
───────────────────────────────────────────────────────────── */
const TASKS = [
  'Generating question bank…',
  'Applying difficulty weights…',
  'Configuring proctoring rules…',
  'Randomising question order…',
  'Scheduling student invites…',
  'Verifying exam settings…',
];

const ITEM_H = 36; // px per task row — matches padding

function OneFlowCard() {
  // doubled list for seamless infinite scroll
  const allTasks = [...TASKS, ...TASKS];
  const scrollDist = ITEM_H * TASKS.length;

  return (
    <div className="relative bg-white overflow-hidden p-7 flex flex-col justify-between h-full min-h-[280px] shadow-sm">
      {/* Floating task card */}
      <div className="rounded-xl border border-gray-100 shadow-md bg-white px-4 py-3 mb-4 flex-1 overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full shrink-0"
          />
          <span className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">Building exam…</span>
        </div>

        {/* Seamless linear scroll — same technique as flag timeline */}
        <div className="relative overflow-hidden" style={{ height: ITEM_H * 4, maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' }}>
          <motion.div
            animate={{ y: [0, -scrollDist] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            className="flex flex-col"
          >
            {allTasks.map((task, i) => (
              <div
                key={i}
                className="flex items-center gap-2 shrink-0"
                style={{ height: ITEM_H }}
              >
                <span className="text-[10px] text-gray-300 w-5 shrink-0 font-mono">{(i % TASKS.length) + 1}.</span>
                <span className="text-[11px] text-gray-600 font-medium truncate">{task}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-base font-bold text-gray-900 mb-1.5">One-flow process</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Build, configure, invite, and launch — the entire exam workflow in a single, guided flow with no switching between tools.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Card 3 — Pick Your Question Type  (node graph)
───────────────────────────────────────────────────────────── */
const Q_TYPES = [
  { label: 'MCQ', icon: '⊙', color: '#e0f2fe' },
  { label: 'True/False', icon: '⊘', color: '#fef9c3' },
  { label: 'Short Ans', icon: '≡', color: '#f0fdf4' },
  { label: 'Coding', icon: '</>', color: '#fdf2f8' },
  { label: 'Essay', icon: '✎', color: '#fef3c7' },
  { label: 'Fill Blank', icon: '▭', color: '#ede9fe' },
];

// Cardinal satellite nodes — cycling through Q_TYPES
const GRAPH_SZ = 200;
const NODE_SZ = 58;
const NODE_HALF = NODE_SZ / 2;          // 29
const GC = GRAPH_SZ / 2;               // 100  — graph center
// Node centers sit exactly at the dashed-line endpoints (container edges).
const SATELLITE_POS = [
  { cx: GC - NODE_HALF, cy: -NODE_HALF },  // top
  { cx: GRAPH_SZ - NODE_HALF, cy: GC - NODE_HALF },  // right
  { cx: GC - NODE_HALF, cy: GRAPH_SZ - NODE_HALF },  // bottom
  { cx: -NODE_HALF, cy: GC - NODE_HALF },  // left
];

function PickToolCard() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setOffset(o => (o + 1) % Q_TYPES.length), 1200);
    return () => clearInterval(id);
  }, []);

  const nodes = SATELLITE_POS.map((pos, i) => ({
    ...pos,
    type: Q_TYPES[(i + offset) % Q_TYPES.length],
  }));

  return (
    <div className="relative bg-white p-7 flex flex-col justify-between h-full min-h-[280px] shadow-sm">
      {/* Node graph */}
      <div className="flex items-center justify-center mb-3 flex-1 overflow-visible">
        <div className="relative" style={{ width: GRAPH_SZ, height: GRAPH_SZ }}>

          {/* Horizontal dashed line — full width, at vertical center */}
          <div style={{
            position: 'absolute', top: GC, left: 0,
            width: '100%', height: 0,
            borderTop: '1.5px dashed #d1d5db',
            transform: 'translateY(-0.75px)',
            zIndex: 0,
          }} />

          {/* Vertical dashed line — full height, at horizontal center */}
          <div style={{
            position: 'absolute', left: GC, top: 0,
            height: '100%', width: 0,
            borderLeft: '1.5px dashed #d1d5db',
            transform: 'translateX(-0.75px)',
            zIndex: 0,
          }} />

          {/* Center node — symbol.svg + maroon glow */}
          <div style={{
            position: 'absolute',
            left: GC, top: GC,
            transform: 'translate(-50%, -50%)',
            width: 64, height: 64,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #4a0f2e 0%, #2d0a1c 100%)',
            boxShadow: '0 0 0 5px rgba(83,12,38,0.15), 0 0 28px 10px rgba(83,12,38,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/symbol.svg" alt="EulerPro" style={{ width: 34, height: 34 }} />
          </div>

          {/* Four satellite nodes — center at (cx,cy), fully inside container */}
          {nodes.map((node, i) => (
            <motion.div
              key={`${i}-${node.type.label}`}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: node.cx,
                top: node.cy,
                transform: 'translate(-50%, -50%)',
                width: NODE_SZ, height: NODE_SZ,
                borderRadius: '50%',
                background: node.type.color,
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 2,
                zIndex: 2,
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1, fontWeight: 700, color: '#374151' }}>{node.type.icon}</span>
              <span style={{ fontSize: 9, color: '#6b7280', lineHeight: 1, textAlign: 'center', maxWidth: 46 }}>{node.type.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900 mb-1.5">Pick your question type</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Six question formats — MCQ, coding, essay, fill-in-the-blank, short answer, and true/false — all in one live editor.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Card 4 — Build with Simple Prompt  (spotlight reveal)
───────────────────────────────────────────────────────────── */
function PromptCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleSend = () => {
    if (!value.trim()) return;
    setSent(true);
    setTimeout(() => { setSent(false); setValue(''); }, 1200);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setCursor(null)}
      className="relative bg-white overflow-hidden p-7 flex flex-col justify-between h-full min-h-[280px] shadow-sm cursor-default"
    >
      {/* Background reveal image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url('/images/ai-bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          WebkitMaskImage: cursor
            ? `radial-gradient(circle 180px at ${cursor.x}px ${cursor.y}px, black 0%, transparent 100%)`
            : 'none',
          maskImage: cursor
            ? `radial-gradient(circle 180px at ${cursor.x}px ${cursor.y}px, black 0%, transparent 100%)`
            : 'none',
          opacity: cursor ? 1 : 0,
          transition: 'opacity 0.25s',
        }}
      />

      {/* Input UI */}
      <div className="relative mt-8 z-10 flex-1 flex flex-col justify-between">
        {/* ChatGPT-style input card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden mb-4">
          {/* Text area */}
          <div className="px-4 pt-4 pb-2">
            <input
              className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
              placeholder="What can i do for you?"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            {/* Left: model selector + attachment */}
            <div className="flex items-center gap-2">
              {/* Gemini logo + model dropdown */}
              <button className="flex items-center gap-1.5 text-[12px] text-gray-700 font-medium hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors">
                <div className="w-4 h-4 overflow-hidden">
                  <img src="/gemini-icon.png" alt="Gemini" />
                </div>
                <span>Gemini 2.5 Flash</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-gray-400">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Divider */}
              <div className="w-px h-4 bg-gray-200" />

              {/* Attachment */}
              <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.2-9.19A4 4 0 0118.8 8.1l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
            </div>

            {/* Right: send button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleSend}
              className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors shadow-sm"
            >
              {sent ? (
                <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4">
                  <polyline points="20 6 9 17 4 12" />
                </motion.svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              )}
            </motion.button>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold text-gray-900 mb-1.5">Build with a simple prompt</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Describe your exam topic and let AI generate a full question bank — MCQ, coding, essay — in seconds. <br />Hover to reveal.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Card 5 — Instant Results  (score ring + waveform)
───────────────────────────────────────────────────────────── */
function ResultsCard() {
  const [hovered, setHovered] = useState(false);
  const [score] = useState(87);

  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div
      className="relative bg-white overflow-hidden p-7 flex flex-col justify-between h-full min-h-[280px] shadow-sm cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex-1 flex flex-col items-center justify-center mb-4">
        {/* Score ring */}
        <div className="relative w-24 h-24 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="38" fill="none" stroke="#f3f4f6" strokeWidth="6" />
            <motion.circle
              cx="44" cy="44" r="38"
              fill="none"
              stroke="#111"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: hovered ? circumference : dashOffset }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-gray-900">{score}%</span>
            <span className="text-[9px] text-gray-400 font-mono tracking-wider">SCORE</span>
          </div>
        </div>

        {/* Waveform equalizer bars */}
        <div className="flex items-end gap-[3px] h-8">
          {Array.from({ length: 18 }).map((_, i) => {
            const heights = [4, 8, 14, 20, 26, 20, 28, 16, 22, 28, 14, 20, 26, 18, 10, 22, 16, 8];
            return (
              <motion.div
                key={i}
                className="w-[3px] rounded-full bg-gray-300"
                animate={!hovered ? {
                  height: [`${heights[i]}px`, `${heights[(i + 3) % 18]}px`, `${heights[i]}px`],
                } : { height: `${heights[i]}px` }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: i * 0.05,
                  ease: 'easeInOut',
                }}
                style={{ height: `${heights[i]}px` }}
              />
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 font-mono mt-2 tracking-wider">
          {hovered ? 'CALCULATING' : 'RESULTS READY'}
        </p>
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900 mb-1.5">Instant results</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Students see their score, per-question breakdown, and a downloadable certificate the moment they submit.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Dotted separator  (horizontal or vertical)
───────────────────────────────────────────────────────────── */
function DotSep({ vertical = false }: { vertical?: boolean }) {
  return (
    <div
      className={vertical ? 'hidden md:block self-stretch w-px mx-0' : 'w-full h-px my-0'}
      style={{
        background: vertical
          ? 'repeating-linear-gradient(to bottom, #d1d5db 0px, #d1d5db 4px, transparent 4px, transparent 10px)'
          : 'repeating-linear-gradient(to right, #d1d5db 0px, #d1d5db 4px, transparent 4px, transparent 10px)',
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   Main export
───────────────────────────────────────────────────────────── */
export default function FeatureBentoGrid() {
  return (
    <section className="py-32 px-6 bg-[#f4f4f5]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <p className="text-xs font-semibold tracking-[0.3em] uppercase font-mono mb-4 text-gray-400">
            WHY EULERPRO?
          </p>
          <h2 className="text-4xl md:text-6xl font-mono font-semibold text-gray-900 leading-tight">
            an exam platform,
            <span className="text-gray-400">reimagined</span>.
          </h2>
        </motion.div>

        {/* Grid */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
          style={{ background: '#f4f4f5' }}
        >
          {/* Row 1 — three equal cards, all stretch to same height */}
          <div className="grid grid-cols-1 md:grid-cols-3 md:items-stretch">
            <div className="border-b md:border-b-0 md:border-r border-dashed border-gray-300 flex">
              <div className="flex-1"><SecureAccessCard /></div>
            </div>
            <div className="border-b md:border-b-0 md:border-r border-dashed border-gray-300 flex">
              <div className="flex-1"><OneFlowCard /></div>
            </div>
            <div className="flex">
              <div className="flex-1"><PickToolCard /></div>
            </div>
          </div>

          <DotSep />

          {/* Row 2 — 60 / 40, both stretch to same height */}
          <div className="grid grid-cols-1 md:grid-cols-5 md:items-stretch">
            <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-dashed border-gray-300 flex">
              <div className="flex-1"><PromptCard /></div>
            </div>
            <div className="md:col-span-2 flex">
              <div className="flex-1"><ResultsCard /></div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
