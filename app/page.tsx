"use client";

import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CLAIMED' | 'SKIPPED'>('ALL');

  // Fetch data from our Next.js API route to keep AWS SDK out of the frontend build
  useEffect(() => {
    async function fetchIssues() {
      try {
        setLoading(true);
        const res = await fetch('/api/get-issues');
        if (!res.ok) {
          throw new Error('Failed to fetch from backend API');
        }
        const data = await res.json();
        setIssues(data.issues || []);
      } catch (err: any) {
        console.warn("Backend API offline or unreachable, using live preview mock fallback.");
        // Fallback mock data so the UI remains active and editable during preview/sandbox compilation
        setIssues([
          {
            issueId: "4667918810",
            repoFullName: "meshery/meshery",
            issueNumber: 20083,
            title: "[UI] Deprecated HandleError usage in RJSF_wrapper.tsx should use useNotification hook",
            status: "AUTOMATICALLY_CLAIMED",
            category: "UI/UX",
            isGoodMatch: true,
            aiProposal: "Hi team! I noticed the deprecated HandleError usage inside RJSF_wrapper.tsx. I can refactor this cleanly to use the useNotification hook instead to keep UI error states modular and reliable. Please assign this to me!",
            createdAt: new Date().toISOString(),
            url: "https://github.com/meshery/meshery/issues/20083"
          },
          {
            issueId: "4666876690",
            repoFullName: "meshery/meshery",
            issueNumber: 20078,
            title: "[UI] Header component calls useNotification without () — notify is undefined",
            status: "AUTOMATICALLY_CLAIMED",
            category: "UI/UX",
            isGoodMatch: true,
            aiProposal: "Hello! I can fix this right away. It looks like the Header component is missing the execution parentheses on useNotification, leaving the notify callback undefined during render cycles. Please assign this to me!",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            url: "https://github.com/meshery/meshery/issues/20078"
          },
          {
            issueId: "4653541423",
            repoFullName: "meshery/meshery",
            issueNumber: 20039,
            title: "Whats the security reporting mail ?",
            status: "IGNORED_DOMAIN",
            category: "Security",
            isGoodMatch: false,
            aiProposal: "Skipped",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            url: "https://github.com/meshery/meshery/issues/20039"
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchIssues();
  }, []);

  // Helper for category color badges
  const getCategoryBadgeStyles = (category: string) => {
    switch (category) {
      case 'UI/UX': return 'bg-purple-950 text-purple-400 border-purple-800/40';
      case 'Server': return 'bg-emerald-950 text-emerald-400 border-emerald-800/40';
      case 'CLI': return 'bg-blue-950 text-blue-400 border-blue-800/40';
      case 'Security': return 'bg-red-950 text-red-400 border-red-800/40';
      case 'Documentation': return 'bg-amber-950 text-amber-400 border-amber-800/40';
      default: return 'bg-slate-800 text-slate-400 border-slate-700/40';
    }
  };

  // Filter issues based on UI selection
  const filteredIssues = issues.filter(issue => {
    if (filter === 'CLAIMED') return issue.status === 'AUTOMATICALLY_CLAIMED';
    if (filter === 'SKIPPED') return issue.status !== 'AUTOMATICALLY_CLAIMED';
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              GitClaim Live Feed
            </h1>
            <p className="text-slate-400 mt-2">
              Monitoring your autonomous bot's activity across GitHub target repositories.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm font-semibold text-slate-300">
              Total Processed: {issues.length}
            </div>
          </div>
        </header>

        {/* Filter Controls */}
        <div className="flex gap-2 mb-8 bg-slate-900 p-1.5 rounded-lg border border-slate-800 max-w-md">
          <button
            onClick={() => setFilter('ALL')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
              filter === 'ALL' ? 'bg-cyan-600 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setFilter('CLAIMED')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
              filter === 'CLAIMED' ? 'bg-cyan-600 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Auto-Claimed
          </button>
          <button
            onClick={() => setFilter('SKIPPED')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
              filter === 'SKIPPED' ? 'bg-cyan-600 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Skipped
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-500">Scanning DynamoDB logs...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-500">No issues matching your active filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredIssues.map((issue: any) => (
              <div 
                key={issue.issueId} 
                className={`border rounded-xl p-6 transition duration-200 backdrop-blur-sm ${
                  issue.status === 'AUTOMATICALLY_CLAIMED'
                    ? 'bg-slate-900/60 border-slate-800' 
                    : 'bg-slate-950 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 bg-slate-950 text-slate-400 rounded border border-slate-800">
                      {issue.repoFullName} #{issue.issueNumber}
                    </span>
                    
                    {/* Domain Category Badge */}
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeStyles(issue.category)}`}>
                      {issue.category || 'General'}
                    </span>

                    {/* Suitability Flag */}
                    {issue.status === 'AUTOMATICALLY_CLAIMED' ? (
                      <span className="text-xs font-medium px-2 py-0.5 bg-emerald-950/50 text-emerald-400 rounded border border-emerald-900/50 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Auto-Claimed Live
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 bg-slate-900 text-slate-500 rounded border border-slate-800/60">
                        Skipped (Out of scope)
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(issue.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-100 mb-4">
                  <a href={issue.url} target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition">
                    {issue.title}
                  </a>
                </h2>

                {/* AI Text Display */}
                {issue.status === 'AUTOMATICALLY_CLAIMED' && (
                  <div className="bg-slate-950 border border-slate-800/60 rounded-lg p-4 mt-2">
                    <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Posted Comment
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed italic">
                      "{issue.aiProposal}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}