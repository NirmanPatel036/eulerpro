import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Root dashboard layout — auth guard only.
 * Each role has its own nested layout that provides the chrome (sidebar/dock).
 * Landing on exactly /dashboard redirects to the role-specific home.
 */
export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    return <>{children}</>;
}
