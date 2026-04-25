'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Trophy, TrendingUp, Target, Zap, Lock, Unlock, Clock, Medal,
	BarChart3, Activity, Flame, Brain, ArrowUp, ArrowDown, Minus,
	CalendarDays, User, BookOpen, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ContainerTextFlip } from '@/components/ui/container-text-flip';

type SessionResult = {
	id: string;
	exam_id: string;
	percentage: number | null;
	score: number | null;
	max_score: number | null;
	passed: boolean | null;
	completed_at: string | null;
	time_taken_seconds: number | null;
};

type ExamInfo = {
	id: string;
	title: string;
	passing_score: number | null;
	duration: number | null;
	course_id: string | null;
	courses: { name: string; code: string | null } | null;
};

type ResultsData = {
	exams: Map<string, ExamInfo>;
	sessions: SessionResult[];
};

const calculateStats = (sessions: SessionResult[]) => {
	if (sessions.length === 0) {
		return {
			totalAttempts: 0,
			passed: 0,
			passRate: 0,
			avgScore: 0,
			bestScore: 0,
			worstScore: 0,
			avgTime: 0,
			totalTime: 0,
		};
	}

	const validSessions = sessions.filter(s => s.percentage !== null && s.percentage !== undefined);
	if (validSessions.length === 0) {
		return {
			totalAttempts: sessions.length,
			passed: sessions.filter(s => s.passed).length,
			passRate: 0,
			avgScore: 0,
			bestScore: 0,
			worstScore: 0,
			avgTime: 0,
			totalTime: 0,
		};
	}

	const scores = validSessions.map(s => s.percentage as number);
	const times = sessions
		.filter(s => s.time_taken_seconds && s.time_taken_seconds > 0)
		.map(s => s.time_taken_seconds as number);

	return {
		totalAttempts: sessions.length,
		passed: sessions.filter(s => s.passed).length,
		passRate: Math.round((sessions.filter(s => s.passed).length / sessions.length) * 100),
		avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
		bestScore: Math.max(...scores),
		worstScore: Math.min(...scores),
		avgTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
		totalTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) : 0,
	};
};

const formatTime = (seconds: number) => {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	if (mins === 0) return `${secs}s`;
	return `${mins}m ${secs}s`;
};

const getTrendIndicator = (value: number, prevValue: number | null) => {
	if (prevValue === null) return null;
	if (value > prevValue) return { trend: 'up', change: value - prevValue };
	if (value < prevValue) return { trend: 'down', change: prevValue - value };
	return { trend: 'flat', change: 0 };
};

const ScoreVisualization = ({ percentage }: { percentage: number }) => {
	const circumference = 2 * Math.PI * 45;
	const offset = circumference - (percentage / 100) * circumference;

	let color = '#ef4444';
	if (percentage >= 75) color = '#22c55e';
	else if (percentage >= 60) color = '#eab308';
	else if (percentage >= 40) color = '#f97316';

	return (
		<div className="relative w-24 h-24 flex items-center justify-center">
			<svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
				<circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="4" />
				<motion.circle
					cx="50"
					cy="50"
					r="45"
					fill="none"
					stroke={color}
					strokeWidth="4"
					strokeDasharray={circumference}
					initial={{ strokeDashoffset: circumference }}
					animate={{ strokeDashoffset: offset }}
					transition={{ duration: 1.2, ease: 'easeOut' }}
					strokeLinecap="round"
				/>
			</svg>
			<div className="absolute text-center">
				<p className="text-2xl font-bold text-gray-900">{percentage}%</p>
				<p className="text-xs text-gray-500">Score</p>
			</div>
		</div>
	);
};

const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
	<div className={`bg-white/50 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow ${className}`}>
		{children}
	</div>
);

export default function StudentResultsPage() {
	const [results, setResults] = useState<ResultsData>({ exams: new Map(), sessions: [] });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedExam, setSelectedExam] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			const supabase = createClient();
			const { data: { user } } = await supabase.auth.getUser();

			if (!user) {
				setError('Not authenticated');
				setLoading(false);
				return;
			}

			const [sessionsRes, examsRes] = await Promise.all([
				supabase
					.from('exam_sessions')
					.select('id, exam_id, percentage, score, max_score, passed, completed_at, time_taken_seconds')
					.eq('student_id', user.id)
					.order('completed_at', { ascending: false }),
				supabase
					.from('exam_enrollments')
					.select('exams (id, title, passing_score, duration, course_id, courses (name, code))')
					.eq('student_id', user.id),
			]);

			if (sessionsRes.error || examsRes.error) {
				setError('Failed to load results');
				setLoading(false);
				return;
			}

			const sessions = sessionsRes.data as SessionResult[];
			const examMap = new Map<string, ExamInfo>();

			(examsRes.data as any[]).forEach((enrollment) => {
				if (enrollment.exams) {
					examMap.set(enrollment.exams.id, enrollment.exams);
				}
			});

			setResults({ sessions, exams: examMap });
			setLoading(false);
		})();
	}, []);

	const stats = useMemo(() => calculateStats(results.sessions), [results.sessions]);
	const recentSessions = results.sessions.slice(0, 5);
	const sessionsByExam = useMemo(() => {
		const map = new Map<string, SessionResult[]>();
		results.sessions.forEach((session) => {
			if (!map.has(session.exam_id)) {
				map.set(session.exam_id, []);
			}
			map.get(session.exam_id)!.push(session);
		});
		return map;
	}, [results.sessions]);

	const consistencyInsight = useMemo(() => {
		const scoredAttempts = results.sessions
			.map(session => session.percentage)
			.filter((value): value is number => value !== null && value !== undefined);

		if (scoredAttempts.length < 3) {
			return 'Collecting more attempts to generate a reliable live consistency signal.';
		}

		const range = Math.max(...scoredAttempts) - Math.min(...scoredAttempts);
		const recentWindow = scoredAttempts.slice(0, 5);
		const priorWindow = scoredAttempts.slice(5, 10);
		const recentAvg = recentWindow.reduce((sum, value) => sum + value, 0) / recentWindow.length;
		const priorAvg = priorWindow.length > 0
			? priorWindow.reduce((sum, value) => sum + value, 0) / priorWindow.length
			: recentAvg;
		const delta = recentAvg - priorAvg;

		if (range > 30) {
			return delta >= 0
				? 'High spread overall, but your most recent attempts show real-time recovery.'
				: 'High spread right now; tighten pacing and question review to stabilize upcoming attempts.';
		}

		if (range > 15) {
			return delta >= 0
				? 'Moderate variance with a positive real-time trend in your latest attempts.'
				: 'Moderate variance, with a slight dip in recent attempts to monitor.';
		}

		return delta >= 0
			? 'Strong consistency with steady real-time execution across recent attempts.'
			: 'Consistency remains strong overall, with a small recent dip worth monitoring.';
	}, [results.sessions]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="text-center">
					<Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
					<p className="text-gray-600">Loading your results...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
				<div className="text-center">
					<AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
					<p className="text-gray-600">{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 py-8 px-4" style={{ backdropFilter: 'blur(18px) saturate(1.6)', WebkitBackdropFilter: 'blur(18px) saturate(1.6)' }}>
			<div className="max-w-7xl mx-auto space-y-8">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: -30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, ease: 'easeOut' }}
				>
					<section className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur-sm md:p-8">
						<div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(148, 163, 184, 0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.18) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
						<div className="relative flex items-start gap-8 max-[900px]:flex-col">
							<div className="min-w-0 space-y-6" style={{ width: 'calc(100% - 20rem - 2rem)' }}>
								<div className="w-full">
									<p className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-700">
										<Trophy className="h-3.5 w-3.5" />
										Results Atlas
									</p>
									<h2 className="text-xl font-semibold tracking-tight text-gray-900 md:text-[2.0rem]">
										Dear Student,<br />Track your exam performance and proctored readiness from one command center, <span className="text-indigo-700">effortlessly.</span>
									</h2>
									<p className="mt-3 text-sm leading-6 text-gray-600 md:text-[15px]">
										Stay improvement-focused with
										<ContainerTextFlip
											words={['clear score bands', 'time discipline', 'consistency tracking', 'result confidence']}
											interval={2400}
											className="mx-1.5 text-[0.94em] md:text-[0.96em]"
											textClassName="leading-none"
											animationDuration={620}
										/>
										while reviewing each attempt in one unified view.
									</p>
								</div>
							</div>
						</div>
					</section>
				</motion.div>

				{/* Key Metrics Grid */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
				>
					{/* Total Attempts */}
					<GlassCard className="lg:col-span-1">
						<div className="flex items-start justify-between mb-4">
							<div>
								<p className="text-sm text-gray-600 font-medium">Total Attempts</p>
								<p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalAttempts}</p>
							</div>
							<Activity className="w-8 h-8 text-blue-500" />
						</div>
						<div className="text-xs text-gray-500">Exams completed</div>
					</GlassCard>

					{/* Pass Rate */}
					<GlassCard className="lg:col-span-1">
						<div className="flex items-start justify-between mb-4">
							<div>
								<p className="text-sm text-gray-600 font-medium">Pass Rate</p>
								<p className="text-3xl font-bold text-gray-900 mt-2">{stats.passRate}%</p>
								<p className="text-xs text-gray-500 mt-1">{stats.passed} of {stats.totalAttempts} passed</p>
							</div>
							<CheckCircle2 className="w-8 h-8 text-green-500" />
						</div>
					</GlassCard>

					{/* Average Score */}
					<GlassCard className="lg:col-span-1">
						<div className="flex items-start justify-between mb-4">
							<div>
								<p className="text-sm text-gray-600 font-medium">Average Score</p>
								<p className="text-3xl font-bold text-gray-900 mt-2">{stats.avgScore}%</p>
								<div className="flex items-center gap-1 mt-1">
									<TrendingUp className="w-3 h-3 text-green-500" />
									<p className="text-xs text-green-600">On track</p>
								</div>
							</div>
							<Brain className="w-8 h-8 text-purple-500" />
						</div>
					</GlassCard>

					{/* Best Score */}
					<GlassCard className="lg:col-span-1">
						<div className="flex items-start justify-between mb-4">
							<div>
								<p className="text-sm text-gray-600 font-medium">Best Score</p>
								<p className="text-3xl font-bold text-gray-900 mt-2">{stats.bestScore}%</p>
								<p className="text-xs text-gray-500 mt-1">Peak performance</p>
							</div>
							<Medal className="w-8 h-8 text-amber-500" />
						</div>
					</GlassCard>
				</motion.div>

				{/* Detailed Analysis Section */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Score Distribution */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="h-96"
					>
						<GlassCard className="h-full flex flex-col">
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 rounded-lg bg-linear-to-br from-emerald-100 to-green-100 flex items-center justify-center">
									<Target className="w-5 h-5 text-emerald-600" />
								</div>
								<h3 className="text-lg font-semibold text-gray-900">Score Range Analysis</h3>
							</div>
							<div className="space-y-5 flex-1">
								<div>
									<div className="flex justify-between items-center mb-3">
										<span className="text-sm font-medium text-gray-700">Excellent (80-100)</span>
													<span className="text-sm font-bold bg-linear-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
											{results.sessions.filter(s => (s.percentage ?? 0) >= 80).length}
										</span>
									</div>
												<div className="w-full bg-linear-to-r from-gray-100 to-gray-50 rounded-full h-2.5 overflow-hidden">
										<motion.div
											initial={{ width: 0 }}
											animate={{
												width: `${
													results.sessions.length > 0
														? (results.sessions.filter(s => (s.percentage ?? 0) >= 80).length /
															results.sessions.length) *
															100
														: 0
												}%`,
											}}
											transition={{ duration: 1, delay: 0.3 }}
																className="h-full bg-linear-to-r from-emerald-400 to-green-500 rounded-full shadow-md"
										/>
									</div>
								</div>

								<div>
									<div className="flex justify-between items-center mb-3">
										<span className="text-sm font-medium text-gray-700">Good (60-79)</span>
													<span className="text-sm font-bold bg-linear-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
											{results.sessions.filter(s => (s.percentage ?? 0) >= 60 && (s.percentage ?? 0) < 80).length}
										</span>
									</div>
										<div className="w-full bg-linear-to-r from-gray-100 to-gray-50 rounded-full h-2.5 overflow-hidden">
										<motion.div
											initial={{ width: 0 }}
											animate={{
												width: `${
													results.sessions.length > 0
														? (results.sessions.filter(
															s => (s.percentage ?? 0) >= 60 && (s.percentage ?? 0) < 80
														).length /
															results.sessions.length) *
															100
														: 0
												}%`,
											}}
											transition={{ duration: 1, delay: 0.4 }}
													className="h-full bg-linear-to-r from-amber-400 to-yellow-500 rounded-full shadow-md"
										/>
									</div>
								</div>

								<div>
									<div className="flex justify-between items-center mb-3">
										<span className="text-sm font-medium text-gray-700">Needs Improvement (&lt;60)</span>
													<span className="text-sm font-bold bg-linear-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
											{results.sessions.filter(s => (s.percentage ?? 0) < 60).length}
										</span>
									</div>
									<div className="w-full bg-linear-to-r from-gray-100 to-gray-50 rounded-full h-2.5 overflow-hidden">
										<motion.div
											initial={{ width: 0 }}
											animate={{
												width: `${
													results.sessions.length > 0
														? (results.sessions.filter(s => (s.percentage ?? 0) < 60).length /
															results.sessions.length) *
															100
														: 0
												}%`,
											}}
											transition={{ duration: 1, delay: 0.5 }}
													className="h-full bg-linear-to-r from-red-400 to-pink-500 rounded-full shadow-md"
										/>
									</div>
								</div>
							</div>
						</GlassCard>
					</motion.div>

					{/* Time Investment */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.25 }}
						className="h-96"
					>
						<GlassCard className="h-full flex flex-col">
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
									<Clock className="w-5 h-5 text-blue-600" />
								</div>
								<h3 className="text-lg font-semibold text-gray-900">Time Investment</h3>
							</div>
							<div className="space-y-4 flex-1 flex flex-col justify-center">
								<div className="bg-linear-to-br from-blue-50/50 to-cyan-50/50 rounded-2xl p-5 border border-blue-100/50">
									<p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Average Time Per Exam</p>
									<p className="text-3xl font-bold text-blue-600">{formatTime(stats.avgTime)}</p>
									<p className="text-xs text-gray-500 mt-2">Across all attempts</p>
								</div>
								<div className="bg-linear-to-br from-amber-50/50 to-orange-50/50 rounded-2xl p-5 border border-amber-100/50">
									<p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Total Time Spent</p>
									<p className="text-3xl font-bold text-amber-600">
										{Math.floor(stats.totalTime / 3600)}h {Math.floor((stats.totalTime % 3600) / 60)}m
									</p>
									<p className="text-xs text-gray-500 mt-2">Cumulative study time</p>
								</div>
							</div>
						</GlassCard>
					</motion.div>

					{/* Consistency Tracker */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
						className="h-96"
					>
						<GlassCard className="h-full flex flex-col">
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 rounded-lg bg-linear-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
									<Flame className="w-5 h-5 text-purple-600" />
								</div>
								<h3 className="text-lg font-semibold text-gray-900">Performance Consistency</h3>
							</div>
							<div className="flex-1 flex flex-col justify-between">
								<div>
									<p className="text-sm font-medium text-gray-700 mb-4">Score Stability Trend</p>
											<div className="flex items-end justify-center gap-1.5 h-32 bg-linear-to-b from-purple-50/50 to-transparent rounded-xl p-3">
										{results.sessions.slice(0, 10).reverse().map((session, idx) => (
											<motion.div
												key={session.id}
												initial={{ height: 0, opacity: 0 }}
												animate={{ height: `${Math.max(4, ((session.percentage ?? 0) / 100) * 100)}px`, opacity: 1 }}
												transition={{ delay: idx * 0.08, duration: 0.5 }}
														className="flex-1 bg-linear-to-t from-purple-100 via-blue-300 to-blue-500 rounded-t-sm hover:shadow-lg transition-all hover:rounded-md cursor-pointer group relative"
												title={`${session.percentage}%`}
											>
												<div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
													{session.percentage}%
												</div>
											</motion.div>
										))}
									</div>
									<p className="text-xs text-gray-500 mt-3 text-center">Upto last 10 attempts</p>
								</div>
								<div className="bg-linear-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-purple-100/50">
									<p className="text-xs text-gray-600">
										<span className="font-semibold">Live Insight: </span>
										{consistencyInsight}
									</p>
								</div>
							</div>
						</GlassCard>
					</motion.div>
				</div>

				{/* Recent Results Timeline */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.35 }}
				>
					<GlassCard>
						<h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Exam Sessions</h3>
						<div className="space-y-3">
							<AnimatePresence>
								{recentSessions.map((session, idx) => {
									const exam = results.exams.get(session.exam_id);
									const isPassed = session.passed ?? (session.percentage ?? 0) >= (exam?.passing_score ?? 50);

									return (
										<motion.div
											key={session.id}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: idx * 0.05 }}
											className="flex items-center gap-4 p-4 bg-white/40 backdrop-blur rounded-xl border border-white/50 hover:bg-white/60 transition-colors"
										>
											<div className="shrink-0">
												<ScoreVisualization percentage={session.percentage ?? 0} />
											</div>
											<div className="flex-1 min-w-0">
												<p className="font-semibold text-gray-900 truncate">{exam?.title ?? 'Unknown Exam'}</p>
												<p className="text-xs text-gray-500 mt-1">
													{session.completed_at
														? new Date(session.completed_at).toLocaleDateString('en-US', {
															month: 'short',
															day: 'numeric',
															year: 'numeric',
														})
														: 'In Progress'}
												</p>
											</div>
											<div className="text-right">
												<p className="text-sm font-bold text-gray-900 mb-1">{session.percentage ?? 0}%</p>
												<div
													className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
														isPassed
															? 'bg-green-100 text-green-700'
															: 'bg-red-100 text-red-700'
													}`}
												>
													{isPassed ? (
														<>
															<CheckCircle2 className="w-3 h-3" />
															Passed
														</>
													) : (
														<>
															<AlertCircle className="w-3 h-3" />
															Failed
														</>
													)}
												</div>
											</div>
										</motion.div>
									);
								})}
							</AnimatePresence>
						</div>
					</GlassCard>
				</motion.div>

				{/* Exam Breakdown */}
				{Array.from(sessionsByExam.entries()).length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.4 }}
					>
						<GlassCard>
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 rounded-lg bg-linear-to-br from-orange-100 to-red-100 flex items-center justify-center">
									<BookOpen className="w-5 h-5 text-orange-600" />
								</div>
								<h3 className="text-lg font-semibold text-gray-900">Performance by Exam</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
								{Array.from(sessionsByExam.entries()).slice(0, 6).map(([examId, sessions]) => {
									const exam = results.exams.get(examId);
									const examStats = calculateStats(sessions);

									return (
										<motion.button
											key={examId}
										whileHover={{ y: -6 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => window.location.href = `/exam/${examId}/results`}
											className="text-left p-5 bg-linear-to-br from-white/60 to-white/30 backdrop-blur-sm rounded-2xl border border-white/40 hover:border-white/60 shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer"
										>
											<div className="flex items-start justify-between mb-4">
												<div className="flex-1">
													<p className="font-bold text-gray-900 text-sm mb-1 group-hover:text-indigo-600 transition-colors truncate">{exam?.title ?? 'Exam'}</p>
													{exam?.courses && (
														<p className="text-xs text-gray-500">{exam.courses.name}</p>
													)}
												</div>
												<div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-100 to-blue-100 flex items-center justify-center shrink-0">
													<ArrowUp className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
												</div>
											</div>
											<div className="space-y-3">
												<div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
													<p className="text-xs text-gray-600 mb-1">Attempts</p>
													<p className="text-xl font-bold text-blue-600">{examStats.totalAttempts}</p>
												</div>
												<div className="grid grid-cols-2 gap-3">
													<div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-lg p-3">
														<p className="text-xs text-gray-600 mb-1">Best</p>
														<p className="text-lg font-bold text-green-600">{examStats.bestScore}%</p>
													</div>
													<div className="bg-linear-to-r from-purple-50 to-pink-50 rounded-lg p-3">
														<p className="text-xs text-gray-600 mb-1">Avg</p>
														<p className="text-lg font-bold text-purple-600">{examStats.avgScore}%</p>
													</div>
												</div>
											</div>
										</motion.button>
									);
								})}
							</div>
						</GlassCard>
					</motion.div>
				)}
			</div>
		</div>
	);
}
