import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Brain, Target, History, RefreshCcw, Sparkles } from 'lucide-react';
import ExpiryNotice from './ExpiryNotice';

// Dynamic API URL: points to /api in production or localhost in development
const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : '/api');

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
      const predRes = await axios.post(`${API_URL}/predict`);
      if (predRes.data.success) {
        setPrediction(predRes.data.data);
      }
      
      const statsRes = await axios.get(`${API_URL}/results/statistics`);
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      const latestRes = await axios.get(`${API_URL}/results/latest?limit=10`);
      if (latestRes.data.success) {
        setLatestResults(latestRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error?.response?.data?.error === 'LICENSE_EXPIRED' || error?.response?.status === 403) {
        setIsLicenseExpired(true);
      }
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

            <div className="grid grid-cols-1 gap-4 mb-5">
              <div className="bg-[#081229]/60 border border-sky-500/20 hover:border-sky-400/50 hover:bg-[#081229]/80 hover:shadow-[0_8px_20px_rgba(14,165,233,0.15)] transition-all duration-300 rounded-2xl p-4 flex items-center gap-4 hover:-translate-y-1">
                <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 shadow-[inset_0_0_10px_rgba(14,165,233,0.2)]">
                  <Activity size={24} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-sky-200/50 text-xs font-bold uppercase tracking-widest mb-1">Total Results</p>
                  <h3 className="text-2xl font-black text-sky-100">{stats.total_results || 0}</h3>
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

              {/* Next Prediction & Top 3 */}
              <div className="flex flex-col gap-4">
                <div className="relative overflow-hidden bg-gradient-to-br from-sky-900/60 to-cyan-900/40 border border-sky-400/30 rounded-2xl p-4 flex items-center justify-between shadow-[0_10px_30px_rgba(14,165,233,0.2)] group/pred hover:shadow-[0_10px_40px_rgba(14,165,233,0.4)] transition-all duration-500">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                  <div className="flex items-center gap-4 relative z-10">
                     <div className="p-4 rounded-2xl bg-sky-400/20 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.5)] group-hover/pred:scale-110 transition-transform duration-500">
                      <Target size={28} className="animate-[spin_4s_linear_infinite]" />
                    </div>
                    <div>
                      <p className="text-sky-300/80 text-[10px] font-black uppercase tracking-widest mb-1">Next Prediction</p>
                      <h2 className="text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-tighter">
                        {prediction?.prediction?.top_number ?? '-'}
                      </h2>
                    </div>
                  </div>
                  <div className="text-right relative z-10 bg-black/20 p-3 rounded-xl border border-sky-500/20 backdrop-blur-sm">
                    <p className="text-[10px] text-sky-200 uppercase font-bold tracking-wider mb-1">Confidence</p>
                    <p className="text-cyan-300 font-black text-xl drop-shadow-[0_0_8px_currentColor]">
                      {prediction ? (prediction.prediction.probability * 100).toFixed(2) + '%' : '-'}
                    </p>
                  </div>
                </div>

                <div className="bg-[#081229]/40 rounded-2xl p-4 border border-sky-500/10 flex-1 flex flex-col justify-center">
                  <h3 className="text-xs font-bold mb-2 flex items-center gap-2 text-sky-200 uppercase tracking-wider">
                    <History size={16} className="text-sky-400" />
                    Top Candidates
                  </h3>
                  <div className="space-y-3">
                    {topCandidates.map((item, idx) => (
                      <div key={idx} className="bg-[#0f172a]/80 hover:bg-sky-900/40 rounded-xl px-4 py-3 flex items-center justify-between border border-sky-500/20 hover:border-sky-400/50 transition-all duration-300 hover:translate-x-1 group/cand">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-lg ${idx === 0 ? 'bg-gradient-to-br from-sky-400 to-cyan-500 text-slate-900' : 'bg-slate-800 text-sky-300 border border-sky-500/30 group-hover/cand:border-sky-400'}`}>
                            #{idx + 1}
                          </span>
                          <span className="font-black text-lg text-sky-50">{item.number}</span>
                        </div>
                        <div className="font-black text-cyan-400 group-hover/cand:text-cyan-300 drop-shadow-[0_0_5px_currentColor]">
                          {(item.probability * 100).toFixed(2)}%
                        </div>
                      </div>
                    ))}
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
              Last 24 Hours Live Report
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
                    <div className="text-[10px] text-sky-400/60 font-normal">(गेल्या २४ तासांत)</div>
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                    <td key={num} className="bg-[#081229]/50 p-3 text-center border border-sky-900/50 text-sky-400 font-bold text-base">
                      {stats?.number_frequency_24h ? (stats.number_frequency_24h[num] || 0) : (stats?.number_frequency?.[num] || 0)}
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
                  <td className="bg-[#0b1b3d] font-bold p-3 border border-sky-900/50 text-sky-200">दिनांक आणि वेळ</td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                    <td key={num} className="bg-[#081229]/50 p-3 text-center border border-sky-900/50 text-sky-600 font-bold">
                      {stats?.last_seen?.[num] || '-'}
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
