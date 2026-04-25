'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const statsData = [
  { value: 50000, suffix: '+', label: 'Users Supported', description: 'Tested and proven at scale' },
  { value: 95, suffix: '%', label: 'Proctoring Accuracy', description: 'YOLOv8-powered face detection' },
  { prefix: '<', value: 2, suffix: 's', label: 'Exam Launch Time', description: 'From click to first question' },
  { value: 12, suffix: 'wks', label: 'To Production', description: 'Full MVP delivery timeline' },
];

function CountUp({ target, prefix = '', suffix = '', inView }: {
  target: number; prefix?: string; suffix?: string; inView: boolean;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else { setCount(Math.floor(current)); }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span className="tabular-nums">{prefix}{count}{suffix}</span>;
}

export default function StatsSection() {
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-80px' });

  return (
    <section ref={statsRef} className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-px"
          style={{ background: 'rgba(220, 218, 198, 0.61)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', overflow: 'hidden' }}
        >
          {statsData.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group flex flex-col items-center justify-center text-center px-6 py-10 transition-all duration-300 hover:bg-white/[0.02]"
              style={{
                backgroundImage: 'url(/images/grainygrad-2.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="text-4xl md:text-5xl font-bold font-mono mb-3 transition-colors group-hover:text-brand-pink" style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.04em' }}>
                <CountUp target={stat.value} prefix={stat.prefix} suffix={stat.suffix} inView={statsInView} />
              </div>
              <p className="text-sm font-semibold text-white/70 mb-1">{stat.label}</p>
              <p className="text-xs text-white/30">{stat.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
