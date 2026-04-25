import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InstructorSidebar from '@/components/instructor/InstructorSidebar';
import AnnouncementBanner from '@/components/shared/AnnouncementBanner';
import InstructorCommandPalette from '@/components/instructor/InstructorCommandPalette';

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    const role = user.user_metadata?.role as string | undefined;
    if (role === 'student') redirect('/dashboard/student');

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('id', user.id)
        .maybeSingle();

    const profileFullName = (profile?.full_name as string | null) ?? null;
    const [profileGivenName, ...profileRestName] = (profileFullName ?? '').trim().split(/\s+/).filter(Boolean);
    const profileFamilyName = profileRestName.length ? profileRestName.join(' ') : null;

    const mappedUser = {
        given_name: profileGivenName ?? (user.user_metadata?.first_name as string | null) ?? null,
        family_name: profileFamilyName ?? (user.user_metadata?.last_name as string | null) ?? null,
        full_name: profileFullName,
        avatar_url: (profile?.avatar_url as string | null) ?? null,
        email: user.email ?? null,
        role: (profile?.role as string | null) ?? role ?? null,
    };

    return (
        <div className="instructor-shell">
            <InstructorSidebar user={mappedUser} />
            <div className="instructor-shell__main">
                <AnnouncementBanner />
                <main className="instructor-shell__content">
                    {children}
                </main>
                <InstructorCommandPalette />
            </div>
        </div>
    );
}
