'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    Plus, Search, MoreHorizontal,
    Eye, Edit, Trash2, Users, Clock, BookOpen, ChevronRight, Loader2,
    Copy, Archive, BarChart2, Send, AlertTriangle, Rocket, GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

type CourseOption = { id: string; name: string; code: string | null };

type ExamRow = {
    id: string;
    title: string;
    course: string | null;
    status: string;
    duration: number;
    scheduled_at: string | null;
    created_at: string;
    cover_image_url: string | null;
    questions: { count: number }[];
    exam_enrollments: { count: number }[];
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    active:    { label: 'Live',      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    conducted: { label: 'Conducted', cls: 'bg-violet-100  text-violet-700  border-violet-200'   },
    scheduled: { label: 'Scheduled', cls: 'bg-blue-100    text-blue-700    border-blue-200'    },
    draft:     { label: 'Draft',     cls: 'bg-gray-100    text-gray-600    border-gray-200'    },
    archived:  { label: 'Archived',  cls: 'bg-orange-100  text-orange-600  border-orange-200'  },
};


function parseExamDate(iso: string | null) {
    if (!iso) return null;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getExamDisplayStatus(exam: Pick<ExamRow, 'status' | 'scheduled_at' | 'duration'>, nowMs = Date.now()) {
    if (exam.status === 'completed') {
        return 'conducted';
    }

    if (exam.status === 'draft' || exam.status === 'archived') {
        return exam.status;
    }

    const scheduledDate = parseExamDate(exam.scheduled_at);
    if (scheduledDate && scheduledDate.getTime() > nowMs) {
        return 'scheduled';
    }

    if (scheduledDate) {
        const endMs = scheduledDate.getTime() + Math.max(0, exam.duration) * 60_000;
        if (nowMs >= endMs) {
            return 'conducted';
        }
    }

    return 'active';
}

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.36, delay, ease: 'easeOut' as const },
});

function fmtDate(iso: string | null) {
    const parsed = parseExamDate(iso);
    if (!parsed) return 'Not scheduled';
    return parsed.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
}

export default function InstructorExamsPage() {
    const router = useRouter();
    const [exams,    setExams]    = useState<ExamRow[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState<string | null>(null);
    const [search,   setSearch]   = useState('');
    const [filter,   setFilter]   = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    /* delete confirm modal */
    const [deleteTarget, setDeleteTarget] = useState<ExamRow | null>(null);

    /* publish modal */
    const [publishTarget,  setPublishTarget]  = useState<ExamRow | null>(null);
    const [courses,        setCourses]        = useState<CourseOption[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [publishing,     setPublishing]     = useState(false);
    const [publishOk,      setPublishOk]      = useState<string | null>(null);

    /* copy-link toast */
    const [copied, setCopied] = useState<string | null>(null);
    const [statusNow, setStatusNow] = useState(0);

    const fetchExams = useCallback(async () => {
        setLoading(true);
        setError(null);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError('Not authenticated'); setLoading(false); return; }

        const { data, error: err } = await supabase
            .from('exams')
            .select(`
                id, title, course, status, duration, scheduled_at, created_at, cover_image_url,
                questions(count),
                exam_enrollments(count)
            `)
            .eq('instructor_id', user.id)
            .order('created_at', { ascending: false });

        if (err) setError(err.message);
        else setExams((data ?? []) as ExamRow[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchExams(); }, [fetchExams]);

    useEffect(() => {
        setStatusNow(Date.now());
        const timer = setInterval(() => setStatusNow(Date.now()), 30_000);
        return () => clearInterval(timer);
    }, []);

    /* open publish modal → fetch courses */
    const openPublishModal = async (exam: ExamRow) => {
        setPublishTarget(exam);
        setSelectedCourse('');
        setPublishOk(null);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
            .from('courses')
            .select('id, name, code')
            .eq('instructor_id', user.id)
            .order('created_at', { ascending: false });
        setCourses((data ?? []) as CourseOption[]);
    };

    const handlePublish = async () => {
        if (!publishTarget || !selectedCourse) return;
        setPublishing(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setPublishing(false); return; }

        const res = await fetch(
            `${BACKEND}/api/v1/courses/${encodeURIComponent(selectedCourse)}/publish-exam?instructor_id=${encodeURIComponent(user.id)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exam_id: publishTarget.id, instructor_id: user.id }),
            }
        );
        const json = await res.json();
        setPublishing(false);
        if (!res.ok) { setPublishOk(`✗ ${json.detail ?? 'Publish failed'}`); return; }
        setPublishOk(`✓ Published — ${json.emails_sent ?? 0} student${json.emails_sent !== 1 ? 's' : ''} notified`);
        fetchExams();
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(deleteTarget.id);
        setDeleteTarget(null);
        const supabase = createClient();
        await supabase.from('exams').delete().eq('id', deleteTarget.id);
        setExams(p => p.filter(e => e.id !== deleteTarget.id));
        setDeleting(null);
    };

    const handleDuplicate = async (exam: ExamRow) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: newExam, error: err } = await supabase
            .from('exams')
            .insert({
                instructor_id: user.id,
                title:         `${exam.title} (Copy)`,
                course:        exam.course,
                status:        'draft',
                duration:      exam.duration,
                scheduled_at:  null,
            })
            .select('id')
            .single();

        if (err || !newExam) return;

        // Copy questions
        const { data: qs } = await supabase
            .from('questions')
            .select('*')
            .eq('exam_id', exam.id);

        if (qs?.length) {
            await supabase.from('questions').insert(
                qs.map(({ id: _id, exam_id: _eid, ...rest }: { id: string; exam_id: string; [key: string]: unknown }) => ({
                    ...rest,
                    exam_id: newExam.id,
                }))
            );
        }

        fetchExams();
        router.push(`/dashboard/instructor/exams/${newExam.id}/edit`);
    };

    const handleArchive = async (exam: ExamRow) => {
        const supabase = createClient();
        await supabase.from('exams').update({ status: 'archived' }).eq('id', exam.id);
        setExams(p => p.map(e => e.id === exam.id ? { ...e, status: 'archived' } : e));
    };

    const handleCopyLink = (examId: string) => {
        const url = `${window.location.origin}/exam/${examId}/verify`;
        navigator.clipboard.writeText(url);
        setCopied(examId);
        setTimeout(() => setCopied(null), 2000);
    };

    const visible = exams.filter(e => {
        const matchText   = e.title.toLowerCase().includes(search.toLowerCase()) ||
                            (e.course ?? '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = filter ? getExamDisplayStatus(e, statusNow) === filter : true;
        return matchText && matchStatus;
    });

    return (
        <div className="instructor-home">
            {/* Header */}
            <motion.div {...fadeUp(0)} className="instructor-home__header">
                <div>
                    <p className="instructor-home__breadcrumb">
                        <span>My Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="font-semibold text-gray-900">Exams</span>
                    </p>
                    <h1 className="instructor-home__title">My Arena</h1>
                </div>
                <div className="instructor-home__header-actions">
                    <Link href="/dashboard/instructor/exams/new">
                        <Button className="instructor-home__new-btn">
                            <Plus className="w-4 h-4" /> New Exam
                        </Button>
                    </Link>
                </div>
            </motion.div>

            {/* Search + filter bar */}
            <motion.div {...fadeUp(0.08)} className="flex items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
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
                    {(['active', 'conducted', 'scheduled', 'draft'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(filter === s ? null : s)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                                filter === s
                                    ? STATUS_CFG[s].cls + ' shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
                            )}
                        >
                            {STATUS_CFG[s].label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Error */}
            {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {[1, 2, 3, 4].map(n => (
                        <div key={n} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse" style={{ minHeight: '300px' }}>
                            <div className="h-40 bg-gray-100" />
                            <div className="px-4 pt-3.5 pb-4 space-y-2.5">
                                <div className="h-4 bg-gray-100 rounded w-3/4" />
                                <div className="h-3 bg-gray-100 rounded w-1/2" />
                                <div className="h-3 bg-gray-100 rounded w-2/3" />
                                <div className="h-8 bg-gray-100 rounded-lg w-full mt-2" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Exam list */}
            {!loading && (
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                >
                    {visible.length === 0 && (
                        <motion.div {...fadeUp(0)} className="col-span-full py-16 flex flex-col items-center gap-2">
                            <p className="text-3xl">📋</p>
                            <p className="text-sm font-medium text-gray-400">No exams yet</p>
                            <p className="text-xs text-gray-300">Create your first exam to get started</p>
                            <Link href="/dashboard/instructor/exams/new" className="mt-3">
                                <Button size="sm" className="text-xs bg-[#4b3fe9] hover:bg-[#3228d4] text-white gap-1.5">
                                    <Plus className="w-3.5 h-3.5" /> New Exam
                                </Button>
                            </Link>
                        </motion.div>
                    )}
                    {visible.map(exam => {
                        const displayStatus = getExamDisplayStatus(exam, statusNow);
                        const cfg    = STATUS_CFG[displayStatus] ?? STATUS_CFG.draft;
                        const showMonitorButton = displayStatus === 'active';
                        const showResultsButton = displayStatus === 'conducted';
                        const hasPrimaryAction = showMonitorButton || showResultsButton;
                        const qCount = exam.questions?.[0]?.count ?? 0;
                        const sCount = exam.exam_enrollments?.[0]?.count ?? 0;
                        return (
                            <motion.div
                                key={exam.id}
                                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                                transition={{ duration: 0.32, ease: 'easeOut' }}
                                className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow group"
                            >
                                {/* ── Cover image ───────────────────────────── */}
                                <div className="relative h-40 bg-linear-to-br from-indigo-400 to-purple-500 shrink-0">
                                    {exam.cover_image_url && (
                                        <img
                                            src={exam.cover_image_url}
                                            alt="Exam cover"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />

                                    {/* Status badge */}
                                    <div className="absolute bottom-2.5 left-3">
                                        <Badge className={cn('text-[10px] px-2 py-0.5 border font-semibold backdrop-blur-sm', cfg.cls)}>
                                            {cfg.label}
                                        </Badge>
                                    </div>

                                    {/* ⋯ menu */}
                                    <div className="absolute top-2.5 right-2.5">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    size="sm" variant="ghost"
                                                    className="h-7 w-7 p-0 bg-black/25 hover:bg-black/45 backdrop-blur-sm text-white rounded-lg border-0"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44 text-sm">
                                                {displayStatus === 'draft' && (
                                                    <>
                                                        <DropdownMenuItem
                                                            className="gap-2 cursor-pointer text-white focus:text-indigo-600"
                                                            onClick={() => openPublishModal(exam)}
                                                        >
                                                            <Rocket className="w-3.5 h-3.5" />
                                                            Publish
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                    </>
                                                )}
                                                <DropdownMenuItem
                                                    className="gap-2 cursor-pointer"
                                                    onClick={() => handleDuplicate(exam)}
                                                >
                                                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                                                    Duplicate
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="gap-2 cursor-pointer"
                                                    onClick={() => handleCopyLink(exam.id)}
                                                >
                                                    <Send className="w-3.5 h-3.5 text-gray-400" />
                                                    {copied === exam.id ? 'Copied!' : 'Copy Exam Link'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="gap-2 cursor-pointer"
                                                    onClick={() => router.push(`/dashboard/instructor/results/${exam.id}`)}
                                                >
                                                    <BarChart2 className="w-3.5 h-3.5 text-gray-400" />
                                                    View Results
                                                </DropdownMenuItem>
                                                {displayStatus !== 'archived' && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="gap-2 cursor-pointer text-orange-600 focus:text-orange-600"
                                                            onClick={() => handleArchive(exam)}
                                                        >
                                                            <Archive className="w-3.5 h-3.5" />
                                                            Archive
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* ── Info + actions ────────────────────────── */}
                                <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4 gap-2">
                                    {/* Title */}
                                    <p className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">{exam.title}</p>

                                    {/* Course */}
                                    {exam.course && (
                                        <div>
                                            <Badge className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 truncate max-w-full">
                                                {exam.course}
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap mt-0.5">
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {sCount} enrolled</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration} min</span>
                                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {qCount} Q</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400">{fmtDate(exam.scheduled_at)}</p>

                                    {/* Action bar */}
                                    <div className="flex items-center gap-1.5 mt-auto pt-2.5 border-t border-gray-100">
                                        {showMonitorButton && (
                                            <Link href="/dashboard/instructor/proctoring" className="flex-1">
                                                <Button size="sm" variant="outline" className="w-full h-8 text-xs text-emerald-600 border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50 gap-1">
                                                    <Eye className="w-3.5 h-3.5" /> Monitor
                                                </Button>
                                            </Link>
                                        )}
                                        {showResultsButton && (
                                            <Link href={`/dashboard/instructor/results/${exam.id}`} className="flex-1">
                                                <Button size="sm" variant="outline" className="w-full h-8 text-xs text-blue-500 border-blue-200 hover:text-blue-600 hover:bg-blue-50 gap-1">
                                                    <BarChart2 className="w-3.5 h-3.5" /> Results
                                                </Button>
                                            </Link>
                                        )}
                                        <Button
                                            size="sm" variant="outline"
                                            className={cn(
                                                'h-8 text-xs text-white hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 gap-1',
                                                hasPrimaryAction ? 'w-8 p-0' : 'flex-1'
                                            )}
                                            onClick={() => router.push(`/dashboard/instructor/exams/${exam.id}/edit`)}
                                            title="Edit exam"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            {!hasPrimaryAction && <span>Edit</span>}
                                        </Button>
                                        <Button
                                            size="sm" variant="ghost"
                                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                                            disabled={deleting === exam.id}
                                            onClick={() => setDeleteTarget(exam)}
                                            title="Delete exam"
                                        >
                                            {deleting === exam.id
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <Trash2 className="w-3.5 h-3.5" />}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {/* ── Publish modal ────────────────────────────────────────────── */}
            <Dialog open={!!publishTarget} onOpenChange={open => { if (!open) { setPublishTarget(null); setPublishOk(null); } }}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-indigo-500" /> Publish Exam
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 mt-1">
                            Select a course — enrolled students will receive an email notification.
                        </DialogDescription>
                    </DialogHeader>

                    {publishOk ? (
                        <div className={cn(
                            'rounded-xl px-4 py-3 text-sm font-medium mb-2',
                            publishOk.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                        )}>
                            {publishOk}
                        </div>
                    ) : (
                        <div className="py-2">
                            {courses.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">
                                    No courses yet. <a href="/dashboard/instructor/courses" className="text-indigo-500 underline">Create one first.</a>
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                        <GraduationCap className="w-3.5 h-3.5" /> Course
                                    </label>
                                    <select
                                        value={selectedCourse}
                                        onChange={e => setSelectedCourse(e.target.value)}
                                        className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    >
                                        <option value="">Select a course…</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.code ? `[${c.code}] ` : ''}{c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" className="text-xs h-9" onClick={() => { setPublishTarget(null); setPublishOk(null); }}>
                            {publishOk ? 'Close' : 'Cancel'}
                        </Button>
                        {!publishOk && (
                            <Button
                                className="text-xs h-9 bg-[#4b3fe9] hover:bg-[#3228d4] text-white gap-1.5"
                                onClick={handlePublish}
                                disabled={!selectedCourse || publishing}
                            >
                                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                                Publish &amp; Notify
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete confirm modal ─────────────────────────────────────── */}
            <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" /> Delete Exam?
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 mt-1">
                            <span className="font-semibold text-gray-700">&ldquo;{deleteTarget?.title}&rdquo;</span> will be permanently deleted along with all its questions and session data. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" className="text-xs h-9" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white"
                            onClick={confirmDelete}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
