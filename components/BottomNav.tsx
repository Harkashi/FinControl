import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AddActionSheet from './AddActionSheet';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Helper para vibração (Haptics)
  const triggerHaptic = (intensity: 'light' | 'medium' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(intensity === 'medium' ? 20 : 10);
    }
  };

  const handleNavClick = (path: string) => {
    if (location.pathname === path) return;
    triggerHaptic('light');
    navigate(path);
  };

  const handleFabClick = () => {
    triggerHaptic('medium');
    setIsSheetOpen(true);
  };

  const NavItem = ({ path, icon, label, exact = false }: { path: string; icon: string; label: string; exact?: boolean }) => {
    const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
    
    return (
      <button 
        onClick={() => handleNavClick(path)}
        className="group flex flex-col items-center justify-center w-full h-full outline-none select-none relative"
        aria-label={label}
        role="tab"
        aria-selected={isActive}
      >
        {/* Container do Ícone + Background Ativo */}
        <div className={`
           relative flex items-center justify-center w-12 h-8 rounded-2xl transition-all duration-300 ease-out mb-1
           ${isActive 
             ? 'bg-primary/10 dark:bg-primary/20 text-primary' 
             : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
        `}>
           <span className={`material-symbols-outlined text-[24px] transition-transform duration-300 ${isActive ? 'scale-105' : 'group-active:scale-90'}`}>
             {icon}
           </span>
        </div>
        
        {/* Label com altura fixa para evitar pulos de layout */}
        <span className={`
           text-[10px] font-bold transition-all duration-300 min-h-[14px] leading-tight
           ${isActive ? 'text-primary opacity-100' : 'text-slate-400 opacity-70 group-hover:opacity-100'}
        `}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Spacer para garantir que o conteúdo não fique escondido atrás da navbar */}
      <div className="h-[calc(4.5rem+env(safe-area-inset-bottom))]" />

      {/* A) Wrapper Fixo Global */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#101622]/95 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/5 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(0,0,0,0.03)] dark:shadow-none transition-all duration-300">
        
        {/* B) Container Interno (Centralizador Relativo) */}
        <div className="relative w-full max-w-lg mx-auto h-16 px-2">
          
          {/* C) Grid de 5 Colunas */}
          <div className="grid grid-cols-5 h-full w-full items-center justify-items-center">
            
            {/* Col 1 */}
            <div className="w-full h-full flex items-center justify-center">
              <NavItem path="/dashboard" label="Início" icon="grid_view" />
            </div>

            {/* Col 2 */}
            <div className="w-full h-full flex items-center justify-center">
              <NavItem path="/budgets" label="Orçamentos" icon="account_balance_wallet" />
            </div>
            
            {/* Col 3: SPACER (Vazio, apenas reserva espaço) */}
            <div className="pointer-events-none w-full" />

            {/* Col 4 */}
            <div className="w-full h-full flex items-center justify-center">
              <NavItem path="/statement" label="Extrato" icon="receipt_long" />
            </div>

            {/* Col 5 */}
            <div className="w-full h-full flex items-center justify-center">
              <NavItem path="/categories" label="Categorias" icon="category" />
            </div>

          </div>

          {/* D) Botão Central Absoluto (Ancorado ao Container Interno) */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 w-16 h-16 pointer-events-none flex items-center justify-center z-50">
             <button
                onClick={handleFabClick}
                className="pointer-events-auto w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 flex items-center justify-center transition-transform duration-200 active:scale-90 hover:scale-105 group ring-[6px] ring-background-light/50 dark:ring-background-dark/50"
                aria-label="Adicionar Transação"
             >
                <span className="material-symbols-outlined text-[32px] transition-transform duration-300 group-hover:rotate-90">add</span>
             </button>
          </div>

        </div>
      </nav>

      {/* Action Sheet Modal */}
      <AddActionSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </>
  );
};

export default BottomNav;