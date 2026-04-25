'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layers2, BookOpen, Shield, BarChart3, Settings,
    LogOut, ChevronDown, Plus, AlertTriangle, FileText,
    Users, Zap, FolderOpen, GraduationCap,
    Paperclip,
    EyeIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const WORKSPACE = [
    { href: '/dashboard/instructor',         label: 'Overview', icon: Layers2,        exact: true },
    { href: '/dashboard/instructor/courses', label: 'Courses',  icon: GraduationCap,  exact: false },
];

const SECTIONS = [
    {
        title: 'Exams',
        icon: BookOpen,
        items: [
            { href: '/dashboard/instructor/exams', label: 'All Exams', icon: FolderOpen, exact: true },
            { href: '/dashboard/instructor/exams/new', label: 'Create New', icon: Plus },
        ],
    },
    {
        title: 'Proctoring',
        icon: Shield,
        items: [
            { href: '/dashboard/instructor/proctoring/live-proctor', label: 'Live Monitor', icon: EyeIcon, exact: true },
            { href: '/dashboard/instructor/proctoring/flags', label: 'Flagged Events', icon: AlertTriangle },
            { href: '/dashboard/instructor/proctoring/students', label: 'Students', icon: Users },
        ],
    },
    {
        title: 'Analytics',
        icon: BarChart3,
        items: [
            { href: '/dashboard/instructor/results', label: 'Results', icon: FileText },
            { href: '/dashboard/instructor/reports', label: 'Reports', icon: Paperclip},
        ],
    },
];

interface Props {
    user: {
        given_name?: string | null;
        family_name?: string | null;
        full_name?: string | null;
        avatar_url?: string | null;
        email?: string | null;
        role?: string | null;
    } | null;
}

export default function InstructorSidebar({ user }: Props) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const initials = [user?.given_name?.[0], user?.family_name?.[0]].filter(Boolean).join('') || 'I';

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/auth/login');
    };

    const toggleSection = (title: string) => {
        setCollapsed(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const isLinkActive = (href: string, exact = false) =>
        exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'));

    return (
        <aside className="instructor-sidebar">
            {/* Workspace header */}
            <div className="instructor-sidebar__workspace">
                <Link href="/dashboard/instructor" className="instructor-sidebar__logo-wrap">
                    <Image
                        src="/logo-cropped.svg" alt="EulerPro" width={100} height={24}
                        className="instructor-sidebar__logo"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        priority
                    />
                </Link>
                <span className="instructor-sidebar__workspace-tag">Workspace</span>
            </div>

            {/* Quick workspace links */}
            <div className="instructor-sidebar__section-items">
                {WORKSPACE.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn('instructor-sidebar__link', isLinkActive(item.href, item.exact) && 'instructor-sidebar__link--active')}
                    >
                        <item.icon className="instructor-sidebar__link-icon" />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </div>

            <div className="instructor-sidebar__rule" />

            {/* Collapsible sections */}
            <nav className="instructor-sidebar__nav" aria-label="Instructor navigation">
                {SECTIONS.map(section => {
                    const isOpen = !collapsed[section.title];
                    const hasSectionActive = section.items.some(i => isLinkActive(i.href));
                    return (
                        <div key={section.title} className="instructor-sidebar__group">
                            <button
                                className={cn(
                                    'instructor-sidebar__group-header',
                                    hasSectionActive && 'instructor-sidebar__group-header--active'
                                )}
                                onClick={() => toggleSection(section.title)}
                                aria-expanded={isOpen}
                            >
                                <section.icon className="instructor-sidebar__group-icon" />
                                <span className="instructor-sidebar__group-label">{section.title}</span>
                                <motion.span
                                    animate={{ rotate: isOpen ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="instructor-sidebar__chevron"
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </motion.span>
                            </button>
                            <AnimatePresence initial={false}>
                                {isOpen && (
                                    <motion.div
                                        key="content"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div className="instructor-sidebar__sub-items">
                                            {section.items.map(item => (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={cn(
                                                        'instructor-sidebar__sub-link',
                                                        isLinkActive(item.href, item.exact) && 'instructor-sidebar__sub-link--active'
                                                    )}
                                                >
                                                    <item.icon className="instructor-sidebar__sub-icon" />
                                                    <span>{item.label}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </nav>

            {/* Bottom — settings + user */}
            <div className="instructor-sidebar__footer">
                <Link
                    href="/dashboard/instructor/settings"
                    className={cn('instructor-sidebar__link', isLinkActive('/dashboard/instructor/settings') && 'instructor-sidebar__link--active')}
                >
                    <Settings className="instructor-sidebar__link-icon" />
                    <span>Settings</span>
                </Link>

                <div className="instructor-sidebar__user">
                    <Avatar className="instructor-sidebar__user-avatar">
                        {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt={user?.full_name ?? 'Instructor profile'} /> : null}
                        <AvatarFallback className="instructor-sidebar__user-initials">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="instructor-sidebar__user-info">
                        <p className="instructor-sidebar__user-name">
                            {user?.full_name && user.full_name.trim()
                                ? user.full_name.trim()
                                : `${user?.given_name ?? ''} ${user?.family_name ?? ''}`.trim() || 'Instructor'}
                        </p>
                        <p className="instructor-sidebar__user-email">{user?.email}</p>
                    </div>
                    <button
                        onClick={() => setShowSignOutConfirm(true)}
                        className="instructor-sidebar__signout"
                        aria-label="Sign out"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <Dialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Sign out?</DialogTitle>
                        <DialogDescription>
                            You will be logged out of your instructor workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSignOutConfirm(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                setShowSignOutConfirm(false);
                                await handleSignOut();
                            }}
                        >
                            Sign out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </aside>
    );
}
