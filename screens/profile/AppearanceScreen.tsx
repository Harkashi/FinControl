import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../components/ThemeHandler';

const AppearanceScreen: React.FC = () => {
  const navigate = useNavigate();
  const { theme, accentColor, chartStyle, setTheme, setAccentColor, setChartStyle } = useTheme();

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
      <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Aparência</h1>
      </header>
      <main className="p-4 space-y-6">
        
        {/* Theme Selector */}
        <div>
           <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase">Tema</h3>
           <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#192233]'}`}
              >
                 <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                 <span className="text-xs font-bold dark:text-white">Claro</span>
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-[#101622]'}`}
              >
                 <div className="w-8 h-8 rounded-full bg-[#192233] border border-slate-700"></div>
                 <span className="text-xs font-bold dark:text-white">Escuro</span>
              </button>
              <button 
                onClick={() => setTheme('amoled')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'amoled' ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-black'}`}
              >
                 <div className="w-8 h-8 rounded-full bg-black border border-slate-800"></div>
                 <span className="text-xs font-bold dark:text-white">Amoled</span>
              </button>
           </div>
        </div>

        {/* Accent Color Selector */}
        <div>
           <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase">Cor de Destaque</h3>
           <div className="flex gap-4">
              {['blue', 'purple', 'orange', 'green'].map((c) => (
                <button 
                  key={c}
                  onClick={() => setAccentColor(c as any)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 ${accentColor === c ? 'ring-4 ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark ring-gray-400' : ''}`}
                  style={{ backgroundColor: c === 'blue' ? '#135bec' : c === 'purple' ? '#9333ea' : c === 'orange' ? '#f97316' : '#16a34a' }}
                >
                  {accentColor === c && <span className="material-symbols-outlined text-white">check</span>}
                </button>
              ))}
           </div>
        </div>

        {/* Chart Style Selector (New) */}
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
        
        <div className="bg-white dark:bg-[#192233] p-4 rounded-xl border border-slate-100 dark:border-transparent mt-4">
           <h4 className="text-sm font-bold dark:text-white mb-2">Pré-visualização</h4>
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                 <span className="material-symbols-outlined">add</span>
              </div>
              <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">Botão Primário</button>
              <span className="text-primary font-medium text-sm">Texto Colorido</span>
           </div>
        </div>

      </main>
    </div>
  );
};
export default AppearanceScreen;
