'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import FeatureBentoGrid from '@/components/ui/FeatureBentoGrid';
import HeroSection from '@/components/sections/HeroSection';
import TechStackSection from '@/components/sections/TechStackSection';
import StatsSection from '@/components/sections/StatsSection';
import AISection from '@/components/sections/AISection';
import ProctoringSection from '@/components/sections/ProctoringSection';
import HowItWorksSection from '@/components/sections/HowItWorksSection';
import InviteCodeSection from '@/components/sections/InviteCodeSection';
import CardShowcaseSection from '@/components/sections/CardShowcaseSection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import FinalCTASection from '@/components/sections/FinalCTASection';
import FooterSection from '@/components/sections/FooterSection';

import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function getAuthUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (!error && profile) {
            setUser({ ...authUser, profile });
          } else {
            // If user exists but profile doesn't, we still have authUser
            setUser(authUser);
          }
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      } finally {
        setLoading(false);
      }
    }

    getAuthUser();

    const ids = ['hero', 'proctoring', 'how-it-works', 'features', 'testimonials'];
    const observers: IntersectionObserver[] = [];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const navCls = (id: string) =>
    `transition-colors cursor-pointer font-mono text-[10px] tracking-[0.2em] font-bold ${activeSection === id
      ? 'text-pink-500 font-black'
      : 'text-black/40 hover:text-black'
    }`;

  const initials = user?.profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-[#330c26] text-white grain">

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 px-6 bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/logo-cropped.svg" alt="EulerPro" width={140} height={36} className="h-9 w-auto" priority />
          </div>
          <nav className="hidden lg:flex items-center gap-10">
            <button onClick={() => scrollTo('features')} className={navCls('features')}>FEATURES</button>
            <button onClick={() => scrollTo('how-it-works')} className={navCls('how-it-works')}>HOW IT WORKS</button>
            <button onClick={() => scrollTo('proctoring')} className={navCls('proctoring')}>PROCTORING</button>
            <button onClick={() => scrollTo('testimonials')} className={navCls('testimonials')}>TESTIMONIALS</button>
          </nav>
          <div className="flex items-center gap-6">
            {!loading && (
              user ? (
                <div className="flex items-center gap-4">
                  <Link
                    href={user.profile?.role ? `/dashboard/${user.profile.role}` : '/dashboard'}
                    className="font-mono text-[10px] tracking-widest font-black text-black/50 hover:text-black transition-colors uppercase"
                  >
                    Dashboard
                  </Link>
                  <Link href={user.profile?.role ? `/dashboard/${user.profile.role}/settings` : '/dashboard/settings'}>
                    <Avatar className="h-9 w-9 border-2 border-brand-pink/20 hover:border-brand-pink transition-all">
                      <AvatarImage
                        src={user.profile?.avatar_url}
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="bg-brand-pink/10 text-brand-pink font-mono text-xs font-black">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </div>
              ) : (
                <>
                  <Link href="/auth/login" className="font-mono text-[10px] tracking-widest font-black text-black/50 hover:text-black transition-colors">SIGN IN</Link>
                  <Link href="/auth/register">
                    <Button className="bg-brand-pink text-black/50 hover:text-white hover:bg-[#330c26] transition-all font-mono font-black text-[10px] tracking-widest h-10 px-6 rounded-full shadow-lg shadow-brand-pink/20">
                      GET STARTED
                    </Button>
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {/* ── Sections ── */}
      <HeroSection />
      <div id="tech-stack">
        <TechStackSection />
      </div>
      <StatsSection />
      <div id="ai-analytics">
        <AISection />
      </div>

      <div id="proctoring">
        <ProctoringSection />
      </div>

      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <div id="features">
        <FeatureBentoGrid />
      </div>

      <InviteCodeSection />
      <CardShowcaseSection />

      <div id="testimonials">
        <TestimonialsSection />
      </div>

      <FinalCTASection />
      <FooterSection />

    </div>
  );
}
