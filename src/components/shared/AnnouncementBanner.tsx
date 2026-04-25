'use client';

import { Megaphone } from 'lucide-react';

const ANNOUNCEMENTS = [
    '🚀 EulerPro v2.4 — AI flag detection is now 40% faster',
    '📅 Scheduling just got better - check it out now!',
    '🎓 Upcoming feature: Randomised question pools to be available for all exam types',
    '📊 Analytics dashboard overhaul — richer insights, new cohort views',
    '🔒 Security update: real-time eye tracking with multi-face recognition',
    '📟 Gemini 2.5 Flash Lite integrated to generate questions with different difficulty levels',
    '💡 Tip: Use keyboard shortcut ⌘K to open the command palette anywhere',
    '🌐 Backed by Oracle Cloud Infrastructure; self-hosted on Coolify',
];

export default function AnnouncementBanner() {
    // Duplicate for seamless loop
    const items = [...ANNOUNCEMENTS, ...ANNOUNCEMENTS];

    return (
        <div className="announcement-banner" role="marquee" aria-label="Announcements">
            <div className="announcement-banner__label">
                <Megaphone className="w-3 h-3" />
                <span>Updates</span>
            </div>
            <div className="announcement-banner__track-wrap">
                <div className="announcement-banner__track">
                    {items.map((text, i) => (
                        <span key={i} className="announcement-banner__item">
                            {text}
                            <span className="announcement-banner__sep" aria-hidden="true">·</span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
