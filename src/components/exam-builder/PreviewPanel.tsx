'use client';

import { Question } from '@/lib/types';
import MathText from '@/components/shared/MathText';

interface ExamSettings {
    title: string; description: string; duration: number;
    passing_score: number; allow_review: boolean;
}

interface Props { questions: Question[]; settings: ExamSettings; }

export default function PreviewPanel({ questions, settings }: Props) {
    return (
        <div className="min-h-full bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-4">
                    <div className="bg-[#4b3fe9] p-6 text-white">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Student Preview</p>
                        <h1 className="text-xl font-bold">{settings.title || 'Untitled Exam'}</h1>
                        {settings.description && <p className="text-sm opacity-80 mt-1">{settings.description}</p>}
                        <div className="flex items-center gap-4 mt-3 text-sm opacity-80">
                            <span>⏱ {settings.duration} minutes</span>
                            <span>✓ Pass at {settings.passing_score}%</span>
                            <span>📝 {questions.length} questions</span>
                        </div>
                    </div>
                </div>

                {questions.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <p className="text-4xl mb-3">📝</p>
                        <p className="font-medium">No questions yet</p>
                        <p className="text-sm">Add questions to see the student preview</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questions.map((q, i) => (
                            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="flex items-start gap-3 mb-4">
                                    <span className="w-7 h-7 rounded-full bg-[#4b3fe9] text-white text-sm font-bold flex items-center justify-center shrink-0">
                                        {i + 1}
                                    </span>
                                    <div className="flex-1">
                                        {q.render_as_code ? (
                                            <pre className="p-3 rounded-lg bg-gray-900 text-gray-100 font-mono text-xs leading-relaxed overflow-x-auto shadow-inner mb-2">
                                                <code>{q.text}</code>
                                            </pre>
                                        ) : (
                                            <div className="font-medium text-gray-900">
                                                {q.text ? <MathText text={q.text} /> : <span className="text-gray-300 italic">Question text here</span>}
                                            </div>
                                        )}
                                        {q.media_url && (
                                            q.media_type === 'video'
                                                // eslint-disable-next-line jsx-a11y/media-has-caption
                                                ? <video src={q.media_url} controls className="mt-3 rounded-lg max-h-64 w-full object-contain bg-gray-50" />
                                                // eslint-disable-next-line @next/next/no-img-element
                                                : <img src={q.media_url} alt="" className="mt-3 rounded-lg max-h-64 w-full object-contain bg-gray-50" />
                                        )}
                                    </div>
                                </div>

                                {/* Answer UI preview per type */}
                                {q.type === 'multiple_choice' && q.options.map((opt, j) => (
                                    <label key={j} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer group">
                                        <input type="radio" name={`q-${q.id}`} className="accent-[#4b3fe9]" readOnly />
                                        <span className="text-sm text-gray-700"><MathText text={opt} /></span>
                                    </label>
                                ))}

                                {q.type === 'checkbox' && q.options.map((opt, j) => (
                                    <label key={j} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input type="checkbox" className="accent-[#4b3fe9] rounded" readOnly />
                                        <span className="text-sm text-gray-700"><MathText text={opt} /></span>
                                    </label>
                                ))}

                                {q.type === 'true_false' && (
                                    <div className="flex gap-3 mt-1">
                                        {['True', 'False'].map(v => (
                                            <label key={v} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 cursor-pointer hover:border-[#4b3fe9]/30 flex-1 justify-center">
                                                <input type="radio" name={`q-${q.id}`} className="accent-[#4b3fe9]" readOnly />
                                                <span className="text-sm font-medium text-gray-700">{v}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'fill_blank' && (
                                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="Type your answer here..." readOnly />
                                )}

                                {q.type === 'matching' && (
                                    <div className="space-y-2 mt-1">
                                        {q.pairs.map((p, j) => (
                                            <div key={j} className="flex items-center gap-3">
                                                <span className="text-sm text-gray-700 flex-1 bg-gray-50 rounded-lg px-3 py-2"><MathText text={p.left} /></span>
                                                <span className="text-gray-300">→</span>
                                                <select className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">
                                                    <option>Select match…</option>
                                                    {q.pairs.map((pp, k) => <option key={k}>{pp.right}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'reorder' && (
                                    <div className="space-y-2 mt-1">
                                        {q.items.map((item, j) => (
                                            <div key={j} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                                <span className="text-gray-300 cursor-grab">⠿</span>
                                                <span className="text-sm text-gray-700"><MathText text={item} /></span>
                                            </div>
                                        ))}
                                        <p className="text-xs text-gray-400 text-center">Drag to reorder</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
