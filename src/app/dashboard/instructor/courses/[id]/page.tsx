'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, Users, Upload, Loader2, Trash2, AlertTriangle,
    Pencil, Check, X, Search, Download, Plus, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

type Student = {
    id: string;
    student_name: string | null;
    student_email: string;
    enrollment_no: string | null;
    enrolled_at: string;
};

type Course = {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    cover_image_url: string | null;
};

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.32, delay, ease: 'easeOut' as const },
});

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CourseRosterPage() {
    const { id: courseId } = useParams<{ id: string }>();
    const router = useRouter();

    const [course,   setCourse]   = useState<Course | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [userId,   setUserId]   = useState<string | null>(null);
    const [error,    setError]    = useState<string | null>(null);
    const [search,   setSearch]   = useState('');

    /* inline edit */
    const [editId,      setEditId]      = useState<string | null>(null);
    const [editName,    setEditName]    = useState('');
    const [editEnroll,  setEditEnroll]  = useState('');
    const [saving,      setSaving]      = useState(false);

    /* delete */
    const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
    const [deleting,     setDeleting]     = useState(false);

    /* add student modal */
    const [showAdd,    setShowAdd]    = useState(false);
    const [addName,    setAddName]    = useState('');
    const [addEmail,   setAddEmail]   = useState('');
    const [addEnroll,  setAddEnroll]  = useState('');
    const [adding,     setAdding]     = useState(false);
    const [addError,   setAddError]   = useState<string | null>(null);

    /* CSV */
    const [uploading,    setUploading]    = useState(false);
    const [uploadMsg,    setUploadMsg]    = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    /* toast */
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    }, []);

    /* ── fetch ── */
    const fetchData = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser() as { data: { user: import('@supabase/supabase-js').User | null } };
        if (!user) { setError('Not authenticated'); setLoading(false); return; }
        setUserId(user.id);

        const [courseRes, rosterRes] = await Promise.all([
            supabase.from('courses').select('id, name, code, description, cover_image_url').eq('id', courseId).single(),
            supabase.from('course_enrollments')
                .select('id, student_name, student_email, enrollment_no, enrolled_at')
                .eq('course_id', courseId)
                .order('enrolled_at', { ascending: true }),
        ]);

        if (courseRes.error) { setError(courseRes.error.message); setLoading(false); return; }
        setCourse(courseRes.data as Course);
        setStudents((rosterRes.data ?? []) as Student[]);
        setLoading(false);
    }, [courseId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── inline save ── */
    const handleSave = async (id: string) => {
        if (!userId) return;
        setSaving(true);
        try {
            const res = await fetch(
                `${BACKEND}/api/v1/courses/${courseId}/roster/${id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instructor_id: userId,
                        student_name:  editName || null,
                        enrollment_no: editEnroll || null,
                    }),
                }
            );
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.detail ?? `Save failed (${res.status})`);
            }
            setStudents(p => p.map(s => s.id === id
                ? { ...s, student_name: editName || null, enrollment_no: editEnroll || null }
                : s
            ));
            setEditId(null);
            showToast('Student updated');
        } catch (e) {
            showToast((e as Error).message, false);
        } finally {
            setSaving(false);
        }
    };

    /* ── delete ── */
    const confirmDelete = async () => {
        if (!deleteTarget || !userId) return;
        setDeleting(true);
        const target = deleteTarget;
        try {
            const res = await fetch(
                `${BACKEND}/api/v1/courses/${courseId}/roster/${target.id}?instructor_id=${encodeURIComponent(userId)}`,
                { method: 'DELETE' }
            );
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.detail ?? `Delete failed (${res.status})`);
            }
            setStudents(p => p.filter(s => s.id !== target.id));
            setDeleteTarget(null);
            showToast(`${target.student_name ?? target.student_email} removed`);
        } catch (e) {
            showToast((e as Error).message, false);
        } finally {
            setDeleting(false);
        }
    };

    /* ── add single student ── */
    const handleAdd = async () => {
        if (!addEmail.trim() || !userId) return;
        setAdding(true);
        setAddError(null);
        const supabase = createClient();
        const { error: err } = await supabase.from('course_enrollments').insert({
            course_id:     courseId,
            student_email: addEmail.trim().toLowerCase(),
            student_name:  addName.trim() || null,
            enrollment_no: addEnroll.trim() || null,
        });
        setAdding(false);
        if (err) { setAddError(err.message); return; }
        setShowAdd(false);
        setAddName(''); setAddEmail(''); setAddEnroll('');
        showToast('Student added');
        fetchData();
    };

    /* ── CSV upload ── */
    const handleCsv = async (file: File) => {
        if (!userId) return;
        setUploading(true); setUploadMsg(null);
        const form = new FormData();
        form.append('file', file);
        try {
            const res = await fetch(
                `${BACKEND}/api/v1/courses/${courseId}/enroll-csv?instructor_id=${encodeURIComponent(userId)}`,
                { method: 'POST', body: form }
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json.detail ?? 'Upload failed');
            setUploadMsg(`✓ ${json.enrolled} student${json.enrolled !== 1 ? 's' : ''} synced`);
            fetchData();
        } catch (e) {
            setUploadMsg(`✗ ${(e as Error).message}`);
        } finally {
            setUploading(false);
        }
    };

    /* ── CSV export ── */
    const handleExport = () => {
        const rows = [['Name', 'Email', 'Enrollment No', 'Enrolled At']];
        students.forEach(s => rows.push([
            s.student_name ?? '',
            s.student_email,
            s.enrollment_no ?? '',
            fmtDate(s.enrolled_at),
        ]));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${course?.code ?? course?.name ?? 'roster'}_students.csv`;
        a.click();
    };

    const visible = students.filter(s =>
        (s.student_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        s.student_email.toLowerCase().includes(search.toLowerCase()) ||
        (s.enrollment_no ?? '').toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="instructor-home flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="instructor-home">
            {/* ── Header ── */}
            <motion.div {...fadeUp(0)} className="instructor-home__header">
                <div>
                    <p className="instructor-home__breadcrumb">
                        <span
                            className="cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => router.push('/dashboard/instructor/courses')}
                        >
                            Courses
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="font-semibold text-gray-900">{course?.name ?? 'Roster'}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                        <h1 className="instructor-home__title" style={{ marginBottom: 0 }}>Student Roster</h1>
                        {course?.code && (
                            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
                                {course.code}
                            </span>
                        )}
                        <Badge className="text-[11px] bg-gray-100 text-gray-600 border-gray-200 font-semibold">
                            {students.length} student{students.length !== 1 ? 's' : ''}
                        </Badge>
                    </div>
                </div>
                <div className="instructor-home__header-actions flex gap-2">
                    <Button
                        size="sm" variant="outline"
                        className="h-9 text-xs gap-1.5 text-white hover:text-white hover:border-white"
                        onClick={handleExport}
                    >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </Button>
                    <Button
                        size="sm" variant="outline"
                        className="h-9 text-xs gap-1.5 text-white hover:text-white hover:border-white"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                    >
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        Upload CSV
                    </Button>
                    <input ref={fileRef} type="file" accept=".csv" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleCsv(f); e.target.value = ''; }} />
                    <Button
                        size="sm"
                        className="h-9 text-xs gap-1.5 bg-[#4b3fe9] hover:bg-[#3228d4] text-white"
                        onClick={() => setShowAdd(true)}
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Student
                    </Button>
                </div>
            </motion.div>

            {/* ── Upload feedback ── */}
            <AnimatePresence>
                {uploadMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className={cn(
                            'mb-2 rounded-xl border px-4 py-2.5 text-sm font-medium',
                            uploadMsg.startsWith('✓') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'
                        )}
                    >
                        {uploadMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Error ── */}
            {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            {/* ── Course description ── */}
            {course?.description && (
                <motion.p {...fadeUp(0.04)} className="text-sm text-gray-400 mb-5 leading-relaxed">
                    Course Note: {course.description}
                </motion.p>
            )}

            {/* ── Search bar ── */}
            <motion.div {...fadeUp(0.06)} className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search name, email or enrolment no…"
                        className="pl-9 bg-white border-gray-200 text-sm h-9"
                    />
                </div>
                {search && (
                    <span className="text-xs text-gray-400">{visible.length} result{visible.length !== 1 ? 's' : ''}</span>
                )}
            </motion.div>

            {/* ── Table ── */}
            <motion.div {...fadeUp(0.1)} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[2rem_1fr_1.4fr_0.8fr_0.9fr_5rem] gap-x-4 px-5 py-3 border-b border-gray-100 bg-gray-50">
                    {['#', 'Name', 'Email', 'Enrolment No', 'Enrolled', ''].map(h => (
                        <span key={h} className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{h}</span>
                    ))}
                </div>

                {visible.length === 0 && (
                    <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
                        <Users className="w-8 h-8 text-gray-200" />
                        <p className="text-sm font-medium">No students yet</p>
                        <p className="text-xs text-gray-300">Upload a CSV or add students manually</p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {visible.map((s, i) => {
                        const isEditing = editId === s.id;
                        return (
                            <motion.div
                                key={s.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.22, delay: i < 20 ? i * 0.025 : 0 }}
                                className={cn(
                                    'grid grid-cols-[2rem_1fr_1.4fr_0.8fr_0.9fr_5rem] gap-x-4 px-5 py-3.5 items-center border-b border-gray-50 last:border-0 group',
                                    isEditing ? 'bg-indigo-50/50' : 'hover:bg-gray-50/60'
                                )}
                            >
                                {/* # */}
                                <span className="text-[11px] font-mono text-gray-300">{i + 1}</span>

                                {/* Name */}
                                {isEditing ? (
                                    <Input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder="Full name"
                                        autoFocus
                                    />
                                ) : (
                                    <p className="text-sm font-semibold text-gray-800 truncate">
                                        {s.student_name ?? <span className="text-gray-300 font-normal italic">No name</span>}
                                    </p>
                                )}

                                {/* Email */}
                                <p className="text-xs text-gray-500 truncate">{s.student_email}</p>

                                {/* Enrolment No */}
                                {isEditing ? (
                                    <Input
                                        value={editEnroll}
                                        onChange={e => setEditEnroll(e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder="e.g. 22CS001"
                                        onKeyDown={e => { if (e.key === 'Enter') handleSave(s.id); if (e.key === 'Escape') setEditId(null); }}
                                    />
                                ) : (
                                    <span className="text-[11px] font-medium text-gray-500">
                                        {s.enrollment_no ?? <span className="text-gray-300 italic">—</span>}
                                    </span>
                                )}

                                {/* Date */}
                                <span className="text-[11px] text-gray-400">{fmtDate(s.enrolled_at)}</span>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-1">
                                    {isEditing ? (
                                        <>
                                            <Button
                                                size="sm" variant="ghost"
                                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                disabled={saving}
                                                onClick={() => handleSave(s.id)}
                                            >
                                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            </Button>
                                            <Button
                                                size="sm" variant="ghost"
                                                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                                onClick={() => setEditId(null)}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                size="sm" variant="ghost"
                                                className="h-7 w-7 p-0 text-gray-800 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => {
                                                    setEditId(s.id);
                                                    setEditName(s.student_name ?? '');
                                                    setEditEnroll(s.enrollment_no ?? '');
                                                }}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                size="sm" variant="ghost"
                                                className="h-7 w-7 p-0 text-gray-800 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setDeleteTarget(s)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>

            {/* ── Add student modal ── */}
            <Dialog open={showAdd} onOpenChange={open => { if (!open) { setShowAdd(false); setAddName(''); setAddEmail(''); setAddEnroll(''); setAddError(null); } }}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-4 h-4 text-indigo-500" /> Add Student
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-400">
                            Manually add one student to this course roster.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 py-1">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">Email <span className="text-red-400">*</span></label>
                            <Input value={addEmail} onChange={e => setAddEmail(e.target.value)}
                                placeholder="student@example.com" className="h-9 text-sm"
                                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">Full Name</label>
                            <Input value={addName} onChange={e => setAddName(e.target.value)}
                                placeholder="e.g. Alice Johnson" className="h-9 text-sm" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">Enrolment No</label>
                            <Input value={addEnroll} onChange={e => setAddEnroll(e.target.value)}
                                placeholder="e.g. 22CS001" className="h-9 text-sm" />
                        </div>
                        {addError && <p className="text-xs text-red-500">{addError}</p>}
                    </div>
                    <DialogFooter className="gap-2 mt-1">
                        <Button variant="ghost" className="text-xs h-9" onClick={() => setShowAdd(false)}>Cancel</Button>
                        <Button className="text-xs h-9 bg-[#4b3fe9] hover:bg-[#3228d4] text-white gap-1.5"
                            onClick={handleAdd} disabled={!addEmail.trim() || adding}>
                            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Add
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete confirm modal ── */}
            <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" /> Remove Student?
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 mt-1">
                            <span className="font-semibold text-gray-700">{deleteTarget?.student_name ?? deleteTarget?.student_email}</span> will be removed from this course. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" className="text-xs h-9" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white"
                            onClick={confirmDelete} disabled={deleting}>
                            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Toast ── */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key="toast"
                        initial={{ opacity: 0, y: -16, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -16, scale: 0.95 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className={cn(
                            'fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg',
                            toast.ok
                                ? 'bg-white border-emerald-200 text-emerald-700'
                                : 'bg-white border-red-200 text-red-600'
                        )}
                    >
                        <span className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            toast.ok ? 'bg-emerald-500' : 'bg-red-500'
                        )} />
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
