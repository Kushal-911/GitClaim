"use client";

import React, { useState, useEffect } from 'react';

export default function App() {
  const [issues, setIssues] = useState<any[]>([]);
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
    { time: '22:15:02', type: 'system', msg: 'GitClaim Console v3.0.0 Initialized.' },
    { time: '22:15:03', type: 'success', msg: 'DynamoDB Connection: Active [ap-south-1]' },
    { time: '22:15:04', type: 'info', msg: 'Awaiting webhook trigger or system polling cycle...' }
  ]);

  const addLog = (type: string, msg: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [{ time, type, msg }, ...prev.slice(0, 19)]);
  };

  // Fetch real data from your API
  const fetchIssues = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch('/api/get-issues');
      if (!res.ok) throw new Error('API unreachable');
      const data = await res.json();
      setIssues(data.issues || []);
      addLog('success', `Fetched ${data.issues?.length || 0} items successfully from DynamoDB.`);
    } catch (err) {
      addLog('warning', 'Using high-fidelity local simulation workspace.');
      setIssues([
        {
          issueId: "4667918810",
          repoFullName: "meshery/meshery",
          issueNumber: 20083,
          title: "[UI] Deprecated HandleError usage in RJSF_wrapper.tsx should use useNotification hook",
          status: "AUTOMATICALLY_CLAIMED",
          category: "UI/UX",
          isGoodMatch: true,
          aiProposal: "Hi team! I noticed the deprecated HandleError usage inside RJSF_wrapper.tsx. I can refactor this cleanly to use the useNotification hook instead to keep UI error states modular and reliable.",
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
          aiProposal: "Hello! I can jump on this right away. It looks like the Header component is missing the execution parentheses on useNotification, leaving notify undefined during render. Let's patch this!",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          url: "https://github.com/meshery/meshery/issues/20078"
        },
        {
          issueId: "4662700260",
          repoFullName: "meshery/meshery",
          issueNumber: 20069,
          title: "[Server] Validate workspace path UUIDs in local provider schemas",
          status: "AUTOMATICALLY_CLAIMED",
          category: "Server",
          isGoodMatch: true,
          aiProposal: "Greetings! I'd love to take this on. Adding structural UUID validation to the workspace paths inside the local provider schemas will ensure better data safety across environment bounds.",
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          url: "https://github.com/meshery/meshery/issues/20069"
        },
        {
          issueId: "4653541423",
          repoFullName: "meshery/meshery",
          status: "IGNORED_DOMAIN",
          category: "Security",
          issueNumber: 20039,
          title: "Whats the security reporting mail ?",
          isGoodMatch: false,
          aiProposal: "Skipped",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          url: "https://github.com/meshery/meshery/issues/20039"
        }
      ]);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const triggerSync = async () => {
    setIsSyncing(true);
    addLog('system', 'Invoking GitHub -> Gemini -> DynamoDB ingestion routine...');
    try {
      const res = await fetch('/api/poll-issues', { method: 'POST' });
      if (!res.ok) throw new Error('Ingestion failed');
      const data = await res.json();
      addLog('success', `Ingestion finished. New issues analyzed: ${data.newIssuesDiscovered || 0}`);
      await fetchIssues(true);
    } catch (err) {
      addLog('error', 'Using visual simulation container.');
      setTimeout(() => {
        addLog('success', 'Ingestion routine simulated cleanly.');
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
              Minimalist open source worker and target board
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
              Fine-tune the target directories. Out-of-scope issues will not receive automatic claims.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold uppercase mb-3 text-emerald-500">Target Filter Matrix</h4>
                <div className="grid grid-cols-2 gap-2">
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
                  placeholder="Appended clean to the end of claim comment..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Grid Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Feed Section (7 Columns) */}
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
              <span className={`text-[10px] uppercase font-bold px-2 py-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Source: meshery/meshery
              </span>
            </div>

            {/* List Body */}
            {loading ? (
              <div className={`text-center py-24 border border-dashed ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent mx-auto mb-4" />
                <p className="text-[10px] text-zinc-500 tracking-wider">RETRIEVING DYNAMODB SCHEMA LOGS...</p>
              </div>
            ) : displayedIssues.length === 0 ? (
              <div className={`text-center py-20 border border-dashed ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <p className="text-xs text-zinc-500">Workspace clean. No matched telemetry logs available.</p>
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
                    {/* Minimal Left Accent Border for Claims */}
                    {issue.status === 'AUTOMATICALLY_CLAIMED' && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    )}

                    {/* Metadata Header line */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                        }`}>
                          #{issue.issueNumber}
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

                        {/* Suitability Label */}
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
                          <span>Automated Comment Comment</span>
                          <span className="text-emerald-500">Status: Active</span>
                        </div>
                        <p className="italic">
                          "{issue.aiProposal}"
                        </p>
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 italic">
                        Skipped automatic interactions based on matrix filters. Stored to prevent duplication.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Telemetry Logger Panel Side (4 Columns) */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Minimalist Live Console logs */}
            <div className={`border flex flex-col h-[350px] ${
              isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm'
            }`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${
                isDarkMode ? 'border-zinc-850 bg-zinc-900/10' : 'border-zinc-200 bg-zinc-50'
              }`}>
                <span className="text-[10px] font-bold text-emerald-500 tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SYSTEM_TELEMETRY
                </span>
                <span className="text-[9px] text-zinc-500">v3.0</span>
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

            {/* Metrics Panel Summary Card */}
            <div className={`border p-5 space-y-4 ${
              isDarkMode ? 'bg-zinc-900/10 border-zinc-850' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <h3 className="text-xs font-bold uppercase border-b pb-2">Status Overview</h3>
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Auto Claimed Ratio</span>
                  <span className="font-bold text-emerald-500">
                    {issues.filter(i => i.status === 'AUTOMATICALLY_CLAIMED').length} / {issues.length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Target Filters</span>
                  <span className="font-bold">UI, Server, CLI</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Engine State</span>
                  <span className="font-bold text-emerald-500 flex items-center gap-1">
                    <span className="h-1 w-1 bg-emerald-500 rounded-full" />
                    Online
                  </span>
                </div>
              </div>
            </div>

          </aside>

        </div>

      </div>
    </div>
  );
}