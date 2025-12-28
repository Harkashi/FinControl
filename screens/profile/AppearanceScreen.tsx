
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../components/ThemeHandler';
import { db } from '../../services/database';

const AppearanceScreen: React.FC = () => {
  const navigate = useNavigate();
  const { theme, accentColor, chartStyle, setTheme, setAccentColor, setChartStyle } = useTheme();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPlan = async () => {
        const profile = await db.getUserProfile();
        if (profile && (profile.plan === 'pro' || profile.plan === 'ultra')) {
            setIsPremium(true);
        }
        setLoading(false);
    };
    checkPlan();
  }, []);

  const handlePremiumSelection = (action: () => void) => {
      if (isPremium) {
          action();
      } else {
          if(confirm('Este item é exclusivo para usuários Premium. Deseja ver os planos?')) {
              navigate('/profile/plan');
          }
      }
  };

  const LockOverlay = () => (
      <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-10">
          <span className="material-symbols-outlined text-slate-900 dark:text-white drop-shadow-md text-[18px]">lock</span>
      </div>
  );

  const colors = [
      { id: 'blue', color: '#135bec', label: 'Azul', free: true },
      { id: 'green', color: '#16a34a', label: 'Verde', free: true },
      { id: 'purple', color: '#9333ea', label: 'Roxo', free: false },
      { id: 'orange', color: '#f97316', label: 'Laranja', free: false },
      { id: 'pink', color: '#ec4899', label: 'Rosa', free: false },
      { id: 'cyan', color: '#06b6d4', label: 'Ciano', free: false },
      { id: 'red', color: '#ef4444', label: 'Vermelho', free: false },
      { id: 'yellow', color: '#eab308', label: 'Dourado', free: false },
      { id: 'indigo', color: '#6366f1', label: 'Índigo', free: false },
  ];

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
      <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Aparência</h1>
      </header>
      <main className="p-4 space-y-6 pb-12">
        
        {/* Theme Selector */}
        <div>
           <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase flex justify-between">
               Tema
               {!isPremium && !loading && <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">Opções Premium Bloqueadas</span>}
           </h3>
           <div className="grid grid-cols-3 gap-3">
              {/* Light - Free */}
              <button 
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative ${theme === 'light' ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#192233]'}`}
              >
                 <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                 <span className="text-xs font-bold dark:text-white">Claro</span>
              </button>

              {/* Dark - Free */}
              <button 
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative ${theme === 'dark' ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-[#101622]'}`}
              >
                 <div className="w-8 h-8 rounded-full bg-[#192233] border border-slate-700"></div>
                 <span className="text-xs font-bold dark:text-white">Escuro</span>
              </button>

              {/* Amoled - Premium */}
              <button 
                onClick={() => handlePremiumSelection(() => setTheme('amoled'))}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative overflow-hidden ${theme === 'amoled' ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-black'}`}
              >
                 {!isPremium && !loading && <LockOverlay />}
                 <div className="w-8 h-8 rounded-full bg-black border border-slate-800"></div>
                 <span className="text-xs font-bold dark:text-white">Amoled</span>
              </button>

              {/* Slate - Premium */}
              <button 
                onClick={() => handlePremiumSelection(() => setTheme('slate'))}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative overflow-hidden ${theme === 'slate' ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-[#18181b]'}`}
              >
                 {!isPremium && !loading && <LockOverlay />}
                 <div className="w-8 h-8 rounded-full bg-[#27272a] border border-slate-600"></div>
                 <span className="text-xs font-bold dark:text-white">Cinza</span>
              </button>

              {/* Midnight - Premium */}
              <button 
                onClick={() => handlePremiumSelection(() => setTheme('midnight'))}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative overflow-hidden ${theme === 'midnight' ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-[#0f172a]'}`}
              >
                 {!isPremium && !loading && <LockOverlay />}
                 <div className="w-8 h-8 rounded-full bg-[#1e293b] border border-slate-700"></div>
                 <span className="text-xs font-bold dark:text-white">Noturno</span>
              </button>
           </div>
        </div>

        {/* Accent Color Selector - Circles */}
        <div>
           <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase">Cor de Destaque</h3>
           <div className="flex flex-wrap gap-4">
              {colors.map((c) => (
                  <button 
                    key={c.id}
                    onClick={() => {
                        if (c.free) setAccentColor(c.id as any);
                        else handlePremiumSelection(() => setAccentColor(c.id as any));
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 relative overflow-hidden ${accentColor === c.id ? 'ring-4 ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark ring-gray-400' : ''}`}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  >
                    {!c.free && !isPremium && !loading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[16px]">lock</span>
                        </div>
                    )}
                    {accentColor === c.id && <span className="material-symbols-outlined text-white drop-shadow-md">check</span>}
                  </button>
              ))}
           </div>
        </div>

        {/* Chart Style Selector */}
        <div>
           <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase">Estilo dos Gráficos</h3>
           <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setChartStyle('detailed')}
                className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${chartStyle === 'detailed' ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#192233]'}`}
              >
                 <span className="text-sm font-bold dark:text-white">Detalhado</span>
                 {chartStyle === 'detailed' && <span className="material-symbols-outlined text-primary">check_circle</span>}
              </button>
              <button 
                onClick={() => setChartStyle('minimal')}
                className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${chartStyle === 'minimal' ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#192233]'}`}
              >
                 <span className="text-sm font-bold dark:text-white">Minimalista</span>
                 {chartStyle === 'minimal' && <span className="material-symbols-outlined text-primary">check_circle</span>}
              </button>
           </div>
        </div>
        
        {/* Preview Area */}
        <div className="bg-white dark:bg-[#192233] p-4 rounded-xl border border-slate-100 dark:border-transparent mt-4">
           <h4 className="text-sm font-bold dark:text-white mb-2">Pré-visualização</h4>
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                 <span className="material-symbols-outlined">add</span>
              </div>
              <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-md shadow-primary/20">Botão Primário</button>
              <span className="text-primary font-medium text-sm">Texto Colorido</span>
           </div>
        </div>

      </main>
    </div>
  );
};
export default AppearanceScreen;
