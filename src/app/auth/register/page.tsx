'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Role = 'student' | 'instructor' | 'admin';

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [role, setRole] = useState<Role>('student');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hint, setHint] = useState('');

    // Pre-fill email and show hint when redirected from login
    useEffect(() => {
        const emailParam = searchParams.get('email');
        const hintParam = searchParams.get('hint');
        if (emailParam) setEmail(decodeURIComponent(emailParam));
        if (hintParam === 'no-account') {
            setHint('no-account');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const supabase = createClient();
        const { error: err } = await supabase.auth.signInWithOtp({
            email,
            options: {
                data: { first_name: firstName, last_name: lastName, role },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        setLoading(false);
        if (err) { setError(err.message); return; }
        router.push(`/auth/otp?email=${encodeURIComponent(email)}`);
    };

    const handleGoogle = async () => {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
    };

    return (
        <div className="auth-shell">
            <div className="auth-shell__bg" aria-hidden="true" />
            <div className="auth-card">

                <div className="auth-logo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-cropped.svg" alt="EulerPro"
                        onError={(e) => {
                            const el = e.currentTarget;
                            el.style.display = 'none';
                            if (el.parentElement) el.parentElement.innerHTML = '<span style="font-weight:800;font-size:1.375rem;letter-spacing:-0.04em;color:#330c26">EULERPRO</span>';
                        }} />
                </div>

                <h1 className="auth-heading">Create your account</h1>
                <p className="auth-subheading">Proctor with integrity. Who are you signing up as?</p>

                {/* Role Picker */}
                <div className="role-picker" role="group" aria-label="Select your role">
                    <button type="button"
                        className={`role-btn role-btn--student${role === 'student' ? ' role-btn--active' : ''}`}
                        onClick={() => setRole('student')}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                            <path d="M7 8a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" />
                            <path fillRule="evenodd" d="M3.5 18a6.5 6.5 0 1 1 13 0H3.5Z" clipRule="evenodd" />
                        </svg>
                        Student
                    </button>
                    <button type="button"
                        className={`role-btn role-btn--instructor${role === 'instructor' ? ' role-btn--active' : ''}`}
                        onClick={() => setRole('instructor')}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                            <path d="M9.25 3.75a.75.75 0 0 1 1.5 0V10h2.25a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75V3.75Z" />
                            <path fillRule="evenodd" d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2ZM3.5 10a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z" clipRule="evenodd" />
                        </svg>
                        Instructor
                    </button>
                    <button type="button"
                        className={`role-btn role-btn--admin${role === 'admin' ? ' role-btn--active' : ''}`}
                        onClick={() => setRole('admin')}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                            <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.589 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.563 2 12.162 2 7a11.85 11.85 0 0 1 .104-1.589.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.749Z" clipRule="evenodd" />
                        </svg>
                        Admin
                    </button>
                </div>

                {/* Role notices */}
                <div className={`role-notice role-notice--instructor${role === 'instructor' ? ' role-notice--visible' : ''}`}>
                    <span>Instructor accounts require institutional approval. You&apos;ll be notified once verified.</span>
                </div>
                <div className={`role-notice role-notice--admin${role === 'admin' ? ' role-notice--visible' : ''}`}>
                    <span>Admin sign-up requires an existing admin invitation. Contact your platform admin.</span>
                </div>

                {hint === 'no-account' && (
                    <div className="auth-success">
                        Looks like <strong>{email}</strong> is new here. Welcome! 🎉 Fill in your details below to get started.
                    </div>
                )}
                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} autoComplete="on">
                    <label className="auth-label" htmlFor="first_name">First name</label>
                    <input className="auth-input" type="text" id="first_name" placeholder="Akshay" autoComplete="given-name"
                        value={firstName} onChange={e => setFirstName(e.target.value)} required />

                    <label className="auth-label" htmlFor="last_name">Last name</label>
                    <input className="auth-input" type="text" id="last_name" placeholder="Khanna" autoComplete="family-name"
                        value={lastName} onChange={e => setLastName(e.target.value)} required />

                    <label className="auth-label" htmlFor="email">Work / institution email</label>
                    <input className="auth-input" type="email" id="email" placeholder="akshay@university.edu.in" autoComplete="email"
                        value={email} onChange={e => setEmail(e.target.value)} required />

                    <button className="auth-btn" type="submit" disabled={loading}>
                        {loading ? 'Creating…' : 'Create account'}
                    </button>
                </form>

                <div className="auth-divider">Or continue with</div>

                <div className="auth-socials">
                    <button className="social-btn" type="button" aria-label="Sign up with Google" onClick={handleGoogle}>
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    </button>
                    <button className="social-btn" type="button" aria-label="Sign up with Apple" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.42.07 2.4.83 3.2.83.79 0 2.26-.98 3.81-.83 1.47.12 2.56.7 3.27 1.76-3.02 1.81-2.52 5.78.31 7l-.59 4.1zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                        </svg>
                    </button>
                    <button className="social-btn" type="button" aria-label="Sign up with Microsoft" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022" />
                            <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00" />
                            <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF" />
                            <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
                        </svg>
                    </button>
                </div>

                <p className="auth-footer-text">Already have an account? <Link href="/auth/login">Sign in</Link></p>
                <p className="auth-powered-by">Powered by <strong>Supabase</strong></p>
            </div>
        </div>
    );
}
