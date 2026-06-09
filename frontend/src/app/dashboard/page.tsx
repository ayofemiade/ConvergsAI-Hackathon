'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Bot, Plus, Target, RefreshCw, Phone, Play, 
  Sparkles, CheckCircle, AlertCircle, TrendingUp, X,
  Briefcase, Mail, PhoneCall, Building
} from 'lucide-react';
import { apiClient, Lead, Campaign } from '@/lib/api';
import PhoneCallUI from '@/components/PhoneCallUI';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [activeCallLead, setActiveCallLead] = useState<Lead | null>(null);

  // ICP Form Settings
  const [icpName, setIcpName] = useState('Default B2B ICP');
  const [targetIndustry, setTargetIndustry] = useState('Solar Installers');
  const [targetSize, setTargetSize] = useState('10-50');
  const [painPoints, setPainPoints] = useState('High volume of missed sales calls and lack of booking automation.');

  // Add Lead Form
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newCompanySize, setNewCompanySize] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
      fetchInitialData();
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      fetchInitialData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [fetchedLeads, fetchedCampaigns] = await Promise.all([
        apiClient.fetchLeads(),
        apiClient.fetchCampaigns()
      ]);
      setLeads(fetchedLeads);
      setCampaigns(fetchedCampaigns);
      if (fetchedCampaigns.length > 0) {
        const active = fetchedCampaigns[0];
        setSelectedCampaign(active);
        setIcpName(active.name);
        setTargetIndustry(active.target_industry || '');
        setTargetSize(active.target_company_size || '');
        setPainPoints(active.pain_points || '');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Campaign = {
        name: icpName,
        target_industry: targetIndustry,
        target_company_size: targetSize,
        pain_points: painPoints,
        system_prompt_override: `You are Emma, representing a company targeting ${targetIndustry}. Their main challenge is ${painPoints}. Keep answers brief.`
      };
      const created = await apiClient.createCampaign(payload);
      setCampaigns(prev => [created, ...prev]);
      setSelectedCampaign(created);
      alert('ICP Settings Saved successfully!');
    } catch (err) {
      console.error('Failed to save campaign:', err);
    }
  };

  const handleQualifyLeads = async () => {
    try {
      setQualifying(true);
      const icp = {
        target_industry: targetIndustry,
        target_company_size: targetSize,
        pain_points: painPoints
      };
      const scoredLeads = await apiClient.qualifyLeads(icp);
      
      const updated = await apiClient.fetchLeads();
      setLeads(updated);
      
      alert(`AI Qualification complete! Scored ${scoredLeads.length} new leads.`);
    } catch (err) {
      console.error('Failed to qualify leads:', err);
      alert('Failed to qualify leads. Please ensure API key and database are set up.');
    } finally {
      setQualifying(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newPhone) {
      alert('First Name and Phone are required.');
      return;
    }

    try {
      const payload = {
        first_name: newFirstName,
        last_name: newLastName,
        company: newCompany,
        email: newEmail,
        phone: newPhone,
        industry: newIndustry,
        company_size: newCompanySize
      };
      const added = await apiClient.addLead(payload);
      setLeads(prev => [added, ...prev]);
      setShowAddLeadModal(false);
      setNewFirstName('');
      setNewLastName('');
      setNewCompany('');
      setNewEmail('');
      setNewPhone('');
      setNewIndustry('');
      setNewCompanySize('');
    } catch (err) {
      console.error('Failed to add lead:', err);
    }
  };

  const triggerCall = (lead: Lead) => {
    setActiveCallLead(lead);
    setShowCallModal(true);
  };

  // Metrics
  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.ai_score === 'hot').length;
  const warmLeads = leads.filter(l => l.ai_score === 'warm').length;
  const qualifiedLeads = leads.filter(l => l.status === 'qualified' || l.status === 'converted').length;
  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  const getAgentPrompt = (lead: Lead | null) => {
    if (!lead) return '';
    return `You are Emma, a top-tier Business Growth Associate. You are calling ${lead.first_name} ${lead.last_name || ''} from ${lead.company || 'their business'}. 
They are in the ${lead.industry || 'local'} industry.
Our target ICP parameters are:
- Target Industry: ${targetIndustry}
- Main pain points: ${painPoints}
Your goal is to introduce yourself, verify if they struggle with these pain points, and book a brief strategy session. Keep your replies under 15 words and extremely human-like. Ask only one question at a time.`;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-blue-500/30">
      {/* Background aurora gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-15%] w-[60%] h-[60%] bg-indigo-600/10 blur-[130px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/5 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-4">
              <div className="w-44 h-12 relative">
                <Image src="/convergsai logo nb.png" alt="ConvergsAI" fill sizes="176px" className="object-contain animate-pulse" />
              </div>
            </Link>
            <div className="h-6 w-px bg-white/10 hidden md:block" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Admin Console</h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">ICP Qualification & Outbound Dialer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowAddLeadModal(true)}
              className="bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] text-white py-2.5 px-5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
            >
              <Plus size={14} /> Add Lead
            </button>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                setUser(null);
                router.push('/');
              }}
              className="bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-slate-300 py-2.5 px-5 rounded-2xl text-xs font-bold transition-all active:scale-[0.98]"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Leads Sourced', value: totalLeads, icon: <Users className="text-blue-400" />, desc: 'All raw prospects' },
            { label: 'AI Qualified Leads', value: qualifiedLeads, icon: <Target className="text-purple-400" />, desc: 'Marked hot/warm' },
            { label: 'Hot fit leads', value: hotLeads, icon: <Sparkles className="text-amber-400 animate-pulse" />, desc: '🔥 Optimal matching profile' },
            { label: 'Profile match rate', value: `${conversionRate}%`, icon: <TrendingUp className="text-green-400" />, desc: 'Sourcing quality score' }
          ].map((metric, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-slate-900/40 backdrop-blur-xl p-5 rounded-3xl border border-white/5 flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{metric.label}</div>
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-sm">{metric.icon}</div>
              </div>
              <div>
                <div className="text-2xl font-black text-white tracking-tight mb-1">{metric.value}</div>
                <div className="text-[10px] text-slate-400 font-medium">{metric.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left panel: ICP Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400"><Target size={18} /></div>
                  <div>
                    <h2 className="font-bold text-sm tracking-tight text-white">Ideal Customer Profile</h2>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Campaign rules</p>
                  </div>
                </div>
                <button 
                  onClick={fetchInitialData}
                  className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/5"
                  title="Reload Leads"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              <form onSubmit={handleSaveCampaign} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Profile Name</label>
                  <input 
                    type="text" 
                    value={icpName} 
                    onChange={e => setIcpName(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-xs leading-relaxed text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Target Industry</label>
                  <input 
                    type="text" 
                    value={targetIndustry} 
                    onChange={e => setTargetIndustry(e.target.value)}
                    placeholder="e.g. Solar, Software, Healthcare"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-xs leading-relaxed text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Target Company Size</label>
                  <input 
                    type="text" 
                    value={targetSize} 
                    onChange={e => setTargetSize(e.target.value)}
                    placeholder="e.g. 10-50, 100+"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-xs leading-relaxed text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Pain Points / Intent Signals</label>
                  <textarea 
                    value={painPoints} 
                    onChange={e => setPainPoints(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-xs leading-relaxed text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all text-center"
                  >
                    Save Rules
                  </button>
                  <button 
                    type="button" 
                    onClick={handleQualifyLeads}
                    disabled={qualifying || leads.filter(l => l.ai_score === null).length === 0}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    {qualifying ? (
                      <>Qualifying...</>
                    ) : (
                      <>
                        <Bot size={13} />
                        Qualify Leads ({leads.filter(l => l.ai_score === null).length})
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>

          {/* Right panel: Leads Table */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-sm tracking-tight">Leads Database</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Contact list & AI verification</p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white/5 border border-white/5 py-1 px-3 rounded-full text-slate-400">
                  {leads.length} Leads
                </span>
              </div>

              {loading ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <RefreshCw className="animate-spin text-blue-500" />
                  <span className="text-xs font-bold tracking-widest uppercase">Loading database...</span>
                </div>
              ) : leads.length === 0 ? (
                <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <Users size={32} className="text-slate-700" />
                  <div className="font-bold text-sm text-slate-400">No Leads Found</div>
                  <p className="text-xs max-w-[240px] leading-relaxed mx-auto text-slate-600">
                    Add new leads manually or sync Apollo B2B logs to begin.
                  </p>
                  <button 
                    onClick={() => setShowAddLeadModal(true)} 
                    className="mt-2 text-xs bg-white/5 border border-white/5 hover:bg-white/10 text-white font-bold py-2 px-4 rounded-xl"
                  >
                    Add Your First Lead
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] text-slate-500 uppercase tracking-widest font-bold bg-white/[0.01]">
                        <th className="py-4 px-6">Name & Company</th>
                        <th className="py-4 px-4">Contact Info</th>
                        <th className="py-4 px-4">Fit Score</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => {
                        let scoreBadge = 'bg-slate-500/10 text-slate-500';
                        if (lead.ai_score === 'hot') scoreBadge = 'bg-amber-400/10 text-amber-400 border border-amber-500/20';
                        if (lead.ai_score === 'warm') scoreBadge = 'bg-blue-400/10 text-blue-400 border border-blue-500/20';
                        if (lead.ai_score === 'cold') scoreBadge = 'bg-slate-600/20 text-slate-500 border border-white/5';

                        let statusBadge = 'bg-slate-500/10 text-slate-500';
                        if (lead.status === 'new') statusBadge = 'bg-blue-500/10 text-blue-400';
                        if (lead.status === 'qualified') statusBadge = 'bg-purple-500/10 text-purple-400';
                        if (lead.status === 'calling') statusBadge = 'bg-amber-500/10 text-amber-400';
                        if (lead.status === 'converted') statusBadge = 'bg-green-500/10 text-green-400 border border-green-500/20';
                        if (lead.status === 'rejected') statusBadge = 'bg-red-500/10 text-red-400';

                        return (
                          <tr 
                            key={lead.id} 
                            className="border-b border-white/5 hover:bg-white/[0.01] transition-all group"
                          >
                            <td className="py-4 px-6">
                              <div className="font-bold text-xs text-white">{lead.first_name} {lead.last_name || ''}</div>
                              {lead.company && (
                                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                  <Building size={10} className="opacity-60" /> {lead.company}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-[11px] text-slate-300 font-mono">{lead.phone}</div>
                              {lead.email && <div className="text-[10px] text-slate-500 font-medium mt-0.5">{lead.email}</div>}
                            </td>
                            <td className="py-4 px-4">
                              {lead.ai_score ? (
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`text-[9px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full ${scoreBadge}`}>
                                    {lead.ai_score}
                                  </span>
                                  {lead.ai_reasoning && (
                                    <span className="text-[9px] text-slate-500 font-medium max-w-[160px] truncate group-hover:text-slate-400 group-hover:whitespace-normal transition-all" title={lead.ai_reasoning}>
                                      {lead.ai_reasoning}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic">Unscored</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`text-[9px] font-black uppercase tracking-widest py-0.5 px-2 rounded-md ${statusBadge}`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button 
                                onClick={() => triggerCall(lead)}
                                className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400 text-slate-300 py-2 px-3.5 rounded-xl text-[10px] font-bold transition-all"
                              >
                                <Phone size={11} fill="currentColor" /> Call
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── ADD LEAD MODAL ── */}
      <AnimatePresence>
        {showAddLeadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddLeadModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-slate-900 border border-white/10 rounded-[2rem] w-full max-w-lg p-6 overflow-hidden z-10 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-base text-white">Create New Lead</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Sourcing profile config</p>
                </div>
                <button 
                  onClick={() => setShowAddLeadModal(false)}
                  className="p-1.5 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/5"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleAddLead} className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">First Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={newFirstName} 
                    onChange={e => setNewFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Last Name</label>
                  <input 
                    type="text" 
                    value={newLastName} 
                    onChange={e => setNewLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Company</label>
                  <input 
                    type="text" 
                    value={newCompany} 
                    onChange={e => setNewCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Phone Number *</label>
                  <input 
                    type="tel" 
                    required 
                    value={newPhone} 
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Email</label>
                  <input 
                    type="email" 
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Industry</label>
                  <input 
                    type="text" 
                    value={newIndustry} 
                    onChange={e => setNewIndustry(e.target.value)}
                    placeholder="e.g. Technology"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Company Size</label>
                  <input 
                    type="text" 
                    value={newCompanySize} 
                    onChange={e => setNewCompanySize(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>
                <button 
                  type="submit" 
                  className="col-span-2 mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all text-center"
                >
                  Create Lead
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── VOICE CALL OVERLAY DIALER ── */}
      <AnimatePresence>
        {showCallModal && activeCallLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCallModal(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-[340px] h-[580px] bg-black border border-white/15 rounded-[3.2rem] overflow-hidden z-10 shadow-2xl"
              style={{ boxShadow: '0 50px 130px -20px rgba(0,0,0,0.95), 0 8px 32px rgba(0,0,0,0.6)' }}
            >
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40">
                <div className="h-7 px-4 bg-black rounded-full flex items-center gap-2"
                  style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
                  <div className="w-2 h-2 rounded-full bg-[#1a1a1a] border border-[#111] flex items-center justify-center">
                    <div className="w-0.5 h-0.5 rounded-full bg-[#2a2a3a]/80" />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowCallModal(false)}
                className="absolute top-4 right-6 z-50 text-white/50 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"
                title="Close Dialer"
              >
                <X size={15} />
              </button>

              <PhoneCallUI 
                initialPrompt={getAgentPrompt(activeCallLead)}
                mode="sales"
                persona="Emma"
                onCallStart={async () => {
                  try {
                    await apiClient.fetchWithHeaders('/api/calls', {
                      method: 'POST',
                      body: JSON.stringify({
                        lead_id: activeCallLead.id,
                        room_name: `phone_${activeCallLead.id.slice(0, 8)}`
                      })
                    });
                  } catch (e) {
                    console.error('Failed to log call start in DB:', e);
                  }
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
