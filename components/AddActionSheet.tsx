import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AddActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddActionSheet: React.FC<AddActionSheetProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimate(true);
      // Haptic feedback ao abrir
      if (navigator.vibrate) navigator.vibrate(15);
    } else {
      const timer = setTimeout(() => setAnimate(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !animate) return null;

  const handleNavigate = (path: string, state: any = {}) => {
    onClose();
    // Pequeno delay para a animação de fechar rodar antes de navegar
    setTimeout(() => {
      navigate(path, { state });
    }, 150);
  };

  const ActionButton = ({ icon, label, color, onClick, delay }: any) => (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center gap-2 transition-all duration-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform ${color}`}>
        <span className="material-symbols-outlined text-white text-[28px]">{icon}</span>
      </div>
      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div 
        className={`relative w-full max-w-lg bg-white dark:bg-[#1e2330] rounded-t-[2rem] p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle Bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />

        <div className="mb-6 mt-2 text-center">
           <h3 className="text-lg font-bold text-slate-900 dark:text-white">Adicionar Novo</h3>
        </div>

        <div className="grid grid-cols-4 gap-4">
           <ActionButton 
             icon="arrow_downward" 
             label="Receita" 
             color="bg-green-500 shadow-green-500/30" 
             onClick={() => handleNavigate('/add', { type: 'income' })}
             delay={0}
           />
           <ActionButton 
             icon="arrow_upward" 
             label="Despesa" 
             color="bg-red-500 shadow-red-500/30" 
             onClick={() => handleNavigate('/add', { type: 'expense' })}
             delay={50}
           />
           <ActionButton 
             icon="sync_alt" 
             label="Transf." 
             color="bg-blue-500 shadow-blue-500/30" 
             onClick={() => handleNavigate('/add', { type: 'transfer' })} 
             delay={100}
           />
           <ActionButton 
             icon="bolt" 
             label="Rápido" 
             color="bg-yellow-500 shadow-yellow-500/30" 
             onClick={() => handleNavigate('/shortcuts')}
             delay={150}
           />
        </div>
      </div>
    </div>
  );
};

export default AddActionSheet;