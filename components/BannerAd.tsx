
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BannerAdProps {
  freePlan: boolean;
}

const BannerAd: React.FC<BannerAdProps> = ({ freePlan }) => {
  const navigate = useNavigate();

  if (!freePlan) return null;

  return (
    <div className="mx-4 mb-6 animate-[fade-in_0.5s]">
      <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-[#111620] dark:to-[#1A2231] rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex items-center gap-3 relative overflow-hidden">
        {/* Ad Badge */}
        <div className="absolute top-0 left-0 bg-slate-300 dark:bg-slate-700 text-[8px] font-bold px-1.5 py-0.5 rounded-br-lg text-slate-600 dark:text-slate-300 z-10">
          PUBLICIDADE
        </div>

        {/* Content */}
        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 z-10">
           <span className="material-symbols-outlined text-white">savings</span>
        </div>
        <div className="flex-1 min-w-0 z-10">
           <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Investimento Inteligente</p>
           <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
             Multiplique seu patrimônio com as melhores taxas do mercado financeiro.
           </p>
        </div>
        <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold px-3 py-1.5 rounded-lg z-10">
           Ver
        </button>

        {/* Remove Ads CTA */}
        <button 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/profile/plan');
            }}
            className="absolute top-0 right-0 p-1.5 text-slate-400 hover:text-red-500 transition-colors z-20"
            title="Remover anúncios"
        >
            <span className="material-symbols-outlined text-[14px]">block</span>
        </button>
      </div>
      <div 
        onClick={() => navigate('/profile/plan')}
        className="text-center mt-1 cursor-pointer"
      >
        <p className="text-[9px] text-slate-400 hover:text-primary transition-colors underline decoration-slate-400/30">
            Seja PRO e remova os anúncios
        </p>
      </div>
    </div>
  );
};

export default BannerAd;
