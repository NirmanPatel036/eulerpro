'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, BookOpen, BarChart3, Shield, Settings, LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/exams', label: 'Exams', icon: BookOpen },
    { href: '/dashboard/results', label: 'Results', icon: BarChart3 },
    { href: '/dashboard/proctoring', label: 'Proctoring', icon: Shield },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface Props {
    user: { given_name?: string | null; family_name?: string | null; email?: string | null } | null;
}

export default function DashboardNav({ user }: Props) {
    const pathname = usePathname();
    const router = useRouter();
    const initials = [user?.given_name?.[0], user?.family_name?.[0]].filter(Boolean).join('') || 'U';

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/auth/login');
    };

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 flex flex-col z-40">
            {/* Logo */}
            <div className="p-6 border-b border-gray-100">
                <Link href="/dashboard" className="flex items-center">
                    <Image src="/logo-cropped.svg" alt="EulerPro" width={130} height={32} className="h-8 w-auto" priority />
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                                isActive
                                    ? 'bg-[#4b3fe9]/8 text-[#4b3fe9]'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                        >
                            <item.icon className={cn('w-4 h-4', isActive ? 'text-[#4b3fe9]' : 'text-gray-400')} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-[#4b3fe9]/10 text-[#4b3fe9] text-xs font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.given_name} {user?.family_name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
