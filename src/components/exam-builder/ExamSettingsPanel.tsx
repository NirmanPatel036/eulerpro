'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

interface ExamSettings {
    title: string; description: string; duration: number;
    passing_score: number; allow_review: boolean;
}

interface Props {
    open: boolean;
    onClose: () => void;
    settings: ExamSettings;
    onChange: (s: ExamSettings) => void;
}

export default function ExamSettingsPanel({ open, onClose, settings, onChange }: Props) {
    const set = (patch: Partial<ExamSettings>) => onChange({ ...settings, ...patch });

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-md rounded-2xl p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-gray-100">
                    <DialogTitle className="text-lg font-bold">Exam Settings</DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                    <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Exam Title *</Label>
                        <Input value={settings.title} onChange={e => set({ title: e.target.value })}
                            placeholder="e.g. Midterm — Computer Networks"
                            className="border-gray-200 rounded-xl h-9 text-sm" />
                    </div>

                    <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Description</Label>
                        <Textarea value={settings.description} onChange={e => set({ description: e.target.value })}
                            placeholder="Optional instructions for students…"
                            className="border-gray-200 rounded-xl text-sm resize-none" rows={3} />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Duration (minutes)</Label>
                            <Input type="number" min={5} max={360} value={settings.duration}
                                onChange={e => set({ duration: Math.max(5, Math.min(360, +e.target.value)) })}
                                className="border-gray-200 rounded-xl h-9 text-sm" />
                        </div>
                        <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Passing Score (%)</Label>
                            <Input type="number" min={0} max={100} value={settings.passing_score}
                                onChange={e => set({ passing_score: Math.max(0, Math.min(100, +e.target.value)) })}
                                className="border-gray-200 rounded-xl h-9 text-sm" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Allow result review</p>
                            <p className="text-xs text-gray-400">Students can review answers after submission</p>
                        </div>
                        <Switch checked={settings.allow_review} onCheckedChange={v => set({ allow_review: v })} />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100">
                    <Button onClick={onClose}
                        className="w-full bg-[#4b3fe9] hover:bg-[#3228d4] text-white font-semibold rounded-xl">
                        Save Settings
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
