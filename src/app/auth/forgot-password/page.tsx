'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const supabase = createClient();
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
        });
        setLoading(false);
        if (err) { setError(err.message); return; }
        setSent(true);
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

                <h1 className="auth-heading">Forgot password?</h1>
                <p className="auth-subheading">Enter your email and we&apos;ll send a reset link.</p>

                {sent ? (
                    <div className="auth-success">
                        Reset link sent! Check your inbox and follow the instructions.
                    </div>
                ) : (
                    <>
                        {error && <div className="auth-error">{error}</div>}
                        <form onSubmit={handleSubmit} autoComplete="on">
                            <label className="auth-label" htmlFor="email">Email</label>
                            <input
                                className="auth-input"
                                type="email"
                                id="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                            <button className="auth-btn" type="submit" disabled={loading}>
                                {loading ? 'Sending…' : 'Send reset link'}
                            </button>
                        </form>
                    </>
                )}

                <p className="auth-footer-text" style={{ marginTop: '1.5rem' }}>
                    <Link href="/auth/login">← Back to sign in</Link>
                </p>
                <p className="auth-powered-by">Powered by <strong>Supabase</strong></p>
            </div>
        </div>
    );
}
