/**
 * API Client for AI Sales Agent
 * Handles all communication with Node.js API Gateway
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface MessageRequest {
    text: string;
    session_id: string;
}

export interface MessageResponse {
    success: boolean;
    response: string;
    session_id: string;
    stage?: string;
    qualification?: {
        business_type?: string | null;
        goal?: string | null;
        urgency?: string | null;
        budget_readiness?: string | null;
    };
    qualification_complete?: boolean;
    message_count?: number;
    error?: string;
}

export interface SessionInfo {
    session_id: string;
    created_at: string;
    message_count: number;
    stage: string;
    qualification: {
        business_type?: string | null;
        goal?: string | null;
        urgency?: string | null;
        budget_readiness?: string | null;
    };
    qualification_complete: boolean;
}

export interface Lead {
    id: string;
    first_name: string;
    last_name?: string;
    company?: string;
    email?: string;
    phone: string;
    industry?: string;
    company_size?: string;
    ai_score?: 'hot' | 'warm' | 'cold' | null;
    ai_reasoning?: string;
    status: 'new' | 'qualified' | 'calling' | 'converted' | 'rejected';
    created_at: string;
}

export interface Campaign {
    id?: string;
    name: string;
    target_industry?: string;
    target_company_size?: string;
    pain_points?: string;
    system_prompt_override?: string;
    created_at?: string;
}

class APIClient {
    private baseURL: string;

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    async fetchWithHeaders(endpoint: string, options: RequestInit = {}) {
        // Ensure robust URL joining regardless of trailing slashes
        const base = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = endpoint.startsWith('http') ? endpoint : `${base}${path}`;

        // Get auth token from Supabase session if available
        let authHeader = {};
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                authHeader = { Authorization: `Bearer ${session.access_token}` };
            }
        } catch (error) {
            console.error('Error fetching Supabase session for API request:', error);
        }

        const headers = {
            'Content-Type': 'application/json',
            'bypass-tunnel-reminder': 'true', // Bypasses localtunnel's splash screen
            ...authHeader,
            ...(options.headers || {}),
        };

        const response = await fetch(url, { ...options, headers });
        return response;
    }

    /**
     * Create a new conversation session
     */
    async createSession(customPrompt?: string): Promise<{ session_id: string }> {
        // Option A: Decoupled Voice Engine
        // Bypassing /api/session/new to avoid relying on the broken Python text API (main.py).
        // A unique, trackable session ID is still generated for every single call.
        const session_id = `phone_${uuidv4()}`;
        return { session_id };
    }

    /**
     * Send a message to the AI agent
     */
    async sendMessage(request: MessageRequest): Promise<MessageResponse> {
        const response = await this.fetchWithHeaders('/api/message', {
            method: 'POST',
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Request failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get session information
     */
    async getSession(sessionId: string): Promise<SessionInfo> {
        const response = await this.fetchWithHeaders(`/api/session/${sessionId}`);

        if (!response.ok) {
            throw new Error(`Failed to get session: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Delete a session
     */
    async deleteSession(sessionId: string): Promise<void> {
        const response = await this.fetchWithHeaders(`/api/session/${sessionId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Failed to delete session: ${response.statusText}`);
        }
    }

    /**
     * Get LiveKit token
     */
    async getLiveKitToken(roomName: string, identity?: string): Promise<{ token: string; serverUrl: string }> {
        const response = await this.fetchWithHeaders('/api/livekit/token', {
            method: 'POST',
            body: JSON.stringify({ roomName, identity }),
        });

        if (!response.ok) {
            throw new Error(`Failed to get LiveKit token: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetch all leads from the database
     */
    async fetchLeads(): Promise<Lead[]> {
        const response = await this.fetchWithHeaders('/api/leads');
        if (!response.ok) {
            throw new Error('Failed to fetch leads');
        }
        const data = await response.json();
        return data.leads || [];
    }

    /**
     * Add a new lead to the database
     */
    async addLead(lead: Omit<Lead, 'id' | 'status' | 'created_at'>): Promise<Lead> {
        const response = await this.fetchWithHeaders('/api/leads', {
            method: 'POST',
            body: JSON.stringify(lead)
        });
        if (!response.ok) {
            throw new Error('Failed to add lead');
        }
        const data = await response.json();
        return data.lead;
    }

    /**
     * Qualify unscored leads using the AI engine
     */
    async qualifyLeads(icp?: { target_industry?: string; target_company_size?: string; pain_points?: string }): Promise<Lead[]> {
        const response = await this.fetchWithHeaders('/api/leads/qualify', {
            method: 'POST',
            body: JSON.stringify(icp || {})
        });
        if (!response.ok) {
            throw new Error('Failed to qualify leads');
        }
        const data = await response.json();
        return data.leads || [];
    }

    /**
     * Fetch campaigns
     */
    async fetchCampaigns(): Promise<Campaign[]> {
        const response = await this.fetchWithHeaders('/api/campaigns');
        if (!response.ok) {
            throw new Error('Failed to fetch campaigns');
        }
        const data = await response.json();
        return data.campaigns || [];
    }

    /**
     * Create a new campaign/ICP configuration
     */
    async createCampaign(campaign: Campaign): Promise<Campaign> {
        const response = await this.fetchWithHeaders('/api/campaigns', {
            method: 'POST',
            body: JSON.stringify(campaign)
        });
        if (!response.ok) {
            throw new Error('Failed to create campaign');
        }
        const data = await response.json();
        return data.campaign;
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<{ status: string; services: any }> {
        const response = await this.fetchWithHeaders('/health');
        if (!response.ok) {
            throw new Error('Health check failed');
        }
        return response.json();
    }
}

export const apiClient = new APIClient();
