import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Server, 
  ShieldAlert, 
  RefreshCw, 
  Clock, 
  ExternalLink, 
  X, 
  Phone, 
  Mail, 
  MessageCircle, 
  Headphones,
  CheckCircle2
} from 'lucide-react';

const ExpiryNotice = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen p-6 relative overflow-hidden bg-[#060c1d] text-sky-50 font-sans flex items-center justify-center selection:bg-rose-500/30">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-rose-600/15 blur-[140px] pointer-events-none animate-pulse duration-[3000ms]" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-amber-600/10 blur-[150px] pointer-events-none animate-pulse duration-[5000ms] delay-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-950/20 blur-[180px] pointer-events-none" />

      <div className="max-w-2xl w-full mx-auto relative z-10">
        <div className="bg-[#0c1427]/85 backdrop-blur-2xl rounded-3xl shadow-[0_0_60px_rgba(244,63,94,0.15)] border border-rose-500/30 p-8 sm:p-10 text-center relative overflow-hidden">
          
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600" />

          {/* Warning Icon Badge */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500/20 to-amber-500/10 border border-rose-500/40 text-rose-400 mb-6 shadow-[0_0_35px_rgba(244,63,94,0.35)] relative">
            <ShieldAlert size={48} className="animate-pulse text-rose-400" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
            </span>
          </div>

          {/* Titles */}
          <div className="space-y-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <AlertTriangle size={13} />
              सर्व्हर व AI मॉडेल परवाना समाप्त
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-red-200 to-amber-200 tracking-tight">
              AI Model & Server Expired
            </h1>
            <p className="text-rose-300/80 text-sm font-medium">
              सेवा नूतनीकरण आवश्यक (Renewal Required)
            </p>
          </div>

          {/* Notice Card */}
          <div className="bg-[#070d1d]/90 rounded-2xl p-5 border border-rose-500/20 text-left mb-6 space-y-3 shadow-inner">
            <div className="flex items-center justify-between pb-3 border-b border-rose-500/15">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-rose-400" /> मुदत समाप्ती तारीख (Expiry Date)
              </span>
              <span className="text-sm font-black text-rose-400 font-mono bg-rose-950/50 px-2.5 py-0.5 rounded-lg border border-rose-500/30">
                01 October 2027
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-rose-500/15">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Server size={14} className="text-amber-400" /> सद्यस्थिती (Current Status)
              </span>
              <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                स्थगित / Suspended
              </span>
            </div>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pt-1">
              या ॲप्लिकेशनचा <strong className="text-white">AI प्रेडिक्शन मॉडेल</strong> आणि <strong className="text-white">क्लाउड सर्व्हर ऍक्सेस</strong> चा परवाना 
              <strong className="text-rose-400"> 1 ऑक्टोबर 2027</strong> रोजी समाप्त झाला आहे. AI इंजिन आणि डेटाबेस सेवा पूर्ववत सुरू करण्यासाठी कृपया सर्व्हर व मॉडेल रिन्यू (Renew) करा.
            </p>
          </div>

          {/* Instructions Box */}
          <div className="bg-gradient-to-r from-rose-950/30 via-slate-900/40 to-amber-950/30 rounded-2xl p-4 border border-rose-500/20 mb-6 text-center">
            <p className="text-xs text-slate-300 font-medium">
              सर्व्हर व AI मॉडेल रिन्यूअलसाठी खालील बटणावर क्लिक करून डेव्हलपरशी संपर्क साधा.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0f1b33] hover:bg-[#16274a] text-sky-200 border border-sky-500/30 hover:border-sky-400 transition-all text-xs font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <RefreshCw size={14} />
              स्थिती पुन्हा तपासा (Check Status)
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Headphones size={15} />
              Connect Developer
            </button>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-slate-500 mt-6 tracking-wider uppercase">
            System ID: AI-MOD-20271001 • Server: bipin151.tech
          </p>
        </div>
      </div>

      {/* Developer Contact Popup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b1528] border border-sky-500/30 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[0_0_50px_rgba(14,165,233,0.25)] relative overflow-hidden">
            
            {/* Top gradient highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600" />
            
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
              title="बंद करा"
            >
              <X size={16} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                <Headphones size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-wide">
                  Connect Developer
                </h3>
                <p className="text-xs text-sky-300/80">
                  सर्व्हर व AI मॉडेल रिन्यूअल सपोर्ट
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed bg-sky-950/30 p-3 rounded-xl border border-sky-500/20">
              AI प्रेडिक्शन मॉडेल आणि क्लाउड सर्व्हरची मुदत वाढवण्यासाठी खालीलपैकी कोणत्याही पर्यायाद्वारे डेव्हलपरशी थेट संपर्क साधा:
            </p>

            {/* Contact Options Grid */}
            <div className="space-y-3 mb-6">
              
              {/* WhatsApp Option */}
              <a 
                href="https://wa.me/919373000000?text=Hello%2C%20I%20want%20to%20renew%20the%20AI%20Model%20and%20Server%20License%20for%20bipin151.tech"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#081229] hover:bg-[#0f2147] border border-emerald-500/30 hover:border-emerald-400 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-emerald-300">WhatsApp Chat</p>
                    <p className="text-[11px] text-slate-400">थेट व्हॉट्सॲपवर मेसेज करा</p>
                  </div>
                </div>
                <ExternalLink size={15} className="text-emerald-400 opacity-70 group-hover:opacity-100" />
              </a>

              {/* Direct Call Option */}
              <a 
                href="tel:+919373000000"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#081229] hover:bg-[#0f2147] border border-sky-500/30 hover:border-sky-400 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-sky-300">Call Support</p>
                    <p className="text-[11px] text-slate-400">कॉल करून माहिती मिळवा</p>
                  </div>
                </div>
                <ExternalLink size={15} className="text-sky-400 opacity-70 group-hover:opacity-100" />
              </a>

            </div>

            {/* Modal Bottom Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              बंद करा (Close)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpiryNotice;
