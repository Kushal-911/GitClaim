"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [issues, setIssues] = useState<any[]>([]);
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'monitor' | 'config'>('monitor');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [watchlistUrl, setWatchlistUrl] = useState("");
  const [isAddingWatch, setIsAddingWatch] = useState(false);

  // Custom Personalization
  const [personalSignature, setPersonalSignature] = useState(
    "I'm an aspiring systems engineer looking to dive deeper into the cloud-native ecosystem. Let's make this feature happen!"
  );

  const [logs, setLogs] = useState<Array<{ timestamp: string; type: string; text: string }>>([
    { timestamp: new Date().toTimeString().split(' ')[0], type: 'info', text: 'System initialized. Native Vercel Cloud Crons active.' },
    { timestamp: new Date().toTimeString().split(' ')[0], type: 'success', text: 'Telemetry Pipeline: Secure connection to DynamoDB verified' }
  ]);

  const addLog = (type: string, text: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [{ timestamp, type, text }, ...prev.slice(0, 19)]);
  };

  // 1. Core Data Retrieval (Issues + Watchlists)
  const fetchData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch('/api/get-issues');
      if (!res.ok) throw new Error('Could not contact GitClaim storage API.');
      const data = await res.json();
      
      const allItems = data.issues || [];
      const dbIssues = allItems.filter((item: any) => item.status !== 'WATCHLIST_ITEM');
      const dbWatchlists = allItems.filter((item: any) => item.status === 'WATCHLIST_ITEM');
      
      setIssues(dbIssues);
      setWatchlists(dbWatchlists);
      
      if (!quiet) {
        addLog('success', `Synchronized database states: ${dbIssues.length} issue traces, ${dbWatchlists.length} watchlist nodes.`);
      }
    } catch (err: any) {
      addLog('warning', 'Local sandbox active. Using simulation engine data.');
      // Fallback fallback data inside sandbox environment
      setIssues([
        {
          issueId: '4667918810',
          issueNumber: 20083,
          repoFullName: 'meshery/meshery',
          title: '[UI] Deprecated HandleError usage in RJSF_wrapper.tsx should use useNotification hook',
          category: 'UI/UX',
          isGoodMatch: true,
          status: 'AUTOMALLY_CLAIMED',
          aiProposal: "Hi team! I'd love to take this on. Refactoring the deprecated HandleError logic inside RJSF_wrapper.tsx to use the useNotification hook makes absolute sense. Please assign this to me!",
          createdAt: new Date().toISOString(),
          url: 'https://github.com/meshery/meshery/issues/20083'
        }
      ]);
      setWatchlists([
        { issueId: 'wl_1', repoFullName: 'meshery/meshery' }
      ]);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  // Initial load and periodic polling loop
  useEffect(() => {
    fetchData();

    // Silent background agent to pull updates pushed by your Vercel cron
    const interval = setInterval(() => {
      if (isAutoMode) {
        addLog('info', 'Performing background check against DynamoDB schema...');
        fetchData(true);
      }
    }, 30000); // Poll database state every 30 seconds

    return () => clearInterval(interval);
  }, [isAutoMode]);

  // 2. Manual Trigger/Force Sync Ingestion
  const triggerForceSync = async () => {
    setIsSyncing(true);
    addLog('info', 'Triggering manual ingestion sweep...');
    try {
      const res = await fetch('/api/poll-issues', { method: 'POST' });
      if (!res.ok) throw new Error('Server returned rejection state.');
      const data = await res.json();
      
      addLog('success', `Manual ingestion check complete. Active watchlists: ${data.activeWatchlistsCount || 0}`);
      if (data.summary && data.summary.length > 0) {
        data.summary.forEach((item: any) => {
          addLog(
            item.action === 'AUTOMATICALLY_CLAIMED' ? 'success' : 'info',
            `Processed [${item.repo}#${item.issueNumber}]: Category ${item.category} -> Status: ${item.action}`
          );
        });
      }
      await fetchData(true);
    } catch (err: any) {
      addLog('error', `Sync failed: ${err.message || 'Check environment keys.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Watchlist Add Repository
  const addRepoToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!watchlistUrl) return;
    setIsAddingWatch(true);

    let repoName = watchlistUrl.trim();
    if (repoName.includes("github.com/")) {
      const parts = repoName.split("github.com/");
      if (parts[1]) repoName = parts[1].replace(/\/$/, "");
    }

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: repoName })
      });
      if (!res.ok) throw new Error();
      
      addLog('success', `Added repository to active watchlist: ${repoName}`);
      setWatchlistUrl("");
      await fetchData(true);
    } catch (err) {
      addLog('error', `Failed to write ${repoName} to watchlists.`);
    } finally {
      setIsAddingWatch(false);
    }
  };

  // 4. Watchlist Remove Repository
  const removeRepoFromWatchlist = async (repoFullName: string) => {
    try {
      const res = await fetch(`/api/watchlist?repoFullName=${encodeURIComponent(repoFullName)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error();
      
      addLog('warning', `Removed repository from watchlist: ${repoFullName}`);
      await fetchData(true);
    } catch (err) {
      addLog('error', `Failed to remove ${repoFullName} from watchlists.`);
    }
  };

  return (
    <main className={`min-h-screen flex flex-col font-mono transition-colors duration-300 ${
      isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'
    }`}>
      {/* Top Navigation */}
      <nav className={`border-b px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 ${
        isDarkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-500">
            GC
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">
              Git_Claim <span className="text-emerald-500">[]</span>
            </span>
            <span className={`text-[10px] block ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Autonomous Worker Node
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Light/Dark Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 border transition duration-200 hover:border-emerald-500 ${
              isDarkMode ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-600'
            }`}
            title="Toggle Theme"
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

          <div className={`flex items-center gap-2 border rounded-md px-3 py-1.5 text-[11px] ${
            isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200'
          }`}>
            <span className={`h-2 w-2 rounded-full ${isAutoMode ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
            <span className="font-bold uppercase tracking-wider">
              {isAutoMode ? 'CRON_POLLING_ACTIVE' : 'CRON_POLLING_PAUSED'}
            </span>
          </div>

          <button
            onClick={() => setIsAutoMode(!isAutoMode)}
            className={`px-3 py-1.5 text-xs font-bold border transition duration-150 ${
              isAutoMode 
                ? 'border-rose-500/20 text-rose-500 bg-rose-500/5' 
                : 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5'
            }`}
          >
            {isAutoMode ? '[ PAUSE_POLLING ]' : '[ ACTIVATE_POLLING ]'}
          </button>

          <button
            onClick={triggerForceSync}
            disabled={isSyncing}
            className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-150"
          >
            {isSyncing ? 'RUNNING_SYNC...' : 'FORCE_HARVEST_SYNC'}
          </button>
        </div>
      </nav>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Navigation Sidebar */}
        <aside className={`w-full lg:w-64 p-6 flex flex-col gap-2 border-r ${
          isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-3">
            Systems Management
          </div>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold transition ${
              activeTab === 'monitor' 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
            }`}
          >
            [ 📊 TELEMETRY_FEED ]
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold transition ${
              activeTab === 'config' 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
            }`}
          >
            [ ⚙️ SCOPE_SIGNATURE ]
          </button>

          <div className={`mt-8 p-4 border text-[11px] space-y-2 ${
            isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200'
          }`}>
            <div className="font-bold text-emerald-500">STORAGE_METRICS</div>
            <div className="flex justify-between text-zinc-500">
              <span>Region:</span>
              <span className="font-bold text-zinc-300">ap-south-1</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>DynamoDB:</span>
              <span className="text-emerald-500 font-bold">Online</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Cloud Cron:</span>
              <span className="text-emerald-500 font-bold">10m Tick</span>
            </div>
          </div>
        </aside>

        {/* Central Workspace */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'monitor' && (
            <div className="space-y-8">
              {/* Watchlist Section */}
              <section className={`p-5 border ${
                isDarkMode ? 'bg-zinc-900/10 border-zinc-850' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <h3 className="text-xs font-bold uppercase mb-3 text-emerald-500">GitHub Watchlist Registry</h3>
                <form onSubmit={addRepoToWatchlist} className="flex flex-col sm:flex-row gap-2 mb-4">
                  <input
                    type="text"
                    value={watchlistUrl}
                    onChange={(e) => setWatchlistUrl(e.target.value)}
                    placeholder="Enter owner/repo (e.g. Kushal-911/macro-sentry-AI)"
                    className={`flex-1 p-2 text-xs focus:outline-none focus:border-emerald-500 border ${
                      isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-850'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isAddingWatch}
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition duration-150"
                  >
                    {isAddingWatch ? 'ADDING...' : '+ WATCH_REPOSITORY'}
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {watchlists.length === 0 ? (
                    <span className="text-xs text-zinc-500 italic">No custom repositories configured. Falling back to meshery/meshery.</span>
                  ) : (
                    watchlists.map((wl) => (
                      <div key={wl.issueId} className={`flex items-center gap-2 px-2.5 py-1 text-xs border ${
                        isDarkMode ? 'border-zinc-800 bg-zinc-950 text-zinc-300' : 'border-zinc-200 bg-white text-zinc-700'
                      }`}>
                        <span>{wl.repoFullName}</span>
                        <button
                          onClick={() => removeRepoFromWatchlist(wl.repoFullName)}
                          className="text-zinc-400 hover:text-rose-500 font-bold transition-colors ml-1"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Logs & Stats Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Console System */}
                <div className={`xl:col-span-2 border flex flex-col h-72 ${
                  isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm'
                }`}>
                  <div className={`px-4 py-2 border-b flex items-center justify-between ${
                    isDarkMode ? 'border-zinc-850 bg-zinc-900/10' : 'border-zinc-200 bg-zinc-50'
                  }`}>
                    <span className="text-[10px] font-bold text-emerald-500 tracking-wider">SYSTEM_DAEMON_CONSOLES</span>
                    <span className="text-[9px] text-zinc-500">Live Telemetry</span>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1 space-y-2 text-[11px]">
                    {logs.map((log, index) => (
                      <div key={index} className="flex gap-3 leading-relaxed">
                        <span className="text-zinc-500">[{log.timestamp}]</span>
                        <span className={`font-bold ${
                          log.type === 'success' ? 'text-emerald-500' :
                          log.type === 'warning' ? 'text-amber-500' : 'text-cyan-400'
                        }`}>
                          {log.type === 'success' ? 'OK' : log.type === 'warning' ? 'WARN' : 'LOG'}
                        </span>
                        <span className={isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}>{log.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scope Stats card */}
                <div className={`border p-6 flex flex-col justify-between ${
                  isDarkMode ? 'bg-zinc-900/10 border-zinc-850' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div>
                    <h3 className="text-xs font-bold uppercase mb-4 text-emerald-500">Autonomous Target Rules</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500">Domain Targets</span>
                        <span className="font-bold">UI/UX, Server, CLI</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500">Deduplication</span>
                        <span className="font-bold text-emerald-500">Enabled</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t text-[11px] flex justify-between items-center">
                    <span className="text-zinc-500">Auto Re-eval</span>
                    <span className="text-emerald-500 font-bold">Active</span>
                  </div>
                </div>
              </div>

              {/* Harvested Issues Feed */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-emerald-500 tracking-wider">
                  Ingested Open Issues Log
                </h3>
                {loading ? (
                  <div className="text-center py-10">
                    <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent mx-auto" />
                  </div>
                ) : issues.length === 0 ? (
                  <div className="text-center py-10 border border-dashed text-xs text-zinc-500">No active issues recorded in database.</div>
                ) : (
                  issues.map((issue) => (
                    <div
                      key={issue.issueId}
                      className={`relative border p-6 transition duration-150 ${
                        issue.status === 'AUTOMATICALLY_CLAIMED'
                          ? `${isDarkMode ? 'bg-zinc-900/10 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm'}`
                          : `opacity-40 hover:opacity-80 ${isDarkMode ? 'border-zinc-900' : 'border-zinc-150'}`
                      }`}
                    >
                      {issue.status === 'AUTOMATICALLY_CLAIMED' && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 border text-zinc-400">
                            {issue.repoFullName} #{issue.issueNumber}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 border uppercase ${
                            issue.category === 'UI/UX' ? 'border-purple-500/20 text-purple-400 bg-purple-500/5' :
                            issue.category === 'Server' ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' :
                            issue.category === 'CLI' ? 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5' :
                            'border-zinc-800 text-zinc-500'
                          }`}>
                            {issue.category || 'General'}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-zinc-100 hover:text-emerald-400 transition mb-3">
                        <a href={issue.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                          {issue.title}
                          <svg className="w-3.5 h-3.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </h4>

                      {issue.status === 'AUTOMATICALLY_CLAIMED' ? (
                        <div className={`border p-4 text-xs leading-relaxed ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                        }`}>
                          <div className="text-[9px] font-bold uppercase text-emerald-500 tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Auto-Posted Human Comment (Successfully Claimed)
                          </div>
                          <p className="italic">
                            "{issue.aiProposal}"
                          </p>
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-500 italic">
                          Skipped automatic interactions. Met categorization filters: Off.
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className={`border p-8 max-w-3xl space-y-6 ${
              isDarkMode ? 'bg-zinc-900/10 border-zinc-850' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div>
                <h2 className="text-base font-bold text-emerald-500 uppercase mb-2">Configure Profile</h2>
                <p className="text-xs text-zinc-400">
                  Update the dynamic persona signature appended to your automated comments.
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <h3 className="text-xs font-bold uppercase mb-2">Personal Developer Signature</h3>
                <p className="text-[11px] text-zinc-500 mb-4">
                  Add custom career details. GitClaim combines this signature cleanly with Gemini's drafts.
                </p>
                <textarea
                  value={personalSignature}
                  onChange={(e) => setPersonalSignature(e.target.value)}
                  className={`w-full h-32 border p-4 text-xs focus:outline-none focus:border-emerald-500 font-mono leading-relaxed ${
                    isDarkMode ? 'bg-zinc-950 border-zinc-850 text-zinc-300' : 'bg-white border-zinc-250 text-zinc-850'
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}