'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Sparkles, Paperclip, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Question, QuestionType } from '@/lib/types';

/* ─── rotating typewriter placeholders ──────────────────────────────────── */

const PLACEHOLDERS = [
    'Binary search trees and graph traversal for a Data Structures midterm…',
    'Photosynthesis and cellular respiration for a Biology quiz…',
    'Newton\'s laws of motion and kinematics for a Physics exam…',
    'SQL joins and normalisation for a Database Management test…',
    'Macroeconomic policy and inflation for an Economics assessment…',
    'React hooks and state management for a Frontend Development quiz…',
];

/* ─── AI thinking phrases ────────────────────────────────────────────────── */

const THOUGHTS = [
    'Reading your topic and learning objectives…',
    'Selecting optimal question types…',
    'Drafting question stems…',
    'Generating options and distractors…',
    'Calibrating difficulty distribution…',
    'Validating answer keys and point values…',
    'Formatting and finalising questions…',
];

/* ─── constants ──────────────────────────────────────────────────────────── */

const Q_LABEL: Record<QuestionType, string> = {
    multiple_choice: 'MCQ',
    checkbox:        'Multi',
    fill_blank:      'Fill',
    true_false:      'T/F',
    matching:        'Match',
    reorder:         'Order',
};

/* ─── props ──────────────────────────────────────────────────────────────── */

interface AiGenerateModalProps {
    open: boolean;
    onClose: () => void;
    /** Called with raw questions returned by the API (no id/order yet). */
    onQuestionsGenerated: (questions: Omit<Question, 'id' | 'order'>[]) => void;
}

/* ─── component ──────────────────────────────────────────────────────────── */

export default function AiGenerateModal({
    open, onClose, onQuestionsGenerated,
}: AiGenerateModalProps) {
    const [aiPrompt,      setAiPrompt]     = useState('');
    const [aiCount,       setAiCount]      = useState(5);
    const [aiDifficulty,  setAiDifficulty] = useState<'easy' | 'mixed' | 'hard'>('mixed');
    const [aiQTypes,      setAiQTypes]     = useState<QuestionType[]>(['multiple_choice', 'true_false']);
    const [aiGenerating,  setAiGenerating] = useState(false);
    const [aiFile,        setAiFile]       = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* AI thinking animation */
    const [visibleThoughts, setVisibleThoughts] = useState<string[]>([]);
    const thoughtTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (aiGenerating) {
            setVisibleThoughts([]);
            let idx = 0;
            thoughtTimer.current = setInterval(() => {
                if (idx < THOUGHTS.length) {
                    setVisibleThoughts(p => [...p, THOUGHTS[idx]]);
                    idx++;
                } else {
                    if (thoughtTimer.current) clearInterval(thoughtTimer.current);
                }
            }, 780);
        } else {
            if (thoughtTimer.current) clearInterval(thoughtTimer.current);
            setVisibleThoughts([]);
        }
        return () => { if (thoughtTimer.current) clearInterval(thoughtTimer.current); };
    }, [aiGenerating]);

    const [typedPlaceholder, setTypedPlaceholder] = useState('');
    const twRef = useRef({ idx: 0, charIdx: 0, erasing: false });
    const twTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const tick = () => {
            const s = twRef.current;
            const full = PLACEHOLDERS[s.idx];
            if (!s.erasing) {
                const next = s.charIdx + 1;
                setTypedPlaceholder(full.slice(0, next));
                s.charIdx = next;
                twTimer.current = setTimeout(tick, next === full.length ? 2200 : 38);
                if (next === full.length) s.erasing = true;
            } else {
                const next = s.charIdx - 1;
                setTypedPlaceholder(full.slice(0, next));
                s.charIdx = next;
                if (next === 0) {
                    s.erasing = false;
                    s.idx = (s.idx + 1) % PLACEHOLDERS.length;
                    twTimer.current = setTimeout(tick, 350);
                } else {
                    twTimer.current = setTimeout(tick, 18);
                }
            }
        };
        twTimer.current = setTimeout(tick, 600);
        return () => { if (twTimer.current) clearTimeout(twTimer.current); };
    }, []);

    const toggleType = (t: QuestionType) =>
        setAiQTypes(p => p.includes(t) ? (p.length > 1 ? p.filter(x => x !== t) : p) : [...p, t]);

    const removeFile = () => {
        setAiFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        if (aiGenerating) return;
        onClose();
    };

    const handleGenerate = async () => {
        if (!aiPrompt.trim() || aiGenerating) return;
        setAiGenerating(true);
        try {
            const body = new FormData();
            body.append('prompt',     aiPrompt);
            body.append('count',      String(aiCount));
            body.append('difficulty', aiDifficulty);
            body.append('types',      JSON.stringify(aiQTypes));
            if (aiFile) body.append('file', aiFile);

            const res  = await fetch('/api/generate-exam', { method: 'POST', body });
            const data = await res.json();

            if (!res.ok) {
                console.error('Generate exam error:', data);
                return;
            }

            if (data.questions && Array.isArray(data.questions)) {
                onQuestionsGenerated(data.questions as Omit<Question, 'id' | 'order'>[]);
                /* reset prompt & file, keep settings for follow-up calls */
                setAiPrompt('');
                removeFile();
                onClose();
            }
        } catch (e) {
            console.error('AI generate error:', e);
        } finally {
            setAiGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && handleClose()}>
            <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                    <DialogTitle className="text-sm font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#4b3fe9]" />
                        Your Questions - by <span className="italic">AI</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-gray-400 mt-0.5">
                        Describe your topic and Gemini will generate questions for you.
                    </DialogDescription>
                </div>

                {/* Body — switches to thinking view while generating */}
                {aiGenerating ? (
                    <div className="px-5 pt-6 pb-7 flex flex-col items-center min-h-75">

                        {/* Pulsing Gemini icon */}
                        <div className="relative mb-4">
                            <span className="absolute inset-0 rounded-full bg-indigo-300 opacity-20 animate-ping" />
                            <span className="absolute -inset-1.5 rounded-full bg-indigo-200 opacity-10 animate-ping [animation-delay:300ms]" />
                            <Image
                                src="/gemini-icon.png"
                                alt="Gemini thinking"
                                width={40}
                                height={40}
                                className="relative z-10 drop-shadow-sm"
                            />
                        </div>

                        {/* Label */}
                        <p className="text-xs font-semibold text-[#4b3fe9] tracking-wide mb-5 select-none">
                            Gemini is thinking
                            <span className="inline-flex gap-0.5 ml-1">
                                {[0, 1, 2].map(i => (
                                    <span
                                        key={i}
                                        className="inline-block w-1 h-1 rounded-full bg-[#4b3fe9] animate-bounce"
                                        style={{ animationDelay: `${i * 160}ms` }}
                                    />
                                ))}
                            </span>
                        </p>

                        {/* Thought lines */}
                        <div className="w-full space-y-2.5">
                            {visibleThoughts.map((thought, i) => {
                                const isLatest = i === visibleThoughts.length - 1;
                                const allDone  = visibleThoughts.length === THOUGHTS.length;
                                return (
                                    <div
                                        key={i}
                                        className="flex items-start gap-2.5 animate-thought-in"
                                    >
                                        {/* Dot indicator */}
                                        <span className={cn(
                                            'mt-1.25 w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-500',
                                            isLatest && !allDone
                                                ? 'bg-[#4b3fe9] animate-pulse'
                                                : 'bg-indigo-200',
                                        )} />
                                        {/* Checkmark when all done */}
                                        <span className={cn(
                                            'text-sm leading-snug transition-colors duration-500',
                                            isLatest && !allDone
                                                ? 'text-gray-800 font-medium'
                                                : 'text-gray-400',
                                        )}>
                                            {thought}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* Final "ready" line after all thoughts surfaced */}
                            {visibleThoughts.length === THOUGHTS.length && (
                                <div className="flex items-center gap-2 animate-thought-in pt-1">
                                    <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                        <svg className="w-2.5 h-2.5 text-emerald-600" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </span>
                                    <span className="text-sm font-semibold text-emerald-700">Preparing your questions…</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="px-5 pt-4 pb-5 space-y-4">

                    {/* ── Gemini branded input card ── */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                        {/* Prompt textarea — custom typewriter placeholder overlay */}
                        <div className="relative">
                            <textarea
                                id="ai-prompt"
                                aria-label="Exam topic or instructions"
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
                                }}
                                rows={4}
                                className={cn(
                                    'w-full bg-transparent text-sm px-3 pt-3 pb-2 resize-none focus:outline-none text-gray-800',
                                    !aiPrompt && 'caret-transparent',
                                )}
                            />
                            {/* Typewriter overlay — visible only when no text entered */}
                            {!aiPrompt && (
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute top-0 left-0 w-full px-3 pt-3 pb-2 text-sm text-gray-400 leading-normal select-none"
                                >
                                    {typedPlaceholder}
                                    <span className="inline-block w-[1.5px] h-[1em] bg-gray-400 ml-px align-[-1px] animate-blink" />
                                </div>
                            )}
                        </div>

                        {/* Bottom toolbar: model identity | attach */}
                        <div className="flex items-center px-2 pb-2 pt-1 border-t border-gray-200">
                            {/* Left: Gemini icon + model name */}
                            <div className="flex items-center gap-1.5">
                                <Image
                                    src="/gemini-icon.png"
                                    alt="Gemini"
                                    width={16}
                                    height={16}
                                    className="shrink-0"
                                />
                                <span className="text-[11px] font-semibold text-gray-500 tracking-wide select-none">
                                    Gemini-2.5-Flash
                                </span>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-4 bg-gray-300 mx-1.5 shrink-0" aria-hidden="true" />

                            {/* Attach controls */}
                            <div className="flex items-center gap-1">
                                <input
                                    ref={fileInputRef}
                                    id="ai-file-input"
                                    type="file"
                                    accept=".pdf,.csv,.docx,.png,.jpg,.jpeg,.webp"
                                    aria-label="Attach a PDF or image for context"
                                    className="hidden"
                                    onChange={e => setAiFile(e.target.files?.[0] ?? null)}
                                />
                                {/* Filename chip (shown when file selected) */}
                                {aiFile && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-medium max-w-35">
                                        <span className="truncate">
                                            {aiFile.name.slice(0, 18) + (aiFile.name.length > 18 ? '…' : '')}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label="Remove attachment"
                                            onClick={removeFile}
                                            className="shrink-0 text-indigo-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                                {/* Paperclip trigger */}
                                <button
                                    type="button"
                                    aria-controls="ai-file-input"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Attach a PDF or image for context"
                                    className={cn(
                                        'p-1.5 rounded-lg transition-all',
                                        aiFile
                                            ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200',
                                    )}
                                >
                                    <Paperclip className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Settings row ── */}
                    <div className="grid grid-cols-3 gap-3">
                        {/* Count */}
                        <div>
                            <label
                                htmlFor="ai-count"
                                className="text-[11px] font-medium text-gray-500 block mb-1"
                            >
                                Questions
                            </label>
                            <Input
                                id="ai-count"
                                type="number" min={1} max={50} value={aiCount}
                                onChange={e => setAiCount(Math.min(50, Math.max(1, +e.target.value)))}
                                className="h-8 text-xs border-gray-200 bg-gray-50 rounded-lg text-black"
                            />
                        </div>

                        {/* Difficulty — button group */}
                        <div>
                            <p className="text-[11px] font-medium text-gray-500 block mb-1">Difficulty</p>
                            <div className="flex rounded-lg border border-gray-200 bg-gray-50 overflow-hidden h-8">
                                {(['easy', 'mixed', 'hard'] as const).map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setAiDifficulty(d)}
                                        className={cn(
                                            'flex-1 text-[10px] font-semibold capitalize transition-all',
                                            aiDifficulty === d
                                                ? 'bg-[#4b3fe9] text-white'
                                                : 'text-gray-400 hover:text-gray-600',
                                        )}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Question types — button group, use <p> not <label> */}
                        <div>
                            <p className="text-[11px] font-medium text-gray-500 block mb-1">Types</p>
                            <div className="flex flex-wrap gap-1">
                                {(Object.entries(Q_LABEL) as [QuestionType, string][]).map(([t, lbl]) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => toggleType(t)}
                                        className={cn(
                                            'px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all',
                                            aiQTypes.includes(t)
                                                ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                                : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300',
                                        )}
                                    >
                                        {lbl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Generate button ── */}
                    <Button
                        onClick={handleGenerate}
                        disabled={!aiPrompt.trim() || aiGenerating}
                        className="w-full h-10 text-sm bg-[#4b3fe9] hover:bg-[#3228d4] text-white font-semibold"
                    >
                        {aiGenerating ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                        ) : (
                            <><Sparkles className="w-4 h-4 mr-2" />Generate {aiCount} Question{aiCount !== 1 ? 's' : ''}</>
                        )}
                    </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
