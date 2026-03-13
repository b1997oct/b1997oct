import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { RefreshCw, X } from 'lucide-react';

const schema = yup.object({
    username: yup
        .string()
        .required('Username is required')
        .matches(/^\S+$/, 'Username must not contain spaces')
        .min(3, 'At least 3 characters')
        .max(30, 'At most 30 characters'),
    theme: yup
        .string()
        .oneOf(['light', 'dark', 'system'] as const)
        .required(),
    client_control: yup.boolean().required(),
});

type FormData = yup.InferType<typeof schema>;

interface ExistingUser {
    _id: string;
    username: string;
    theme: string;
    client_control: boolean;
}

interface OnboardingModalProps {
    isOpen: boolean;
    onClose?: () => void;
    editUser?: ExistingUser | null;
    onComplete: (user: { _id: string; username: string; theme: string; client_control: boolean }) => void;
}

export const OnboardingModal = ({ isOpen, onClose, editUser, onComplete }: OnboardingModalProps) => {
    const [generating, setGenerating] = useState(false);
    const [serverError, setServerError] = useState('');
    const isEditMode = !!editUser;

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: yupResolver(schema),
        defaultValues: {
            username: '',
            theme: 'system',
            client_control: true,
        },
    });

    useEffect(() => {
        if (!isOpen) return;
        setServerError('');

        if (editUser) {
            reset({
                username: editUser.username,
                theme: editUser.theme as FormData['theme'],
                client_control: editUser.client_control,
            });
        } else {
            reset({ username: '', theme: 'system', client_control: true });
            generateUsername();
        }
    }, [isOpen, editUser]);

    const generateUsername = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/username-generator');
            const data = await res.json();
            if (data.username) {
                setValue('username', data.username, { shouldValidate: true });
            }
        } catch {
            // silently fail
        } finally {
            setGenerating(false);
        }
    };

    const onSubmit = async (data: FormData) => {
        setServerError('');
        try {
            if (isEditMode) {
                const res = await fetch('/api/user', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: editUser!._id, ...data }),
                });
                const result = await res.json();
                if (!res.ok) {
                    setServerError(result.error || 'Something went wrong');
                    return;
                }
                onComplete(result.user);
            } else {
                const res = await fetch('/api/user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await res.json();
                if (!res.ok) {
                    setServerError(result.error || 'Something went wrong');
                    return;
                }
                onComplete(result.user);
            }
        } catch {
            setServerError('Network error. Please try again.');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 animate-in fade-in duration-300"
            onClick={isEditMode ? onClose : undefined}
        >
            <div
                className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {isEditMode ? 'Edit Profile' : 'Welcome'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {isEditMode ? 'Update your settings' : 'Set up your profile to get started'}
                        </p>
                    </div>
                    {isEditMode && onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} className="text-slate-500" />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Username
                        </label>
                        <div className="flex gap-2">
                            <input
                                {...register('username')}
                                placeholder="your_username"
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                            />
                            <button
                                type="button"
                                onClick={generateUsername}
                                disabled={generating}
                                className="flex items-center justify-center px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                                title="Generate username"
                            >
                                <RefreshCw size={16} className={`text-slate-600 dark:text-slate-400 ${generating ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        {errors.username && (
                            <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Theme
                        </label>
                        <select
                            {...register('theme')}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Agent Control
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Allow the agent to perform actions like clicks
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" {...register('client_control')} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:inset-s-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {serverError && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-xs text-red-600 dark:text-red-400">{serverError}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] text-sm"
                    >
                        {isSubmitting
                            ? (isEditMode ? 'Saving...' : 'Creating...')
                            : (isEditMode ? 'Save Changes' : 'Get Started')
                        }
                    </button>
                </form>
            </div>
        </div>
    );
};
