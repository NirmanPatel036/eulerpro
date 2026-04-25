import './auth.css';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

function roleHome(role: string | undefined): string {
    if (role === 'student') return '/dashboard/student';
    if (role === 'instructor') return '/dashboard/instructor';
    if (role === 'admin') return '/dashboard/admin';
    return '/dashboard/instructor';
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) redirect(roleHome(user.user_metadata?.role as string | undefined));

    return <>{children}</>;
}
