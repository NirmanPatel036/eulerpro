'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QuestionType } from '@/lib/types';

const questionTypes: { type: QuestionType; label: string; desc: string; icon: string }[] = [
    { type: 'multiple_choice', label: 'Multiple Choice', desc: 'One correct answer from options', icon: '◉' },
    { type: 'checkbox', label: 'Multi-Select', desc: 'Multiple correct answers', icon: '☑' },
    { type: 'fill_blank', label: 'Fill in the Blank', desc: 'Text answer with regex matching', icon: '___' },
    { type: 'true_false', label: 'True / False', desc: 'Binary choice question', icon: 'T/F' },
    { type: 'matching', label: 'Matching Pairs', desc: 'Drag and drop to match pairs', icon: '⇄' },
    { type: 'reorder', label: 'Reorder Sequence', desc: 'Arrange items in correct order', icon: '↕' },
];

interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (type: QuestionType) => void;
}

export default function QuestionTypeModal({ open, onClose, onSelect }: Props) {
    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-gray-100">
                    <DialogTitle className="text-lg font-bold text-white">Add Question</DialogTitle>
                    <p className="text-sm text-gray-500 mt-1">Choose a question type to add to your exam</p>
                </DialogHeader>
                <div className="p-4 grid grid-cols-2 gap-3">
                    {questionTypes.map((qt, i) => (
                        <motion.button
                            key={qt.type}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => onSelect(qt.type)}
                            className="group flex flex-col gap-2 p-4 rounded-xl border border-gray-100 bg-white hover:border-[#4b3fe9]/30 hover:bg-[#4b3fe9]/4 hover:text-white text-left transition-all duration-200"
                        >
                            <span className="text-2xl font-bold text-[#4b3fe9]/40 group-hover:text-[#4b3fe9] transition-colors">
                                {qt.icon}
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-gray-900 group-hover:text-white transition-colors">{qt.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{qt.desc}</p>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
