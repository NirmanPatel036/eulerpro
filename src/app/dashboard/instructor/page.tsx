'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Plus, Eye, AlertTriangle, Command,
    ChevronRight, Zap, Clock, Loader2,
    MoreHorizontal, Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import WorldMap from '@/components/ui/world-map';
import { AnimatedTooltip } from '@/components/ui/animated-tooltip';
import ClientOnly from '@/components/shared/ClientOnly';

type ExamRow = {
    id: string;
    title: string;
    course: string | null;
    status: string;
    scheduled_at: string | null;
    duration: number | null;
    created_at: string | null;
};

type SessionRow = {
    id: string;
    exam_id: string;
    student_id: string;
    status: string | null;
    started_at: string | null;
    completed_at: string | null;
    percentage: number | null;
    proctoring_flags: unknown;
};

type EnrollmentRow = {
    course_id: string | null;
    student_email: string | null;
};

type ProfileRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
};

type CourseRow = {
    id: string;
    name: string | null;
    code: string | null;
};

type FlagEntry = {
    type: string;
    severity: 'high' | 'medium' | 'low';
    timestamp: string;
};

type BoardExam = {
    id: string;
    title: string;
    course: string;
    due: string;
};

type BoardColumn = {
    id: 'draft' | 'scheduled' | 'active' | 'completed';
    label: string;
    color: string;
    dot: string;
    exams: BoardExam[];
};

type ActivityItem = {
    id: string;
    text: string;
    time: string;
    color: string;
    bg: string;
    kind: 'flag' | 'submit';
};

type ViolationMixItem = {
    type: string;
    label: string;
    count: number;
};

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.36, delay, ease: 'easeOut' as const },
});

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
    '+1': { lat: 37.0902, lng: -95.7129, label: 'US' },
    '+7': { lat: 61.524, lng: 105.3188, label: 'RU' },
    '+20': { lat: 26.8206, lng: 30.8025, label: 'EG' },
    '+27': { lat: -30.5595, lng: 22.9375, label: 'ZA' },
    '+31': { lat: 52.1326, lng: 5.2913, label: 'NL' },
    '+33': { lat: 46.2276, lng: 2.2137, label: 'FR' },
    '+34': { lat: 40.4637, lng: -3.7492, label: 'ES' },
    '+39': { lat: 41.8719, lng: 12.5674, label: 'IT' },
    '+44': { lat: 55.3781, lng: -3.436, label: 'GB' },
    '+49': { lat: 51.1657, lng: 10.4515, label: 'DE' },
    '+52': { lat: 23.6345, lng: -102.5528, label: 'MX' },
    '+55': { lat: -14.235, lng: -51.9253, label: 'BR' },
    '+60': { lat: 4.2105, lng: 101.9758, label: 'MY' },
    '+61': { lat: -25.2744, lng: 133.7751, label: 'AU' },
    '+62': { lat: -0.7893, lng: 113.9213, label: 'ID' },
    '+63': { lat: 12.8797, lng: 121.774, label: 'PH' },
    '+64': { lat: -40.9006, lng: 174.886, label: 'NZ' },
    '+65': { lat: 1.3521, lng: 103.8198, label: 'SG' },
    '+81': { lat: 36.2048, lng: 138.2529, label: 'JP' },
    '+82': { lat: 35.9078, lng: 127.7669, label: 'KR' },
    '+86': { lat: 35.8617, lng: 104.1954, label: 'CN' },
    '+90': { lat: 38.9637, lng: 35.2433, label: 'TR' },
    '+91': { lat: 20.5937, lng: 78.9629, label: 'IN' },
    '+92': { lat: 30.3753, lng: 69.3451, label: 'PK' },
    '+234': { lat: 9.082, lng: 8.6753, label: 'NG' },
    '+254': { lat: -0.0236, lng: 37.9062, label: 'KE' },
    '+880': { lat: 23.685, lng: 90.3563, label: 'BD' },
    '+966': { lat: 23.8859, lng: 45.0792, label: 'SA' },
    '+971': { lat: 23.4241, lng: 53.8478, label: 'AE' },
};

const MOCK_AVATARS = [
    'https://i.pravatar.cc/180?img=11',
    'https://i.pravatar.cc/180?img=23',
    'https://i.pravatar.cc/180?img=29',
    'https://i.pravatar.cc/180?img=36',
    'https://i.pravatar.cc/180?img=42',
    'https://i.pravatar.cc/180?img=58',
];

function parseDateMs(value: string | null) {
    if (!value) return null;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
}

function getExamDisplayStatus(exam: Pick<ExamRow, 'status' | 'scheduled_at' | 'duration'>, nowMs = Date.now()) {
    if (exam.status === 'completed') return 'completed';
    if (exam.status === 'draft' || exam.status === 'archived') return exam.status;

    const scheduledMs = parseDateMs(exam.scheduled_at);
    if (scheduledMs === null) return 'scheduled';

    if (scheduledMs > nowMs) return 'scheduled';

    const durationMinutes = Math.max(0, exam.duration ?? 0);
    const endMs = scheduledMs + durationMinutes * 60_000;
    return nowMs >= endMs ? 'conducted' : 'active';
}

function formatBoardTime(iso: string | null) {
    if (!iso) return 'Not scheduled';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'Not scheduled';
    return parsed.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatRelative(iso: string | null) {
    if (!iso) return 'Just now';
    const parsed = new Date(iso).getTime();
    if (Number.isNaN(parsed)) return 'Just now';
    const diffMs = Date.now() - parsed;
    const mins = Math.max(1, Math.round(diffMs / 60_000));
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

function normalizeFlags(raw: unknown, fallbackTimestamp: string | null): FlagEntry[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
        .map((entry) => {
            const type = typeof entry.type === 'string' ? entry.type : 'other';
            const severity = entry.severity === 'high' || entry.severity === 'medium' || entry.severity === 'low'
                ? entry.severity
                : 'medium';
            const timestamp = typeof entry.timestamp === 'string' && entry.timestamp.trim()
                ? entry.timestamp
                : fallbackTimestamp ?? new Date().toISOString();
            return { type, severity, timestamp };
        });
}

function formatViolationType(type: string) {
    return type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractCountryCode(phone: string | null) {
    if (!phone) return null;
    const value = phone.trim();
    if (!value.startsWith('+')) return null;
    const codes = Object.keys(COUNTRY_COORDS).sort((left, right) => right.length - left.length);
    return codes.find((code) => value.startsWith(code)) ?? null;
}

export default function InstructorHomePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [boardSearch, setBoardSearch] = useState('');
    const [menuExamId, setMenuExamId] = useState<string | null>(null);
    const [hoveredTrustPoint, setHoveredTrustPoint] = useState<string | null>(null);
    const [exams, setExams] = useState<ExamRow[]>([]);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
    const [courses, setCourses] = useState<CourseRow[]>([]);
    const [profiles, setProfiles] = useState<Record<string, { name: string; email: string | null; phone: string | null; avatarUrl: string | null }>>({});

    const loadData = useCallback(async () => {
        const supabase = createClient();
        setError(null);

        const { data: auth, error: authError } = await supabase.auth.getUser();
        const userId = auth?.user?.id;

        if (authError || !userId) {
            setError(authError?.message ?? 'Not authenticated');
            setLoading(false);
            return;
        }

        const [{ data: examRows, error: examError }, { data: courseRows, error: courseError }] = await Promise.all([
            supabase
                .from('exams')
                .select('id, title, course, status, scheduled_at, duration, created_at')
                .eq('instructor_id', userId)
                .order('scheduled_at', { ascending: false }),
            supabase
                .from('courses')
                .select('id, name, code')
                .eq('instructor_id', userId),
        ]);

        if (examError || courseError) {
            setError(examError?.message ?? courseError?.message ?? 'Unable to load dashboard data');
            setLoading(false);
            return;
        }

        const safeExams = (examRows ?? []) as ExamRow[];
        const examIds = safeExams.map((exam) => exam.id);
        const courseIds = ((courseRows ?? []) as Array<{ id: string }>).map((row) => row.id);

        const [{ data: sessionRows, error: sessionError }, { data: enrollmentRows, error: enrollmentError }] = await Promise.all([
            examIds.length
                ? supabase
                    .from('exam_sessions')
                    .select('id, exam_id, student_id, status, started_at, completed_at, percentage, proctoring_flags')
                    .in('exam_id', examIds)
                    .order('started_at', { ascending: false })
                : Promise.resolve({ data: [], error: null }),
            courseIds.length
                ? supabase
                    .from('course_enrollments')
                    .select('course_id, student_email')
                    .in('course_id', courseIds)
                : Promise.resolve({ data: [], error: null }),
        ]);

        if (sessionError || enrollmentError) {
            setError(sessionError?.message ?? enrollmentError?.message ?? 'Unable to load session data');
            setLoading(false);
            return;
        }

        const safeSessions = (sessionRows ?? []) as SessionRow[];
        const studentIds = [...new Set(safeSessions.map((row) => row.student_id).filter(Boolean))];
        const { data: profileRows, error: profileError } = studentIds.length
            ? await supabase
                .from('profiles')
                .select('id, full_name, email, phone, avatar_url')
                .in('id', studentIds)
            : { data: [], error: null };

        if (profileError) {
            setError(profileError.message);
            setLoading(false);
            return;
        }

        const profileMap = ((profileRows ?? []) as ProfileRow[]).reduce<Record<string, { name: string; email: string | null; phone: string | null; avatarUrl: string | null }>>((acc, row) => {
            acc[row.id] = {
                name: row.full_name?.trim() || row.email || 'Unknown student',
                email: row.email ?? null,
                phone: row.phone ?? null,
                avatarUrl: row.avatar_url ?? null,
            };
            return acc;
        }, {});

        setExams(safeExams);
        setSessions(safeSessions);
        setEnrollments((enrollmentRows ?? []) as EnrollmentRow[]);
        setCourses((courseRows ?? []) as CourseRow[]);
        setProfiles(profileMap);
        setLoading(false);
    }, []);

    useEffect(() => {
        void loadData();

        const supabase = createClient();
        const channel = supabase
            .channel('instructor-dashboard-home-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => {
                void loadData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_sessions' }, () => {
                void loadData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'course_enrollments' }, () => {
                void loadData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
                void loadData();
            })
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [loadData]);

    const metrics = useMemo(() => {
        const completedSessions = sessions.filter((session) => session.status === 'completed');
        const avgScore = completedSessions.length
            ? Math.round(completedSessions.reduce((sum, session) => sum + (session.percentage ?? 0), 0) / completedSessions.length)
            : 0;

        const flags = sessions.flatMap((session) => normalizeFlags(session.proctoring_flags, session.started_at));
        const highFlags = flags.filter((flag) => flag.severity === 'high').length;

        const activeStudents = new Set(enrollments.map((row) => row.student_email).filter(Boolean)).size;

        return {
            totalExams: exams.length,
            activeStudents,
            avgScore,
            openFlags: flags.length,
            highFlags,
            liveExams: exams.filter((exam) => getExamDisplayStatus(exam) === 'active').length,
            scheduledExams: exams.filter((exam) => getExamDisplayStatus(exam) === 'scheduled').length,
            completionRate: sessions.length ? Math.round((completedSessions.length / sessions.length) * 100) : 0,
        };
    }, [enrollments, exams, sessions]);

    const boardColumns = useMemo<BoardColumn[]>(() => {
        const nowMs = Date.now();

        const toBoardExam = (exam: ExamRow): BoardExam => {
            const examSessions = sessions.filter((session) => session.exam_id === exam.id);
            const completed = examSessions.filter((session) => session.status === 'completed');
            const avgScore = completed.length
                ? Math.round(completed.reduce((sum, session) => sum + (session.percentage ?? 0), 0) / completed.length)
                : null;
            const liveCount = examSessions.filter((session) => session.status === 'active').length;

            const status = getExamDisplayStatus(exam, nowMs);
            const due = status === 'draft'
                ? 'Not scheduled'
                : status === 'active'
                    ? `${liveCount} active session${liveCount === 1 ? '' : 's'}`
                    : status === 'conducted' || status === 'completed'
                        ? `${avgScore ?? 0}% avg`
                        : formatBoardTime(exam.scheduled_at);

            return {
                id: exam.id,
                title: exam.title,
                course: exam.course?.trim() || 'Course',
                due,
            };
        };

        const query = boardSearch.trim().toLowerCase();
        const filtered = exams.filter((exam) => !query || exam.title.toLowerCase().includes(query));

        return [
            {
                id: 'draft',
                label: 'Draft',
                color: 'text-gray-500',
                dot: 'bg-gray-300',
                exams: filtered.filter((exam) => getExamDisplayStatus(exam, nowMs) === 'draft').map(toBoardExam),
            },
            {
                id: 'scheduled',
                label: 'Scheduled',
                color: 'text-blue-600',
                dot: 'bg-blue-400',
                exams: filtered.filter((exam) => getExamDisplayStatus(exam, nowMs) === 'scheduled').map(toBoardExam),
            },
            {
                id: 'active',
                label: 'Live Now',
                color: 'text-emerald-600',
                dot: 'bg-emerald-400',
                exams: filtered.filter((exam) => getExamDisplayStatus(exam, nowMs) === 'active').map(toBoardExam),
            },
            {
                id: 'completed',
                label: 'Completed',
                color: 'text-violet-600',
                dot: 'bg-violet-400',
                exams: filtered
                    .filter((exam) => {
                        const status = getExamDisplayStatus(exam, nowMs);
                        return status === 'conducted' || status === 'completed';
                    })
                    .map(toBoardExam),
            },
        ];
    }, [boardSearch, exams, sessions]);

    const examTimeline = useMemo(() => {
        return exams
            .filter((exam) => exam.scheduled_at)
            .sort((a, b) => (parseDateMs(a.scheduled_at) ?? 0) - (parseDateMs(b.scheduled_at) ?? 0))
            .map((exam) => {
                const date = exam.scheduled_at ? new Date(exam.scheduled_at) : null;
                const year = date && !Number.isNaN(date.getTime()) ? String(date.getFullYear()) : 'TBD';
                return {
                    id: exam.id,
                    title: exam.title,
                    stamp: formatBoardTime(exam.scheduled_at),
                    year,
                };
            })
            .slice(0, 12);
    }, [exams]);

    const activity = useMemo<ActivityItem[]>(() => {
        const items: Array<ActivityItem & { ts: number }> = [];
        const examsById = exams.reduce<Record<string, ExamRow>>((acc, exam) => {
            acc[exam.id] = exam;
            return acc;
        }, {});

        for (const session of sessions) {
            const student = profiles[session.student_id]?.name ?? 'Student';
            const examTitle = examsById[session.exam_id]?.title ?? 'Exam';

            if (session.completed_at) {
                const ts = parseDateMs(session.completed_at) ?? 0;
                items.push({
                    id: `${session.id}-submit`,
                    kind: 'submit',
                    text: `${student} submitted ${examTitle}`,
                    time: formatRelative(session.completed_at),
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    ts,
                });
            }

            const flags = normalizeFlags(session.proctoring_flags, session.started_at);
            for (const flag of flags) {
                const ts = parseDateMs(flag.timestamp) ?? 0;
                const label = flag.type.replace(/_/g, ' ');
                items.push({
                    id: `${session.id}-flag-${flag.type}-${ts}`,
                    kind: 'flag',
                    text: `${student} flagged — ${label}`,
                    time: formatRelative(flag.timestamp),
                    color: flag.severity === 'high' ? 'text-red-500' : flag.severity === 'medium' ? 'text-amber-600' : 'text-blue-600',
                    bg: flag.severity === 'high' ? 'bg-red-50' : flag.severity === 'medium' ? 'bg-amber-50' : 'bg-blue-50',
                    ts,
                });
            }
        }

        return items
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 8)
            .map(({ ts, ...item }) => item);
    }, [exams, profiles, sessions]);

    const violationMix = useMemo<ViolationMixItem[]>(() => {
        const counts = new Map<string, number>();
        for (const session of sessions) {
            const flags = normalizeFlags(session.proctoring_flags, session.started_at);
            for (const flag of flags) {
                counts.set(flag.type, (counts.get(flag.type) ?? 0) + 1);
            }
        }

        return [...counts.entries()]
            .map(([type, count]) => ({ type, label: formatViolationType(type), count }))
            .sort((left, right) => right.count - left.count);
    }, [sessions]);

    const trustSeries = useMemo(() => {
        const latestByStudent = new Map<string, SessionRow>();
        for (const session of sessions) {
            const currentTs = parseDateMs(session.completed_at) ?? parseDateMs(session.started_at) ?? 0;
            const prev = latestByStudent.get(session.student_id);
            const prevTs = prev ? (parseDateMs(prev.completed_at) ?? parseDateMs(prev.started_at) ?? 0) : -1;
            if (!prev || currentTs > prevTs) {
                latestByStudent.set(session.student_id, session);
            }
        }

        const points = [...latestByStudent.entries()]
            .map(([studentId, session]) => {
                const trust = Math.max(0, Math.min(100, Math.round(session.percentage ?? 0)));
                const name = profiles[studentId]?.name?.trim() || 'Student';
                return {
                    key: studentId,
                    label: name.split(' ').slice(0, 2).join(' '),
                    trust,
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label))
            .slice(0, 8)
            .map((point, index) => ({ ...point, x: index + 1 }));

        const maxX = Math.max(1, points.length - 1);
        const xStart = 58;
        const xEnd = 468;
        const yBottom = 252;
        const yTop = 24;

        const getCoord = (x: number, y: number) => ({
            x: xStart + ((x - 1) / maxX) * (xEnd - xStart),
            y: yBottom - (y / 100) * (yBottom - yTop),
        });

        const toSmoothPath = (coords: Array<{ x: number; y: number }>) => {
            if (!coords.length) return '';
            if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
            return coords
                .map((point, i) => {
                    if (i === 0) return `M ${point.x} ${point.y}`;
                    const prev = coords[i - 1];
                    const cx = (prev.x + point.x) / 2;
                    return `Q ${cx} ${prev.y}, ${point.x} ${point.y}`;
                })
                .join(' ');
        };

        const coords = points.map((point) => getCoord(point.x, point.trust));
        const yTicks = [0, 20, 40, 60, 80, 100];

        return {
            points,
            coords,
            linePath: toSmoothPath(coords),
            yTicks,
            bounds: { xStart, xEnd, yBottom, yTop },
        };
    }, [profiles, sessions]);

    const courseSummary = useMemo(() => {
        const examCountByCourse = new Map<string, number>();
        for (const exam of exams) {
            const key = exam.course?.trim().toLowerCase() || 'unassigned';
            examCountByCourse.set(key, (examCountByCourse.get(key) ?? 0) + 1);
        }

        const enrolledByCourse = new Map<string, number>();
        for (const row of enrollments) {
            const key = row.course_id ?? 'unassigned';
            enrolledByCourse.set(key, (enrolledByCourse.get(key) ?? 0) + 1);
        }

        const liveByCourse = new Map<string, number>();
        for (const exam of exams) {
            const key = exam.course?.trim().toLowerCase() || 'unassigned';
            if (getExamDisplayStatus(exam) === 'active') {
                liveByCourse.set(key, (liveByCourse.get(key) ?? 0) + 1);
            }
        }

        const topCourses = courses
            .map((course) => {
                const label = course.name?.trim() || course.code?.trim() || 'Course';
                const nameKey = course.name?.trim().toLowerCase() ?? '';
                const codeKey = course.code?.trim().toLowerCase() ?? '';
                const examsCount = (nameKey ? examCountByCourse.get(nameKey) ?? 0 : 0) + (codeKey && codeKey !== nameKey ? examCountByCourse.get(codeKey) ?? 0 : 0);
                const enrolledCount = enrolledByCourse.get(course.id) ?? 0;
                const liveCount = (nameKey ? liveByCourse.get(nameKey) ?? 0 : 0) + (codeKey && codeKey !== nameKey ? liveByCourse.get(codeKey) ?? 0 : 0);
                return { id: course.id, label, examsCount, enrolledCount, liveCount };
            })
            .sort((a, b) => b.examsCount - a.examsCount || b.enrolledCount - a.enrolledCount)
            .slice(0, 4);

        return {
            totalCourses: courses.length,
            totalEnrollments: enrollments.length,
            topCourses,
        };
    }, [courses, enrollments, exams]);

    const getExamRoute = useCallback((status: BoardColumn['id'], examId: string) => {
        if (status === 'active') return '/dashboard/instructor/proctoring';
        if (status === 'completed') return `/dashboard/instructor/results/${examId}`;
        return `/dashboard/instructor/exams/${examId}/edit`;
    }, []);

    const openExamMenu = useCallback((examId: string, event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setMenuExamId((current) => (current === examId ? null : examId));
    }, []);

    const mapDots = useMemo(() => {
        const hub = { lat: 20.5937, lng: 78.9629, label: 'Instructor Hub' };
        const activeIds = sessions.filter((session) => session.status === 'active').map((session) => session.student_id);
        const fallbackIds = sessions.map((session) => session.student_id);
        const sourceIds = (activeIds.length ? activeIds : fallbackIds).filter(Boolean);

        const uniqueCodes = new Set<string>();
        for (const studentId of sourceIds) {
            const code = extractCountryCode(profiles[studentId]?.phone ?? null);
            if (code) uniqueCodes.add(code);
        }

        return [...uniqueCodes]
            .map((code) => COUNTRY_COORDS[code])
            .filter(Boolean)
            .map((country) => ({ start: hub, end: { lat: country.lat, lng: country.lng, label: country.label } }));
    }, [profiles, sessions]);

    const avatarTooltipItems = useMemo(() => {
        const byStudent = new Map<string, { id: number; name: string; designation: string; image: string }>();
        let idx = 1;

        for (const session of sessions) {
            if (byStudent.has(session.student_id)) continue;
            const profile = profiles[session.student_id];
            byStudent.set(session.student_id, {
                id: idx,
                name: profile?.name ?? 'Student',
                designation: profile?.email ?? 'Exam participant',
                image: profile?.avatarUrl ?? MOCK_AVATARS[(idx - 1) % MOCK_AVATARS.length],
            });
            idx += 1;
            if (byStudent.size >= 6) break;
        }

        const items = [...byStudent.values()];
        while (items.length < 6) {
            const fallbackIndex = items.length;
            items.push({
                id: 100 + fallbackIndex,
                name: `Student ${fallbackIndex + 1}`,
                designation: 'Exam participant',
                image: MOCK_AVATARS[fallbackIndex % MOCK_AVATARS.length],
            });
        }
        return items.slice(0, 6);
    }, [profiles, sessions]);

    if (loading) {
        return (
            <div className="instructor-home flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <ClientOnly>
        <div className="instructor-home">
            {/* Breadcrumb + header */}
            <motion.div {...fadeUp(0)} className="instructor-home__header">
                <div>
                    <p className="instructor-home__breadcrumb">
                        <span>EulerPro</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>Instructor Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="font-semibold text-gray-900">Overview</span>
                    </p>
                    <h1 className="instructor-home__title">My Workspace</h1>
                </div>
                <div className="instructor-home__header-actions flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => window.dispatchEvent(new Event('instructor-cmdk-open'))}
                        className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-slate-50"
                    >
                        <Command className="mr-2 h-4 w-4 text-slate-500" />
                        <span className="mr-2 hover:text-indigo-600">Jump to...</span>
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">CMD+K</span>
                    </Button>
                    <Link href="/dashboard/instructor/exams/new">
                        <Button className="instructor-home__new-btn">
                            <Plus className="w-4 h-4" /> New Exam
                        </Button>
                    </Link>
                </div>
            </motion.div>

            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Top Row: World Map + Bento Stats */}
            <motion.section {...fadeUp(0.08)} className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-stretch">
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] xl:col-span-7 xl:h-90 [&>div]:h-full [&>div]:aspect-auto">
                    <div className="pointer-events-none absolute left-7 top-6 z-10 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
                        Student Location Pulse
                    </div>
                    <WorldMap dots={mapDots} lineColor="#4f46e5" />
                </div>

                <div className="xl:col-span-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)] xl:h-90">
                    <div className="grid h-full grid-cols-6 auto-rows-fr gap-0">
                        <div className="group relative col-span-6 row-span-2 overflow-hidden border-b border-slate-100 p-4 sm:col-span-4">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.22),transparent_48%),radial-gradient(circle_at_85%_35%,rgba(14,165,233,0.18),transparent_45%)] transition duration-500 group-hover:scale-110 group-hover:translate-x-1" />
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.1)_1px,transparent_1px)] bg-size-[18px_18px] opacity-50 transition duration-500 group-hover:bg-position-[14px_10px]" />
                            <div className="relative">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">Exam Stats</p>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Total</p>
                                        <p className="mt-1 font-mono text-2xl font-semibold text-slate-900">{metrics.totalExams}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Live</p>
                                        <p className="mt-1 font-mono text-2xl font-semibold text-emerald-600">{metrics.liveExams}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Scheduled</p>
                                        <p className="mt-1 font-mono text-2xl font-semibold text-blue-600">{metrics.scheduledExams}</p>
                                    </div>
                                </div>
                                <div className="group/marquee mt-3 rounded-lg border border-slate-200/80 bg-white/70 px-2 py-1.5">
                                    <div className="relative overflow-hidden">
                                        <div className="absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r from-white to-transparent" />
                                        <div className="absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-white to-transparent" />
                                        <div className="exam-timeline-marquee relative group-hover/marquee:[animation-play-state:paused]">
                                            <span className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-slate-300/80" />
                                            {[...(examTimeline.length ? examTimeline : [{ id: 'empty', title: 'No scheduled exams yet', stamp: 'Pending', year: 'TBD' }]), ...(examTimeline.length ? examTimeline : [{ id: 'empty', title: 'No scheduled exams yet', stamp: 'Pending', year: 'TBD' }])].map((entry, idx) => {
                                                const placeTop = idx % 2 === 0;
                                                const dotClass = idx % 4 === 0
                                                    ? 'bg-blue-500'
                                                    : idx % 4 === 1
                                                        ? 'bg-emerald-500'
                                                        : idx % 4 === 2
                                                            ? 'bg-amber-500'
                                                            : 'bg-rose-500';

                                                return (
                                                    <span key={`${entry.id}-${idx}`} className="relative inline-block h-24 w-44 shrink-0 align-top">
                                                        <span className={cn('absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white', dotClass)} />
                                                        {placeTop ? (
                                                            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-3 text-[9px] font-semibold text-slate-400">{entry.year}</span>
                                                        ) : (
                                                            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-5 text-[9px] font-semibold text-slate-400">{entry.year}</span>
                                                        )}

                                                        {placeTop ? (
                                                            <span className="absolute inset-x-3 bottom-[53%] text-center">
                                                                <span className="block w-full truncate text-[10px] font-semibold text-slate-700" title={entry.title}>{entry.title}</span>
                                                                <span className="block text-[9px] text-slate-500">{entry.stamp}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="absolute inset-x-3 top-[53%] text-center">
                                                                <span className="block w-full truncate text-[10px] font-semibold text-slate-700" title={entry.title}>{entry.title}</span>
                                                                <span className="block text-[9px] text-slate-500">{entry.stamp}</span>
                                                            </span>
                                                        )}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="group relative col-span-3 row-span-1 overflow-hidden border-b border-l border-slate-100 p-4 sm:col-span-2">
                            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.24),rgba(255,255,255,0)_40%)] transition duration-500 group-hover:bg-[linear-gradient(120deg,rgba(16,185,129,0.3),rgba(255,255,255,0)_60%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(rgba(16,185,129,0.22)_1px,transparent_1px)] bg-size-[11px_11px] opacity-40 transition duration-500 group-hover:bg-position-[8px_12px]" />
                            <div className="relative">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">Active Students</p>
                                <p className="mt-2 inline-flex rounded-full bg-emerald-50/90 px-3 py-1 font-mono text-2xl font-semibold text-emerald-700">{metrics.activeStudents}</p>
                            </div>
                        </div>

                        <div className="group relative col-span-3 row-span-1 overflow-hidden border-b border-l border-slate-100 p-4 sm:col-span-2">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(245,158,11,0.3),transparent_50%)] transition duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,rgba(245,158,11,0.15)_0,rgba(245,158,11,0.15)_8px,transparent_8px,transparent_16px)] opacity-45 transition duration-500 group-hover:bg-position-[18px_0]" />
                            <div className="relative">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">Average Score</p>
                                <p className="mt-2 inline-flex rounded-full bg-amber-50/90 px-3 py-1 font-mono text-2xl font-semibold text-amber-700">{metrics.avgScore}%</p>
                            </div>
                        </div>

                        <div className="group relative col-span-2 row-span-1 overflow-hidden border-l border-slate-100 p-4 sm:col-span-2">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(248,113,113,0.28),transparent_55%)] transition duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(239,68,68,0.16)_1px,transparent_1px)] bg-size-[10px_10px] opacity-35 transition duration-500 group-hover:bg-position-[10px_0]" />
                            <div className="relative">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">Open Flags</p>
                                <p className="mt-2 inline-flex rounded-full bg-red-50/90 px-3 py-1 font-mono text-2xl font-semibold text-red-600">{metrics.openFlags}</p>
                                <p className="mt-1 text-xs text-slate-500">{metrics.highFlags} high severity</p>
                            </div>
                        </div>

                        <div className="group relative col-span-4 row-span-1 overflow-hidden border-l border-slate-100 p-4 sm:col-span-4">
                            <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(59,130,246,0.2),rgba(255,255,255,0)_50%)] transition duration-500 group-hover:bg-[linear-gradient(130deg,rgba(59,130,246,0.28),rgba(255,255,255,0)_60%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(rgba(59,130,246,0.2)_1px,transparent_1px)] bg-size-[14px_14px] opacity-40 transition duration-500 group-hover:bg-position-[10px_8px]" />
                            <div className="relative flex h-full flex-col">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">Live Participants</p>
                                <AnimatedTooltip items={avatarTooltipItems} className="mt-auto max-w-full justify-start" />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Board + Activity */}
            <div className="instructor-home__body">
                {/* Kanban-style exam board */}
                <div className="flex h-full flex-col gap-3">
                    <motion.div {...fadeUp(0.26)} className="instructor-board">
                        <div className="instructor-board__header">
                            <h2 className="instructor-board__title">Exam Board</h2>
                            <input
                                className="instructor-board__search"
                                placeholder="Filter exams…"
                                value={boardSearch}
                                onChange={e => setBoardSearch(e.target.value)}
                            />
                        </div>
                        <div className="instructor-board__cols">
                            {boardColumns.map((col, ci) => {
                                const filtered = col.exams;
                                return (
                                    <motion.div
                                        key={col.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + ci * 0.07 }}
                                        className="instructor-board__col"
                                    >
                                        <div className="instructor-board__col-header">
                                            <span className={cn('flex items-center gap-1.5', col.color)}>
                                                <span className={cn('w-2 h-2 rounded-full', col.dot)} />
                                                <span className="font-semibold text-xs uppercase tracking-wide">{col.label}</span>
                                            </span>
                                            <span className="text-xs text-gray-400 tabular-nums">{filtered.length}</span>
                                        </div>
                                        <div className="instructor-board__col-items">
                                            {filtered.map((exam, ei) => (
                                                <motion.div
                                                    key={exam.id}
                                                    initial={{ opacity: 0, scale: 0.97 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.35 + ei * 0.05 }}
                                                    className="instructor-board__card relative"
                                                    onClick={() => {
                                                        setMenuExamId(null);
                                                        router.push(getExamRoute(col.id, exam.id));
                                                    }}
                                                >
                                                    <div className="mb-1.5 flex items-start justify-between gap-2">
                                                        <p className="instructor-board__card-title">{exam.title}</p>
                                                        <button className="instructor-board__card-more" onClick={(event) => openExamMenu(exam.id, event)}>
                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                    {menuExamId === exam.id && (
                                                        <div
                                                            className="absolute right-2 top-8 z-20 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
                                                            onClick={(event) => event.stopPropagation()}
                                                        >
                                                            <button
                                                                className="w-full rounded-md px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                                                                onClick={() => {
                                                                    setMenuExamId(null);
                                                                    router.push(getExamRoute(col.id, exam.id));
                                                                }}
                                                            >
                                                                Open
                                                            </button>
                                                            <button
                                                                className="w-full rounded-md px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                                                                onClick={() => {
                                                                    setMenuExamId(null);
                                                                    router.push(`/dashboard/instructor/results/${exam.id}`);
                                                                }}
                                                            >
                                                                View Results
                                                            </button>
                                                            <button
                                                                className="w-full rounded-md px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                                                                onClick={() => {
                                                                    setMenuExamId(null);
                                                                    router.push(`/dashboard/instructor/exams/${exam.id}/edit`);
                                                                }}
                                                            >
                                                                Edit Exam
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between">
                                                        <Badge className="border-0 bg-gray-100 px-1.5 py-0 text-[10px] font-medium text-gray-500">
                                                            {exam.course}
                                                        </Badge>
                                                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                                            <Clock className="h-2.5 w-2.5" />{exam.due}
                                                        </span>
                                                    </div>
                                                    {col.id === 'active' && (
                                                        <Link
                                                            href={`/dashboard/instructor/proctoring`}
                                                            className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                                                        >
                                                            <Eye className="h-3 w-3" /> Monitor
                                                        </Link>
                                                    )}
                                                </motion.div>
                                            ))}
                                            {filtered.length === 0 && (
                                                <div className="instructor-board__empty">
                                                    <Circle className="h-4 w-4 opacity-20" />
                                                    <span>No exams</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>

                    <motion.div
                        {...fadeUp(0.29)}
                        className="grid min-h-88 grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                        <div className="group relative h-full min-h-88 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_45%),radial-gradient(circle_at_85%_75%,rgba(34,197,94,0.12),transparent_45%)] transition duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-size-[16px_16px] opacity-70 transition duration-500 group-hover:bg-position-[12px_10px]" />
                            <div className="relative">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Course Summary</p>
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Courses</p>
                                        <p className="font-mono text-2xl font-semibold text-slate-900">{courseSummary.totalCourses}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Enrollments</p>
                                        <p className="font-mono text-2xl font-semibold text-slate-900">{courseSummary.totalEnrollments}</p>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1.5">
                                    {(courseSummary.topCourses.length ? courseSummary.topCourses : [{ id: 'fallback', label: 'No active courses', examsCount: 0, enrolledCount: 0, liveCount: 0 }]).map((course) => (
                                        <div key={course.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white/80 px-2.5 py-1.5 text-xs">
                                            <span className="truncate pr-2 font-medium text-slate-700">{course.label}</span>
                                            <span className="whitespace-nowrap text-slate-500">{course.examsCount} exams • {course.liveCount} live</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="group relative h-full min-h-88 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.2),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(251,191,36,0.14),transparent_50%)] transition duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,rgba(99,102,241,0.08)_0,rgba(99,102,241,0.08)_8px,transparent_8px,transparent_16px)] opacity-60 transition duration-500 group-hover:bg-position-[16px_0]" />
                            <div className="relative flex h-full flex-col">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Trust Score Signal</p>
                                    <p className="text-[11px] font-semibold text-slate-600">{metrics.completionRate}% completion</p>
                                </div>

                                {trustSeries.points.length < 2 ? (
                                    <p className="rounded-lg border border-slate-100 bg-white/80 px-3 py-6 text-center text-sm text-slate-500">
                                        Not enough timeline points yet.
                                    </p>
                                ) : (
                                    <div className="flex-1 rounded-lg border border-slate-100 bg-white/85 p-2">
                                        <svg viewBox="0 0 520 300" className="h-full min-h-72 w-full">
                                            {trustSeries.yTicks.map((tick) => {
                                                const y = trustSeries.bounds.yBottom - (tick / 100) * (trustSeries.bounds.yBottom - trustSeries.bounds.yTop);
                                                return (
                                                    <g key={tick}>
                                                        <line x1={trustSeries.bounds.xStart} y1={y} x2={trustSeries.bounds.xEnd} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                                                        <text x="18" y={y + 4} fontSize="10" fill="#64748b">{tick}</text>
                                                    </g>
                                                );
                                            })}
                                            <line x1={trustSeries.bounds.xStart} y1={trustSeries.bounds.yTop} x2={trustSeries.bounds.xStart} y2={trustSeries.bounds.yBottom} stroke="#cbd5e1" strokeWidth="1" />
                                            <line x1={trustSeries.bounds.xStart} y1={trustSeries.bounds.yBottom} x2={trustSeries.bounds.xEnd} y2={trustSeries.bounds.yBottom} stroke="#cbd5e1" strokeWidth="1" />

                                            <path d={trustSeries.linePath} fill="none" stroke="#2563eb" strokeWidth="3" />

                                            {trustSeries.points.map((point, idx) => {
                                                const isHovered = hoveredTrustPoint === point.key;
                                                return (
                                                    <g key={point.key}>
                                                        <circle
                                                            cx={trustSeries.coords[idx].x}
                                                            cy={trustSeries.coords[idx].y}
                                                            r={isHovered ? '5' : '3.5'}
                                                            fill="#2563eb"
                                                            onMouseEnter={() => setHoveredTrustPoint(point.key)}
                                                            onMouseLeave={() => setHoveredTrustPoint(null)}
                                                        />
                                                        {isHovered && (
                                                            <g>
                                                                <rect
                                                                    x={trustSeries.coords[idx].x - 64}
                                                                    y={Math.max(8, trustSeries.coords[idx].y - 34)}
                                                                    width="128"
                                                                    height="22"
                                                                    rx="6"
                                                                    fill="#0f172a"
                                                                    opacity="0.92"
                                                                />
                                                                <text
                                                                    x={trustSeries.coords[idx].x}
                                                                    y={Math.max(22, trustSeries.coords[idx].y - 20)}
                                                                    textAnchor="middle"
                                                                    fontSize="10"
                                                                    fill="#f8fafc"
                                                                >
                                                                    {`${point.label}: ${point.trust}%`}
                                                                </text>
                                                            </g>
                                                        )}
                                                        <text x={trustSeries.coords[idx].x} y={trustSeries.bounds.yBottom + 14} fontSize="10" fill="#475569" textAnchor="middle">{point.x}</text>
                                                    </g>
                                                );
                                            })}

                                            <text x="10" y="18" fontSize="10" fill="#64748b">Trust Score</text>
                                            <text x="470" y="286" fontSize="10" fill="#64748b">Students</text>
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Activity feed */}
                <motion.div {...fadeUp(0.32)} className="instructor-activity flex min-h-0 flex-col xl:min-h-176 xl:max-h-176">
                    <div className="instructor-activity__header">
                        <h2 className="instructor-activity__title">Activity Feed</h2>
                        <span className="instructor-activity__live">
                            <span className="activity-live-dot" /> Live
                        </span>
                    </div>
                    <div className="instructor-activity__list flex-1 min-h-0">
                        <div className="border border-slate-100 bg-slate-50/70 p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Violation Mix</p>
                                <span className="text-[11px] text-slate-500">{violationMix.length} types</span>
                            </div>
                            {violationMix.length === 0 ? (
                                <p className="text-sm text-slate-500">No violation categories recorded yet.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {violationMix.slice(0, 8).map((item) => (
                                        <span
                                            key={item.type}
                                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700"
                                        >
                                            <span className="font-semibold text-slate-900">{item.count}</span>
                                            <span>{item.label}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {activity.length === 0 ? (
                            <div className="instructor-activity__item">
                                <div className="instructor-activity__dot bg-slate-100 text-slate-400">
                                    <Circle className="w-2.5 h-2.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="instructor-activity__text">No activity yet. It will stream in as sessions progress.</p>
                                    <p className="instructor-activity__time">Awaiting events</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative min-h-0 flex-1 overflow-hidden">
                                <motion.div
                                    animate={{ y: ['0%', '-50%'] }}
                                    transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                                >
                                    {[...activity, ...activity].map((item, i) => (
                                        <div key={`${item.id}-${i}`} className="instructor-activity__item">
                                            <div className={cn('instructor-activity__dot', item.bg, item.color)}>
                                                {item.kind === 'flag' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="instructor-activity__text">{item.text}</p>
                                                <p className="instructor-activity__time">{item.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-white to-transparent" />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-white to-transparent" />
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            <style jsx>{`
                .exam-timeline-marquee {
                    display: inline-block;
                    min-width: 100%;
                    white-space: nowrap;
                    animation: exam-timeline-marquee 42s linear infinite;
                }

                @keyframes exam-timeline-marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
            `}</style>
        </div>
        </ClientOnly>
    );
}
