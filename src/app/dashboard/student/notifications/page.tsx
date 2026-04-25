'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap, BookOpen, BarChart2, Bell,
    CheckCheck, ChevronRight, Inbox,
} from 'lucide-react';
/* Lightweight relative-time helper – avoids a date-fns dependency */
function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60)   return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60)   return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)   return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7)    return `${d}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
import {
    useStudentNotifications,
    type NotificationType,
    type StudentNotification,
} from '@/components/student/StudentNotificationProvider';

/* ─── Icon / colour configs ──────────────────────────────────────────────── */

const TYPE_CFG: Record<NotificationType, {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    label: string;
    badgeClasses: string;
}> = {
    course_enrolled: {
        icon: GraduationCap,
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        label: 'Enrolled',
        badgeClasses: 'bg-indigo-50 text-indigo-600',
    },
    exam_published: {
        icon: BookOpen,
        iconBg: 'bg-pink-100',
        iconColor: 'text-[#f51582]',
        label: 'New Exam',
        badgeClasses: 'bg-pink-50 text-[#f51582]',
    },
    results: {
        icon: BarChart2,
        iconBg: 'bg-violet-100',
        iconColor: 'text-violet-600',
        label: 'Results',
        badgeClasses: 'bg-violet-50 text-violet-600',
    },
    reminder: {
        icon: Bell,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        label: 'Reminder',
        badgeClasses: 'bg-amber-50 text-amber-600',
    },
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function dayLabel(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const todayStr  = now.toDateString();
    const yestDate  = new Date(now); yestDate.setDate(now.getDate() - 1);
    const yestStr   = yestDate.toDateString();
    if (d.toDateString() === todayStr)  return 'Today';
    if (d.toDateString() === yestStr)   return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/* ─── Notification row ───────────────────────────────────────────────────── */

function NotificationRow({ n, onRead }: { n: StudentNotification; onRead: (id: string) => void }) {
    const cfg  = TYPE_CFG[n.type] ?? TYPE_CFG.reminder;
    const Icon = cfg.icon;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{ opacity: 0, y: -8   }}
            transition={{ duration: 0.2 }}
            onClick={() => { if (!n.read) onRead(n.id); }}
            className={`group flex items-start gap-4 px-5 py-4 cursor-pointer select-none
                        transition-colors duration-150
                        ${n.read ? 'bg-white hover:bg-gray-50' : 'bg-[#f5f3ff] hover:bg-[#ede9fe]'}`}
        >
            {/* Left icon */}
            <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center mt-0.5 ${cfg.iconBg}`}>
                <Icon className={`w-4.5 h-4.5 ${cfg.iconColor}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.badgeClasses}`}>
                        {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400">
                        {timeAgo(n.created_at)}
                    </span>
                    {!n.read && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-[#4b3fe9] shrink-0" />
                    )}
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">{n.title}</p>
                {n.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                )}
                {n.metadata?.exam_url && n.type === 'exam_published' && (
                    <a
                        href={n.metadata.exam_url}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 mt-1.5 text-xs text-[#4b3fe9] font-semibold hover:underline"
                    >
                        Go to Exam <ChevronRight className="w-3 h-3" />
                    </a>
                )}
            </div>
        </motion.div>
    );
}

/* ─── Filter chips ───────────────────────────────────────────────────────── */

const FILTERS = [
    { key: 'all',             label: 'All'        },
    { key: 'course_enrolled', label: 'Enrolled'   },
    { key: 'exam_published',  label: 'Exams'      },
    { key: 'results',         label: 'Results'    },
    { key: 'reminder',        label: 'Reminders'  },
] as const;

type FilterKey = typeof FILTERS[number]['key'];

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function StudentNotificationsPage() {
    const { notifications, unreadCount, markRead, markAllRead } = useStudentNotifications();
    const [filter, setFilter] = useState<FilterKey>('all');

    const visible = useMemo(() =>
        filter === 'all'
            ? notifications
            : notifications.filter(n => n.type === filter),
        [notifications, filter],
    );

    /* Group by day */
    const grouped = useMemo(() => {
        const map = new Map<string, StudentNotification[]>();
        for (const n of visible) {
            const label = dayLabel(n.created_at);
            const arr = map.get(label) ?? [];
            arr.push(n);
            map.set(label, arr);
        }
        return map;
    }, [visible]);

    return (
        <div className="min-h-screen bg-gray-50 px-6 py-8 max-w-3xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h1>
                    {unreadCount > 0 && (
                        <p className="text-sm text-gray-500 mt-0.5">
                            {unreadCount} unread
                        </p>
                    )}
                </div>

                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        className="flex items-center gap-1.5 text-sm font-semibold text-[#4b3fe9] hover:opacity-75 transition-opacity"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all read
                    </button>
                )}
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 flex-wrap mb-5">
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors
                                    ${filter === f.key
                                        ? 'bg-[#4b3fe9] text-white shadow-sm'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Feed */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
                {grouped.size === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                        <Inbox className="w-10 h-10" />
                        <p className="text-sm font-medium">No notifications yet</p>
                    </div>
                ) : (
                    Array.from(grouped.entries()).map(([day, rows], gi) => (
                        <div key={day}>
                            {/* Day divider */}
                            <div className={`px-5 py-2.5 bg-gray-50 border-b border-gray-100 ${gi > 0 ? 'border-t' : ''}`}>
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    {day}
                                </span>
                            </div>

                            <AnimatePresence initial={false}>
                                {rows.map((n, idx) => (
                                    <div key={n.id}>
                                        <NotificationRow n={n} onRead={markRead} />
                                        {idx < rows.length - 1 && (
                                            <div className="mx-5 border-b border-gray-100" />
                                        )}
                                    </div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

