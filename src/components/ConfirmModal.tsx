import React from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    description: string;
}

export const ConfirmModal = ({ isOpen, onClose, onConfirm, description }: ConfirmModalProps) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-slate-950/90 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-8 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-b-gray-300 dark:border-b-gray-700">
                    <button 
                        onClick={onClose}
                        className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors active:scale-95"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </button>
                    
                    <button 
                        onClick={onConfirm}
                        className="px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                    >
                        Confirm
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6 mx-auto">
                        <Trash2 size={24} strokeWidth={2} />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
};
