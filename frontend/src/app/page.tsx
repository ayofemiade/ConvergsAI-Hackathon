'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Sparkles, Bot, Phone, PhoneOff, ArrowRight, CheckCircle2,
    Users, BarChart3, TrendingUp, ShieldCheck, Database, LayoutDashboard,
    MessageSquare, Activity, Volume2, Coins, ArrowLeft, RefreshCw, Layers,
    Clock, Plus, Check, Play, User
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useIntro } from '@/components/IntroContext';
import { useAuth } from '@/components/AuthContext';

// Dynamic import for PhoneCallUI
const PhoneCallUI = dynamic(() => import('@/components/PhoneCallUI'), {
    ssr: false,
    loading: () => (
        <div className="h-[550px] w-full bg-slate-900/40 animate-pulse rounded-[2rem] flex flex-col items-center justify-center text-slate-500 gap-3 border border-white/5">
            <Loader2 className="animate-spin text-blue-500" size={24} />
            <span className="text-xs font-mono tracking-widest uppercase">Initializing Voice Channel...</span>
        </div>
    )
});

// Loading helper for inlined elements
const Loader2 = ({ className, size }: { className?: string; size?: number }) => (
    <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={className}
    >
        <RefreshCw size={size || 16} />
    </motion.div>
);

// Define stages
type DemoStage = 'landing' | 'onboarding' | 'orchestration' | 'dashboard';

export default function UnifiedDemoPage() {
    const [stage, setStage] = useState<DemoStage>('landing');
    const { replayIntro } = useIntro();
    const { user, userName } = useAuth();

    // Onboarding form state
    const [bizName, setBizName] = useState('');
    const [bizOffer, setBizOffer] = useState('');
    const [bizGoal, setBizGoal] = useState('sales'); // sales, support, support_sales
    const [onboardingStep, setOnboardingStep] = useState(0);

    // Simulated chat log for conversational onboarding
    const [chatMessages, setChatMessages] = useState<{ id: string; role: 'emma' | 'user'; text: string; options?: string[] }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Synthesis orchestration log state
    const [synthesisLogs, setSynthesisLogs] = useState<{ id: number; text: string; status: 'idle' | 'pending' | 'success' }[]>([
        { id: 1, text: 'Mapping Ideal Customer Profile (ICP)...', status: 'idle' },
        { id: 2, text: 'Crawling local business directories...', status: 'idle' },
        { id: 3, text: 'Synthesizing voice prompt & context registers...', status: 'idle' },
        { id: 4, text: 'Allocating browser WebRTC port mapping...', status: 'idle' },
        { id: 5, text: 'Spinning up live pipeline dashboard...', status: 'idle' },
    ]);
    const [synthesisProgress, setSynthesisProgress] = useState(0);

    // Dashboard dynamic metrics
    const [projectedRevenue, setProjectedRevenue] = useState('₦3,200,000');
    const [leads, setLeads] = useState<any[]>([]);
    const [activeCallStatus, setActiveCallStatus] = useState<'idle' | 'ringing' | 'connected' | 'ended'>('idle');
    const [activeAgentState, setActiveAgentState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

    // Real-time voice sync fields
    const [extractedData, setExtractedData] = useState({
        budget: 'Listening...',
        painPoint: 'Listening...',
        timeline: 'Listening...',
        nextAction: 'Listening...',
        sentiment: 'Neutral'
    });
    const [liveCallTranscript, setLiveCallTranscript] = useState<{ text: string; role: 'user' | 'assistant' } | null>(null);
    const [dashboardTranscripts, setDashboardTranscripts] = useState<{ id: string; role: 'user' | 'assistant'; text: string }[]>([]);

    // Phone iframe identifier to force restart if needed
    const [phoneKey, setPhoneKey] = useState(0);

    // Scroll chat onboarding to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Persistence hook: Load state on mount
    useEffect(() => {
        const savedStage = localStorage.getItem('demo_stage');
        if (savedStage === 'dashboard') {
            const savedName = localStorage.getItem('demo_bizName') || '';
            const savedOffer = localStorage.getItem('demo_bizOffer') || '';
            const savedGoal = localStorage.getItem('demo_bizGoal') || 'sales';
            const savedRevenue = localStorage.getItem('demo_projectedRevenue') || '₦3,200,000';
            const savedLeadsStr = localStorage.getItem('demo_leads');

            setBizName(savedName);
            setBizOffer(savedOffer);
            setBizGoal(savedGoal);
            setProjectedRevenue(savedRevenue);
            if (savedLeadsStr) {
                try {
                    setLeads(JSON.parse(savedLeadsStr));
                } catch (_) {}
            }
            setStage('dashboard');
        }
    }, []);

    // Persistence hook: Save dashboard state changes
    useEffect(() => {
        if (stage === 'dashboard') {
            localStorage.setItem('demo_stage', 'dashboard');
            localStorage.setItem('demo_bizName', bizName);
            localStorage.setItem('demo_bizOffer', bizOffer);
            localStorage.setItem('demo_bizGoal', bizGoal);
            localStorage.setItem('demo_leads', JSON.stringify(leads));
            localStorage.setItem('demo_projectedRevenue', projectedRevenue);
        }
    }, [stage, bizName, bizOffer, bizGoal, leads, projectedRevenue]);

    // Handle stage transitions
    const startOnboarding = () => {
        setStage('onboarding');
        setOnboardingStep(0);
        setChatMessages([
            {
                id: '1',
                role: 'emma',
                text: "Habari! I am Emma, your AI Growth Employee. Let's customize your target outbound system in 60 seconds. To start, what is the name of your business?"
            }
        ]);
    };

    // Chat onboarding sequence
    const handleSendOnboardingMessage = (text: string) => {
        if (!text.trim()) return;
        
        // Add user response
        const newMsgId = Math.random().toString();
        setChatMessages(prev => [...prev, { id: newMsgId, role: 'user', text }]);
        setChatInput('');

        if (onboardingStep === 0) {
            setBizName(text);
            setOnboardingStep(1);
            setTimeout(() => {
                setChatMessages(prev => [...prev, {
                    id: Math.random().toString(),
                    role: 'emma',
                    text: `Excellent! "${text}" sounds fantastic. Now, what services or products do you offer? Be brief (e.g. wholesale cosmetics in Nairobi, solar installations in Lagos, premium pastries).`
                }]);
            }, 800);
        } else if (onboardingStep === 1) {
            setBizOffer(text);
            setOnboardingStep(2);
            setTimeout(() => {
                setChatMessages(prev => [...prev, {
                    id: Math.random().toString(),
                    role: 'emma',
                    text: `Got it: "${text}". What is the primary role you'd like your AI Employee to execute first?`,
                    options: [
                        'Qualify catering contracts / bulk deals',
                        'Inbound customer support & issue triage',
                        'Cold customer re-engagement outreach'
                    ]
                }]);
            }, 800);
        }
    };

    const handleSelectOption = (option: string) => {
        // Add user selection
        setChatMessages(prev => [...prev, { id: Math.random().toString(), role: 'user', text: option }]);
        
        let goal = 'sales';
        if (option.toLowerCase().includes('support')) {
            goal = 'support';
        }
        setBizGoal(goal);
        setOnboardingStep(3);

        setTimeout(() => {
            setChatMessages(prev => [...prev, {
                id: Math.random().toString(),
                role: 'emma',
                text: `Perfect. I've engineered your outreach model. Click below to synthesize your autonomous agent and spin up your pipeline dashboard. Let's start the harvest!`
            }]);
        }, 800);
    };

    // Magical synthesis progress trigger
    const startSynthesis = () => {
        setStage('orchestration');
        setSynthesisProgress(0);

        let step = 0;
        const interval = setInterval(() => {
            setSynthesisLogs(prev => {
                const copy = [...prev];
                if (step > 0 && step <= copy.length) {
                    copy[step - 1].status = 'success';
                }
                if (step < copy.length) {
                    copy[step].status = 'pending';
                }
                return copy;
            });

            step++;
            setSynthesisProgress(prev => Math.min(prev + 20, 100));

            if (step > 5) {
                clearInterval(interval);
                setTimeout(() => {
                    // Populate dynamically generated leads and metrics
                    const currencySymbol = '₦';
                    const amountVal = bizGoal === 'support' ? '₦0 (CSAT Focus)' : '₦4,800,000';
                    setProjectedRevenue(amountVal);

                    // Generate localized African leads matching business
                    const generatedLeads = [
                        {
                            name: 'Adebayo Johnson',
                            role: 'Procurement, Bello Outlets',
                            score: 'Hot',
                            reason: `Active buyer of ${bizOffer || 'wholesale stock'}, looking for weekly contracts.`,
                            status: 'Ready to call'
                        },
                        {
                            name: 'Ngozi Obi',
                            role: 'CEO, Lagos Retail Co.',
                            score: 'Hot',
                            reason: `Requires high-volume ${bizOffer || 'services'} immediately.`,
                            status: 'Ready to call'
                        },
                        {
                            name: 'Chidi Okafor',
                            role: 'Director, Westside Hub',
                            score: 'Warm',
                            reason: `Expanding branches in Abuja, interested in bulk quote.`,
                            status: 'Ready to call'
                        },
                        {
                            name: 'Fatima Musa',
                            role: 'Operations, Northern Stores',
                            score: 'Hot',
                            reason: `Frustrated with current providers, wants reliable rider supply.`,
                            status: 'Ready to call'
                        },
                        {
                            name: 'Tunde Balogun',
                            role: 'Manager, Alaba Distro',
                            score: 'Warm',
                            reason: `Inquires about wholesale credit terms for ${bizOffer || 'products'}.`,
                            status: 'Ready to call'
                        }
                    ];
                    setLeads(generatedLeads);

                    // Transition to dashboard
                    setStage('dashboard');
                }, 1000);
            }
        }, 1200);
    };

    // Live WebRTC call listeners and handlers
    const handleTranscriptUpdate = (role: 'user' | 'assistant', text: string, isFinal: boolean) => {
        if (!text) return;
        const normalized = text.toLowerCase();

        if (isFinal) {
            setDashboardTranscripts(prev => [
                ...prev,
                { id: Math.random().toString(), role, text }
            ]);

            // Real-time client-side keyword extraction
            // Budget
            if (normalized.includes('naira') || normalized.includes('₦') || normalized.includes('budget') || normalized.includes('price') || normalized.includes('cost') || normalized.includes('pay') || normalized.includes('thousand') || normalized.includes('million') || normalized.includes('rate')) {
                setExtractedData(prev => ({
                    ...prev,
                    budget: 'Active Discussion (₦ / budget mentioned)'
                }));
            }
            // Pain points
            if (normalized.includes('rider') || normalized.includes('delivery') || normalized.includes('delay') || normalized.includes('late') || normalized.includes('broken') || normalized.includes('reliable') || normalized.includes('quality') || normalized.includes('wholesale') || normalized.includes('bulk')) {
                setExtractedData(prev => ({
                    ...prev,
                    painPoint: 'Wholesale scale / Delivery reliability'
                }));
            }
            // Timeline
            if (normalized.includes('tomorrow') || normalized.includes('next week') || normalized.includes('monday') || normalized.includes('schedule') || normalized.includes('calendar') || normalized.includes('time') || normalized.includes('date') || normalized.includes('zoom') || normalized.includes('meet') || normalized.includes('appointment')) {
                setExtractedData(prev => ({
                    ...prev,
                    timeline: 'Callback scheduled (Meeting request detected)'
                }));
            }
            // Next Action
            if (normalized.includes('email') || normalized.includes('invoice') || normalized.includes('proposal') || normalized.includes('send') || normalized.includes('number') || normalized.includes('whatsapp')) {
                setExtractedData(prev => ({
                    ...prev,
                    nextAction: 'Send wholesale proposal via email'
                }));
            }
            // Sentiment
            if (normalized.includes('yes') || normalized.includes('great') || normalized.includes('perfect') || normalized.includes('good') || normalized.includes('happy') || normalized.includes('interested')) {
                setExtractedData(prev => ({
                    ...prev,
                    sentiment: 'Interested (High)'
                }));
            } else if (normalized.includes('no') || normalized.includes('expensive') || normalized.includes('busy') || normalized.includes('later')) {
                setExtractedData(prev => ({
                    ...prev,
                    sentiment: 'Objecting (Medium)'
                }));
            }
        }
    };

    const handleCallStateUpdate = (callState: 'idle' | 'ringing' | 'connected' | 'ended') => {
        setActiveCallStatus(callState);
        
        // Dynamically shift lead statuses inside table depending on call progress
        if (callState === 'connected') {
            setLeads(prev => prev.map((l, i) => i === 0 ? { ...l, status: 'Connected' } : l));
        } else if (callState === 'ended') {
            setLeads(prev => prev.map((l, i) => i === 0 ? { ...l, status: 'Qualified / Meeting Scheduled' } : l));
        } else if (callState === 'ringing') {
            setLeads(prev => prev.map((l, i) => i === 0 ? { ...l, status: 'Calling...' } : l));
        }
    };

    const handleAgentStateUpdate = (agentState: 'idle' | 'listening' | 'thinking' | 'speaking') => {
        setActiveAgentState(agentState);
    };

    const handleLiveTranscriptUpdate = (lt: { text: string; role: 'user' | 'assistant' } | null) => {
        setLiveCallTranscript(lt);
    };

    const handleResetDashboard = () => {
        // Clear persistence
        localStorage.removeItem('demo_stage');
        localStorage.removeItem('demo_bizName');
        localStorage.removeItem('demo_bizOffer');
        localStorage.removeItem('demo_bizGoal');
        localStorage.removeItem('demo_leads');
        localStorage.removeItem('demo_projectedRevenue');

        setStage('landing');
        setBizName('');
        setBizOffer('');
        setBizGoal('sales');
        setOnboardingStep(0);
        setChatMessages([]);
        setPhoneKey(prev => prev + 1);
        setExtractedData({
            budget: 'Listening...',
            painPoint: 'Listening...',
            timeline: 'Listening...',
            nextAction: 'Listening...',
            sentiment: 'Neutral'
        });
        setDashboardTranscripts([]);
        setLiveCallTranscript(null);
    };

    // System Prompt override injected to make the agent pitch Nairobi/Lagos specific context
    const generatedSystemPrompt = `You are Emma, the Growth Operations officer for "${bizName || "our business"}". We offer ${bizOffer || "products and services"} in Africa. We are calling Adebayo Johnson from Bello Outlets to handle our primary objective: ${bizGoal === 'support' ? 'resolving customer issues and support' : 'wholesale contract and sales lead qualification'}. Talk in a professional, warm voice. Ask one question at a time. Keep your replies concise (under 2 sentences) to reduce network latency. Offer to schedule a meeting.`;

    return (
        <div className="min-h-screen bg-[#020512] text-white selection:bg-blue-500/30 font-sans overflow-x-hidden relative flex flex-col justify-between">
            {/* Ambient Background Starfield & Nebula Glows */}
            <div className="fixed inset-0 stars pointer-events-none z-0" />
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-900/10 via-transparent to-transparent opacity-65" />
                <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[130px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[20%] right-[10%] w-[450px] h-[450px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
            </div>

            {/* Premium Control Center Navbar */}
            <nav className="relative w-full z-50 pt-3 px-3 sm:pt-6 sm:px-6 shrink-0">
                <div className="max-w-7xl mx-auto glass-premium rounded-[1.2rem] sm:rounded-[2rem] h-16 sm:h-20 flex items-center justify-between px-4 sm:px-8 border border-white/5">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 text-sm">
                            C
                            <div className="absolute -top-0.5 -right-0.5 w-2 w-2 bg-green-400 rounded-full border border-slate-900 animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs sm:text-sm font-black uppercase tracking-[0.12em] sm:tracking-[0.15em]">ConvergsAI</span>
                            <span className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-wider">Control Hub</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold text-slate-400">
                        {stage === 'dashboard' && (
                            <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/5 py-1.5 px-3 rounded-full text-slate-300">
                                <Activity size={12} className="text-green-400 animate-pulse" />
                                <span className="font-mono text-[10px] uppercase text-green-400 font-bold">Autopilot Online</span>
                            </div>
                        )}
                        <span className="hidden sm:inline bg-white/5 px-3 py-1.5 rounded-full border border-white/5 uppercase tracking-wider text-[10px]">
                            {userName ? `Welcome, ${userName}` : 'Demo Sandbox'}
                        </span>
                    </div>
                </div>
            </nav>

            {/* STAGE CONTAINER */}
            <main className={`flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 relative z-10 flex items-center justify-center transition-all duration-300 ${
                (stage === 'onboarding' || stage === 'orchestration') 
                    ? 'py-3 min-h-[calc(100vh-110px)] sm:py-4 sm:min-h-[calc(100vh-140px)]' 
                    : 'py-4 min-h-[calc(100vh-130px)] sm:py-8 sm:min-h-[calc(100vh-180px)]'
            }`}>
                <AnimatePresence mode="wait">

                    {/* ──── STAGE 1: LANDING PAGE ──── */}
                    {stage === 'landing' && (
                        <motion.div
                            key="landing"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="w-full max-w-4xl text-center space-y-6 sm:space-y-10 flex flex-col items-center py-2 sm:py-4"
                        >
                            {/* Glowing Product Tag */}
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-300 text-[9px] sm:text-[10px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                <Sparkles size={11} className="text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
                                Interactive Sandbox Demonstration
                            </div>

                            {/* Headline */}
                            <div className="space-y-4 sm:space-y-6">
                                <h1 className="text-3xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] sm:leading-[1.05] max-w-3xl mx-auto">
                                    <span className="block text-slate-100">Hire Your Autonomous</span>
                                    <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-indigo-600 drop-shadow-sm pb-1">
                                        AI Growth Employee
                                    </span>
                                </h1>
                                <p className="text-sm sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed px-4">
                                    Emma handles bulk sales qualification, calls target prospects, and automates customer support in real-time. Experience the control room dashboard below.
                                </p>
                            </div>

                            {/* Main CTA */}
                            <div className="pt-2 sm:pt-4 flex flex-col items-center gap-3 w-full px-4 sm:px-0">
                                <motion.button
                                    whileHover={{ scale: 1.03, boxShadow: '0 0 50px rgba(99,102,241,0.5)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={startOnboarding}
                                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-base sm:text-xl font-extrabold py-4 px-8 sm:py-5 sm:px-16 rounded-full shadow-[0_0_35px_rgba(79,70,229,0.35)] group flex items-center justify-center gap-3 transition-all duration-300 border border-white/10"
                                >
                                    Activate AI Growth Employee
                                    <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
                                </motion.button>
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center">
                                    Instant WebRTC Connection • No Registration Required
                                </span>
                            </div>

                            {/* Core Micro-Features Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full pt-10 sm:pt-16 border-t border-white/5">
                                {[
                                    { title: 'Interactive Onboarding', icon: <MessageSquare className="text-blue-400" size={18} />, desc: 'Configure customized scripts and target ICP objectives via conversational chat.' },
                                    { title: 'Magical Asset Orchestration', icon: <Layers className="text-indigo-400" size={18} />, desc: 'Watch client pipelines crawl directories, map ICPs, and launch endpoints.' },
                                    { title: 'Real-Time Voice Sync Control', icon: <Activity className="text-emerald-400" size={18} />, desc: 'Connect direct to LiveKit WebRTC and view pipeline metrics extraction live.' }
                                ].map((item, idx) => (
                                    <div key={idx} className="glass-premium p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 text-left space-y-3 sm:space-y-4 hover:border-white/10 transition-colors">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                            {item.icon}
                                        </div>
                                        <h3 className="font-bold text-xs sm:text-sm text-slate-200">{item.title}</h3>
                                        <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ──── STAGE 2: CONVERSATIONAL ONBOARDING CHAT ──── */}
                    {stage === 'onboarding' && (
                        <motion.div
                            key="onboarding"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="w-full max-w-2xl glass-premium rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col h-[450px] max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-200px)] shadow-2xl"
                        >
                            {/* Chat Header */}
                            <div className="shrink-0 bg-white/4 border-b border-white/5 py-3.5 px-4 sm:py-5 sm:px-8 flex items-center justify-between">
                                <div className="flex items-center gap-2.5 sm:gap-3.5">
                                    <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5">
                                        <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
                                            <Bot size={16} className="text-blue-400 sm:hidden" />
                                            <Bot size={20} className="text-blue-400 hidden sm:block" />
                                        </div>
                                        <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-400 rounded-full border border-slate-950 animate-pulse" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-xs sm:text-sm font-black text-slate-200">Emma</span>
                                        <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Operations Officer</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStage('landing')}
                                    className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                                >
                                    <ArrowLeft size={14} /> Back
                                </button>
                            </div>

                            {/* Chat Conversation Scroll Feed */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4 custom-scrollbar bg-slate-950/20">
                                {chatMessages.map(msg => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className="flex flex-col gap-1.5 sm:gap-2 max-w-[85%]">
                                            <div className={`px-4 py-3 sm:px-5 sm:py-4.5 rounded-[1.2rem] sm:rounded-[1.5rem] text-[13px] sm:text-sm leading-[1.5] ${
                                                msg.role === 'user'
                                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                                    : 'bg-white/5 border border-white/5 text-slate-100 rounded-tl-sm backdrop-blur-sm'
                                            }`}>
                                                {msg.text}
                                            </div>

                                            {/* Interactive Multi-Choice Options */}
                                            {msg.options && onboardingStep === 2 && (
                                                <div className="flex flex-col gap-2 pt-1.5">
                                                    {msg.options.map((opt, i) => (
                                                        <motion.button
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            key={i}
                                                            onClick={() => handleSelectOption(opt)}
                                                            className="px-4 py-2.5 sm:px-5 sm:py-3.5 bg-slate-900 border border-white/5 rounded-xl text-left text-[11px] sm:text-xs font-semibold text-blue-300 hover:text-white hover:bg-blue-600/10 hover:border-blue-500/30 transition-all shadow"
                                                        >
                                                            {opt}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat Footer Input */}
                            {onboardingStep < 2 ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSendOnboardingMessage(chatInput);
                                    }}
                                    className="shrink-0 p-3 sm:p-5 bg-slate-950 border-t border-white/5 flex gap-2 sm:gap-3 items-center"
                                >
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder={onboardingStep === 0 ? "Enter business name..." : "Enter services offered..."}
                                        className="flex-1 bg-[#0d1527] text-white border border-white/10 rounded-xl px-4 py-2.5 sm:px-5 sm:py-4 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-600 font-medium transition-all"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!chatInput.trim()}
                                        className="bg-white text-black px-4 py-2.5 sm:px-6 sm:py-4 rounded-xl font-bold text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center shrink-0"
                                    >
                                        Send
                                    </button>
                                </form>
                            ) : onboardingStep === 3 ? (
                                <div className="shrink-0 p-4 sm:p-6 bg-slate-950 border-t border-white/5 flex justify-center">
                                    <motion.button
                                        whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(99,102,241,0.45)' }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={startSynthesis}
                                        className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white font-extrabold py-3 px-8 sm:py-4 sm:px-12 rounded-full text-sm sm:text-base border border-white/10 shadow-lg flex items-center gap-2 group transition-all"
                                    >
                                        Synthesize AI Employee
                                        <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                                    </motion.button>
                                </div>
                            ) : null}
                        </motion.div>
                    )}

                    {/* ──── STAGE 3: MAGICAL ORCHESTRATION ANIMATION ──── */}
                    {stage === 'orchestration' && (
                        <motion.div
                            key="orchestration"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="w-full max-w-xl text-center space-y-4 sm:space-y-6 flex flex-col items-center py-2"
                        >
                            {/* Synthesis brain graphic */}
                            <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                                    className="absolute inset-0 border-2 border-dashed border-blue-500/20 rounded-full"
                                />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                                    className="absolute inset-3 border border-dashed border-indigo-500/15 rounded-full"
                                />
                                {/* Glow core */}
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], boxShadow: ['0 0 25px rgba(59,130,246,0.4)', '0 0 50px rgba(79,70,229,0.7)', '0 0 25px rgba(59,130,246,0.4)'] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white/25 flex items-center justify-center shadow-lg"
                                >
                                    <Bot size={20} className="text-white sm:hidden" />
                                    <Bot size={24} className="text-white hidden sm:block" />
                                </motion.div>
                            </div>

                            <div className="space-y-1 w-full">
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Synthesizing Pipeline</h2>
                                <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-widest font-black">
                                    Crafting Agent Prompts & Context Registers
                                </p>
                            </div>

                            {/* Staggered progress checkpoints */}
                            <div className="w-full space-y-1.5 sm:space-y-2 text-left max-w-md mx-auto">
                                {synthesisLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className={`py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                                            log.status === 'success'
                                                ? 'bg-blue-600/5 border-blue-500/20 text-slate-100'
                                                : log.status === 'pending'
                                                    ? 'bg-white/5 border-white/10 text-white shadow-lg shadow-blue-500/5'
                                                    : 'bg-transparent border-transparent text-slate-600'
                                        }`}
                                    >
                                        <span className="text-[11px] sm:text-xs font-semibold truncate">
                                            {log.text}
                                        </span>
                                        {log.status === 'success' ? (
                                            <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                                        ) : log.status === 'pending' ? (
                                            <Loader2 size={11} className="text-blue-400 shrink-0" />
                                        ) : (
                                            <div className="w-3 h-3 rounded-full border border-slate-800 shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Dynamic Progress Bar */}
                            <div className="w-full max-w-md bg-white/5 h-1 sm:h-1.5 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    animate={{ width: `${synthesisProgress}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* ──── STAGE 4: CONTROL ROOM DASHBOARD ──── */}
                    {stage === 'dashboard' && (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-stretch pt-2"
                        >
                            {/* DASHBOARD HEADER - full span */}
                            <div className="lg:col-span-12 glass-premium p-4 sm:p-6 rounded-[1.2rem] sm:rounded-[2rem] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <LayoutDashboard size={16} className="text-blue-400 sm:hidden" />
                                        <LayoutDashboard size={18} className="text-blue-400 hidden sm:block" />
                                        <h2 className="text-sm sm:text-lg font-black text-slate-100 uppercase tracking-wide">
                                            {bizName || "Buka Foods"} Control Room
                                        </h2>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                                        Outreach Mode: {bizGoal === 'support' ? 'Customer Support Triage' : 'Sales Contract Qualification'} • Core target: {bizOffer || 'Traditional catering'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleResetDashboard}
                                    className="shrink-0 flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-slate-500 hover:text-white transition-colors bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 border border-white/5 hover:border-white/10 rounded-full uppercase tracking-wider"
                                >
                                    <RefreshCw size={10} /> Restart Demo
                                </button>
                            </div>

                            {/* COLUMN 1: WebRTC Client Phone Mockup Widget (lg-span-4) */}
                            <div className="lg:col-span-4 flex flex-col justify-start">
                                <div className="relative w-full max-w-[370px] mx-auto h-[530px] sm:h-[580px] lg:h-[600px]">
                                    {/* Hardward outline */}
                                    <div
                                        className="hidden sm:block absolute inset-0 rounded-[3.2rem] bg-gradient-to-b from-[#2c2c30] via-[#1c1c20] to-[#111115]"
                                        style={{ boxShadow: '0 50px 130px -20px rgba(0,0,0,0.95), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.5)' }}
                                    />
                                    {/* Frame lights */}
                                    <div className="hidden sm:block absolute inset-0 rounded-[3.2rem] overflow-hidden pointer-events-none">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.09]" />
                                        <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                    </div>

                                    {/* Screen Bezel Bevel (8px) on sm, border glass-premium card on mobile */}
                                    <div
                                        className="absolute inset-0 sm:inset-[8px] rounded-[1.5rem] sm:rounded-[2.6rem] bg-black overflow-hidden flex flex-col border border-white/5 sm:border-none shadow-2xl"
                                        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 2px 8px rgba(0,0,0,0.8)' }}
                                    >
                                        <PhoneCallUI
                                            key={phoneKey}
                                            initialPrompt={generatedSystemPrompt}
                                            mode={bizGoal === 'support' ? 'support' : 'sales'}
                                            persona="Emma"
                                            onTranscript={handleTranscriptUpdate}
                                            onLiveTranscript={handleLiveTranscriptUpdate}
                                            onCallStateChange={handleCallStateUpdate}
                                            onAgentStateChange={handleAgentStateUpdate}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* COLUMN 2: Operations Hub Pipeline Leads (lg-span-5) */}
                            <div className="lg:col-span-5 space-y-4 sm:space-y-6 flex flex-col">
                                {/* Statistics Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="glass-premium p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 space-y-1">
                                        <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">Projected Revenue</span>
                                        <div className="text-lg sm:text-xl font-black text-slate-200 tracking-tight">{projectedRevenue}</div>
                                    </div>
                                    <div className="glass-premium p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 space-y-1">
                                        <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">Prospects Discovered</span>
                                        <div className="text-lg sm:text-xl font-black text-slate-200 tracking-tight">42 Leads</div>
                                    </div>
                                </div>

                                {/* Leads Pipeline List */}
                                <div className="glass-premium p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 h-[380px] lg:h-auto flex-1 flex flex-col overflow-hidden">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Users size={14} className="text-indigo-400" /> Targeted Outbound Pipeline
                                        </h3>
                                        <span className="text-[9px] bg-white/5 text-slate-500 font-bold py-0.5 px-2 rounded">
                                            Lagos/Abuja Local Directory
                                        </span>
                                    </div>

                                    {/* Table container */}
                                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                        {leads.map((lead, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-3 rounded-xl sm:p-3.5 sm:rounded-2xl border transition-all duration-300 ${
                                                    idx === 0
                                                        ? 'bg-blue-600/5 border-blue-500/25 ring-1 ring-blue-500/10'
                                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-bold text-xs text-slate-200">{lead.name}</div>
                                                        <div className="text-[10px] text-slate-500 font-medium">{lead.role}</div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                        lead.score === 'Hot' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                    }`}>
                                                        {lead.score}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
                                                    {lead.reason}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5 justify-between">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Outreach status:</span>
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                                        lead.status.includes('Qualified')
                                                            ? 'text-emerald-400'
                                                            : lead.status.includes('Calling') || lead.status.includes('Connected')
                                                                ? 'text-blue-400 animate-pulse font-black'
                                                                : 'text-slate-500'
                                                    }`}>
                                                        {lead.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* COLUMN 3: Live Sync CRM Extractor & Wave (lg-span-3) */}
                            <div className="lg:col-span-3 space-y-4 sm:space-y-6 flex flex-col justify-start">
                                {/* Soundwave representation */}
                                <div className="glass-premium p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 text-center space-y-3 sm:space-y-4 flex flex-col items-center">
                                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                        Active Channel Frequency
                                    </span>

                                    {/* Wave dots */}
                                    <div className="flex gap-1 h-12 sm:h-14 items-center justify-center w-full">
                                        {activeCallStatus === 'connected' ? (
                                            Array.from({ length: 14 }).map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{
                                                        height: activeAgentState === 'speaking'
                                                            ? [6, Math.random() * 40 + 15, 6]
                                                            : activeAgentState === 'listening'
                                                                ? [6, Math.random() * 20 + 8, 6]
                                                                : 6
                                                    }}
                                                    transition={{ duration: 0.45, repeat: Infinity }}
                                                    className={`w-1 rounded-full ${
                                                        activeAgentState === 'speaking' ? 'bg-indigo-500' : 'bg-blue-400'
                                                    }`}
                                                />
                                            ))
                                        ) : (
                                            <div className="h-0.5 w-full bg-white/10" />
                                        )}
                                    </div>

                                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase font-black tracking-widest">
                                        {activeCallStatus === 'connected'
                                            ? `WebRTC: ${activeAgentState.toUpperCase()}`
                                            : `Line Status: ${activeCallStatus.toUpperCase()}`}
                                    </span>
                                </div>

                                {/* Extracted Metadata */}
                                <div className="glass-premium p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 h-[320px] lg:h-auto flex flex-col overflow-hidden">
                                    <div className="flex items-center gap-2 mb-4 shrink-0">
                                        <Database size={13} className="text-emerald-400" />
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">CRM Metadata Extractor</h3>
                                    </div>

                                    <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                                        {[
                                            { label: 'Budget/Pricing status', value: extractedData.budget, color: 'text-indigo-400' },
                                            { label: 'Primary Pain Point', value: extractedData.painPoint, color: 'text-indigo-400' },
                                            { label: 'Meeting Timeline', value: extractedData.timeline, color: 'text-indigo-400' },
                                            { label: 'CRM Next Action', value: extractedData.nextAction, color: 'text-indigo-400' },
                                            { label: 'Conversation Sentiment', value: extractedData.sentiment, color: extractedData.sentiment.includes('High') ? 'text-green-400 font-bold' : 'text-blue-400' },
                                        ].map((field, idx) => (
                                            <div key={idx} className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-0.5">
                                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                                    {field.label}
                                                </div>
                                                <div className={`text-xs font-semibold ${field.color}`}>
                                                    {field.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Live Transcripts Bubble Log */}
                                <div className="glass-premium p-4 sm:p-4.5 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 h-[150px] sm:h-[170px] overflow-hidden flex flex-col">
                                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 shrink-0">
                                        Live Transcript Feed
                                    </span>

                                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-[10px] sm:text-[11px] leading-[1.4]">
                                        {liveCallTranscript && (
                                            <div className="italic text-blue-300 font-medium">
                                                <span className="font-bold uppercase tracking-wider text-[8px] mr-1">
                                                    {liveCallTranscript.role === 'user' ? 'Client' : 'Emma'}:
                                                </span>
                                                {liveCallTranscript.text}...
                                            </div>
                                        )}

                                        {dashboardTranscripts.slice().reverse().map((dt) => (
                                            <div key={dt.id} className="text-slate-400 font-medium">
                                                <span className={`font-bold uppercase tracking-wider text-[8px] mr-1 ${
                                                    dt.role === 'user' ? 'text-blue-400' : 'text-indigo-400'
                                                }`}>
                                                    {dt.role === 'user' ? 'Client' : 'Emma'}:
                                                </span>
                                                {dt.text}
                                            </div>
                                        ))}

                                        {dashboardTranscripts.length === 0 && !liveCallTranscript && (
                                            <div className="text-slate-600 text-xs italic text-center pt-6 sm:pt-8">
                                                Speak into browser microphone to sync data...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* Premium Control Center Footer */}
            <footer className="relative z-10 py-6 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest shrink-0 border-t border-white/5 bg-[#020512]">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span>© 2026 ConvergsAI Inc. All Rights Reserved.</span>
                    <div className="flex gap-4">
                        <span className="hover:text-slate-400 cursor-pointer">Security Compliance</span>
                        <span className="hover:text-slate-400 cursor-pointer">Service Level Agreement</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
