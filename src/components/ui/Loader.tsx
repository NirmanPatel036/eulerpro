'use client';

import { motion } from 'framer-motion';

export default function Loader({ size = 48, label }: { size?: number; label?: string }) {
    return (
        <div className="euler-loader">
            <div className="euler-loader__wrap">
                {/* Pulsing glow ring */}
                <motion.div
                    className="euler-loader__ring"
                    style={{ width: size + 24, height: size + 24 }}
                    animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="euler-loader__icon"
                    style={{ width: size, height: size }}
                    animate={{ rotate: [0, 90, 180, 270, 360] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        fill="none"
                        stroke="#b08968"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        width={size}
                        height={size}
                    >
                        {/* Outer frame */}
                        <rect x="4" y="4" width="40" height="40" rx="2" />
                        {/* Maze paths */}
                        <path d="M4 16h16v-12" />
                        <path d="M16 16v16h-12" />
                        <path d="M28 4v12h16" />
                        <path d="M28 28h-12" />
                        <path d="M28 28v16" />
                        <path d="M44 28h-4" />
                        <path d="M36 28v-8" />
                        <path d="M36 20h-8" />
                    </svg>
                </motion.div>
            </div>

            {label && (
                <motion.p
                    className="euler-loader__label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {label}
                </motion.p>
            )}

            <style jsx global>{`
                .euler-loader {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1.25rem;
                    position: relative;
                    width: 100%;
                }
                .euler-loader__icon {
                    position: relative;
                    z-index: 2;
                    filter: drop-shadow(0 0 12px rgba(176, 137, 104, 0.35));
                }
                .euler-loader__wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .euler-loader__ring {
                    position: absolute;
                    border-radius: 50%;
                    border: 2px solid rgba(176, 137, 104, 0.25);
                    pointer-events: none;
                    z-index: 1;
                }
                .euler-loader__label {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    color: rgba(176, 137, 104, 0.7);
                    margin: 0;
                }
            `}</style>
        </div>
    );
}
