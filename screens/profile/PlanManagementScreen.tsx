import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import { UserProfile } from '../../types';

const PlanCard: React.FC<{ name: string; price: string; features: string[]; active: boolean; onSelect: () => void }> = ({ name, price, features, active, onSelect }) => (
  <div onClick={onSelect} className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${active ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.02]' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-[#192233] hover:border-primary/50'}`}>
    {active && (
      <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg flex items-center gap-1 shadow-sm">
        <span className="material-symbols-outlined text-[14px]">check</span> ATIVO
      </div>
    )}
    <h3 className="text-lg font-bold dark:text-white uppercase tracking-wide mb-1 flex items-center gap-2">
      {name}
      {name === 'Ultra' && <span className="material-symbols-outlined text-yellow-500 text-[20px]">verified</span>}
    </h3>
    <p className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">{price}<span className="text-sm font-medium text-slate-400">/mês</span></p>
    <ul className="space-y-2 mb-4">
      {features.map((f, i) => (
        <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="material-symbols-outlined text-green-500 text-[18px]">check</span>
          {f}
        </li>
      ))}
    </ul>
  </div>
);

const PlanManagementScreen: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'ultra'>('free');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      const profile = await db.getUserProfile();
      if (profile?.plan) {
        setCurrentPlan(profile.plan);
      }
      setIsInitializing(false);
    };
    fetchPlan();
  }, []);

  const handleUpdate = async (plan: 'free' | 'pro' | 'ultra') => {
    if (plan === currentPlan) return;
    
    // Simular confirmação premium
    if (plan !== 'free' && !window.confirm(`Confirma a assinatura do plano ${plan.toUpperCase()}?`)) return;

    setLoading(true);
    await db.updateUserProfile({ plan });
    setCurrentPlan(plan);
    setLoading(false);
  };

  if (isInitializing) {
    return <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
       <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Planos</h1>
      </header>
      <main className="p-4 space-y-4 pb-10">
        <PlanCard 
          name="Free" price="R$ 0,00" 
          features={['Transações ilimitadas', 'Gráficos básicos', 'Backup manual']} 
          active={currentPlan === 'free'} onSelect={() => handleUpdate('free')} 
        />
        <PlanCard 
          name="Pro" price="R$ 14,90" 
          features={['Tudo do Free', 'Exportação Excel/PDF', 'Sem anúncios', 'Temas exclusivos']} 
          active={currentPlan === 'pro'} onSelect={() => handleUpdate('pro')} 
        />
        <PlanCard 
          name="Ultra" price="R$ 29,90" 
          features={['Tudo do Pro', 'Inteligência Artificial', 'Consultoria mensal', 'Suporte Prioritário']} 
          active={currentPlan === 'ultra'} onSelect={() => handleUpdate('ultra')} 
        />
        
        {loading && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-[#192233] p-6 rounded-2xl flex flex-col items-center">
                 <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
                 <p className="font-bold dark:text-white">Atualizando assinatura...</p>
              </div>
           </div>
        )}
      </main>
    </div>
  );
};
export default PlanManagementScreen;