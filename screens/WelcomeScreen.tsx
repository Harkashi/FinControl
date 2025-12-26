import React from 'react';
import { useNavigate } from 'react-router-dom';

const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark mx-auto">
      {/* Header / Logo Area */}
      <div className="flex items-center justify-center pt-8 pb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl">account_balance_wallet</span>
          <span className="text-lg font-bold tracking-tight dark:text-white">FinControl</span>
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col items-center justify-center w-full px-6">
        {/* Hero Illustration */}
        <div className="w-full relative mb-8 flex justify-center">
          {/* Decorative glow behind image */}
          <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full transform scale-75"></div>
          {/* Main Image */}
          <div 
            className="relative w-full aspect-square max-w-[320px] bg-center bg-no-repeat bg-contain rounded-2xl z-10"
            style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDpyjDohqE781rx296GnCf4TLM7Fykc1sTuNqpFddrz-P8BjILQIgC0SYLvXElForX6ee4dTxq42mPKyIqBjWSkRPWlltc6Ub7wE0zLyxbd8IsMMYtAc9lTt8YbA-uFYSltoxRuGCU5-YVwUDhLxUC2-9_JMIV-Wlcytmj5jLu3kHNZ44WMHeR_58D55Klhyd9SpT5yuDhoSJDIqiQPbZ-ld6UnRz468f07K52MZRLTLfSMAGcW2Kr2puE-oRDL1nGxkYTz9BYPdW3K")'}}
          >
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center text-center space-y-4 mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight dark:text-white text-slate-900">
            Seu dinheiro,<br />
            <span className="text-primary">sob controle.</span>
          </h1>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px]">
            Organize gastos, alcance metas e veja seu patrimônio crescer em um só lugar.
          </p>
        </div>

        {/* Page Indicators */}
        <div className="flex w-full flex-row items-center justify-center gap-2 mb-8">
          <div className="h-2 w-6 rounded-full bg-primary"></div>
          <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700"></div>
          <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700"></div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="w-full px-6 pb-10 pt-4">
        <div className="flex flex-col gap-3">
          {/* Primary Button */}
          <button 
            onClick={() => navigate('/login')}
            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-primary hover:bg-blue-600 transition-colors text-white text-lg font-bold leading-normal tracking-wide shadow-lg shadow-primary/25"
          >
            <span className="truncate">Começar Agora</span>
          </button>
          {/* Secondary Button */}
          <button 
             onClick={() => navigate('/login')}
             className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-transparent border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-900 dark:text-white text-base font-bold leading-normal"
          >
            <span className="truncate">Já tenho uma conta</span>
          </button>
        </div>

        {/* Social Login Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-800"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background-light dark:bg-background-dark px-2 text-slate-400">Ou entre com</span>
          </div>
        </div>

        {/* Social Icons */}
        <div className="flex justify-center gap-4">
          <button aria-label="Entrar com Apple" className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-slate-900 dark:text-white text-2xl">pest_control</span> 
          </button>
          <button aria-label="Entrar com Google" className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-slate-900 dark:text-white text-2xl">language</span> 
          </button>
        </div>

        {/* Terms */}
        <p className="text-xs text-center text-slate-400 mt-6 px-4">
          Ao continuar, você concorda com nossos <a href="#" className="underline hover:text-primary">Termos</a> e <a href="#" className="underline hover:text-primary">Privacidade</a>.
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;