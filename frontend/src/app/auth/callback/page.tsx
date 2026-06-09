'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleAuthCallback = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (data?.session) {
                router.push('/');
            } else if (error) {
                console.error('Error during auth callback:', error.message);
                router.push('/');
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-blue-400 font-mono text-sm tracking-widest uppercase animate-pulse">
                    Authenticating...
                </p>
            </div>
        </div>
    );
}
