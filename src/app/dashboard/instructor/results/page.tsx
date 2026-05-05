'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
	ArrowRight,
	BookOpenCheck,
	ChevronRight,
	Clock3,
	Loader2,
	Medal,
	RadioTower,
	RefreshCw,
	Sparkles,
	Trophy,
	Users,
	Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContainerTextFlip } from '@/components/ui/container-text-flip';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

type ExamRow = {
	id: string;
	title: string;
	status: string;
	scheduled_at: string | null;
	duration: number | null;
	passing_score: number | null;
	course_id: string | null;
};

type SessionRow = {
	id: string;
	exam_id: string;
	student_id: string;
	percentage: number | null;
	passed: boolean | null;
	completed_at: string | null;
	time_taken_seconds: number | null;
	score: number | null;
	max_score: number | null;
};

type CourseMap = Record<string, { name: string; code: string | null }>;
type ProfileMap = Record<string, { full_name: string | null; email: string | null }>;

type Band = {
	label: string;
	count: number;
	gradient: string;
	glow: string;
};

type ExamSummary = {
	exam: ExamRow;
	courseLabel: string;
	submissions: number;
	avg: number;
	passRate: number;
	avgTimeSeconds: number;
	latestCompletedAt: string | null;
	topStudent: string;
	topPercentage: number;
	riskCount: number;
	bands: Band[];
	trend: number[];
};

const SCORE_BANDS = [
	{ key: 'surge', label: '80+', min: 80, max: 100, gradient: 'linear-gradient(90deg, #22d3ee, #3b82f6)', glow: 'shadow-cyan-300/30' },
	{ key: 'steady', label: '60-79', min: 60, max: 79, gradient: 'linear-gradient(90deg, #34d399, #14b8a6)', glow: 'shadow-emerald-300/30' },
	{ key: 'watch', label: '40-59', min: 40, max: 59, gradient: 'linear-gradient(90deg, #fcd34d, #f97316)', glow: 'shadow-amber-300/30' },
	{ key: 'risk', label: '<40', min: 0, max: 39, gradient: 'linear-gradient(90deg, #fda4af, #ef4444)', glow: 'shadow-rose-300/30' },
] as const;

const fadeUp = (delay = 0) => ({
	initial: { opacity: 0, y: 16 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.38, delay, ease: 'easeOut' as const },
});

function parseDateMs(iso: string | null) {
	if (!iso) return null;
	const value = new Date(iso).getTime();
	return Number.isNaN(value) ? null : value;
}

function isConducted(exam: ExamRow, nowMs: number) {
	if (exam.status === 'archived' || exam.status === 'draft') {
		return false;
	}
	if (exam.status === 'completed') {
		return true;
	}
	const scheduledMs = parseDateMs(exam.scheduled_at);
	if (scheduledMs === null) {
		return exam.status === 'conducted';
	}
	const durationMinutes = Math.max(0, exam.duration ?? 0);
	return nowMs >= scheduledMs + durationMinutes * 60_000;
}

function formatShortDate(iso: string | null) {
	if (!iso) return 'Schedule pending';
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return 'Schedule pending';
	return parsed.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

function formatRelative(iso: string | null, nowMs: number) {
	if (!iso) return 'Awaiting submissions';
	const parsed = new Date(iso).getTime();
	if (Number.isNaN(parsed)) return 'Awaiting submissions';
	const diffMs = nowMs - parsed;
	const minutes = Math.max(1, Math.round(diffMs / 60_000));
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours} hr ago`;
	const days = Math.round(hours / 24);
	return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatDuration(seconds: number) {
	if (!seconds || seconds <= 0) return '0m';
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
}

function buildBands(values: number[]) {
	return SCORE_BANDS.map((band) => ({
		label: band.label,
		count: values.filter((value) => value >= band.min && value <= band.max).length,
		gradient: band.gradient,
		glow: band.glow,
	}));
}

function ScoreRing({ value, label, sublabel, accent }: { value: number; label: string; sublabel: string; accent: string }) {
	const safeValue = Math.max(0, Math.min(100, value));
	const radius = 52;
	const circumference = 2 * Math.PI * radius;
	const dash = circumference - (safeValue / 100) * circumference;

	return (
		<div className="relative flex items-center justify-center overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur" style={{ height: 206 }}>
			<div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top, rgba(56, 189, 248, 0.18), transparent 58%)' }} />
			<div className="relative flex flex-col items-center gap-3">
				<div className="relative">
					<svg width="138" height="138" viewBox="0 0 138 138" className="-rotate-90">
						<circle cx="69" cy="69" r={radius} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="10" />
						<motion.circle
							cx="69"
							cy="69"
							r={radius}
							fill="none"
							stroke="url(#results-ring-gradient)"
							strokeWidth="10"
							strokeLinecap="round"
							initial={{ strokeDashoffset: circumference }}
							animate={{ strokeDashoffset: dash }}
							transition={{ duration: 0.9, ease: 'easeOut' }}
							style={{ strokeDasharray: circumference }}
						/>
						<defs>
							<linearGradient id="results-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
								<stop offset="0%" stopColor="#67e8f9" />
								<stop offset="100%" stopColor={accent} />
							</linearGradient>
						</defs>
					</svg>
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">live</span>
						<span className="font-mono text-4xl font-semibold tracking-[-0.08em] text-slate-950">{safeValue}%</span>
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

function TrendBars({ values }: { values: number[] }) {
	const gradientId = useId();
	const normalized = (values.length ? values : [0, 0, 0, 0, 0, 0]).map((value) => Math.max(0, Math.min(100, value)));
	const chartWidth = 320;
	const chartHeight = 94;
	const topPadding = 10;
	const bottomPadding = 16;
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
		<div className="space-y-2">
			<div
				className="relative h-24 overflow-hidden rounded-xl border border-cyan-100/80"
				style={{ backgroundImage: 'linear-gradient(to bottom, rgba(236,254,255,0.7), rgba(255,255,255,1), rgba(248,250,252,1))' }}
			>
				<svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full">
					<defs>
						<linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="rgba(6,182,212,0.35)" />
							<stop offset="100%" stopColor="rgba(37,99,235,0.02)" />
						</linearGradient>
						<linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="1" y2="0">
							<stop offset="0%" stopColor="#06b6d4" />
							<stop offset="100%" stopColor="#2563eb" />
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
							r="2.8"
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

export default function InstructorResultsPage() {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [exams, setExams] = useState<ExamRow[]>([]);
	const [sessions, setSessions] = useState<SessionRow[]>([]);
	const [courses, setCourses] = useState<CourseMap>({});
	const [profiles, setProfiles] = useState<ProfileMap>({});
	const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			setNowMs(Date.now());
		}, 60_000);

		return () => window.clearInterval(intervalId);
	}, []);

	useEffect(() => {
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

			const { data: examRows, error: examError } = await supabase
				.from('exams')
				.select('id, title, status, scheduled_at, duration, passing_score, course_id')
				.eq('instructor_id', user.id)
				.order('scheduled_at', { ascending: false });

			if (examError) {
				if (!alive) return;
				setError(examError.message);
				setLoading(false);
				setRefreshing(false);
				return;
			}

			const safeExams = (examRows ?? []) as ExamRow[];
			const examIds = safeExams.map((exam) => exam.id);
			const courseIds = [...new Set(safeExams.map((exam) => exam.course_id).filter((value): value is string => Boolean(value)))];

			const [{ data: sessionRows, error: sessionError }, { data: courseRows, error: courseError }] = await Promise.all([
				examIds.length
					? supabase
						.from('exam_sessions')
						.select('id, exam_id, student_id, percentage, passed, completed_at, time_taken_seconds, score, max_score')
						.in('exam_id', examIds)
						.eq('status', 'completed')
						.order('completed_at', { ascending: false })
					: Promise.resolve({ data: [], error: null }),
				courseIds.length
					? supabase.from('courses').select('id, name, code').in('id', courseIds)
					: Promise.resolve({ data: [], error: null }),
			]);

			if (sessionError || courseError) {
				if (!alive) return;
				setError(sessionError?.message ?? courseError?.message ?? 'Unable to load results data');
				setLoading(false);
				setRefreshing(false);
				return;
			}

			const safeSessions = (sessionRows ?? []) as SessionRow[];
			const studentIds = [...new Set(safeSessions.map((session) => session.student_id).filter(Boolean))];
			const { data: profileRows, error: profileError } = studentIds.length
				? await supabase.from('profiles').select('id, full_name, email').in('id', studentIds)
				: { data: [], error: null };

			if (profileError) {
				if (!alive) return;
				setError(profileError.message);
				setLoading(false);
				setRefreshing(false);
				return;
			}

			if (!alive) return;

			setExams(safeExams);
			setSessions(safeSessions);
			setCourses(
				((courseRows ?? []) as Array<{ id: string; name: string; code: string | null }>).reduce<CourseMap>((acc, row) => {
					acc[row.id] = { name: row.name, code: row.code };
					return acc;
				}, {})
			);
			setProfiles(
				((profileRows ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>).reduce<ProfileMap>((acc, row) => {
					acc[row.id] = { full_name: row.full_name, email: row.email };
					return acc;
				}, {})
			);
			setLastSyncedAt(new Date().toISOString());
			setLoading(false);
			setRefreshing(false);
		};

		void loadData();

		const channel = supabase
			.channel('instructor-results-overview-live')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => {
				void loadData(true);
			})
			.on('postgres_changes', { event: '*', schema: 'public', table: 'exam_sessions' }, () => {
				void loadData(true);
			})
			.subscribe();

		return () => {
			alive = false;
			void supabase.removeChannel(channel);
		};
	}, []);

	const summaries = useMemo(() => {
		return exams
			.filter((exam) => isConducted(exam, nowMs))
			.map<ExamSummary>((exam) => {
				const examSessions = sessions.filter((session) => session.exam_id === exam.id);
				const values = examSessions.map((session) => Math.max(0, Math.min(100, session.percentage ?? 0)));
				const avg = values.length
					? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
					: 0;
				const passed = examSessions.filter((session) => session.passed).length;
				const passRate = examSessions.length ? Math.round((passed / examSessions.length) * 100) : 0;
				const avgTimeSeconds = examSessions.length
					? Math.round(
						examSessions.reduce((sum, session) => sum + Math.max(0, session.time_taken_seconds ?? 0), 0) /
						examSessions.length,
					)
					: 0;
				const topSession = [...examSessions].sort((left, right) => {
					const scoreDiff = (right.percentage ?? 0) - (left.percentage ?? 0);
					if (scoreDiff !== 0) return scoreDiff;
					return (left.time_taken_seconds ?? Number.MAX_SAFE_INTEGER) - (right.time_taken_seconds ?? Number.MAX_SAFE_INTEGER);
				})[0];
				const topProfile = topSession ? profiles[topSession.student_id] : null;
				const topStudent = topProfile?.full_name?.trim() || topProfile?.email || 'Awaiting submissions';
				const latestCompletedAt = examSessions.find((session) => session.completed_at)?.completed_at ?? null;
				const riskCount = examSessions.filter((session) => (session.percentage ?? 0) < (exam.passing_score ?? 60)).length;
				const trend = [...values].slice(0, 6).reverse();

				return {
					exam,
					courseLabel: exam.course_id ? `${courses[exam.course_id]?.code ?? courses[exam.course_id]?.name ?? 'Course stream'}` : 'Independent exam',
					submissions: examSessions.length,
					avg,
					passRate,
					avgTimeSeconds,
					latestCompletedAt,
					topStudent,
					topPercentage: topSession?.percentage ?? 0,
					riskCount,
					bands: buildBands(values),
					trend,
				};
			})
			.sort((left, right) => {
				const rightTs = parseDateMs(right.latestCompletedAt) ?? parseDateMs(right.exam.scheduled_at) ?? 0;
				const leftTs = parseDateMs(left.latestCompletedAt) ?? parseDateMs(left.exam.scheduled_at) ?? 0;
				return rightTs - leftTs;
			});
	}, [courses, exams, nowMs, profiles, sessions]);

	const overviewStats = useMemo(() => {
		const totalSubmissions = summaries.reduce((sum, item) => sum + item.submissions, 0);
		const avgScore = totalSubmissions
			? Math.round(summaries.reduce((sum, item) => sum + item.avg * item.submissions, 0) / totalSubmissions)
			: 0;
		const passRate = totalSubmissions
			? Math.round(
				(summaries.reduce((sum, item) => sum + Math.round((item.passRate / 100) * item.submissions), 0) / totalSubmissions) * 100,
			)
			: 0;
		const topExam = [...summaries].sort((left, right) => right.avg - left.avg)[0] ?? null;
		const aggregateBands = buildBands(
			summaries.flatMap((item) => item.trend.length ? item.trend : item.avg ? [item.avg] : []),
		);

		return {
			conducted: summaries.length,
			totalSubmissions,
			avgScore,
			passRate,
			topExam,
			aggregateBands,
		};
	}, [summaries]);

	const recentFeed = useMemo(() => {
		const conductedIds = new Set(summaries.map((item) => item.exam.id));
		return sessions
			.filter((session) => conductedIds.has(session.exam_id))
			.slice(0, 6)
			.map((session) => {
				const exam = summaries.find((item) => item.exam.id === session.exam_id)?.exam;
				const profile = profiles[session.student_id];
				return {
					id: session.id,
					name: profile?.full_name?.trim() || profile?.email || 'Unknown student',
					examTitle: exam?.title ?? 'Exam',
					percentage: session.percentage ?? 0,
					completedAt: session.completed_at,
				};
			});
	}, [profiles, sessions, summaries]);

	const topSurfaceSummaries = useMemo(
		() => [...summaries].sort((left, right) => right.avg - left.avg).slice(0, 3),
		[summaries],
	);

	const spotlight = summaries[0] ?? null;

	if (loading) {
		return (
			<div className="instructor-home flex items-center justify-center py-24">
				<Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="instructor-home space-y-4">
				<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
					{error}
				</div>
				<Link href="/dashboard/instructor/exams">
					<Button variant="outline">Back to Exams</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="instructor-home">
			<motion.div {...fadeUp(0)} className="instructor-home__header">
				<div>
					<p className="instructor-home__breadcrumb">
						<span>EulerPro</span>
						<ChevronRight className="h-3.5 w-3.5" />
						<span>Instructor Workspace</span>
						<ChevronRight className="h-3.5 w-3.5" />
						<span className="font-semibold text-slate-900">Results</span>
					</p>
					<h1 className="instructor-home__title">Results Deck</h1>
				</div>
				<div className="flex items-center gap-3">
					<div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-sm md:flex">
						<RadioTower className="h-3.5 w-3.5 text-cyan-500" />
						{refreshing ? 'Syncing live changes' : `Synced ${formatRelative(lastSyncedAt, nowMs)}`}
					</div>
					<Link href="/dashboard/instructor/exams">
						<Button variant="outline" className="rounded-full border border-slate-200 bg-white/90 text-slate-700">
							View Exams
						</Button>
					</Link>
				</div>
			</motion.div>

			{summaries.length === 0 ? (
				<motion.div
					{...fadeUp(0.08)}
					className="relative overflow-hidden rounded-[30px] border border-slate-200 p-8 shadow-[0_28px_70px_rgba(15,23,42,0.08)]"
					style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(34, 211, 238, 0.16), transparent 34%), linear-gradient(135deg, #ffffff, #f8fafc 58%, #eef2ff)' }}
				>
					<div className="absolute inset-y-0 right-0 w-1/3" style={{ backgroundImage: 'linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.08), transparent)' }} />
					<p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
						<Sparkles className="h-3.5 w-3.5" /> No conducted exams yet
					</p>
					<h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.06em] text-slate-950">
						Results will light up here once your first exam clears its schedule window.
					</h2>
					<p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
						Publish or run an exam, wait for the end time, and this space will turn into a live review surface with score signals, submission flow, and student-level drilldowns.
					</p>
					<div className="mt-6 flex flex-wrap gap-3">
						<Link href="/dashboard/instructor/exams/new">
							<Button className="bg-slate-950 text-white hover:bg-slate-800">Create Exam</Button>
						</Link>
						<Link href="/dashboard/instructor/exams">
							<Button variant="outline" className="border-slate-200">Inspect Schedule</Button>
						</Link>
					</div>
				</motion.div>
			) : (
				<>
					<div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
						<motion.section
							{...fadeUp(0.08)}
							className="relative overflow-hidden rounded-[30px] border border-slate-200 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] xl:col-span-8"
							style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(34, 211, 238, 0.15), transparent 28%), radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.16), transparent 26%), linear-gradient(135deg, #f8fafc, #ffffff 40%, #eef2ff)' }}
						>
						  <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)', backgroundSize: '26px 26px', opacity:60 }} />
							<div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
								<div className="max-w-2xl">
									<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
										<RefreshCw className={cn('h-3.5 w-3.5', refreshing ? 'animate-spin text-cyan-500' : 'text-slate-400')} />
										Conducted exams, rendered as live signal
									</div>
									<h2 className="text-3xl font-semibold leading-tight tracking-[-0.07em] text-slate-950 md:text-[2.7rem]">
										Results that feel{' '}
										<ContainerTextFlip
											words={['instant', 'precise', 'robust', 'accurate']}
											className="mx-1 border-cyan-100 bg-white/70 px-3 py-1"
											textClassName="text-slate-900"
										/>
										, by your students.
									</h2>
									<p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
										This cockpit combines conducted exams, latest submissions, and performance bands into one laptop-friendly surface. Every tile below links directly into the deeper roster and analytics view.
									</p>
								</div>

								<div className="grid flex-1 gap-3 sm:grid-cols-3 lg:grid-cols-1" style={{ minWidth: 280, maxWidth: 380 }}>
									{[
										{ label: 'Conducted', value: overviewStats.conducted, sub: 'closed windows' },
										{ label: 'Submissions', value: overviewStats.totalSubmissions, sub: 'graded sessions' },
										{ label: 'Network Avg', value: `${overviewStats.avgScore}%`, sub: `${overviewStats.passRate}% passing` },
									].map((item, index) => (
										<motion.div
											key={item.label}
											initial={{ opacity: 0, y: 18 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.16 + index * 0.06, duration: 0.36 }}
											className="rounded-[22px] border border-white/70 bg-white/75 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur"
										>
											<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">{item.label}</p>
											<p className="mt-2 font-mono text-3xl font-semibold tracking-[-0.08em] text-slate-950">{item.value}</p>
											<p className="mt-1 text-xs text-slate-700">{item.sub}</p>
										</motion.div>
									))}
								</div>
							</div>

							{spotlight && (
								<motion.div
									initial={{ opacity: 0, y: 18 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.28, duration: 0.4 }}
									className="relative mt-8 overflow-hidden rounded-[26px] border border-slate-200/80 px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
									style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(241,245,249,0.92))' }}
								>
									<div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
									<div className="absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
									<div className="relative grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
										<div>
											<div className="flex items-center justify-between gap-3">
												<div>
													<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-700">Spotlight exam</p>
													<h3 className="mt-2 text-xl font-semibold tracking-[-0.05em] text-slate-950">{spotlight.exam.title}</h3>
												</div>
												<span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs text-cyan-700">
													{spotlight.courseLabel}
												</span>
											</div>
											<div className="mt-5 grid gap-3 sm:grid-cols-3">
												<div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
													<p className="text-[11px] uppercase tracking-[0.22em] text-slate-600">Average</p>
													<p className="mt-2 font-mono text-3xl text-slate-950">{spotlight.avg}%</p>
												</div>
												<div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
													<p className="text-[11px] uppercase tracking-[0.22em] text-slate-600">Top run</p>
													<p className="mt-2 font-mono text-3xl text-slate-950">{spotlight.topPercentage}%</p>
												</div>
												<div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
													<p className="text-[11px] uppercase tracking-[0.22em] text-slate-600">Rhythm</p>
													<p className="mt-2 text-lg font-semibold text-slate-950">{formatDuration(spotlight.avgTimeSeconds)}</p>
												</div>
											</div>
										</div>
										<div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
											<div className="mb-3 flex items-center justify-between text-xs text-slate-700">
												<span>Recent performance wave</span>
												<span>{spotlight.submissions} submissions</span>
											</div>
											<TrendBars values={spotlight.trend} />
											<Link
												href={`/dashboard/instructor/results/${spotlight.exam.id}`}
												className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition hover:text-cyan-800"
											>
												Open deep result view <ArrowRight className="h-4 w-4" />
											</Link>
										</div>
									</div>
								</motion.div>
							)}
						</motion.section>

						<div className="grid gap-5 xl:col-span-4">
							<motion.section {...fadeUp(0.16)}>
								<ScoreRing
									value={overviewStats.passRate}
									label="Pass rate across conducted exams"
									sublabel={overviewStats.topExam ? `${overviewStats.topExam.exam.title} currently leads the field` : 'Waiting for enough attempts'}
									accent="#6366f1"
								/>
							</motion.section>

							<motion.section
								{...fadeUp(0.22)}
								className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-white/90 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)]"
							>
								<div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.12), transparent 40%)' }} />
								<div className="relative">
									<div className="mb-4 flex items-start justify-between gap-3">
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">Recent pulse</p>
											<h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">Latest completions</h3>
										</div>
										<Waves className="h-4 w-4 text-cyan-500" />
									</div>

									<div className="space-y-3">
										{recentFeed.length === 0 ? (
											<div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
												No completed attempts yet.
											</div>
										) : (
											recentFeed.slice(0, 4).map((item) => (
												<div key={item.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 transition hover:border-cyan-200 hover:bg-white">
													<div className="flex items-center justify-between gap-3">
														<div className="min-w-0">
															<p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
															<p className="truncate text-xs text-slate-600">{item.examTitle}</p>
														</div>
														<span className="font-mono text-lg font-semibold text-slate-900">{item.percentage}%</span>
													</div>
													<p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-600">{formatRelative(item.completedAt, nowMs)}</p>
												</div>
											))
										)}
									</div>
								</div>
							</motion.section>
						</div>
					</div>

					<div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
						<motion.section
							{...fadeUp(0.26)}
							className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.08)] xl:col-span-8"
						>
							<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Conducted signal board</p>
									<h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">Every completed window, distilled</h3>
								</div>
								<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
									{summaries.length} exams
								</span>
							</div>

							<div className="grid gap-3 p-4">
								{summaries.map((summary, index) => (
									<motion.div
										key={summary.exam.id}
										initial={{ opacity: 0, y: 18 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.3 + index * 0.05, duration: 0.36 }}
									>
										<Link
											href={`/dashboard/instructor/results/${summary.exam.id}`}
											className="group block overflow-hidden rounded-[26px] border border-slate-200 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_24px_60px_rgba(14,165,233,0.10)]"
											style={{ backgroundImage: 'linear-gradient(135deg, #ffffff, #f8fafc)' }}
										>
											<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
												<div className="min-w-0 flex-1">
													<div className="flex flex-wrap items-center gap-2">
														<span className="rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">
															{summary.courseLabel}
														</span>
														<span className="text-[11px] uppercase tracking-[0.22em] text-slate-600">
															{formatShortDate(summary.exam.scheduled_at)}
														</span>
													</div>
													<h4 className="mt-3 text-xl font-semibold tracking-[-0.05em] text-slate-950">{summary.exam.title}</h4>
													<div className="mt-4 grid gap-3 sm:grid-cols-3">
														{[
															{ label: 'Avg', value: `${summary.avg}%`, icon: BookOpenCheck },
															{ label: 'Pass', value: `${summary.passRate}%`, icon: Medal },
															{ label: 'Pace', value: formatDuration(summary.avgTimeSeconds), icon: Clock3 },
														].map((item) => (
															<div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-3 py-3">
																<p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
																	<item.icon className="h-3.5 w-3.5" /> {item.label}
																</p>
																<p className="mt-2 font-mono text-2xl font-semibold tracking-[-0.08em] text-slate-950">{item.value}</p>
															</div>
														))}
													</div>
												</div>

												<div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 lg:w-[320px] lg:min-w-[320px]">
													<div className="mb-3 flex items-start justify-between gap-3">
														<div>
															<p className="text-[11px] uppercase tracking-[0.24em] text-slate-600">Submission wave</p>
															<p className="mt-1 text-sm text-slate-900">Top scorer: {summary.topStudent}</p>
														</div>
														<span className="rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[11px] text-cyan-700">
															{summary.submissions} runs
														</span>
													</div>
													<TrendBars values={summary.trend} />
												</div>
											</div>

											<div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
												<div className="flex flex-1 flex-col gap-2">
													<div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
														<span>Score spectrum</span>
														<span>{summary.riskCount} below pass line</span>
													</div>
													<div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
														{summary.bands.map((band) => (
															<div
																key={`${summary.exam.id}-${band.label}`}
																className="h-full"
																style={{ width: `${summary.submissions ? (band.count / summary.submissions) * 100 : 0}%`, backgroundImage: band.gradient }}
															/>
														))}
													</div>
												</div>

												<div className="flex items-center gap-3 text-sm text-slate-700">
													<span>Updated {formatRelative(summary.latestCompletedAt, nowMs)}</span>
													<span className="inline-flex items-center gap-1 font-semibold text-slate-900 transition group-hover:text-cyan-700">
														Open result room <ArrowRight className="h-4 w-4" />
													</span>
												</div>
											</div>
										</Link>
									</motion.div>
								))}
							</div>
						</motion.section>

						<div className="grid gap-5 xl:col-span-4">
							<motion.section
								{...fadeUp(0.32)}
								className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)]"
							>
								<div className="mb-4 flex items-start justify-between gap-3">
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">Outcome spectrum</p>
										<h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">How scores are landing</h3>
									</div>
									<Trophy className="h-4 w-4 text-amber-500" />
								</div>

								<div className="space-y-4">
									{overviewStats.aggregateBands.map((band, index) => (
										<div key={band.label}>
											<div className="mb-2 flex items-center justify-between text-sm">
												<span className="font-medium text-slate-800">{band.label}</span>
												<span className="font-mono text-slate-900">{band.count}</span>
											</div>
											<div className="h-3 overflow-hidden rounded-full bg-slate-100">
												<motion.div
													initial={{ width: 0 }}
													animate={{ width: `${overviewStats.totalSubmissions ? (band.count / overviewStats.totalSubmissions) * 100 : 0}%` }}
													transition={{ delay: 0.4 + index * 0.05, duration: 0.45, ease: 'easeOut' }}
													className={cn('h-full rounded-full shadow-lg', band.glow)}
													style={{ backgroundImage: band.gradient }}
												/>
											</div>
										</div>
									))}
								</div>
							</motion.section>

							<motion.section
								{...fadeUp(0.38)}
								className="rounded-[28px] border border-slate-200 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
								style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(241,245,249,0.92))' }}
							>
								<div className="mb-4 flex items-start justify-between gap-3">
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">Top surface</p>
										<h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">Best performing conducted exams</h3>
									</div>
									<Users className="h-4 w-4 text-cyan-300" />
								</div>

								<div className="space-y-3">
									{topSurfaceSummaries.map((summary, index) => (
										<div key={summary.exam.id} className="rounded-[22px] border border-slate-200 bg-white/85 px-4 py-3">
											<div className="flex items-center justify-between gap-3">
												<div className="min-w-0">
													<p className="truncate text-sm font-semibold text-slate-950">{summary.exam.title}</p>
													<p className="truncate text-xs text-slate-600">{summary.courseLabel}</p>
												</div>
												<div className="text-right">
													<p className="font-mono text-2xl text-slate-950">{summary.avg}%</p>
													<p className="text-[11px] uppercase tracking-[0.2em] text-slate-600">rank {index + 1}</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</motion.section>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
