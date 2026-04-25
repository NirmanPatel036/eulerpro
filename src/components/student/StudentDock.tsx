'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, BookOpen, BarChart3, Bell, User, LogOut, GraduationCap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const NAV = [
    { href: '/dashboard/student', label: 'Home', icon: LayoutDashboard },
    { href: '/dashboard/student/exams', label: 'My Exams', icon: BookOpen },
    { href: '/dashboard/student/courses', label: 'Courses', icon: GraduationCap },
    { href: '/dashboard/student/results', label: 'Results', icon: BarChart3 },
    { href: '/dashboard/student/notifications', label: 'Notifications', icon: Bell },
    { href: '/dashboard/student/profile', label: 'Profile', icon: User },
];

interface Props {
    user: { given_name?: string | null; family_name?: string | null; email?: string | null; avatar_url?: string | null } | null;
}

export default function StudentDock({ user }: Props) {
    const pathname = usePathname();
    const router = useRouter();
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const [confirmSignOut, setConfirmSignOut] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user?.email) return;
        const supabase = createClient();

        const fetch = async () => {
            const { count } = await supabase
                .from('student_notifications')
                .select('id', { count: 'exact', head: true })
                .eq('student_email', user.email as string)
                .eq('read', false);
            setUnreadCount(count ?? 0);
        };
        fetch();

        const channel = supabase
            .channel('unread-notifs')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'student_notifications',
                filter: `student_email=eq.${user.email}`,
            }, fetch)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.email]);

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/auth/login');
    };

    const initials = [user?.given_name?.[0], user?.family_name?.[0]].filter(Boolean).join('') || 'S';

    return (
        <nav
            aria-label="Student navigation"
            style={{
                position: 'fixed',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 8px',
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(18px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(18px) saturate(1.6)',
                border: '1px solid rgba(255,255,255,0.7)',
                borderRadius: '20px',
                boxShadow: '0 8px 24px rgba(15,23,42,0.08), 0 1px 0 rgba(255,255,255,0.8) inset',
                width: '48px',
            }}
        >
            {/* Logo */}
            <Link
                href="/dashboard/student"
                aria-label="Home"
                style={{
                    width: '34px', height: '34px',
                    borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none', flexShrink: 0, overflow: 'hidden',
                }}
            >
                <img src="/symbol.svg" alt="Logo" style={{ width: '24px', height: '24px', display: 'block' }} />
            </Link>

            <div style={{ width: '24px', height: '1px', background: 'rgba(0,0,0,0.08)', margin: '2px 0' }} />

            {NAV.map((item, i) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard/student' && pathname.startsWith(item.href));
                return (
                    <div
                        key={item.href}
                        style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <Link
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            style={{
                                position: 'relative',
                                width: '36px', height: '36px',
                                borderRadius: '11px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: isActive ? '#4b3fe9' : '#9ca3af',
                                background: isActive ? 'rgba(75,63,233,0.1)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'background 0.15s, color 0.15s',
                            }}
                        >
                            <item.icon style={{ width: '1.05rem', height: '1.05rem' }} />
                            {item.icon === Bell && unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '3px', right: '3px',
                                    minWidth: '14px', height: '14px',
                                    background: '#ef4444',
                                    color: '#fff',
                                    fontSize: '8px', fontWeight: 700,
                                    borderRadius: '99px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '0 3px',
                                    lineHeight: 1,
                                    boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
                                }}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                            {isActive && (
                                <motion.span
                                    layoutId="dock-indicator"
                                    style={{
                                        position: 'absolute',
                                        left: '-6px',
                                        width: '3px', height: '18px',
                                        background: '#4b3fe9',
                                        borderRadius: '0 3px 3px 0',
                                    }}
                                />
                            )}
                        </Link>
                        <AnimatePresence>
                            {hoveredIdx === i && (
                                <motion.div
                                    key="tooltip"
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -6 }}
                                    transition={{ duration: 0.15 }}
                                    style={{
                                        position: 'absolute',
                                        left: 'calc(100% + 10px)',
                                        background: '#1f2937',
                                        color: '#fff',
                                        fontSize: '11px', fontWeight: 600,
                                        padding: '4px 8px',
                                        borderRadius: '7px',
                                        whiteSpace: 'nowrap',
                                        pointerEvents: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        zIndex: 60,
                                    }}
                                >
                                    {item.label}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}

            <div style={{ width: '24px', height: '1px', background: 'rgba(0,0,0,0.08)', margin: '2px 0' }} />

            {/* Avatar + sign out */}
            <div
                style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                onMouseEnter={() => { if (!confirmSignOut) setHoveredIdx(NAV.length); }}
                onMouseLeave={() => setHoveredIdx(null)}
            >
                <button
                    onClick={() => { setConfirmSignOut(true); setHoveredIdx(null); }}
                    aria-label="Sign out"
                    style={{
                        position: 'relative',
                        width: '36px', height: '36px',
                        borderRadius: '11px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: confirmSignOut ? 'rgba(239,68,68,0.08)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        transition: 'background 0.15s',
                    }}
                >
                    <span style={{
                        width: '26px', height: '26px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #4b3fe9, #7c3aed)',
                        color: '#fff', fontSize: '10px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', flexShrink: 0,
                    }}>
                        {user?.avatar_url
                            ? <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : initials}
                    </span>
                    <span style={{
                        position: 'absolute', bottom: '-2px', right: '-2px',
                        width: '14px', height: '14px',
                        background: '#fff', borderRadius: '4px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    }}>
                        <LogOut style={{ width: '0.6rem', height: '0.6rem' }} />
                    </span>
                </button>

                {/* Sign-out confirmation popover */}
                <AnimatePresence>
                    {confirmSignOut && (
                        <motion.div
                            key="signout-confirm"
                            initial={{ opacity: 0, x: -8, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            style={{
                                position: 'absolute',
                                left: 'calc(100% + 10px)',
                                background: '#1f2937',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                zIndex: 60,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                            }}
                        >
                            <p style={{ color: '#f9fafb', fontSize: '11px', fontWeight: 600, margin: 0 }}>
                                Sign out?
                            </p>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={handleSignOut}
                                    style={{
                                        flex: 1,
                                        background: '#ef4444',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setConfirmSignOut(false)}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.1)',
                                        color: '#d1d5db',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    No
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hover tooltip — only when confirm dialog is not open */}
                <AnimatePresence>
                    {hoveredIdx === NAV.length && !confirmSignOut && (
                        <motion.div
                            key="signout-tip"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.15 }}
                            style={{
                                position: 'absolute',
                                left: 'calc(100% + 10px)',
                                background: '#1f2937', color: '#fff',
                                fontSize: '11px', fontWeight: 600,
                                padding: '4px 8px', borderRadius: '7px',
                                whiteSpace: 'nowrap', pointerEvents: 'none',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 60,
                            }}
                        >
                            Sign out
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
}
