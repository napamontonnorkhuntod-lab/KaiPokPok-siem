"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck, Terminal, Server, Network, Shield, Bell, Settings, Search, Cpu, HardDrive, ChevronLeft, ChevronRight, X, Menu } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const getSeverityStyle = (level: number) => {
  if (level >= 12) return { color: "red", bg: "bg-red-500", text: "text-red-500", border: "border-red-500", lightBg: "bg-red-500/10" };
  if (level >= 8) return { color: "orange", bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500", lightBg: "bg-orange-500/10" };
  if (level >= 5) return { color: "yellow", bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500", lightBg: "bg-amber-500/10" };
  return { color: "green", bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500", lightBg: "bg-emerald-500/10" };
};

export default function AdvancedSOC() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [isClient, setIsClient] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedSca, setSelectedSca] = useState<any>(null);
  const [selectedThreat, setSelectedThreat] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [logFilter, setLogFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilter(logFilter);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [logFilter]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data: aggregatedData, error: aggError } = useSWR(
    activeTab === "Dashboard" ? '/api/alerts?type=aggregated' : null, 
    fetcher, 
    { refreshInterval: 3000 }
  );

  const { data: rawData, error: rawError } = useSWR(
    activeTab === "Live Logs" ? `/api/alerts?type=raw&page=${currentPage}&limit=50&search=${encodeURIComponent(debouncedFilter)}` : null, 
    fetcher, 
    { refreshInterval: 5000 }
  );

  if (!isClient) return null;

  const alerts = aggregatedData?.data || [];
  const liveLogs = rawData?.data || [];
  const pagination = rawData?.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 };

  // Split and limit to 10
  const scaAlerts = alerts.filter((a: any) => a.is_sca).slice(0, 10);
  const threatAlerts = alerts.filter((a: any) => !a.is_sca).slice(0, 10);

  const criticalCount = alerts.filter((a: any) => a.level >= 12).reduce((acc: number, curr: any) => acc + (curr.count || 1), 0);
  const highRiskCount = alerts.filter((a: any) => a.level >= 8 && a.level < 12).reduce((acc: number, curr: any) => acc + (curr.count || 1), 0);

  // Dynamic SCA Score from OpenSearch
  const scaSummaries = alerts.filter((a: any) => a.rule_id === 'SCA-SUMMARY');
  const latestSca = scaSummaries.length > 0 ? scaSummaries[0] : null;
  const scaScore = latestSca ? `${latestSca.score}%` : 'N/A';
  const scaSubtext = latestSca ? `${latestSca.passed} Pass | ${latestSca.failed} Fail` : 'Waiting for scan...';
  const scaColorType = latestSca && latestSca.score < 80 ? 'warning' : 'success';

  const TRAFFIC_DATA = [
    { time: "14:00", events: 120, threats: 5 },
    { time: "14:10", events: 250, threats: 10 },
    { time: "14:20", events: 180, threats: 2 },
    { time: "14:30", events: 800, threats: 45 },
    { time: "14:40", events: 400, threats: 15 },
    { time: "14:50", events: 220, threats: 8 },
  ];

  return (
    <div className="flex h-screen bg-[#030712] text-slate-300 font-sans overflow-hidden selection:bg-cyan-500/30">
      
      {/* SIDEBAR */}
      <aside className={`border-r border-white/5 bg-[#0a0f1c]/90 flex flex-col py-4 transition-all duration-300 z-20 shrink-0 ${isSidebarOpen ? 'w-64 px-4' : 'w-16 px-2 items-center'}`}>
        <div className={`mb-8 w-full flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} gap-3`}>
          <div className="flex items-center gap-3">
            <div className="relative flex shrink-0 items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {isSidebarOpen && (
              <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider whitespace-nowrap">
                KaiPokPok Siem
              </span>
            )}
          </div>
          {isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} className="mb-6 p-2 text-slate-500 hover:text-white transition-colors rounded-xl hover:bg-white/5">
            <Menu className="w-5 h-5" />
          </button>
        )}

        <nav className="flex-1 w-full space-y-2">
          <NavItem icon={<Activity />} label="Dashboard" active={activeTab === "Dashboard"} isOpen={isSidebarOpen} onClick={() => setActiveTab("Dashboard")} />
          <NavItem icon={<Terminal />} label="Live Logs" active={activeTab === "Live Logs"} isOpen={isSidebarOpen} onClick={() => setActiveTab("Live Logs")} />
          <NavItem icon={<ShieldCheck />} label="SCA Compliance" isOpen={isSidebarOpen} />
          <NavItem icon={<Network />} label="Topology" isOpen={isSidebarOpen} />
        </nav>

        {isSidebarOpen && (
          <div className="w-full mt-auto">
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/5 shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${aggError ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'}`} />
                <span className={`text-xs font-semibold ${aggError ? 'text-red-400' : 'text-emerald-400'}`}>
                  {aggError ? 'OpenSearch Error' : 'Database Connected'}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-[#030712] to-[#030712]">
        
        {/* Squeezed TOP HEADER */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-[#030712]/80 backdrop-blur-sm z-10 sticky top-0">
          <div>
            <h1 className="text-xl font-light text-white tracking-wide">{activeTab} <span className="font-bold text-cyan-400">Overview</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search IOCs..." 
                className="pl-9 pr-4 py-1.5 bg-slate-900/50 border border-white/10 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all w-48 hover:bg-slate-800/50 text-white placeholder-slate-500"
              />
            </div>
          </div>
        </header>

        <div className="p-4 space-y-4 max-w-[2000px] w-full mx-auto relative flex-1">
          
          {activeTab === "Dashboard" ? (
            <>
              {/* Squeezed KPI CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Critical Alerts" value={criticalCount} subtext="L12-L15 Action required" type="critical" icon={<AlertTriangle />} />
                <KPICard title="High Risk" value={highRiskCount} subtext="L8-L11 Intrusions" type="warning" icon={<Activity />} />
                <KPICard title="SCA Score" value={scaScore} subtext={scaSubtext} type={scaColorType} icon={<ShieldCheck />} />
                <KPICard title="Events" value="Live" subtext="Aggregated mode" type="info" icon={<Cpu />} />
              </div>

              {/* Squeezed CHARTS ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-48">
                <div className="lg:col-span-2 rounded-xl bg-slate-900/40 border border-white/5 p-4 shadow-lg relative overflow-hidden group h-full flex flex-col">
                  <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
                  <div className="flex items-center justify-between mb-2 relative z-10 shrink-0">
                    <h2 className="text-sm font-semibold text-white tracking-wide">Threat Trajectory</h2>
                  </div>
                  <div className="flex-1 w-full relative z-10 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={TRAFFIC_DATA} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                        <XAxis dataKey="time" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} dy={5} fontFamily="monospace" />
                        <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} dx={-10} fontFamily="monospace" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="events" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900/40 border border-white/5 p-4 shadow-lg relative overflow-hidden h-full overflow-y-auto">
                  <h2 className="text-sm font-semibold text-white mb-3 tracking-wide">Top Assets</h2>
                  <div className="space-y-3 relative z-10">
                    {Array.from(new Set(alerts.map((a: any) => a.agent_name))).slice(0,4).map((host: any, i: number) => {
                       const count = alerts.filter((a: any) => a.agent_name === host).reduce((acc: number, curr: any) => acc + (curr.count || 1), 0);
                       return (
                        <div key={i} className="group">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="font-mono text-slate-300 flex items-center gap-1.5">
                              <HardDrive className="w-3 h-3 text-slate-500"/>
                              {host || 'Unknown'}
                            </span>
                            <span className="text-slate-400 font-mono bg-black/30 px-1.5 py-0.5 rounded">{count} incidents</span>
                          </div>
                          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${Math.min((count / 100) * 100 + 10, 100)}%` }} 
                              transition={{ duration: 1, delay: i * 0.1 }}
                              className="h-full rounded-full bg-cyan-500" 
                            />
                          </div>
                        </div>
                       );
                    })}
                  </div>
                </div>
              </div>

              {/* 30/70 SPLIT GRIDS FOR INCIDENTS */}
              <div className="grid grid-cols-10 gap-4 flex-1 min-h-[400px]">
                
                {/* LEFT 30%: SCA COMPLIANCE */}
                <div className="col-span-10 lg:col-span-3 rounded-xl bg-[#0a0f1c]/80 border border-white/5 shadow-xl overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-white/5 bg-white/[0.01]">
                    <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> SCA Compliance (Latest 10)
                    </h2>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/20 text-[9px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                          <th className="px-3 py-2 w-16">Lvl</th>
                          <th className="px-3 py-2">Rule/Check</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <AnimatePresence>
                          {scaAlerts.map((alert: any, i: number) => {
                            const style = getSeverityStyle(alert.level || 0);
                            return (
                              <motion.tr 
                                onClick={() => setSelectedSca(alert)}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={`sca_${alert.id}_${i}`} 
                                className="cursor-pointer hover:bg-white/[0.05] transition-colors group"
                              >
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <div className={`flex items-center justify-center w-6 h-6 rounded ${style.lightBg} ${style.text} font-bold text-[10px] border ${style.border}/30`}>
                                    L{alert.level || 0}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className={`text-xs font-medium truncate max-w-[150px] md:max-w-[200px] ${alert.level >= 12 ? 'text-red-100' : 'text-slate-200'}`}>
                                    {alert.description}
                                  </div>
                                </td>
                              </motion.tr>
                          )})}
                          {!scaAlerts.length && <tr><td colSpan={2} className="text-center py-6 text-slate-500 text-xs">No SCA Logs</td></tr>}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RIGHT 70%: THREAT ALERTS */}
                <div className="col-span-10 lg:col-span-7 rounded-xl bg-[#0a0f1c]/80 border border-white/5 shadow-xl overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-white/5 bg-white/[0.01]">
                    <h2 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> Threat Detection (Latest 10)
                    </h2>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/20 text-[9px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                          <th className="px-4 py-2">Time</th>
                          <th className="px-4 py-2">Lvl</th>
                          <th className="px-4 py-2">Description</th>
                          <th className="px-4 py-2">Asset</th>
                          <th className="px-4 py-2 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <AnimatePresence>
                          {threatAlerts.map((alert: any, i: number) => {
                            const style = getSeverityStyle(alert.level || 0);
                            const isAggregated = alert.count > 1;
                            return (
                              <motion.tr 
                                onClick={() => setSelectedThreat(alert)}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={`threat_${alert.id}_${i}`} 
                                className="cursor-pointer hover:bg-white/[0.05] transition-colors group"
                              >
                                <td className="px-4 py-3 whitespace-nowrap text-[10px] text-slate-400 font-mono">
                                  {new Date(alert['@timestamp']).toLocaleTimeString()}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className={`flex items-center justify-center w-7 h-7 rounded ${style.lightBg} ${style.text} font-bold text-[10px] border ${style.border}/30`}>
                                    L{alert.level || 0}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className={`text-xs font-medium truncate max-w-[300px] xl:max-w-[500px] ${alert.level >= 12 ? 'text-red-100' : 'text-slate-200'}`}>
                                    {alert.description}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                                    <Server className="w-3 h-3 text-slate-500" /> {alert.agent_name || 'Unknown'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                  {isAggregated ? (
                                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-bold rounded-full text-[10px] animate-pulse border border-indigo-500/30">
                                      {alert.count}x Hits
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">1</span>
                                  )}
                                </td>
                              </motion.tr>
                          )})}
                          {!threatAlerts.length && <tr><td colSpan={5} className="text-center py-6 text-slate-500 text-xs">No Threat Logs</td></tr>}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </>
          ) : (
            /* LIVE LOGS TAB (Squeezed slightly too) */
            <div className="rounded-xl bg-[#0a0f1c]/80 border border-white/5 shadow-xl overflow-hidden flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" /> Raw Streaming Logs
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Filter logs..." 
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-900/50 border border-white/10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all w-64 text-white placeholder-slate-500"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 animate-pulse flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live Polling
                </span>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/20 text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Lvl</th>
                      <th className="px-4 py-3">Rule</th>
                      <th className="px-4 py-3">Agent</th>
                      <th className="px-4 py-3 w-1/2">Raw Log</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {liveLogs.map((log: any, i: number) => {
                      const style = getSeverityStyle(log.level || 0);
                      return (
                        <tr key={`raw_${log.id}_${i}`} className="hover:bg-white/[0.03] transition-colors">
                          <td className="px-4 py-2 whitespace-nowrap text-[10px] text-slate-400 font-mono">
                            {new Date(log['@timestamp']).toISOString()}
                          </td>
                          <td className={`px-4 py-2 whitespace-nowrap font-bold text-[11px] ${style.text}`}>
                            {log.level}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-[10px] text-slate-300 font-mono">
                            {log.rule_id}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-[10px] text-slate-400">
                            {log.agent_name}
                          </td>
                          <td className="px-4 py-2 text-[10px] text-slate-500 font-mono truncate max-w-lg">
                            {log.full_log || log.description || JSON.stringify(log)}
                          </td>
                        </tr>
                      )
                    })}
                    {!liveLogs.length && <tr><td colSpan={5} className="text-center py-6 text-slate-500 text-xs">Waiting for OpenSearch raw logs...</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 font-mono">
                  Showing {pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={pagination.page <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-1.5 rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-300 font-mono">Page {pagination.page} of {Math.max(1, pagination.totalPages)}</span>
                  <button 
                    disabled={pagination.page >= pagination.totalPages || pagination.totalPages === 0}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-1.5 rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DRAWERS FOR DETAILS */}
      <AnimatePresence>
        {/* LEFT DRAWER - SCA */}
        {selectedSca && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedSca(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-[400px] bg-[#0a0f1c]/95 border-r border-white/10 z-50 shadow-2xl backdrop-blur-xl flex flex-col"
          >
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="font-semibold text-emerald-400 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> SCA Detail</h3>
              <button onClick={() => setSelectedSca(null)} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="mb-4">
                <p className="text-[10px] text-slate-500 font-mono mb-1">Check / Title</p>
                <p className="text-sm font-medium text-white bg-slate-900/50 p-3 rounded-lg border border-white/5">{selectedSca.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] text-slate-500 font-mono mb-1">Agent</p>
                  <p className="text-xs font-mono text-cyan-400">{selectedSca.agent_name}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] text-slate-500 font-mono mb-1">Result</p>
                  <p className={`text-xs font-mono ${selectedSca.level >= 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {selectedSca.level >= 5 ? 'FAILED' : 'PASSED'}
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-[10px] text-slate-500 font-mono mb-2 uppercase tracking-wider">Actions</p>
                <div className="flex gap-2">
                  <button className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    <Activity className="w-3.5 h-3.5" /> Trigger Rescan
                  </button>
                  <button className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Generate Report
                  </button>
                </div>
              </div>
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-mono mb-2">Raw JSON payload</p>
                <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap break-all leading-relaxed max-h-[200px] overflow-y-auto">
                  {JSON.stringify(selectedSca, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
          </>
        )}

        {/* RIGHT DRAWER - THREATS */}
        {selectedThreat && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedThreat(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[450px] bg-[#0a0f1c]/95 border-l border-white/10 z-50 shadow-2xl backdrop-blur-xl flex flex-col"
          >
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="font-semibold text-cyan-400 flex items-center gap-2"><Terminal className="w-4 h-4"/> Threat Detail</h3>
              <button onClick={() => setSelectedThreat(null)} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="mb-4 flex items-start gap-4">
                <div className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 text-red-500 font-bold text-lg border border-red-500/30`}>
                  L{selectedThreat.level}
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-mono mb-1">Rule ID: {selectedThreat.rule_id}</p>
                  <p className="text-sm font-medium text-white">{selectedThreat.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] text-slate-500 font-mono mb-1">Agent / Host</p>
                  <p className="text-xs font-mono text-cyan-400">{selectedThreat.agent_name}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] text-slate-500 font-mono mb-1">Occurrences</p>
                  <p className={`text-xs font-mono font-bold text-indigo-400`}>
                    {selectedThreat.count} Hits
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-[10px] text-slate-500 font-mono mb-2 uppercase tracking-wider">1-Click Actions</p>
                <div className="flex gap-2">
                  <button className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                    <ShieldAlert className="w-3.5 h-3.5" /> Block IP
                  </button>
                  <button className="flex-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-1.5 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                    <Server className="w-3.5 h-3.5" /> Isolate Host
                  </button>
                  <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Dismiss
                  </button>
                </div>
              </div>
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-mono mb-2">Raw JSON payload</p>
                <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap break-all leading-relaxed max-h-[200px] overflow-y-auto">
                  {JSON.stringify(selectedThreat, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

function NavItem({ icon, label, active, isOpen, count, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${active ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/5 text-cyan-400 border border-cyan-500/20 shadow-[inset_2px_0_0_rgba(6,182,212,1)]' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'} ${!isOpen && 'justify-center'}`}>
      <div className={`transition-colors shrink-0 ${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
        {React.cloneElement(icon, { className: "w-4 h-4" })}
      </div>
      {isOpen && <span className={`text-xs font-medium tracking-wide whitespace-nowrap ${active ? 'text-white' : ''}`}>{label}</span>}
      {isOpen && count && (
        <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.6)] border border-red-400/50">
          {count}
        </span>
      )}
    </button>
  );
}

function KPICard({ title, value, subtext, type, icon }: any) {
  const styles = {
    critical: "from-red-500/10 to-transparent border-red-500/20 text-red-500",
    warning: "from-orange-500/10 to-transparent border-orange-500/20 text-orange-500",
    success: "from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-500",
    info: "from-cyan-500/10 to-transparent border-cyan-500/20 text-cyan-500",
  }[type as string];

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      transition={{ type: "tween", duration: 0.2 }}
      className={`relative p-4 rounded-xl bg-gradient-to-br bg-slate-900/50 border overflow-hidden group cursor-default ${styles}`}
    >
      <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b opacity-40 pointer-events-none transition-opacity group-hover:opacity-70`} />
      
      <div className="relative flex justify-between items-start z-10">
        <div>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
          <h3 className={`text-2xl md:text-3xl font-light mt-1 mb-1 tracking-tight ${styles.split(' ').find(c => c.includes('text-'))}`}>{value}</h3>
          <p className="text-[9px] text-slate-500 font-mono bg-black/20 inline-block px-1.5 py-0.5 rounded">{subtext}</p>
        </div>
        <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${styles.split(' ').find(c => c.includes('text-'))}`}>
          {React.cloneElement(icon, { className: "w-4 h-4 md:w-5 md:h-5" })}
        </div>
      </div>
    </motion.div>
  );
}
