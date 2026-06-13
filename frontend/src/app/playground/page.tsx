'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlaygroundRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.push('/');
    }, [router]);

    return (
        <div className="min-h-screen bg-[#020512] flex items-center justify-center font-mono text-slate-500 text-xs uppercase tracking-widest">
            Loading Sandbox...
        </div>
    );
}
