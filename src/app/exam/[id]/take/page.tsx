'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Bookmark, ChevronLeft, ChevronRight, AlertTriangle,
    CheckCircle, Flag, Send, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
type Question = {
    id: string;
    type: string;
    text: string;
    points: number;
    difficulty: string;
    order: number;
    media_url?: string | null;
    media_type?: 'image' | 'video' | null;
    options?: string[];
    answer_data: Record<string, unknown>;
    render_as_code?: boolean;
};

type ExamData = {
    id: string;
    title: string;
    duration: number;
    passing_score: number;
    scheduled_at: string | null;
    questions: Question[];
};

type Answers = Record<string, unknown>;

type Profile = {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    role: string;
};

type ProctorFlag = {
    type: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    timestamp: string;
};

// ─── Difficulty colour map ────────────────────────────────────────────────────
const DIFF_CLS: Record<string, string> = {
    easy:   'bg-emerald-50 text-emerald-700',
    medium: 'bg-amber-50   text-amber-700',
    hard:   'bg-red-50     text-red-600',
};

// ─── Score calculation helper ─────────────────────────────────────────────────
function calcResults(questions: Question[], answers: Answers) {
    let score = 0;
    const maxScore = questions.reduce((s, q) => s + q.points, 0);
    const questionResults = questions.map(q => {
        const ans = answers[q.id];
        let correct = false;
        if (q.type === 'multiple_choice') correct = ans === q.answer_data.correct_option;
        else if (q.type === 'true_false') correct = ans === q.answer_data.correct_answer;
        else if (q.type === 'fill_blank') {
            const regex = q.answer_data.answer_regex as string | undefined;
            correct = regex ? new RegExp(regex, 'i').test((ans as string) ?? '') : false;
        } else if (q.type === 'checkbox') {
            const correct_options = (q.answer_data.correct_options as number[]) ?? [];
            const given = ((ans as number[]) ?? []).sort().join(',');
            correct = given === correct_options.sort().join(',');
        }
        if (correct) score += q.points;
        return { question_id: q.id, correct, points_awarded: correct ? q.points : 0 };
    });
    return { score, maxScore, questionResults };
}

// ─── Submit modal ─────────────────────────────────────────────────────────────
function SubmitModal({
    answeredCount, totalCount, flaggedCount,
    onCancel, onConfirm, submitting,
}: {
    answeredCount: number; totalCount: number; flaggedCount: number;
    onCancel: () => void; onConfirm: () => void; submitting: boolean;
}) {
    const unanswered = totalCount - answeredCount;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.2 }}
                className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden z-10"
            >
                {/* Gradient header band */}
                <div className="bg-linear-to-br from-[#4b3fe9] to-[#7c6ff7] px-6 pt-6 pb-8">
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Final Step</p>
                    <h3 className="text-xl font-bold text-white">Submit your exam?</h3>
                    <p className="text-white/60 text-xs mt-1">This cannot be undone.</p>
                </div>

                {/* Stat cards row — pulled up into the gradient band */}
                <div className="px-5 -mt-4 mb-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm grid grid-cols-3 divide-x divide-gray-100 text-center">
                        <div className="py-3 px-2">
                            <p className="text-lg font-bold text-emerald-600">{answeredCount}</p>
                            <p className="text-[10px] text-gray-400 leading-tight">Answered</p>
                        </div>
                        <div className="py-3 px-2">
                            <p className={`text-lg font-bold ${unanswered > 0 ? 'text-red-500' : 'text-gray-300'}`}>{unanswered}</p>
                            <p className="text-[10px] text-gray-400 leading-tight">Skipped</p>
                        </div>
                        <div className="py-3 px-2">
                            <p className={`text-lg font-bold ${flaggedCount > 0 ? 'text-amber-500' : 'text-gray-300'}`}>{flaggedCount}</p>
                            <p className="text-[10px] text-gray-400 leading-tight">Flagged</p>
                        </div>
                    </div>
                </div>

                <div className="px-5 pb-5">
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl" disabled={submitting}>
                            Go Back
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={submitting}
                            className="flex-1 bg-[#4b3fe9] hover:bg-[#3228d4] text-white rounded-xl gap-2"
                        >
                            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> Confirm</>}
                        </Button>
                    </div>            
                </div>           
            </motion.div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ExamTakePage() {
    const params = useParams<{ id: string }>();
    const router  = useRouter();
    const examId = params?.id;

    const [exam, setExam]               = useState<ExamData | null>(null);
    const [profile, setProfile]         = useState<Profile | null>(null);
    const [sessionId, setSessionId]     = useState<string | null>(null);
    const [loadingExam, setLoadingExam] = useState(true);

    const [currentIdx, setCurrentIdx]   = useState(0);
    const [answers, setAnswers]         = useState<Answers>({});
    const [flagged, setFlagged]         = useState<Set<string>>(new Set());

    const [timeLeft, setTimeLeft]       = useState(0);
    const [initialTimeSet, setInitialTimeSet] = useState(false);
    const [procFlags, setProcFlags]     = useState<ProctorFlag[]>([]);

    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitting, setSubmitting]           = useState(false);
    const [submitError, setSubmitError]         = useState<string | null>(null);

    const startedAt = useRef<Date>(new Date());
    const autoSaveRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const tabSwitchCountRef = useRef(0);
    const copyPasteCountRef = useRef(0);
    const analyzeLoopRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    const analyzeBusyRef = useRef(false);

    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

    const severityForType = (flagType: string): 'high' | 'medium' | 'low' => {
        if (['no_face', 'unknown_face', 'multiple_faces', 'phone_detected', 'electronic_device'].includes(flagType)) {
            return 'high';
        }
        if (['head_movement', 'tab_switch', 'copy_paste'].includes(flagType)) {
            return 'medium';
        }
        return 'low';
    };

    const labelForType = (flagType: string) => {
        const labels: Record<string, string> = {
            no_face: 'No face detected',
            unknown_face: 'Unknown face detected',
            multiple_faces: 'Multiple people detected',
            head_movement: 'Looking away from screen',
            phone_detected: 'Phone detected',
            electronic_device: 'Electronic device detected',
            tab_switch: 'Tab switch detected',
            copy_paste: 'Copy/paste attempt detected',
        };
        return labels[flagType] ?? flagType;
    };

    const captureFrameB64 = useCallback((): string | null => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const [, b64] = dataUrl.split(',', 2);
        return b64 ?? null;
    }, []);

    const pushLocalFlags = useCallback((incoming: ProctorFlag[]) => {
        if (!incoming.length) return;
        setProcFlags(prev => {
            const seen = new Set(prev.map(f => `${f.type}-${f.timestamp}`));
            const next = [...prev];
            for (const flag of incoming) {
                const key = `${flag.type}-${flag.timestamp}`;
                if (!seen.has(key)) {
                    next.push(flag);
                    seen.add(key);
                }
            }
            return next;
        });
    }, []);

    const reportDiscreteFlag = useCallback(async (flagType: 'tab_switch' | 'copy_paste', description: string) => {
        if (!sessionId) return;
        try {
            await fetch(`${backendBaseUrl}/api/v1/sessions/${sessionId}/flag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flag_type: flagType,
                    severity: 'medium',
                    description,
                }),
            });
        } catch {
            // Ignore network blips while exam is in progress.
        }
    }, [backendBaseUrl, sessionId]);

    const analyzeCurrentFrame = useCallback(async () => {
        if (!sessionId || loadingExam || analyzeBusyRef.current) return;
        const frame_b64 = captureFrameB64();
        if (!frame_b64) return;

        analyzeBusyRef.current = true;
        try {
            const tab_switches = tabSwitchCountRef.current;
            const copy_paste_attempts = copyPasteCountRef.current;

            const resp = await fetch(`${backendBaseUrl}/api/v1/sessions/${sessionId}/analyze-frame`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frame_b64,
                    tab_switches,
                    copy_paste_attempts,
                }),
            });

            if (!resp.ok) return;
            const analysis = await resp.json() as { flags?: Array<{ type?: string; severity?: 'high' | 'medium' | 'low'; description?: string }> };
            const now = new Date().toISOString();

            const normalized = (analysis.flags ?? []).map((f) => ({
                type: f.type ?? 'other',
                severity: f.severity ?? severityForType(f.type ?? 'other'),
                description: f.description ?? labelForType(f.type ?? 'other'),
                timestamp: now,
            }));

            pushLocalFlags(normalized);
            tabSwitchCountRef.current = 0;
            copyPasteCountRef.current = 0;
        } catch {
            // Keep exam flow uninterrupted if proctoring backend is temporarily unavailable.
        } finally {
            analyzeBusyRef.current = false;
        }
    }, [backendBaseUrl, captureFrameB64, loadingExam, pushLocalFlags, sessionId]);

    // ── Load exam + profile + create/resume session ──────────────────────────
    useEffect(() => {
        (async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            // Profile
            if (user) {
                const { data: prof } = await supabase
                    .from('profiles')
                    .select('full_name, email, avatar_url, role')
                    .eq('id', user.id)
                    .single();
                if (prof) setProfile(prof as Profile);
            }

            // Exam + questions
            if (!examId || !user) { router.push('/dashboard/student/exams'); return; }

            const { data: ex } = await supabase
                .from('exams')
                .select('id, title, duration, passing_score, scheduled_at')
                .eq('id', examId)
                .single();

            const { data: qs } = await supabase
                .from('questions')
                .select('id, type, text, points, difficulty, "order", media_url, media_type, answer_data, render_as_code')
                .eq('exam_id', examId)
                .order('"order"');

            if (!ex || !qs) { router.push('/dashboard/student/exams'); return; }

            const examData: ExamData = {
                ...ex,
                questions: (qs as Question[]).map(q => ({
                    ...q,
                    media_url: typeof q.media_url === 'string' ? q.media_url : null,
                    media_type: q.media_type === 'video' || q.media_type === 'image' ? q.media_type : null,
                    options: (q.answer_data as Record<string, unknown>).options as string[] | undefined,
                })),
            };
            setExam(examData);
            setTimeLeft(examData.duration * 60);

            // Create or resume exam_session
            {
                const { data: existing } = await supabase
                    .from('exam_sessions')
                    .select('id, answers, status, completed_at, started_at')
                    .eq('exam_id', examId)
                    .eq('student_id', user.id)
                    .maybeSingle();

                if (existing && existing.status === 'active') {
                    setSessionId(existing.id);
                    if (existing.answers) setAnswers(existing.answers as Answers);

                    // Restore question index from localStorage if same session
                    const savedIdx = localStorage.getItem(`exam_idx_${existing.id}`);
                    if (savedIdx) setCurrentIdx(parseInt(savedIdx, 10));

                    // Sync startedAt ref for accurate time taken reporting
                    if (existing.started_at) {
                        startedAt.current = new Date(existing.started_at);
                    }

                    // Calculate remaining time
                    const start = new Date(existing.started_at ?? new Date()).getTime();
                    const now = new Date().getTime();
                    const elapsed = Math.floor((now - start) / 1000);
                    const remaining = Math.max(0, (examData.duration * 60) - elapsed);
                    setTimeLeft(remaining);
                    setInitialTimeSet(true);

                } else if (!existing) {
                    const nowIso = new Date().toISOString();
                    const { data: sess } = await supabase
                        .from('exam_sessions')
                        .insert({ 
                            exam_id: examId, 
                            student_id: user.id, 
                            status: 'active',
                            started_at: nowIso
                        })
                        .select('id')
                        .single();
                    if (sess) {
                        setSessionId(sess.id);
                        setTimeLeft(examData.duration * 60);
                        setInitialTimeSet(true);
                    }
                } else {
                    const scheduledAtMs = ex.scheduled_at ? new Date(ex.scheduled_at).getTime() : null;
                    const completedAtMs = existing.completed_at ? new Date(existing.completed_at).getTime() : null;
                    const isRescheduledAfterCompletion = Boolean(
                        scheduledAtMs &&
                        completedAtMs &&
                        !Number.isNaN(scheduledAtMs) &&
                        !Number.isNaN(completedAtMs) &&
                        scheduledAtMs > completedAtMs,
                    );

                    if (isRescheduledAfterCompletion) {
                        const nowIso = new Date().toISOString();
                        const { error: resetErr } = await supabase
                            .from('exam_sessions')
                            .update({
                                status: 'active',
                                completed_at: null,
                                started_at: nowIso,
                                score: null,
                                max_score: null,
                                percentage: null,
                                passed: null,
                                time_taken_seconds: null,
                                question_results: null,
                                answers: {},
                                proctoring_flags: [],
                            })
                            .eq('id', existing.id);

                        if (resetErr) {
                            router.push(`/exam/${examId}/results`);
                            return;
                        }

                        setSessionId(existing.id);
                        setAnswers({});
                        setTimeLeft(examData.duration * 60);
                        setInitialTimeSet(true);
                    } else {
                        // Already completed and not rescheduled after completion.
                        router.push(`/exam/${examId}/results`);
                        return;
                    }
                }
            }

            setLoadingExam(false);
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId]);

    // ── Timer ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!initialTimeSet || timeLeft === 0) return;
        const t = setInterval(() => setTimeLeft(p => {
            if (p <= 1) { clearInterval(t); setShowSubmitModal(true); return 0; }
            return p - 1;
        }), 1000);
        return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialTimeSet]);

    // ── Auto-save answers + Index ───────────────────────────────
    useEffect(() => {
        if (!sessionId) return;
        
        // Save index to localStorage
        localStorage.setItem(`exam_idx_${sessionId}`, currentIdx.toString());

        autoSaveRef.current = setInterval(async () => {
            const supabase = createClient();
            await supabase.from('exam_sessions').update({ answers }).eq('id', sessionId);
        }, 5000); // More frequent auto-save (5s) for reliability
        return () => clearInterval(autoSaveRef.current);
    }, [answers, sessionId, currentIdx]);

    // ── Camera init for continuous proctoring ───────────────────────────────
    useEffect(() => {
        if (!sessionId || loadingExam) return;

        let mounted = true;
        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                    audio: false,
                });
                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => undefined);
                }
            } catch {
                // If camera permission is blocked, exam continues and other proctor signals still work.
            }
        })();

        return () => {
            mounted = false;
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        };
    }, [loadingExam, sessionId]);

    // ── Background frame analysis loop ───────────────────────────────────────
    useEffect(() => {
        if (!sessionId || loadingExam) return;

        void analyzeCurrentFrame();
        analyzeLoopRef.current = setInterval(() => {
            void analyzeCurrentFrame();
        }, 7000);

        return () => {
            clearInterval(analyzeLoopRef.current);
        };
    }, [analyzeCurrentFrame, loadingExam, sessionId]);

    // ── Tab switch detection ─────────────────────────────────────────────────
    useEffect(() => {
        const handle = () => {
            if (document.hidden) {
                tabSwitchCountRef.current += 1;
                setProcFlags(f => [...f, {
                    type: 'tab_switch',
                    severity: 'medium',
                    description: 'Tab switch detected',
                    timestamp: new Date().toISOString(),
                }]);
                if (!streamRef.current) {
                    void reportDiscreteFlag('tab_switch', 'Tab switch detected');
                }
            }
        };
        document.addEventListener('visibilitychange', handle);
        return () => document.removeEventListener('visibilitychange', handle);
    }, [reportDiscreteFlag]);

    // ── Copy-paste detection ─────────────────────────────────────────────────
    useEffect(() => {
        const handle = (e: ClipboardEvent) => {
            e.preventDefault();
            copyPasteCountRef.current += 1;
            setProcFlags(f => [...f, {
                type: 'copy_paste',
                severity: 'medium',
                description: 'Copy/paste attempt detected',
                timestamp: new Date().toISOString(),
            }]);
            if (!streamRef.current) {
                void reportDiscreteFlag('copy_paste', 'Copy/paste attempt detected');
            }
        };
        document.addEventListener('copy', handle);
        document.addEventListener('paste', handle);
        return () => { document.removeEventListener('copy', handle); document.removeEventListener('paste', handle); };
    }, [reportDiscreteFlag]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const timeColor = timeLeft < 300 ? 'text-red-500' : timeLeft < 600 ? 'text-amber-500' : 'text-gray-700';
    const timeBg    = timeLeft < 300 ? 'bg-red-50 border-red-100 text-red-600' : timeLeft < 600 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-gray-50 border-gray-200 text-gray-700';

    const currentQ = exam?.questions[currentIdx];
    const answeredCount = Object.keys(answers).length;
    const totalCount = exam?.questions.length ?? 0;
    const progressPct = totalCount ? Math.round((answeredCount / totalCount) * 100) : 0;

    const setAnswer = (val: unknown) => {
        if (!currentQ) return;
        setAnswers(a => {
            const next = { ...a };
            const isEmpty =
                val === '' ||
                val === null ||
                val === undefined ||
                (Array.isArray(val) && val.length === 0);
            if (isEmpty) {
                delete next[currentQ.id];
            } else {
                next[currentQ.id] = val;
            }
            return next;
        });
    };

    const toggleFlag = () => {
        if (!currentQ) return;
        setFlagged(prev => {
            const n = new Set(prev);
            n.has(currentQ.id) ? n.delete(currentQ.id) : n.add(currentQ.id);
            return n;
        });
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleConfirmSubmit = useCallback(async () => {
        if (!exam) return;
        setSubmitting(true);
        setSubmitError(null);

        const timeTaken = Math.floor((new Date().getTime() - startedAt.current.getTime()) / 1000);
        const { score, maxScore, questionResults } = calcResults(exam.questions, answers);
        const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        const passed = percentage >= (exam.passing_score ?? 60);

        const supabase = createClient();

        // Flush any queued tab/copy counters and latest camera frame before finalizing.
        await analyzeCurrentFrame();

        if (sessionId) {
            const { error } = await supabase
                .from('exam_sessions')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    time_taken_seconds: timeTaken,
                    answers,
                    question_results: questionResults,
                    score,
                    max_score: maxScore,
                    percentage,
                    passed,
                })
                .eq('id', sessionId);

            if (error) { setSubmitError(error.message); setSubmitting(false); return; }

            // Trigger result email as soon as final submit succeeds.
            if (profile?.email) {
                const resultsUrl = `${window.location.origin}/exam/${examId}/results?session=${sessionId}`;
                void fetch(`${backendBaseUrl}/api/v1/notifications/results`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_email: profile.email,
                        student_name: profile.full_name || profile.email,
                        exam_title: exam.title,
                        percentage,
                        passed,
                        results_url: resultsUrl,
                    }),
                }).catch(() => {
                    // Do not block exam submission success if email service is unavailable.
                });
            }
        }

        setSubmitting(false);
        setShowSubmitModal(false);
        router.push(`/exam/${examId}/results`);
    }, [exam, answers, sessionId, examId, router, profile, analyzeCurrentFrame, backendBaseUrl]);

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loadingExam) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 text-[#4b3fe9] animate-spin" />
        </div>
    );

    if (!exam || !currentQ) return null;

    const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

    return (
        <div className="h-screen bg-[#f8f8fc] flex flex-col overflow-hidden">

            {/* ── Top Bar ──────────────────────────────────────────────────── */}
            <header className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between shrink-0 z-20 shadow-sm">
                {/* Logo + exam title */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#4b3fe9]/10 flex items-center justify-center shrink-0">
                        <Image src="/symbol.svg" alt="EulerPro" width={18} height={18} />
                    </div>
                    <h1 className="font-bold text-gray-900 text-sm truncate max-w-xs hidden sm:block">{exam.title}</h1>
                    <span className="hidden md:inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 shrink-0">
                        {answeredCount}/{totalCount} answered
                    </span>
                </div>

                {/* Centre: progress bar */}
                <div className="flex-1 max-w-md mx-8 hidden md:flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-medium text-gray-400">
                        <span>Question {currentIdx + 1} of {totalCount}</span>
                        <span>{progressPct}% answered</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#4b3fe9] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                    </div>
                </div>

                {/* Right: timer + proctor + profile */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* Timer */}
                    <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm tabular-nums', timeBg)}>
                        <Clock className="w-4 h-4" />
                        {formatTime(timeLeft)}
                    </div>

                    {/* Proctor active pill */}
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold uppercase tracking-wide">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Proctor Active
                    </div>

                    {/* Proctoring flags badge */}
                    {procFlags.length > 0 && (
                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {procFlags.length}
                        </div>
                    )}

                    <video ref={videoRef} className="hidden" playsInline muted />

                    <div className="w-px h-6 bg-gray-200" />

                    {/* Profile avatar */}
                    {profile?.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={profile.full_name ?? 'Student'}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-[#4b3fe9]/10 text-[#4b3fe9] text-xs font-bold flex items-center justify-center ring-2 ring-white shadow-sm">
                            {initials}
                        </div>
                    )}
                    {profile && (
                        <div className="hidden lg:flex flex-col leading-tight">
                            <span className="text-xs font-semibold text-gray-800">{profile.full_name ?? profile.email}</span>
                            <span className="text-[10px] text-gray-400 capitalize">{profile.role}</span>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Body ─────────────────────────────────────────────────────── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* ── Centre: Question area ──────────────────────────────── */}
                <main className="flex-1 min-h-0 overflow-hidden p-6 md:p-10">
                    <div className="max-w-3xl mx-auto h-full flex flex-col min-h-0">
                        <div className="flex-1 min-h-0">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentQ.id}
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -14 }}
                                    transition={{ duration: 0.22 }}
                                    className="h-full"
                                >
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col min-h-0">
                                        <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/40 flex items-start justify-between gap-4 shrink-0">
                                            <div className="flex items-start gap-3">
                                                <span className="w-9 h-9 rounded-full bg-[#4b3fe9] text-white text-sm font-bold flex items-center justify-center shrink-0 shadow">
                                                    {currentIdx + 1}
                                                </span>
                                                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                                                    <Badge className="bg-[#4b3fe9]/8 text-[#4b3fe9] border-0 text-[11px] capitalize px-2.5 py-0.5">
                                                        {currentQ.type.replace(/_/g, ' ')}
                                                    </Badge>
                                                    <Badge className={cn('border-0 text-[11px] capitalize px-2.5 py-0.5', DIFF_CLS[currentQ.difficulty] ?? 'bg-gray-100 text-gray-500')}>
                                                        {currentQ.difficulty}
                                                    </Badge>
                                                    <span className="text-xs text-gray-400 font-medium">{currentQ.points} pt{currentQ.points !== 1 ? 's' : ''}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={toggleFlag}
                                                title="Flag for review"
                                                className={cn('p-2 rounded-lg shrink-0 transition-all', flagged.has(currentQ.id) ? 'bg-amber-50 text-amber-500' : 'text-gray-300 hover:bg-gray-50 hover:text-gray-500')}
                                            >
                                                <Flag className="w-4 h-4" fill={flagged.has(currentQ.id) ? 'currentColor' : 'none'} />
                                            </button>
                                        </div>

                                        <div className="flex-1 min-h-0 p-8 overflow-y-auto">
                                            <div className="mb-6">
                                                {currentQ.render_as_code ? (
                                                    <div className="relative group">
                                                        <pre className="p-5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[15px] leading-relaxed overflow-x-auto shadow-inner border border-slate-800">
                                                            <code>{currentQ.text}</code>
                                                        </pre>
                                                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-slate-800/50 text-[10px] text-slate-400 font-mono border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            CODE
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-lg font-semibold text-gray-900 leading-snug">{currentQ.text}</p>
                                                )}
                                                {currentQ.media_url && (
                                                    currentQ.media_type === 'video'
                                                        ? (
                                                            // eslint-disable-next-line jsx-a11y/media-has-caption
                                                            <video src={currentQ.media_url} controls className="mt-3 rounded-xl max-h-80 w-full object-contain bg-white border border-gray-200" />
                                                        )
                                                        : (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={currentQ.media_url} alt="Question media" className="mt-3 rounded-xl max-h-80 w-full object-contain bg-white border border-gray-200" />
                                                        )
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                {currentQ.type === 'multiple_choice' && (currentQ.options ?? []).map((opt, i) => (
                                                    <label
                                                        key={i}
                                                        className={cn('group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all', answers[currentQ.id] === i ? 'border-[#4b3fe9] bg-[#4b3fe9]/5 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50/50')}
                                                    >
                                                        <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all', answers[currentQ.id] === i ? 'border-[#4b3fe9] bg-[#4b3fe9]' : 'border-gray-300')}>
                                                            {answers[currentQ.id] === i && <div className="w-2 h-2 rounded-full bg-white" />}
                                                        </div>
                                                        <input type="radio" name={`q-${currentQ.id}`} checked={answers[currentQ.id] === i} onChange={() => setAnswer(i)} className="sr-only" />
                                                        <span className="text-sm text-gray-800 font-medium flex-1">{opt}</span>
                                                        <span className="text-xs font-bold text-gray-300 group-hover:text-gray-400">{String.fromCharCode(65 + i)}</span>
                                                    </label>
                                                ))}

                                                {currentQ.type === 'true_false' && ['True', 'False'].map((v, i) => (
                                                    <label
                                                        key={v}
                                                        className={cn('group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all', answers[currentQ.id] === (i === 0) ? 'border-[#4b3fe9] bg-[#4b3fe9]/5 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50/50')}
                                                    >
                                                        <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all', answers[currentQ.id] === (i === 0) ? 'border-[#4b3fe9] bg-[#4b3fe9]' : 'border-gray-300')}>
                                                            {answers[currentQ.id] === (i === 0) && <div className="w-2 h-2 rounded-full bg-white" />}
                                                        </div>
                                                        <input type="radio" name={`q-${currentQ.id}`} checked={answers[currentQ.id] === (i === 0)} onChange={() => setAnswer(i === 0)} className="sr-only" />
                                                        <span className="text-sm font-semibold text-gray-800">{v}</span>
                                                    </label>
                                                ))}

                                                {currentQ.type === 'fill_blank' && (
                                                    <input
                                                        className="w-full border-2 border-gray-200 focus:border-[#4b3fe9] rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-colors bg-white"
                                                        placeholder="Type your answer here…"
                                                        value={(answers[currentQ.id] as string) ?? ''}
                                                        onChange={e => setAnswer(e.target.value)}
                                                    />
                                                )}

                                                {currentQ.type === 'checkbox' && (currentQ.options ?? []).map((opt, i) => {
                                                    const checked = ((answers[currentQ.id] as number[]) ?? []).includes(i);
                                                    return (
                                                        <label
                                                            key={i}
                                                            className={cn('group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all', checked ? 'border-[#4b3fe9] bg-[#4b3fe9]/5 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50/50')}
                                                        >
                                                            <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all', checked ? 'border-[#4b3fe9] bg-[#4b3fe9]' : 'border-gray-300')}>
                                                                {checked && <CheckCircle className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => {
                                                                    const prev = (answers[currentQ.id] as number[]) ?? [];
                                                                    setAnswer(checked ? prev.filter(x => x !== i) : [...prev, i]);
                                                                }}
                                                                className="sr-only"
                                                            />
                                                            <span className="text-sm font-medium text-gray-800 flex-1">{opt}</span>
                                                            <span className="text-xs font-bold text-gray-300 group-hover:text-gray-400">{String.fromCharCode(65 + i)}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="mt-4 shrink-0 bg-white border border-gray-100 px-6 py-4 rounded-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)]">
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                                    disabled={currentIdx === 0}
                                    className="rounded-xl gap-2 font-semibold text-sm border-gray-200"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Previous
                                </Button>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={toggleFlag}
                                        className={cn('hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all', flagged.has(currentQ.id) ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'text-gray-500 hover:bg-gray-50 border border-gray-200')}
                                    >
                                        <Bookmark className="w-4 h-4" fill={flagged.has(currentQ.id) ? 'currentColor' : 'none'} />
                                        {flagged.has(currentQ.id) ? 'Flagged' : 'Mark for Review'}
                                    </button>
                                    <Button
                                        onClick={() => setCurrentIdx(i => i + 1)}
                                        disabled={currentIdx >= totalCount - 1}
                                        className="bg-[#4b3fe9] hover:bg-[#3228d4] text-white rounded-xl gap-2 font-semibold text-sm shadow-md shadow-[#4b3fe9]/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                                    >
                                        Next <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* ── Right sidebar: Question Map ─────────────────────────── */}
                <aside className="w-80 bg-white border-l border-gray-100 flex-col shrink-0 hidden lg:flex">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h2 className="text-sm font-semibold text-gray-800">Question Map</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Click to jump to any question</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                        {/* Legend */}
                        <div className="flex flex-wrap gap-x-3 gap-y-2 mb-4 text-[11px] text-gray-400">
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4b3fe9]" />Current</div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Answered</div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-200" />Unseen</div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Flagged</div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-5 gap-1.5">
                            {exam.questions.map((q, i) => {
                                const isAnswered  = answers[q.id] !== undefined;
                                const isFlagged   = flagged.has(q.id);
                                const isCurrent   = i === currentIdx;
                                return (
                                    <button key={q.id} onClick={() => setCurrentIdx(i)}
                                        title={isFlagged ? 'Flagged for review' : isAnswered ? 'Answered' : 'Not answered'}
                                        className={cn(
                                            'aspect-square rounded-lg text-xs font-bold transition-all flex items-center justify-center relative',
                                            isCurrent
                                                ? 'bg-[#4b3fe9] text-white ring-2 ring-[#4b3fe9]/20 ring-offset-1 shadow'
                                                : isAnswered
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                    : 'bg-gray-50 border border-gray-200 text-gray-500 hover:border-[#4b3fe9]/40 hover:bg-gray-100',
                                        )}>
                                        {i + 1}
                                        {isFlagged && (
                                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border border-white" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Stats */}
                        <div className="mt-5 space-y-2 text-xs">
                            <div className="flex justify-between text-gray-500">
                                <span>Answered</span>
                                <span className="font-semibold text-emerald-600">{answeredCount}/{totalCount}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>Flagged</span>
                                <span className="font-semibold text-amber-500">{flagged.size}</span>
                            </div>
                            {procFlags.length > 0 && (
                                <div className="flex justify-between text-gray-500">
                                    <span>Proctor flags</span>
                                    <span className="font-semibold text-red-500">{procFlags.length}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit button */}
                    <div className="p-4 border-t border-gray-100">
                        {submitError && (
                            <p className="text-xs text-red-500 mb-2 text-center">{submitError}</p>
                        )}
                        <Button
                            onClick={() => setShowSubmitModal(true)}
                            className="w-full bg-[#4b3fe9] hover:bg-[#3228d4] text-white font-semibold rounded-xl gap-2 shadow-md shadow-[#4b3fe9]/20"
                        >
                            <Send className="w-4 h-4" /> Submit Exam
                        </Button>
                    </div>
                </aside>
            </div>

            {/* ── Submit confirmation modal ─────────────────────────────────── */}
            <AnimatePresence>
                {showSubmitModal && (
                    <SubmitModal
                        answeredCount={answeredCount}
                        totalCount={totalCount}
                        flaggedCount={flagged.size}
                        onCancel={() => setShowSubmitModal(false)}
                        onConfirm={handleConfirmSubmit}
                        submitting={submitting}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
