import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import StudentDock from '@/components/student/StudentDock';
import AnnouncementBanner from '@/components/shared/AnnouncementBanner';
import { StudentNotificationProvider } from '@/components/student/StudentNotificationProvider';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    const role = user.user_metadata?.role as string | undefined;
    if (role && role !== 'student') redirect('/dashboard/instructor');

    const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

    const mappedUser = {
        given_name: (user.user_metadata?.first_name as string | null) ?? null,
        family_name: (user.user_metadata?.last_name as string | null) ?? null,
        email: user.email ?? null,
        avatar_url: (profileData?.avatar_url as string | null) ?? null,
    };

    return (
        /* Dock is position:fixed, so it doesn't consume flow space.
           Banner must be outside the left-padded wrapper to span full width. */
        <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: "'DM Sans', ui-sans-serif, sans-serif" }}>
            <StudentDock user={mappedUser} />
            <AnnouncementBanner />
            <main className="min-h-screen bg-gray-50 w-full" style={{ paddingLeft: '80px' }}>
                <StudentNotificationProvider>
                    {children}
                </StudentNotificationProvider>
            </main>
        </div>
    );
}
