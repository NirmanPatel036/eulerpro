'use client';
import { useRef } from 'react';

interface MarqueeProps {
    items: React.ReactNode[];
    reverse?: boolean;
    speed?: 'slow' | 'normal' | 'fast';
    className?: string;
    gap?: number;
}

export default function Marquee({
    items,
    reverse = false,
    speed = 'normal',
    className = '',
    gap = 32,
}: MarqueeProps) {
    const trackClass = reverse
        ? 'marquee-track-rev'
        : speed === 'fast'
            ? 'marquee-track-fast'
            : 'marquee-track';

    // Duplicate items so the loop is seamless
    const doubled = [...items, ...items];

    return (
        <div className={`overflow-hidden w-full ${className}`}>
            <div
                className={`flex w-max ${trackClass}`}
                style={{ gap }}
            >
                {doubled.map((item, i) => (
                    <div key={i} className="shrink-0">
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
}
