import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardRootPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    const role = user.user_metadata?.role as string | undefined;

    if (role === 'student') redirect('/dashboard/student');
    if (role === 'admin') redirect('/dashboard/admin');
    redirect('/dashboard/instructor');
}
