import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/database';
import { DashboardMetrics } from '../types';

const ShortcutsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [shortcuts, setShortcuts] = useState<DashboardMetrics['topExpenses']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await db.getDashboardMetrics();
        setShortcuts(data.metrics.topExpenses || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSelect = (s: any) => {
    navigate('/add', { 
        state: { 
            description: s.title, 
            categoryId: s.categoryId, 
            type: 'expense' 
        } 
    });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
      <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Atalhos Rápidos</h1>
      </header>
      
      <main className="p-4 flex-1">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 px-1">
            Seus gastos mais frequentes aparecem aqui para acesso rápido.
        </p>

        {loading ? (
             <div className="flex justify-center py-10">
                <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
             </div>
        ) : (
            <div className="flex flex-col gap-3">
                {shortcuts.map((s, idx) => (
                <button 
                    key={idx} 
                    onClick={() => handleSelect(s)} 
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#192233] rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-primary transition-all active:scale-[0.98]"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                             <span className="material-symbols-outlined">bolt</span>
                        </div>
                        <div className="flex flex-col items-start">
                            <p className="font-bold text-slate-900 dark:text-white text-lg">
                                {s.title}
                            </p>
                            <p className="text-xs text-slate-500">
                                Valor frequente: ~R$ {s.amount.toFixed(0)}
                            </p>
                        </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </button>
                ))}
                
                {shortcuts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                    <span className="material-symbols-outlined text-4xl mb-2">history</span>
                    <p className="text-sm">Use o app por alguns dias para<br/>receber sugestões personalizadas.</p>
                </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
};

export default ShortcutsScreen;