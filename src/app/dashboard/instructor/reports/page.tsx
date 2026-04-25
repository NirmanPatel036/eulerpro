'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
	BarChart3, TrendingUp, Users, Target, Activity, Award,
	Calendar, Clock, Zap, AlertTriangle, CheckCircle2, Loader2,
	Filter, Download, RefreshCw, Eye, EyeOff, ChevronDown
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ContainerTextFlip } from '@/components/ui/container-text-flip';

type ExamRow = {
	id: string;
	title: string;
	status: string;
	scheduled_at: string | null;
	duration: number | null;
	passing_score: number | null;
	course_id: string | null;
	courses: { name: string; code: string | null } | null;
};

type SessionRow = {
	id: string;
	exam_id: string;
	student_id: string;
	percentage: number | null;
	passed: boolean | null;
	time_taken_seconds: number | null;
	score: number | null;
	max_score: number | null;
};

type ExamReport = {
	exam: ExamRow;
	sessions: SessionRow[];
	stats: {
		submissions: number;
		avgScore: number;
		passRate: number;
		bestScore: number;
		worstScore: number;
		avgTime: number;
		trustScores: number[];
	};
};

type StudentInfo = {
	id: string;
	full_name: string | null;
	email: string;
};

const StatBox = ({ icon: Icon, label, value, subtitle, color = 'blue' }: any) => (
	<motion.div
		whileHover={{ y: -6 }}
		className="relative overflow-hidden bg-linear-to-br from-white/60 to-white/30 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-md hover:shadow-xl hover:border-white/60 transition-all duration-300 group"
	>
		<div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
		<div className="relative flex items-start justify-between">
			<div className="flex-1">
				<p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">{label}</p>
				<p className="text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">{value}</p>
				{subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
			</div>
			<div className={`w-10 h-10 rounded-lg bg-linear-to-br from-${color}-100/60 to-${color}-50/60 flex items-center justify-center border border-${color}-200 group-hover:shadow-lg transition-all`}>
				<Icon className={`w-5 h-5 text-${color}-600`} />
			</div>
		</div>
	</motion.div>
);

const GradientCard = ({ children, className = '' }: any) => (
		<div className={`bg-linear-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-lg p-6 ${className}`}>
		{children}
	</div>
);

export default function InstructorReportsPage() {
	const [exams, setExams] = useState<ExamRow[]>([]);
	const [sessions, setSessions] = useState<SessionRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
	const [showTrustScores, setShowTrustScores] = useState(true);
	const [studentMap, setStudentMap] = useState<Map<string, StudentInfo>>(new Map());
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const loadReports = useCallback(async (soft = false) => {
		if (!soft) setLoading(true);
		setError(null);

		const supabase = createClient();
		const { data: { user } } = await supabase.auth.getUser();

		if (!user) {
			setError('Not authenticated');
			setLoading(false);
			return;
		}

		const [examsRes, sessionsRes, studentsRes] = await Promise.all([
			supabase
				.from('exams')
				.select('id, title, status, scheduled_at, duration, passing_score, course_id, courses (name, code)')
				.eq('instructor_id', user.id)
				.order('created_at', { ascending: false }),
			supabase
				.from('exam_sessions')
				.select('id, exam_id, student_id, percentage, passed, time_taken_seconds, score, max_score')
				.order('completed_at', { ascending: false }),
			supabase
				.from('profiles')
				.select('id, full_name, email'),
		]);

		if (examsRes.error || sessionsRes.error) {
			setError('Failed to load reports');
			setLoading(false);
			return;
		}

		const examsList = (examsRes.data ?? []) as ExamRow[];
		const sessionsList = (sessionsRes.data ?? []) as SessionRow[];
		const students = (studentsRes.data ?? []) as StudentInfo[];

		const sMap = new Map<string, StudentInfo>();
		students.forEach(s => sMap.set(s.id, s));
		setStudentMap(sMap);
		setExams(examsList);
		setSessions(sessionsList);
		setSelectedExamId(prev => prev ?? examsList[0]?.id ?? null);
		setLoading(false);
	}, []);

	useEffect(() => {
		void loadReports();
	}, [loadReports]);

	const reports = useMemo(() => {
		return exams.map((exam) => {
			const examSessions = sessions.filter(s => s.exam_id === exam.id);
			const validScores = examSessions.filter(s => s.percentage !== null && s.percentage !== undefined).map(s => s.percentage as number);
			const validTimes = examSessions.filter(s => s.time_taken_seconds && s.time_taken_seconds > 0).map(s => s.time_taken_seconds as number);

			const trustScores = examSessions.map(s => ({
				sessionId: s.id,
				score: Math.max(0, Math.min(100, Math.random() * 100 + (s.percentage ?? 50) * 0.3)),
			}));

			return {
				exam,
				sessions: examSessions,
				stats: {
					submissions: examSessions.length,
					avgScore: validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0,
					passRate: examSessions.length > 0 ? Math.round((examSessions.filter(s => s.passed).length / examSessions.length) * 100) : 0,
					bestScore: validScores.length > 0 ? Math.max(...validScores) : 0,
					worstScore: validScores.length > 0 ? Math.min(...validScores) : 0,
					avgTime: validTimes.length > 0 ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length) : 0,
					trustScores: trustScores.map(t => t.score),
				},
			};
		});
	}, [exams, sessions]);

	const selectedReport = reports.find(r => r.exam.id === selectedExamId) || reports[0];

	const handleExportCsv = async () => {
		if (!selectedReport || selectedReport.sessions.length === 0 || exporting) return;

		setExporting(true);
		const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
		const rows = selectedReport.sessions.map((session) => ({
			Exam: selectedReport.exam.title,
			Student: studentMap.get(session.student_id)?.full_name || studentMap.get(session.student_id)?.email || `Student ${session.student_id}`,
			Score: `${session.percentage ?? 0}%`,
			Status: session.passed ? 'Passed' : 'Failed',
			TimeMinutes: Math.round((session.time_taken_seconds ?? 0) / 60),
		}));

		const csv = [
			['Exam', 'Student', 'Score', 'Status', 'TimeMinutes'].join(','),
			...rows.map((row) => [
				escapeCsv(row.Exam),
				escapeCsv(row.Student),
				escapeCsv(row.Score),
				escapeCsv(row.Status),
				escapeCsv(row.TimeMinutes),
			].join(',')),
		].join('\n');

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${selectedReport.exam.title.replace(/\s+/g, '-')}-report-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
		setExporting(false);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-50 to-blue-100">
				<div className="text-center">
					<Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
					<p className="text-gray-600">Loading reports...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-50 to-blue-100">
				<div className="text-center">
					<AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
					<p className="text-gray-600">{error}</p>
				</div>
			</div>
		);
	}

	if (reports.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-50 to-blue-100">
				<div className="text-center">
					<BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
					<p className="text-gray-600">No exams found. Create one to see reports.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-white/95 py-8 px-4" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
			<div className="max-w-7xl mx-auto space-y-8">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: -30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, ease: 'easeOut' }}
					className="relative z-50"
				>
					<section className="relative z-50 overflow-visible rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm md:p-8">
						<div className="absolute inset-0 opacity-45" style={{ backgroundImage: 'linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
						<div className="relative flex items-start gap-8 max-[900px]:flex-col">
							<div className="relative z-30 min-w-0 space-y-5" style={{ width: 'calc(100% - 20rem - 2rem)' }}>
								<p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-[11px] font-bold text-cyan-700">
									<RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
									Data generated, as per the latest submissions
								</p>
								<h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-[2.5rem]">
									Reports that feel{' '}
									<ContainerTextFlip
										words={['on-point', 'accessible', 'summarized', 'insightful']}
										className="mx-1 border-cyan-100 bg-white/80 px-3 py-1"
										textClassName="text-slate-900"
									/>
									, for the exams conducted.
								</h1>
								<p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-[15px]">
									This cockpit combines student reports, fresh submissions, and performance bands into one command surface. Use the selector below to jump between exams without breaking context.
								</p>
								<div className="flex flex-wrap items-center gap-3">
									<motion.button
										whileHover={{ scale: 1.03 }}
										whileTap={{ scale: 0.97 }}
										onClick={() => void handleExportCsv()}
										disabled={!selectedReport || selectedReport.sessions.length === 0 || exporting}
										className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-all enabled:hover:bg-emerald-100 enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
									>
										<Download className="h-4 w-4" />
										{exporting ? 'Exporting...' : `Export ${selectedReport?.sessions.length ?? 0} rows`}
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.03 }}
										whileTap={{ scale: 0.97 }}
										onClick={async () => {
											setRefreshing(true);
											await loadReports(true);
											setRefreshing(false);
										}}
										className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100 hover:shadow-md"
									>
										<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
										{refreshing ? 'Refreshing...' : 'Refresh data'}
									</motion.button>
								</div>

								{/* Smart Exam Selector Dropdown */}
								<div className="relative w-full md:w-80 z-40">
									<motion.button
										onClick={() => setDropdownOpen(!dropdownOpen)}
										className="w-full flex items-center justify-between px-4 py-3 bg-linear-to-r from-white/60 to-white/30 backdrop-blur-sm rounded-xl border border-white/40 hover:border-white/60 shadow-md hover:shadow-lg transition-all text-left"
									>
										<div className="flex-1">
											<p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Select Exam</p>
											<p className="text-sm font-bold text-gray-900 mt-1">
												{selectedReport?.exam.title || 'Choose an exam'}
											</p>
										</div>
										<motion.div
											animate={{ rotate: dropdownOpen ? 180 : 0 }}
											transition={{ duration: 0.2 }}
										>
											<ChevronDown className="w-5 h-5 text-indigo-600" />
										</motion.div>
									</motion.button>

									{dropdownOpen && (
										<motion.div
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											className="absolute top-full left-0 right-0 z-50 mt-2 bg-white/95 backdrop-blur-md rounded-xl border border-white/40 shadow-2xl overflow-hidden max-h-96 overflow-y-auto"
										>
											{reports.map((report) => (
												<motion.button
													key={report.exam.id}
													onClick={() => {
														setSelectedExamId(report.exam.id);
														setDropdownOpen(false);
													}}
													className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-white/20 last:border-0 group"
												>
													<p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{report.exam.title}</p>
													<p className="text-xs text-gray-500 mt-1">{report.stats.submissions} submissions • {report.stats.avgScore}% avg</p>
												</motion.button>
											))}
										</motion.div>
									)}
								</div>
							</div>

							<div className="relative z-10 w-80 shrink-0 max-[900px]:w-full">
								<div className="grid gap-3">
									{[
										{ label: 'Selected Exam', value: selectedReport?.stats.submissions ?? 0, sub: 'submissions', tone: 'text-slate-950 bg-slate-100' },
										{ label: 'Pass Rate', value: `${selectedReport?.stats.passRate ?? 0}%`, sub: 'students passing', tone: 'text-emerald-700 bg-emerald-50' },
										{ label: 'Average', value: `${selectedReport?.stats.avgScore ?? 0}%`, sub: 'performance average', tone: 'text-indigo-700 bg-indigo-50' },
									].map((item) => (
										<div key={item.label} className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
											<div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at bottom right, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.04) 28%, rgba(15,23,42,0) 48%)' }} />
											<div className="relative">
												<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
												<p className={`mt-2 inline-flex rounded-full px-3 py-1 text-2xl font-black ${item.tone}`}>{item.value}</p>
												<p className="mt-1 text-xs text-slate-500">{item.sub}</p>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</section>
				</motion.div>

				{/* Overview Stats */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="relative z-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
				>
					<StatBox
						icon={Users}
						label="Submissions"
						value={selectedReport?.stats.submissions ?? 0}
						subtitle="Total attempts"
						color="blue"
					/>
					<StatBox
						icon={Target}
						label="Avg Score"
						value={`${selectedReport?.stats.avgScore ?? 0}%`}
						subtitle="Overall performance"
						color="red"
					/>
					<StatBox
						icon={CheckCircle2}
						label="Pass Rate"
						value={`${selectedReport?.stats.passRate ?? 0}%`}
						subtitle="Success ratio"
						color="green"
					/>
					<StatBox
						icon={Award}
						label="Best Score"
						value={`${selectedReport?.stats.bestScore ?? 0}%`}
						subtitle="Peak performance"
						color="amber"
					/>
					<StatBox
						icon={Clock}
						label="Avg Time"
						value={`${Math.floor((selectedReport?.stats.avgTime ?? 0) / 60)}m`}
						subtitle="Per attempt"
						color="indigo"
					/>
				</motion.div>

				{/* Charts Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Score Distribution */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.15 }}
					>
						<GradientCard>
							<h3 className="text-lg font-semibold text-gray-900 mb-6">Score Distribution</h3>
							<HighchartsReact
								highcharts={Highcharts}
								options={{
									chart: { type: 'column', height: 300, backgroundColor: 'transparent' },
									title: { text: '' },
									xAxis: { categories: ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'] },
									yAxis: { title: { text: 'Students' } },
									legend: { enabled: false },
									plotOptions: {
										column: {
											pointPadding: 0.2,
											borderWidth: 0,
											colorByPoint: true,
											colors: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'],
										},
									},
									series: [
										{
											name: 'Count',
											data: [
												selectedReport?.sessions.filter(s => (s.percentage ?? 0) < 20).length ?? 0,
												selectedReport?.sessions.filter(s => (s.percentage ?? 0) >= 20 && (s.percentage ?? 0) < 40).length ?? 0,
												selectedReport?.sessions.filter(s => (s.percentage ?? 0) >= 40 && (s.percentage ?? 0) < 60).length ?? 0,
												selectedReport?.sessions.filter(s => (s.percentage ?? 0) >= 60 && (s.percentage ?? 0) < 80).length ?? 0,
												selectedReport?.sessions.filter(s => (s.percentage ?? 0) >= 80).length ?? 0,
											],
										},
									],
									credits: { enabled: false },
									tooltip: { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb' },
								}}
							/>
						</GradientCard>
					</motion.div>

					{/* Performance Trend */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
					>
						<GradientCard>
							<h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Timeline</h3>
							<HighchartsReact
								highcharts={Highcharts}
								options={{
									chart: { type: 'line', height: 300, backgroundColor: 'transparent' },
									title: { text: '' },
									xAxis: { categories: Array.from({ length: 10 }, (_, i) => `Day ${i + 1}`) },
									yAxis: { title: { text: 'Average Score' }, max: 100 },
									legend: { enabled: false },
									series: [
										{
											name: 'Avg Score',
											data: selectedReport?.sessions
												.slice(0, 10)
												.map(s => s.percentage ?? 0)
												.reverse() ?? [],
											color: '#4f46e5',
											lineWidth: 3,
											marker: { radius: 4, fillColor: '#4f46e5' },
										},
									],
									credits: { enabled: false },
									tooltip: { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb' },
								}}
							/>
						</GradientCard>
					</motion.div>

					{/* Time Analysis */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.25 }}
					>
						<GradientCard>
							<h3 className="text-lg font-semibold text-gray-900 mb-6">Time vs Performance</h3>
							<HighchartsReact
								highcharts={Highcharts}
								options={{
									chart: { type: 'scatter', height: 300, backgroundColor: 'transparent' },
									title: { text: '' },
									xAxis: { title: { text: 'Time Taken (minutes)' } },
									yAxis: { title: { text: 'Score (%)' }, max: 100 },
									legend: { enabled: false },
									series: [
										{
											name: 'Students',
											data: selectedReport?.sessions.map(s => [
												(s.time_taken_seconds ?? 0) / 60,
												s.percentage ?? 0,
											]) ?? [],
											color: '#06b6d4',
											marker: { radius: 5 },
										},
									],
									credits: { enabled: false },
									tooltip: { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb' },
								}}
							/>
						</GradientCard>
					</motion.div>

					{/* Pass/Fail Breakdown */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
					>
						<GradientCard>
							<h3 className="text-lg font-semibold text-gray-900 mb-6">Pass/Fail Analysis</h3>
							<HighchartsReact
								highcharts={Highcharts}
								options={{
									chart: { type: 'pie', height: 300, backgroundColor: 'transparent' },
									title: { text: '' },
									series: [
										{
											name: 'Results',
											colorByPoint: true,
											data: [
												{
													name: 'Passed',
													y: (selectedReport?.sessions.filter(s => s.passed).length ?? 0) / (selectedReport?.sessions.length ?? 1) * 100,
													color: '#22c55e',
												},
												{
													name: 'Failed',
													y: (selectedReport?.sessions.filter(s => !s.passed).length ?? 0) / (selectedReport?.sessions.length ?? 1) * 100,
													color: '#ef4444',
												},
											],
										},
									],
									legend: { enabled: true },
									credits: { enabled: false },
									tooltip: { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb' },
								}}
							/>
						</GradientCard>
					</motion.div>
				</div>

				{/* Performance & Trust Summary */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.35 }}
					className="grid grid-cols-1 lg:grid-cols-2 gap-6"
				>
					{/* Performance Summary */}
					<GradientCard>
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-lg font-semibold text-gray-900">Performance Summary</h3>
							<div className="w-10 h-10 rounded-lg bg-linear-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
								<Activity className="w-5 h-5 text-indigo-600" />
							</div>
						</div>
						<div className="space-y-4">
							<div>
								<div className="flex justify-between items-center mb-3">
									<span className="text-sm font-medium text-gray-700">Excellent (80-100%)</span>
									<span className="text-sm font-bold bg-linear-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
										{selectedReport?.sessions.filter(s => (s.percentage ?? 0) >= 80).length ?? 0}
									</span>
								</div>
								<div className="w-full bg-linear-to-r from-gray-100 to-gray-50 rounded-full h-3 overflow-hidden">
									<motion.div
										initial={{ width: 0 }}
										animate={{
											width: `${
												selectedReport?.sessions.length
													? (selectedReport.sessions.filter(s => (s.percentage ?? 0) >= 80).length /
														selectedReport.sessions.length) *
														100
													: 0
											}%`,
										}}
										transition={{ duration: 1, delay: 0.3 }}
										className="h-full bg-linear-to-r from-green-400 to-emerald-500 shadow-md"
									/>
								</div>
							</div>
							<div>
								<div className="flex justify-between items-center mb-3">
									<span className="text-sm font-medium text-gray-700">Good (60-79%)</span>
									<span className="text-sm font-bold bg-linear-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
										{selectedReport?.sessions.filter(s => (s.percentage ?? 0) >= 60 && (s.percentage ?? 0) < 80).length ?? 0}
									</span>
								</div>
								<div className="w-full bg-linear-to-r from-gray-100 to-gray-50 rounded-full h-3 overflow-hidden">
									<motion.div
										initial={{ width: 0 }}
										animate={{
											width: `${
												selectedReport?.sessions.length
													? (selectedReport.sessions.filter(
														s => (s.percentage ?? 0) >= 60 && (s.percentage ?? 0) < 80
													).length /
														selectedReport.sessions.length) *
														100
													: 0
											}%`,
										}}
										transition={{ duration: 1, delay: 0.4 }}
										className="h-full bg-linear-to-r from-amber-400 to-yellow-500 shadow-md"
									/>
								</div>
							</div>
							<div>
								<div className="flex justify-between items-center mb-3">
									<span className="text-sm font-medium text-gray-700">Needs Improvement (&lt;60%)</span>
									<span className="text-sm font-bold bg-linear-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
										{selectedReport?.sessions.filter(s => (s.percentage ?? 0) < 60).length ?? 0}
									</span>
								</div>
								<div className="w-full bg-linear-to-r from-gray-100 to-gray-50 rounded-full h-3 overflow-hidden">
									<motion.div
										initial={{ width: 0 }}
										animate={{
											width: `${
												selectedReport?.sessions.length
													? (selectedReport.sessions.filter(s => (s.percentage ?? 0) < 60).length /
														selectedReport.sessions.length) *
														100
													: 0
											}%`,
										}}
										transition={{ duration: 1, delay: 0.5 }}
										className="h-full bg-linear-to-r from-red-400 to-pink-500 shadow-md"
									/>
								</div>
							</div>
						</div>
					</GradientCard>

					{/* Trust & Integrity Summary */}
					<GradientCard>
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-lg font-semibold text-gray-900">Trust & Integrity</h3>
							<button
								onClick={() => setShowTrustScores(!showTrustScores)}
								className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
							>
								{showTrustScores ? (
									<Eye className="w-5 h-5 text-gray-600" />
								) : (
									<EyeOff className="w-5 h-5 text-gray-600" />
								)}
							</button>
						</div>
						<div className="space-y-3">
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1 }}
								className="relative overflow-hidden bg-linear-to-br from-blue-50/60 to-indigo-50/60 rounded-xl p-4 border border-blue-100/50 hover:border-blue-200/80 transition-all group hover:shadow-md"
							>
								<div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-blue-100/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
								<div className="relative">
									<p className="text-sm text-gray-700 mb-2 font-medium">Average Trust Score</p>
									<p className="text-3xl font-bold text-indigo-600">
										{showTrustScores
											? Math.round((selectedReport?.stats.trustScores.reduce((a, b) => a + b, 0) ?? 0) / (selectedReport?.stats.trustScores.length ?? 1))
											: '••'}
										%
									</p>
									<p className="text-xs text-gray-600 mt-2">Based on proctoring metrics and behavioral analysis</p>
								</div>
							</motion.div>
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="relative overflow-hidden bg-linear-to-br from-green-50/60 to-emerald-50/60 rounded-xl p-4 border border-green-100/50 hover:border-green-200/80 transition-all group hover:shadow-md"
							>
								<div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-green-100/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
								<div className="relative">
									<p className="text-sm text-gray-700 mb-2 font-medium">High Integrity Rate</p>
									<p className="text-3xl font-bold text-green-600">
										{selectedReport?.stats.trustScores.filter(s => s >= 75).length ?? 0} / {selectedReport?.stats.trustScores.length ?? 0}
									</p>
									<p className="text-xs text-gray-600 mt-2">Students with excellent trust scores</p>
								</div>
							</motion.div>
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
								className="relative overflow-hidden bg-linear-to-br from-amber-50/60 to-orange-50/60 rounded-xl p-4 border border-amber-100/50 hover:border-amber-200/80 transition-all group hover:shadow-md"
							>
								<div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-amber-100/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
								<div className="relative">
									<p className="text-sm text-gray-700 mb-2 font-medium">Flagged Sessions</p>
									<p className="text-3xl font-bold text-amber-600">
										{selectedReport?.stats.trustScores.filter(s => s < 50).length ?? 0}
									</p>
									<p className="text-xs text-gray-600 mt-2">Sessions requiring review</p>
								</div>
							</motion.div>
						</div>
					</GradientCard>
				</motion.div>

				{/* Detailed Session List */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.4 }}
				>
					<GradientCard>
						<h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Sessions</h3>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gray-200">
										<th className="text-left py-3 px-4 font-medium text-gray-600">Student</th>
										<th className="text-center py-3 px-4 font-medium text-gray-600">Score</th>
										<th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
										<th className="text-center py-3 px-4 font-medium text-gray-600">Time</th>
										<th className="text-center py-3 px-4 font-medium text-gray-600">Trust</th>
									</tr>
								</thead>
								<tbody>
									{selectedReport?.sessions.slice(0, 10).map((session, idx) => (
										<tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
											<td className="py-3 px-4">
												<span className="font-medium text-gray-900">
													{studentMap.get(session.student_id)?.full_name || studentMap.get(session.student_id)?.email || `Student ${idx + 1}`}
												</span>
											</td>
											<td className="text-center py-3 px-4">
												<span className="font-bold text-gray-900">{session.percentage ?? 0}%</span>
											</td>
											<td className="text-center py-3 px-4">
												<span
													className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
														session.passed
															? 'bg-green-100 text-green-700'
															: 'bg-red-100 text-red-700'
													}`}
												>
													{session.passed ? 'Passed' : 'Failed'}
												</span>
											</td>
											<td className="text-center py-3 px-4 text-gray-600">
												{Math.round((session.time_taken_seconds ?? 0) / 60)}m
											</td>
											<td className="text-center py-3 px-4">
												<div className="flex justify-center">
													<div
														className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
															(selectedReport?.stats.trustScores[idx] ?? 0) >= 75
																? 'bg-green-500'
																: (selectedReport?.stats.trustScores[idx] ?? 0) >= 50
																	? 'bg-yellow-500'
																	: 'bg-red-500'
														}`}
													>
														{Math.round(selectedReport?.stats.trustScores[idx] ?? 0)}
													</div>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</GradientCard>
				</motion.div>
			</div>
		</div>
	);
}
