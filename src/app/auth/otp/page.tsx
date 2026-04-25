'use client';

import { useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function OtpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') ?? '';

    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resent, setResent] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (i: number, val: string) => {
        if (!/^\d?$/.test(val)) return;
        const next = [...digits];
        next[i] = val;
        setDigits(next);
        if (val && i < 5) inputs.current[i + 1]?.focus();
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = digits.join('');
        if (token.length < 6) { setError('Please enter the full 6-digit code.'); return; }
        setError('');
        setLoading(true);
        const supabase = createClient();
        const { error: err } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
        setLoading(false);
        if (err) { setError(err.message); return; }
        router.push('/dashboard');
    };

    const handleResend = async () => {
        const supabase = createClient();
        await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
        setResent(true);
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

                {/* Email icon */}
                <div style={{ textAlign: 'center', margin: '0.5rem 0 1.5rem' }}>
                    <div style={{ width: '72px', height: '72px', background: 'rgba(245,21,130,0.08)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f51582" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <polyline points="3 7 12 13 21 7" />
                        </svg>
                    </div>
                </div>

                <h1 className="auth-heading" style={{ textAlign: 'center' }}>Check your email</h1>
                <p className="auth-subheading" style={{ textAlign: 'center' }}>
                    We sent a 6-digit code to {email || 'your email'}. Enter it below.
                </p>

                {error && <div className="auth-error">{error}</div>}
                {resent && <div className="auth-success">Code resent! Check your inbox.</div>}

                <form onSubmit={handleSubmit}>
                    <div className="otp-inputs">
                        {digits.map((d, i) => (
                            <input
                                key={i}
                                ref={el => { inputs.current[i] = el; }}
                                type="text"
                                maxLength={1}
                                inputMode="numeric"
                                value={d}
                                onChange={e => handleChange(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                            />
                        ))}
                    </div>
                    <button className="auth-btn" type="submit" disabled={loading}>
                        {loading ? 'Verifying…' : 'Verify code'}
                    </button>
                </form>

                <p className="auth-footer-text" style={{ marginTop: '1rem' }}>
                    Didn&apos;t receive it?{' '}
                    <a href="#" onClick={e => { e.preventDefault(); handleResend(); }}>Resend code</a>
                </p>
                <p className="auth-footer-text">
                    <Link href="/auth/login">← Back to sign in</Link>
                </p>
                <p className="auth-powered-by">Powered by <strong>Supabase</strong></p>
            </div>
        </div>
    );
}

export default function OtpPage() {
    return (
        <Suspense>
            <OtpForm />
        </Suspense>
    );
}
