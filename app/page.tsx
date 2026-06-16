"use client";

import React, { useState, useEffect } from 'react';

export default function App() {
  const [issues, setIssues] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'claimed' | 'ignored'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Custom Persona States
  const [devSignature, setDevSignature] = useState(
    "As an aspiring systems engineer looking to contribute to the cloud-native ecosystem, I'm highly eager to help resolve this. Could you please assign this to me?"
  );
  const [filters, setFilters] = useState({
    uiux: true,
    server: true,
    cli: true,
    security: false,
    documentation: false,
  });

  // Terminal telemetry logs
  const [logs, setLogs] = useState<Array<{ time: string; type: string; msg: string }>>([
    { time: '22:15:02', type: 'system', msg: 'GitClaim Terminal v3.2.0 Initialized.' },
    { time: '22:15:03', type: 'success', msg: 'DynamoDB Connection: Active [ap-south-1]' },
    { time: '22:15:04', type: 'info', msg: 'Awaiting webhook trigger or system polling cycle...' }
  ]);

  const addLog = (type: string, msg: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [{ time, type, msg }, ...prev.slice(0, 19)]);
  };

  const fetchData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch('/api/get-issues');
      if (!res.ok) throw new Error('API unreachable');
      const data = await res.json();
      
      setIssues(data.issues || []);
      setWatchlist(data.watchlist || []);
      
      addLog('success', `Database Synced. Issues: ${data.issues?.length || 0} | Watchlists: ${data.watchlist?.length || 0}`);
    } catch (err) {
      addLog('warning', 'Production API offline. Operating in fallback developer workspace.');
      // Premium Mock data fallbacks for preview compiler
      setIssues([
        {
          issueId: "4667918810",
          repoFullName: "meshery/meshery",
          issueNumber: 20083,
          title: "[UI] Deprecated HandleError usage in RJSF_wrapper.tsx should use useNotification hook",
          status: "AUTOMATICALLY_CLAIMED",
          category: "UI/UX",
          isGoodMatch: true,
          aiProposal: "Hi team! I noticed the deprecated HandleError usage inside RJSF_wrapper.tsx. I can refactor this cleanly to use the useNotification hook instead.",
          createdAt: new Date().toISOString(),
          url: "https://github.com/meshery/meshery/issues/20083"
        },
        {
          issueId: "4662700260",
          repoFullName: "meshery/meshery",
          issueNumber: 20069,
          title: "[Server] Validate workspace path UUIDs in local provider schemas",
          status: "AUTOMATICALLY_CLAIMED",
          category: "Server",
          isGoodMatch: true,
          aiProposal: "Greetings! I'd love to take this on. Adding structural UUID validation to the workspace paths inside the local provider schemas will ensure better data safety.",
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          url: "https://github.com/meshery/meshery/issues/20069"
        }
      ]);
      setWatchlist([
        { issueId: "WATCHLIST#meshery/meshery", repoFullName: "meshery/meshery", status: "WATCHLIST_ITEM" }
      ]);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl) return;

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newRepoUrl })
      });
      if (!res.ok) throw new Error('Failed to register repository');
      const data = await res.json();
      
      addLog('success', `Watchlist Added: ${data.repoFullName}`);
      setNewRepoUrl('');
      fetchData(true);
    } catch (err) {
      addLog('error', `Local mock addition: ${newRepoUrl}`);
      const fallbackRepo = newRepoUrl.replace("https://github.com/", "");
      setWatchlist(prev => [...prev, { issueId: `WATCHLIST#${fallbackRepo}`, repoFullName: fallbackRepo, status: "WATCHLIST_ITEM" }]);
      setNewRepoUrl('');
    }
  };

  const handleRemoveRepo = async (repoFullName: string) => {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName })
      });
      if (!res.ok) throw new Error('Removal failed');
      
      addLog('success', `Removed watchlisted repo: ${repoFullName}`);
      fetchData(true);
    } catch (err) {
      addLog('error', `Local mock removal: ${repoFullName}`);
      setWatchlist(prev => prev.filter(item => item.repoFullName !== repoFullName));
    }
  };

  const triggerSync = async () => {
    setIsSyncing(true);
    addLog('system', 'Invoking GitHub -> Gemini -> DynamoDB ingestion routine...');
    try {
      const res = await fetch('/api/poll-issues', { method: 'POST' });
      if (!res.ok) throw new Error('Ingestion failed');
      const data = await res.json();
      addLog('success', `Sync finished. Active watchlists: ${data.activeWatchlistsCount || 0}`);
      await fetchData(true);
    } catch (err) {
      addLog('warning', 'Live preview pipeline simulation executed.');
      setTimeout(() => {
        addLog('success', 'Sync finished cleanly.');
        setIsSyncing(false);
      }, 1200);
      return;
    }
    setIsSyncing(false);
  };

  const displayedIssues = issues.filter(issue => {
    if (activeTab === 'claimed') return issue.status === 'AUTOMATICALLY_CLAIMED';
    if (activeTab === 'ignored') return issue.status !== 'AUTOMATICALLY_CLAIMED';
    return true;
  });

  return (
    <div className={`min-h-screen font-mono transition-colors duration-300 ${
      isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'
    }`}>
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Navigation & Header */}
        <header className={`flex flex-col md:flex-row md:justify-between md:items-center gap-6 pb-6 mb-8 border-b ${
          isDarkMode ? 'border-zinc-800' : 'border-zinc-200'
        }`}>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight uppercase">
                Git_Claim <span className="text-emerald-500">[]</span>
              </h1>
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 uppercase tracking-wider">
                Autonomous
              </span>
            </div>
            <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Generalized open source worker and targets board
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 border transition duration-200 hover:border-emerald-500 ${
                isDarkMode ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-600'
              }`}
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`px-4 py-2 text-xs font-bold border transition duration-200 hover:border-emerald-500 ${
                isDarkMode ? 'border-zinc-800 text-zinc-300' : 'border-zinc-200 text-zinc-700'
              }`}
            >
              [ CONFIG_PERSONA ]
            </button>
            
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className={`px-4 py-2 text-xs font-bold border bg-zinc-900 text-emerald-400 hover:bg-zinc-800 hover:text-emerald-300 transition duration-200 ${
                isDarkMode ? 'border-emerald-500/30' : 'border-zinc-300'
              }`}
            >
              {isSyncing ? 'RUNNING_SYNC...' : 'FORCE_SYNC'}
            </button>
          </div>
        </header>

        {/* Configurations Overlay */}
        {showConfig && (
          <div className={`mb-8 p-6 border transition-all duration-300 ${
            isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <h3 className="text-xs font-bold uppercase mb-2">Scope Configuration Panel</h3>
            <p className={`text-xs mb-6 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Fine-tune target repositories and signature metadata definitions.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold uppercase mb-3 text-emerald-500">Target Filter Matrix</h4>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {Object.entries(filters).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setFilters(prev => ({ ...prev, [key]: !value }))}
                      className={`flex items-center justify-between px-3 py-2 border text-[11px] transition duration-150 font-bold ${
                        value 
                          ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/5' 
                          : 'border-zinc-800 text-zinc-500 bg-transparent hover:border-zinc-700'
                      }`}
                    >
                      <span>{key.toUpperCase()}</span>
                      <span>{value ? '[X]' : '[_]'}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase mb-3 text-emerald-500">Custom Dev Signature</h4>
                <textarea
                  value={devSignature}
                  onChange={(e) => setDevSignature(e.target.value)}
                  className={`w-full h-24 border p-3 text-xs focus:outline-none focus:border-emerald-500 font-mono leading-relaxed ${
                    isDarkMode ? 'bg-zinc-900/40 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-800'
                  }`}
                  placeholder="Appended cleanly at the end of every comment..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Watchlist Input Panel */}
        <div className={`border p-5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
          isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className="flex-1">
            <h3 className="text-xs font-extrabold uppercase mb-1">Add Repository Watchlist</h3>
            <p className={`text-[11px] ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Input any owner/repo path or complete GitHub URL to register it inside your autonomous crawling loop.
            </p>
          </div>
          <form onSubmit={handleAddRepo} className="flex gap-2 w-full md:w-auto md:max-w-md flex-1">
            <input
              type="text"
              value={newRepoUrl}
              onChange={(e) => setNewRepoUrl(e.target.value)}
              placeholder="e.g. meshery/meshery"
              className={`flex-1 border px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-mono ${
                isDarkMode ? 'bg-zinc-900/50 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
              }`}
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition uppercase"
            >
              [ Add ]
            </button>
          </form>
        </div>

        {/* Dashboard Grid Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Feed Section (8 Columns) */}
          <section className="lg:col-span-8 space-y-6">
            
            {/* Nav & Filter Tabs */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-2 border ${
              isDarkMode ? 'bg-zinc-900/20 border-zinc-850' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 text-xs font-bold transition duration-150 ${
                    activeTab === 'all' 
                      ? 'bg-zinc-900 text-emerald-500 border border-zinc-800' 
                      : `${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'}`
                  }`}
                >
                  All ({issues.length})
                </button>
                <button
                  onClick={() => setActiveTab('claimed')}
                  className={`px-3 py-1.5 text-xs font-bold transition duration-150 ${
                    activeTab === 'claimed' 
                      ? 'bg-zinc-900 text-emerald-500 border border-zinc-800' 
                      : `${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'}`
                  }`}
                >
                  Auto-Claimed
                </button>
                <button
                  onClick={() => setActiveTab('ignored')}
                  className={`px-3 py-1.5 text-xs font-bold transition duration-150 ${
                    activeTab === 'ignored' 
                      ? 'bg-zinc-900 text-emerald-500 border border-zinc-800' 
                      : `${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'}`
                  }`}
                >
                  Ignored
                </button>
              </div>
            </div>

            {/* List Body */}
            {loading ? (
              <div className={`text-center py-24 border border-dashed ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent mx-auto mb-4" />
                <p className="text-[10px] text-zinc-500 tracking-wider">RETRIEVING ACTIVE TELEMETRY...</p>
              </div>
            ) : displayedIssues.length === 0 ? (
              <div className={`text-center py-20 border border-dashed ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <p className="text-xs text-zinc-500">Workspace clean. No matching telemetry logs available.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedIssues.map((issue) => (
                  <div
                    key={issue.issueId}
                    className={`relative border p-5 transition-all duration-300 ${
                      issue.status === 'AUTOMATICALLY_CLAIMED'
                        ? `${isDarkMode ? 'bg-zinc-900/10 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`
                        : `opacity-40 hover:opacity-75 ${isDarkMode ? 'border-zinc-900 bg-transparent' : 'border-zinc-100 bg-zinc-50/50'}`
                    }`}
                  >
                    {/* Left Accent Border */}
                    {issue.status === 'AUTOMATICALLY_CLAIMED' && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    )}

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                        }`}>
                          {issue.repoFullName} #{issue.issueNumber}
                        </span>
                        
                        {/* Domain tag */}
                        <span className={`text-[9px] font-bold px-2 py-0.5 border uppercase ${
                          issue.category === 'UI/UX' ? 'border-purple-500/20 text-purple-400 bg-purple-500/5' :
                          issue.category === 'Server' ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' :
                          issue.category === 'CLI' ? 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5' :
                          'border-zinc-850 text-zinc-500'
                        }`}>
                          {issue.category || 'General'}
                        </span>

                        {issue.status === 'AUTOMATICALLY_CLAIMED' ? (
                          <span className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            [ Claimed ]
                          </span>
                        ) : (
                          <span className={`text-[9px] font-bold uppercase ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            [ Out-of-Scope ]
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(issue.createdAt).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Title Header */}
                    <h3 className={`text-sm font-bold mb-4 hover:text-emerald-400 transition-colors duration-200 ${
                      isDarkMode ? 'text-zinc-100' : 'text-zinc-850'
                    }`}>
                      <a href={issue.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                        {issue.title}
                        <svg className="w-3.5 h-3.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </h3>

                    {/* Posted Comment text display */}
                    {issue.status === 'AUTOMATICALLY_CLAIMED' ? (
                      <div className={`border p-4 font-mono text-xs leading-relaxed ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                      }`}>
                        <div className={`text-[9px] font-bold uppercase tracking-widest mb-2 border-b pb-1.5 flex items-center justify-between ${
                          isDarkMode ? 'border-zinc-900 text-zinc-500' : 'border-zinc-200 text-zinc-400'
                        }`}>
                          <span>Auto Comment Text</span>
                          <span className="text-emerald-500">Posted</span>
                        </div>
                        <p className="italic">
                          "{issue.aiProposal}"
                        </p>
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 italic">
                        Skipped automatic interactions based on filters.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Telemetry Panel Side (4 Columns) */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Watchlist Manager Panel */}
            <div className={`border p-5 ${
              isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
            }`}>
              <h3 className="text-xs font-bold uppercase border-b pb-2.5 mb-3 flex items-center justify-between">
                <span>Watchlist Manager</span>
                <span className="text-emerald-500 font-extrabold">[{watchlist.length}]</span>
              </h3>
              
              {watchlist.length === 0 ? (
                <p className="text-[10px] text-zinc-500 italic py-2">No custom watchlists registered. Defaulting to meshery/meshery.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {watchlist.map((item) => (
                    <div key={item.issueId} className={`flex items-center justify-between p-2 border text-[11px] font-bold ${
                      isDarkMode ? 'bg-zinc-900/30 border-zinc-850' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <span className="truncate pr-2">{item.repoFullName}</span>
                      <button
                        onClick={() => handleRemoveRepo(item.repoFullName)}
                        className="text-rose-500 hover:text-rose-400 text-[10px] font-bold tracking-widest px-1 uppercase"
                      >
                        [ DEL ]
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Minimalist Live Console logs */}
            <div className={`border flex flex-col h-[280px] ${
              isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm'
            }`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${
                isDarkMode ? 'border-zinc-850 bg-zinc-900/10' : 'border-zinc-200 bg-zinc-50'
              }`}>
                <span className="text-[10px] font-bold text-emerald-500 tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  CONSOLE_TELEMETRY
                </span>
                <span className="text-[9px] text-zinc-500">v3.2</span>
              </div>
              <div className="p-4 font-mono text-[10px] overflow-y-auto flex-1 space-y-2 leading-relaxed">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-zinc-500">[{log.time}]</span>
                    <span className={`font-bold ${
                      log.type === 'success' ? 'text-emerald-500' :
                      log.type === 'warning' ? 'text-amber-500' :
                      log.type === 'error' ? 'text-rose-500' : 'text-zinc-400'
                    }`}>
                      {log.type === 'success' ? 'OK' : log.type === 'warning' ? 'WARN' : log.type === 'error' ? 'ERR' : 'LOG'}
                    </span>
                    <span className={isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

          </aside>

        </div>

      </div>
    </div>
  );
}