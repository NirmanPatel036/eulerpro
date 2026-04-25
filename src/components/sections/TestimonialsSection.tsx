'use client';

import HandwrittenSticky from '@/components/ui/HandwrittenSticky';

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-32 bg-[#f4efe1] relative">
      <div className="absolute top-0 inset-x-0 h-4 bg-linear-to-b from-black/5 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 mb-24 text-center">
        <p className="text-pink-500 font-mono font-black text-[15px] tracking-[0.3em] mb-6">GLOBAL IMPACT</p>
        <h2 className="text-4xl md:text-7xl font-mono font-semibold text-[#330c26] leading-none mb-4">
          Hear It From The <br /> Desks That Matter.
        </h2>
      </div>

      <div className="flex flex-wrap justify-center gap-12 max-w-7xl mx-auto pb-20">
        <HandwrittenSticky color="white" rotation={-3} text="EulerPro cut our exam setup time from days to 20 minutes. The AI proctoring flagged 3 violations our TAs missed." />
        <HandwrittenSticky color="pink" rotation={2} text="The live question builder with real-time preview is genuinely magical. Students loved it." />
        <HandwrittenSticky color="yellow" rotation={-4} text="Deploying 500 concurrent exam-takers with zero infrastructure headache. EulerPro scales." />
        <HandwrittenSticky color="blue" rotation={3} text="Finally an exam platform that thinks like an engineer. Certification loops closed." />
      </div>
    </section>
  );
}
