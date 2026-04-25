'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Camera, CheckCircle, AlertCircle, Monitor, Mic, Wifi, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Step = 'system-check' | 'photo-id' | 'consent' | 'camera-test';

const systemChecks = [
    { id: 'browser', label: 'Browser compatibility', test: () => typeof window !== 'undefined' },
    {
        id: 'camera', label: 'Camera access', test: async () => {
            try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); s.getTracks().forEach(t => t.stop()); return true; }
            catch { return false; }
        }
    },
    {
        id: 'mic', label: 'Microphone access', test: async () => {
            try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); return true; }
            catch { return false; }
        }
    },
    { id: 'network', label: 'Network connection', test: () => navigator.onLine },
    { id: 'fullscreen', label: 'Fullscreen support', test: () => !!document.documentElement.requestFullscreen },
];

export default function ExamVerifyPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const examId = params?.id;
    const [gateReady, setGateReady] = useState(false);

    const [step, setStep] = useState<Step>('system-check');
    const [checkResults, setCheckResults] = useState<Record<string, boolean | null>>({});
    const [photoTaken, setPhotoTaken] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [consentGiven, setConsentGiven] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!examId) return;
        const key = `exam_password_verified_${examId}`;
        const raw = window.sessionStorage.getItem(key);
        if (!raw) {
            router.replace(`/exam/${examId}/password`);
            return;
        }
        try {
            const gate = JSON.parse(raw) as { expiresAt?: string };
            const expiresAt = gate?.expiresAt;
            if (!expiresAt || Date.now() > new Date(expiresAt).getTime()) {
                window.sessionStorage.removeItem(key);
                router.replace(`/exam/${examId}/password`);
                return;
            }
            setGateReady(true);
        } catch {
            window.sessionStorage.removeItem(key);
            router.replace(`/exam/${examId}/password`);
        }
    }, [examId, router]);

    // Callback ref: fires when the video element mounts/unmounts.
    // Assigns the stream immediately if already acquired (handles AnimatePresence timing).
    const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
        videoRef.current = node;
        if (node && cameraStreamRef.current) {
            node.srcObject = cameraStreamRef.current;
            node.play().catch(() => {});
        }
    }, []);

    // Run system checks
    useEffect(() => {
        if (!gateReady) return;
        if (step !== 'system-check') return;
        const run = async () => {
            const results: Record<string, boolean | null> = {};
            for (const chk of systemChecks) {
                results[chk.id] = null;
                setCheckResults({ ...results });
                await new Promise(r => setTimeout(r, 400));
                results[chk.id] = await Promise.resolve(chk.test());
                setCheckResults({ ...results });
            }
        };
        run();
    }, [gateReady, step]);

    const allChecksPassed = systemChecks.every(c => checkResults[c.id] === true);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            cameraStreamRef.current = stream;
            setCameraStream(stream);
            // Assign directly if the video element is already in the DOM
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
            }
        } catch (e) { console.error('Camera error', e); }
    }, []);

    useEffect(() => {
        if (!gateReady) return;
        if (step === 'photo-id' || step === 'camera-test') startCamera();
        return () => {
            cameraStreamRef.current?.getTracks().forEach(t => t.stop());
            cameraStreamRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gateReady, step]);

    const takePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d')!;
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        setPhotoUrl(canvasRef.current.toDataURL('image/jpeg'));
        setPhotoTaken(true);
    };

    const retakePhoto = () => { setPhotoTaken(false); setPhotoUrl(null); startCamera(); };

    const handleNext = () => {
        const flow: Step[] = ['system-check', 'photo-id', 'consent', 'camera-test'];
        const idx = flow.indexOf(step);
        if (idx < flow.length - 1) setStep(flow[idx + 1]);
    };

    const stepTitles: Record<Step, string> = {
        'system-check': 'System Check',
        'photo-id': 'Photo Verification',
        'consent': 'Proctoring Consent',
        'camera-test': 'Camera & Mic Test',
    };

    const steps: Step[] = ['system-check', 'photo-id', 'consent', 'camera-test'];
    const currentStepIdx = steps.indexOf(step);

    if (!gateReady) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">
                    Validating exam password access...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Pre-Exam Setup</h1>
                    <p className="text-gray-500 text-sm mt-1">Complete all steps before starting your exam</p>
                </div>

                {/* Step progress */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {steps.map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                                i < currentStepIdx ? 'bg-[#4b3fe9] text-white' :
                                    i === currentStepIdx ? 'bg-[#4b3fe9] text-white ring-4 ring-[#4b3fe9]/20' :
                                        'bg-gray-100 text-gray-400'
                            )}>
                                {i < currentStepIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
                            </div>
                            {i < steps.length - 1 && <div className={cn('w-8 h-0.5 rounded', i < currentStepIdx ? 'bg-[#4b3fe9]' : 'bg-gray-200')} />}
                        </div>
                    ))}
                </div>

                {/* Step card */}
                <AnimatePresence mode="wait">
                    <motion.div key={step}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">{stepTitles[step]}</h2>
                        </div>
                        <div className="p-6">
                            {/* System check step */}
                            {step === 'system-check' && (
                                <div className="space-y-3">
                                    {systemChecks.map(chk => {
                                        const result = checkResults[chk.id];
                                        return (
                                            <div key={chk.id} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-gray-50">
                                                <div className="flex items-center gap-3">
                                                    {chk.id === 'browser' && <Monitor className="w-4 h-4 text-gray-400" />}
                                                    {chk.id === 'camera' && <Camera className="w-4 h-4 text-gray-400" />}
                                                    {chk.id === 'mic' && <Mic className="w-4 h-4 text-gray-400" />}
                                                    {chk.id === 'network' && <Wifi className="w-4 h-4 text-gray-400" />}
                                                    {chk.id === 'fullscreen' && <Monitor className="w-4 h-4 text-gray-400" />}
                                                    <span className="text-sm font-medium text-gray-700">{chk.label}</span>
                                                </div>
                                                {result === null && <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />}
                                                {result === true && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                                {result === false && <AlertCircle className="w-4 h-4 text-red-500" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Photo ID step */}
                            {step === 'photo-id' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500">Take a clear photo of your face for identity verification. Ensure good lighting.</p>
                                    <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
                                        {!photoTaken ? (
                                            <video ref={videoCallbackRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                                        ) : (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={photoUrl!} alt="Captured" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                                        )}
                                        {!photoTaken && (
                                            <div className="absolute inset-0 flex items-end justify-center pb-4">
                                                <button onClick={takePhoto}
                                                    className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                                                    <Camera className="w-5 h-5 text-gray-900" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <canvas ref={canvasRef} className="hidden" />
                                    {photoTaken && (
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={retakePhoto} style={{ backgroundColor: '#330c26', borderColor: '#4a1138' }} className="flex-1 rounded-xl text-sm text-white hover:opacity-90">Retake</Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Consent step */}
                            {step === 'consent' && (
                                <div className="space-y-4">
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                        <p className="text-sm font-semibold text-amber-800 mb-2">AI Proctoring Notice</p>
                                        <ul className="text-xs text-amber-700 space-y-1.5">
                                            {['Your camera and microphone will be active throughout the exam',
                                                'AI will monitor for face detection, multiple people, and unusual behavior',
                                                'Tab switches, copy-paste attempts, and phone detection will be flagged',
                                                'Screenshots may be captured as evidence of proctoring incidents',
                                                'Your session data is retained for 30 days per our GDPR policy'].map(item => (
                                                    <li key={item} className="flex items-start gap-1.5"><span>•</span>{item}</li>
                                                ))}
                                        </ul>
                                    </div>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input type="checkbox" checked={consentGiven}
                                            onChange={e => setConsentGiven(e.target.checked)}
                                            className="mt-0.5 accent-[#4b3fe9]" />
                                        <span className="text-sm text-gray-700">
                                            I understand and consent to AI proctoring during this exam session.
                                        </span>
                                    </label>
                                </div>
                            )}

                            {/* Camera test step */}
                            {step === 'camera-test' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500">Ensure your camera is working and your face is clearly visible.</p>
                                    <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
                                        <video ref={videoCallbackRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 rounded-full px-2.5 py-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 pulse-dot" />
                                            <span className="text-white text-xs font-medium">Live</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3">
                                        <CheckCircle className="w-4 h-4 shrink-0" />
                                        <span>Your camera is working correctly. You&apos;re all set!</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-gray-100">
                            <Button
                                onClick={step === 'camera-test' ? () => router.push(`/exam/${examId}/take`) : handleNext}
                                disabled={
                                    (step === 'system-check' && !allChecksPassed) ||
                                    (step === 'photo-id' && !photoTaken) ||
                                    (step === 'consent' && !consentGiven)
                                }
                                className="w-full bg-[#4b3fe9] hover:bg-[#3228d4] text-white font-semibold rounded-xl gap-2"
                            >
                                {step === 'camera-test' ? 'Start Exam' : 'Continue'}
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
