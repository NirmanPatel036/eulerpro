'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Flame,
    GraduationCap,
    ListChecks,
    Lock,
    Medal,
    TimerReset,
    Trophy,
    UserRound,
    Sparkles,
    Target,
    TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import ClientOnly from '@/components/shared/ClientOnly';

type TimelineRange = 'week' | '2weeks' | 'month' | 'year';

type ExamRow = {
    id: string;
    title: string;
    status: string;
    duration: number | null;
    scheduled_at: string | null;
    created_at: string | null;
    course_id: string | null;
    courses: { name: string; code: string | null } | null;
};

type EnrollmentExamRow = {
    id: string;
    title: string;
    status: string;
    duration: number | null;
    scheduled_at: string | null;
    created_at: string | null;
    course_id: string | null;
    courses: { name: string; code: string | null } | null;
};

type ExamEnrollmentRow = {
    id: string;
    exam_id: string;
    invited_at: string;
    exams: EnrollmentExamRow | null;
};

type SessionRow = {
    id: string;
    exam_id: string;
    status: string;
    percentage: number | null;
    started_at: string | null;
    completed_at: string | null;
};

type CourseEnrollmentRow = {
    course_id: string | null;
    student_email: string | null;
    courses: {
        id: string;
        name: string;
        code: string | null;
        instructor_id: string | null;
    } | null;
};

type InstructorProfileRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
};

type TimelineItem = {
    id: string;
    course: string;
    start: string;
    end: string;
    color: string;
    fill: number;
};

type UpcomingItem = {
    id: string;
    title: string;
    course: string;
    dateLabel: string;
    timeLabel: string;
    durationLabel: string;
    daysLeft: number;
    locked: boolean;
};

type InstructorCard = {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    organization: string | null;
    courses: Array<{ code: string; name: string }>;
    totalCourses: number;
    totalExams: number;
    liveExams: number;
};

type ScoreTrendPoint = {
    score: number;
    label: string;
    resultLabel: string;
    dateLabel: string;
};

type GamificationProfileRow = {
    student_id: string;
    total_xp: number;
    level: number;
    lifetime_exams_completed: number;
    best_accuracy: number;
    current_streak_days: number;
    longest_streak_days: number;
};

type BadgeWithDef = {
    badge_code: string;
    unlocked_at: string;
    badge_definitions: {
        title: string;
        description: string;
        rarity: 'common' | 'rare' | 'epic' | 'legendary';
    } | null;
};

type MilestoneWithDef = {
    milestone_code: string;
    current_value: number;
    target_value: number;
    completed: boolean;
    milestone_definitions: {
        title: string;
    } | null;
};

type RewardModalData = {
    title: string;
    description: string;
    rarity: string;
    xp: number;
};

type BadgeImageRule = {
    code: string;
    title: string;
    image: string;
    minXp: number;
};

type LeaderboardEntry = {
    id: string;
    name: string;
    avatarUrl: string | null;
    xp: number;
    rank: number;
    isCurrentUser: boolean;
};

type CourseLeaderboard = {
    courseId: string;
    courseLabel: string;
    entries: LeaderboardEntry[];
};

type LearningStats = {
    questionsAnswered: number;
    avgTestMinutes: number;
    examsCompleted: number;
    avgAccuracy: number;
    questionsDeltaPct: number;
    timeDeltaPct: number;
    completionDeltaPct: number;
    accuracyDeltaPct: number;
};

const RANGE_OPTIONS: { value: TimelineRange; label: string }[] = [
    { value: 'week', label: 'This Week' },
    { value: '2weeks', label: 'Two Weeks' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
];

const TIMELINE_COLORS = ['#2563eb', '#d97706', '#059669', '#db2777', '#4f46e5', '#0891b2'];

const BADGE_IMAGE_RULES: BadgeImageRule[] = [
    { code: 'newbie', title: 'Newbie', image: '/images/badges/newbie.png', minXp: 0 },
    { code: 'focused', title: 'Focused', image: '/images/badges/focused.png', minXp: 100 },
    { code: 'consistent', title: 'Consistent', image: '/images/badges/consistent.png', minXp: 300 },
    { code: 'exam-warrior', title: 'Exam Warrior', image: '/images/badges/exam-warrior.png', minXp: 600 },
    { code: 'sharp-mind', title: 'Sharp Mind', image: '/images/badges/sharp-mind.png', minXp: 1000 },
    { code: 'streak-master', title: 'Streak Master', image: '/images/badges/streak-master.png', minXp: 1500 },
    { code: 'virtuoso', title: 'Virtuoso', image: '/images/badges/virtuoso.png', minXp: 2200 },
    { code: 'legend', title: 'Legend', image: '/images/badges/legend.png', minXp: 3200 },
];

const CARD_H = 136;

function getTimelineBounds(range: TimelineRange) {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (range === 'week') {
        start.setDate(now.getDate() - now.getDay());
        end.setDate(start.getDate() + 7);
    } else if (range === '2weeks') {
        start.setDate(now.getDate() - 7);
        end.setDate(now.getDate() + 7);
    } else if (range === 'month') {
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
    } else {
        start.setMonth(0);
        start.setDate(1);
        end.setMonth(11);
        end.setDate(31);
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
}

function getTimelineLabels(range: TimelineRange, tStart: number, tEnd: number): string[] {
    const days = Math.round((tEnd - tStart) / 86400000);
    if (range === 'week' || range === '2weeks') {
        return Array.from({ length: days + 1 }, (_, i) => {
            const d = new Date(tStart + i * 86400000);
            return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        }).filter((_, i) => i % (range === '2weeks' ? 2 : 1) === 0);
    }
    if (range === 'month') {
        const labels: string[] = [];
        const d = new Date(tStart);
        while (d.getTime() <= tEnd) {
            labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            d.setDate(d.getDate() + 7);
        }
        return labels;
    }
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
}

function hashColor(seed: string) {
    let acc = 0;
    for (let i = 0; i < seed.length; i++) {
        acc = (acc * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return TIMELINE_COLORS[acc % TIMELINE_COLORS.length];
}

function parseDate(value: string | null) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function initials(name: string) {
    return (
        name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('') || 'IN'
    );
}

function getStatus(exam: ExamRow, sessionStatus: string | null, nowMs: number) {
    if (sessionStatus === 'completed') return 'completed';
    if (exam.status === 'draft') return 'locked';

    const scheduled = parseDate(exam.scheduled_at);
    if (scheduled && scheduled.getTime() > nowMs) return 'upcoming';

    if (scheduled && !sessionStatus) {
        const endMs = scheduled.getTime() + Math.max(exam.duration ?? 0, 0) * 60000;
        if (nowMs > endMs) return 'locked';
    }

    return exam.status === 'archived' ? 'locked' : 'active';
}

function computeStreak(completedDates: string[]) {
    if (!completedDates.length) return 0;
    const daySet = new Set(
        completedDates
            .map((iso) => parseDate(iso))
            .filter((d): d is Date => Boolean(d))
            .map((d) => d.toISOString().slice(0, 10)),
    );

    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (true) {
        const key = cursor.toISOString().slice(0, 10);
        if (!daySet.has(key)) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    if (!streak) {
        const yesterday = new Date();
        yesterday.setHours(0, 0, 0, 0);
        yesterday.setDate(yesterday.getDate() - 1);
        const key = yesterday.toISOString().slice(0, 10);
        if (daySet.has(key)) return 1;
    }

    return streak;
}

function FlipSeg({ val, flipKey, label }: { val: string; flipKey: number; label: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div
                style={{
                    background: 'linear-gradient(160deg, #ffffff 0%, #eef4ff 100%)',
                    border: '1px solid #cfe0ff',
                    borderRadius: '10px',
                    padding: '6px 10px',
                    minWidth: '40px',
                    textAlign: 'center',
                    position: 'relative',
                    perspective: '400px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 18px rgba(15,23,42,0.08)',
                }}
            >
                <span
                    style={{
                        display: 'block',
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: '14px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        lineHeight: 1,
                        visibility: 'hidden',
                    }}
                >
                    {val}
                </span>
                <AnimatePresence mode="popLayout">
                    <motion.span
                        key={flipKey}
                        initial={{ rotateX: -90, opacity: 0.6 }}
                        animate={{ rotateX: 0, opacity: 1 }}
                        exit={{ rotateX: 90, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: "'Geist Mono', monospace",
                            fontSize: '14px',
                            fontWeight: 800,
                            color: '#1d4ed8',
                            letterSpacing: '0.04em',
                            transformOrigin: '50% 50%',
                            transformStyle: 'preserve-3d',
                            backfaceVisibility: 'hidden',
                        }}
                    >
                        {val}
                    </motion.span>
                </AnimatePresence>
            </div>
            <span style={{ fontSize: '8px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
        </div>
    );
}

function FlipClock() {
    const [seg, setSeg] = useState({ h: '00', m: '00', s: '00', hk: 0, mk: 0, sk: 0 });
    const prevRef = useRef<{ h: string; m: string; s: string }>({ h: '', m: '', s: '' });

    useEffect(() => {
        const tick = () => {
            const t = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
            const [nh, nm, ns] = t.split(':');
            const prev = prevRef.current;
            setSeg((s) => ({
                h: nh,
                m: nm,
                s: ns,
                hk: nh !== prev.h ? s.hk + 1 : s.hk,
                mk: nm !== prev.m ? s.mk + 1 : s.mk,
                sk: ns !== prev.s ? s.sk + 1 : s.sk,
            }));
            prevRef.current = { h: nh, m: nm, s: ns };
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    const Sep = () => <span style={{ fontSize: '14px', fontWeight: 800, color: '#94a3b8', alignSelf: 'center', marginBottom: '13px', lineHeight: 1 }}>:</span>;

    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
            <FlipSeg val={seg.h} flipKey={seg.hk} label="hrs" />
            <Sep />
            <FlipSeg val={seg.m} flipKey={seg.mk} label="min" />
            <Sep />
            <FlipSeg val={seg.s} flipKey={seg.sk} label="sec" />
        </div>
    );
}

function ConfettiBurst() {
    const pieces = Array.from({ length: 26 }, (_, i) => i);
    const palette = ['#22c55e', '#f59e0b', '#a855f7', '#0ea5e9', '#f43f5e', '#4f46e5'];

    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {pieces.map((i) => {
                const left = 20 + (i % 13) * 6;
                const delay = (i % 7) * 0.04;
                const color = palette[i % palette.length];
                const drift = (i % 2 === 0 ? 1 : -1) * (16 + (i % 5) * 4);
                return (
                    <motion.span
                        key={i}
                        initial={{ y: 0, x: 0, opacity: 0, rotate: 0 }}
                        animate={{ y: 240, x: drift, opacity: [0, 1, 1, 0], rotate: 280 }}
                        transition={{ duration: 1.2, delay, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            top: '-10px',
                            left: `${left}%`,
                            width: `${5 + (i % 4)}px`,
                            height: `${10 + (i % 5)}px`,
                            borderRadius: '999px',
                            background: color,
                        }}
                    />
                );
            })}
        </div>
    );
}

function RewardModal({ data, onAccept }: { data: RewardModalData | null; onAccept: () => void }) {
    return (
        <AnimatePresence>
            {data && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 90,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(2,6,23,0.5)',
                        backdropFilter: 'blur(4px)',
                        padding: '16px',
                    }}
                >
                    <motion.div
                        initial={{ y: 24, scale: 0.95, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        exit={{ y: 12, scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                        style={{
                            width: '100%',
                            maxWidth: '460px',
                            borderRadius: '24px',
                            border: '1px solid #cbd5e1',
                            background: 'radial-gradient(circle at 20% -10%, #dbeafe 0%, #f8fbff 45%, #ffffff 100%)',
                            boxShadow: '0 30px 80px rgba(15,23,42,0.26)',
                            position: 'relative',
                            overflow: 'hidden',
                            padding: '22px',
                        }}
                    >
                        <ConfettiBurst />
                        <div style={{ position: 'relative', zIndex: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <Badge style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontSize: '10px', fontWeight: 800 }}>
                                    NEW ACHIEVEMENT
                                </Badge>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{data.rarity}</span>
                            </div>
                            <h3 style={{ fontSize: '1.38rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '6px' }}>{data.title}</h3>
                            <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.5, marginBottom: '14px' }}>{data.description}</p>

                            <div
                                style={{
                                    borderRadius: '16px',
                                    border: '1px dashed #93c5fd',
                                    background: 'linear-gradient(145deg, #eff6ff 0%, #ffffff 100%)',
                                    padding: '12px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '16px',
                                }}
                            >
                                <span style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: 700 }}>Reward Credits</span>
                                <span style={{ fontSize: '1.06rem', color: '#1d4ed8', fontWeight: 900, fontFamily: "'Geist Mono', monospace" }}>+{data.xp} XP</span>
                            </div>

                            <button
                                onClick={onAccept}
                                style={{
                                    width: '100%',
                                    height: '42px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: 'linear-gradient(90deg, #1d4ed8 0%, #4f46e5 100%)',
                                    color: '#fff',
                                    fontWeight: 800,
                                    letterSpacing: '0.02em',
                                    boxShadow: '0 12px 26px rgba(37,99,235,0.28)',
                                }}
                            >
                                Accept Reward
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function ExamTimeline({ items }: { items: TimelineItem[] }) {
    const [range, setRange] = useState<TimelineRange>('2weeks');
    const [open, setOpen] = useState(false);
    const { start: tStart, end: tEnd } = getTimelineBounds(range);
    const tRange = tEnd - tStart;
    const toPct = (d: string) => Math.max(0, Math.min(100, ((new Date(d).getTime() - tStart) / tRange) * 100));
    const todayPct = Math.max(0, Math.min(100, ((Date.now() - tStart) / tRange) * 100));
    const labels = getTimelineLabels(range, tStart, tEnd);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.08, ease: 'easeOut' }}
            style={{
                flex: 1,
                background: 'radial-gradient(circle at 80% -20%, #e0e7ff 0%, #f8fbff 35%, #ffffff 100%)',
                borderRadius: '22px',
                border: '1px solid #d5e3f8',
                padding: '18px 20px',
                minWidth: 0,
                height: `${CARD_H * 2 + 12}px`,
                overflow: 'hidden',
                boxShadow: '0 24px 58px rgba(15,23,42,0.08)',
                position: 'relative',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'radial-gradient(#d4dff2 1px, transparent 1px)',
                    backgroundSize: '12px 12px',
                    opacity: 0.38,
                    pointerEvents: 'none',
                }}
            />

            <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarDays style={{ width: '14px', height: '14px', color: '#1d4ed8' }} />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.01em' }}>Exam Timeline</span>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setOpen((v) => !v)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#334155',
                                background: '#f8fafc',
                                border: '1px solid #dbe4f1',
                                borderRadius: '10px',
                                padding: '4px 10px',
                                cursor: 'pointer',
                            }}
                        >
                            {RANGE_OPTIONS.find((r) => r.value === range)?.label}
                            <ChevronDown style={{ width: '11px', height: '11px', color: '#64748b', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
                        </button>
                        <AnimatePresence>
                            {open && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                    transition={{ duration: 0.15 }}
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 6px)',
                                        right: 0,
                                        background: '#fff',
                                        border: '1px solid #dbe4f1',
                                        borderRadius: '12px',
                                        boxShadow: '0 14px 30px rgba(15,23,42,0.15)',
                                        zIndex: 50,
                                        overflow: 'hidden',
                                        minWidth: '130px',
                                    }}
                                >
                                    {RANGE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setRange(opt.value);
                                                setOpen(false);
                                            }}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '8px 14px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                color: range === opt.value ? '#1d4ed8' : '#334155',
                                                background: range === opt.value ? '#dbeafe' : 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', overflow: 'hidden' }}>
                    {labels.map((label, i) => (
                        <span key={i} style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: `${100 / labels.length}%` }}>
                            {label}
                        </span>
                    ))}
                </div>

                <div style={{ position: 'relative' }}>
                    {labels.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: `${(i / (labels.length - 1 || 1)) * 100}%`,
                                top: 0,
                                bottom: 0,
                                width: '1px',
                                borderLeft: '1px dashed rgba(30,41,59,0.16)',
                            }}
                        />
                    ))}
                    {todayPct > 0 && todayPct < 100 && (
                        <div style={{ position: 'absolute', left: `${todayPct}%`, top: -4, bottom: -4, width: '2px', background: '#ef4444', borderRadius: '2px', zIndex: 10 }}>
                            <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: '#fff', fontSize: '8px', fontWeight: 700, padding: '2px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>Today</div>
                        </div>
                    )}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={range}
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.22 }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', paddingBottom: '4px' }}
                        >
                            {items.length === 0 && (
                                <div style={{ position: 'relative', height: '36px', opacity: 0.7 }}>
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '8px', background: '#e2e8f0', borderRadius: '999px' }} />
                                    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: '10px', color: '#64748b', fontWeight: 700 }}>
                                        No scheduled exams in this range
                                    </div>
                                </div>
                            )}
                            {items.map((exam, i) => {
                                const left = toPct(exam.start);
                                const right = toPct(exam.end);
                                const width = right - left;
                                if (width <= 0) {
                                    return (
                                        <div key={exam.id} style={{ position: 'relative', height: '30px', opacity: 0.35 }}>
                                            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '6px', background: '#e2e8f0', borderRadius: '999px' }} />
                                        </div>
                                    );
                                }
                                return (
                                    <motion.div key={exam.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.06 }} style={{ position: 'relative', height: '30px' }}>
                                        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '6px', background: '#e2e8f0', borderRadius: '999px' }} />
                                        <div style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, top: '50%', transform: 'translateY(-50%)', height: '22px', background: `${exam.color}1a`, borderRadius: '8px', border: `1px solid ${exam.color}45` }} />
                                        <motion.div
                                            key={range + exam.id}
                                            style={{ position: 'absolute', left: `${left}%`, top: '50%', transform: 'translateY(-50%)', height: '22px', background: exam.color, borderRadius: '8px', originX: 0 }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(width * exam.fill) / 100}%` }}
                                            transition={{ delay: 0.15 + i * 0.08, duration: 0.62, ease: 'easeOut' }}
                                        />
                                        <div style={{ position: 'absolute', left: `calc(${left}% + 8px)`, top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: exam.fill > 35 ? '#fff' : exam.color }}>{exam.course}</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

function StatCards({
    examsTaken,
    bestScore,
    avgScore,
    completion,
}: {
    examsTaken: number;
    bestScore: number;
    avgScore: number;
    completion: number;
}) {
    const stats = [
        { icon: Activity, label: 'Exams Taken', value: String(examsTaken), sub: 'completed sessions', accent: '#2563eb', bg: '#dbeafe' },
        { icon: Target, label: 'Best Score', value: `${bestScore}%`, sub: 'top attempt', accent: '#b45309', bg: '#fef3c7' },
        { icon: TrendingUp, label: 'Average', value: `${avgScore}%`, sub: 'overall progress', accent: '#047857', bg: '#d1fae5' },
        { icon: Sparkles, label: 'Completion', value: `${completion}%`, sub: 'attempt success', accent: '#6d28d9', bg: '#ede9fe' },
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '280px', flexShrink: 0, alignSelf: 'stretch' }}>
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    style={{
                        height: `${CARD_H}px`,
                        background: 'linear-gradient(155deg, #ffffff 0%, #f8fbff 100%)',
                        borderRadius: '18px',
                        border: '1px solid #dbe4f1',
                        padding: '14px',
                        boxShadow: '0 14px 34px rgba(15,23,42,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.08) 0, rgba(148,163,184,0.08) 2px, transparent 2px, transparent 8px)',
                            opacity: 0.36,
                            pointerEvents: 'none',
                        }}
                    />
                    <div style={{ position: 'relative', zIndex: 2, width: '30px', height: '30px', borderRadius: '10px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <stat.icon style={{ width: '14px', height: '14px', color: stat.accent }} />
                    </div>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '2px' }}>{stat.label}</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.04em', lineHeight: 1 }}>{stat.value}</p>
                        <p style={{ fontSize: '9.5px', color: '#64748b', marginTop: '3px', lineHeight: 1.3 }}>{stat.sub}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function StudentHomePage() {
    const [firstName, setFirstName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [upcomingExams, setUpcomingExams] = useState<UpcomingItem[]>([]);
    const [instructors, setInstructors] = useState<InstructorCard[]>([]);
    const [scoreTrend, setScoreTrend] = useState<ScoreTrendPoint[]>([]);
    const [stats, setStats] = useState({ examsTaken: 0, bestScore: 0, avgScore: 0, completion: 0, streak: 0 });
    const [hoveredScoreBar, setHoveredScoreBar] = useState<number | null>(null);
    const [instructorIndex, setInstructorIndex] = useState(0);
    const [leaderboards, setLeaderboards] = useState<CourseLeaderboard[]>([]);
    const [leaderboardIndex, setLeaderboardIndex] = useState(0);
    const [learningStats, setLearningStats] = useState<LearningStats>({
        questionsAnswered: 0,
        avgTestMinutes: 0,
        examsCompleted: 0,
        avgAccuracy: 0,
        questionsDeltaPct: 0,
        timeDeltaPct: 0,
        completionDeltaPct: 0,
        accuracyDeltaPct: 0,
    });

    const [gProfile, setGProfile] = useState<GamificationProfileRow | null>(null);
    const [rewardModal, setRewardModal] = useState<RewardModalData | null>(null);

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        const user = authData?.user;

        if (authError || !user) {
            setError(authError?.message ?? 'Not authenticated');
            setLoading(false);
            return;
        }

        const name =
            (user.user_metadata?.first_name as string | undefined) ??
            (user.user_metadata?.given_name as string | undefined) ??
            (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
            user.email?.split('@')[0] ??
            null;
        setFirstName(name);

        const userEmail = user.email?.trim().toLowerCase() ?? null;

        const [enrollmentsRes, sessionsRes, courseEnrollmentsRes] = await Promise.all([
            supabase
                .from('exam_enrollments')
                .select(`
                    id,
                    exam_id,
                    invited_at,
                    exams (
                        id, title, status, duration, scheduled_at, created_at, course_id,
                        courses ( name, code )
                    )
                `)
                .eq('student_id', user.id)
                .order('invited_at', { ascending: false }),
            supabase
                .from('exam_sessions')
                .select('id, exam_id, status, percentage, started_at, completed_at')
                .eq('student_id', user.id)
                .order('completed_at', { ascending: false }),
            userEmail
                ? supabase
                      .from('course_enrollments')
                      .select('course_id, courses(id, name, code, instructor_id)')
                      .eq('student_email', userEmail)
                : Promise.resolve({ data: [], error: null }),
        ]);

        if (enrollmentsRes.error || sessionsRes.error || courseEnrollmentsRes.error) {
            setError(enrollmentsRes.error?.message ?? sessionsRes.error?.message ?? courseEnrollmentsRes.error?.message ?? 'Could not load dashboard data');
            setLoading(false);
            return;
        }

        const enrollmentRows = (enrollmentsRes.data ?? []) as unknown as ExamEnrollmentRow[];
        const sessionRows = (sessionsRes.data ?? []) as SessionRow[];
        const courseEnrollmentRows = (courseEnrollmentsRes.data ?? []) as unknown as CourseEnrollmentRow[];

        const directExams = enrollmentRows
            .map((row) => row.exams)
            .filter((exam): exam is EnrollmentExamRow => Boolean(exam))
            .map((exam) => ({ ...exam }));

        const directExamIds = new Set(directExams.map((exam) => exam.id));
        const courseIds = [...new Set(courseEnrollmentRows.map((row) => row.course_id).filter((id): id is string => Boolean(id)))];

        let courseExams: ExamRow[] = [];
        if (courseIds.length) {
            const { data, error: courseExamErr } = await supabase
                .from('exams')
                .select('id, title, status, duration, scheduled_at, created_at, course_id, courses(name, code)')
                .in('course_id', courseIds)
                .neq('status', 'draft');

            if (courseExamErr) {
                setError(courseExamErr.message);
                setLoading(false);
                return;
            }
            courseExams = ((data ?? []) as ExamRow[]).filter((exam) => !directExamIds.has(exam.id));
        }

        const examMap = new Map<string, ExamRow>();
        for (const exam of [...directExams, ...courseExams]) {
            examMap.set(exam.id, exam);
        }
        const exams = [...examMap.values()];

        const sessionByExam = new Map<string, SessionRow[]>();
        for (const session of sessionRows) {
            const list = sessionByExam.get(session.exam_id) ?? [];
            list.push(session);
            sessionByExam.set(session.exam_id, list);
        }

        const nowMs = Date.now();

        const questionCountByExam = new Map<string, number>();
        if (exams.length) {
            const { data: questionRows } = await supabase
                .from('questions')
                .select('exam_id')
                .in('exam_id', exams.map((exam) => exam.id));

            for (const row of (questionRows ?? []) as Array<{ exam_id: string }>) {
                questionCountByExam.set(row.exam_id, (questionCountByExam.get(row.exam_id) ?? 0) + 1);
            }
        }

        const upcoming = exams
            .filter((exam) => {
                const scheduled = parseDate(exam.scheduled_at);
                if (!scheduled) return false;
                const status = getStatus(exam, sessionByExam.get(exam.id)?.[0]?.status ?? null, nowMs);
                return status !== 'completed' && status !== 'locked';
            })
            .sort((a, b) => (parseDate(a.scheduled_at)?.getTime() ?? 0) - (parseDate(b.scheduled_at)?.getTime() ?? 0))
            .slice(0, 6)
            .map((exam) => {
                const scheduled = parseDate(exam.scheduled_at) ?? new Date();
                const daysLeft = Math.max(0, Math.ceil((scheduled.getTime() - nowMs) / 86400000));
                return {
                    id: exam.id,
                    title: exam.title,
                    course: exam.courses?.code ?? exam.courses?.name ?? 'COURSE',
                    dateLabel: scheduled.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    timeLabel: scheduled.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                    durationLabel: `${exam.duration ?? 0} min`,
                    daysLeft,
                    locked: getStatus(exam, sessionByExam.get(exam.id)?.[0]?.status ?? null, nowMs) === 'locked',
                } satisfies UpcomingItem;
            });

        const completedSessions = sessionRows
            .filter((session) => session.status === 'completed' && typeof session.percentage === 'number')
            .sort((a, b) => (parseDate(b.completed_at)?.getTime() ?? 0) - (parseDate(a.completed_at)?.getTime() ?? 0));

        const trend = completedSessions
            .slice(0, 10)
            .reverse()
            .map((session, index) => {
                const exam = examMap.get(session.exam_id);
                const completedAt = parseDate(session.completed_at);
                return {
                    score: Math.round(session.percentage ?? 0),
                    label: exam?.courses?.code ?? `R${index + 1}`,
                    resultLabel: exam?.title ?? `Result ${index + 1}`,
                    dateLabel: completedAt
                        ? completedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'N/A',
                } satisfies ScoreTrendPoint;
            });

        const timelineItems = exams
            .filter((exam) => parseDate(exam.scheduled_at))
            .sort((a, b) => (parseDate(a.scheduled_at)?.getTime() ?? 0) - (parseDate(b.scheduled_at)?.getTime() ?? 0))
            .slice(0, 8)
            .map((exam) => {
                const scheduled = parseDate(exam.scheduled_at) as Date;
                const start = parseDate(exam.created_at) ?? new Date(scheduled.getTime() - 7 * 86400000);
                const session = sessionByExam.get(exam.id)?.[0] ?? null;
                const status = getStatus(exam, session?.status ?? null, nowMs);
                let fill = 0;
                if (status === 'completed') {
                    fill = 100;
                } else if (nowMs > scheduled.getTime()) {
                    fill = status === 'active' ? 85 : 50;
                } else {
                    const denom = Math.max(scheduled.getTime() - start.getTime(), 1);
                    fill = Math.max(0, Math.min(100, ((nowMs - start.getTime()) / denom) * 100));
                }
                return {
                    id: exam.id,
                    course: exam.courses?.code ?? exam.courses?.name ?? 'COURSE',
                    start: start.toISOString(),
                    end: scheduled.toISOString(),
                    color: hashColor(exam.id),
                    fill: Math.round(fill),
                } satisfies TimelineItem;
            });

        const completedCount = completedSessions.length;
        const avgScore = completedCount
            ? Math.round(completedSessions.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / completedCount)
            : 0;
        const bestScore = completedCount ? Math.round(Math.max(...completedSessions.map((row) => row.percentage ?? 0))) : 0;
        const completion = exams.length ? Math.round((completedCount / exams.length) * 100) : 0;
        const streak = computeStreak(completedSessions.map((row) => row.completed_at ?? '').filter(Boolean));

        const courseMapByInstructor = new Map<string, Map<string, string>>();
        for (const row of courseEnrollmentRows) {
            const instructorId = row.courses?.instructor_id;
            if (!instructorId) continue;
            const code = row.courses?.code ?? 'Unknown';
            const name = row.courses?.name ?? 'Course';
            const current = courseMapByInstructor.get(instructorId) ?? new Map<string, string>();
            current.set(code, name);
            courseMapByInstructor.set(instructorId, current);
        }

        const instructorIds = [...courseMapByInstructor.keys()];
        const instructorCards: InstructorCard[] = [];

        if (instructorIds.length) {
            const { data: profileRows, error: profileErr } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .in('id', instructorIds);

            if (profileErr) {
                setError(profileErr.message);
                setLoading(false);
                return;
            }

            const profiles = (profileRows ?? []) as InstructorProfileRow[];
            const instructorCourseIds = new Map<string, Set<string>>();

            for (const row of courseEnrollmentRows) {
                const instructorId = row.courses?.instructor_id;
                const courseId = row.course_id;
                if (!instructorId || !courseId) continue;
                const currentIds = instructorCourseIds.get(instructorId) ?? new Set<string>();
                currentIds.add(courseId);
                instructorCourseIds.set(instructorId, currentIds);
            }

            for (const profile of profiles) {
                const coursesMap = courseMapByInstructor.get(profile.id) ?? new Map<string, string>();
                const instructorCourseSet = instructorCourseIds.get(profile.id) ?? new Set<string>();
                const examsForInstructor = exams.filter((exam) =>
                    exam.course_id ? instructorCourseSet.has(exam.course_id) : false,
                );
                const uniqueExams = new Set(examsForInstructor.map((exam) => exam.id));
                const liveExams = examsForInstructor.filter(
                    (exam) => getStatus(exam, sessionByExam.get(exam.id)?.[0]?.status ?? null, nowMs) === 'active',
                ).length;
                instructorCards.push({
                    id: profile.id,
                    name: profile.full_name?.trim() || profile.email || 'Instructor',
                    email: profile.email,
                    avatarUrl: profile.avatar_url,
                    organization: null,
                    courses: [...coursesMap.entries()].map(([code, name]) => ({ code, name })),
                    totalCourses: instructorCourseSet.size || coursesMap.size,
                    totalExams: uniqueExams.size,
                    liveExams,
                });
            }
        }

        setTimeline(timelineItems);
        setUpcomingExams(upcoming);
        setInstructors(instructorCards);
        setScoreTrend(
            trend.length
                ? trend
                : [
                      {
                          score: 0,
                          label: 'NA',
                          resultLabel: 'No completed exams yet',
                          dateLabel: 'N/A',
                      },
                  ],
        );
        setStats({ examsTaken: completedCount, bestScore, avgScore, completion, streak });

        const toPctDelta = (currentValue: number, previousValue: number) => {
            if (!previousValue && !currentValue) return 0;
            if (!previousValue) return 100;
            return Math.round(((currentValue - previousValue) / previousValue) * 100);
        };

        const completedWithTime = completedSessions
            .map((session) => {
                const start = parseDate(session.started_at);
                const end = parseDate(session.completed_at);
                if (!start || !end) return null;
                const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
                return { session, minutes };
            })
            .filter((entry): entry is { session: SessionRow; minutes: number } => Boolean(entry));

        const avgTestMinutes = completedWithTime.length
            ? Math.round(completedWithTime.reduce((sum, row) => sum + row.minutes, 0) / completedWithTime.length)
            : 0;

        const questionsAnswered = completedSessions.reduce(
            (sum, session) => sum + (questionCountByExam.get(session.exam_id) ?? 0),
            0,
        );

        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const currWindowStart = nowMs - sevenDaysMs;
        const prevWindowStart = nowMs - 2 * sevenDaysMs;

        const inCurrentWindow = (d: Date | null) => Boolean(d && d.getTime() >= currWindowStart && d.getTime() <= nowMs);
        const inPreviousWindow = (d: Date | null) => Boolean(d && d.getTime() >= prevWindowStart && d.getTime() < currWindowStart);

        const currentWindowSessions = completedSessions.filter((session) => inCurrentWindow(parseDate(session.completed_at)));
        const previousWindowSessions = completedSessions.filter((session) => inPreviousWindow(parseDate(session.completed_at)));

        const currentWindowQuestions = currentWindowSessions.reduce(
            (sum, session) => sum + (questionCountByExam.get(session.exam_id) ?? 0),
            0,
        );
        const previousWindowQuestions = previousWindowSessions.reduce(
            (sum, session) => sum + (questionCountByExam.get(session.exam_id) ?? 0),
            0,
        );

        const currentWindowAvgTime = (() => {
            const mins = currentWindowSessions
                .map((session) => {
                    const start = parseDate(session.started_at);
                    const end = parseDate(session.completed_at);
                    if (!start || !end) return null;
                    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
                })
                .filter((value): value is number => value !== null);
            return mins.length ? Math.round(mins.reduce((sum, v) => sum + v, 0) / mins.length) : 0;
        })();

        const previousWindowAvgTime = (() => {
            const mins = previousWindowSessions
                .map((session) => {
                    const start = parseDate(session.started_at);
                    const end = parseDate(session.completed_at);
                    if (!start || !end) return null;
                    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
                })
                .filter((value): value is number => value !== null);
            return mins.length ? Math.round(mins.reduce((sum, v) => sum + v, 0) / mins.length) : 0;
        })();

        const currentWindowAccuracy = currentWindowSessions.length
            ? Math.round(currentWindowSessions.reduce((sum, session) => sum + (session.percentage ?? 0), 0) / currentWindowSessions.length)
            : 0;
        const previousWindowAccuracy = previousWindowSessions.length
            ? Math.round(previousWindowSessions.reduce((sum, session) => sum + (session.percentage ?? 0), 0) / previousWindowSessions.length)
            : 0;

        setLearningStats({
            questionsAnswered,
            avgTestMinutes,
            examsCompleted: completedCount,
            avgAccuracy: avgScore,
            questionsDeltaPct: toPctDelta(currentWindowQuestions, previousWindowQuestions),
            timeDeltaPct: toPctDelta(currentWindowAvgTime, previousWindowAvgTime),
            completionDeltaPct: toPctDelta(currentWindowSessions.length, previousWindowSessions.length),
            accuracyDeltaPct: toPctDelta(currentWindowAccuracy, previousWindowAccuracy),
        });

        const courseBuckets = new Map<string, { label: string; emails: Set<string> }>();
        for (const row of courseEnrollmentRows) {
            if (!row.course_id) continue;
            const label = row.courses?.code ?? row.courses?.name ?? 'Course';
            const bucket = courseBuckets.get(row.course_id) ?? { label, emails: new Set<string>() };
            if (row.student_email) bucket.emails.add(row.student_email.trim().toLowerCase());
            if (userEmail) bucket.emails.add(userEmail);
            courseBuckets.set(row.course_id, bucket);
        }

        const allCourseEmails = [...new Set([...courseBuckets.values()].flatMap((bucket) => [...bucket.emails]))];
        let leaderboardProfiles: InstructorProfileRow[] = [];
        if (allCourseEmails.length) {
            const { data: boardProfiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .in('email', allCourseEmails);
            leaderboardProfiles = (boardProfiles ?? []) as InstructorProfileRow[];
        }

        const profileByEmail = new Map(
            leaderboardProfiles
                .filter((profile) => profile.email)
                .map((profile) => [profile.email!.trim().toLowerCase(), profile] as const),
        );

        const leaderboardProfileIds = leaderboardProfiles.map((profile) => profile.id);
        const xpByStudentId = new Map<string, number>();
        if (leaderboardProfileIds.length) {
            const { data: xpRows } = await supabase
                .from('student_gamification_profiles')
                .select('student_id, total_xp')
                .in('student_id', leaderboardProfileIds);
            for (const row of (xpRows ?? []) as Array<{ student_id: string; total_xp: number }>) {
                xpByStudentId.set(row.student_id, row.total_xp ?? 0);
            }
        }

        const boardData: CourseLeaderboard[] = [...courseBuckets.entries()]
            .map(([courseId, bucket]) => {
                const entries = [...bucket.emails]
                    .map((email) => {
                        const profile = profileByEmail.get(email);
                        const name =
                            profile?.full_name?.trim() ||
                            email.split('@')[0]
                                .replace(/[._-]/g, ' ')
                                .replace(/\b\w/g, (char) => char.toUpperCase());
                        const xp = profile ? (xpByStudentId.get(profile.id) ?? 0) : 0;
                        const id = profile?.id ?? `email:${email}`;
                        return {
                            id,
                            name,
                            avatarUrl: profile?.avatar_url ?? null,
                            xp,
                            rank: 0,
                            isCurrentUser: email === userEmail || profile?.id === user.id,
                        };
                    })
                    .sort((left, right) => right.xp - left.xp || left.name.localeCompare(right.name))
                    .map((entry, index) => ({ ...entry, rank: index + 1 }))
                    .slice(0, 8);

                return {
                    courseId,
                    courseLabel: bucket.label,
                    entries,
                };
            })
            .filter((course) => course.entries.length > 0)
            .sort((left, right) => left.courseLabel.localeCompare(right.courseLabel));

        setLeaderboards(boardData);

        const [gProfRes] = await Promise.allSettled([
            supabase
                .from('student_gamification_profiles')
                .select('student_id, total_xp, level, lifetime_exams_completed, best_accuracy, current_streak_days, longest_streak_days')
                .eq('student_id', user.id)
                .maybeSingle(),
        ]);

        if (gProfRes.status === 'fulfilled' && !gProfRes.value.error) {
            setGProfile((gProfRes.value.data ?? null) as GamificationProfileRow | null);
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        void loadDashboardData();

        const supabase = createClient();
        let badgeChannelRef: ReturnType<typeof supabase.channel> | null = null;

        const channel = supabase
            .channel('student-dashboard-home-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_enrollments' }, () => {
                void loadDashboardData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_sessions' }, () => {
                void loadDashboardData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => {
                void loadDashboardData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'course_enrollments' }, () => {
                void loadDashboardData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                void loadDashboardData();
            })
            .subscribe();

        void supabase.auth.getUser().then(async ({ data }: { data: { user: { id: string } | null } }) => {
            const uid = data?.user?.id;
            if (!uid) return;

            badgeChannelRef = supabase
                .channel('student-badge-reward-popups')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'student_badges',
                        filter: `student_id=eq.${uid}`,
                    },
                    async (payload: { new: { badge_code?: string } }) => {
                        const newRow = payload.new as { badge_code?: string };
                        if (!newRow.badge_code) return;

                        const { data: def } = await supabase
                            .from('badge_definitions')
                            .select('title, description, rarity, xp_reward')
                            .eq('code', newRow.badge_code)
                            .maybeSingle();

                        if (!def) return;

                        setRewardModal({
                            title: def.title,
                            description: def.description,
                            rarity: def.rarity,
                            xp: def.xp_reward,
                        });
                        void loadDashboardData();
                    },
                )
                .subscribe();
        });

        return () => {
            void supabase.removeChannel(channel);
            if (badgeChannelRef) void supabase.removeChannel(badgeChannelRef);
        };
    }, [loadDashboardData]);

    useEffect(() => {
        setInstructorIndex((prev) => {
            if (!instructors.length) return 0;
            return prev % instructors.length;
        });
    }, [instructors.length]);

    useEffect(() => {
        setLeaderboardIndex((prev) => {
            if (!leaderboards.length) return 0;
            return prev % leaderboards.length;
        });
    }, [leaderboards.length]);

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const scoreTrendBars = useMemo(() => {
        const safe = scoreTrend.length
            ? scoreTrend
            : [{ score: 0, label: 'NA', resultLabel: 'No completed exams yet', dateLabel: 'N/A' }];
        const max = Math.max(...safe.map((point) => point.score), 1);
        return safe.map((point) => Math.max(10, Math.round((point.score / max) * 100)));
    }, [scoreTrend]);

    const badgeImageTrack = useMemo(() => {
        const xp = gProfile?.total_xp ?? 0;
        return BADGE_IMAGE_RULES.map((rule) => ({
            ...rule,
            unlocked: xp >= rule.minXp,
        }));
    }, [gProfile?.total_xp]);

    const activeLeaderboard = leaderboards[leaderboardIndex] ?? null;
    const topThreeLeaderboard = activeLeaderboard?.entries.slice(0, 3) ?? [];
    const secondaryLeaderboard = activeLeaderboard?.entries.slice(3, 7) ?? [];
    const currentInstructor = instructors[instructorIndex] ?? null;

    if (loading) {
        return (
            <div className="p-7 pb-16 w-full">
                <div className="rounded-2xl border border-blue-100 bg-white p-5 text-sm text-slate-600 shadow-sm">Loading your dashboard...</div>
            </div>
        );
    }

    return (
        <ClientOnly>
        <div
            className="relative p-7 pb-16 w-full overflow-hidden"
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                backgroundColor: '#f7fafc',
                backgroundImage:
                    'radial-gradient(circle at 20% -20%, rgba(59,130,246,0.09) 0%, transparent 35%), radial-gradient(circle at 100% 0%, rgba(168,85,247,0.08) 0%, transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(247,250,252,1) 100%)',
            }}
        >
            <RewardModal data={rewardModal} onAccept={() => setRewardModal(null)} />

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, ease: 'easeOut' }}
                style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}
            >
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ fontSize: '1.55rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: "'Geist Mono', monospace" }}
                    >
                        {greeting}
                        {firstName ? `, ${firstName}` : ''} 👋
                    </motion.h1>
                    <p style={{ marginTop: '6px', color: '#64748b', fontSize: '12px', letterSpacing: '0.03em' }}>Your performance cockpit is live.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'stretch', gap: '10px', flexWrap: 'wrap' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                        }}
                    >
                        <p style={{ fontSize: '12px', color: '#475569', fontWeight: 700 }}>{today}</p>
                        <FlipClock />
                        <Badge style={{ background: '#dbeafe', color: '#1e3a8a', border: '1px solid #93c5fd', fontSize: '9px', fontWeight: 800 }}>IST</Badge>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            background: 'linear-gradient(120deg, #fff7ed 0%, #fef3c7 100%)',
                            border: '1px solid #fcd34d',
                            borderRadius: '14px',
                            padding: '8px 14px',
                            boxShadow: '0 10px 25px rgba(180,83,9,0.12)',
                        }}
                    >
                        <Flame style={{ width: '15px', height: '15px', color: '#ea580c' }} />
                        <span style={{ fontWeight: 700, color: '#7c2d12', fontSize: '13px' }}>{stats.streak}-day streak</span>
                        <span style={{ color: '#92400e', fontSize: '11px' }}>Consistency matters</span>
                    </div>
                </div>
            </motion.div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <ExamTimeline items={timeline} />
                <StatCards examsTaken={stats.examsTaken} bestScore={stats.bestScore} avgScore={stats.avgScore} completion={stats.completion} />
            </div>

            <div
                style={{
                    display: 'grid',
                    gap: '16px',
                    gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                }}
            >
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, delay: 0.2, ease: 'easeOut' }}
                    style={{
                        gridColumn: 'span 8 / span 8',
                        background: 'linear-gradient(145deg, #ffffff 0%, #f8fbff 100%)',
                        borderRadius: '22px',
                        border: '1px solid #dbe4f1',
                        padding: '16px',
                        boxShadow: '0 18px 42px rgba(15,23,42,0.08)',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '286px',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'radial-gradient(rgba(148,163,184,0.22) 1px, transparent 1px)',
                            backgroundSize: '14px 14px',
                            opacity: 0.26,
                            pointerEvents: 'none',
                        }}
                    />
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock3 style={{ width: '14px', height: '14px', color: '#1d4ed8' }} />
                                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>Upcoming Exams</span>
                            </div>
                            <Link href="/dashboard/student/exams" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none', opacity: 0.95 }}>
                                View all <ChevronRight style={{ width: '12px', height: '12px' }} />
                            </Link>
                        </div>

                        {upcomingExams.length === 0 ? (
                            <div style={{ fontSize: '12px', color: '#64748b', padding: '10px 6px' }}>No upcoming exams right now.</div>
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    gap: '10px',
                                    overflowX: 'auto',
                                    paddingBottom: '2px',
                                    scrollbarWidth: 'thin',
                                }}
                            >
                                {upcomingExams.map((exam, i) => (
                                    <motion.div
                                        key={exam.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.24 + i * 0.05 }}
                                        whileHover={{ y: -4, boxShadow: '0 16px 36px rgba(15,23,42,0.18)' }}
                                        style={{
                                            flex: '0 0 172px',
                                            borderRadius: '14px',
                                            border: '1px solid #d2def0',
                                            background:
                                                'linear-gradient(170deg, rgba(255,255,255,0.95) 0%, rgba(239,246,255,0.95) 38%, rgba(233,213,255,0.9) 100%)',
                                            padding: '10px',
                                            minHeight: '240px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            opacity: exam.locked ? 0.7 : 1,
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                backgroundImage: 'repeating-linear-gradient(135deg, rgba(148,163,184,0.08) 0, rgba(148,163,184,0.08) 1px, transparent 1px, transparent 7px)',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                        <div style={{ position: 'relative', zIndex: 2 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                                                <Badge style={{ fontSize: '9px', fontWeight: 800, background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>{exam.course}</Badge>
                                                {exam.daysLeft <= 2 ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 800, color: '#dc2626' }}>
                                                        <AlertTriangle style={{ width: '10px', height: '10px' }} /> {exam.daysLeft}d
                                                    </span>
                                                ) : exam.locked ? (
                                                    <Lock style={{ width: '12px', height: '12px', color: '#64748b' }} />
                                                ) : (
                                                    <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>{exam.daysLeft}d</span>
                                                )}
                                            </div>

                                            <p style={{ marginTop: '10px', fontSize: '12px', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>{exam.title}</p>
                                        </div>

                                        <div style={{ position: 'relative', zIndex: 2 }}>
                                            <div style={{ borderTop: '1px dashed #bfdbfe', marginBottom: '8px' }} />
                                            <p style={{ fontSize: '10px', color: '#334155', fontWeight: 700 }}>{exam.dateLabel}</p>
                                            <p style={{ fontSize: '10px', color: '#64748b' }}>{exam.timeLabel} · {exam.durationLabel}</p>
                                            <button
                                                style={{
                                                    marginTop: '8px',
                                                    width: '100%',
                                                    height: '30px',
                                                    borderRadius: '10px',
                                                    border: '1px solid #cbd5e1',
                                                    background: '#fff',
                                                    color: '#0f172a',
                                                    fontWeight: 700,
                                                    fontSize: '11px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Review
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, delay: 0.28, ease: 'easeOut' }}
                    style={{
                        gridColumn: 'span 4 / span 4',
                        gridRow: 'span 2 / span 2',
                        background: 'linear-gradient(160deg, #ffffff 0%, #f3f4ff 100%)',
                        borderRadius: '22px',
                        border: '1px solid #dbe4f1',
                        padding: '16px',
                        boxShadow: '0 20px 48px rgba(15,23,42,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        height: '604px',
                        minHeight: '604px',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>Level Track</span>
                        <Badge style={{ fontSize: '9px', fontWeight: 800, background: '#ede9fe', color: '#5b21b6', border: '1px solid #ddd6fe' }}>
                            LVL {gProfile?.level ?? 1}
                        </Badge>
                    </div>

                    <div
                        style={{
                            borderRadius: '16px',
                            border: '1px dashed #bfdbfe',
                            background: 'linear-gradient(145deg, #eff6ff 0%, #ffffff 100%)',
                            padding: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#334155', fontWeight: 700 }}>Experience</span>
                            <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 900, fontFamily: "'Geist Mono', monospace" }}>{gProfile?.total_xp ?? 0} XP</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#dbeafe', borderRadius: '999px', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, ((gProfile?.total_xp ?? 0) % 500) / 5)}%` }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, #1d4ed8, #7c3aed)' }}
                            />
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <p style={{ fontSize: '11px', color: '#475569', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Course Leaderboard</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    onClick={() => setLeaderboardIndex((prev) => (leaderboards.length ? (prev - 1 + leaderboards.length) % leaderboards.length : 0))}
                                    disabled={leaderboards.length <= 1}
                                    style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        background: '#fff',
                                        color: '#334155',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: leaderboards.length <= 1 ? 'not-allowed' : 'pointer',
                                        opacity: leaderboards.length <= 1 ? 0.45 : 1,
                                    }}
                                    aria-label="Previous course leaderboard"
                                >
                                    <ChevronLeft style={{ width: '12px', height: '12px' }} />
                                </button>
                                <button
                                    onClick={() => setLeaderboardIndex((prev) => (leaderboards.length ? (prev + 1) % leaderboards.length : 0))}
                                    disabled={leaderboards.length <= 1}
                                    style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        background: '#fff',
                                        color: '#334155',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: leaderboards.length <= 1 ? 'not-allowed' : 'pointer',
                                        opacity: leaderboards.length <= 1 ? 0.45 : 1,
                                    }}
                                    aria-label="Next course leaderboard"
                                >
                                    <ChevronRight style={{ width: '12px', height: '12px' }} />
                                </button>
                            </div>
                        </div>

                        <div
                            style={{
                                borderRadius: '16px',
                                border: '1px solid #dbe4f1',
                                background: 'linear-gradient(160deg, #ffffff 0%, #eef4ff 100%)',
                                padding: '10px',
                                height: '172px',
                                overflow: 'hidden',
                            }}
                        >
                            {!activeLeaderboard ? (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                                    Leaderboard will appear after course enrollments sync.
                                </div>
                            ) : (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeLeaderboard.courseId}
                                        initial={{ opacity: 0, x: 14 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -14 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{activeLeaderboard.courseLabel}</span>
                                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>{leaderboardIndex + 1}/{leaderboards.length}</span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: '8px', alignItems: 'end', minHeight: '66px' }}>
                                            {[0, 1, 2].map((idx) => {
                                                const person = topThreeLeaderboard[idx];
                                                if (!person) return <div key={idx} />;
                                                const isMiddle = idx === 1;
                                                const medalBg = person.rank === 1 ? '#fbbf24' : person.rank === 2 ? '#cbd5e1' : '#fdba74';
                                                return (
                                                    <div key={person.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                        <div style={{ width: isMiddle ? '50px' : '42px', height: isMiddle ? '50px' : '42px', borderRadius: '999px', border: `2px solid ${medalBg}`, overflow: 'hidden', background: '#fff' }}>
                                                            {person.avatarUrl ? (
                                                                <img src={person.avatarUrl} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                                                    <UserRound style={{ width: '18px', height: '18px' }} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span style={{ fontSize: '9px', fontWeight: 900, borderRadius: '999px', background: medalBg, color: '#111827', padding: '1px 8px' }}>{person.rank}{person.rank === 1 ? 'st' : person.rank === 2 ? 'nd' : 'rd'}</span>
                                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#334155', maxWidth: '72px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={person.name}>{person.name}</span>
                                                        <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 800 }}>{person.xp.toLocaleString()} XP</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '5px', overflow: 'hidden' }}>
                                            {secondaryLeaderboard.length === 0 ? (
                                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>No more ranked peers in this course yet.</span>
                                            ) : (
                                                secondaryLeaderboard.map((person) => (
                                                    <div key={person.id} style={{ display: 'grid', gridTemplateColumns: '26px 1fr auto', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b' }}>#{person.rank}</span>
                                                        <span style={{ fontSize: '10px', fontWeight: 700, color: person.isCurrentUser ? '#1d4ed8' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={person.name}>
                                                            {person.name}
                                                        </span>
                                                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569' }}>{person.xp.toLocaleString()} XP</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            )}
                        </div>
                    </div>

                    <div>
                        <p style={{ fontSize: '11px', color: '#475569', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Badges</p>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                height: '92px',
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                padding: '6px 2px',
                                scrollbarWidth: 'thin',
                            }}
                        >
                            {badgeImageTrack.map((badge, idx) => (
                                <motion.div
                                    key={badge.code}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    title={badge.unlocked ? `${badge.title} unlocked at ${badge.minXp} XP` : `${badge.title} unlocks at ${badge.minXp} XP`}
                                    style={{
                                        flex: '0 0 auto',
                                        width: '72px',
                                        height: '78px',
                                        borderRadius: '12px',
                                        border: badge.unlocked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                        background: badge.unlocked ? 'linear-gradient(145deg, #eff6ff 0%, #ffffff 100%)' : '#f8fafc',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        padding: '6px',
                                    }}
                                >
                                    <img
                                        src={badge.image}
                                        alt={badge.title}
                                        style={{
                                            width: '42px',
                                            height: '42px',
                                            objectFit: 'contain',
                                            filter: badge.unlocked ? 'none' : 'grayscale(1) opacity(0.35)',
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontSize: '9px',
                                            fontWeight: 800,
                                            color: badge.unlocked ? '#1e3a8a' : '#94a3b8',
                                            textAlign: 'center',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            width: '100%',
                                        }}
                                    >
                                        {badge.title}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p style={{ fontSize: '11px', color: '#475569', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Performance Pulse</p>
                        <div
                            style={{
                                borderRadius: '18px',
                                border: '1px solid #d9def0',
                                background: 'linear-gradient(145deg, #ffffff 0%, #f6f7ff 100%)',
                                overflow: 'hidden',
                                height: '100px',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >

                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                                {[
                                    {
                                        icon: ListChecks,
                                        label: 'Questions',
                                        value: learningStats.questionsAnswered.toLocaleString(),
                                        delta: learningStats.questionsDeltaPct,
                                        color: '#0f766e',
                                    },
                                    {
                                        icon: TimerReset,
                                        label: 'Avg Time',
                                        value: `${learningStats.avgTestMinutes}m`,
                                        delta: learningStats.timeDeltaPct,
                                        color: '#b45309',
                                    },
                                    {
                                        icon: Medal,
                                        label: 'Completed',
                                        value: String(learningStats.examsCompleted),
                                        delta: learningStats.completionDeltaPct,
                                        color: '#1d4ed8',
                                    },
                                    {
                                        icon: Trophy,
                                        label: 'Accuracy',
                                        value: `${learningStats.avgAccuracy}%`,
                                        delta: learningStats.accuracyDeltaPct,
                                        color: '#be185d',
                                    },
                                ].map((metric, idx) => (
                                    <div
                                        key={metric.label}
                                        style={{
                                            padding: '6px 7px 4px',
                                            borderRight: idx < 3 ? '1px solid #e2e8f0' : 'none',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-start',
                                            gap: '6px',
                                            minWidth: 0,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <metric.icon style={{ width: '12px', height: '12px', color: metric.color, flexShrink: 0 }} />
                                            <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{metric.label}</span>
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{metric.value}</div>
                                        <div style={{ fontSize: '8px', fontWeight: 800, color: metric.delta >= 0 ? '#059669' : '#dc2626', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {metric.delta >= 0 ? '+' : ''}{metric.delta}% vs prev
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, delay: 0.34, ease: 'easeOut' }}
                    style={{
                        gridColumn: 'span 4 / span 4',
                        background: 'linear-gradient(150deg, #ffffff 0%, #f8fbff 100%)',
                        borderRadius: '22px',
                        border: '1px solid #dbe4f1',
                        padding: '16px',
                        boxShadow: '0 14px 34px rgba(15,23,42,0.08)',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>Score Graph</span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Last {scoreTrendBars.length} exams</span>
                    </div>

                    <div
                        style={{
                            marginBottom: '10px',
                            borderRadius: '12px',
                            border: '1px solid #dbeafe',
                            background: 'linear-gradient(120deg, #eff6ff 0%, #ffffff 100%)',
                            padding: '8px 10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}
                    >
                        <span style={{ fontSize: '10px', color: '#334155', fontWeight: 700 }}>Current Avg</span>
                        <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 900, fontFamily: "'Geist Mono', monospace" }}>
                            {stats.avgScore}%
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '170px', padding: '8px', borderRadius: '14px', border: '1px dashed #cbd5e1', background: '#fff' }}>
                        {scoreTrendBars.map((v, i) => (
                            <div
                                key={i}
                                style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}
                                onMouseEnter={() => setHoveredScoreBar(i)}
                                onMouseLeave={() => setHoveredScoreBar(null)}
                            >
                                <motion.div
                                    initial={{ scaleY: 0 }}
                                    animate={{ scaleY: 1 }}
                                    transition={{ delay: 0.36 + i * 0.04, ease: 'easeOut' }}
                                    style={{
                                        width: '100%',
                                        maxWidth: '32px',
                                        borderRadius: '8px 8px 4px 4px',
                                        background: 'linear-gradient(to top, #1d4ed8, #8b5cf6)',
                                        transformOrigin: 'bottom',
                                        height: `${v}%`,
                                        filter: hoveredScoreBar === i ? 'brightness(1.08)' : 'none',
                                        boxShadow:
                                            hoveredScoreBar === i
                                                ? '0 10px 22px rgba(79,70,229,0.32)'
                                                : '0 2px 8px rgba(59,130,246,0.2)',
                                    }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: `${100 - v}%`,
                                        transform: 'translateY(-10px)',
                                        fontSize: '9px',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        opacity: hoveredScoreBar === i ? 1 : 0,
                                        pointerEvents: 'none',
                                        background: '#fff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '4px 6px',
                                        boxShadow: '0 10px 20px rgba(15,23,42,0.16)',
                                        whiteSpace: 'nowrap',
                                        transition: 'opacity 0.15s ease',
                                        zIndex: 5,
                                    }}
                                >
                                    {scoreTrend[i]?.resultLabel ?? 'Result'}: {scoreTrend[i]?.score ?? 0}%
                                </div>
                                <span
                                    style={{
                                        position: 'absolute',
                                        bottom: '-24px',
                                        fontSize: '8px',
                                        color: '#64748b',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        maxWidth: '38px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                    title={scoreTrend[i]?.dateLabel ?? ''}
                                >
                                    {scoreTrend[i]?.label ?? 'NA'}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, delay: 0.4, ease: 'easeOut' }}
                    style={{
                        gridColumn: 'span 4 / span 4',
                        background: 'linear-gradient(150deg, #ffffff 0%, #f8fbff 100%)',
                        borderRadius: '22px',
                        border: '1px solid #dbe4f1',
                        padding: '16px',
                        boxShadow: '0 14px 34px rgba(15,23,42,0.08)',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <GraduationCap style={{ width: '14px', height: '14px', color: '#1d4ed8' }} />
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>Instructors' Lane</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                onClick={() =>
                                    setInstructorIndex((prev) =>
                                        instructors.length ? (prev - 1 + instructors.length) % instructors.length : 0,
                                    )
                                }
                                disabled={instructors.length <= 1}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#fff',
                                    color: '#334155',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: instructors.length <= 1 ? 'not-allowed' : 'pointer',
                                    opacity: instructors.length <= 1 ? 0.45 : 1,
                                }}
                                aria-label="Previous instructor"
                            >
                                <ChevronLeft style={{ width: '12px', height: '12px' }} />
                            </button>
                            <button
                                onClick={() =>
                                    setInstructorIndex((prev) =>
                                        instructors.length ? (prev + 1) % instructors.length : 0,
                                    )
                                }
                                disabled={instructors.length <= 1}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#fff',
                                    color: '#334155',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: instructors.length <= 1 ? 'not-allowed' : 'pointer',
                                    opacity: instructors.length <= 1 ? 0.45 : 1,
                                }}
                                aria-label="Next instructor"
                            >
                                <ChevronRight style={{ width: '12px', height: '12px' }} />
                            </button>
                        </div>
                    </div>

                    {instructors.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Instructor details will appear as soon as your enrolled courses are mapped.</div>
                    ) : (
                        <div style={{ overflow: 'hidden', borderRadius: '14px' }}>
                            <motion.div
                                key={currentInstructor?.id ?? 'no-instructor'}
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -24 }}
                                transition={{ duration: 0.22, ease: 'easeOut' }}
                                style={{ width: '100%' }}
                            >
                                {currentInstructor && (
                                    <div
                                        key={currentInstructor.id}
                                        style={{
                                            width: '100%',
                                            borderRadius: '14px',
                                            border: '1px solid #d8e3f6',
                                            background: 'linear-gradient(145deg, #ffffff 0%, #eef4ff 100%)',
                                            padding: '10px',
                                            boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {currentInstructor.avatarUrl ? (
                                                <img src={currentInstructor.avatarUrl} alt={currentInstructor.name} style={{ width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#dbeafe', color: '#1e40af', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                                                    {initials(currentInstructor.name)}
                                                </div>
                                            )}
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentInstructor.name}</p>
                                                <p style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentInstructor.email ?? 'No public email'}</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '8px' }}>
                                            <div style={{ borderRadius: '10px', background: '#fff', border: '1px solid #e2e8f0', padding: '6px', textAlign: 'center' }}>
                                                <p style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase' }}>Courses</p>
                                                <p style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{currentInstructor.totalCourses}</p>
                                            </div>
                                            <div style={{ borderRadius: '10px', background: '#fff', border: '1px solid #e2e8f0', padding: '6px', textAlign: 'center' }}>
                                                <p style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase' }}>Exams</p>
                                                <p style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{currentInstructor.totalExams}</p>
                                            </div>
                                            <div style={{ borderRadius: '10px', background: '#fff', border: '1px solid #e2e8f0', padding: '6px', textAlign: 'center' }}>
                                                <p style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase' }}>Live</p>
                                                <p style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>{currentInstructor.liveExams}</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                                            {currentInstructor.courses.slice(0, 6).map(({ code, name }) => (
                                                <div key={code} style={{ fontSize: '10px', color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <span style={{ color: '#1e3a8a', fontWeight: 700 }}>{code}</span>
                                                    <span style={{ color: '#64748b' }}>: {name}</span>
                                                </div>
                                            ))}
                                            {currentInstructor.courses.length > 6 && (
                                                <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>
                                                    +{currentInstructor.courses.length - 6} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    )}
                </motion.section>
            </div>
        </div>
        </ClientOnly>
    );
}
