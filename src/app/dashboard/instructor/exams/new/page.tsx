'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    ChevronRight, Plus, Eye,
    Trash2, BookOpen, CalendarDays, Clock,
    Users, ShieldCheck, Save, Rocket,
    Wand2, AlertTriangle, Loader2, Image as ImageIcon, GraduationCap,
} from 'lucide-react';
import { CoverImagePicker } from '@/components/shared/CoverImagePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Question, QuestionType, Difficulty } from '@/lib/types';
import QuestionEditor from '@/components/exam-builder/QuestionEditor';
import QuestionTypeModal from '@/components/exam-builder/QuestionTypeModal';
import PreviewPanel from '@/components/exam-builder/PreviewPanel';
import AiGenerateModal from '@/components/exam-builder/AiGenerateModal';
import { createClient } from '@/lib/supabase/client';
import {
    DndContext, closestCenter, PointerSensor,
    useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy,
    useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

type CourseOption = { id: string; name: string; code: string | null };

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const DIFF_COLOR: Record<string, string> = {
    easy:   'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100   text-amber-700',
    hard:   'bg-red-100     text-red-600',
};

const Q_LABEL: Record<QuestionType, string> = {
    multiple_choice: 'MCQ',
    checkbox:        'Multi',
    fill_blank:      'Fill',
    true_false:      'T/F',
    matching:        'Match',
    reorder:         'Order',
};

function makeQuestion(type: QuestionType, order: number): Question {
    const base = {
        id: crypto.randomUUID(),
        text: '',
        points: 1,
        difficulty: 'medium' as Difficulty,
        partial_credit: false,
        negative_marking: false,
        order,
    };
    switch (type) {
        case 'multiple_choice':
            return { ...base, type, options: ['Option A', 'Option B', 'Option C', 'Option D'], correct_option: 0 };
        case 'checkbox':
            return { ...base, type, options: ['Option A', 'Option B', 'Option C', 'Option D'], correct_options: [0] };
        case 'true_false':
            return { ...base, type, correct_answer: true };
        case 'fill_blank':
            return { ...base, type, answer_regex: '.*', sample_answer: '' };
        case 'matching':
            return { ...base, type, pairs: [{ left: '', right: '' }, { left: '', right: '' }] };
        case 'reorder':
            return { ...base, type, items: ['', ''], correct_order: [0, 1] };
    }
}

const PROCTORING_OPTS = [
    { id: 'faceid',     label: 'Face ID check',       desc: 'Verify student identity at start' },
    { id: 'tabswitch',  label: 'Tab-switch detection', desc: 'Flag browser focus changes' },
    { id: 'device_detection', label: 'Electronic device detection', desc: 'Detect unauthorized electronic devices in view' },
    { id: 'copy',       label: 'Copy/paste disabled',  desc: 'Block clipboard access' },
];

/* ─── Sortable question card ─────────────────────────────────────────────── */
function SortableQuestionCard({
    q, i, selectedIdx, onSelect, onDelete,
}: {
    q: Question; i: number; selectedIdx: number | null;
    onSelect: (i: number) => void; onDelete: (i: number) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: q.id });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(i)}
            onKeyDown={e => e.key === 'Enter' && onSelect(i)}
            className={cn(
                'group w-full text-left rounded-lg border px-3 py-2.5 transition-all cursor-pointer',
                selectedIdx === i
                    ? 'border-[#4b3fe9]/40 bg-indigo-50/60 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300',
            )}
        >
            <div className="flex items-start justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5">
                    {/* drag handle */}
                    <span
                        {...attributes}
                        {...listeners}
                        onClick={e => e.stopPropagation()}
                        className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
                    >
                        ⠿
                    </span>
                    <span className="text-[11px] font-semibold text-gray-400">Q{i + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Badge className={cn('text-[9px] px-1.5 py-0 border-0 font-medium', DIFF_COLOR[q.difficulty])}>
                        {q.difficulty}
                    </Badge>
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(i); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2 leading-tight">
                {q.text || <span className="text-gray-300 italic">No text yet</span>}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-semibold text-[#4b3fe9]">{Q_LABEL[q.type]}</span>
                <span className="text-[10px] text-gray-400">{q.points}pt</span>
            </div>
        </div>
    );
}

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.36, delay, ease: 'easeOut' as const },
});

/* ─── page ────────────────────────────────────────────────────────────────── */

export default function NewExamPage() {
    const router = useRouter();

    /* tabs */
    const [tab, setTab] = useState<'build' | 'preview'>('build');

    /* basic info */
    const [title,       setTitle]       = useState('');
    const [course,      setCourse]      = useState('');
    const [description, setDescription] = useState('');

    /* schedule */
    const [date,         setDate]         = useState('');
    const [time,         setTime]         = useState('');
    const [duration,     setDuration]     = useState(60);
    const [passingScore, setPassingScore] = useState(50);
    const [maxStudents,  setMaxStudents]  = useState('');
    const [allowReview,  setAllowReview]  = useState(true);

    /* proctoring */
    const proctoringRules = PROCTORING_OPTS.map(opt => opt.id);

    /* questions */
    const [questions,     setQuestions]     = useState<Question[]>([]);
    const [selectedIdx,   setSelectedIdx]   = useState<number | null>(null);
    const [showTypeModal,  setShowTypeModal]  = useState(false);
    const [savingDraft,   setSavingDraft]   = useState(false);
    const [savingPublish, setSavingPublish] = useState(false);

    /* delete confirm */
    const [deleteTargetIdx, setDeleteTargetIdx] = useState<number | null>(null);

    /* AI generate */
    const [showAiModal, setShowAiModal] = useState(false);

    /* publish modal */
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [courses,          setCourses]          = useState<CourseOption[]>([]);
    const [selectedCourse,   setSelectedCourse]   = useState('');
    const [publishing,       setPublishing]        = useState(false);
    const [publishOk,        setPublishOk]         = useState<string | null>(null);
    const [newExamId,        setNewExamId]         = useState<string | null>(null);

    /* cover image */
    const [coverImageUrl,   setCoverImageUrl]   = useState<string | null>(null);
    const [showCoverPicker, setShowCoverPicker] = useState(false);
    const [userId,          setUserId]          = useState<string | null>(null);

    /* save error */
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleAiQuestionsGenerated = (rawQs: Omit<Question, 'id' | 'order'>[]) => {
        const newQs = rawQs.map((q, i) => ({
            ...makeQuestion(q.type as QuestionType, questions.length + i),
            ...q,
            id:    crypto.randomUUID(),
            order: questions.length + i,
        })) as Question[];
        setQuestions(p => [...p, ...newQs]);
    };

    const selectedQ = selectedIdx !== null ? questions[selectedIdx] : null;

    const handleSelectType = (type: QuestionType) => {
        const q = makeQuestion(type, questions.length);
        setQuestions(p => [...p, q]);
        setSelectedIdx(questions.length);
        setShowTypeModal(false);
    };

    const handleUpdateQ = (q: Question) =>
        setQuestions(p => p.map((old, i) => i === selectedIdx ? q : old));

    const handleDeleteQ = (idx: number) => {
        setQuestions(p => p.filter((_, i) => i !== idx));
        setSelectedIdx(prev =>
            prev === null     ? null
            : prev === idx    ? (questions.length > 1 ? Math.max(0, idx - 1) : null)
            : prev > idx      ? prev - 1
            : prev
        );
    };

    const totalPoints   = questions.reduce((s, q) => s + q.points, 0);
    const previewConfig = { title, description, duration, passing_score: passingScore, allow_review: allowReview };

    const handleSave = async (isDraft: boolean) => {
        if (isDraft) setSavingDraft(true); else setSavingPublish(true);
        setSaveError(null);
        try {
            const supabase = createClient();
            const { data: { user }, error: authErr } = await supabase.auth.getUser();
            if (authErr || !user) throw new Error('Not authenticated. Please log in again.');
            setUserId(user.id);

            const scheduled_at = date && time
                ? new Date(`${date}T${time}`).toISOString()
                : null;

            const examStatus = isDraft
                ? 'draft'
                : (scheduled_at && new Date(scheduled_at) > new Date() ? 'scheduled' : 'active');

            // Insert exam row
            const { data: exam, error: examErr } = await supabase
                .from('exams')
                .insert({
                    instructor_id:    user.id,
                    title,
                    description:      description || null,
                    course:           course || null,
                    status:           examStatus,
                    duration,
                    passing_score:    passingScore,
                    allow_review:     allowReview,
                    scheduled_at,
                    proctoring_rules: proctoringRules,
                    cover_image_url:  coverImageUrl || null,
                })
                .select('id')
                .single();

            if (examErr) throw new Error(examErr.message);

            // Upload any blob: media URLs to storage bucket then insert questions
            if (questions.length > 0) {
                const rows = await Promise.all(questions.map(async q => {
                    let mediaUrl = (q as { media_url?: string }).media_url ?? null;
                    const mediaType = (q as { media_type?: string }).media_type ?? null;

                    // If the URL is a local blob (picked by file input), upload it
                    if (mediaUrl?.startsWith('blob:')) {
                        try {
                            const blob = await fetch(mediaUrl).then(r => r.blob());
                            const ext  = blob.type.split('/')[1] ?? 'bin';
                            const path = `${user.id}/${exam.id}/${q.id}.${ext}`;
                            const { data: up, error: upErr } = await supabase.storage
                                .from('question-media')
                                .upload(path, blob, { upsert: true, contentType: blob.type });
                            if (!upErr && up) {
                                const { data: { publicUrl } } = supabase.storage
                                    .from('question-media')
                                    .getPublicUrl(path);
                                mediaUrl = publicUrl;
                            }
                        } catch { /* skip failed uploads silently */ }
                    }

                    const { id: _id, type, text, points, difficulty,
                            partial_credit, negative_marking, order, ...rest } = q as Question & {
                                media_url?: string; media_type?: string;
                            };
                    // Strip media fields from rest so they don't duplicate in answer_data
                    const { media_url: _mu, media_type: _mt, ...answerData } = rest as {
                        media_url?: string; media_type?: string; [k: string]: unknown;
                    };

                    return {
                        exam_id: exam.id,
                        type, text, points, difficulty,
                        partial_credit, negative_marking, order,
                        media_url:   mediaUrl,
                        media_type:  mediaType,
                        answer_data: answerData,
                    };
                }));

                const { error: qErr } = await supabase.from('questions').insert(rows);
                if (qErr) throw new Error(qErr.message);
            }

            if (isDraft) {
                router.push('/dashboard/instructor/exams');
            } else {
                // Fetch courses then open publish modal
                const { data } = await supabase
                    .from('courses')
                    .select('id, name, code')
                    .eq('instructor_id', user.id)
                    .order('created_at', { ascending: false });
                setCourses((data ?? []) as CourseOption[]);
                setSelectedCourse('');
                setPublishOk(null);
                setNewExamId(exam.id);
                setSavingPublish(false);
                setShowPublishModal(true);
            }
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Save failed. Please try again.');
            if (isDraft) setSavingDraft(false); else setSavingPublish(false);
        }
    };

    const handlePublish = async () => {
        if (!selectedCourse || !newExamId) return;
        setPublishing(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setPublishing(false); return; }
        const res = await fetch(
            `${BACKEND}/api/v1/courses/${encodeURIComponent(selectedCourse)}/publish-exam?instructor_id=${encodeURIComponent(user.id)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exam_id: newExamId, instructor_id: user.id }),
            }
        );
        const json = await res.json();
        setPublishing(false);
        if (!res.ok) { setPublishOk(`✗ ${json.detail ?? 'Publish failed'}`); return; }
        setPublishOk(`✓ Published — Students notified`);
    };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = questions.findIndex(q => q.id === active.id);
        const newIdx = questions.findIndex(q => q.id === over.id);
        const reordered = arrayMove(questions, oldIdx, newIdx).map((q, i) => ({ ...q, order: i }));
        setQuestions(reordered);
        if (selectedIdx === oldIdx) setSelectedIdx(newIdx);
        else if (selectedIdx !== null) {
            if (oldIdx < selectedIdx && newIdx >= selectedIdx) setSelectedIdx(selectedIdx - 1);
            else if (oldIdx > selectedIdx && newIdx <= selectedIdx) setSelectedIdx(selectedIdx + 1);
        }
    };

    /* ── render ─────────────────────────────────────────────────────────── */
    return (
        <div className="instructor-home">

            {/* Header */}
            <motion.div {...fadeUp(0)} className="instructor-home__header mb-4">
                <div>
                    <p className="instructor-home__breadcrumb">
                        <span>My Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <Link href="/dashboard/instructor/exams" className="hover:text-indigo-600 transition-colors">
                            Exams
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="font-semibold text-gray-900">New Exam</span>
                    </p>
                    <h1 className="instructor-home__title">{title || 'New Exam'}</h1>
                </div>
                <div className="flex items-center gap-2">
                    {/* Build / Preview toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5 border border-gray-400">
                        {(['build', 'preview'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all',
                                    tab === t
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700',
                                )}
                            >
                                {t === 'preview' && <Eye className="w-3.5 h-3.5" />}
                                {t === 'build' ? 'Build' : 'Preview'}
                            </button>
                        ))}
                    </div>

                    {/* AI Generate */}
                    <Button
                        onClick={() => setShowAiModal(true)}
                        className="h-9 text-xs bg-[#4b3fe9] hover:bg-[#3228d4] text-white gap-1.5"
                    >
                        <Wand2 className="w-3.5 h-3.5" />
                        AI Generate
                    </Button>

                    {/* Save actions */}
                    <Button
                        onClick={() => handleSave(true)}
                        disabled={savingDraft || savingPublish}
                        className="h-9 text-xs bg-[#4b3fe9] hover:bg-[#3228d4] text-white"
                    >
                        {savingDraft
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving…</>
                            : <><Save className="w-3.5 h-3.5 mr-1.5" /> Save as Draft</>}
                    </Button>
                    <Button
                        disabled={!title || !course || savingDraft || savingPublish}
                        onClick={() => handleSave(false)}
                        className="h-9 text-xs bg-[#4b3fe9] hover:bg-[#3228d4] text-white"
                    >
                        {savingPublish
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving…</>
                            : <><Rocket className="w-3.5 h-3.5 mr-1.5" /> Publish Exam</>}
                    </Button>
                </div>
            </motion.div>

            {/* Save error */}
            {saveError && (
                <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {saveError}
                </div>
            )}

            {/* ── Preview tab ──────────────────────────────────────────────── */}
            {tab === 'preview' ? (
                <motion.div
                    key="preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl overflow-hidden border border-gray-200"
                    style={{ minHeight: 'calc(100vh - 200px)' }}
                >
                    <PreviewPanel questions={questions} settings={previewConfig} />
                </motion.div>

            /* ── Build tab ───────────────────────────────────────────────── */
            ) : (
                <motion.div
                    key="build"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4"
                    style={{ height: 'calc(100vh - 185px)' }}
                >
                    {/* ── Col 1: Question list ── */}
                    <div className="w-56 shrink-0 flex flex-col gap-2">
                        <Button
                            onClick={() => setShowTypeModal(true)}
                            className="w-full h-9 text-xs font-semibold bg-[#4b3fe9] hover:bg-[#3228d4] text-white shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Question
                        </Button>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-px">
                                    {questions.length === 0 && (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                                            <p className="text-3xl mb-2">📋</p>
                                            <p className="text-xs font-medium text-gray-400">No questions yet</p>
                                            <p className="text-[11px] text-gray-300 mt-1">Click above to add one</p>
                                        </div>
                                    )}
                                    {questions.map((q, i) => (
                                        <SortableQuestionCard
                                            key={q.id}
                                            q={q}
                                            i={i}
                                            selectedIdx={selectedIdx}
                                            onSelect={setSelectedIdx}
                                            onDelete={(i) => setDeleteTargetIdx(i)}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>

                        {questions.length > 0 && (
                            <div className="shrink-0 bg-white border border-gray-100 rounded-lg px-3 py-2 flex justify-between text-xs text-gray-500">
                                <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
                                <span className="font-semibold text-gray-700">{totalPoints} pts</span>
                            </div>
                        )}
                    </div>

                    {/* ── Col 2: Question editor ── */}
                    <div className="flex-1 min-w-0 overflow-y-auto bg-white rounded-xl border border-gray-200">
                        {selectedQ ? (
                            <QuestionEditor question={selectedQ} onChange={handleUpdateQ} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                <p className="text-5xl mb-4">✏️</p>
                                <p className="text-sm font-medium text-gray-400">No question selected</p>
                                <p className="text-xs text-gray-300 mt-1">Add a question or pick one from the list</p>
                                <Button
                                    onClick={() => setShowTypeModal(true)}
                                    variant="outline"
                                    className="mt-5 text-xs border-dashed text-gray-500"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add first question
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* ── Col 3: Settings sidebar ── */}
                    <div className="w-72 shrink-0 overflow-y-auto flex flex-col gap-3">

                        {/* Basic Info */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Essentials
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[11px] font-medium text-gray-500 block mb-1">Exam Title *</label>
                                    <Input value={title} onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. Midterm — CS402"
                                        className="h-8 text-xs border-gray-200 bg-gray-50 rounded-lg" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-medium text-gray-500 block mb-1">Course Code *</label>
                                    <Input value={course} onChange={e => setCourse(e.target.value)}
                                        placeholder="e.g. CS402"
                                        className="h-8 text-xs border-gray-200 bg-gray-50 rounded-lg" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-medium text-gray-500 block mb-1">Instructions</label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Shown to students before the exam starts…"
                                        rows={3}
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 text-xs px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                    />
                                </div>
                                {/* Cover Image */}
                                <div>
                                    <label className="text-[11px] font-medium text-gray-500 block mb-1">Cover Image</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowCoverPicker(true)}
                                        className={cn(
                                            'w-full h-20 rounded-lg border-2 border-dashed overflow-hidden transition-all group relative',
                                            coverImageUrl ? 'border-transparent' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                                        )}
                                    >
                                        {coverImageUrl
                                            ? <img src={coverImageUrl} alt="cover" className="w-full h-full object-cover" />
                                            : (
                                                <div className="flex flex-col items-center justify-center h-full gap-1 text-gray-400 group-hover:text-indigo-500 transition-colors">
                                                    <ImageIcon className="w-4 h-4" />
                                                    <p className="text-[11px] font-medium">Add cover image</p>
                                                </div>
                                            )}
                                        {coverImageUrl && (
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-[11px] font-semibold text-white">Change</p>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Schedule & Duration */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 text-indigo-400" /> Schedule & Duration
                            </h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px] font-medium text-gray-500 block mb-1">Date</label>
                                        <Input type="date" value={date} onChange={e => setDate(e.target.value)}
                                            className="h-8 text-xs border-gray-200 bg-gray-50 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-medium text-gray-500 block mb-1">Time</label>
                                        <Input type="time" value={time} onChange={e => setTime(e.target.value)}
                                            className="h-8 text-xs border-gray-200 bg-gray-50 rounded-lg" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px] font-medium text-gray-500 block mb-1">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Duration (min)</span>
                                        </label>
                                        <Input type="number" min={5} value={duration}
                                            onChange={e => setDuration(Math.max(5, +e.target.value))}
                                            className="h-8 text-xs border-gray-200 bg-gray-50 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-medium text-gray-500 block mb-1">Pass score (%)</label>
                                        <Input type="number" min={0} max={100} value={passingScore}
                                            onChange={e => setPassingScore(Math.max(0, Math.min(100, +e.target.value)))}
                                            className="h-8 text-xs border-gray-200 bg-gray-50 rounded-lg" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] font-medium text-gray-500 block mb-1">
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Max Students</span>
                                    </label>
                                    <Input type="number" min={1} value={maxStudents}
                                        onChange={e => setMaxStudents(e.target.value)}
                                        placeholder="Unlimited"
                                        className="h-8 text-xs border-gray-200 bg-gray-50 rounded-lg" />
                                </div>
                                <div className="flex items-center justify-between pt-0.5">
                                    <div>
                                        <p className="text-xs font-medium text-gray-700">Allow result review</p>
                                        <p className="text-[11px] text-gray-400">Students see answers after submit</p>
                                    </div>
                                    <Switch checked={allowReview} onCheckedChange={setAllowReview} />
                                </div>
                            </div>
                        </div>

                        {/* Proctoring */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Proctoring
                            </h3>
                            <div className="space-y-2.5">
                                {PROCTORING_OPTS.map(opt => (
                                    <div key={opt.id} className="flex items-start gap-2.5">
                                        <div>
                                            <p className="text-xs font-medium text-gray-800">
                                                {opt.label}
                                            </p>
                                            <p className="text-[11px] text-gray-400">{opt.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                            <div className="grid grid-cols-2 gap-y-2 text-xs">
                                <span className="text-gray-400">Questions</span>
                                <span className="font-semibold text-gray-800 text-right">{questions.length}</span>
                                <span className="text-gray-400">Total pts</span>
                                <span className="font-semibold text-gray-800 text-right">{totalPoints}</span>
                                <span className="text-gray-400">Duration</span>
                                <span className="font-semibold text-gray-800 text-right">{duration} min</span>
                                <span className="text-gray-400">Pass score</span>
                                <span className="font-semibold text-gray-800 text-right">{passingScore}%</span>
                                <span className="text-gray-400">Proctoring</span>
                                <span className="font-semibold text-gray-800 text-right">{proctoringRules.length} rules</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            <QuestionTypeModal
                open={showTypeModal}
                onClose={() => setShowTypeModal(false)}
                onSelect={handleSelectType}
            />

            {/* ── Delete confirm dialog ─────────────────────────────────── */}
            <Dialog open={deleteTargetIdx !== null} onOpenChange={open => !open && setDeleteTargetIdx(null)}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            Delete Question?
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 mt-1">
                            Q{deleteTargetIdx !== null ? deleteTargetIdx + 1 : ''}: &ldquo;
                            {deleteTargetIdx !== null && questions[deleteTargetIdx]?.text
                                ? questions[deleteTargetIdx].text.slice(0, 80) + (questions[deleteTargetIdx].text.length > 80 ? '…' : '')
                                : 'No text yet'}
                            &rdquo;
                            <br />
                            <span className="mt-2 block text-xs text-gray-400">This cannot be undone.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-4">
                        <Button variant="outline" className="text-xs h-9" onClick={() => setDeleteTargetIdx(null)}>
                            Cancel
                        </Button>
                        <Button
                            className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => {
                                if (deleteTargetIdx !== null) {
                                    handleDeleteQ(deleteTargetIdx);
                                    setDeleteTargetIdx(null);
                                }
                            }}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AiGenerateModal
                open={showAiModal}
                onClose={() => setShowAiModal(false)}
                onQuestionsGenerated={handleAiQuestionsGenerated}
            />

            {/* ── Publish modal ─────────────────────────────────────────── */}
            <Dialog open={showPublishModal} onOpenChange={open => {
                if (!open) { setShowPublishModal(false); setPublishOk(null); router.push('/dashboard/instructor/exams'); }
            }}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-indigo-500" /> Publish Exam
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 mt-1">
                            Exam created. Select a course to notify enrolled students.
                        </DialogDescription>
                    </DialogHeader>

                    {publishOk ? (
                        <div className={cn(
                            'rounded-xl px-4 py-3 text-sm font-medium mb-2',
                            publishOk.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                        )}>
                            {publishOk}
                        </div>
                    ) : (
                        <div className="py-2">
                            {courses.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">
                                    No courses yet. <a href="/dashboard/instructor/courses" className="text-indigo-500 underline">Create one first.</a>
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                        <GraduationCap className="w-3.5 h-3.5" /> Course
                                    </label>
                                    <select
                                        value={selectedCourse}
                                        onChange={e => setSelectedCourse(e.target.value)}
                                        className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    >
                                        <option value="">Select a course…</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.code ? `[${c.code}] ` : ''}{c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" className="text-xs h-9" onClick={() => {
                            setShowPublishModal(false);
                            setPublishOk(null);
                            router.push('/dashboard/instructor/exams');
                        }}>
                            {publishOk ? 'Done' : 'Skip'}
                        </Button>
                        {!publishOk && (
                            <Button
                                className="text-xs h-9 bg-[#4b3fe9] hover:bg-[#3228d4] text-white gap-1.5"
                                onClick={handlePublish}
                                disabled={!selectedCourse || publishing}
                            >
                                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                                Publish &amp; Notify
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CoverImagePicker
                open={showCoverPicker}
                onClose={() => setShowCoverPicker(false)}
                onSelect={url => setCoverImageUrl(url)}
                bucket="exam-covers"
                userId={userId}
                title="Choose Exam Cover"
            />
        </div>
    );
}
