'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const CODE_LENGTH = 6;

export default function ExamPasswordPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const examId = params?.id;

  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, value: string) => {
    const nextChar = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1);
    const next = [...code];
    next[index] = nextChar;
    setCode(next);
    if (nextChar && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const text = event.clipboardData
      .getData('text')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, CODE_LENGTH);

    if (!text) return;
    const next = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < text.length; i += 1) next[i] = text[i];
    setCode(next);
    const focusIndex = Math.min(text.length, CODE_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!examId) return;

    const password = code.join('');
    if (password.length < CODE_LENGTH) {
      setError('Enter all 6 characters to continue.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
      const response = await fetch(`${backendBaseUrl}/api/v1/notifications/exam-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: examId, password }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string; expires_at?: string };
      if (!response.ok || !payload.ok || !payload.expires_at) {
        setError(payload.error ?? 'Unable to verify exam password.');
        return;
      }

      window.sessionStorage.setItem(
        `exam_password_verified_${examId}`,
        JSON.stringify({ expiresAt: payload.expires_at }),
      );
      router.push(`/exam/${examId}/verify`);
    } catch {
      setError('Network error while verifying password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#dbeafe_0%,transparent_40%),radial-gradient(circle_at_85%_20%,#fef3c7_0%,transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] flex items-center justify-center p-5">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md rounded-3xl border border-indigo-100 bg-white/90 backdrop-blur p-7 shadow-[0_20px_60px_-30px_rgba(79,70,229,0.4)]"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-600 via-blue-500 to-cyan-400 shadow-lg shadow-indigo-200">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3 5 6v6c0 5 3.4 7.7 7 9 3.6-1.3 7-4 7-9V6l-7-3Z" />
              <path d="m9.3 12 1.8 1.8 3.6-3.6" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Exam Password Gate</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Enter your 6-character exam password from the reminder email.
            Access is available from 15 minutes before start until 15 minutes after.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div className="mb-5 flex items-center justify-center gap-2">
            {code.map((char, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputsRef.current[index] = element;
                }}
                type="text"
                value={char}
                maxLength={1}
                autoComplete="off"
                className="h-12 w-11 rounded-xl border border-slate-200 bg-white text-center text-lg font-bold uppercase tracking-[0.15em] text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
              />
            ))}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {loading ? 'Verifying...' : 'Continue to Verification'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
