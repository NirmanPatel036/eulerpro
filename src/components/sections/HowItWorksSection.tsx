'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, PenLine, Settings, Mail, MonitorDot } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Step { icon: any; title: string; description: string; }

const instructorSteps: Step[] = [
  { icon: LogIn, title: 'Log In & Dashboard', description: 'Access your instructor dashboard with real-time analytics and exam management.' },
  { icon: PenLine, title: 'Build Your Exam', description: 'Use the live question editor to add 6 types of questions with instant preview.' },
  { icon: Settings, title: 'Configure Settings', description: 'Set duration, passing score, difficulty multipliers, and proctoring rules.' },
  { icon: Mail, title: 'Invite Students', description: 'Upload a CSV or send individual email invites — automated reminders included.' },
  { icon: MonitorDot, title: 'Monitor Live', description: 'Watch real-time proctoring flags, student progress, and session health.' },
];

const studentSteps: Step[] = [
  { icon: Mail, title: 'Receive Invite', description: 'Get an email invite with a secure one-click link to your scheduled exam.' },
  { icon: MonitorDot, title: 'System Check', description: 'Verify camera, microphone, and browser compatibility before the exam starts.' },
  { icon: LogIn, title: 'Verify Identity', description: 'Complete photo ID verification and give AI proctoring consent.' },
  { icon: PenLine, title: 'Take the Exam', description: 'Answer questions in fullscreen mode. Answers auto-save every 30 seconds.' },
  { icon: Settings, title: 'View Results', description: 'Instantly see your score, per-question breakdown, and certificate if you passed.' },
];

function StepCard({ step, index, total }: { step: Step; index: number; total: number }) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center text-center"
    >
      {index < total - 1 && (
        <div
          className="hidden lg:block absolute top-[2.1rem] left-[calc(50%+30px)] w-full h-[2px] opacity-40"
          style={{ background: 'linear-gradient(90deg, #f51582 0%, rgba(245,21,130,0.1) 100%)' }}
        />
      )}
      <div className="relative z-10 mb-5">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(245,21,130,0.15) 0%, rgba(66,16,53,0.3) 100%)', border: '1px solid rgba(245,21,130,0.25)' }}
        >
          <Icon className="w-6 h-6 text-brand-pink" />
        </div>
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-bold font-mono flex items-center justify-center text-white bg-pink-500">
          {index + 1}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
      <p className="text-xs leading-relaxed max-w-[160px] text-white/40">{step.description}</p>
    </motion.div>
  );
}

export default function HowItWorksSection() {
  const [tab, setTab] = useState('instructors');

  return (
    <section id="how-it-works" className="py-32 px-6 relative overflow-hidden bg-black">
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,1) 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}
      />
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold tracking-[0.3em] uppercase font-mono mb-6 text-pink-500">WORKFLOW</p>
          <h3 className="text-4xl md:text-6xl font-mono font-semibold text-white">How It Works</h3>
        </motion.div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="flex justify-center mb-16">
            <div className="rounded-full p-[1px]" style={{ border: '1px solid #ffd600' }}>
              <TabsList className="rounded-full p-1 gap-1 bg-transparent border-none shadow-none h-auto">
                {['instructors', 'students'].map(v => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="rounded-full px-8 py-3 text-xs font-mono font-black tracking-widest transition-all data-[state=active]:text-black"
                    style={tab === v ? { background: 'var(--brand-yellow)', color: '#000' } : { color: 'rgba(255,255,255,0.5)' }}
                  >
                    {v === 'instructors' ? 'FOR INSTRUCTORS' : 'FOR STUDENTS'}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {[{ value: 'instructors', steps: instructorSteps }, { value: 'students', steps: studentSteps }].map(({ value, steps }) => (
            <TabsContent key={value} value={value}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={value}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8"
                >
                  {steps.map((step, i) => (
                    <StepCard key={step.title} step={step} index={i} total={steps.length} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          ))}
        </Tabs>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center text-[10px] font-mono tracking-widest mt-20 text-white/20 uppercase"
        >
          Instructors onboard in under 5 minutes · Students need only a browser
        </motion.p>
      </div>
    </section>
  );
}
