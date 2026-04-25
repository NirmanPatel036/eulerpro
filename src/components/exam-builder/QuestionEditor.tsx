'use client';

import { useState } from 'react';
import { Plus, Trash2, Check, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    Question, QuestionType, Difficulty,
    MultipleChoiceQuestion, CheckboxQuestion, FillBlankQuestion,
    TrueFalseQuestion, MatchingQuestion, ReorderQuestion,
} from '@/lib/types';
import MediaUpload from './MediaUpload';
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import MathText from '@/components/shared/MathText';

// ─── Option row for MCQ/Checkbox ──────────────────────────────────────────────
function OptionRow({
    id, value, isCorrect, isCheckbox, onChange, onDelete, onToggle, canDelete,
}: {
    id: string; value: string; isCorrect: boolean; isCheckbox: boolean;
    onChange: (v: string) => void; onDelete: () => void;
    onToggle: () => void; canDelete: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    return (
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
            className="flex items-center gap-2 group"
        >
            <button {...attributes} {...listeners} className="cursor-grab text-gray-200 hover:text-gray-400">
                <GripVertical className="w-3.5 h-3.5" />
            </button>
            <button onClick={onToggle}
                className={`w-5 h-5 shrink-0 ${isCheckbox ? 'rounded' : 'rounded-full'} border-2 flex items-center justify-center transition-all ${isCorrect ? 'border-[#4b3fe9] bg-[#4b3fe9]' : 'border-gray-200 hover:border-[#4b3fe9]/50'}`}
            >
                {isCorrect && <Check className="w-3 h-3 text-white" />}
            </button>
            <div className="flex-1 flex flex-col gap-1">
                <Input value={value} onChange={e => onChange(e.target.value)}
                    className="h-8 text-sm text-gray-900 border-gray-200 rounded-lg" />
                {value.includes('$') && (
                    <div className="px-2 py-1 bg-gray-50/50 border border-gray-100 rounded-md text-[11px] text-gray-600">
                        <MathText text={value} />
                    </div>
                )}
            </div>
            {canDelete && (
                <button onClick={onDelete}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

// ─── Per-question config sidebar ──────────────────────────────────────────────
function QuestionConfig({ question, onChange }: { question: Question; onChange: (q: Question) => void }) {
    return (
        <div className="space-y-4 pt-4">
            <Separator />
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">Points (1–10)</Label>
                    <Input type="number" min={1} max={10} value={question.points}
                        onChange={e => onChange({ ...question, points: Math.max(1, Math.min(10, +e.target.value)) })}
                        className="h-8 text-sm text-gray-900 border-gray-200 rounded-lg" />
                </div>
                <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">Difficulty</Label>
                    <Select value={question.difficulty}
                        onValueChange={v => onChange({ ...question, difficulty: v as Difficulty })}>
                        <SelectTrigger className="h-8 text-sm text-gray-900 border-gray-200 rounded-lg">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="easy">Easy (×0.8)</SelectItem>
                            <SelectItem value="medium">Medium (×1.0)</SelectItem>
                            <SelectItem value="hard">Hard (×1.5)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center justify-between py-1">
                <div>
                    <p className="text-sm font-medium text-gray-700">Partial credit</p>
                    <p className="text-xs text-gray-400">Award 50% for partially correct answers</p>
                </div>
                <Switch checked={question.partial_credit}
                    onCheckedChange={v => onChange({ ...question, partial_credit: v })} />
            </div>
            <div className="flex items-center justify-between py-1">
                <div>
                    <p className="text-sm font-medium text-gray-700">Negative marking</p>
                    <p className="text-xs text-gray-400">Deduct 25% for wrong answers</p>
                </div>
                <Switch checked={question.negative_marking}
                    onCheckedChange={v => onChange({ ...question, negative_marking: v })} />
            </div>
        </div>
    );
}

// ─── Main QuestionEditor ───────────────────────────────────────────────────────
interface Props { question: Question; onChange: (q: Question) => void; }

export default function QuestionEditor({ question, onChange }: Props) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    const handleMedia = (url: string, type: 'image' | 'video') =>
        onChange({ ...question, media_url: url, media_type: type });
    const handleRemoveMedia = () =>
        onChange({ ...question, media_url: undefined, media_type: undefined });

    const renderTypeEditor = () => {
        switch (question.type) {
            case 'multiple_choice':
            case 'checkbox': {
                const q = question as MultipleChoiceQuestion | CheckboxQuestion;
                const isCheckbox = q.type === 'checkbox';
                const optionIds = q.options.map((_, i) => `opt-${i}`);

                const handleDragEnd = (e: DragEndEvent) => {
                    const { active, over } = e;
                    if (!over || active.id === over.id) return;
                    const oldIdx = optionIds.indexOf(active.id as string);
                    const newIdx = optionIds.indexOf(over.id as string);
                    const newOpts = arrayMove(q.options, oldIdx, newIdx);
                    if (isCheckbox) {
                        const cq = q as CheckboxQuestion;
                        const newCorrect = cq.correct_options.map(ci => {
                            const moved = arrayMove(q.options.map((_, i) => i), oldIdx, newIdx);
                            return moved.indexOf(ci);
                        });
                        onChange({ ...cq, options: newOpts, correct_options: newCorrect });
                    } else {
                        const mq = q as MultipleChoiceQuestion;
                        const newCorrect = arrayMove(q.options.map((_, i) => i), oldIdx, newIdx).indexOf(mq.correct_option);
                        onChange({ ...mq, options: newOpts, correct_option: newCorrect });
                    }
                };

                return (
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500">
                            Options <span className="text-gray-300">· click circle to mark correct</span>
                        </Label>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={optionIds} strategy={verticalListSortingStrategy}>
                                {q.options.map((opt, i) => {
                                    const isCorrect = isCheckbox
                                        ? (q as CheckboxQuestion).correct_options.includes(i)
                                        : (q as MultipleChoiceQuestion).correct_option === i;
                                    return (
                                        <OptionRow key={`opt-${i}`} id={`opt-${i}`} value={opt} isCorrect={isCorrect}
                                            isCheckbox={isCheckbox} canDelete={q.options.length > 2}
                                            onChange={v => { const opts = [...q.options]; opts[i] = v; onChange({ ...q, options: opts } as Question); }}
                                            onDelete={() => {
                                                const opts = q.options.filter((_, j) => j !== i);
                                                if (isCheckbox) {
                                                    const cq = q as CheckboxQuestion;
                                                    const correct = cq.correct_options.filter(c => c !== i).map(c => c > i ? c - 1 : c);
                                                    onChange({ ...cq, options: opts, correct_options: correct.length ? correct : [0] });
                                                } else {
                                                    const mq = q as MultipleChoiceQuestion;
                                                    const correct = mq.correct_option >= i ? Math.max(0, mq.correct_option - 1) : mq.correct_option;
                                                    onChange({ ...mq, options: opts, correct_option: correct });
                                                }
                                            }}
                                            onToggle={() => {
                                                if (isCheckbox) {
                                                    const cq = q as CheckboxQuestion;
                                                    const correct = cq.correct_options.includes(i)
                                                        ? cq.correct_options.filter(c => c !== i)
                                                        : [...cq.correct_options, i];
                                                    onChange({ ...cq, correct_options: correct.length ? correct : [i] });
                                                } else {
                                                    onChange({ ...q as MultipleChoiceQuestion, correct_option: i });
                                                }
                                            }}
                                        />
                                    );
                                })}
                            </SortableContext>
                        </DndContext>
                        {q.options.length < 6 && (
                            <Button variant="outline" size="sm" onClick={() => onChange({ ...q, options: [...q.options, `Option ${String.fromCharCode(65 + q.options.length)}`] } as Question)}
                                className="text-white w-full rounded-lg text-xs font-semibold border-dashed mt-1">
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Option
                            </Button>
                        )}
                    </div>
                );
            }

            case 'true_false': {
                const q = question as TrueFalseQuestion;
                return (
                    <div className="flex gap-3">
                        {[true, false].map(val => (
                            <button key={String(val)} onClick={() => onChange({ ...q, correct_answer: val })}
                                className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${q.correct_answer === val
                                    ? 'border-[#4b3fe9] bg-[#4b3fe9]/8 text-[#4b3fe9]'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                {val ? '✓ True' : '✗ False'}
                            </button>
                        ))}
                    </div>
                );
            }

            case 'fill_blank': {
                const q = question as FillBlankQuestion;
                return (
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs text-gray-500 mb-1.5 block">Sample Answer</Label>
                            <Input value={q.sample_answer} placeholder="e.g. photosynthesis"
                                onChange={e => onChange({ ...q, sample_answer: e.target.value })}
                                className="h-9 text-sm text-gray-900 border-gray-200 rounded-lg" />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-500 mb-1.5 block">Regex Pattern (optional)</Label>
                            <Input value={q.answer_regex} placeholder="e.g. photo(synthesis)?"
                                onChange={e => onChange({ ...q, answer_regex: e.target.value })}
                                className="h-9 text-sm text-gray-900 border-gray-200 rounded-lg font-mono" />
                            <p className="text-xs text-gray-400 mt-1">Case-insensitive. Use .* to accept any text.</p>
                        </div>
                    </div>
                );
            }

            case 'matching': {
                const q = question as MatchingQuestion;
                return (
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Matching Pairs</Label>
                        {q.pairs.map((pair, i) => (
                            <div key={i} className="flex items-center gap-2 group">
                                <Input value={pair.left} placeholder="Left term"
                                    onChange={e => { const pairs = [...q.pairs]; pairs[i] = { ...pairs[i], left: e.target.value }; onChange({ ...q, pairs }); }}
                                    className="h-8 text-sm text-gray-900 border-gray-200 rounded-lg flex-1" />
                                <span className="text-gray-300 text-sm">→</span>
                                <Input value={pair.right} placeholder="Right match"
                                    onChange={e => { const pairs = [...q.pairs]; pairs[i] = { ...pairs[i], right: e.target.value }; onChange({ ...q, pairs }); }}
                                    className="h-8 text-sm text-gray-900 border-gray-200 rounded-lg flex-1" />
                                {q.pairs.length > 2 && (
                                    <button onClick={() => onChange({ ...q, pairs: q.pairs.filter((_, j) => j !== i) })}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {q.pairs.length < 6 && (
                            <Button variant="outline" size="sm"
                                onClick={() => onChange({ ...q, pairs: [...q.pairs, { left: '', right: '' }] })}
                                className="w-full rounded-lg text-xs font-semibold border-dashed">
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Pair
                            </Button>
                        )}
                    </div>
                );
            }

            case 'reorder': {
                const q = question as ReorderQuestion;
                return (
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Items (in correct order)</Label>
                        {q.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 group">
                                <span className="w-5 h-5 rounded-full bg-[#4b3fe9]/10 text-[#4b3fe9] text-xs flex items-center justify-center font-semibold shrink-0">{i + 1}</span>
                                <Input value={item} placeholder={`Item ${i + 1}`}
                                    onChange={e => { const items = [...q.items]; items[i] = e.target.value; onChange({ ...q, items, correct_order: q.correct_order }); }}
                                    className="h-8 text-sm text-gray-900 border-gray-200 rounded-lg flex-1" />
                                {q.items.length > 2 && (
                                    <button onClick={() => onChange({ ...q, items: q.items.filter((_, j) => j !== i), correct_order: q.items.map((_, k) => k).filter(k => k !== i).map((_, k) => k) })}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {q.items.length < 8 && (
                            <Button variant="outline" size="sm"
                                onClick={() => { const n = q.items.length; onChange({ ...q, items: [...q.items, ''], correct_order: [...q.correct_order, n] }); }}
                                className="w-full rounded-lg text-xs font-semibold border-dashed">
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Item
                            </Button>
                        )}
                    </div>
                );
            }
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-gray-500 block">Question Text</Label>
                    <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Render as code</Label>
                        <Switch
                            checked={question.render_as_code}
                            onCheckedChange={v => onChange({ ...question, render_as_code: v })}
                            className="scale-75 origin-right"
                        />
                    </div>
                </div>
                <Textarea
                    value={question.text}
                    onChange={e => onChange({ ...question, text: e.target.value })}
                    placeholder="Type your question here..."
                    className={cn(
                        "border-gray-200 rounded-xl text-sm text-gray-900 resize-none min-h-[80px]",
                        question.render_as_code && "font-mono bg-slate-50 text-[13px]"
                    )}
                />
                {question.text.includes('$') && !question.render_as_code && (
                    <div className="mt-2 p-3 bg-indigo-50/30 border border-indigo-100/50 rounded-xl">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-indigo-400" />
                            Math Preview
                        </p>
                        <div className="text-sm text-gray-800 leading-relaxed">
                            <MathText text={question.text} />
                        </div>
                    </div>
                )}
            </div>

            {/* Media upload */}
            <div className="mb-5">
                <Label className="text-xs text-gray-500 mb-2 block">Media (optional)</Label>
                <MediaUpload
                    value={question.media_url}
                    mediaType={question.media_type}
                    onChange={handleMedia}
                    onRemove={handleRemoveMedia}
                />
            </div>

            {/* Type-specific editor */}
            <div className="mb-2">{renderTypeEditor()}</div>

            {/* Per-question config */}
            <QuestionConfig question={question} onChange={onChange} />
        </div>
    );
}
