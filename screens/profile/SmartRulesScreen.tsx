
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import { Category, SmartRule } from '../../types';

const SmartRulesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<SmartRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [r, c, p] = await Promise.all([
        db.getSmartRules(),
        db.getCategories(),
        db.getUserProfile()
    ]);
    
    setRules(r);
    setCategories(c);
    
    if (p && (p.plan === 'pro' || p.plan === 'ultra')) {
        setIsPremium(true);
    }
    
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!keyword || !categoryId) return;
    await db.addSmartRule(keyword, categoryId);
    setKeyword('');
    setCategoryId('');
    // Reload local list immediately without full loading spinner
    const r = await db.getSmartRules();
    setRules(r);
  };

  const handleDelete = async (id: string) => {
    await db.deleteSmartRule(id);
    const r = await db.getSmartRules();
    setRules(r);
  };

  if (!loading && !isPremium) {
      return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
            <header className="flex items-center p-4">
                <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
                <h1 className="text-lg font-bold dark:text-white ml-2">Automação</h1>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center pb-20 animate-[fade-in_0.5s]">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-8 relative">
                    <span className="material-symbols-outlined text-white text-5xl">auto_awesome</span>
                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#1e2330] rounded-full p-2 shadow-sm">
                        <span className="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">lock</span>
                    </div>
                </div>
                
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">
                    Inteligência Artificial
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs leading-relaxed text-sm">
                    Automatize a categorização das suas despesas e deixe o FinControl organizar tudo para você.
                    <br/><br/>
                    <span className="font-bold text-indigo-500">Exclusivo para planos Pro e Ultra.</span>
                </p>

                <button 
                    onClick={() => navigate('/profile/plan')}
                    className="w-full max-w-xs py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">diamond</span>
                    Desbloquear Agora
                </button>
            </main>
        </div>
      );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
      <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Categorias Inteligentes</h1>
      </header>
      <main className="p-4 space-y-6">
        
        {/* Add Form */}
        <div className="bg-white dark:bg-[#192233] p-4 rounded-xl shadow-sm space-y-3">
           <h3 className="font-bold dark:text-white text-sm">Nova Regra</h3>
           <div className="space-y-1">
              <p className="text-xs text-slate-500">Se a descrição conter...</p>
              <input 
                  type="text" 
                  placeholder="Ex: Uber, Netflix..." 
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-primary focus:outline-none text-sm transition-colors"
              />
           </div>
           
           <div className="space-y-1">
              <p className="text-xs text-slate-500">Categorizar automaticamente como...</p>
              <select 
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 dark:text-white border-none text-sm cursor-pointer"
              >
                  <option value="" className="dark:bg-slate-800">Selecione uma categoria</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="dark:bg-slate-800">{c.name}</option>
                  ))}
              </select>
           </div>
           
           <button 
             onClick={handleAdd}
             disabled={!keyword || !categoryId}
             className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg disabled:opacity-50 transition-colors"
           >
             Adicionar Regra
           </button>
        </div>

        {/* List */}
        <div className="space-y-3">
           <h3 className="font-bold dark:text-white text-sm px-1">Regras Ativas</h3>
           
           {loading && (
             <div className="flex justify-center py-4">
               <div className="size-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
             </div>
           )}

           {!loading && rules.length === 0 && <p className="text-sm text-slate-500 px-1 italic">Nenhuma regra criada.</p>}
           
           {!loading && rules.map(rule => {
             const cat = categories.find(c => c.id === rule.category_id);
             return (
               <div key={rule.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#192233] rounded-xl border border-slate-100 dark:border-transparent animate-[fade-in_0.3s]">
                  <div>
                    <p className="text-sm font-bold dark:text-white">"{rule.keyword}"</p>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                       <span className="material-symbols-outlined text-[14px] text-primary">arrow_forward</span>
                       <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-medium">
                         {cat?.name || 'Desconhecida'}
                       </span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(rule.id)} className="text-slate-400 hover:text-red-500 p-2 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
               </div>
             );
           })}
        </div>
      </main>
    </div>
  );
};
export default SmartRulesScreen;
