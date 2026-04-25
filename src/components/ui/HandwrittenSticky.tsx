'use client';

import { motion } from 'framer-motion';

interface StickyProps {
    text: string;
    className?: string;
    rotation?: number;
    color?: 'yellow' | 'blue' | 'pink' | 'white';
}

const colors = {
    yellow: 'bg-[#ffed8a]',
    blue: 'bg-[#a3e4ff]',
    pink: 'bg-[#ffcce2]',
    white: 'bg-[#eef6f0]',
};

export default function HandwrittenSticky({
    text,
    className = '',
    rotation = 0,
    color = 'white',
}: StickyProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: rotation - 5 }}
            whileInView={{ opacity: 1, scale: 1, rotate: rotation }}
            viewport={{ once: true }}
            className={`
        relative p-6 w-64 aspect-square shadow-xl flex items-center justify-center text-center
        ${colors[color]} ${className}
      `}
            style={{
                clipPath: 'polygon(0% 0%, 100% 0%, 100% 92%, 92% 100%, 0% 100%)',
            }}
        >
            {/* Tape effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/40 backdrop-blur-sm -rotate-2" />

            <p className="font-handwriting text-[#330c26] text-sm leading-relaxed font-medium">
                {text}
            </p>

            {/* Subtle lines */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(#000 1px, transparent 1px)',
                    backgroundSize: '100% 1.4rem',
                    backgroundPosition: '0 0.8rem',
                }}
            />
        </motion.div>
    );
}
