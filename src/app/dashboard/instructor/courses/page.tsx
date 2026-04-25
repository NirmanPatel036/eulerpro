'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Plus, ChevronRight, Upload, Users, MoreHorizontal,
    Loader2, Trash2, AlertTriangle, BookOpen, Check, Pencil, Image as ImageIcon,
    EyeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { CoverImagePicker } from '@/components/shared/CoverImagePicker';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Course = {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    cover_image_url: string | null;
    created_at: string;
    course_enrollments: { count: number }[];
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.36, delay, ease: 'easeOut' as const },
});

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function InstructorCoursesPage() {
    const router = useRouter();
    const [courses,   setCourses]   = useState<Course[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState<string | null>(null);
    const [userId,    setUserId]    = useState<string | null>(null);

    /* create modal */
    const [showCreate,     setShowCreate]     = useState(false);
    const [creating,       setCreating]       = useState(false);
    const [newName,        setNewName]        = useState('');
    const [newCode,        setNewCode]        = useState('');
    const [newDesc,        setNewDesc]        = useState('');
    const [newCover,       setNewCover]       = useState<string | null>(null);
    const [showNewPicker,  setShowNewPicker]  = useState(false);

    /* edit modal */
    const [editTarget,     setEditTarget]     = useState<Course | null>(null);
    const [editName,       setEditName]       = useState('');
    const [editCode,       setEditCode]       = useState('');
    const [editDesc,       setEditDesc]       = useState('');
    const [editCover,      setEditCover]      = useState<string | null>(null);
    const [showEditPicker, setShowEditPicker] = useState(false);
    const [saving,         setSaving]         = useState(false);

    /* delete confirm */
    const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
    const [deleting,     setDeleting]     = useState(false);

    /* ── fetch ─── */
    const fetchCourses = useCallback(async () => {
        setLoading(true);
        setError(null);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError('Not authenticated'); setLoading(false); return; }
        setUserId(user.id);

        const { data, error: err } = await supabase
            .from('courses')
            .select('id, name, code, description, cover_image_url, created_at, course_enrollments(count)')
            .eq('instructor_id', user.id)
            .order('created_at', { ascending: false });

        if (err) setError(err.message);
        else setCourses((data ?? []) as Course[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    /* ── create course ─── */
    const handleCreate = async () => {
        if (!newName.trim() || !userId) return;
        setCreating(true);
        const supabase = createClient();
        const { data, error: err } = await supabase
            .from('courses')
            .insert({
                instructor_id:   userId,
                name:            newName.trim(),
                code:            newCode.trim() || null,
                description:     newDesc.trim() || null,
                cover_image_url: newCover || null,
            })
            .select('id, name, code, description, cover_image_url, created_at, course_enrollments(count)')
            .single();

        setCreating(false);
        if (err || !data) { setError(err?.message ?? 'Failed to create course'); return; }
        setCourses(p => [data as Course, ...p]);
        setShowCreate(false);
        setNewName(''); setNewCode(''); setNewDesc(''); setNewCover(null);
    };

    /* ── open edit modal ─── */
    const openEdit = (course: Course) => {
        setEditTarget(course);
        setEditName(course.name);
        setEditCode(course.code ?? '');
        setEditDesc(course.description ?? '');
        setEditCover(course.cover_image_url);
    };

    /* ── save edits ─── */
    const handleEdit = async () => {
        if (!editTarget || !editName.trim()) return;
        setSaving(true);
        const supabase = createClient();
        const { error: err } = await supabase
            .from('courses')
            .update({
                name:            editName.trim(),
                code:            editCode.trim() || null,
                description:     editDesc.trim() || null,
                cover_image_url: editCover || null,
                updated_at:      new Date().toISOString(),
            })
            .eq('id', editTarget.id);
        setSaving(false);
        if (err) { setError(err.message); return; }
        setCourses(p => p.map(c =>
            c.id === editTarget.id
                ? { ...c, name: editName.trim(), code: editCode.trim() || null,
                    description: editDesc.trim() || null, cover_image_url: editCover }
                : c
        ));
        setEditTarget(null);
    };

    /* ── delete course ─── */
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const supabase = createClient();
        await supabase.from('courses').delete().eq('id', deleteTarget.id);
        setCourses(p => p.filter(c => c.id !== deleteTarget.id));
        setDeleting(false);
        setDeleteTarget(null);
    };



    return (
        <div className="instructor-home">
            {/* Header */}
            <motion.div {...fadeUp(0)} className="instructor-home__header">
                <div>
                    <p className="instructor-home__breadcrumb">
                        <span>My Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="font-semibold text-gray-900">Courses</span>
                    </p>
                    <h1 className="instructor-home__title">My Courses</h1>
                </div>
                <div className="instructor-home__header-actions">
                    <Button
                        className="instructor-home__new-btn"
                        onClick={() => setShowCreate(true)}
                    >
                        <Plus className="w-4 h-4" /> New Course
                    </Button>
                </div>
            </motion.div>

            {/* Error */}
            {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {[1, 2, 3, 4].map(n => (
                        <div key={n} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col animate-pulse" style={{ minHeight: '320px' }}>
                            <div className="h-40 bg-gray-100" />
                            <div className="flex-1 p-4 flex flex-col gap-3">
                                <div className="h-4 bg-gray-100 rounded w-3/4" />
                                <div className="h-3 bg-gray-100 rounded w-1/2" />
                                <div className="h-8 bg-gray-100 rounded-lg w-full mt-auto" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Courses grid */}
            {!loading && (
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                >
                    {courses.length === 0 && (
                        <motion.div
                            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                            className="col-span-full py-16 flex flex-col items-center gap-2"
                        >
                            <BookOpen className="w-8 h-8 text-gray-200" />
                            <p className="text-sm font-medium text-gray-400">No courses yet</p>
                            <p className="text-xs text-gray-300">Click &ldquo;New Course&rdquo; to get started</p>
                        </motion.div>
                    )}

                    {courses.map(course => {
                        const enrolled = course.course_enrollments?.[0]?.count ?? 0;

                        return (
                            <motion.div
                                key={course.id}
                                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                                transition={{ duration: 0.32, ease: 'easeOut' }}
                                className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow group cursor-pointer"
                                style={{ minHeight: '320px' }}
                                onClick={() => router.push(`/dashboard/instructor/courses/${course.id}`)}
                            >
                                {/* ── Top half: cover image ─────────────────── */}
                                <div className="relative h-44 bg-linear-to-br from-indigo-400 to-purple-500 shrink-0">
                                    {course.cover_image_url && (
                                        <img
                                            src={course.cover_image_url}
                                            alt="Course cover"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    )}
                                    {/* dark scrim for text legibility */}
                                    <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />

                                    {/* ⋯ menu — top right */}
                                    <div className="absolute top-2.5 right-2.5" onClick={e => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0 bg-black/25 hover:bg-black/45 backdrop-blur-sm text-white rounded-lg border-0"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40 text-sm">
                                                <DropdownMenuItem
                                                    className="gap-2 cursor-pointer"
                                                    onClick={() => openEdit(course)}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                                                    onClick={() => setDeleteTarget(course)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Student count pill — bottom left of image */}
                                    <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
                                        <Users className="w-3 h-3 text-white/80" />
                                        <span className="text-[11px] font-semibold text-white/90">
                                            {enrolled} student{enrolled !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>

                                {/* ── Bottom half: info + actions ───────────── */}
                                <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4 gap-3">
                                    {/* Name + code */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-sm text-gray-900 truncate">{course.name}</p>
                                            {course.code && (
                                                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 shrink-0">{course.code}</span>
                                            )}
                                        </div>
                                        {course.description && (
                                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{course.description}</p>
                                        )}
                                    </div>



                                    {/* Action buttons */}
                                    <div className="flex gap-2 mt-auto">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-8 text-xs text-white hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 gap-1.5"
                                            onClick={e => { e.stopPropagation(); router.push(`/dashboard/instructor/courses/${course.id}`); }}
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            Enroll CSV
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 h-8 text-xs bg-[#4b3fe9] hover:bg-[#3228d4] text-white gap-1.5"
                                            onClick={e => { e.stopPropagation(); router.push(`/dashboard/instructor/courses/${course.id}`); }}
                                        >
                                            <EyeIcon className="w-3.5 h-3.5" /> Details
                                        </Button>
                                    </div>


                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {/* ── Create course modal ─────────────────────────────────────── */}
            <Dialog open={showCreate} onOpenChange={open => {
                if (!open) { setShowCreate(false); setNewName(''); setNewCode(''); setNewDesc(''); setNewCover(null); }
            }}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-500" /> New Course
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-400">
                            Create a course to organise students and publish exams.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 py-1">
                        {/* Cover picker */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">Cover Image</label>
                            <button
                                type="button"
                                onClick={() => setShowNewPicker(true)}
                                className={cn(
                                    'w-full h-28 rounded-xl border-2 border-dashed overflow-hidden transition-all group relative',
                                    newCover ? 'border-transparent' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                                )}
                            >
                                {newCover
                                    ? <img src={newCover} alt="cover" className="w-full h-full object-cover" />
                                    : (
                                        <div className="flex flex-col items-center justify-center h-full gap-1.5 text-gray-400 group-hover:text-indigo-500 transition-colors">
                                            <ImageIcon className="w-5 h-5" />
                                            <p className="text-xs font-medium">Add cover image</p>
                                        </div>
                                    )}
                                {newCover && (
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-xs font-semibold text-white">Change</p>
                                    </div>
                                )}
                            </button>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">Course Name <span className="text-red-400">*</span></label>
                            <Input value={newName} onChange={e => setNewName(e.target.value)}
                                placeholder="e.g. Software Engineering" className="h-9 text-sm"
                                onKeyDown={e => e.key === 'Enter' && handleCreate()} />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-xs font-medium text-gray-600">Course Code</label>
                                <Input value={newCode} onChange={e => setNewCode(e.target.value)}
                                    placeholder="e.g. CS402" className="h-9 text-sm" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">Description</label>
                            <Input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                                placeholder="Optional short description" className="h-9 text-sm" />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 mt-1">
                        <Button variant="ghost" className="text-xs h-9" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button className="text-xs h-9 bg-[#4b3fe9] hover:bg-[#3228d4] text-white gap-1.5"
                            onClick={handleCreate} disabled={!newName.trim() || creating}>
                            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit course modal ───────────────────────────────────────── */}
            <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-4 h-4 text-indigo-500" /> Edit Course
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-400">
                            Changes are saved immediately.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 py-1">
                        {/* Cover picker */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">Cover Image</label>
                            <button
                                type="button"
                                onClick={() => setShowEditPicker(true)}
                                className={cn(
                                    'w-full h-28 rounded-xl border-2 border-dashed overflow-hidden transition-all group relative',
                                    editCover ? 'border-transparent' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                                )}
                            >
                                {editCover
                                    ? <img src={editCover} alt="cover" className="w-full h-full object-cover" />
                                    : (
                                        <div className="flex flex-col items-center justify-center h-full gap-1.5 text-gray-400 group-hover:text-indigo-500 transition-colors">
                                            <ImageIcon className="w-5 h-5" />
                                            <p className="text-xs font-medium">Add cover image</p>
                                        </div>
                                    )}
                                {editCover && (
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-xs font-semibold text-white">Change</p>
                                    </div>
                                )}
                            </button>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">Course Name <span className="text-red-400">*</span></label>
                            <Input value={editName} onChange={e => setEditName(e.target.value)}
                                placeholder="e.g. Software Engineering" className="h-9 text-sm" />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-xs font-medium text-gray-600">Course Code</label>
                                <Input value={editCode} onChange={e => setEditCode(e.target.value)}
                                    placeholder="e.g. CS402" className="h-9 text-sm" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">Description</label>
                            <Input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                placeholder="Optional short description" className="h-9 text-sm" />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 mt-1">
                        <Button variant="ghost" className="text-xs h-9" onClick={() => setEditTarget(null)}>Cancel</Button>
                        <Button className="text-xs h-9 bg-[#4b3fe9] hover:bg-[#3228d4] text-white gap-1.5"
                            onClick={handleEdit} disabled={!editName.trim() || saving}>
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete confirm modal ────────────────────────────────────── */}
            <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" /> Delete Course?
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 mt-1">
                            <span className="font-semibold text-gray-700">&ldquo;{deleteTarget?.name}&rdquo;</span> and all its enrollment records will be permanently deleted. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" className="text-xs h-9" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white"
                            onClick={confirmDelete} disabled={deleting}>
                            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Cover image pickers ─────────────────────────────────────── */}
            <CoverImagePicker
                open={showNewPicker}
                onClose={() => setShowNewPicker(false)}
                onSelect={url => setNewCover(url)}
                bucket="course-covers"
                userId={userId}
                title="Choose Course Cover"
            />
            <CoverImagePicker
                open={showEditPicker}
                onClose={() => setShowEditPicker(false)}
                onSelect={url => setEditCover(url)}
                bucket="course-covers"
                userId={userId}
                title="Choose Course Cover"
            />
        </div>
    );
}
