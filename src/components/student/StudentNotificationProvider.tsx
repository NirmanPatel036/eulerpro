'use client';

/**
 * StudentNotificationProvider
 * ─────────────────────────────
 * • Fetches the student's unread notifications from Supabase on mount.
 * • Subscribes to realtime INSERT events on student_notifications (filtered
 *   to the current user's email) and fires dismissible top-right toasts.
 * • Exposes `useStudentNotifications()` so any child can read the feed
 *   and mark items as read.
 */

import {
    createContext, useContext, useEffect, useState, useCallback,
    type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap, BookOpen, BarChart2, Bell, X, ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type NotificationType = 'course_enrolled' | 'exam_published' | 'results' | 'reminder';

export type StudentNotification = {
    id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    metadata: Record<string, string | null>;
    read: boolean;
    created_at: string;
};

type ContextValue = {
    notifications: StudentNotification[];
    unreadCount: number;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
};

/* ─── Notification icons & colours ───────────────────────────────────────── */

const TYPE_CFG: Record<NotificationType, {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    label: string;
}> = {
    course_enrolled: { icon: GraduationCap, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', label: 'Enrolled' },
    exam_published:  { icon: BookOpen,      iconBg: 'bg-pink-100',   iconColor: 'text-pink-600',   label: 'New Exam'  },
    results:         { icon: BarChart2,     iconBg: 'bg-violet-100', iconColor: 'text-violet-600', label: 'Results'   },
    reminder:        { icon: Bell,          iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  label: 'Reminder'  },
};

/* ─── Context ────────────────────────────────────────────────────────────── */

const Ctx = createContext<ContextValue>({
    notifications: [],
    unreadCount: 0,
    markRead: async () => {},
    markAllRead: async () => {},
});

export function useStudentNotifications() {
    return useContext(Ctx);
}

/* ─── Toast stack ────────────────────────────────────────────────────────── */

function ToastStack({ toasts, onDismiss }: {
    toasts: StudentNotification[];
    onDismiss: (id: string) => void;
}) {
    return (
        <div
            className="fixed top-5 right-5 z-9999 flex flex-col gap-2"
            style={{ maxWidth: '340px', width: '100%' }}
        >
            <AnimatePresence>
                {toasts.map(n => {
                    const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.course_enrolled;
                    const Icon = cfg.icon;
                    return (
                        <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 48, scale: 0.96 }}
                            animate={{ opacity: 1, x: 0,  scale: 1 }}
                            exit={{ opacity: 0, x: 48, scale: 0.96 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="bg-white rounded-2xl border border-gray-200 shadow-xl px-4 py-3.5
                                       flex items-start gap-3 relative overflow-hidden"
                        >
                            {/* Left accent stripe */}
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#f51582]" />

                            {/* Icon */}
                            <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${cfg.iconBg}`}>
                                <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0 pr-5">
                                <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
                                {n.body && (
                                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                                )}
                                {n.metadata?.exam_url && n.type === 'exam_published' && (
                                    <a
                                        href={n.metadata.exam_url}
                                        className="text-[11px] text-[#4b3fe9] font-semibold flex items-center gap-0.5 mt-1 hover:underline"
                                    >
                                        Go to Exam <ChevronRight className="w-2.5 h-2.5" />
                                    </a>
                                )}
                            </div>

                            {/* Dismiss */}
                            <button
                                onClick={() => onDismiss(n.id)}
                                className="absolute top-2.5 right-2.5 w-5 h-5 rounded-md flex items-center justify-center
                                           text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                                aria-label="Dismiss"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

/* ─── Provider ───────────────────────────────────────────────────────────── */

export function StudentNotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<StudentNotification[]>([]);
    const [toastQueue,    setToastQueue]    = useState<StudentNotification[]>([]);

    /* initial fetch */
    useEffect(() => {
        (async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) return;

            const { data } = await supabase
                .from('student_notifications')
                .select('*')
                .eq('student_email', user.email)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) setNotifications(data as StudentNotification[]);
        })();
    }, []);

    /* realtime subscription */
    useEffect(() => {
        const supabase = createClient();
        let userEmail = '';

        supabase.auth.getUser().then(({ data: { user } }: { data: { user: import('@supabase/supabase-js').User | null } }) => {
            if (!user?.email) return;
            userEmail = user.email;

            const channel = supabase
                .channel('student-notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'student_notifications',
                        filter: `student_email=eq.${userEmail}`,
                    },
                    (payload: { new: StudentNotification }) => {
                        const newRow = payload.new as StudentNotification;
                        setNotifications(prev => [newRow, ...prev]);
                        setToastQueue(prev => [...prev, newRow]);
                        /* auto-dismiss toast after 6 s */
                        setTimeout(() => {
                            setToastQueue(prev => prev.filter(t => t.id !== newRow.id));
                        }, 6000);
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        });
    }, []);

    const markRead = useCallback(async (id: string) => {
        const supabase = createClient();
        await supabase
            .from('student_notifications')
            .update({ read: true })
            .eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    const markAllRead = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return;
        await supabase
            .from('student_notifications')
            .update({ read: true })
            .eq('student_email', user.email)
            .eq('read', false);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const dismissToast = (id: string) => {
        setToastQueue(prev => prev.filter(t => t.id !== id));
        markRead(id);
    };

    return (
        <Ctx.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
            {children}
            <ToastStack toasts={toastQueue} onDismiss={dismissToast} />
        </Ctx.Provider>
    );
}
