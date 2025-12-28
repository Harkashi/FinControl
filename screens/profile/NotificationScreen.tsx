
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import { NotificationSettings } from '../../types';
import { SwitchItem } from '../../components/SettingsComponents';

const NotificationScreen: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'ultra'>('free');

  useEffect(() => {
    const load = async () => {
        const [s, p] = await Promise.all([
            db.getNotificationSettings(),
            db.getUserProfile()
        ]);
        setSettings(s);
        if (p) setUserPlan(p.plan);
    };
    load();
  }, []);

  const requestPermission = async () => {
    if ("Notification" in window && Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            new Notification("Notificações Ativadas", { body: "O FinControl te avisará sobre orçamentos e saldo." });
        }
    }
  };

  const isPremium = userPlan === 'pro' || userPlan === 'ultra';

  const toggle = async (key: keyof NotificationSettings) => {
    if (!settings) return;

    // Bloqueio Premium para Alertas de Orçamento
    if (key === 'alert_limit' && !isPremium) {
        if(confirm('Alertas de orçamento são exclusivos para planos Premium. Deseja ver os planos?')) {
            navigate('/profile/plan');
        }
        return;
    }

    const newVal = !settings[key];
    
    // Se estiver ativando, pedir permissão
    if (newVal) {
        requestPermission();
    }

    setSettings({ ...settings, [key]: newVal });
    await db.updateNotificationSettings({ [key]: newVal });
  };

  const setFrequency = async (freq: 'instant' | 'daily' | 'weekly') => {
    if (!settings) return;
    setSettings({ ...settings, frequency: freq });
    await db.updateNotificationSettings({ frequency: freq });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
       <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Notificações</h1>
      </header>
      <main className="p-4 space-y-6">
        
        {/* Toggles */}
        <div className="bg-white dark:bg-[#192233] rounded-xl overflow-hidden shadow-sm">
           <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
             <div className="flex items-center gap-2">
                <span className={`font-medium text-sm ${!isPremium ? 'text-slate-500' : 'dark:text-white'}`}>Alertar Limites de Orçamento</span>
                {!isPremium && <span className="material-symbols-outlined text-[16px] text-slate-400">lock</span>}
             </div>
             <SwitchItem checked={settings?.alert_limit ?? false} onChange={() => toggle('alert_limit')} />
           </div>
           <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
             <span className="dark:text-white font-medium text-sm">Alertar Saldo Baixo</span>
             <SwitchItem checked={settings?.alert_low_balance ?? false} onChange={() => toggle('alert_low_balance')} />
           </div>
           <div className="flex items-center justify-between p-4">
             <span className="dark:text-white font-medium text-sm">Relatório Mensal</span>
             <SwitchItem checked={settings?.alert_monthly_report ?? false} onChange={() => toggle('alert_monthly_report')} />
           </div>
        </div>

        {/* Frequency */}
        <div>
           <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">Frequência de Alertas</h3>
           <div className="bg-white dark:bg-[#192233] rounded-xl overflow-hidden shadow-sm p-2 flex flex-col gap-1">
              {['instant', 'daily', 'weekly'].map((f) => (
                <button 
                  key={f}
                  onClick={() => setFrequency(f as any)}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${settings?.frequency === f ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                   <span className="text-sm font-medium dark:text-white capitalize">
                     {f === 'instant' ? 'Instantâneo' : f === 'daily' ? 'Diário' : 'Semanal'}
                   </span>
                   {settings?.frequency === f && <span className="material-symbols-outlined text-primary text-[20px]">check</span>}
                </button>
              ))}
           </div>
        </div>

      </main>
    </div>
  );
};
export default NotificationScreen;
