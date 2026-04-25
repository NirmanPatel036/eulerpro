'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, XCircle, AlertTriangle, Share2,
    ChevronDown, ChevronUp, ShieldCheck, Clock,
    Loader2, ArrowLeft, BookOpen, Trophy, LayoutDashboard,
    GraduationCap,
    User,
    MailboxIcon,
    MailCheck,
    MailPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

// ─── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#4b3fe9', '#7c6ff7', '#ed1c8c', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e'];

function ConfettiCannon({ active }: { active: boolean }) {
    const strips = Array.from({ length: 120 }, (_, i) => i);
    if (!active) return null;
    return (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {strips.map(i => {
                const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
                const left = Math.random() * 100;
                const delay = Math.random() * 1.5;
                const duration = 2.5 + Math.random() * 2;
                const rotate = Math.random() * 720 - 360;
                const size = 6 + Math.random() * 8;
                return (
                    <motion.div
                        key={i}
                        initial={{ y: -20, x: `${left}vw`, opacity: 1, rotate: 0 }}
                        animate={{ y: '110vh', opacity: [1, 1, 0], rotate }}
                        transition={{ duration, delay, ease: 'easeIn' }}
                        style={{ position: 'absolute', top: 0, width: size, height: size * 0.4, backgroundColor: color, borderRadius: 2 }}
                    />
                );
            })}
        </div>
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Question = {
    id: string; type: string; text: string; points: number;
    difficulty: string; order: number; options?: string[];
    answer_data: Record<string, unknown>;
    render_as_code?: boolean;
};
type QuestionResult = { question_id: string; correct: boolean; points_awarded: number };
type ExamSession = {
    id: string; score: number; max_score: number; percentage: number;
    passed: boolean; time_taken_seconds: number; completed_at: string;
    answers: Record<string, unknown>; question_results: QuestionResult[];
    proctoring_flags: { type: string; time: string }[];
    exams: {
        title: string;
        passing_score: number;
        instructor_id?: string | null;
        courses?: { name: string; code: string | null } | null;
    };
};
type Profile = { full_name: string | null; email: string; avatar_url: string | null };
type MemeResult = { url: string; type: string; description: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DIFF_CLS: Record<string, string> = {
    easy:   'bg-emerald-50 text-emerald-700 border-emerald-100',
    medium: 'bg-amber-50   text-amber-700   border-amber-100',
    hard:   'bg-red-50     text-red-600     border-red-100',
};

function formatDuration(s: number) {
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function calcTrust(flags: unknown[]) { return Math.max(0, 100 - flags.length * 8); }

// ─── AnswerDisplay ────────────────────────────────────────────────────────────
function AnswerDisplay({ question, givenAnswer, isCorrect }: { question: Question; givenAnswer: unknown; isCorrect: boolean }) {
    if (question.type === 'multiple_choice') {
        const correctIdx = question.answer_data.correct_option as number;
        return (
            <div className="space-y-1.5 mt-3">
                {(question.options ?? []).map((opt, i) => (
                    <div key={i} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm border',
                        i === correctIdx ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                        : i === givenAnswer && !isCorrect ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-gray-50 border-gray-100 text-gray-500')}>
                        <span className="font-bold text-xs w-5 h-5 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0">{String.fromCharCode(65 + i)}</span>
                        <span className="flex-1">{opt}</span>
                        {i === correctIdx && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {i === givenAnswer && !isCorrect && i !== correctIdx && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    </div>
                ))}
            </div>
        );
    }
    if (question.type === 'true_false') {
        const correctAns = question.answer_data.correct_answer as boolean;
        return (
            <div className="flex gap-2 mt-3">
                {[true, false].map(v => (
                    <div key={String(v)} className={cn('px-5 py-2 rounded-lg text-sm font-semibold border',
                        v === correctAns ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : v === givenAnswer && !isCorrect ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-gray-50 border-gray-100 text-gray-400')}>
                        {v ? 'True' : 'False'}
                        {v === correctAns && <CheckCircle className="inline ml-1.5 w-3 h-3 text-emerald-500" />}
                    </div>
                ))}
            </div>
        );
    }
    if (question.type === 'fill_blank') {
        const sample = question.answer_data.sample_answer as string;
        return (
            <div className="mt-3 space-y-1.5">
                <div className={cn('px-3 py-2 rounded-lg text-sm border', isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700')}>
                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60 block mb-0.5">Your Answer</span>
                    <strong>{(givenAnswer as string) || <em className="opacity-50">blank</em>}</strong>
                </div>
                {!isCorrect && (
                    <div className="px-3 py-2 rounded-lg text-sm bg-emerald-50 border border-emerald-200 text-emerald-800">
                        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60 block mb-0.5">Correct Answer</span>
                        <strong>{sample}</strong>
                    </div>
                )}
            </div>
        );
    }
    if (question.type === 'checkbox') {
        const correctOptions = (question.answer_data.correct_options as number[]) ?? [];
        const given = (givenAnswer as number[]) ?? [];
        return (
            <div className="space-y-1.5 mt-3">
                {(question.options ?? []).map((opt, i) => {
                    const isCorrectOption = correctOptions.includes(i);
                    const wasChosen = given.includes(i);
                    return (
                        <div key={i} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm border',
                            isCorrectOption ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : wasChosen ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-gray-50 border-gray-100 text-gray-400')}>
                            <span className="font-bold text-xs w-5 h-5 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0">{String.fromCharCode(65 + i)}</span>
                            <span className="flex-1">{opt}</span>
                            {isCorrectOption && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            {!isCorrectOption && wasChosen && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
}

// ─── RotatingText ─────────────────────────────────────────────────────────────
const MOTIVATIONS = [
    '"Every question reviewed is a step toward mastering the next challenge."',
    '"Strong results are built from consistent effort, not just one good attempt."',
    '"Your performance tells a story, and every detail here helps you improve it."',
    '"Progress is clearest when you slow down and study what worked and what did not."',
    '"The best scores come from reflection, discipline, and repetition."',
    '"Treat this result as feedback you can use, not just a number you received."',
];

function RotatingText() {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(i => (i + 1) % MOTIVATIONS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="max-w-sm text-center text-sm leading-6 text-gray-500"
        >
            {MOTIVATIONS[index]}
        </motion.div>
    );
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────
function QuestionCard({ question, qResult, givenAnswer, index }: {
    question: Question; qResult: QuestionResult | undefined; givenAnswer: unknown; index: number;
}) {
    const correct = qResult?.correct ?? false;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
            className="relative bg-white rounded-2xl border border-gray-100 shadow-sm"
        >
            {/* Coloured top-bar accent */}
            <div className="overflow-hidden px-3 rounded-t-2xl">
                <div className={cn('h-0.5 w-full', correct ? 'bg-emerald-400' : 'bg-red-400')} />
            </div>

            {/* Correct/Incorrect badge — centred on the top border */}
            <div className="flex justify-center -mt-3.5 mb-0">
                <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border',
                    correct ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200')}>
                    {correct ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {correct ? 'Correct' : 'Incorrect'}
                </span>
            </div>

            {/* Question header */}
            <div className="w-full px-5 pt-3 pb-3">
                <div className="flex items-start gap-4">
                    {/* Index bubble */}
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{index + 1}</span>

                    <div className="flex-1 min-w-0">
                        {question.render_as_code ? (
                            <div className="relative group mt-1">
                                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[13px] leading-relaxed overflow-x-auto shadow-inner border border-slate-800">
                                    <code>{question.text}</code>
                                </pre>
                                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-800/50 text-[9px] text-slate-500 font-mono border border-slate-700/50">
                                    CODE
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm font-semibold text-gray-800 leading-snug">{question.text}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize', DIFF_CLS[question.difficulty] ?? 'bg-gray-100 text-gray-500 border-gray-100')}>
                                {question.difficulty}
                            </span>
                            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md',
                                correct ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50')}>
                                {qResult?.points_awarded ?? 0}/{question.points} pts
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Answer display — always visible */}
            <div className="px-5 pb-5 border-t border-gray-50 pt-3">
                <AnswerDisplay question={question} givenAnswer={givenAnswer} isCorrect={correct} />
            </div>
        </motion.div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ExamResultsPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const examId = params?.id;

    const [session, setSession]         = useState<ExamSession | null>(null);
    const [questions, setQuestions]     = useState<Question[]>([]);
    const [profile, setProfile]         = useState<Profile | null>(null);
    const [instructorEmail, setInstructorEmail] = useState<string | null>(null);
    const [loading, setLoading]         = useState(true);
    const [showAll, setShowAll]         = useState(false);
    const [confetti, setConfetti]       = useState(false);
    const [meme, setMeme]               = useState<MemeResult | null>(null);
    const [memeLoading, setMemeLoading] = useState(false);
    const [flagsExpanded, setFlagsExpanded] = useState(false);
    const [copied, setCopied]           = useState(false);

    const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // ── Load data ─────────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const { data: prof } = await supabase.from('profiles').select('full_name, email, avatar_url').eq('id', user.id).single();
            if (prof) setProfile(prof as Profile);

            const { data: sess } = await supabase
                .from('exam_sessions')
                .select(`id, score, max_score, percentage, passed, time_taken_seconds, completed_at, answers, question_results, proctoring_flags, exams ( title, passing_score, instructor_id, courses ( name, code ) )`)
                .eq('exam_id', examId).eq('student_id', user.id).eq('status', 'completed')
                .order('completed_at', { ascending: false }).limit(1).single();

            if (!sess) { router.push('/dashboard/student/exams'); return; }
            setSession(sess as unknown as ExamSession);
            const { data: examInfo, error: examInfoError } = await supabase
                .from('exams')
                .select('instructor_id')
                .eq('id', examId)
                .single();

            if (examInfoError) {
                console.error('Error fetching exam instructor mapping:', examInfoError);
            }

            const instructorId = examInfo?.instructor_id ?? (sess as unknown as ExamSession).exams?.instructor_id;
            if (instructorId) {
                const { data: instructorProfile, error: instructorError } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('id', instructorId)
                    .eq('role', 'instructor')
                    .maybeSingle();

                if (instructorError) {
                    console.error('Error fetching instructor email:', instructorError);
                } else if (instructorProfile?.email) {
                    setInstructorEmail(instructorProfile.email);
                }
            }

            const { data: qs } = await supabase
                .from('questions').select('id, type, text, points, difficulty, "order", answer_data, render_as_code')
                .eq('exam_id', examId).order('"order"');
            if (qs) setQuestions((qs as Question[]).map(q => ({ ...q, options: (q.answer_data as Record<string, unknown>).options as string[] | undefined })));

            setLoading(false);
        })();
        return () => { if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId]);

    useEffect(() => {
        if (!loading && session?.passed) {
            setConfetti(true);
            confettiTimerRef.current = setTimeout(() => setConfetti(false), 6000);
        }
    }, [loading, session]);

    useEffect(() => {
        if (loading || !session) return;
        const tScore = calcTrust(session.proctoring_flags ?? []);
        const keyword = session.passed && tScore >= 80 ? 'winning'
            : session.passed ? 'lucky'
            : tScore >= 80 ? 'studying' : 'fail';
        setMemeLoading(true);
        fetch(`/api/meme?keywords=${keyword}&number=5`)
            .then(r => r.json())
            .then(data => {
                const memes = (Array.isArray(data) ? data : (data.memes ?? [])) as MemeResult[];
                setMeme(memes[Math.floor(Math.random() * memes.length)] ?? null);
            })
            .catch(() => setMeme(null))
            .finally(() => setMemeLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, session]);

    // ── Derived values ────────────────────────────────────────────────────────
    const correctCount   = session?.question_results?.filter(r => r.correct).length ?? 0;
    const incorrectCount = questions.length - correctCount;
    const trustScore     = calcTrust(session?.proctoring_flags ?? []);
    const pct            = session?.percentage ?? 0;
    const CIRC           = 2 * Math.PI * 54; // r=54 for smaller donut
    const strokeOffset   = CIRC - (pct / 100) * CIRC;
    const flags          = session?.proctoring_flags ?? [];
    const visibleFlags   = flagsExpanded ? flags : flags.slice(0, 3);
    const visibleQs      = showAll ? questions : questions.slice(0, 6);
    const initials       = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

    const trustLabel = trustScore >= 80 ? 'High Integrity' : trustScore >= 50 ? 'At Risk' : 'Flagged';
    const trustColor = trustScore >= 80 ? { text: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' }
        : trustScore >= 50 ? { text: 'text-amber-600', bar: 'bg-amber-400', bg: 'bg-amber-50', border: 'border-amber-100' }
        : { text: 'text-red-600', bar: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-100' };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f8fc]">
            <Loader2 className="w-8 h-8 text-[#4b3fe9] animate-spin" />
        </div>
    );
    if (!session) return null;

    return (
        <div className="min-h-screen bg-[#f8f8fc]">
            <ConfettiCannon active={confetti} />

            {/* ── Header ───────────────────────────────────────────────────── */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
                {/* Left: logo + breadcrumb */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#4b3fe9]/10 flex items-center justify-center shrink-0">
                        <Image src="/symbol.svg" alt="EulerPro" width={18} height={18} />
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-sm">
                        <button onClick={() => router.push('/dashboard/student')} className="text-gray-400 hover:text-[#4b3fe9] transition-colors font-medium">Dashboard</button>
                        <span className="text-gray-300">/</span>
                        <button onClick={() => router.push('/dashboard/student/exams')} className="text-gray-400 hover:text-[#4b3fe9] transition-colors font-medium">My Exams</button>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-700 font-semibold">{session.exams.title}</span>
                    </div>
                </div>

                {/* Centre: exam quick stats */}
                <div className="hidden md:flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-500">
                        <Trophy className="w-3.5 h-3.5 text-[#4b3fe9]" />
                        <span className="font-semibold text-gray-700">{pct}%</span>
                        <span>score</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200" />
                    <div className="flex items-center gap-1.5 text-gray-500">
                        <Clock className="w-3.5 h-3.5 text-[#4b3fe9]" />
                        <span className="font-semibold text-gray-700">{formatDuration(session.time_taken_seconds)}</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200" />
                    <div className="flex items-center gap-1.5 text-gray-500">
                        <ShieldCheck className={cn('w-3.5 h-3.5', trustColor.text)} />
                        <span className={cn('font-semibold', trustColor.text)}>{trustLabel}</span>
                    </div>
                </div>

                {/* Right: actions + avatar */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            console.log('Email button clicked. instructorEmail:', instructorEmail);
                            if (instructorEmail) {
                                window.location.href = `mailto:${instructorEmail}?subject=Results%20for%20${encodeURIComponent(session.exams.title)}&body=Hi%20Instructor%2C%0A%0AI%20completed%20the%20exam%20%22${encodeURIComponent(session.exams.title)}%22%20with%20a%20score%20of%20${pct}%25.%0A%0AThank%20you!`;
                            } else {
                                console.warn('Instructor email not available');
                                alert('Instructor email not available. Please try again.');
                            }
                        }}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-[#4b3fe9]/40 hover:text-[#4b3fe9] transition-all"
                    >
                        <MailPlus className="w-3.5 h-3.5" />
                        Email Instructor
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/student/exams')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-[#4b3fe9]/40 hover:text-[#4b3fe9] transition-all"
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">My Exams</span>
                    </button>
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.full_name ?? 'Student'}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-[#4b3fe9]/20 shadow-sm cursor-pointer"
                            onClick={() => router.push('/dashboard/student/profile')}
                        />
                    ) : profile ? (
                        <div onClick={() => router.push('/dashboard/student/profile')}
                            className="w-8 h-8 rounded-full bg-[#4b3fe9]/10 text-[#4b3fe9] text-xs font-bold flex items-center justify-center ring-2 ring-[#4b3fe9]/20 shadow-sm cursor-pointer">
                            {initials}
                        </div>
                    ) : (
                        <button
                            onClick={() => router.push('/dashboard/student/profile')}
                            aria-label="Open profile"
                            className="w-8 h-8 rounded-full bg-[#4b3fe9]/10 text-[#4b3fe9] flex items-center justify-center ring-2 ring-[#4b3fe9]/20 shadow-sm hover:bg-[#4b3fe9]/15 transition-colors"
                        >
                            <User className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            {/* ── Layout: main (scrollable) + fixed sidebar ─────────────── */}
            <div className="flex min-h-[calc(100vh-57px)]">

                {/* ── Scrollable main content ───────────────────────────── */}
                <main className="flex-1 min-w-0 pt-8 pb-16 px-4 sm:px-8 xl:px-8">

                    {/* ── Hero: dark score card ─────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                        className={cn(
                            'relative rounded-3xl overflow-hidden mb-6 p-8',
                            session.passed
                                ? 'bg-linear-to-br from-[#1a1245] via-[#2b1f72] to-[#0f0a2e]'
                                : 'bg-linear-to-br from-[#1a0a0a] via-[#2b1111] to-[#0f0505]'
                        )}
                    >
                        {/* Subtle radial glow */}
                        <div className={cn('absolute inset-0 opacity-20', session.passed
                            ? 'bg-[radial-gradient(ellipse_at_top_right,#7c6ff7,transparent_60%)]'
                            : 'bg-[radial-gradient(ellipse_at_top_right,#f43f5e,transparent_60%)]')} />

                        <div className="relative flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-10">
                            {/* Left text block */}
                            <div className="flex-1">
                                {/* Badges */}
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border',
                                        session.passed ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30')}>
                                        {session.passed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {session.passed ? 'Candidate Passed' : 'Candidate Failed'}
                                    </span>
                                    {session.exams.courses?.code && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-white/10 text-white/70 border-white/20">
                                            <GraduationCap className="w-3 h-3" />
                                            {session.exams.courses.code}
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-1">{session.exams.title}</h1>
                                {session.exams.courses?.name && (
                                    <p className="text-sm text-white/50 mb-1">{session.exams.courses.name}</p>
                                )}
                                <p className="text-xs text-white/40">Completed on {formatDate(session.completed_at)}</p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                                    {[
                                        { label: 'Accuracy', value: `${correctCount}/${questions.length}`, sub: `${pct}%` },
                                        { label: 'Time Taken', value: formatDuration(session.time_taken_seconds), sub: 'duration' },
                                        { label: 'Points', value: `${session.score}`, sub: `of ${session.max_score}` },
                                    ].map((stat) => (
                                        <div key={stat.label} className="bg-white/8 border border-white/10 rounded-2xl px-4 py-3">
                                            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-0.5">{stat.label}</p>
                                            <p className="text-base font-extrabold text-white tabular-nums">{stat.value}</p>
                                            <p className="text-[10px] text-white/40">{stat.sub}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="shrink-0 self-center lg:self-start">
                                <div className="relative w-36 h-36">
                                    <svg width="144" height="144" viewBox="0 0 144 144">
                                        <circle cx="72" cy="72" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                                        <circle
                                            cx="72"
                                            cy="72"
                                            r="54"
                                            fill="none"
                                            stroke={session.passed ? '#7c6ff7' : '#f43f5e'}
                                            strokeWidth="12"
                                            strokeLinecap="round"
                                            strokeDasharray={CIRC}
                                            strokeDashoffset={strokeOffset}
                                            transform="rotate(-90 72 72)"
                                            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-extrabold text-white tabular-nums leading-none">{pct}</span>
                                        <span className="text-[10px] text-white/40 font-semibold mt-0.5 uppercase tracking-wide">Score / 100</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </motion.div>

                    {/* ── Question Review ───────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                    >
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-extrabold text-gray-900">Question Review</h2>
                            <p className="text-sm text-gray-400 mt-1">Scroll to analyze each response</p>
                            <div className="flex items-center justify-center gap-3 mt-3">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                                    <CheckCircle className="w-3.5 h-3.5" /> {correctCount} correct
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-100 rounded-full px-3 py-1">
                                    <XCircle className="w-3.5 h-3.5" /> {incorrectCount} incorrect
                                </span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {visibleQs.map((q, i) => (
                                <QuestionCard
                                    key={q.id}
                                    question={q}
                                    qResult={session.question_results?.find(r => r.question_id === q.id)}
                                    givenAnswer={session.answers?.[q.id]}
                                    index={i}
                                />
                            ))}
                        </div>

                        {questions.length > 6 && (
                            <button
                                onClick={() => setShowAll(v => !v)}
                                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-[#4b3fe9]/40 hover:text-[#4b3fe9] hover:bg-[#4b3fe9]/3 transition-all"
                            >
                                {showAll ? <><ChevronUp className="w-4 h-4" /> Show Less</> : <><ChevronDown className="w-4 h-4" /> View All {questions.length} Questions</>}
                            </button>
                        )}
                    </motion.div>

                    {/* ── Back to Dashboard ─────────────────────────────── */}
                    <div className="flex justify-center mt-12">
                        <Button
                            onClick={() => router.push('/dashboard/student')}
                            className="bg-[#4b3fe9] hover:bg-[#3228d4] text-white font-semibold rounded-xl gap-2 px-10 shadow-md shadow-[#4b3fe9]/20"
                        >
                            <LayoutDashboard className="w-4 h-4" /> Back to Dashboard
                        </Button>
                    </div>
                </main>

                {/* ── Fixed right sidebar ───────────────────────────────── */}
                <aside className="hidden xl:flex flex-col w-96 shrink-0 sticky top-14 h-[calc(100vh-57px)] overflow-y-auto px-4 pt-8 pb-8 gap-4 border-l border-gray-100 bg-white/60 backdrop-blur-sm">

                    {/* ── Proctoring Report card ─────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm"
                    >
                        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#4b3fe9] shrink-0" />
                            <h3 className="font-bold text-gray-900 text-sm">Proctoring Report</h3>
                        </div>
                        <div className="px-5 py-4">
                            {/* Large trust score display */}
                            <div className={cn('rounded-xl border p-4 mb-4', trustColor.bg, trustColor.border)}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Trust Score</span>
                                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', trustColor.bg, trustColor.text, trustColor.border)}>
                                        {trustLabel}
                                    </span>
                                </div>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className={cn('text-3xl font-extrabold tabular-nums leading-none', trustColor.text)}>{trustScore}</span>
                                    <span className="text-sm text-gray-400 font-medium mb-0.5">/100</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${trustScore}%` }}
                                        transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
                                        className={cn('h-full rounded-full', trustColor.bar)}
                                    />
                                </div>
                            </div>

                            {/* Activity log */}
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Activity Log</p>
                            {flags.length === 0 ? (
                                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                    No violations detected
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        {visibleFlags.map((f, i) => (
                                            <div key={i} className="flex items-start gap-2.5 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                                                <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-red-700 capitalize">{f.type.replace(/_/g, ' ')}</p>
                                                    <p className="text-red-400 mt-0.5 truncate">{f.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {flags.length > 3 && (
                                        <button
                                            onClick={() => setFlagsExpanded(v => !v)}
                                            className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#4b3fe9] transition-colors py-1.5"
                                        >
                                            {flagsExpanded
                                                ? <><ChevronUp className="w-3.5 h-3.5" /> Show fewer</>
                                                : <><ChevronDown className="w-3.5 h-3.5" /> View {flags.length - 3} more</>}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>

                    {/* ── Meme card ─────────────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.28 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm"
                    >
                        <div className="px-5 py-3 border-b border-gray-50">
                            <p className="text-sm font-bold text-gray-800">What if your exam was a meme?</p>
                        </div>
                        <div className="p-3 flex items-center justify-center min-h-44">
                            {memeLoading ? (
                                <Loader2 className="w-6 h-6 text-[#4b3fe9] animate-spin" />
                            ) : meme ? (
                                meme.type.startsWith('video/') ? (
                                    <video src={meme.url} autoPlay loop muted playsInline
                                        className="w-full max-h-96 h-auto rounded-xl object-contain" />
                                ) : (
                                    <img src={meme.url} alt="exam meme"
                                        className="w-full max-h-96 h-auto rounded-xl object-contain" />
                                )
                            ) : (
                                <p className="text-sm text-gray-400">No meme found 😅</p>
                            )}
                        </div>
                    </motion.div>

                    {/* ── Rotating Motivational Text ─────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="min-h-16 px-3 flex items-center justify-center"
                    >
                        <RotatingText />
                    </motion.div>

                    {/* ── Share My Result Button (Bottom) ─────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-auto pt-2"
                    >
                        <Button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="w-full bg-[#4b3fe9] hover:bg-[#3228d4] text-white font-semibold rounded-xl gap-2 shadow-md shadow-[#4b3fe9]/20"
                        >
                            <Share2 className="w-4 h-4" /> {copied ? 'Result Copied!' : 'Share My Result'}
                        </Button>
                    </motion.div>
                </aside>
            </div>
        </div>
    );
}
