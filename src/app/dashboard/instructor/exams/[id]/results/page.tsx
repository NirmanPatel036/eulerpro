'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    BarChart2,
    ChevronRight,
    Clock,
    Loader2,
    Medal,
    User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

type ExamRow = {
    id: string;
    title: string;
    passing_score: number | null;
    duration: number | null;
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
};

type ProfileMap = Record<string, { full_name: string | null; email: string | null }>;

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
    return `${mins}m ${secs}s`;
}

export default function InstructorExamResultsPage() {
    const params = useParams<{ id: string }>();
    const examId = params?.id;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exam, setExam] = useState<ExamRow | null>(null);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [profiles, setProfiles] = useState<ProfileMap>({});

    useEffect(() => {
        (async () => {
            if (!examId) return;

            setLoading(true);
            setError(null);

            const supabase = createClient();
            const { data: auth } = await supabase.auth.getUser();
            const user = auth.user;

            if (!user) {
                setError('Not authenticated');
                setLoading(false);
                return;
            }

            const { data: examRow, error: examErr } = await supabase
                .from('exams')
                .select('id, title, passing_score, duration, instructor_id')
                .eq('id', examId)
                .single();

            if (examErr || !examRow) {
                setError(examErr?.message ?? 'Exam not found');
                setLoading(false);
                return;
            }

            if (examRow.instructor_id !== user.id) {
                setError('You are not allowed to view this exam.');
                setLoading(false);
                return;
            }

            setExam({
                id: examRow.id,
                title: examRow.title,
                passing_score: examRow.passing_score,
                duration: examRow.duration,
            });

            const { data: sessionRows, error: sessErr } = await supabase
                .from('exam_sessions')
                .select('id, student_id, percentage, score, max_score, passed, completed_at, time_taken_seconds')
                .eq('exam_id', examId)
                .eq('status', 'completed')
                .order('completed_at', { ascending: false });

            if (sessErr) {
                setError(sessErr.message);
                setLoading(false);
                return;
            }

            const rows = (sessionRows ?? []) as SessionRow[];
            setSessions(rows);

            const studentIds = [...new Set(rows.map((row) => row.student_id).filter(Boolean))];
            if (studentIds.length) {
                const { data: profileRows } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', studentIds);

                const mapped = ((profileRows ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>).reduce<ProfileMap>((acc, row) => {
                    acc[row.id] = { full_name: row.full_name, email: row.email };
                    return acc;
                }, {});
                setProfiles(mapped);
            }

            setLoading(false);
        })();
    }, [examId]);

    const stats = useMemo(() => {
        const total = sessions.length;
        const passed = sessions.filter((s) => s.passed).length;
        const avg = total
            ? Math.round(sessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / total)
            : 0;
        return { total, passed, avg };
    }, [sessions]);

    if (loading) {
        return (
            <div className="instructor-home flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="instructor-home">
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
                <Button variant="outline" onClick={() => router.push('/dashboard/instructor/exams')}>
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Exams
                </Button>
            </div>
        );
    }

    return (
        <div className="instructor-home">
            <div className="instructor-home__header mb-5">
                <div>
                    <p className="instructor-home__breadcrumb">
                        <span
                            className="cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => router.push('/dashboard/instructor/exams')}
                        >
                            Exams
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="font-semibold text-gray-900">Results</span>
                    </p>
                    <h1 className="instructor-home__title">{exam?.title ?? 'Exam Results'}</h1>
                </div>
                <div className="instructor-home__header-actions">
                    <Button variant="outline" onClick={() => router.push('/dashboard/instructor/exams')}>
                        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs text-gray-400">Submissions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs text-gray-400">Passed</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.passed}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs text-gray-400">Average</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.avg}%</p>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="grid grid-cols-12 gap-2 border-b border-gray-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <div className="col-span-4">Student</div>
                    <div className="col-span-2">Score</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Time Taken</div>
                    <div className="col-span-2">Completed</div>
                </div>

                {sessions.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-gray-400">
                        No completed submissions yet.
                    </div>
                ) : (
                    sessions.map((session) => {
                        const profile = profiles[session.student_id];
                        const displayName = profile?.full_name?.trim() || profile?.email || 'Unknown student';
                        return (
                            <div key={session.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-50 last:border-b-0 text-sm">
                                <div className="col-span-4 min-w-0">
                                    <p className="font-semibold text-gray-800 truncate">{displayName}</p>
                                    <p className="text-xs text-gray-400 truncate">{profile?.email ?? session.student_id}</p>
                                </div>
                                <div className="col-span-2 flex items-center gap-1 text-gray-700 font-medium">
                                    <BarChart2 className="w-3.5 h-3.5 text-gray-400" />
                                    {session.percentage ?? 0}%
                                </div>
                                <div className="col-span-2 flex items-center gap-1">
                                    {session.passed ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 text-xs font-semibold">
                                            <Medal className="w-3 h-3" /> Passed
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 text-red-600 px-2 py-0.5 text-xs font-semibold">
                                            <User className="w-3 h-3" /> Not Passed
                                        </span>
                                    )}
                                </div>
                                <div className="col-span-2 flex items-center gap-1 text-gray-600">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    {formatDuration(session.time_taken_seconds)}
                                </div>
                                <div className="col-span-2 text-gray-500 text-xs flex items-center">
                                    {formatDate(session.completed_at)}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
