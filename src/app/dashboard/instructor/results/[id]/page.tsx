'use client';

import { useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    BarChart3,
    ChevronRight,
    Loader2,
    Medal,
    Search,
    Sparkles,
    Trophy,
    Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContainerTextFlip } from '@/components/ui/container-text-flip';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

type ExamRow = {
    id: string;
    title: string;
    passing_score: number | null;
    duration: number | null;
    scheduled_at: string | null;
};

type QuestionInsightRow = {
    id: string;
    text: string;
    points: number | null;
    order: number | null;
};

type QuestionResultRow = {
    question_id: string;
    correct: boolean;
    points_awarded: number;
};

type SessionRow = {
    id: string;
    student_id: string;
    percentage: number | null;
    score: number | null;
    max_score: number | null;
    passed: boolean | null;
    completed_at: string | null;
    time_taken_seconds: number | null;
    question_results: QuestionResultRow[] | null;
};

type ProfileMap = Record<string, { full_name: string | null; email: string | null }>;

type Band = {
    label: string;
    count: number;
    gradient: string;
};

const SCORE_BANDS = [
    { label: '80+', min: 80, max: 100, gradient: 'linear-gradient(90deg, #22d3ee, #3b82f6)' },
    { label: '60-79', min: 60, max: 79, gradient: 'linear-gradient(90deg, #34d399, #14b8a6)' },
    { label: '40-59', min: 40, max: 59, gradient: 'linear-gradient(90deg, #fbbf24, #f97316)' },
    { label: '<40', min: 0, max: 39, gradient: 'linear-gradient(90deg, #fb7185, #ef4444)' },
] as const;

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.38, delay, ease: 'easeOut' as const },
});

function formatDate(iso: string | null) {
    if (!iso) return 'Not completed';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'Not completed';
    return parsed.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatDuration(seconds: number | null) {
    if (!seconds || seconds <= 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
}

function formatRelative(iso: string | null) {
    if (!iso) return 'Awaiting submission';
    const parsed = new Date(iso).getTime();
    if (Number.isNaN(parsed)) return 'Awaiting submission';
    const diffMs = Date.now() - parsed;
    const minutes = Math.max(1, Math.round(diffMs / 60_000));
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

function normalizeQuestionResults(value: unknown): QuestionResultRow[] | null {
    if (!Array.isArray(value)) return null;
    return value
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((item) => ({
            question_id: typeof item.question_id === 'string' ? item.question_id : '',
            correct: Boolean(item.correct),
            points_awarded: typeof item.points_awarded === 'number' ? item.points_awarded : 0,
        }))
        .filter((item) => Boolean(item.question_id));
}

function buildBands(values: number[]) {
    return SCORE_BANDS.map<Band>((band) => ({
        label: band.label,
        count: values.filter((value) => value >= band.min && value <= band.max).length,
        gradient: band.gradient,
    }));
}

function ScoreSparkline({ values }: { values: number[] }) {
    const gradientId = useId();
    const normalized = (values.length ? values : [0, 0, 0, 0, 0, 0]).map((value) => Math.max(0, Math.min(100, value)));
    const chartWidth = 480;
    const chartHeight = 96;
    const topPadding = 12;
    const bottomPadding = 20;
    const usableHeight = chartHeight - topPadding - bottomPadding;
    const step = normalized.length > 1 ? chartWidth / (normalized.length - 1) : chartWidth;

    const points = normalized.map((value, index) => ({
        x: index * step,
        y: topPadding + ((100 - value) / 100) * usableHeight,
        value,
    }));

    const linePath = points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const previous = points[index - 1];
        const controlOffset = step * 0.5;
        return `${path} C ${previous.x + controlOffset} ${previous.y}, ${point.x - controlOffset} ${point.y}, ${point.x} ${point.y}`;
    }, '');

    const first = points[0];
    const last = points[points.length - 1];
    const areaPath = `${linePath} L ${last.x} ${chartHeight} L ${first.x} ${chartHeight} Z`;

    return (
        <div className="space-y-3">
            <div className="relative h-24 overflow-hidden rounded-xl border border-indigo-100/80" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(238,242,255,0.7), rgba(255,255,255,1), rgba(248,250,252,1))' }}>
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full">
                    <defs>
                        <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(99,102,241,0.35)" />
                            <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
                        </linearGradient>
                        <linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                    </defs>

                    <path d={areaPath} fill={`url(#${gradientId}-fill)`} />
                    <motion.path
                        d={linePath}
                        fill="none"
                        stroke={`url(#${gradientId}-line)`}
                        strokeWidth="3"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0.6 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                    />

                    {points.map((point, index) => (
                        <motion.circle
                            key={`${point.x}-${point.y}`}
                            cx={point.x}
                            cy={point.y}
                            r="3"
                            fill="#0f172a"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.95 }}
                            transition={{ delay: 0.08 + index * 0.04, duration: 0.2 }}
                        />
                    ))}
                </svg>
            </div>

            <div className="flex items-center justify-between px-0.5 font-mono text-[10px] text-slate-600">
                {normalized.map((value, index) => (
                    <span key={`${value}-${index}`}>{value}%</span>
                ))}
            </div>
        </div>
    );
}

function ScoreRing({ value, label, sublabel }: { value: number; label: string; sublabel: string }) {
    const safeValue = Math.max(0, Math.min(100, value));
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (safeValue / 100) * circumference;

    return (
        <div className="relative flex h-55 items-center justify-center overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.15),transparent_55%)]" />
            <div className="relative flex flex-col items-center gap-4">
                <div className="relative">
                    <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
                        <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="10" />
                        <motion.circle
                            cx="64"
                            cy="64"
                            r={radius}
                            fill="none"
                            stroke="url(#detail-results-ring)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: dashOffset }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                            style={{ strokeDasharray: circumference }}
                        />
                        <defs>
                            <linearGradient id="detail-results-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#67e8f9" />
                                <stop offset="100%" stopColor="#4f46e5" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">pass</span>
                        <span className="font-[Geist_Mono] text-4xl font-semibold tracking-[-0.08em] text-slate-950">{safeValue}%</span>
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                    <p className="text-xs text-slate-500">{sublabel}</p>
                </div>
            </div>
        </div>
    );
}

export default function InstructorExamResultsByIdPage() {
    const params = useParams<{ id: string }>();
    const examId = params?.id;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exam, setExam] = useState<ExamRow | null>(null);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [profiles, setProfiles] = useState<ProfileMap>({});
    const [questions, setQuestions] = useState<QuestionInsightRow[]>([]);
    const [search, setSearch] = useState('');
    const [rosterFilter, setRosterFilter] = useState<'all' | 'passed' | 'risk'>('all');
    const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);

    const deferredSearch = useDeferredValue(search);

    useEffect(() => {
        if (!examId) return undefined;

        const supabase = createClient();
        let alive = true;

        const loadData = async (soft = false) => {
            if (!alive) return;
            if (soft) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const { data: auth, error: authError } = await supabase.auth.getUser();
            const user = auth?.user;

            if (authError || !user) {
                if (!alive) return;
                setError(authError?.message ?? 'Not authenticated');
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const { data: examRow, error: examErr } = await supabase
                .from('exams')
                .select('id, title, passing_score, duration, scheduled_at, instructor_id')
                .eq('id', examId)
                .single();

            if (examErr || !examRow) {
                if (!alive) return;
                setError(examErr?.message ?? 'Exam not found');
                setLoading(false);
                setRefreshing(false);
                return;
            }

            if (examRow.instructor_id !== user.id) {
                if (!alive) return;
                setError('You are not allowed to view this exam.');
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const [{ data: sessionRows, error: sessErr }, { data: questionRows, error: questionErr }] = await Promise.all([
                supabase
                    .from('exam_sessions')
                    .select('id, student_id, percentage, score, max_score, passed, completed_at, time_taken_seconds, question_results')
                    .eq('exam_id', examId)
                    .eq('status', 'completed')
                    .order('completed_at', { ascending: false }),
                supabase
                    .from('questions')
                    .select('id, text, points, "order"')
                    .eq('exam_id', examId)
                    .order('order', { ascending: true }),
            ]);

            if (sessErr || questionErr) {
                if (!alive) return;
                setError(sessErr?.message ?? questionErr?.message ?? 'Unable to load exam results');
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const rows = ((sessionRows ?? []) as Array<Omit<SessionRow, 'question_results'> & { question_results: unknown }>).map((row) => ({
                ...row,
                question_results: normalizeQuestionResults(row.question_results),
            }));
            const studentIds = [...new Set(rows.map((row) => row.student_id).filter(Boolean))];
            const { data: profileRows, error: profileErr } = studentIds.length
                ? await supabase.from('profiles').select('id, full_name, email').in('id', studentIds)
                : { data: [], error: null };

            if (profileErr) {
                if (!alive) return;
                setError(profileErr.message);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            if (!alive) return;

            setExam({
                id: examRow.id,
                title: examRow.title,
                passing_score: examRow.passing_score,
                duration: examRow.duration,
                scheduled_at: examRow.scheduled_at,
            });
            setSessions(rows);
            setQuestions((questionRows ?? []) as QuestionInsightRow[]);
            setProfiles(
                ((profileRows ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>).reduce<ProfileMap>((acc, row) => {
                    acc[row.id] = { full_name: row.full_name, email: row.email };
                    return acc;
                }, {})
            );
            setLoading(false);
            setRefreshing(false);
        };

        void loadData();

        const channel = supabase
            .channel(`instructor-exam-results-${examId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exams', filter: `id=eq.${examId}` }, () => {
                void loadData(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_sessions', filter: `exam_id=eq.${examId}` }, () => {
                void loadData(true);
            })
            .subscribe();

        return () => {
            alive = false;
            void supabase.removeChannel(channel);
        };
    }, [examId]);

    const stats = useMemo(() => {
        const total = sessions.length;
        const passed = sessions.filter((s) => s.passed).length;
        const avg = total
            ? Math.round(sessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / total)
            : 0;
        const avgTimeSeconds = total
            ? Math.round(sessions.reduce((sum, s) => sum + Math.max(0, s.time_taken_seconds ?? 0), 0) / total)
            : 0;
        return {
            total,
            passed,
            avg,
            avgTimeSeconds,
            passRate: total ? Math.round((passed / total) * 100) : 0,
        };
    }, [sessions]);

    const scoreBands = useMemo(() => buildBands(sessions.map((session) => session.percentage ?? 0)), [sessions]);

    const leaderboard = useMemo(() => {
        return sessions
            .map((session) => {
                const profile = profiles[session.student_id];
                return {
                    session,
                    name: profile?.full_name?.trim() || profile?.email || 'Unknown student',
                    email: profile?.email || session.student_id,
                };
            })
            .sort((left, right) => {
                const scoreDiff = (right.session.percentage ?? 0) - (left.session.percentage ?? 0);
                if (scoreDiff !== 0) return scoreDiff;
                return (left.session.time_taken_seconds ?? Number.MAX_SAFE_INTEGER) - (right.session.time_taken_seconds ?? Number.MAX_SAFE_INTEGER);
            });
    }, [profiles, sessions]);

    const selectedStudentId = useMemo(() => {
        const hasFocused = leaderboard.some((item) => item.session.student_id === focusedStudentId);
        return hasFocused ? focusedStudentId : leaderboard[0]?.session.student_id ?? null;
    }, [focusedStudentId, leaderboard]);

    const filteredRoster = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();
        return leaderboard.filter((item) => {
            const matchesFilter = rosterFilter === 'all'
                ? true
                : rosterFilter === 'passed'
                    ? Boolean(item.session.passed)
                    : !item.session.passed;
            const matchesQuery = !query
                || item.name.toLowerCase().includes(query)
                || item.email.toLowerCase().includes(query);
            return matchesFilter && matchesQuery;
        });
    }, [deferredSearch, leaderboard, rosterFilter]);

    const focusedEntry = useMemo(() => {
        return leaderboard.find((item) => item.session.student_id === selectedStudentId) ?? null;
    }, [leaderboard, selectedStudentId]);

    const questionInsights = useMemo(() => {
        return questions
            .map((question) => {
                let attempts = 0;
                let correct = 0;

                for (const session of sessions) {
                    const result = session.question_results?.find((entry) => entry.question_id === question.id);
                    if (!result) continue;
                    attempts += 1;
                    if (result.correct) correct += 1;
                }

                const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
                return { ...question, attempts, correct, accuracy };
            })
            .sort((left, right) => left.accuracy - right.accuracy);
    }, [questions, sessions]);

    const timelineScores = useMemo(() => {
        return [...sessions]
            .sort((left, right) => {
                const leftTs = left.completed_at ? new Date(left.completed_at).getTime() : 0;
                const rightTs = right.completed_at ? new Date(right.completed_at).getTime() : 0;
                return leftTs - rightTs;
            })
            .slice(-12)
            .map((session) => session.percentage ?? 0);
    }, [sessions]);

    const paceSummary = useMemo(() => {
        const durationSeconds = Math.max(60, (exam?.duration ?? 1) * 60);
        const buckets = { fast: 0, steady: 0, stretch: 0 };

        for (const session of sessions) {
            const ratio = Math.max(0, session.time_taken_seconds ?? 0) / durationSeconds;
            if (ratio <= 0.55) buckets.fast += 1;
            else if (ratio <= 0.85) buckets.steady += 1;
            else buckets.stretch += 1;
        }

        return buckets;
    }, [exam?.duration, sessions]);

    const recentSessions = useMemo(() => {
        return sessions.slice(0, 5).map((session) => {
            const profile = profiles[session.student_id];
            return {
                id: session.id,
                name: profile?.full_name?.trim() || profile?.email || 'Unknown student',
                percentage: session.percentage ?? 0,
                completedAt: session.completed_at,
            };
        });
    }, [profiles, sessions]);

    if (loading) {
        return (
            <div className="instructor-home flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="instructor-home">
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
                <Button variant="outline" className="border-slate-300 text-slate-800 hover:text-slate-900" onClick={() => router.push('/dashboard/instructor/exams')}>
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Exams
                </Button>
            </div>
        );
    }

    return (
        <div className="instructor-home">
            <motion.div {...fadeUp(0)} className="instructor-home__header mb-5">
                <div>
                    <p className="instructor-home__breadcrumb">
                        <span
                            className="cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => router.push('/dashboard/instructor/exams')}
                        >
                            Exams
                        </span>
                        <ChevronRight className="h-3.5 w-3.5" />
                        <span className="font-semibold text-gray-900">Results</span>
                    </p>
                    <h1 className="instructor-home__title">{exam?.title ?? 'Exam Results'}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-sm md:flex">
                        <Waves className={cn('h-3.5 w-3.5', refreshing ? 'text-cyan-500' : 'text-slate-400')} />
                        {refreshing ? 'Syncing changes' : 'Live results enabled'}
                    </div>
                    <Button className="bg-white/90 text-slate-900 hover:text-slate-900 border border-slate-200 shadow-sm rounded-full" onClick={() => router.push('/dashboard/instructor/results')}>
                        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                    </Button>
                </div>
            </motion.div>

            {sessions.length === 0 ? (
                <motion.div
                    {...fadeUp(0.08)}
                    className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),linear-gradient(135deg,#ffffff,#f8fafc_58%,#eef2ff)] p-8 shadow-[0_28px_70px_rgba(15,23,42,0.08)]"
                >
                    <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                        <Sparkles className="h-3.5 w-3.5" /> Awaiting completed attempts
                    </p>
                    <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                        This room will populate as soon as students finish the exam.
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                        Once submissions start closing, this page will auto-fill with performance waves, question difficulty signals, and the full ranked roster.
                    </p>
                </motion.div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                        <motion.section
                            {...fadeUp(0.08)}
                            className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.16),transparent_26%),linear-gradient(135deg,#f8fafc,#ffffff_40%,#eef2ff)] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] xl:col-span-8"
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-size-[24px_24px] opacity-60" />
                            <div className="relative">
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
                                    <BarChart3 className="h-3.5 w-3.5 text-cyan-500" /> Real-time result room
                                </div>
                                <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.07em] text-slate-950 md:text-[2.5rem]">
                                    Clearer read on who is{' '}
                                    <ContainerTextFlip
                                        words={['surging', 'steady', 'at risk', 'leading']}
                                        className="mx-1 border-cyan-100 bg-white/75 px-3 py-1"
                                        textClassName="text-slate-900"
                                    />
                                    .
                                </h2>
                                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                                    Track the score wave, highlight outliers, and move from cohort-level performance into student-level evidence without leaving this page.
                                </p>

                                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                    {[
                                        { label: 'Submissions', value: stats.total, sub: `${stats.passed} passed` },
                                        { label: 'Average', value: `${stats.avg}%`, sub: `${exam?.passing_score ?? 60}% pass line` },
                                        { label: 'Pace', value: formatDuration(stats.avgTimeSeconds), sub: `${exam?.duration ?? 0} min exam` },
                                    ].map((item) => (
                                        <div key={item.label} className="rounded-[22px] border border-white/70 bg-white/75 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                                            <p className="mt-2 font-[Geist_Mono] text-3xl font-semibold tracking-[-0.08em] text-slate-950">{item.value}</p>
                                            <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 rounded-[26px] border border-slate-200/80 bg-white/95 p-5 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Score skyline</p>
                                            <h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">Latest performance wave</h3>
                                        </div>
                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                            {formatDate(exam?.scheduled_at ?? null)}
                                        </span>
                                    </div>

                                    <ScoreSparkline values={timelineScores} />
                                </div>
                            </div>
                        </motion.section>

                        <div className="grid gap-5 xl:col-span-4">
                            <motion.section {...fadeUp(0.16)}>
                                <ScoreRing
                                    value={stats.passRate}
                                    label="Pass rate on this exam"
                                    sublabel={focusedEntry ? `${focusedEntry.name} currently anchors the leaderboard` : 'Waiting for more data'}
                                />
                            </motion.section>

                            <motion.section
                                {...fadeUp(0.22)}
                                className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
                            >
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Focused student</p>
                                        <h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">Current spotlight</h3>
                                    </div>
                                    <Trophy className="h-4 w-4 text-amber-500" />
                                </div>

                                {focusedEntry ? (
                                    <div className="space-y-4">
                                        <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,#ffffff_60%,#eef2ff)] px-4 py-4">
                                            <p className="truncate text-lg font-semibold text-slate-950">{focusedEntry.name}</p>
                                            <p className="truncate text-xs text-slate-500">{focusedEntry.email}</p>
                                            <div className="mt-4 grid grid-cols-3 gap-3">
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Score</p>
                                                    <p className="mt-2 font-[Geist_Mono] text-2xl text-slate-950">{focusedEntry.session.percentage ?? 0}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</p>
                                                    <p className="mt-2 text-sm font-semibold text-slate-900">{focusedEntry.session.passed ? 'Passed' : 'Review'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Time</p>
                                                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatDuration(focusedEntry.session.time_taken_seconds)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {[
                                                { label: 'Fast finishers', value: paceSummary.fast },
                                                { label: 'Steady cadence', value: paceSummary.steady },
                                                { label: 'Full-duration runs', value: paceSummary.stretch },
                                            ].map((item) => (
                                                <div key={item.label} className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                                                    <span className="text-sm text-slate-600">{item.label}</span>
                                                    <span className="font-[Geist_Mono] text-lg text-slate-950">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                                        No student focus available yet.
                                    </div>
                                )}
                            </motion.section>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
                        <motion.section
                            {...fadeUp(0.28)}
                            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.08)] xl:col-span-8"
                        >
                            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Submission roster</p>
                                    <h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">Ranked, filterable, and live</h3>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="relative min-w-55">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search student"
                                            className="h-10 rounded-full border-slate-200 pl-9"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                                        {[
                                            { key: 'all', label: 'All' },
                                            { key: 'passed', label: 'Passed' },
                                            { key: 'risk', label: 'Risk' },
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => setRosterFilter(item.key as 'all' | 'passed' | 'risk')}
                                                className={cn(
                                                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                                                    rosterFilter === item.key
                                                        ? 'bg-slate-950 text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-900',
                                                )}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="max-h-140 space-y-3 overflow-y-auto p-4">
                                {filteredRoster.length === 0 ? (
                                    <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                                        No students match the current search or filter.
                                    </div>
                                ) : (
                                    filteredRoster.map((item, index) => {
                                        const selected = item.session.student_id === selectedStudentId;
                                        const percentage = item.session.percentage ?? 0;
                                        return (
                                            <motion.button
                                                key={item.session.id}
                                                type="button"
                                                initial={{ opacity: 0, y: 14 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.32 + index * 0.03, duration: 0.3 }}
                                                onClick={() => setFocusedStudentId(item.session.student_id)}
                                                className={cn(
                                                    'w-full rounded-3xl border px-4 py-4 text-left transition',
                                                    selected
                                                        ? 'border-cyan-200 bg-[linear-gradient(135deg,#ecfeff,#ffffff)] shadow-[0_18px_45px_rgba(14,165,233,0.12)]'
                                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                                                )}
                                            >
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold text-slate-900">
                                                                {index + 1}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-slate-950">{item.name}</p>
                                                                <p className="truncate text-xs text-slate-500">{item.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4">
                                                            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                                                <span>Score trace</span>
                                                            </div>
                                                            <div className="h-2 overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-slate-300/60">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${percentage}%` }}
                                                                    transition={{ delay: 0.36 + index * 0.02, duration: 0.45, ease: 'easeOut' }}
                                                                    className="h-full rounded-full shadow-[0_2px_8px_rgba(15,23,42,0.22)]"
                                                                    style={{
                                                                        minWidth: percentage > 0 ? '10px' : '0px',
                                                                        backgroundImage: percentage >= (exam?.passing_score ?? 60)
                                                                            ? 'linear-gradient(90deg, #22d3ee, #6366f1)'
                                                                            : 'linear-gradient(90deg, #fbbf24, #f43f5e)',
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 lg:w-70 lg:grid-cols-3">
                                                        <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3">
                                                            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Score</p>
                                                            <p className="mt-2 font-[Geist_Mono] text-2xl text-slate-950">{percentage}%</p>
                                                        </div>
                                                        <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3">
                                                            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Time</p>
                                                            <p className="mt-2 text-sm font-semibold text-slate-950">{formatDuration(item.session.time_taken_seconds)}</p>
                                                        </div>
                                                        <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3">
                                                            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Finish</p>
                                                            <p className="mt-2 text-sm font-semibold text-slate-950">{formatRelative(item.session.completed_at)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })
                                )}
                            </div>
                        </motion.section>

                        <div className="grid gap-5 xl:col-span-4">
                            <motion.section
                                {...fadeUp(0.34)}
                                className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)]"
                            >
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Question matrix</p>
                                        <h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">Hardest prompts first</h3>
                                    </div>
                                    <Sparkles className="h-4 w-4 text-cyan-500" />
                                </div>

                                <div className="space-y-3">
                                    {questionInsights.length === 0 ? (
                                        <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                                            Question insights will appear once answer traces are present.
                                        </div>
                                    ) : (
                                        questionInsights.slice(0, 6).map((item, index) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.38 + index * 0.04, duration: 0.28 }}
                                                className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">Q{index + 1}. {item.text}</p>
                                                        <p className="mt-1 text-xs text-slate-500">{item.attempts} attempts • {item.points ?? 0} pts</p>
                                                    </div>
                                                    <span className="font-[Geist_Mono] text-lg text-slate-950">{item.accuracy}%</span>
                                                </div>
                                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${item.accuracy}%` }}
                                                        transition={{ delay: 0.42 + index * 0.04, duration: 0.45, ease: 'easeOut' }}
                                                        className={cn(
                                                            'h-full rounded-full bg-linear-to-r',
                                                            item.accuracy >= 70
                                                                ? 'from-cyan-400 to-blue-500'
                                                                : item.accuracy >= 50
                                                                    ? 'from-amber-300 to-orange-500'
                                                                    : 'from-rose-300 to-red-500',
                                                        )}
                                                    />
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </motion.section>

                            <motion.section
                                {...fadeUp(0.4)}
                                className="rounded-[28px] border border-slate-200 bg-white/95 p-5 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
                            >
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Completion pulse</p>
                                        <h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">Distribution and recent closes</h3>
                                    </div>
                                    <Medal className="h-4 w-4 text-cyan-500" />
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        {scoreBands.map((band, index) => (
                                            <div key={band.label} className="mb-3 last:mb-0">
                                                <div className="mb-2 flex items-center justify-between text-sm">
                                                    <span className="text-slate-600">{band.label}</span>
                                                    <span className="font-[Geist_Mono] text-slate-950">{band.count}</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${stats.total ? (band.count / stats.total) * 100 : 0}%` }}
                                                        transition={{ delay: 0.44 + index * 0.05, duration: 0.42, ease: 'easeOut' }}
                                                        className="h-full rounded-full shadow-[0_2px_8px_rgba(15,23,42,0.2)]"
                                                        style={{
                                                            backgroundImage: band.gradient,
                                                            minWidth: band.count > 0 ? '10px' : '0px',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-3 border-t border-slate-200 pt-4">
                                        {recentSessions.map((session) => (
                                            <div key={session.id} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-950">{session.name}</p>
                                                        <p className="text-xs text-slate-500">{formatRelative(session.completedAt)}</p>
                                                    </div>
                                                    <span className="font-[Geist_Mono] text-xl text-slate-950">{session.percentage}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.section>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
