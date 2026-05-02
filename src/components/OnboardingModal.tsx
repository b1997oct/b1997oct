import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { RefreshCw, X } from 'lucide-react';

type ModalMode = 'create' | 'login' | 'edit';

const createSchema = yup.object({
    username: yup
        .string()
        .required('Username is required')
        .matches(/^\S+$/, 'Username must not contain spaces')
        .min(3, 'At least 3 characters')
        .max(30, 'At most 30 characters'),
    pin: yup
        .string()
        .required('PIN is required')
        .matches(/^\d+$/, 'PIN must be digits only')
        .min(4, 'At least 4 digits')
        .max(8, 'At most 8 digits'),
    theme: yup
        .string()
        .oneOf(['light', 'dark', 'system'] as const)
        .required(),
    client_control: yup.boolean().required(),
});

const loginSchema = yup.object({
    username: yup
        .string()
        .required('Username is required'),
    pin: yup
        .string()
        .required('PIN is required'),
});

const editSchema = yup.object({
    username: yup
        .string()
        .required('Username is required')
        .matches(/^\S+$/, 'Username must not contain spaces')
        .min(3, 'At least 3 characters')
        .max(30, 'At most 30 characters'),
    pin: yup
        .string()
        .optional()
        .transform((v) => (v === '' ? undefined : v))
        .matches(/^\d+$/, { message: 'PIN must be digits only', excludeEmptyString: true })
        .min(4, 'At least 4 digits')
        .max(8, 'At most 8 digits'),
    theme: yup
        .string()
        .oneOf(['light', 'dark', 'system'] as const)
        .required(),
    client_control: yup.boolean().required(),
});

type CreateFormData = yup.InferType<typeof createSchema>;
type LoginFormData = yup.InferType<typeof loginSchema>;
type EditFormData = yup.InferType<typeof editSchema>;
type FormData = CreateFormData | LoginFormData | EditFormData;

interface ExistingUser {
    _id: string;
    username: string;
    theme: string;
    client_control: boolean;
}

interface OnboardingModalProps {
    isOpen: boolean;
    onClose?: () => void;
    /** When true (non-edit), user can close via backdrop or X without submitting. */
    allowDismiss?: boolean;
    editUser?: ExistingUser | null;
    onComplete: (user: { _id: string; username: string; theme: string; client_control: boolean }, sessionId?: string | null) => void;
}

export const OnboardingModal = ({ isOpen, onClose, allowDismiss, editUser, onComplete }: OnboardingModalProps) => {
    const [generating, setGenerating] = useState(false);
    const [serverError, setServerError] = useState('');
    const [mode, setMode] = useState<ModalMode>(editUser ? 'edit' : 'create');

    const currentSchema = mode === 'login' ? loginSchema : mode === 'edit' ? editSchema : createSchema;

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<any>({
        resolver: yupResolver(currentSchema as any),
        defaultValues: {
            username: '',
            pin: '',
            theme: 'system',
            client_control: true,
        },
    });

    useEffect(() => {
        if (!isOpen) return;
        setServerError('');

        if (editUser) {
            setMode('edit');
            reset({
                username: editUser.username,
                pin: '',
                theme: editUser.theme as 'light' | 'dark' | 'system',
                client_control: editUser.client_control,
            });
        } else {
            setMode('create');
            reset({ username: '', pin: '', theme: 'system', client_control: true });
            generateUsername();
        }
    }, [isOpen, editUser]);

    const switchMode = (newMode: ModalMode) => {
        setServerError('');
        setMode(newMode);
        if (newMode === 'create') {
            reset({ username: '', pin: '', theme: 'system', client_control: true });
            generateUsername();
        } else if (newMode === 'login') {
            reset({ username: '', pin: '' });
        }
    };

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
            if (mode === 'login') {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: data.username, pin: (data as LoginFormData).pin }),
                });
                const result = await res.json();
                if (!res.ok) {
                    setServerError(result.error || 'Invalid credentials');
                    return;
                }
                onComplete(result.user, result.sessionId);
            } else if (mode === 'edit') {
                const editData = data as EditFormData;
                const payload: Record<string, unknown> = {
                    userId: editUser!._id,
                    username: editData.username,
                    theme: editData.theme,
                    client_control: editData.client_control,
                };
                if (editData.pin) {
                    payload.pin = editData.pin;
                }
                const res = await fetch('/api/user', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
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

    const isEdit = mode === 'edit';
    const isLogin = mode === 'login';
    const canDismiss = isEdit ? !!onClose : allowDismiss && !!onClose;

    const title = isEdit ? 'Edit Profile' : isLogin ? 'Welcome Back' : 'Welcome';
    const subtitle = isEdit
        ? 'Update your settings'
        : isLogin
            ? 'Log in with your username & PIN'
            : 'Set up your profile to get started';
    const submitLabel = isSubmitting
        ? (isEdit ? 'Saving...' : isLogin ? 'Logging in...' : 'Creating...')
        : (isEdit ? 'Save Changes' : isLogin ? 'Log In' : 'Create Account');
    const clientControlToggleId = isEdit ? 'edit-client-control-toggle' : 'client-control-toggle';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 animate-in fade-in duration-300"
            onClick={canDismiss ? onClose : undefined}
        >
            <div
                className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {title}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {subtitle}
                        </p>
                    </div>
                    {canDismiss && onClose && (
                        <button
                            type="button"
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
                            {!isLogin && (
                                <button
                                    type="button"
                                    onClick={generateUsername}
                                    disabled={generating}
                                    className="flex items-center justify-center px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                                    title="Generate username"
                                >
                                    <RefreshCw size={16} className={`text-slate-600 dark:text-slate-400 ${generating ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </div>
                        {errors.username && (
                            <p className="mt-1 text-xs text-red-500">{(errors.username as { message?: string }).message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            {isEdit ? 'New PIN (leave blank to keep current)' : 'PIN'}
                        </label>
                        <input
                            {...register('pin')}
                            type="text"
                            inputMode="numeric"
                            placeholder={isEdit ? 'Enter new PIN' : '4-8 digit PIN'}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        />
                        {errors.pin && (
                            <p className="mt-1 text-xs text-red-500">{(errors.pin as { message?: string }).message}</p>
                        )}
                    </div>

                    {!isLogin && (
                        <>
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

                            <label htmlFor={clientControlToggleId} className="flex items-center justify-between py-2">
                                <div>
                                    <div className="block cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Agent Control
                                    </div>
                                    <div className="mt-0.5 block cursor-pointer text-xs text-slate-500 dark:text-slate-400">
                                        Allow the agent to perform actions like clicks
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input id={clientControlToggleId} type="checkbox" {...register('client_control')} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:inset-s-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </label>
                        </>
                    )}

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
                        {submitLabel}
                    </button>

                    {!isEdit && (
                        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                            {isLogin ? (
                                <>
                                    Don&apos;t have an account?{' '}
                                    <button type="button" onClick={() => switchMode('create')} className="text-blue-500 hover:text-blue-400 font-semibold">
                                        Create one
                                    </button>
                                </>
                            ) : (
                                <>
                                    Already have an account?{' '}
                                    <button type="button" onClick={() => switchMode('login')} className="text-blue-500 hover:text-blue-400 font-semibold">
                                        Log in
                                    </button>
                                </>
                            )}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};
