'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ContainerTextFlipProps {
    words?: string[];
    interval?: number;
    className?: string;
    textClassName?: string;
    animationDuration?: number;
}

export function ContainerTextFlip({
    words = ['focused', 'prepared', 'confident', 'on-time'],
    interval = 2600,
    className,
    textClassName,
    animationDuration = 650,
}: ContainerTextFlipProps) {
    const id = useId();
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [width, setWidth] = useState(100);
    const textRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const updateWidthForWord = () => {
            if (!textRef.current) return;
            const textWidth = textRef.current.scrollWidth + 26;
            setWidth(textWidth);
        };

        updateWidthForWord();

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', updateWidthForWord);
            return () => window.removeEventListener('resize', updateWidthForWord);
        }

        return undefined;
    }, [currentWordIndex]);

    useEffect(() => {
        if (!words.length) return undefined;

        const intervalId = window.setInterval(() => {
            setCurrentWordIndex((prev) => (prev + 1) % words.length);
        }, interval);

        return () => window.clearInterval(intervalId);
    }, [words, interval]);

    const currentWord = words[currentWordIndex] ?? '';

    return (
        <motion.span
            layout
            layoutId={`flip-container-${id}`}
            animate={{ width }}
            transition={{ duration: animationDuration / 2000 }}
            className={cn(
                'relative inline-flex items-center justify-center whitespace-nowrap rounded-md border border-white/60 bg-white/35 px-2 py-0.5 align-middle font-semibold text-slate-800 shadow-[inset_0_-1px_rgba(255,255,255,0.6),0_8px_18px_rgba(15,23,42,0.12)] backdrop-blur-sm',
                className,
            )}
            key={currentWord}
        >
            <motion.div
                ref={textRef}
                transition={{ duration: animationDuration / 1000, ease: 'easeInOut' }}
                className={cn('inline-flex', textClassName)}
                layoutId={`flip-word-${currentWord}-${id}`}
            >
                {currentWord.split('').map((letter, index) => (
                    <motion.span
                        key={`${currentWord}-${index}`}
                        initial={{ opacity: 0, filter: 'blur(8px)', y: 4 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        transition={{ delay: index * 0.018, duration: 0.22 }}
                    >
                        {letter === ' ' ? '\u00A0' : letter}
                    </motion.span>
                ))}
            </motion.div>
        </motion.span>
    );
}
