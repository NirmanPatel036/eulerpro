'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  ChevronRight,
  Eye,
  GraduationCap,
  Layers,
  MousePointerClick,
  RotateCcw,
  Scan,
  Search,
  ShieldAlert,
  ShieldOff,
  Smartphone,
  TriangleAlert,
  UserX,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

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
  started_at: string;
  completed_at: string | null;
  percentage: number | null;
  passed: boolean | null;
  proctoring_flags: FlagEntry[];
  profiles: { full_name: string | null; email: string; avatar_url: string | null } | null;
  exams: { title: string } | null;
}

interface StudentSummary {
  studentId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  sessions: SessionRow[];
  totalFlags: number;
  highFlags: number;
  mediumFlags: number;
  lowFlags: number;
  trustScore: number;
  topViolation: string | null;
  avgScore: number | null;
}

interface StatItem {
  label: string;
  value: string | number;
  sub: string;
  accent: string;
}

const FLAG_ICONS: Record<string, React.ElementType> = {
  no_face: UserX,
  unknown_face: ShieldOff,
  multiple_faces: Layers,
  head_movement: Scan,
  phone_detected: Smartphone,
  electronic_device: Smartphone,
  tab_switch: MousePointerClick,
  copy_paste: RotateCcw,
  unusual_eye_movement: Eye,
};

const FLAG_LABELS: Record<string, string> = {
  no_face: 'Face Absent',
  unknown_face: 'Unknown Face',
  multiple_faces: 'Multiple Faces',
  head_movement: 'Head Movement',
  phone_detected: 'Phone Detected',
  electronic_device: 'Electronic Device',
  tab_switch: 'Tab Switch',
  copy_paste: 'Copy / Paste',
  unusual_eye_movement: 'Eye Movement',
};

function normalizeFlag(raw: unknown, fallbackTimestamp: string): FlagEntry {
  const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  const type = typeof obj.type === 'string' ? obj.type : 'other';
  const severity = obj.severity === 'high' || obj.severity === 'medium' || obj.severity === 'low'
    ? obj.severity
    : (['no_face', 'unknown_face', 'multiple_faces', 'phone_detected', 'electronic_device'].includes(type)
      ? 'high'
      : ['head_movement', 'tab_switch', 'copy_paste'].includes(type)
        ? 'medium'
        : 'low');
  const timestamp = typeof obj.timestamp === 'string' && obj.timestamp.trim()
    ? obj.timestamp
    : fallbackTimestamp;
  const description = typeof obj.description === 'string' && obj.description.trim()
    ? obj.description
    : type.replace(/_/g, ' ');

  return { type, severity, description, timestamp };
}

function trustScore(flags: FlagEntry[]): number {
  return Math.max(0, 100 - flags.length * 8);
}

function trustTone(score: number) {
  if (score >= 80) {
    return {
      label: 'Trusted',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      bar: 'bg-emerald-400',
      avatar: 'bg-emerald-400',
      ring: 'ring-emerald-200',
    };
  }
  if (score >= 50) {
    return {
      label: 'Watch',
      text: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      bar: 'bg-amber-400',
      avatar: 'bg-amber-400',
      ring: 'ring-amber-200',
    };
  }
  return {
    label: 'Risk',
    text: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    bar: 'bg-red-400',
    avatar: 'bg-red-400',
    ring: 'ring-red-200',
  };
}

function topViolationType(flags: FlagEntry[]): string | null {
  if (!flags.length) return null;
  const counts: Record<string, number> = {};
  flags.forEach((flag) => {
    counts[flag.type] = (counts[flag.type] ?? 0) + 1;
  });
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
}

function violationLabel(type: string | null): string {
  if (!type) return 'None';
  return FLAG_LABELS[type] ?? type;
}

function initials(name: string | null | undefined, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return email[0]?.toUpperCase() ?? '?';
}

function flagIcon(type: string): React.ElementType {
  return FLAG_ICONS[type] ?? TriangleAlert;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function StudentAvatar({
  avatarUrl,
  name,
  email,
  score,
  size = 'md',
}: {
  avatarUrl: string | null;
  name: string;
  email: string;
  score: number;
  size?: 'sm' | 'md';
}) {
  const tone = trustTone(score);
  const dim = size === 'sm' ? 'w-8 h-8 text-[11px]' : 'w-11 h-11 text-sm';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(dim, 'rounded-2xl object-cover ring-2 shrink-0', tone.ring)}
      />
    );
  }

  return (
    <div className={cn(dim, 'rounded-2xl flex items-center justify-center font-bold text-white shrink-0', tone.avatar)}>
      {initials(name, email)}
    </div>
  );
}

function ViolationCluster({ flags }: { flags: FlagEntry[] }) {
  if (!flags.length) {
    return <span className="text-[11px] text-emerald-500 font-medium">No violations logged</span>;
  }

  const counts: Record<string, number> = {};
  flags.forEach((flag) => {
    counts[flag.type] = (counts[flag.type] ?? 0) + 1;
  });

  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([type, count]) => {
          const Icon = flagIcon(type);
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-600"
            >
              <Icon className="w-3 h-3" />
              {FLAG_LABELS[type] ?? type} x{count}
            </span>
          );
        })}
    </div>
  );
}

function IndigoPulseShield() {
  return (
    <div className="relative flex h-48 w-48 items-center justify-center rounded-3xl">
      <motion.span
        aria-hidden="true"
        className="absolute inset-6 rounded-full border border-indigo-300/50"
        animate={{ scale: [1, 1.24], opacity: [0.55, 0] }}
        transition={{ duration: 1.8, ease: 'easeOut', repeat: Infinity }}
      />
      <motion.span
        aria-hidden="true"
        className="absolute inset-10 rounded-full border border-indigo-400/60"
        animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
        transition={{ duration: 1.8, ease: 'easeOut', repeat: Infinity, delay: 0.45 }}
      />

      <motion.div
        className="relative z-10"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity }}
      >
        <svg viewBox="0 0 100 115" className="h-32 w-32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Indigo shield">
          <defs>
            <linearGradient id="studioShieldGrad" x1="30%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%" stopColor="#eef2ff" />
              <stop offset="40%" stopColor="#c7d2fe" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <radialGradient id="studioShieldShadow" cx="50%" cy="52%" r="52%" fx="50%" fy="52%">
              <stop offset="0%" stopColor="#312e81" stopOpacity="0.78" />
              <stop offset="45%" stopColor="#3730a3" stopOpacity="0.4" />
              <stop offset="75%" stopColor="#6366f1" stopOpacity="0.12" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <clipPath id="studioShieldClip">
              <path d="M50 4 L6 22 L6 55 C6 80 26 101 50 110 C74 101 94 80 94 55 L94 22 Z" />
            </clipPath>
          </defs>
          <path
            d="M50 4 L6 22 L6 55 C6 80 26 101 50 110 C74 101 94 80 94 55 L94 22 Z"
            fill="url(#studioShieldGrad)"
            stroke="#a5b4fc"
            strokeWidth="1"
          />
          <rect
            x="0"
            y="0"
            width="100"
            height="115"
            fill="url(#studioShieldShadow)"
            clipPath="url(#studioShieldClip)"
          />
        </svg>
      </motion.div>
    </div>
  );
}

function StudentCardExpansion({ student }: { student: StudentSummary }) {
  const allFlags = student.sessions.flatMap((session) => session.proctoring_flags ?? []);
  const recentFlags = [...allFlags]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent flags</p>
            <span className="text-[10px] text-gray-300">{recentFlags.length} shown</span>
          </div>
          <div className="space-y-2">
            {recentFlags.length === 0 ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs font-medium text-emerald-600">
                No incidents recorded for this student.
              </div>
            ) : (
              recentFlags.map((flag, index) => {
                const Icon = flagIcon(flag.type);
                return (
                  <div key={`${flag.type}-${flag.timestamp}-${index}`} className="rounded-xl border border-gray-100 bg-white px-3 py-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-800">{FLAG_LABELS[flag.type] ?? flag.type}</span>
                      <span className={cn(
                        'ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        flag.severity === 'high'
                          ? 'bg-red-50 text-red-600'
                          : flag.severity === 'medium'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-blue-600'
                      )}>
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">{flag.description}</p>
                    <p className="mt-1 text-[10px] text-gray-400">{fmtDateTime(flag.timestamp)}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Session trail</p>
          <div className="space-y-2">
            {student.sessions.map((session) => {
              const flags = session.proctoring_flags ?? [];
              const topSeverity = flags.some((flag) => flag.severity === 'high')
                ? 'high'
                : flags.some((flag) => flag.severity === 'medium')
                  ? 'medium'
                  : flags.length
                    ? 'low'
                    : null;

              return (
                <div key={session.id} className="rounded-xl border border-gray-100 bg-white p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-gray-800">{session.exams?.title ?? 'Exam session'}</p>
                    {topSeverity ? (
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        topSeverity === 'high'
                          ? 'bg-red-50 text-red-600'
                          : topSeverity === 'medium'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-blue-600'
                      )}>
                        {topSeverity}
                      </span>
                    ) : (
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {fmtDate(session.started_at)} · {flags.length} flag{flags.length !== 1 ? 's' : ''}
                    {session.percentage != null ? ` · ${session.percentage}%` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AnalyticsSidebar({
  stats,
  watchlist,
}: {
  stats: StatItem[];
  watchlist: StudentSummary[];
}) {
  return (
    <aside className="relative w-full h-full">
      <div className="w-full h-full rounded-r-none border-l border-r-0 border-y-0 border-gray-100 bg-white p-5 shadow-none overflow-y-auto">
        <div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Cohort Pulse</p>
              <p className="text-[11px] text-gray-400">Live summary as per the proctor</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-[#4b3fe9]/8 p-2 text-[#4b3fe9]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50/70 px-3 py-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-400">{item.label}</p>
                <p className={cn('text-lg font-bold tabular-nums', item.accent)}>{item.value}</p>
                <p className="text-[10px] text-gray-400">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 mb-3 border-t border-gray-100" />

        <div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Watchlist</p>
              <p className="text-[11px] text-gray-400">Lowest trust students right now</p>
            </div>
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
          </div>
          <div className="space-y-2">
            {watchlist.length === 0 ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs font-medium text-emerald-600">
                No at-risk students right now.
              </div>
            ) : (
              watchlist.map((student) => {
                const tone = trustTone(student.trustScore);
                return (
                  <div key={student.studentId} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 px-3 py-3">
                    <StudentAvatar
                      avatarUrl={student.avatarUrl}
                      name={student.name}
                      email={student.email}
                      score={student.trustScore}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-800">{student.name}</p>
                      <p className="truncate text-[10px] text-gray-400">{violationLabel(student.topViolation)}</p>
                    </div>
                    <span className={cn('text-xs font-bold tabular-nums', tone.text)}>{student.trustScore}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-3 mb-3 border-t border-gray-100" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-bl-3xl bg-linear-to-t from-white via-white/95 to-transparent"
      />
    </aside>
  );
}

export default function ProctoringStudentsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'flags' | 'trust' | 'name'>('flags');
  const [selected, setSelected] = useState<StudentSummary | null>(null);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('exam_sessions')
      .select(`
        id, student_id, exam_id, started_at, completed_at, percentage, passed, proctoring_flags,
        profiles:student_id ( full_name, email, avatar_url ),
        exams:exam_id ( title )
      `)
      .order('started_at', { ascending: false });

    if (!data) {
      setLoading(false);
      return;
    }

    const normalized = (data as SessionRow[]).map((session) => ({
      ...session,
      proctoring_flags: (session.proctoring_flags ?? []).map((flag) => normalizeFlag(flag, session.started_at)),
    }));

    setRows(normalized);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchData();

    const channel: RealtimeChannel = supabase
      .channel('instructor-students-proctoring')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exam_sessions' },
        () => void fetchData(),
      )
      .subscribe();

    const timer = setInterval(() => {
      void fetchData();
    }, 12000);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchData, supabase]);

  const summaries = useMemo<StudentSummary[]>(() => {
    const grouped: Record<string, SessionRow[]> = {};
    rows.forEach((row) => {
      (grouped[row.student_id] ??= []).push(row);
    });

    return Object.entries(grouped).map(([studentId, sessions]) => {
      const allFlags = sessions.flatMap((session) => session.proctoring_flags ?? []);
      const profile = sessions[0].profiles;
      const scores = sessions.filter((session) => session.percentage != null).map((session) => session.percentage as number);

      return {
        studentId,
        name: profile?.full_name ?? profile?.email ?? 'Unknown',
        email: profile?.email ?? '',
        avatarUrl: profile?.avatar_url ?? null,
        sessions,
        totalFlags: allFlags.length,
        highFlags: allFlags.filter((flag) => flag.severity === 'high').length,
        mediumFlags: allFlags.filter((flag) => flag.severity === 'medium').length,
        lowFlags: allFlags.filter((flag) => flag.severity === 'low').length,
        trustScore: trustScore(allFlags),
        topViolation: topViolationType(allFlags),
        avgScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    return summaries
      .filter((student) =>
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.email.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        if (sort === 'flags') return b.totalFlags - a.totalFlags;
        if (sort === 'trust') return a.trustScore - b.trustScore;
        return a.name.localeCompare(b.name);
      });
  }, [search, sort, summaries]);

  useEffect(() => {
    if (!selected) return;
    const next = summaries.find((student) => student.studentId === selected.studentId) ?? null;
    setSelected(next);
  }, [selected, summaries]);

  const cohortStats = useMemo(() => {
    const trustScores = summaries.map((student) => student.trustScore);
    const flagCounts = summaries.map((student) => student.totalFlags);
    const totalFlags = flagCounts.reduce((sum, count) => sum + count, 0);
    const avgTrust = trustScores.length
      ? Math.round(trustScores.reduce((sum, score) => sum + score, 0) / trustScores.length)
      : 0;
    const avgFlags = flagCounts.length
      ? +(flagCounts.reduce((sum, count) => sum + count, 0) / flagCounts.length).toFixed(1)
      : 0;
    const highRisk = summaries.filter((student) => student.trustScore < 50).length;
    const clean = summaries.filter((student) => student.totalFlags === 0).length;
    const flagged = summaries.filter((student) => student.totalFlags > 0).length;

    return {
      avgTrust,
      avgFlags,
      totalFlags,
      highRisk,
      clean,
      flagged,
      medianFlags: median(flagCounts),
    };
  }, [summaries]);

  const analyticsStats = useMemo<StatItem[]>(() => [
    {
      label: 'Students in scope',
      value: summaries.length,
      sub: `${cohortStats.clean} clean and ${cohortStats.flagged} flagged`,
      accent: 'text-gray-900',
    },
    {
      label: 'Average trust',
      value: `${cohortStats.avgTrust}/100`,
      sub: cohortStats.avgTrust >= 80 ? 'Mostly stable sessions' : 'Needs closer review',
      accent: cohortStats.avgTrust >= 80 ? 'text-emerald-600' : cohortStats.avgTrust >= 50 ? 'text-amber-600' : 'text-red-600',
    },
    {
      label: 'Flags per student',
      value: cohortStats.avgFlags,
      sub: `Median ${cohortStats.medianFlags} across ${cohortStats.totalFlags} total flags`,
      accent: cohortStats.avgFlags <= 1 ? 'text-emerald-600' : cohortStats.avgFlags <= 3 ? 'text-amber-600' : 'text-red-600',
    },
    {
      label: 'Immediate review',
      value: cohortStats.highRisk,
      sub: cohortStats.highRisk === 0 ? 'No active watchlist pressure' : 'Students below 50 trust',
      accent: cohortStats.highRisk === 0 ? 'text-emerald-600' : 'text-red-600',
    },
  ], [cohortStats, summaries.length]);

  const watchlist = useMemo(() => [...summaries].sort((a, b) => a.trustScore - b.trustScore).slice(0, 4), [summaries]);

  if (loading) {
    return (
      <div className="max-w-7xl p-8 space-y-4">
        <div className="h-9 w-72 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="h-28 rounded-3xl border border-gray-100 bg-gray-50 animate-pulse" />
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-28 rounded-3xl border border-gray-100 bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="min-w-0 space-y-6 overflow-x-hidden p-8" style={{ width: 'calc(100% - 18rem)' }}>
          <div className="rounded-4xl border border-gray-100 bg-[radial-gradient(circle_at_top_left,rgba(75,63,233,0.18),transparent_42%),linear-gradient(135deg,#ffffff,#f8f8fd)] p-6 shadow-sm">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1 max-w-3xl">
                <p className="mb-2 inline-flex items-center rounded-full border border-[#4b3fe9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4b3fe9]">Proctoring Studio</p>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Trust is <span className="italic">easier</span> to read when the roster behaves like a control room.</h1>
                <p className="mt-2 text-sm text-gray-500">
                  Click a student card to open session detail, recent incidents, and score context without leaving the live roster.
                </p>
              </div>

              <div className="self-center lg:ml-auto lg:self-auto lg:shrink-0">
                <IndigoPulseShield />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
            <div className="relative min-w-60 flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student or email"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#4b3fe9]/40 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-1">
              {(['flags', 'trust', 'name'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setSort(value)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-xs font-semibold transition-all',
                    sort === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  {value === 'flags' ? 'Most Flagged' : value === 'trust' ? 'Lowest Trust' : 'Alphabetical'}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-3xl border border-gray-100 bg-white text-center shadow-sm">
              <GraduationCap className="w-8 h-8 text-gray-200" />
              <div>
                <p className="text-sm font-semibold text-gray-700">No students match the current filter</p>
                <p className="text-xs text-gray-400">Try a different search term or sorting mode.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
                {filtered.map((student, index) => {
                  const tone = trustTone(student.trustScore);
                  const isSelected = selected?.studentId === student.studentId;
                  const flags = student.sessions.flatMap((session) => session.proctoring_flags ?? []);

                  return (
                    <motion.div
                      key={student.studentId}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        'w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition-all',
                        isSelected
                          ? 'border-[#4b3fe9] ring-2 ring-[#4b3fe9]/10'
                          : student.highFlags > 0
                            ? 'border-red-100 hover:border-red-200'
                            : 'border-gray-100 hover:border-gray-200'
                      )}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <StudentAvatar
                            avatarUrl={student.avatarUrl}
                            name={student.name}
                            email={student.email}
                            score={student.trustScore}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-start gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-gray-900">
                                      {student.name}
                                  </p>
                                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', tone.bg, tone.text)}>
                                      {tone.label}
                                  </span>
                                </div>
                                <p className="truncate text-xs text-gray-400">{student.email}</p>
                              </div>
                              {student.highFlags > 0 && (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
                                  {student.highFlags} high
                                </span>
                              )}

                              <div className="ml-auto flex items-center gap-2">
                                <ViolationCluster flags={flags} />
                                <button
                                  onClick={() => setSelected((prev) => prev?.studentId === student.studentId ? null : student)}
                                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-[#4b3fe9]"
                                >
                                  <ChevronRight className={cn('w-4 h-4 shrink-0 transition-transform', isSelected ? 'rotate-90 text-[#4b3fe9]' : 'text-gray-300')} />
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-medium text-gray-500">Trust index</span>
                                <span className={cn('font-bold tabular-nums', tone.text)}>{student.trustScore}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${student.trustScore}%` }}
                                  className={cn('h-full rounded-full', tone.bar)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Flags', value: student.totalFlags, cls: student.totalFlags ? 'text-amber-600' : 'text-gray-900' },
                            { label: 'Sessions', value: student.sessions.length, cls: 'text-gray-900' },
                            { label: 'Average', value: student.avgScore != null ? `${student.avgScore}%` : '--', cls: 'text-gray-900' },
                          ].map((item) => (
                            <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50/70 px-3 py-2.5">
                              <p className={cn('text-sm font-bold tabular-nums', item.cls)}>{item.value}</p>
                              <p className="text-[10px] uppercase tracking-wide text-gray-400">{item.label}</p>
                            </div>
                          ))}
                        </div>

                        <AnimatePresence>
                          {isSelected && <StudentCardExpansion student={student} />}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
      </div>

      <div className="fixed right-0 top-6 bottom-0 w-72">
        <AnalyticsSidebar
          stats={analyticsStats}
          watchlist={watchlist}
        />
      </div>
    </div>
  );
}
