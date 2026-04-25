'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mail, User, Shield, Calendar, Pencil, Check, X, Loader2, Phone, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AvatarCropModal from '@/components/instructor/AvatarCropModal';

const COUNTRY_CODES = [
	{ code: '+1',   name: 'US' },
	{ code: '+7',   name: 'RU' },
	{ code: '+20',  name: 'EG' },
	{ code: '+27',  name: 'ZA' },
	{ code: '+31',  name: 'NL' },
	{ code: '+33',  name: 'FR' },
	{ code: '+34',  name: 'ES' },
	{ code: '+39',  name: 'IT' },
	{ code: '+44',  name: 'GB' },
	{ code: '+49',  name: 'DE' },
	{ code: '+52',  name: 'MX' },
	{ code: '+55',  name: 'BR' },
	{ code: '+60',  name: 'MY' },
	{ code: '+61',  name: 'AU' },
	{ code: '+62',  name: 'ID' },
	{ code: '+63',  name: 'PH' },
	{ code: '+64',  name: 'NZ' },
	{ code: '+65',  name: 'SG' },
	{ code: '+81',  name: 'JP' },
	{ code: '+82',  name: 'KR' },
	{ code: '+86',  name: 'CN' },
	{ code: '+90',  name: 'TR' },
	{ code: '+91',  name: 'IN' },
	{ code: '+92',  name: 'PK' },
	{ code: '+234', name: 'NG' },
	{ code: '+254', name: 'KE' },
	{ code: '+880', name: 'BD' },
	{ code: '+966', name: 'SA' },
	{ code: '+971', name: 'AE' },
];

interface Profile {
	id: string;
	full_name: string | null;
	email: string;
	role: string;
	avatar_url: string | null;
	phone: string | null;
	created_at: string;
	updated_at: string;
}

export default function InstructorSettingsPage() {
	const supabase = createClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [avatarUploading, setAvatarUploading] = useState(false);
	const [cropModalOpen, setCropModalOpen] = useState(false);
	const [selectedImageForCrop, setSelectedImageForCrop] = useState<string | null>(null);
	const [editingName, setEditingName] = useState(false);
	const [nameInput, setNameInput] = useState('');
	const [savingName, setSavingName] = useState(false);
	const [editingPhone, setEditingPhone] = useState(false);
	const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
	const [phoneNumber, setPhoneNumber] = useState('');
	const [savingPhone, setSavingPhone] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [toast, setToast] = useState<string | null>(null);

	const showToast = (msg: string) => {
		setToast(msg);
		setTimeout(() => setToast(null), 3000);
	};

	useEffect(() => {
		(async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const { data, error } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', user.id)
				.single();

			if (error) { setError('Could not load profile.'); setLoading(false); return; }
			setProfile(data as Profile);
			setNameInput(data.full_name ?? '');
			if (data.phone) {
				const spaceIdx = (data.phone as string).indexOf(' ');
				if (spaceIdx > 0) {
					setPhoneCountryCode((data.phone as string).slice(0, spaceIdx));
					setPhoneNumber((data.phone as string).slice(spaceIdx + 1));
				} else {
					setPhoneNumber(data.phone as string);
				}
			}
			setLoading(false);
		})();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleAvatarClick = () => fileInputRef.current?.click();

	const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
		if (!allowedTypes.includes(file.type)) {
			setError('Only JPEG, PNG, WebP, or GIF images are allowed.');
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			setError('Image must be smaller than 5 MB.');
			return;
		}

		setError(null);
		const reader = new FileReader();
		reader.onload = (event) => {
			const imageDataUrl = event.target?.result as string;
			setSelectedImageForCrop(imageDataUrl);
			setCropModalOpen(true);
		};
		reader.readAsDataURL(file);
		e.target.value = '';
	};

	const handleCropComplete = async (croppedBlob: Blob) => {
		if (!profile) return;

		setAvatarUploading(true);
		setError(null);

		try {
			const ext = 'jpg';
			const path = `avatars/${profile.id}.${ext}`;

			const { error: uploadError } = await supabase.storage
				.from('profiles')
				.upload(path, croppedBlob, { upsert: true, contentType: 'image/jpeg' });

			if (uploadError) {
				setError('Upload failed. Please try again.');
				setAvatarUploading(false);
				return;
			}

			const { data: { publicUrl } } = supabase.storage
				.from('profiles')
				.getPublicUrl(path);

			const avatarUrl = `${publicUrl}?t=${Date.now()}`;

			const { error: updateError } = await supabase
				.from('profiles')
				.update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
				.eq('id', profile.id);

			if (updateError) {
				setError('Could not save avatar URL.');
				setAvatarUploading(false);
				return;
			}

			setProfile(p => p ? { ...p, avatar_url: avatarUrl } : p);
			setAvatarUploading(false);
			showToast('Profile photo updated!');
			setSelectedImageForCrop(null);
			setCropModalOpen(false);
		} catch (err) {
			setError('An error occurred while uploading.');
			setAvatarUploading(false);
		}
	};

	const handleSaveName = async () => {
		if (!profile || !nameInput.trim()) return;
		setSavingName(true);
		setError(null);

		const { error: updateError } = await supabase
			.from('profiles')
			.update({ full_name: nameInput.trim(), updated_at: new Date().toISOString() })
			.eq('id', profile.id);

		if (updateError) { setError('Could not update name.'); setSavingName(false); return; }

		setProfile(p => p ? { ...p, full_name: nameInput.trim() } : p);
		setSavingName(false);
		setEditingName(false);
		showToast('Name updated!');
	};

	const handleCancelName = () => {
		setNameInput(profile?.full_name ?? '');
		setEditingName(false);
	};

	const handleSavePhone = async () => {
		if (!profile || !phoneNumber.trim()) return;
		const digits = phoneNumber.replace(/[^\d]/g, '');
		if (digits.length < 4 || digits.length > 15) {
			setError('Please enter a valid phone number (4–15 digits).');
			return;
		}
		setSavingPhone(true);
		setError(null);

		const fullPhone = `${phoneCountryCode} ${phoneNumber.trim()}`;

		const { error: updateError } = await supabase
			.from('profiles')
			.update({ phone: fullPhone, updated_at: new Date().toISOString() })
			.eq('id', profile.id);

		if (updateError) { setError('Could not update phone number.'); setSavingPhone(false); return; }

		setProfile(p => p ? { ...p, phone: fullPhone } : p);
		setSavingPhone(false);
		setEditingPhone(false);
		showToast('Phone number updated!');
	};

	const handleCancelPhone = () => {
		if (profile?.phone) {
			const spaceIdx = profile.phone.indexOf(' ');
			setPhoneCountryCode(spaceIdx > 0 ? profile.phone.slice(0, spaceIdx) : '+91');
			setPhoneNumber(spaceIdx > 0 ? profile.phone.slice(spaceIdx + 1) : profile.phone);
		} else {
			setPhoneNumber('');
		}
		setEditingPhone(false);
	};

	const formatDate = (iso: string) =>
		new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
			</div>
		);
	}

	const initials = profile?.full_name
		?.split(' ')
		.map(n => n[0])
		.slice(0, 2)
		.join('')
		.toUpperCase() || 'I';

	const completionSteps = [
		{ label: 'Email address', done: true },
		{ label: 'Full name',     done: !!profile?.full_name },
		{ label: 'Profile photo', done: !!profile?.avatar_url },
		{ label: 'Phone number',  done: !!profile?.phone },
	];
	const completedCount = completionSteps.filter(s => s.done).length;
	const isProfileComplete = completedCount === completionSteps.length;

	return (
		<div className="min-h-screen bg-gray-50 px-6 py-10" style={{ fontFamily: "'DM Sans', ui-sans-serif, sans-serif" }}>
			<div className="max-w-2xl mx-auto space-y-5">

				{/* Toast */}
				{toast && (
					<motion.div
						initial={{ opacity: 0, y: -8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg"
					>
						{toast}
					</motion.div>
				)}

				{/* Page header */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
				>
					<h1 className="text-2xl font-bold text-gray-900">Settings</h1>
					<p className="text-sm text-gray-400 mt-0.5">Manage your instructor profile and preferences</p>
				</motion.div>

				{/* Profile completion */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.03 }}
				>
					{isProfileComplete ? (
						<div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3.5">
							<CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
							<p className="text-sm font-medium text-emerald-700">Your profile is complete!</p>
						</div>
					) : (
						<div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 space-y-3">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-semibold text-indigo-800">Complete your profile</p>
									<p className="text-xs text-indigo-600 mt-0.5">{completedCount} of {completionSteps.length} steps done</p>
								</div>
								<span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-lg">
									{completedCount}/{completionSteps.length}
								</span>
							</div>
							<div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
								<div
									className="h-full bg-indigo-500 rounded-full transition-all duration-500"
									style={{ width: `${(completedCount / completionSteps.length) * 100}%` }}
								/>
							</div>
							<div className="flex flex-wrap gap-2">
								{completionSteps.map(step => (
									<span
										key={step.label}
										className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
											step.done
												? 'bg-emerald-50 text-emerald-600'
												: 'bg-white text-indigo-700 border border-indigo-200'
										}`}
									>
										{step.done && <Check className="w-3 h-3" />}
										{step.label}
									</span>
								))}
							</div>
						</div>
					)}
				</motion.div>

				{/* Avatar card */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.05 }}
					className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
				>
					<div className="flex items-center gap-6">
						{/* Avatar */}
						<div className="relative shrink-0">
							<button
								onClick={handleAvatarClick}
								disabled={avatarUploading}
								aria-label="Upload profile photo"
								className="relative w-20 h-20 rounded-2xl overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
							>
								{profile?.avatar_url ? (
									<img
										src={profile.avatar_url}
										alt="Profile"
										className="w-full h-full object-cover"
									/>
								) : (
									<div
										className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
										style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
									>
										{initials}
									</div>
								)}
								{/* Hover overlay */}
								<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
									{avatarUploading
										? <Loader2 className="w-5 h-5 text-white animate-spin" />
										: <Camera className="w-5 h-5 text-white" />}
								</div>
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/jpeg,image/png,image/webp,image/gif"
								className="hidden"
								onChange={handleAvatarChange}
							/>
						</div>

						<div className="flex-1 min-w-0">
							<p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Profile Photo</p>
							<p className="text-sm text-gray-600">Click the photo icon to upload one</p>
							<p className="text-xs text-gray-400 mt-0.5">JPEG, PNG, WebP or GIF · Max 5 MB</p>
						</div>
					</div>

					{error && (
						<p className="mt-3 text-xs text-red-500 font-medium">{error}</p>
					)}
				</motion.div>

				{/* Info card */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
					className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50"
				>
					{/* Full name */}
					<div className="flex items-center gap-4 px-6 py-4">
						<div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
							<User className="w-4 h-4 text-indigo-500" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Full Name</p>
							{editingName ? (
								<div className="flex items-center gap-2">
									<input
										autoFocus
										value={nameInput}
										onChange={e => setNameInput(e.target.value)}
										onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') handleCancelName(); }}
										className="text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 w-full max-w-xs"
										maxLength={80}
									/>
									<button
										onClick={handleSaveName}
										disabled={savingName}
										aria-label="Save name"
										className="w-7 h-7 rounded-lg bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center transition-colors shrink-0"
									>
										{savingName
											? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
											: <Check className="w-3.5 h-3.5 text-white" />}
									</button>
									<button
										onClick={handleCancelName}
										aria-label="Cancel"
										className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
									>
										<X className="w-3.5 h-3.5 text-gray-500" />
									</button>
								</div>
							) : (
								<p className="text-sm font-semibold text-gray-900">{profile?.full_name || '—'}</p>
							)}
						</div>
						{!editingName && (
							<button
								onClick={() => setEditingName(true)}
								aria-label="Edit name"
								className="w-8 h-8 rounded-xl hover:bg-gray-50 flex items-center justify-center transition-colors shrink-0"
							>
								<Pencil className="w-3.5 h-3.5 text-gray-400" />
							</button>
						)}
					</div>

					{/* Email */}
					<div className="flex items-center gap-4 px-6 py-4">
						<div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
							<Mail className="w-4 h-4 text-blue-500" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Email</p>
							<p className="text-sm font-semibold text-gray-900 truncate">{profile?.email}</p>
						</div>
					</div>

					{/* Phone */}
					<div className="flex items-center gap-4 px-6 py-4">
						<div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
							<Phone className="w-4 h-4 text-sky-500" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Phone Number</p>
							{editingPhone ? (
								<div className="flex items-center gap-2 flex-wrap">
									<select
										value={phoneCountryCode}
										onChange={e => setPhoneCountryCode(e.target.value)}
										className="text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-sky-400 h-7.5"
									>
										{COUNTRY_CODES.map(c => (
											<option key={c.code} value={c.code}>{c.name} {c.code}</option>
										))}
									</select>
									<input
										autoFocus
										type="tel"
										value={phoneNumber}
										onChange={e => setPhoneNumber(e.target.value.replace(/[^\d\s\-()]/g, ''))}
										onKeyDown={e => { if (e.key === 'Enter') handleSavePhone(); if (e.key === 'Escape') handleCancelPhone(); }}
										placeholder="9876543210"
										className="text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-sky-400 w-36"
										maxLength={15}
									/>
									<button
										onClick={handleSavePhone}
										disabled={savingPhone}
										aria-label="Save phone"
										className="w-7 h-7 rounded-lg bg-sky-500 hover:bg-sky-600 flex items-center justify-center transition-colors shrink-0"
									>
										{savingPhone
											? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
											: <Check className="w-3.5 h-3.5 text-white" />}
									</button>
									<button
										onClick={handleCancelPhone}
										aria-label="Cancel"
										className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
									>
										<X className="w-3.5 h-3.5 text-gray-500" />
									</button>
								</div>
							) : (
								profile?.phone
									? <p className="text-sm font-semibold text-gray-900">{profile.phone}</p>
									: <p className="text-sm text-gray-400">Not set</p>
							)}
						</div>
						{!editingPhone && (
							<button
								onClick={() => setEditingPhone(true)}
								aria-label="Edit phone"
								className="w-8 h-8 rounded-xl hover:bg-gray-50 flex items-center justify-center transition-colors shrink-0"
							>
								<Pencil className="w-3.5 h-3.5 text-gray-400" />
							</button>
						)}
					</div>



					{/* Role */}
					<div className="flex items-center gap-4 px-6 py-4">
						<div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
							<Shield className="w-4 h-4 text-emerald-500" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Role</p>
							<span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold capitalize">
								{profile?.role}
							</span>
						</div>
					</div>

					{/* Member since */}
					<div className="flex items-center gap-4 px-6 py-4">
						<div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
							<Calendar className="w-4 h-4 text-amber-500" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Member Since</p>
							<p className="text-sm font-semibold text-gray-900">
								{profile?.created_at ? formatDate(profile.created_at) : '—'}
							</p>
						</div>
					</div>
				</motion.div>

			</div>

			{/* Avatar Crop Modal */}
			<AvatarCropModal
				isOpen={cropModalOpen}
				imageSrc={selectedImageForCrop || ''}
				onClose={() => {
					setCropModalOpen(false);
					setSelectedImageForCrop(null);
				}}
				onCropComplete={handleCropComplete}
				isLoading={avatarUploading}
			/>
		</div>
	);
}
