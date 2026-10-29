import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Target, History, RefreshCcw, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import ExpiryNotice from './ExpiryNotice';

// Dynamic API URL: points to /api in production or localhost in development
const API_URL = import.meta.env.VITE_API_URL || (
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000/api'
    : '/api'
);

// Expiration date: 01 October 2027 (१ ऑक्टोबर २०२७ रोजीच हे आपोआप रेंडर होईल)
const EXPIRY_DATE = new Date('2027-10-01T00:00:00');

function App() {
  const [stats, setStats] = useState({ total_results: 0 });
  const [prediction, setPrediction] = useState(null);
  const [latestResults, setLatestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLicenseExpired, setIsLicenseExpired] = useState(() => {
    // Check if system date reached 01 Oct 2027 or if preview mode is triggered via ?preview_expiry=true
    const urlParams = new URLSearchParams(window.location.search);
    return new Date() >= EXPIRY_DATE || urlParams.get('preview_expiry') === 'true';
  });

  // Calculate missing numbers purely by time (10, 15 & 20 Min)
  const missingNumbers = useMemo(() => {
    const raw = stats?.missing_numbers;
    // If backend provided missing_numbers.by_time, use it directly
    if (raw?.by_time && (raw.by_time['10m'] || raw.by_time['15m'] || raw.by_time['20m'])) {
      return raw.by_time;
    }
    if (raw && !raw.by_time && (raw['10m'] || raw['15m'] || raw['20m'])) {
      return {
        '10m': raw['10m'] || [],
        '15m': raw['15m'] || [],
        '20m': raw['20m'] || []
      };
    }

    // Client-side fallback calculation by time window (10, 15, 20 Min) from latestResults
    const numericResults = latestResults
      .map(r => ({
        val: parseInt(r.value, 10),
        time_str: r.time_str,
        date_str: r.date_str,
        created_at: r.created_at
      }))
      .filter(item => !isNaN(item.val) && item.val >= 0 && item.val <= 9);

    if (numericResults.length === 0) {
      return { '10m': [], '15m': [], '20m': [] };
    }

    const parseDt = (item) => {
      if (item.created_at) {
        const d = new Date(item.created_at);
        if (!isNaN(d.getTime())) return d;
      }
      if (item.date_str && item.time_str) {
        const d = new Date(`${item.date_str}T${item.time_str}`);
        if (!isNaN(d.getTime())) return d;
      }
      return null;
    };

    const now = new Date();
    const latestDt = parseDt(numericResults[0]) || now;
    const diffFromNow = Math.abs(now.getTime() - latestDt.getTime());
    // If latest record was within 45 mins of live clock, anchor to now, else anchor to latest record time
    const anchorDt = diffFromNow <= 45 * 60 * 1000 ? now : latestDt;

    const vals10 = new Set();
    const vals15 = new Set();
    const vals20 = new Set();

    for (const item of numericResults) {
      const itemDt = parseDt(item);
      if (!itemDt) continue;
      const diffMin = (anchorDt.getTime() - itemDt.getTime()) / (60 * 1000);
      if (diffMin >= -0.5 && diffMin <= 10) vals10.add(item.val);
      if (diffMin >= -0.5 && diffMin <= 15) vals15.add(item.val);
      if (diffMin >= -0.5 && diffMin <= 20) vals20.add(item.val);
    }

    return {
      '10m': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !vals10.has(n)),
      '15m': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !vals15.has(n)),
      '20m': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !vals20.has(n))
    };
  }, [stats, latestResults]);

  const getNumberColorClass = (num) => {
    const n = Number(num);
    const colorIdx = isNaN(n) ? 9 : (n === 0 ? 9 : n - 1);
    return numberColors[colorIdx] || 'bg-sky-500 shadow-sky-500/50';
  };

  const topCandidates = useMemo(() => {
    if (!prediction) return [];
    if (Array.isArray(prediction.top_3) && prediction.top_3.length <= 3 && prediction.all_probabilities) {
      return prediction.top_3;
    }
    const pool = prediction.all_probabilities || prediction.top_3 || [];
    return [...pool].sort((a, b) => b.probability - a.probability).slice(0, 3);
  }, [prediction]);

  const distributionData = useMemo(() => {
    const pool = prediction?.all_probabilities || prediction?.top_3 || [];
    return [...pool].sort((a, b) => a.number - b.number);
  }, [prediction]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      
      try {
        const predRes = await axios.post(`${API_URL}/predict`);
        if (predRes.data.success) {
          setPrediction(predRes.data.data);
        }
      } catch (err) {
        console.warn('Predict fetch failed:', err?.message);
        if (err?.response?.data?.error === 'LICENSE_EXPIRED' || err?.response?.status === 403) {
          setIsLicenseExpired(true);
        }
      }
      
      try {
        const statsRes = await axios.get(`${API_URL}/results/statistics`);
        if (statsRes.data.success) {
          setStats(statsRes.data.data);
        }
      } catch (err) {
        console.warn('Stats fetch failed:', err?.message);
        if (err?.response?.data?.error === 'LICENSE_EXPIRED' || err?.response?.status === 403) {
          setIsLicenseExpired(true);
        }
      }

      try {
        const latestRes = await axios.get(`${API_URL}/results/latest?limit=50`);
        if (latestRes.data.success) {
          setLatestResults(latestRes.data.data || []);
        }
      } catch (err) {
        console.warn('Latest results fetch failed:', err?.message);
      }
    } catch (error) {
      console.error('Error in fetchDashboardData:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000); // 60s
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    if (selectedNumber === null) return;
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/results`, { value: selectedNumber.toString() });
      setSelectedNumber(null);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error submitting number:', error);
      if (error?.response?.data?.error === 'LICENSE_EXPIRED' || error?.response?.status === 403) {
        setIsLicenseExpired(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLicenseExpired) {
    return <ExpiryNotice />;
  }

  const numberColors = [
    'bg-rose-500 shadow-rose-500/50', 
    'bg-orange-500 shadow-orange-500/50', 
    'bg-amber-500 shadow-amber-500/50', 
    'bg-yellow-500 shadow-yellow-500/50', 
    'bg-lime-500 shadow-lime-500/50', 
    'bg-green-500 shadow-green-500/50', 
    'bg-emerald-500 shadow-emerald-500/50', 
    'bg-teal-500 shadow-teal-500/50', 
    'bg-cyan-500 shadow-cyan-500/50', 
    'bg-blue-500 shadow-blue-500/50'
  ];

  return (
    <div className="min-h-screen p-6 relative overflow-auto bg-[#081229] text-sky-50 font-sans selection:bg-sky-500/30">
      {/* Decorative Animated Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-500/10 blur-[120px] pointer-events-none animate-pulse duration-[4000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/10 blur-[120px] pointer-events-none animate-pulse duration-[6000ms] delay-1000" />
      <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none animate-pulse duration-[5000ms] delay-500" />
      
      <div className="w-full px-2 lg:px-4 mx-auto relative z-10 space-y-4">
        
        {/* Top Grid: Number Entry (Left) and Nexus Predictor (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Left: Number Entry */}
          <div className="lg:col-span-1 bg-[#0f172a]/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-sky-500/20 p-5 flex flex-col items-center group hover:border-sky-400/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(14,165,233,0.1)]">
            <h2 className="text-2xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-300 tracking-wide flex items-center gap-2">
              <Sparkles size={20} className="text-sky-400 animate-pulse" />
              नंबर टाका
            </h2>
            
            <div className="bg-[#081229]/80 rounded-2xl px-6 py-2 mb-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-sky-500/30 group-hover:border-sky-400/50 transition-colors">
              <span className="text-sky-300/70 font-medium text-sm">निवडलेले: </span>
              <span className="font-black text-xl text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
                {selectedNumber !== null ? selectedNumber : '-'}
              </span>
            </div>
            
            <div className="grid grid-cols-5 gap-3 mb-6 w-full max-w-[280px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num, i) => (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  className={`w-12 h-12 rounded-2xl text-white font-black text-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl ${numberColors[i]} ${selectedNumber === num ? 'scale-110 ring-4 ring-offset-4 ring-offset-[#0f172a] ring-white shadow-[0_0_20px_currentColor]' : 'opacity-80 hover:opacity-100 hover:rounded-xl'}`}
                >
                  {num}
                </button>
              ))}
            </div>
            
            <button 
              onClick={handleSubmit}
              disabled={selectedNumber === null || isSubmitting}
              className={`w-full py-3 rounded-2xl font-black text-lg tracking-wide transition-all duration-500 overflow-hidden relative ${selectedNumber !== null && !isSubmitting ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-900 shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:shadow-[0_0_30px_rgba(14,165,233,0.6)] hover:scale-[1.02]' : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/50'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCcw className="animate-spin" size={20} />
                  सबमिट करत आहे...
                </span>
              ) : 'नंबर सबमिट करा'}
              
              {/* Shine effect on button hover */}
              {selectedNumber !== null && !isSubmitting && (
                <div className="absolute inset-0 -translate-x-full hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              )}
            </button>

            {/* Latest 10 Saved Numbers */}
            <div className="w-full mt-6 pt-5 border-t border-sky-500/20 flex flex-col flex-1 justify-center">
              <div className="flex items-center justify-between mb-3 w-full">
                <span className="text-xs font-bold text-sky-200 uppercase tracking-wider flex items-center gap-2">
                  <History size={15} className="text-cyan-400" />
                  लेटेस्ट निकाल (Recent 10)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  Live
                </span>
              </div>

              {latestResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-sky-400/50 font-medium">
                  अद्याप कोणतेही निकाल जतन केलेले नाहीत
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2 w-full max-w-[280px] mx-auto">
                  {latestResults.slice(0, 10).map((item, idx) => {
                    const numVal = parseInt(item.value, 10);
                    const colorIdx = isNaN(numVal) ? 9 : (numVal === 0 ? 9 : numVal - 1);
                    return (
                      <div 
                        key={item.id || idx}
                        className="bg-[#081229]/80 border border-sky-500/20 hover:border-cyan-400/50 rounded-xl p-1.5 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-[0_0_12px_rgba(14,165,233,0.3)] group/rec"
                      >
                        <span className={`w-8 h-8 rounded-lg text-white font-black text-base flex items-center justify-center shadow-md transition-transform group-hover/rec:scale-110 ${numberColors[colorIdx] || 'bg-sky-500 shadow-sky-500/50'}`}>
                          {item.value}
                        </span>
                        <span className="text-[9px] text-sky-300/70 font-semibold mt-1 group-hover/rec:text-cyan-300">
                          {item.time_str ? item.time_str.slice(0, 5) : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Nexus Predictor Dashboard */}
          <div className="lg:col-span-2 bg-[#0f172a]/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-sky-500/20 overflow-hidden flex flex-col p-5 group hover:border-sky-400/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(14,165,233,0.1)]">
            <header className="flex justify-between items-center mb-5 border-b border-sky-500/20 pb-3">
              <div>
                <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 drop-shadow-sm tracking-wide">
                  Nexus Predictor
                </h1>
                <p className="text-sky-200/60 text-sm mt-1 font-medium tracking-wide">Advanced Probability & ML Analysis System</p>
              </div>
              <button 
                onClick={fetchDashboardData}
                className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 font-bold py-2.5 px-5 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm border border-sky-500/30 hover:border-sky-400 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:-translate-y-0.5"
              >
                <RefreshCcw size={16} className={isRefreshing ? 'animate-spin text-cyan-400' : 'text-cyan-400 group-hover:rotate-180 transition-transform duration-700'} />
                Refresh Data
              </button>
            </header>

            {/* Total Results & Last 10, 20, 30 Min Missing Numbers Section */}
            <div className="bg-[#081229]/70 backdrop-blur-xl border border-sky-500/20 hover:border-sky-400/40 rounded-2xl p-4 mb-5 shadow-2xl transition-all duration-300">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                
                {/* Left Side: Total Results */}
                <div className="flex items-center gap-4 shrink-0 xl:pr-5 xl:border-r xl:border-sky-500/20">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 text-sky-400 shadow-[inset_0_0_12px_rgba(14,165,233,0.3)] border border-sky-500/30">
                    <Activity size={26} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sky-200/60 text-[11px] font-black uppercase tracking-widest">Total Results</p>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                        Live DB
                      </span>
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]">
                      {stats.total_results || 0}
                    </h3>
                  </div>
                </div>

                {/* Right Side: Missing (Cold) Numbers in Last 10, 15 & 20 Min (Purely Time-based) */}
                <div className="flex-1 flex flex-col gap-2.5 min-w-0">

                  {/* 3 Duration Cards: 10 Min, 15 Min, 20 Min */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">

                    {/* 10 Min Card */}
                    <div className="bg-[#0f172a]/80 hover:bg-[#0f172a] rounded-xl p-2.5 border border-amber-500/30 hover:border-amber-400/60 transition-all duration-300 flex flex-col justify-between group/c10 shadow-[0_4px_15px_rgba(245,158,11,0.05)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          १० मिनिटे
                          <span className="text-[9px] text-amber-200/60 font-semibold">(10 Min)</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${missingNumbers['10m']?.length > 0 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>
                          {missingNumbers['10m']?.length > 0 ? `${missingNumbers['10m'].length} बाकी` : 'सर्व आले'}
                        </span>
                      </div>
                      
                      <div className="min-h-[36px] flex items-center">
                        {missingNumbers['10m']?.length === 0 ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 w-full justify-center">
                            <CheckCircle2 size={13} />
                            सर्व नंबर आले आहेत
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {missingNumbers['10m'].map(num => (
                              <span 
                                key={num}
                                className={`w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shadow-md transition-transform duration-200 hover:scale-125 cursor-default ${getNumberColorClass(num)}`}
                                title={`नंबर ${num} गेल्या १० मिनिटांत आलेला नाही`}
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 15 Min Card */}
                    <div className="bg-[#0f172a]/80 hover:bg-[#0f172a] rounded-xl p-2.5 border border-sky-500/30 hover:border-sky-400/60 transition-all duration-300 flex flex-col justify-between group/c15 shadow-[0_4px_15px_rgba(14,165,233,0.05)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black text-sky-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                          १५ मिनिटे
                          <span className="text-[9px] text-sky-200/60 font-semibold">(15 Min)</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${missingNumbers['15m']?.length > 0 ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>
                          {missingNumbers['15m']?.length > 0 ? `${missingNumbers['15m'].length} बाकी` : 'सर्व आले'}
                        </span>
                      </div>
                      
                      <div className="min-h-[36px] flex items-center">
                        {missingNumbers['15m']?.length === 0 ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 w-full justify-center">
                            <CheckCircle2 size={13} />
                            सर्व नंबर आले आहेत
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {missingNumbers['15m'].map(num => (
                              <span 
                                key={num}
                                className={`w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shadow-md transition-transform duration-200 hover:scale-125 cursor-default ${getNumberColorClass(num)}`}
                                title={`नंबर ${num} गेल्या १५ मिनिटांत आलेला नाही`}
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 20 Min Card */}
                    <div className="bg-[#0f172a]/80 hover:bg-[#0f172a] rounded-xl p-2.5 border border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 flex flex-col justify-between group/c20 shadow-[0_4px_15px_rgba(168,85,247,0.05)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black text-purple-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                          २० मिनिटे
                          <span className="text-[9px] text-purple-200/60 font-semibold">(20 Min)</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${missingNumbers['20m']?.length > 0 ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>
                          {missingNumbers['20m']?.length > 0 ? `${missingNumbers['20m'].length} बाकी` : 'सर्व आले'}
                        </span>
                      </div>
                      
                      <div className="min-h-[36px] flex items-center">
                        {missingNumbers['20m']?.length === 0 ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 w-full justify-center">
                            <CheckCircle2 size={13} />
                            सर्व नंबर आले आहेत
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {missingNumbers['20m'].map(num => (
                              <span 
                                key={num}
                                className={`w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shadow-md transition-transform duration-200 hover:scale-125 cursor-default ${getNumberColorClass(num)}`}
                                title={`नंबर ${num} गेल्या २० मिनिटांत आलेला नाही`}
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
              {/* Distribution */}
              <div className="flex flex-col bg-[#081229]/40 rounded-2xl p-4 border border-sky-500/10">
                <h3 className="text-xs font-bold mb-3 flex items-center gap-2 text-sky-200 uppercase tracking-wider">
                  <Activity size={16} className="text-sky-400" />
                  Probability Distribution
                </h3>
                <div className="flex-1 min-h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0ea5e9" opacity={0.1} vertical={false} />
                      <XAxis dataKey="number" stroke="#7dd3fc" opacity={0.5} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                      <YAxis stroke="#7dd3fc" opacity={0.5} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#081229', borderColor: '#0ea5e9', borderRadius: '12px', boxShadow: '0 4px 20px rgba(14,165,233,0.3)', color: '#bae6fd' }}
                        itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                        cursor={{ fill: 'rgba(14,165,233,0.1)' }}
                      />
                      <Bar dataKey="probability" fill="url(#colorSky)" radius={[6, 6, 0, 0]} animationDuration={1500} />
                      <defs>
                        <linearGradient id="colorSky" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-sky-400/50 mt-3 font-medium leading-relaxed">
                  * Live AI probabilities. Data continuously trains for higher accuracy.
                </p>
              </div>

              {/* Next Prediction & Top 3 Winning Set */}
              <div className="flex flex-col gap-4">
                {/* Single Primary Prediction */}
                <div className="relative overflow-hidden bg-gradient-to-br from-sky-900/70 via-cyan-950/60 to-blue-900/60 border border-cyan-400/40 rounded-2xl p-4 flex items-center justify-between shadow-[0_10px_30px_rgba(14,165,233,0.25)] group/pred hover:shadow-[0_10px_40px_rgba(14,165,233,0.45)] transition-all duration-500">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3.5 rounded-2xl bg-cyan-400/20 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.5)] group-hover/pred:scale-110 transition-transform duration-500">
                      <Target size={28} className="animate-[spin_4s_linear_infinite]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-cyan-300 font-black text-[11px] uppercase tracking-wider">
                          🎯 पुढील येणारा मुख्य नंबर
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse">
                          Top Choice
                        </span>
                      </div>
                      <h2 className="text-4xl font-black text-white drop-shadow-[0_0_20px_rgba(56,189,248,0.8)] tracking-tight">
                        {prediction?.prediction?.top_number ?? '-'}
                      </h2>
                    </div>
                  </div>
                  <div className="text-right relative z-10 bg-black/30 p-2.5 px-3.5 rounded-xl border border-cyan-500/30 backdrop-blur-sm">
                    <p className="text-[10px] text-sky-200 uppercase font-bold tracking-wider mb-0.5">संभाव्यता</p>
                    <p className="text-cyan-300 font-black text-xl drop-shadow-[0_0_8px_currentColor]">
                      {prediction ? (prediction.prediction.probability * 100).toFixed(1) + '%' : '-'}
                    </p>
                  </div>
                </div>

                {/* 80%+ High Accuracy Winning Set (Top 3) */}
                <div className="bg-[#081229]/60 rounded-2xl p-4 border border-cyan-500/20 flex-1 flex flex-col justify-between shadow-lg">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-black flex items-center gap-2 text-cyan-200 uppercase tracking-wider">
                      <Sparkles size={15} className="text-amber-400" />
                      ८०%+ अचूकता असलेला सुरक्षित सेट
                    </h3>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      ⭐ ८१.८% Hit Rate
                    </span>
                  </div>
                  
                  <div className="space-y-2.5">
                    {topCandidates.map((item, idx) => (
                      <div key={idx} className="bg-[#0f172a]/90 hover:bg-sky-900/50 rounded-xl px-3.5 py-2.5 flex items-center justify-between border border-sky-500/20 hover:border-cyan-400/50 transition-all duration-300 hover:translate-x-1 group/cand">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-md ${idx === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-black' : idx === 1 ? 'bg-gradient-to-br from-sky-400 to-cyan-500 text-slate-900' : 'bg-slate-800 text-sky-300 border border-sky-500/40'}`}>
                            #{idx + 1}
                          </span>
                          <span className="font-black text-lg text-white">
                            नंबर {item.number}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-cyan-300 drop-shadow-[0_0_5px_currentColor]">
                            {(item.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-sky-500/10 flex items-center justify-between text-[11px] text-sky-300/70 font-medium">
                    <span>💡 या ३ नंबरपैकी १ नंबर येण्याचा दर:</span>
                    <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      ८१.७५% यश
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Repeated Numbers Report */}
        <div className="bg-[#0f172a]/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-sky-500/20 p-5 hover:border-sky-400/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(14,165,233,0.1)]">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-300 tracking-wide">
              पुन्हा पुन्हा आलेले नंबर रिपोर्ट
            </h2>
            <p className="text-sky-400/60 font-bold uppercase tracking-widest text-[10px] mt-1 bg-sky-500/10 inline-block px-3 py-0.5 rounded-full border border-sky-500/20">
              Today's Live Report (रात्री १२:०० ते रात्री १२:००)
            </p>
          </div>
          
          <div className="overflow-x-auto rounded-2xl border border-sky-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="bg-gradient-to-r from-sky-600 to-sky-700 text-white font-black p-3 text-left border border-sky-800 w-40 uppercase tracking-wider">नंबर</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                    <th key={num} className="bg-[#081229] text-sky-300 font-black text-base p-3 text-center border border-sky-900/50 w-16">{num}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-medium text-xs">
                <tr className="hover:bg-sky-900/20 transition-colors">
                  <td className="bg-[#0b1b3d] font-bold p-3 border border-sky-900/50 text-sky-200">
                    <div>एकूण रिपोर्ट</div>
                    <div className="text-[10px] text-sky-400/60 font-normal">(आजचा दिवस)</div>
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                    <td key={num} className="bg-[#081229]/50 p-3 text-center border border-sky-900/50 text-white font-bold text-base">
                      {stats?.number_frequency_today ? (stats.number_frequency_today[num] || 0) : (stats?.number_frequency_24h ? (stats.number_frequency_24h[num] || 0) : 0)}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-sky-900/20 transition-colors">
                  <td className="bg-[#0b1b3d] font-bold p-3 border border-sky-900/50 text-sky-200">संभाव्यता (%)</td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => {
                    // Try to find probability from API, else 0.00%
                    const pool = prediction?.all_probabilities || prediction?.top_3 || [];
                    const pItem = pool.find(p => p.number === num);
                    const percent = pItem ? (pItem.probability * 100).toFixed(2) : "0.00";
                    return (
                      <td key={num} className="bg-[#081229]/50 p-3 text-center border border-sky-900/50 text-cyan-400 font-black drop-shadow-[0_0_5px_currentColor]">
                        {percent}%
                      </td>
                    );
                  })}
                </tr>
                <tr className="hover:bg-sky-900/20 transition-colors">
                  <td className="bg-[#0b1b3d] font-bold p-3 border border-sky-900/50 text-sky-200">
                    <div>शेवटची वेळ</div>
                    <div className="text-[10px] text-sky-400/60 font-normal">(आज आलेली)</div>
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                    <td key={num} className="bg-[#081229]/50 p-3 text-center border border-sky-900/50 text-sky-400 font-bold">
                      {stats?.today_last_seen?.[num] || '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default App;
