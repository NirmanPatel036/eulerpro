'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Radio, ShieldOff, UserCheck, UserX, Scan, StopCircle,
    Smartphone, RotateCcw, Eye, Layers, MousePointerClick,
    Wifi, WifiOff, TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────────────────
interface FlagEntry {
    type: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    timestamp: string;
}

interface SessionRow {
    id: string;
    student_id: string;
    exam_id: string;
    status: string;
    answers: Record<string, unknown>;
    proctoring_flags: FlagEntry[];
    started_at: string;
    completed_at: string | null;
    profiles: { full_name: string | null; email: string } | null;
    exams: { title: string; duration: number; total_questions?: number } | null;
}

interface FlatFlag extends FlagEntry {
    _id: string;       // synthetic stable key
    studentName: string;
    studentId: string;
    sessionId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const SEV: Record<string, { ring: string; badge: string; dot: string; glow: string }> = {
    high:   { ring: 'border-red-200 bg-red-50/40',   badge: 'bg-red-50 text-red-700 border-red-200',   dot: 'bg-red-400',   glow: 'shadow-red-100' },
    medium: { ring: 'border-amber-200 bg-amber-50/30', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400', glow: 'shadow-amber-100' },
    low:    { ring: 'border-blue-100 bg-blue-50/20',  badge: 'bg-blue-50 text-blue-700 border-blue-100',  dot: 'bg-blue-400',  glow: 'shadow-blue-50' },
};

const FLAG_ICONS: Record<string, React.ElementType> = {
    no_face:           UserX,
    unknown_face:      ShieldOff,
    multiple_faces:    Layers,
    head_movement:     Scan,
    phone_detected:    Smartphone,
    electronic_device: Smartphone,
    tab_switch:        MousePointerClick,
    copy_paste:        RotateCcw,
    unusual_eye_movement: Eye,
};

function flagIcon(type: string): React.ElementType {
    return FLAG_ICONS[type] ?? ShieldOff;
}

function highestSeverity(flags: FlagEntry[]): 'high' | 'medium' | 'low' | null {
    if (flags.some(f => f.severity === 'high'))   return 'high';
    if (flags.some(f => f.severity === 'medium')) return 'medium';
    if (flags.some(f => f.severity === 'low'))    return 'low';
    return null;
}

function progressFromAnswers(answers: Record<string, unknown>, totalQ: number): number {
    if (!totalQ) return 0;
    const answered = Object.values(answers).filter(v => v !== null && v !== '' && v !== undefined).length;
    return Math.round((answered / totalQ) * 100);
}

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function normalizeFlag(raw: unknown, fallbackTimestamp: string): FlagEntry {
    const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
    const type = typeof obj.type === 'string' ? obj.type : 'other';
    const severity = obj.severity === 'high' || obj.severity === 'medium' || obj.severity === 'low'
        ? obj.severity
        : (['no_face', 'unknown_face', 'multiple_faces', 'phone_detected', 'electronic_device'].includes(type) ? 'high'
            : ['head_movement', 'tab_switch', 'copy_paste'].includes(type) ? 'medium'
            : 'low');
    const timestamp = typeof obj.timestamp === 'string' && obj.timestamp.trim()
        ? obj.timestamp
        : fallbackTimestamp;
    const description = typeof obj.description === 'string' && obj.description.trim()
        ? obj.description
        : type.replace(/_/g, ' ');

    return { type, severity, timestamp, description };
}

// ── End Exam Confirmation Modal ──────────────────────────────────────────────
function EndExamModal({ examTitle, onConfirm, onCancel, loading }: {
    examTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onCancel}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="relative z-10 bg-white rounded-2xl border border-gray-100 shadow-2xl p-8 max-w-sm w-full mx-4"
            >
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                    <StopCircle className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">End exam?</h2>
                <p className="text-sm text-gray-500 mb-6">
                    This will force-submit all active sessions for <span className="font-semibold text-gray-700">{examTitle}</span>. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                        {loading ? 'Ending…' : 'End Exam'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Empty / Fallback ───────────────────────────────────────────────────────────
function NoLiveExam() {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <Radio className="w-7 h-7 text-gray-300" />
            </div>
            <div>
                <p className="font-semibold text-gray-700 mb-1">No active exam right now</p>
                <p className="text-sm text-gray-400">Live data will appear here as soon as an exam is in progress.</p>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProctoringMonitorPage() {
    const supabase = createClient();

    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [showEndModal, setShowEndModal] = useState(false);
    const [endingExam, setEndingExam] = useState(false);

    const channelRef = useRef<RealtimeChannel | null>(null);

    // Derive the active exam from sessions (all sessions share the same exam for a live monitor)
    const activeExam = sessions[0]?.exams ?? null;
    const activeExamId = sessions[0]?.exam_id ?? null;

    // Fetch active sessions (status = 'active') with student profile + exam info
    const fetchSessions = useCallback(async () => {
        const { data, error } = await supabase
            .from('exam_sessions')
            .select(`
                id, student_id, status, answers, proctoring_flags,
                started_at, completed_at, exam_id,
                profiles:student_id ( full_name, email ),
                exams:exam_id ( title, duration )
            `)
            .eq('status', 'active')
            .order('started_at', { ascending: false });

        if (!error && data) {
            // Fetch question counts separately since aggregate joins require PostgREST v10+
            const examIds = [...new Set((data as (SessionRow & { exam_id: string })[]).map(s => s.exam_id))];
            let qCounts: Record<string, number> = {};
            if (examIds.length) {
                const { data: qData } = await supabase
                    .from('questions')
                    .select('exam_id')
                    .in('exam_id', examIds);
                if (qData) {
                    qData.forEach((q: { exam_id: string }) => {
                        qCounts[q.exam_id] = (qCounts[q.exam_id] ?? 0) + 1;
                    });
                }
            }
            setSessions((data as SessionRow[]).map(s => ({
                ...s,
                proctoring_flags: (s.proctoring_flags ?? []).map((f) => normalizeFlag(f, s.started_at)),
                exams: s.exams ? { ...s.exams, total_questions: qCounts[s.exam_id] ?? 0 } : null,
            })));
        }
        setLoading(false);
    }, [supabase]);

    // Subscribe to real-time changes on exam_sessions
    useEffect(() => {
        fetchSessions();

        const channel = supabase
            .channel('live-proctor-sessions')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'exam_sessions',
            }, () => {
                // Re-fetch on any change to get fresh joins
                fetchSessions();
            })
            .subscribe((status: string) => {
                setConnected(status === 'SUBSCRIBED');
            });

        channelRef.current = channel;
        return () => { supabase.removeChannel(channel); };
    }, [fetchSessions, supabase]);

    // Polling fallback keeps feed fresh when realtime events are delayed/dropped.
    useEffect(() => {
        const timer = setInterval(() => {
            void fetchSessions();
        }, 8000);
        return () => clearInterval(timer);
    }, [fetchSessions]);

    // ── Derived data ───────────────────────────────────────────────────────────
    const allFlags: FlatFlag[] = sessions.flatMap(s =>
        (s.proctoring_flags ?? []).map((f, i) => ({
            ...f,
            _id: `${s.id}-${i}`,
            studentName: s.profiles?.full_name ?? s.profiles?.email ?? 'Unknown',
            studentId: s.student_id,
            sessionId: s.id,
        }))
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const filteredFlags = allFlags.filter(f => filter === 'all' || f.severity === filter);

    const selectedSession = sessions.find(s => s.id === selectedId);
    const selectedFlags = selectedSession ? (selectedSession.proctoring_flags ?? []) : null;

    const stats = {
        active: sessions.filter(s => s.status === 'active').length,
        flagged: sessions.filter(s => (s.proctoring_flags ?? []).length > 0).length,
        highFlags: allFlags.filter(f => f.severity === 'high').length,
        totalFlags: allFlags.length,
    };

    // ── End exam handler ───────────────────────────────────────────────────────
    const handleEndExam = async () => {
        if (!activeExamId) return;
        setEndingExam(true);
        await supabase
            .from('exam_sessions')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('exam_id', activeExamId)
            .eq('status', 'active');
        await supabase
            .from('exams')
            .update({ status: 'completed' })
            .eq('id', activeExamId);
        setEndingExam(false);
        setShowEndModal(false);
        fetchSessions();
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="p-8 max-w-7xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-7 w-48 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="h-5 w-12 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-28 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="p-8 max-w-7xl">
                <div className="mb-8 flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">Live Proctoring Monitor</h1>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5">
                        <WifiOff className="w-3 h-3" /> IDLE
                    </span>
                </div>
                <NoLiveExam />
            </div>
        );
    }

    return (
        <>
            <AnimatePresence>
                {showEndModal && (
                    <EndExamModal
                        examTitle={activeExam?.title ?? 'this exam'}
                        onConfirm={handleEndExam}
                        onCancel={() => setShowEndModal(false)}
                        loading={endingExam}
                    />
                )}
            </AnimatePresence>

            <div className="p-8 max-w-7xl">
                {/* Header */}
                <div className="mb-8 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-900">Live Proctoring Monitor</h1>
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                            </span>
                            <span className={cn(
                                'flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5',
                                connected ? 'text-sky-600 bg-sky-50 border border-sky-100' : 'text-gray-400 bg-gray-50 border border-gray-100'
                            )}>
                                {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                {connected ? 'Realtime' : 'Reconnecting'}
                            </span>
                        </div>
                        {activeExam && (
                            <p className="text-gray-500 text-sm font-medium">
                                {activeExam.title} · {activeExam.duration} min · Started{' '}
                                {sessions[0] ? fmtTime(sessions[0].started_at) : '—'}
                            </p>
                        )}
                    </div>
                    <Button
                        onClick={() => setShowEndModal(true)}
                        className="rounded-xl gap-2 font-semibold text-sm bg-red-500 hover:bg-red-600 text-white border-0 shadow-none shrink-0"
                    >
                        <StopCircle className="w-4 h-4" /> End Exam
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { icon: Radio,      label: 'Active',         value: stats.active,     color: 'text-[#4b3fe9] bg-[#4b3fe9]/8', border: 'border-[#4b3fe9]/10' },
                        { icon: UserCheck,  label: 'Clean Sessions', value: sessions.length - stats.flagged, color: 'text-emerald-600 bg-emerald-50', border: 'border-emerald-100' },
                        { icon: TrendingUp, label: 'Flagged',        value: stats.flagged,    color: 'text-amber-600 bg-amber-50',    border: 'border-amber-100' },
                        { icon: ShieldOff,  label: 'High Severity',  value: stats.highFlags,  color: 'text-red-500 bg-red-50',         border: 'border-red-100' },
                    ].map((s, i) => (
                        <motion.div key={s.label}
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className={`bg-white rounded-2xl border p-5 ${s.border}`}
                        >
                            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                                <s.icon className="w-4 h-4" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                        </motion.div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-5 gap-6">
                    {/* Student cards */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900">Students</h2>
                            <span className="text-xs text-gray-400 tabular-nums">{sessions.length} active</span>
                        </div>
                        <div className="p-4 grid sm:grid-cols-2 gap-3 max-h-130 overflow-y-auto">
                            {sessions.map((session) => {
                                const flags = session.proctoring_flags ?? [];
                                const sev = highestSeverity(flags);
                                const name = session.profiles?.full_name ?? session.profiles?.email ?? 'Student';
                                const progress = progressFromAnswers(session.answers ?? {}, session.exams?.total_questions ?? 0);
                                const isSelected = selectedId === session.id;

                                return (
                                    <motion.button
                                        key={session.id}
                                        whileHover={{ y: -1 }}
                                        onClick={() => setSelectedId(s => s === session.id ? null : session.id)}
                                        className={cn(
                                            'p-4 rounded-xl border text-left transition-all',
                                            isSelected
                                                ? 'border-[#4b3fe9] ring-2 ring-[#4b3fe9]/15 bg-white'
                                                : sev === 'high'
                                                ? `${SEV.high.ring} shadow-sm ${SEV.high.glow}`
                                                : 'border-gray-100 bg-white hover:border-gray-200'
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn(
                                                    'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white',
                                                    sev === 'high' ? 'bg-red-400' : sev === 'medium' ? 'bg-amber-400' : 'bg-[#4b3fe9]'
                                                )}>
                                                    {initials(name)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 leading-tight">{name}</p>
                                                    {sev && (
                                                        <p className="text-[10px] text-gray-400">
                                                            {flags.length} flag{flags.length !== 1 ? 's' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {sev ? (
                                                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${SEV[sev].badge}`}>
                                                    {sev}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                                    Clean
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Progress value={progress} className="flex-1 h-1" />
                                            <span className="text-[10px] text-gray-400 tabular-nums shrink-0">{progress}%</span>
                                        </div>
                                        {/* Inline flag pills on expand */}
                                        <AnimatePresence>
                                            {isSelected && flags.length > 0 && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 overflow-hidden"
                                                >
                                                    {flags.slice(-4).map((f, i) => {
                                                        const Icon = flagIcon(f.type);
                                                        return (
                                                            <div key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 border ${SEV[f.severity]?.ring ?? 'border-gray-100'}`}>
                                                                <Icon className="w-3 h-3 shrink-0 text-gray-500" />
                                                                <span className="text-[11px] text-gray-700 flex-1 truncate">{f.description || f.type}</span>
                                                                <span className="text-[10px] text-gray-400 shrink-0">{fmtTime(f.timestamp)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                            {isSelected && flags.length === 0 && (
                                                <motion.p
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="mt-3 pt-3 border-t border-gray-100 text-xs text-emerald-600 overflow-hidden"
                                                >
                                                    No violations detected
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Incident feed */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col max-h-160">
                        <div className="p-5 border-b border-gray-100 shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-semibold text-gray-900">Incident Feed</h2>
                                <span className="text-xs text-gray-400 tabular-nums">{allFlags.length} total</span>
                            </div>
                            <div className="flex gap-1">
                                {(['all', 'high', 'medium', 'low'] as const).map(f => (
                                    <button key={f}
                                        onClick={() => setFilter(f)}
                                        className={cn(
                                            'px-3 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all',
                                            filter === f ? 'bg-[#4b3fe9] text-white' : 'text-gray-500 hover:bg-gray-50'
                                        )}>
                                        {f}
                                        {f !== 'all' && (
                                            <span className="ml-1 opacity-60">
                                                {allFlags.filter(x => x.severity === f).length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                            <AnimatePresence initial={false}>
                                {filteredFlags.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-6">
                                        <UserCheck className="w-7 h-7 text-emerald-300" />
                                        <p className="text-sm text-gray-400">No {filter === 'all' ? '' : filter + ' '}incidents yet</p>
                                    </div>
                                ) : (
                                    filteredFlags.map((flag) => {
                                        const Icon = flagIcon(flag.type);
                                        const s = SEV[flag.severity] ?? SEV.low;
                                        return (
                                            <motion.div
                                                key={flag._id}
                                                initial={{ opacity: 0, x: 16 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -16 }}
                                                className="p-4 hover:bg-gray-50/60 transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${s.ring} mt-0.5`}>
                                                        <Icon className="w-3.5 h-3.5 text-gray-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                                            <span className="text-xs font-semibold text-gray-900 truncate">{flag.studentName}</span>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border shrink-0 ${s.badge}`}>
                                                                {flag.severity}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 truncate">{flag.description || flag.type}</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtTime(flag.timestamp)}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
