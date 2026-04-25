'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    ArrowUpRight,
    BookOpen,
    Check,
    ChevronRight,
    Copy,
    GraduationCap,
    Layers3,
    MapIcon,
    Search,
    Sparkles,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContainerTextFlip } from '@/components/ui/container-text-flip';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import ClientOnly from '@/components/shared/ClientOnly';

type CourseRecord = {
    id: string;
    course_id: string;
    enrolled_at: string | null;
    student_name: string | null;
    enrollment_no: string | null;
    courses: {
        id: string;
        instructor_id: string | null;
        name: string;
        code: string | null;
        description: string | null;
        cover_image_url: string | null;
    } | null;
};

type CourseTile = {
    id: string;
    enrollmentId: string;
    enrolledAt: string | null;
    studentName: string | null;
    enrollmentNo: string | null;
    name: string;
    code: string | null;
    description: string | null;
    coverImageUrl: string | null;
    instructorName: string | null;
    instructorEmail: string | null;
    totalExams: number;
    liveExams: number;
    upcomingExams: number;
    classmates: number;
};

type InstructorProfile = {
    id: string;
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
};

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.36, delay, ease: 'easeOut' as const },
});

const CARD_STYLES = [
    {
        shell: '',
        halo: 'from-[#4b3fe9]/18 via-[#4b3fe9]/6 to-transparent',
        accent: 'from-[#4b3fe9] to-[#7c3aed]',
        chip: 'bg-[#eef2ff] text-[#4338ca] border-[#c7d2fe]',
    },
    {
        shell: '',
        halo: 'from-[#0f766e]/18 via-[#14b8a6]/8 to-transparent',
        accent: 'from-[#0f766e] to-[#14b8a6]',
        chip: 'bg-[#ecfeff] text-[#0f766e] border-[#99f6e4]',
    },
    {
        shell: '',
        halo: 'from-[#d97706]/18 via-[#f59e0b]/8 to-transparent',
        accent: 'from-[#d97706] to-[#f59e0b]',
        chip: 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]',
    },
];

function formatDate(iso: string | null) {
    if (!iso) return 'Recently linked';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'Recently linked';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function countExamBuckets(exams: Array<{ course_id: string | null; status: string; scheduled_at: string | null; duration: number | null }>) {
    const totals = new Map<string, { total: number; live: number; upcoming: number }>();
    const nowMs = Date.now();

    for (const exam of exams) {
        if (!exam.course_id) continue;
        const current = totals.get(exam.course_id) ?? { total: 0, live: 0, upcoming: 0 };
        current.total += 1;

        if (exam.status === 'archived' || exam.status === 'draft' || exam.status === 'completed') {
            totals.set(exam.course_id, current);
            continue;
        }

        const scheduled = exam.scheduled_at ? new Date(exam.scheduled_at).getTime() : null;
        const durationMinutes = Math.max(0, exam.duration ?? 0);
        const endMs = scheduled !== null && !Number.isNaN(scheduled)
            ? scheduled + durationMinutes * 60_000
            : null;

        if (scheduled !== null && !Number.isNaN(scheduled) && scheduled > nowMs) {
            current.upcoming += 1;
        } else if (endMs !== null && nowMs >= endMs) {
            // Conducted exam: counted in total, not in live/upcoming.
        } else {
            current.live += 1;
        }

        totals.set(exam.course_id, current);
    }

    return totals;
}

function CourseGlyph({ tile, index }: { tile: CourseTile; index: number }) {
    const style = CARD_STYLES[index % CARD_STYLES.length];
    const trimmedCode = tile.code?.trim();

    return (
        <div className="relative h-52 w-full overflow-hidden bg-gray-100">
            {tile.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={tile.coverImageUrl}
                    alt={tile.name}
                    className="h-full w-full object-cover"
                />
            ) : (
                <div className={cn('flex h-full w-full items-center justify-center bg-linear-to-br', style.accent)}>
                    <div className="rounded-full border border-white/30 bg-white/15 p-6 backdrop-blur-sm">
                        <GraduationCap className="h-12 w-12 text-white" />
                    </div>
                </div>
            )}

            {/* dark gradient scrim for text readability */}
            <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/15 to-transparent" />

            {/* top badges row: keeps chips separated and prevents overlap */}
            <div className="absolute ml-3 inset-x-3 top-3 flex items-center justify-between gap-2">
                {trimmedCode ? (
                    <div className={cn('max-w-[65%] truncate rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] backdrop-blur-sm', style.chip)}>
                        <span>{trimmedCode}</span>
                    </div>
                ) : (
                    <div />
                )}

                <div className="shrink-0 whitespace-nowrap rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                    {tile.classmates} peers
                </div>
            </div>

            {/* bottom: course name */}
            <div className="absolute bottom-3 left-4 right-4">
                <h3 className="text-lg font-black leading-snug text-white drop-shadow">{tile.name}</h3>
            </div>
        </div>
    );
}

function CourseTileCard({ tile, index }: { tile: CourseTile; index: number }) {
    const router = useRouter();
    const style = CARD_STYLES[index % CARD_STYLES.length];
    const [copiedInstructorEmail, setCopiedInstructorEmail] = useState(false);

    const handleCopyInstructorEmail = async () => {
        if (!tile.instructorEmail) return;
        try {
            await navigator.clipboard.writeText(tile.instructorEmail);
            setCopiedInstructorEmail(true);
            setTimeout(() => setCopiedInstructorEmail(false), 1200);
        } catch {
            // Ignore clipboard failures silently to avoid noisy UI errors.
        }
    };

    return (
        <motion.article
            {...fadeUp(0.06 * index)}
            className={cn(
                'group relative overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_12px_48px_rgba(15,23,42,0.10)] transition-transform duration-300 hover:-translate-y-1',
                style.shell,
            )}
        >
            {/* full-bleed image — card overflow-hidden handles corner masking */}
            <CourseGlyph tile={tile} index={index} />

            {/* Exam Signal bar — sits flush below image */}
            <div className="flex items-center justify-end gap-4 border-b border-gray-100 bg-[#fafafc] px-4 py-3">
                <div className="flex shrink-0 items-center gap-3">
                    <p className="shrink-0 text-[10px] mt-1 font-bold uppercase tracking-[0.2em] text-gray-400">Exams Overview</p>
                    <div className="h-6 w-px shrink-0 bg-gray-200" />
                    <div className="text-center">
                        <p className="text-base font-black text-gray-900">{tile.totalExams}</p>
                        <p className="text-[10px] text-gray-400">total</p>
                    </div>
                    <div className="h-6 w-px shrink-0 bg-gray-200" />
                    <div className="text-center">
                        <p className="text-base font-bold text-emerald-600">{tile.liveExams}</p>
                        <p className="text-[10px] text-gray-400">live</p>
                    </div>
                    <div className="h-6 w-px shrink-0 bg-gray-200" />
                    <div className="text-center">
                        <p className="text-base font-bold text-blue-600">{tile.upcomingExams}</p>
                        <p className="text-[10px] text-gray-400">upcoming</p>
                    </div>
                </div>
            </div>

            {/* card body */}
            <div className="space-y-3 p-4">
                {/* enrollment + access grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-gray-100 bg-[#fafafc] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Enrollment</p>
                        <p className="mt-1.5 text-sm font-semibold text-gray-900">{formatDate(tile.enrolledAt)}</p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                            {tile.enrollmentNo ? `ID ${tile.enrollmentNo}` : 'Linked by instructor roster'}
                        </p>
                    </div>
                    <div className="group/instructor relative rounded-2xl border border-gray-100 bg-[#fafafc] p-3">
                        <button
                            type="button"
                            onClick={handleCopyInstructorEmail}
                            disabled={!tile.instructorEmail}
                            aria-label={copiedInstructorEmail ? 'Copied instructor email' : 'Copy instructor email'}
                            title={tile.instructorEmail ? 'Copy instructor email' : 'No instructor email available'}
                            className={cn(
                                'absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200',
                                !tile.instructorEmail && 'cursor-not-allowed opacity-35 hover:text-gray-500',
                                copiedInstructorEmail && 'border-emerald-200 text-emerald-600',
                            )}
                        >
                            {copiedInstructorEmail ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Instructor</p>
                        <p className="mt-1.5 truncate text-sm font-semibold text-gray-900">
                            {tile.instructorName ?? 'Instructor unavailable'}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-gray-500">
                            {tile.instructorEmail ?? 'No contact email available'}
                        </p>
                    </div>
                </div>

                {/* description */}
                {tile.description?.trim() && (
                    <p className="text-[13px] leading-5 text-gray-500">
                        {tile.description.trim()}
                    </p>
                )}

                {/* footer chips + CTA */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-gray-500">
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1">
                            <Users className="h-3 w-3 text-gray-400" />
                            {tile.classmates} enrolled
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1">
                            <BookOpen className="h-3 w-3 text-gray-400" />
                            {tile.totalExams} exams
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1">
                            <Layers3 className="h-3 w-3 text-gray-400" />
                            email-safe
                        </span>
                    </div>

                    <Button
                        onClick={() => router.push(`/dashboard/student/exams?courseId=${encodeURIComponent(tile.id)}`)}
                        className={cn('rounded-full px-4 text-xs font-semibold text-white shadow-sm', `bg-linear-to-r ${style.accent}`)}
                    >
                        Open Course Exams
                        <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </motion.article>
    );
}

export default function StudentCoursesPage() {
    const [courses, setCourses] = useState<CourseTile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email?.trim().toLowerCase();

        if (!user || !userEmail) {
            setError('Not authenticated');
            setLoading(false);
            return;
        }

        const { data: enrollmentRows, error: enrollmentError } = await supabase
            .from('course_enrollments')
            .select(`
                id,
                course_id,
                enrolled_at,
                student_name,
                enrollment_no,
                courses ( id, name, code, description, cover_image_url )
            `)
            .eq('student_email', userEmail)
            .order('enrolled_at', { ascending: false });

        if (enrollmentError) {
            setError(enrollmentError.message);
            setLoading(false);
            return;
        }

        const rows = (enrollmentRows ?? []) as unknown as CourseRecord[];
        const courseIds = [...new Set(rows.map((row) => row.course_id).filter(Boolean))];

        let examCounts = new Map<string, { total: number; live: number; upcoming: number }>();
        let classmateCounts = new Map<string, number>();
        let instructorProfiles = new Map<string, { name: string | null; email: string | null }>();
        let courseInstructorMap = new Map<string, string>();

        if (courseIds.length) {
            const [
                { data: examRows, error: examError },
                { data: rosterRows, error: rosterError },
                { data: courseRows, error: courseError },
            ] = await Promise.all([
                supabase
                    .from('exams')
                    .select('course_id, status, scheduled_at, duration')
                    .in('course_id', courseIds)
                    .neq('status', 'draft'),
                supabase
                    .from('course_enrollments')
                    .select('course_id')
                    .in('course_id', courseIds),
                supabase
                    .from('courses')
                    .select('id, instructor_id')
                    .in('id', courseIds),
            ]);

            if (examError) {
                setError(examError.message);
                setLoading(false);
                return;
            }

            if (rosterError) {
                setError(rosterError.message);
                setLoading(false);
                return;
            }

            if (courseError) {
                setError(courseError.message);
                setLoading(false);
                return;
            }

            examCounts = countExamBuckets((examRows ?? []) as Array<{ course_id: string | null; status: string; scheduled_at: string | null; duration: number | null }>);
            classmateCounts = (rosterRows ?? []).reduce((map: Map<string, number>, row: { course_id: string | null }) => {
                const courseId = (row as { course_id: string | null }).course_id;
                if (!courseId) return map;
                map.set(courseId, (map.get(courseId) ?? 0) + 1);
                return map;
            }, new Map<string, number>());

            courseInstructorMap = ((courseRows ?? []) as Array<{ id: string; instructor_id: string | null }>).reduce((map, row) => {
                if (row.id && row.instructor_id) map.set(row.id, row.instructor_id);
                return map;
            }, new Map<string, string>());

            const instructorIds = [...new Set(courseInstructorMap.values())];
            if (instructorIds.length) {
                const { data: profileRows, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', instructorIds);

                if (profileError) {
                    setError(profileError.message);
                    setLoading(false);
                    return;
                }

                instructorProfiles = ((profileRows ?? []) as InstructorProfile[]).reduce((map, profile) => {
                    map.set(profile.id, {
                        name: profile.full_name ?? profile.name ?? null,
                        email: profile.email ?? null,
                    });
                    return map;
                }, new Map<string, { name: string | null; email: string | null }>());
            }
        }

        const mapped = rows
            .filter((row) => row.courses)
            .map((row) => {
                const course = row.courses as NonNullable<CourseRecord['courses']>;
                const stats = examCounts.get(course.id) ?? { total: 0, live: 0, upcoming: 0 };
                const instructorId = courseInstructorMap.get(course.id) ?? course.instructor_id ?? undefined;
                const instructor = instructorId ? instructorProfiles.get(instructorId) : undefined;
                return {
                    id: course.id,
                    enrollmentId: row.id,
                    enrolledAt: row.enrolled_at,
                    studentName: row.student_name,
                    enrollmentNo: row.enrollment_no,
                    name: course.name,
                    code: course.code,
                    description: course.description,
                    coverImageUrl: course.cover_image_url,
                    instructorName: instructor?.name ?? null,
                    instructorEmail: instructor?.email ?? null,
                    totalExams: stats.total,
                    liveExams: stats.live,
                    upcomingExams: stats.upcoming,
                    classmates: classmateCounts.get(course.id) ?? 1,
                } satisfies CourseTile;
            });

        setCourses(mapped);
        setLoading(false);
    }, []);

    useEffect(() => {
        void fetchCourses();
    }, [fetchCourses]);

    const visibleCourses = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return courses;
        return courses.filter((course) =>
            course.name.toLowerCase().includes(query) ||
            (course.code ?? '').toLowerCase().includes(query) ||
            (course.description ?? '').toLowerCase().includes(query),
        );
    }, [courses, search]);

    const totals = useMemo(() => ({
        courses: courses.length,
        live: courses.reduce((sum, course) => sum + course.liveExams, 0),
        upcoming: courses.reduce((sum, course) => sum + course.upcomingExams, 0),
    }), [courses]);

    return (
        <ClientOnly>
        <div className="relative min-h-screen overflow-hidden bg-gray-50 px-6 py-8 md:px-8">

            <div className="relative mx-auto max-w-7xl space-y-8">
                <motion.section {...fadeUp(0)} className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur-sm md:p-8">
                    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px)', backgroundSize: '26px 26px', opacity:60 }} />
                    <div className="flex items-start gap-8 max-[900px]:flex-col">
                        <div className="min-w-0 space-y-6" style={{ width: 'calc(100% - 20rem - 2rem)' }}>
                            <div className="w-full">
                                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#4338ca]">
                                    <MapIcon className="h-3.5 w-3.5" />
                                    Course Atlas
                                </p>
                                <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-3xl">
                                    Dear Student,<br />Track your proctored courses and exam readiness from one command center, <span className="text-[#4338ca]">effortlessly.</span>
                                </h1>
                                <div className="mt-3 text-sm leading-6 text-gray-600 md:text-[15px]">
                                    Stay test-set with
                                    <ContainerTextFlip
                                        words={['smooth verification', 'smart reminders', 'faster starts ⚡️', 'clear priorities']}
                                        interval={2400}
                                        className="mx-1.5 text-[0.94em] md:text-[0.96em]"
                                        textClassName="leading-none"
                                        animationDuration={620}
                                    />
                                    while staying synced with instructor rosters and assessment timelines.
                                </div>
                            </div>

                            <div className="py-4 relative w-full max-w-none">
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="🔍 Search by course name, code, or note"
                                    className="h-12 rounded-full border-gray-200 bg-white text-sm placeholder:text-gray-400 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="w-80 shrink-0 max-[900px]:w-full">
                            <div className="grid gap-3">
                                {[
                                    {
                                        label: 'Courses',
                                        value: totals.courses,
                                        tone: 'text-[#4338ca] bg-gray-100',
                                        glow: 'radial-gradient(circle at bottom right, rgba(67,56,202,0.2) 0%, rgba(67,56,202,0.14) 20%, rgba(67,56,202,0.06) 30%, rgba(67,56,202,0) 40%)',
                                    },
                                    {
                                        label: 'Live Exams',
                                        value: totals.live,
                                        tone: 'text-emerald-700 bg-emerald-50',
                                        glow: 'radial-gradient(circle at bottom right, rgba(4,120,87,0.2) 0%, rgba(4,120,87,0.14) 20%, rgba(4,120,87,0.06) 30%, rgba(4,120,87,0) 40%)',
                                    },
                                    {
                                        label: 'Upcoming',
                                        value: totals.upcoming,
                                        tone: 'text-blue-700 bg-blue-50',
                                        glow: 'radial-gradient(circle at bottom right, rgba(29,78,216,0.2) 0%, rgba(29,78,216,0.14) 20%, rgba(29,78,216,0.06) 30%, rgba(29,78,216,0) 40%)',
                                    },
                                ].map((item) => (
                                    <div key={item.label} className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
                                        <div
                                            className="pointer-events-none absolute inset-0"
                                            style={{ backgroundImage: item.glow }}
                                        />
                                        <div className="relative">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
                                            <p className={cn('mt-2 inline-flex rounded-full px-3 py-1 text-2xl font-black', item.tone)}>{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.section>

                {error && (
                    <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 shadow-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {[0, 1, 2].map((index) => (
                            <div key={index} className="h-132 animate-pulse rounded-4xl border border-white/70 bg-white/70 shadow-sm" />
                        ))}
                    </div>
                ) : visibleCourses.length === 0 ? (
                    <motion.div {...fadeUp(0.08)} className="rounded-4xl border border-dashed border-gray-200 bg-white/75 px-8 py-16 text-center shadow-sm backdrop-blur-sm">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef2ff] text-[#4338ca]">
                            <GraduationCap className="h-8 w-8" />
                        </div>
                        <h2 className="mt-5 text-2xl font-black text-gray-900">No course boards matched</h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-500">
                            If an instructor enrolled you recently, this page will pick it up from your email-linked course roster automatically. Try clearing the search or refresh after the enrollment sync completes.
                        </p>
                    </motion.div>
                ) : (
                    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {visibleCourses.map((course, index) => (
                            <CourseTileCard key={course.enrollmentId} tile={course} index={index} />
                        ))}
                    </section>
                )}
            </div>
        </div>
        </ClientOnly>
    );
}
