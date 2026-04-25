'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldOff, UserX, Layers, Scan, Smartphone,
    MousePointerClick, RotateCcw, Eye, ChevronDown,
    ChevronUp, ClockFading, TriangleAlert, X, Sliders,
} from 'lucide-react';
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

interface SessionWithFlags {
    id: string;
    student_id: string;
    exam_id: string;
    started_at: string;
    completed_at: string | null;
    proctoring_flags: FlagEntry[];
    profiles: { full_name: string | null; email: string } | null;
    exams: { title: string } | null;
}

interface FlatFlag extends FlagEntry {
    _key: string;
    studentName: string;
    examTitle: string;
    sessionId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const SEV = {
    high:   { badge: 'bg-red-50 text-red-700 border-red-200',   row: 'border-l-red-400',   dot: 'bg-red-400'   },
    medium: { badge: 'bg-amber-50 text-amber-700 border-amber-200', row: 'border-l-amber-400', dot: 'bg-amber-400' },
    low:    { badge: 'bg-blue-50 text-blue-700 border-blue-100',  row: 'border-l-blue-300',  dot: 'bg-blue-300'  },
};

const FLAG_ICONS: Record<string, React.ElementType> = {
    no_face:             UserX,
    unknown_face:        ShieldOff,
    multiple_faces:      Layers,
    head_movement:       Scan,
    phone_detected:      Smartphone,
    electronic_device:   Smartphone,
    tab_switch:          MousePointerClick,
    copy_paste:          RotateCcw,
    unusual_eye_movement: Eye,
};

const FLAG_LABELS: Record<string, string> = {
    no_face:             'Face Absent',
    unknown_face:        'Unknown Face',
    multiple_faces:      'Multiple Faces',
    head_movement:       'Head Movement',
    phone_detected:      'Phone Detected',
    electronic_device:   'Electronic Device',
    tab_switch:          'Tab Switch',
    copy_paste:          'Copy / Paste',
    unusual_eye_movement:'Unusual Eye Movement',
};

function flagIcon(type: string): React.ElementType {
    return FLAG_ICONS[type] ?? TriangleAlert;
}

function fmtDatetime(iso: string) {
    return new Date(iso).toLocaleString([], {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// Group flags by date
function groupByDate(flags: FlatFlag[]): Record<string, FlatFlag[]> {
    return flags.reduce<Record<string, FlatFlag[]>>((acc, f) => {
        const date = fmtDate(f.timestamp);
        (acc[date] ??= []).push(f);
        return acc;
    }, {});
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

const ALL_TYPES = Object.keys(FLAG_LABELS);
const ALL_SEVERITIES = ['high', 'medium', 'low'] as const;

// ── Sidebar Content Component ─────────────────────────────────────────────────
interface SidebarContentProps {
    setShowFilters: (value: boolean) => void;
    sevFilter: string;
    setSevFilter: (value: string) => void;
    typeFilter: string;
    setTypeFilter: (value: string) => void;
    examFilter: string;
    setExamFilter: (value: string) => void;
    examTitles: string[];
}

function SidebarContent({
    setShowFilters,
    sevFilter,
    setSevFilter,
    typeFilter,
    setTypeFilter,
    examFilter,
    setExamFilter,
    examTitles,
}: SidebarContentProps) {
    return (
        <>
            {/* Sidebar Header */}
            <div className="sticky top-0 z-50 bg-linear-to-b from-white via-white to-white/80 border-b border-gray-100 px-6 py-5 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Zoom into your results</p>
                </div>
            </div>

            {/* Sidebar Content */}
            <div className="overflow-y-auto flex-1">
                <div className="p-6 space-y-8">
                    {/* Severity Filter */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-[#4b3fe9]" />
                                <p className="text-sm font-bold text-gray-900">Severity Level</p>
                            </div>
                            <p className="text-xs text-gray-500">Filter by violation severity</p>
                        </div>
                        <div className="space-y-2">
                            {['all', ...ALL_SEVERITIES].map((s, idx) => (
                                <motion.button
                                    key={s}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + idx * 0.05 }}
                                    onClick={() => setSevFilter(s)}
                                    className={cn(
                                        'w-full text-left px-4 py-3 rounded-xl text-sm font-semibold capitalize transition-all duration-200 flex items-center justify-between group',
                                        sevFilter === s
                                            ? 'bg-[#4b3fe9] text-white shadow-lg shadow-[#4b3fe9]/20'
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    )}
                                >
                                    <span>{s}</span>
                                    {sevFilter === s && (
                                        <motion.div
                                            layoutId="severity-check"
                                            className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                        </motion.div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Divider */}
                    <div className="h-px bg-linear-to-r from-gray-200 via-gray-100 to-gray-200" />

                    {/* Violation Type Filter */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-[#4b3fe9]" />
                                <p className="text-sm font-bold text-gray-900">Violation Type</p>
                            </div>
                            <p className="text-xs text-gray-500">Select a violation category</p>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                            {['all', ...ALL_TYPES].map((t, idx) => (
                                <motion.button
                                    key={t}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + idx * 0.03 }}
                                    onClick={() => setTypeFilter(t)}
                                    className={cn(
                                        'w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between',
                                        typeFilter === t
                                            ? 'bg-[#4b3fe9] text-white shadow-lg shadow-[#4b3fe9]/20'
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    )}
                                >
                                    <span>{t === 'all' ? 'All Types' : (FLAG_LABELS[t] ?? t)}</span>
                                    {typeFilter === t && (
                                        <motion.div
                                            layoutId="type-check"
                                            className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                        </motion.div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Divider */}
                    <div className="h-px bg-linear-to-r from-gray-200 via-gray-100 to-gray-200" />

                    {/* Exam Filter */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-[#4b3fe9]" />
                                <p className="text-sm font-bold text-gray-900">Exam</p>
                            </div>
                            <p className="text-xs text-gray-500">Filter by exam name</p>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                            {['all', ...examTitles].map((e, idx) => (
                                <motion.button
                                    key={e}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.03 }}
                                    onClick={() => setExamFilter(e)}
                                    className={cn(
                                        'w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between truncate',
                                        examFilter === e
                                            ? 'bg-[#4b3fe9] text-white shadow-lg shadow-[#4b3fe9]/20'
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    )}
                                >
                                    <span className="truncate">{e === 'all' ? 'All Exams' : e}</span>
                                    {examFilter === e && (
                                        <motion.div
                                            layoutId="exam-check"
                                            className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                        </motion.div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Reset Filters */}
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        onClick={() => {
                            setSevFilter('all');
                            setTypeFilter('all');
                            setExamFilter('all');
                        }}
                        disabled={sevFilter === 'all' && typeFilter === 'all' && examFilter === 'all'}
                        className={cn(
                            'w-full mt-6 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                            sevFilter !== 'all' || typeFilter !== 'all' || examFilter !== 'all'
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        )}
                    >
                        Reset All Filters
                    </motion.button>
                </div>
            </div>
        </>
    );
}

export default function FlagsPage() {
    const supabase = createClient();

    const [sessions, setSessions] = useState<SessionWithFlags[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [sevFilter, setSevFilter]   = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [examFilter, setExamFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Expanded rows
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        const { data } = await supabase
            .from('exam_sessions')
            .select(`
                id, student_id, exam_id, started_at, completed_at, proctoring_flags,
                profiles:student_id ( full_name, email ),
                exams:exam_id ( title )
            `)
            .not('proctoring_flags', 'eq', '[]')
            .order('started_at', { ascending: false });

        if (data) {
            setSessions((data as SessionWithFlags[]).map(s => ({
                ...s,
                proctoring_flags: (s.proctoring_flags ?? []).map((f) => normalizeFlag(f, s.started_at)),
            })));
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        void fetchData();

        const channel: RealtimeChannel = supabase
            .channel('instructor-flag-history')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'exam_sessions',
            }, () => {
                void fetchData();
            })
            .subscribe();

        const timer = setInterval(() => {
            void fetchData();
        }, 10000);

        return () => {
            clearInterval(timer);
            supabase.removeChannel(channel);
        };
    }, [fetchData, supabase]);

    // ── Flatten all flags ──────────────────────────────────────────────────────
    const allFlags: FlatFlag[] = sessions.flatMap(s =>
        (s.proctoring_flags ?? []).map((f, i) => ({
            ...f,
            _key: `${s.id}-${i}`,
            studentName: s.profiles?.full_name ?? s.profiles?.email ?? 'Unknown',
            examTitle: s.exams?.title ?? 'Unknown Exam',
            sessionId: s.id,
        }))
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const examTitles = [...new Set(allFlags.map(f => f.examTitle))];

    const filtered = allFlags.filter(f =>
        (sevFilter  === 'all' || f.severity === sevFilter) &&
        (typeFilter === 'all' || f.type === typeFilter) &&
        (examFilter === 'all' || f.examTitle === examFilter)
    );

    const grouped = groupByDate(filtered);

    const stats = {
        total: allFlags.length,
        high: allFlags.filter(f => f.severity === 'high').length,
        medium: allFlags.filter(f => f.severity === 'medium').length,
        low: allFlags.filter(f => f.severity === 'low').length,
    };

    const toggleExpand = (key: string) => setExpanded(prev => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
    });

    if (loading) return (
        <div className="flex h-screen">
            <div className="flex-1 p-8 space-y-4">
                <div className="h-7 w-48 bg-gray-100 rounded-lg animate-pulse" />
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse border border-gray-100" />
                ))}
            </div>
            <div className="w-80 bg-gray-50 border-l border-gray-200 animate-pulse" />
        </div>
    );

    return (
        <div className="relative h-screen bg-gray-50 overflow-hidden">
            {/* Main Content Area */}
            <div className="h-full min-w-0 overflow-y-auto flex flex-col md:mr-75 md:pr-6">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-linear-to-b from-gray-50 via-gray-50 to-gray-50/80 backdrop-blur-sm border-b border-gray-100 p-8 pb-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Flag History</h1>
                        <p className="text-sm text-gray-500">All recorded proctoring violations, across all exams</p>
                    </div>
                    <div className="text-right md:hidden">
                        <button
                            onClick={() => setShowFilters(v => !v)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-300',
                                showFilters 
                                    ? 'bg-[#4b3fe9] text-white border-[#4b3fe9] shadow-lg shadow-[#4b3fe9]/20' 
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            )}
                        >
                            <Sliders className="w-4 h-4" />
                            Filters
                            {(sevFilter !== 'all' || typeFilter !== 'all' || examFilter !== 'all') && (
                                <motion.span 
                                    layoutId="filter-indicator"
                                    className="w-2 h-2 rounded-full bg-amber-400"
                                />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="px-8 pt-6">
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <div className="flex flex-wrap gap-3">
                        {[
                            { label: 'Total Flags', value: stats.total, cls: 'bg-gray-50 border-gray-100 text-gray-700' },
                            { label: 'High', value: stats.high, cls: 'bg-red-50 border-red-100 text-red-700' },
                            { label: 'Medium', value: stats.medium, cls: 'bg-amber-50 border-amber-100 text-amber-700' },
                            { label: 'Low', value: stats.low, cls: 'bg-blue-50 border-blue-100 text-blue-700' },
                        ].map(s => (
                            <motion.div 
                                key={s.label} 
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold ${s.cls}`}
                                whileHover={{ scale: 1.02 }}
                            >
                                <span className="text-base font-bold tabular-nums">{s.value}</span>
                                <span className="opacity-70">{s.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Flag list grouped by date */}
            <div className="p-8">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-52 gap-3 text-center">
                        <ShieldOff className="w-8 h-8 text-gray-200" />
                        <p className="text-sm text-gray-400">No flags match the current filters</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(grouped).map(([date, flags]) => (
                            <div key={date}>
                                <div className="flex items-center gap-3 mb-3">
                                    <ClockFading className="w-3.5 h-3.5 text-gray-300" />
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{date}</span>
                                    <div className="flex-1 h-px bg-gray-100" />
                                    <span className="text-xs text-gray-300">{flags.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {flags.map(flag => {
                                        const Icon = flagIcon(flag.type);
                                        const s = SEV[flag.severity] ?? SEV.low;
                                        const isOpen = expanded.has(flag._key);
                                        return (
                                            <motion.div
                                                key={flag._key}
                                                layout
                                                className={`bg-white border border-gray-100 border-l-4 rounded-xl ${s.row} overflow-hidden transition-all hover:shadow-md`}
                                            >
                                                <button
                                                    onClick={() => toggleExpand(flag._key)}
                                                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50/50 transition-colors"
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${s.badge}`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-gray-900">{flag.studentName}</span>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${s.badge}`}>
                                                                {flag.severity}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                            {FLAG_LABELS[flag.type] ?? flag.type} · {flag.examTitle}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs text-gray-400 shrink-0">{fmtDatetime(flag.timestamp)}</span>
                                                    {isOpen
                                                        ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" />
                                                        : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />
                                                    }
                                                </button>
                                                <AnimatePresence>
                                                    {isOpen && (
                                                        <motion.div
                                                            initial={{ height: 0 }}
                                                            animate={{ height: 'auto' }}
                                                            exit={{ height: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                                                                <p className="text-xs text-gray-600 mt-3 mb-2">
                                                                    <span className="font-semibold text-gray-700">Description: </span>
                                                                    {flag.description || '—'}
                                                                </p>
                                                                <div className="flex gap-4 text-xs text-gray-400">
                                                                    <span>Session: <span className="font-mono text-gray-500">{flag.sessionId.slice(0, 8)}</span></span>
                                                                    <span>Recorded: {fmtDatetime(flag.timestamp)}</span>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            </div>

            {/* Mobile filter drawer */}
            <AnimatePresence>
                {showFilters && (
                    <div className="md:hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowFilters(false)}
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                        />
                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white border-l border-gray-200 shadow-2xl flex flex-col overflow-hidden"
                        >
                            <SidebarContent setShowFilters={setShowFilters} sevFilter={sevFilter} setSevFilter={setSevFilter} typeFilter={typeFilter} setTypeFilter={setTypeFilter} examFilter={examFilter} setExamFilter={setExamFilter} examTitles={examTitles} />
                        </motion.aside>
                    </div>
                )}
            </AnimatePresence>

            {/* Desktop filter column */}
            <motion.aside
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.2 }}
                className="hidden md:flex fixed right-0 top-6 bottom-0 w-80 bg-white border-l border-gray-100 flex-col overflow-hidden"
            >
                <SidebarContent setShowFilters={setShowFilters} sevFilter={sevFilter} setSevFilter={setSevFilter} typeFilter={typeFilter} setTypeFilter={setTypeFilter} examFilter={examFilter} setExamFilter={setExamFilter} examTitles={examTitles} />
            </motion.aside>
        </div>
    );
}

