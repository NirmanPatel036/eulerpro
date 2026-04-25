'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function RevealText({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function FinalCTASection() {
  return (
    <section 
      className="py-64 px-6 text-center relative overflow-hidden"
      style={{
        backgroundImage: 'url(/images/grainygrad.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <RevealText>
        <div className="relative inline-block px-12 py-10 mb-16 border border-white/30 mx-auto">
          <span className="absolute -top-[3px] -left-[3px] w-2.5 h-2.5 bg-white block" />
          <span className="absolute -top-[3px] -right-[3px] w-2.5 h-2.5 bg-white block" />
          <span className="absolute -bottom-[3px] -left-[3px] w-2.5 h-2.5 bg-white block" />
          <span className="absolute -bottom-[3px] -right-[3px] w-2.5 h-2.5 bg-white block" />
          <h2 className="text-4xl md:text-[4vw] font-mono font-semibold leading-none">
            Ship Your Exam <br /> Under 10 Minutes.
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Button asChild className="bg-brand-pink text-white h-14 px-12 rounded-full border-none font-mono font-black text-xs shadow-2xl shadow-brand-pink/40 hover:scale-105 hover:shadow-white/20 transition-all duration-300 group overflow-hidden relative">
            <Link href="/auth/register">
              <span className="relative z-10 group-hover:text-black transition-colors duration-300">Get Started Now</span>
              <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="border-white/20 bg-white/5 h-14 px-12 rounded-full font-mono font-black text-xs hover:scale-105 transition-all duration-300 group overflow-hidden relative hover:border-white">
            <a href="mailto:nirman0511@gmail.com">
              <span className="relative z-10 group-hover:text-black transition-colors duration-300">Send us a Message</span>
              <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            </a>
          </Button>
        </div>
      </RevealText>
    </section>
  );
}
