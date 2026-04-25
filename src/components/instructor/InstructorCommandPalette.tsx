'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const OPEN_EVENT = 'instructor-cmdk-open';

export default function InstructorCommandPalette() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const commandItems = useMemo(() => {
        const items = [
            { label: 'Create New Exam', hint: 'Build and publish an exam', href: '/dashboard/instructor/exams/new' },
            { label: 'Manage Exams', hint: 'Edit schedule and settings', href: '/dashboard/instructor/exams' },
            { label: 'Live Proctoring', hint: 'Monitor active sessions', href: '/dashboard/instructor/proctoring' },
            { label: 'Results Analytics', hint: 'Inspect performance and trends', href: '/dashboard/instructor/results' },
            { label: 'Courses', hint: 'Review course distribution', href: '/dashboard/instructor/courses' },
            { label: 'Settings', hint: 'Update profile and preferences', href: '/dashboard/instructor/settings' },
        ];

        const normalized = query.trim().toLowerCase();
        return items.filter((item) => !normalized || item.label.toLowerCase().includes(normalized) || item.hint.toLowerCase().includes(normalized));
    }, [query]);

    useEffect(() => {
        const onGlobalKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setOpen(true);
            }
        };

        const onOpenEvent = () => setOpen(true);

        window.addEventListener('keydown', onGlobalKeyDown);
        window.addEventListener(OPEN_EVENT, onOpenEvent);

        return () => {
            window.removeEventListener('keydown', onGlobalKeyDown);
            window.removeEventListener(OPEN_EVENT, onOpenEvent);
        };
    }, []);

    useEffect(() => {
        if (!open) return;

        const onPaletteKeyDown = (event: KeyboardEvent) => {
            const itemCount = commandItems.length;
            if (itemCount === 0) return;

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % itemCount);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + itemCount) % itemCount);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                const selected = commandItems[selectedIndex];
                if (!selected) return;
                setOpen(false);
                setQuery('');
                setSelectedIndex(0);
                router.push(selected.href);
            }
        };

        window.addEventListener('keydown', onPaletteKeyDown);
        return () => window.removeEventListener('keydown', onPaletteKeyDown);
    }, [commandItems, open, router, selectedIndex]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        if (!open) setSelectedIndex(0);
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-xl rounded-2xl border border-white/20 bg-white/10 p-0 shadow-[0_20px_60px_rgba(15,23,42,0.2)] backdrop-blur-2xl">
                <DialogHeader className="border-b border-white/10 px-4 py-3">
                    <DialogTitle className="text-base font-semibold text-slate-900">Command Center</DialogTitle>
                    <DialogDescription className="text-xs text-slate-200">
                        Navigate instantly across instructor workspace using CMD+K or arrow keys.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-4">
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search pages, actions, analytics..."
                        className="mb-3 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-600 outline-none transition backdrop-blur-sm focus:border-indigo-300 focus:bg-white/10"
                    />
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                        {commandItems.length === 0 ? (
                            <p className="rounded-lg border border-white/10 px-3 py-5 text-center text-sm text-slate-500">No command matches your search.</p>
                        ) : (
                            commandItems.map((item, idx) => {
                                const isSelected = idx === selectedIndex;
                                return (
                                    <button
                                        key={item.href}
                                        onClick={() => {
                                            setOpen(false);
                                            setQuery('');
                                            setSelectedIndex(0);
                                            router.push(item.href);
                                        }}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={`flex w-full items-start justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                                            isSelected
                                                ? 'border-indigo-300/40 bg-indigo-500/10 backdrop-blur-sm'
                                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                        }`}
                                    >
                                        <span>
                                            <span className="block text-sm font-semibold text-slate-800">{item.label}</span>
                                            <span className="block text-xs text-slate-600">{item.hint}</span>
                                        </span>
                                        <span className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200 backdrop-blur-sm">
                                            {isSelected ? (
                                                <>
                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                    <span>Enter</span>
                                                </>
                                            ) : (
                                                <span>Go</span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                            <kbd className="rounded-md border border-white/20 bg-white/5 px-1.5 py-0.5 backdrop-blur-sm">↑</kbd>
                            <kbd className="rounded-md border border-white/20 bg-white/5 px-1.5 py-0.5 backdrop-blur-sm">↓</kbd>
                            <span className="text-slate-200">Navigate</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="rounded-md border border-white/20 bg-white/5 px-1.5 py-0.5 backdrop-blur-sm">Esc</kbd>
                            <span className="text-slate-200">Close</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
