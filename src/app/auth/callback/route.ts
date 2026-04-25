import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

function roleRedirect(role: string | undefined): string {
    if (role === 'student') return '/dashboard/student';
    if (role === 'instructor') return '/dashboard/instructor';
    if (role === 'admin') return '/dashboard/admin';
    return '/dashboard/instructor'; // safe default
}

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next'); // optional explicit override

    if (code) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );
        const { error, data } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.user) {
            const role = data.user.user_metadata?.role as string | undefined;
            const destination = next ?? roleRedirect(role);
            return NextResponse.redirect(`${origin}${destination}`);
        }
    }

    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
