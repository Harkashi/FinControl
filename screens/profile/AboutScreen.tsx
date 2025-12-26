import React from 'react';
import { useNavigate } from 'react-router-dom';

const AboutScreen: React.FC = () => {
  const navigate = useNavigate();
  const appVersion = "1.0.3";

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
      <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Sobre</h1>
      </header>
      <main className="p-4 space-y-6">
        <div className="flex flex-col items-center justify-center py-8">
           <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-xl shadow-primary/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-white text-5xl">account_balance_wallet</span>
           </div>
           <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">FinControl</h2>
           <p className="text-slate-500 dark:text-slate-400 font-medium">Versão {appVersion}</p>
        </div>

        <div className="bg-white dark:bg-[#192233] rounded-xl overflow-hidden shadow-sm">
           <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold dark:text-white mb-2">O que há de novo</h3>
              <ul className="space-y-3">
                 <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                    <div>
                       <strong className="block text-slate-900 dark:text-white">Sequências (Streaks)</strong>
                       Acompanhe quantos dias seguidos você usa o app.
                    </div>
                 </li>
                 <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                    <div>
                       <strong className="block text-slate-900 dark:text-white">Planos Dinâmicos</strong>
                       Gerencie sua assinatura diretamente pelo app.
                    </div>
                 </li>
                 <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                    <div>
                       <strong className="block text-slate-900 dark:text-white">Estilos de Gráfico</strong>
                       Escolha entre visual Detalhado ou Minimalista.
                    </div>
                 </li>
              </ul>
           </div>
           <div className="p-4">
              <h3 className="font-bold dark:text-white mb-2">Suporte</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                 Encontrou um bug ou tem uma sugestão? Entre em contato conosco.
              </p>
              <button className="w-full py-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                 Falar com Suporte
              </button>
           </div>
        </div>

        <p className="text-center text-xs text-slate-400">
           © 2024 FinControl Inc. Todos os direitos reservados.
        </p>
      </main>
    </div>
  );
};

export default AboutScreen;