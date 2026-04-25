'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    BookOpen, Clock, ChevronRight, Search,
    CalendarDays, Zap, CheckCircle, Lock,
    BookOpenCheck,
    BookHeartIcon,
    ComputerIcon,
    Tickets,
    Waypoints,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type ExamEnrollment = {
    id: string;
    exam_id: string;
    invited_at: string;
    session_status: string | null;
    exams: {
        id: string;
        course_id: string | null;
        title: string;
        course: string | null;
        status: string;
        duration: number;
        scheduled_at: string | null;
        cover_image_url: string | null;
        questions: { count: number }[];
        courses: { name: string; code: string | null } | null;
    };
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    active:    { label: 'Live Now',        cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Zap },
    scheduled: { label: 'Upcoming',        cls: 'bg-blue-100    text-blue-700    border-blue-200',    icon: Lock },
    expired:   { label: 'Not Available',   cls: 'bg-rose-100    text-rose-700    border-rose-200',    icon: Clock },
    completed: { label: 'Completed',       cls: 'bg-violet-100  text-violet-700  border-violet-200',  icon: CheckCircle },
    draft:     { label: 'Not Ready',       cls: 'bg-gray-100    text-gray-500    border-gray-200',    icon: CalendarDays },
};

function parseExamDate(iso: string | null) {
    if (!iso) return null;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getExamDisplayStatus(exam: ExamEnrollment['exams'], sessionStatus: string | null, nowMs = Date.now()) {
    if (sessionStatus === 'completed') return 'completed';
    if (exam.status === 'draft') return 'draft';

    const scheduledDate = parseExamDate(exam.scheduled_at);
    if (scheduledDate && scheduledDate.getTime() > nowMs) {
        return 'scheduled';
    }

    // Mark as expired only when the exam window has elapsed and the student never attempted it.
    const unattempted = !sessionStatus;
    if (scheduledDate && unattempted) {
        const examEndMs = scheduledDate.getTime() + Math.max(exam.duration, 0) * 60_000;
        if (nowMs > examEndMs) return 'expired';
    }

    return exam.status === 'archived' ? 'draft' : 'active';
}

function formatStartsIn(iso: string | null, nowMs: number) {
    const scheduledDate = parseExamDate(iso);
    if (!scheduledDate) return 'Upcoming';

    const diffMs = scheduledDate.getTime() - nowMs;
    if (diffMs <= 0) return 'Starting...';

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let countdown = '';
    if (days > 0) {
        countdown = `${days}d ${hours}h`;
    } else if (hours > 0) {
        countdown = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        countdown = `${minutes}m ${seconds}s`;
    } else {
        countdown = `${seconds}s`;
    }

    return `Starts in ${countdown}`;
}

function fmtDate(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
}

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.36, delay, ease: 'easeOut' as const },
});

/* ─── Cover palette (fallback gradient when no image) ────────────────────── */

const COVER_PALETTES = [
    'from-indigo-400 to-purple-500',
    'from-blue-400 to-cyan-400',
    'from-emerald-400 to-teal-500',
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-violet-400 to-fuchsia-500',
];

function hashPalette(str: string) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return COVER_PALETTES[h % COVER_PALETTES.length];
}

/* ─── Exam Card ──────────────────────────────────────────────────────────── */

function ExamCard({ enrollment, nowMs }: { enrollment: ExamEnrollment; nowMs: number }) {
    const router  = useRouter();
    const exam    = enrollment.exams;
    const displayStatus = getExamDisplayStatus(exam, enrollment.session_status, nowMs);
    const cfg     = STATUS_CFG[displayStatus] ?? STATUS_CFG.draft;
    const StatusIcon = cfg.icon;
    const qCount  = exam.questions?.[0]?.count ?? 0;
    const palette = hashPalette(exam.id);
    const alreadyDone = enrollment.session_status === 'completed';
    const isResuming   = enrollment.session_status === 'active';
    const canStart    = (displayStatus === 'active' || isResuming) && !alreadyDone;
    const isScheduled = displayStatus === 'scheduled';
    const isExpired   = displayStatus === 'expired';
    
    const actionLabel = alreadyDone
        ? 'View Results'
        : isResuming
            ? 'Resume Exam'
            : canStart
                ? 'Start Exam'
                : isScheduled
                    ? formatStartsIn(exam.scheduled_at, nowMs)
                    : isExpired
                        ? 'Expired'
                    : cfg.label;

    return (
        <motion.div
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
        >
            {/* Cover */}
            <div className="relative h-32">
                {exam.cover_image_url ? (
                    <img
                        src={exam.cover_image_url}
                        alt="Cover"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className={cn('w-full h-full bg-linear-to-br', palette)} />
                )}
                {/* Status badge */}
                <Badge className={cn('absolute top-2 left-2 text-[10px] px-2 py-0 font-medium flex items-center gap-1 backdrop-blur-md bg-white/20! shadow-[0_6px_20px_rgba(15,23,42,0.18)]', isResuming ? 'bg-amber-100 text-amber-700 border-amber-200' : cfg.cls)}>
                    {isResuming ? <Zap className="w-2.5 h-2.5" /> : <StatusIcon className="w-2.5 h-2.5" />}
                    {isResuming ? 'In Progress' : cfg.label}
                </Badge>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
                <h3 className="font-semibold text-sm text-gray-800 truncate mb-0.5">{exam.title}</h3>
                {/* Course name + code badge + duration */}
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                    {exam.courses?.code && (
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 shrink-0">
                            {exam.courses.code}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {exam.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {qCount} Questions
                    </span>
                </div>
                {exam.scheduled_at && (
                    <p className="text-[11px] text-gray-400 mb-3 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> {fmtDate(exam.scheduled_at)}
                    </p>
                )}
                <Button
                    size="sm"
                    className={cn(
                        'w-full text-xs h-8',
                        alreadyDone
                            ? 'bg-violet-100 hover:bg-violet-200 text-violet-700 border border-violet-200'
                            : isResuming
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : canStart
                                    ? 'bg-[#4b3fe9] hover:bg-[#3228d4] text-white'
                                    : isScheduled
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200 cursor-not-allowed hover:bg-blue-50'
                                        : isExpired
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200 cursor-not-allowed hover:bg-rose-50'
                                        : 'bg-gray-100 text-gray-500 cursor-not-allowed hover:bg-gray-100',
                    )}
                    disabled={!canStart && !alreadyDone}
                    onClick={() => {
                        if (alreadyDone) router.push(`/exam/${exam.id}/results`);
                        else if (isResuming) router.push(`/exam/${exam.id}/take`);
                        else if (canStart) router.push(`/exam/${exam.id}/password`);
                    }}
                >
                    {alreadyDone
                        ? <><Waypoints className="w-3 h-3 mr-1.5" /> View Results</>
                        : isResuming
                            ? <><Zap className="w-3 h-3 mr-1.5" /> Resume Exam</>
                            : canStart
                                ? <><Tickets className="w-3 h-3 mr-1.5" /> Start Exam</>
                                : actionLabel}
                </Button>
            </div>
        </motion.div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function StudentExamsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [enrollments, setEnrollments] = useState<ExamEnrollment[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState<string | null>(null);
    const [search,      setSearch]      = useState('');
    const [filter,      setFilter]      = useState<string | null>(null);
    const [nowMs,       setNowMs]       = useState(0);

    const selectedCourseId = searchParams.get('courseId');

    useEffect(() => {
        setNowMs(Date.now());
        const intervalId = window.setInterval(() => {
            setNowMs(Date.now());
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, []);

    const fetchEnrollments = useCallback(async () => {
        setLoading(true);
        setError(null);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError('Not authenticated'); setLoading(false); return; }
        const userEmail = user.email?.trim().toLowerCase();

        const { data, error: err } = await supabase
            .from('exam_enrollments')
            .select(`
                id,
                exam_id,
                invited_at,
                exams (
                    id, course_id, title, course, status, duration, scheduled_at,
                    cover_image_url, questions(count),
                    courses ( name, code )
                )
            `)
            .eq('student_id', user.id)
            .order('invited_at', { ascending: false });

        if (err) { setError(err.message); setLoading(false); return; }

        const directEnrollments = (data ?? []) as unknown as ExamEnrollment[];
        const directExamIds = new Set(directEnrollments.map((row) => row.exam_id));
        
        // Filter out exams that the user had been invited to(enrolled by instructor, but created an account later)
        let derivedEnrollments: ExamEnrollment[] = [];

        if (userEmail) {
            const { data: rosterRows, error: rosterErr } = await supabase
                .from('course_enrollments')
                .select('course_id')
                .eq('student_email', userEmail);

            if (rosterErr) { setError(rosterErr.message); setLoading(false); return; }

            const courseIds = [...new Set(((rosterRows ?? []) as Array<{ course_id: string | null }>)
                .map((row) => row.course_id)
                .filter((courseId): courseId is string => Boolean(courseId)))];

            if (courseIds.length) {
                const { data: courseExams, error: courseExamsErr } = await supabase
                    .from('exams')
                    .select(`
                        id, course_id, title, course, status, duration, scheduled_at,
                        cover_image_url, questions(count),
                        courses ( name, code )
                    `)
                    .in('course_id', courseIds)
                    .neq('status', 'draft')
                    .order('scheduled_at', { ascending: false });

                if (courseExamsErr) { setError(courseExamsErr.message); setLoading(false); return; }

                const missingCourseExams = ((courseExams ?? []) as ExamEnrollment['exams'][])
                    .filter((exam) => !directExamIds.has(exam.id));

                if (missingCourseExams.length) {
                    await supabase
                        .from('exam_enrollments')
                        .upsert(
                            missingCourseExams.map((exam) => ({ exam_id: exam.id, student_id: user.id })),
                            { onConflict: 'exam_id,student_id', ignoreDuplicates: true },
                        );

                    derivedEnrollments = missingCourseExams.map((exam) => ({
                        id: `derived-${exam.id}`,
                        exam_id: exam.id,
                        invited_at: exam.scheduled_at ?? new Date().toISOString(),
                        session_status: null,
                        exams: exam,
                    }));
                }
            }
        }

        // Fetch session statuses separately (no direct FK between enrollments and sessions)
        const examIds = [...new Set([...directEnrollments, ...derivedEnrollments].map((row) => row.exam_id))];
        const { data: sessions } = examIds.length
            ? await supabase
                .from('exam_sessions')
                .select('exam_id, status')
                .eq('student_id', user.id)
                .in('exam_id', examIds)
            : { data: [] };

        const sessionMap = new Map<string, string>();
        for (const s of (sessions ?? []) as { exam_id: string; status: string }[]) {
            // keep the most recent / 'completed' status per exam
            if (!sessionMap.has(s.exam_id) || s.status === 'completed') {
                sessionMap.set(s.exam_id, s.status);
            }
        }

        const mapped = [...directEnrollments, ...derivedEnrollments].map((row) => ({
            ...row,
            session_status: sessionMap.get(row.exam_id) ?? row.session_status,
        }));

        setEnrollments(mapped);
        setLoading(false);
    }, []);

    useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

    const activeCourseLabel = useMemo(() => {
        if (!selectedCourseId) return null;
        const match = enrollments.find((entry) => entry.exams.course_id === selectedCourseId)?.exams;
        if (!match?.courses) return 'Selected Course';
        return match.courses.code
            ? `${match.courses.code} · ${match.courses.name}`
            : match.courses.name;
    }, [enrollments, selectedCourseId]);

    const visible = enrollments.filter(e => {
        const exam = e.exams;
        const matchText = exam.title.toLowerCase().includes(search.toLowerCase()) ||
            (exam.course ?? '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = filter ? getExamDisplayStatus(exam, e.session_status, nowMs) === filter : true;
        const matchCourse = selectedCourseId ? exam.course_id === selectedCourseId : true;
        return matchText && matchStatus && matchCourse;
    });

    const FILTER_OPTS = [
        { key: 'active',    label: 'Live' },
        { key: 'scheduled', label: 'Upcoming' },
        { key: 'expired',   label: 'Not Available' },
        { key: 'completed', label: 'Completed' },
    ];

    return (
        <div className="px-6 py-8 max-w-5xl mx-auto">
            {/* Header */}
            <motion.div {...fadeUp(0)} className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                        <span>Dashboard</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="font-semibold text-gray-700">My Exams</span>
                    </p>
                    <h1 className="text-2xl font-bold text-gray-900">Exam Enrollments</h1>
                </div>
            </motion.div>

            {/* Search + filter */}
            <motion.div {...fadeUp(0.06)} className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="relative flex-1 min-w-50 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search exams…"
                        className="pl-9 bg-white border-gray-200 text-sm h-9"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilter(null)}
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                            filter === null
                                ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
                        )}
                    >
                        All
                    </button>
                    {FILTER_OPTS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(filter === f.key ? null : f.key)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                                filter === f.key
                                    ? STATUS_CFG[f.key].cls + ' shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {selectedCourseId && (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                        <span className="truncate max-w-56">Course: {activeCourseLabel}</span>
                        <button
                            onClick={() => router.replace(pathname)}
                            className="rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-100"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Error */}
            {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(n => (
                        <div key={n} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
                            <div className="h-32 bg-gray-100" />
                            <div className="p-4 space-y-2">
                                <div className="h-4 bg-gray-100 rounded w-3/4" />
                                <div className="h-3 bg-gray-100 rounded w-1/2" />
                                <div className="h-8 bg-gray-100 rounded mt-3" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && visible.length === 0 && (
                <motion.div {...fadeUp(0)} className="py-20 flex flex-col items-center gap-3 text-center">
                    <p className="text-4xl">📚</p>
                    <p className="text-sm font-semibold text-gray-400">
                        {enrollments.length === 0
                            ? "You're not enrolled in any exams yet"
                            : 'No exams match your search'}
                    </p>
                    <p className="text-xs text-gray-300 max-w-xs">
                        {enrollments.length === 0
                            ? 'Your instructor will enroll you via a course roster.'
                            : 'Try a different search term or filter.'}
                    </p>
                </motion.div>
            )}

            {/* Cards grid */}
            {!loading && visible.length > 0 && (
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    {visible.map(enrollment => (
                        <ExamCard
                            key={enrollment.id}
                            enrollment={enrollment}
                            nowMs={nowMs}
                        />
                    ))}
                </motion.div>
            )}

        </div>
    );
}
