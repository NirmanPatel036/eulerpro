'use client';

const techStack = [
  { name: 'Next.js', logo: '/images/tech/nextjs.png' },
  { name: 'React', logo: '/images/tech/react.svg' },
  { name: 'TypeScript', logo: '/images/tech/typescript.png' },
  { name: 'Python', logo: '/images/tech/python.png' },
  { name: 'TensorFlow', logo: '/images/tech/tensorflow.png' },
  { name: 'FastAPI', logo: '/images/tech/fastapi.png' },
  { name: 'Flask', logo: '/images/tech/flask.png' },
  { name: 'WebRTC', logo: '/images/tech/webrtc.png' },
  { name: 'PostgreSQL', logo: '/images/tech/postgresql.png' },
  { name: 'Docker', logo: '/images/tech/docker.png' },
  { name: 'Oracle Cloud', logo: '/images/tech/oracle-cloud.png' },
  { name: 'Coolify', logo: '/images/tech/coolify.png' },
  { name: 'Supabase', logo: '/images/tech/supabase.png' },
];

export default function TechStackSection() {
  return (
    <section
      className="relative py-14 overflow-hidden"
      style={{
        backgroundImage: 'url(/images/grainygrad-3.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <p className="text-center text-xs font-semibold tracking-widest uppercase text-white/50 font-mono mb-8">
        Built with industry-leading technologies
      </p>

      <div
        className="flex overflow-hidden"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
        }}
      >
        <div className="flex items-center gap-14 shrink-0 marquee-track">
          {[...techStack, ...techStack].map((t, i) => (
            <span key={i} className="shrink-0 flex items-center gap-3 text-sm font-medium text-white/80 hover:text-white/60 transition-colors duration-300 whitespace-nowrap font-mono">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.logo} alt={t.name} className="w-8 h-8 object-contain opacity-80" />
              {t.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
