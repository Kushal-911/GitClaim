"use client";

import React, { useState, useEffect } from 'react';

export default function App() {
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [issues, setIssues] = useState<any[]>([]);
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [watchlistUrl, setWatchlistUrl] = useState("");
  const [isAddingWatch, setIsAddingWatch] = useState(false);

  const [personalSignature, setPersonalSignature] = useState(
    "I'm an aspiring systems engineer looking to dive deeper into the cloud-native ecosystem. Let's make this feature happen!"
  );

  const [logs, setLogs] = useState<Array<{ timestamp: string; type: string; text: string }>>([]);

  // Fix Dark Mode Toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const addLog = (type: string, text: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [{ timestamp, type, text }, ...prev.slice(0, 19)]);
  };

  const fetchData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch('/api/get-issues');
      if (!res.ok) throw new Error('API unreachable');
      const data = await res.json();
      
      const allItems = data.issues || [];
      const dbIssues = allItems.filter((item: any) => item.status !== 'WATCHLIST_ITEM');
      const dbWatchlists = allItems.filter((item: any) => item.status === 'WATCHLIST_ITEM');
      
      setIssues(dbIssues);
      setWatchlists(dbWatchlists);
      
      if (!quiet) {
        addLog('success', `Loaded ${dbIssues.length} issues and ${dbWatchlists.length} watchlists.`);
      }
    } catch (err: any) {
      addLog('warning', 'Using fallback simulation data.');
      setIssues([
        {
          issueId: '4667918810', issueNumber: 20083, repoFullName: 'meshery/meshery',
          title: '[UI] Deprecated HandleError usage should be replaced',
          category: 'UI/UX', status: 'AUTOMATICALLY_CLAIMED',
          aiProposal: "Hi team! I'd love to take this on. Refactoring this logic makes absolute sense.",
          createdAt: new Date().toISOString(), url: '#'
        }
      ]);
      setWatchlists([{ issueId: 'wl_1', repoFullName: 'meshery/meshery' }]);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    const currentTime = new Date().toTimeString().split(' ')[0];
    setLogs([
      { timestamp: currentTime, type: 'info', text: 'System initialized. Waiting for background cron cycle...' }
    ]);
    fetchData();

    const interval = setInterval(() => {
      if (isAutoMode) {
        addLog('info', 'Running routine background check for new issues...');
        fetchData(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAutoMode]);

  const triggerForceSync = async () => {
    setIsSyncing(true);
    addLog('info', 'Forcing manual sync...');
    try {
      const res = await fetch('/api/poll-issues', { method: 'POST' });
      if (!res.ok) throw new Error('Sync rejected.');
      addLog('success', 'Manual sync complete.');
      await fetchData(true);
    } catch (err: any) {
      addLog('error', 'Sync failed. Check connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const addRepoToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!watchlistUrl) return;
    setIsAddingWatch(true);
    let repoName = watchlistUrl.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');

    try {
      await fetch('/api/watchlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: repoName })
      });
      addLog('success', `Added ${repoName} to watchlist.`);
      setWatchlistUrl("");
      await fetchData(true);
    } catch (err) {
      addLog('error', `Failed to add ${repoName}.`);
    } finally {
      setIsAddingWatch(false);
    }
  };

  const removeRepoFromWatchlist = async (repoFullName: string) => {
    try {
      await fetch(`/api/watchlist?repoFullName=${encodeURIComponent(repoFullName)}`, { method: 'DELETE' });
      addLog('warning', `Removed ${repoFullName} from watchlist.`);
      await fetchData(true);
    } catch (err) {
      addLog('error', `Failed to remove ${repoFullName}.`);
    }
  };

  // STRICT FILTERING: Hide issues from removed organizations immediately
  const activeWatchlistRepos = watchlists.map(w => w.repoFullName.toLowerCase());
  const displayedIssues = issues.filter(issue => {
    if (activeWatchlistRepos.length === 0) return issue.repoFullName.toLowerCase() === 'meshery/meshery';
    return activeWatchlistRepos.includes(issue.repoFullName.toLowerCase());
  });

  return (
    <main className="min-h-screen flex flex-col font-mono">
      <nav className="border-b px-8 py-4 flex items-center justify-between gap-4 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-500">
            GC
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">GitClaim</span>
            <span className="text-[10px] block text-zinc-500">Autonomous Copilot</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-emerald-500 transition">
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>

          <div className="flex items-center gap-2 border dark:border-zinc-800 px-3 py-1.5 text-[11px]">
            <span className={`h-2 w-2 rounded-full ${isAutoMode ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
            <span className="font-bold">{isAutoMode ? 'AUTO-SYNC ON' : 'AUTO-SYNC OFF'}</span>
          </div>

          <button onClick={() => setIsAutoMode(!isAutoMode)} className={`px-3 py-1.5 text-xs font-bold border transition ${isAutoMode ? 'border-rose-500/20 text-rose-500 bg-rose-500/5' : 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5'}`}>
            {isAutoMode ? 'Pause Sync' : 'Resume Sync'}
          </button>

          <button onClick={triggerForceSync} disabled={isSyncing} className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition">
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </nav>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full lg:w-64 p-6 flex flex-col gap-2 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-3">Menu</div>
          <button onClick={() => setActiveTab('dashboard')} className={`text-left px-3 py-2.5 text-xs font-semibold transition ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-900/50'}`}>
            📊 Dashboard
          </button>
          <button onClick={() => setActiveTab('settings')} className={`text-left px-3 py-2.5 text-xs font-semibold transition ${activeTab === 'settings' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-900/50'}`}>
            ⚙️ Bot Settings
          </button>

          <div className="mt-8 p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[11px] space-y-2">
            <div className="font-bold text-emerald-500 mb-2">Database Status</div>
            <div className="flex justify-between text-zinc-500"><span>Status:</span><span className="text-emerald-500 font-bold">Online</span></div>
            <div className="flex justify-between text-zinc-500"><span>Auto-Pull:</span><span className="text-zinc-700 dark:text-zinc-300 font-bold">Every 5m</span></div>
          </div>
        </aside>

        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <section className="p-5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/10">
                <h3 className="text-xs font-bold uppercase mb-3 text-emerald-600 dark:text-emerald-500">Repositories to Watch</h3>
                <form onSubmit={addRepoToWatchlist} className="flex gap-2 mb-4">
                  <input type="text" value={watchlistUrl} onChange={(e) => setWatchlistUrl(e.target.value)} placeholder="e.g. Kushal-911/macro-sentry-AI" className="flex-1 p-2 text-xs border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500" />
                  <button type="submit" disabled={isAddingWatch} className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition">
                    {isAddingWatch ? 'Adding...' : 'Add Repo'}
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {watchlists.length === 0 ? <span className="text-xs text-zinc-500 italic">No repos watched. Defaulting to meshery/meshery.</span> : watchlists.map((wl) => (
                    <div key={wl.issueId} className="flex items-center gap-2 px-2.5 py-1 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                      <span>{wl.repoFullName}</span>
                      <button onClick={() => removeRepoFromWatchlist(wl.repoFullName)} className="text-zinc-400 hover:text-rose-500 font-bold ml-1">×</button>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 h-72 flex flex-col shadow-sm">
                  <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/10 flex justify-between">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase">Live Sync Logs</span>
                    <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                       <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Scanning actively
                    </span>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1 space-y-2 text-[11px]">
                    {logs.map((log, index) => (
                      <div key={index} className="flex gap-3">
                        <span className="text-zinc-500">[{log.timestamp}]</span>
                        <span className={`font-bold ${log.type === 'success' ? 'text-emerald-500' : log.type === 'warning' ? 'text-amber-500' : 'text-blue-400'}`}>
                          {log.type === 'success' ? 'DONE' : log.type === 'warning' ? 'WARN' : 'INFO'}
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-300">{log.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/10 p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase mb-4 text-emerald-600 dark:text-emerald-500">Filter Rules</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-zinc-500">Targeting</span><span className="font-bold text-zinc-800 dark:text-zinc-200">UI/UX, CLI, Server</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">Auto-Reply</span><span className="font-bold text-emerald-500">Active</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-emerald-600 dark:text-emerald-500">Claimed Open Issues</h3>
                {loading ? (
                  <div className="text-center py-10"><div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent mx-auto" /></div>
                ) : displayedIssues.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-zinc-300 dark:border-zinc-800 text-xs text-zinc-500">No issues found in your watched repositories.</div>
                ) : (
                  displayedIssues.map((issue) => (
                    <div key={issue.issueId} className={`relative border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900/10 ${issue.status !== 'AUTOMATICALLY_CLAIMED' && 'opacity-50'}`}>
                      {issue.status === 'AUTOMATICALLY_CLAIMED' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />}
                      <div className="flex justify-between mb-3 text-[10px]">
                        <span className="font-bold px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">{issue.repoFullName} #{issue.issueNumber}</span>
                        <span className="text-zinc-500">{new Date(issue.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 hover:text-emerald-500 mb-3">
                        <a href={issue.url} target="_blank" rel="noreferrer">{issue.title} ↗</a>
                      </h4>
                      {issue.status === 'AUTOMATICALLY_CLAIMED' && (
                        <div className="border border-zinc-200 dark:border-zinc-800 p-4 text-xs bg-zinc-50 dark:bg-zinc-950">
                          <div className="text-[9px] font-bold uppercase text-emerald-500 mb-2">🤖 Automated Comment Posted</div>
                          <p className="italic text-zinc-700 dark:text-zinc-300">"{issue.aiProposal}"</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="border border-zinc-200 dark:border-zinc-800 p-8 max-w-3xl bg-zinc-50 dark:bg-zinc-900/10">
              <h2 className="text-base font-bold text-emerald-600 dark:text-emerald-500 uppercase mb-2">Bot Profile</h2>
              <p className="text-xs text-zinc-500 mb-6">Modify the message the bot attaches to the end of your auto-claims.</p>
              <textarea value={personalSignature} onChange={(e) => setPersonalSignature(e.target.value)} className="w-full h-32 border border-zinc-300 dark:border-zinc-800 p-4 text-xs bg-white dark:bg-zinc-950 focus:outline-none focus:border-emerald-500" />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}