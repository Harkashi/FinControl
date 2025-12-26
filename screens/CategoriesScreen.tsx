import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { db } from '../services/database';
import { Category } from '../types';

const AVAILABLE_ICONS = [
  'restaurant', 'directions_bus', 'sports_esports', 'home', 'shopping_bag',
  'health_and_safety', 'work', 'school', 'flight', 'pets',
  'fitness_center', 'local_cafe', 'payments', 'build', 'local_grocery_store',
  'movie', 'wifi', 'gas_meter', 'directions_car', 'savings', 'trending_up', 
  'medical_services', 'local_pharmacy', 'child_care', 'school', 'local_laundry_service'
];

const COLOR_OPTIONS = [
  { id: 'orange', bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', preview: '#ea580c' },
  { id: 'blue', bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', preview: '#2563eb' },
  { id: 'purple', bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', preview: '#9333ea' },
  { id: 'green', bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-600 dark:text-green-400', preview: '#16a34a' },
  { id: 'pink', bg: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400', preview: '#db2777' },
  { id: 'emerald', bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', preview: '#059669' },
  { id: 'red', bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400', preview: '#dc2626' },
  { id: 'cyan', bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', preview: '#0891b2' },
];

const CategoriesScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [tempIcon, setTempIcon] = useState('shopping_bag');
  const [tempColorId, setTempColorId] = useState('blue');
  const [tempType, setTempType] = useState<'income' | 'expense' | 'both'>('expense');

  // Navigation Logic
  const [returnToTransaction, setReturnToTransaction] = useState(false);

  useEffect(() => {
    loadCategories();
    
    // Check if opened via AddTransaction
    if (location.state?.openCreateModal) {
      handleAddNew(location.state.contextType || 'expense');
      setReturnToTransaction(!!location.state.returnToTransaction);
    }
  }, [location.state]);

  const loadCategories = async () => {
    setLoading(true);
    const loaded = await db.getCategories();
    setCategories(loaded);
    setLoading(false);
  };

  const handleAddNew = (defaultType: 'income' | 'expense' | 'both' = 'expense') => {
    setEditingId(null);
    setTempName('');
    setTempDescription('');
    setTempIcon('shopping_bag');
    setTempColorId('blue');
    setTempType(defaultType);
    setIsModalOpen(true);
  };

  const handleEditClick = (category: Category) => {
    setEditingId(category.id);
    setTempName(category.name);
    setTempDescription(category.description || '');
    setTempIcon(category.icon);
    setTempType(category.type);
    
    const foundColor = COLOR_OPTIONS.find(c => category.colorClass.includes(c.id));
    setTempColorId(foundColor ? foundColor.id : 'blue');
    
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (confirm('Tem certeza? Isso pode afetar transações antigas.')) {
        await db.deleteCategory(editingId);
        await loadCategories();
        closeModal();
    }
  };

  const handleSave = async () => {
    if (!tempName) return;

    // Validation: Check duplicate
    const exists = categories.find(c => 
      c.name.toLowerCase() === tempName.toLowerCase() && 
      c.type === tempType && 
      c.id !== editingId
    );
    if (exists) {
      alert('Já existe uma categoria com este nome para este tipo.');
      return;
    }

    const selectedColor = COLOR_OPTIONS.find(c => c.id === tempColorId) || COLOR_OPTIONS[0];

    const categoryData: Category = {
      id: editingId || '',
      name: tempName,
      description: tempDescription,
      icon: tempIcon,
      colorClass: selectedColor.text,
      bgClass: selectedColor.bg,
      type: tempType
    };

    setLoading(true);
    const result = await db.saveCategory(categoryData);
    
    if (result.success) {
      if (returnToTransaction) {
        const updatedCats = await db.getCategories();
        const created = updatedCats.find(c => c.name === tempName && c.type === tempType);
        navigate('/add', { state: { createdCategoryId: created?.id } });
      } else {
        await loadCategories();
        closeModal();
      }
    } else {
      alert('Erro ao salvar.');
    }
    setLoading(false);
  };

  const closeModal = () => {
    if (returnToTransaction) navigate('/add');
    else setIsModalOpen(false);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Groups
  const incomeCats = filteredCategories.filter(c => c.type === 'income');
  const expenseCats = filteredCategories.filter(c => c.type === 'expense');
  const bothCats = filteredCategories.filter(c => c.type === 'both');

  const renderCategoryItem = (cat: Category) => (
     <div key={cat.id} onClick={() => handleEditClick(cat)} className="flex items-center gap-3 p-3 bg-white dark:bg-[#1e2330] rounded-xl shadow-sm border border-transparent hover:border-primary/20 cursor-pointer transition-all active:scale-[0.98]">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cat.bgClass} ${cat.colorClass}`}>
           <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
        </div>
        <div className="flex-1">
           <h4 className="font-bold text-slate-900 dark:text-white text-sm">{cat.name}</h4>
           <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${cat.type === 'income' ? 'bg-green-100 text-green-700' : cat.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                {cat.type === 'income' ? 'Receita' : cat.type === 'expense' ? 'Despesa' : 'Geral'}
              </span>
              {cat.description && <span className="text-[10px] text-slate-400 truncate max-w-[150px]">• {cat.description}</span>}
           </div>
        </div>
        <span className="material-symbols-outlined text-slate-300">edit</span>
     </div>
  );

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-background-light dark:bg-background-dark shadow-xl pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-4 bg-background-light/95 dark:bg-background-dark backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Categorias</h1>
        <button onClick={() => handleAddNew('expense')} className="flex items-center justify-center w-10 h-10 -mr-2 rounded-full text-primary hover:bg-primary/10">
            <span className="material-symbols-outlined">add</span>
        </button>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-2">
         <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 px-4 rounded-xl bg-white dark:bg-[#1e2330] border-none text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary/20"
          />
      </div>

      <main className="flex-1 overflow-y-auto px-4 mt-2 pb-24 no-scrollbar">
        {loading ? (
            <div className="flex justify-center py-10"><div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>
        ) : (
            <>
                {filteredCategories.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                       <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                       <p className="text-sm">Nenhuma categoria encontrada.</p>
                    </div>
                )}

                {/* Grupo de Receitas */}
                {incomeCats.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-3 px-1 text-green-600 dark:text-green-400 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">arrow_downward</span> Receitas
                        </h3>
                        <div className="space-y-2">
                            {incomeCats.map(renderCategoryItem)}
                        </div>
                    </div>
                )}

                {/* Grupo de Despesas */}
                {expenseCats.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-3 px-1 text-red-500 dark:text-red-400 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">arrow_upward</span> Despesas
                        </h3>
                        <div className="space-y-2">
                            {expenseCats.map(renderCategoryItem)}
                        </div>
                    </div>
                )}

                {/* Grupo Geral (Ambos) */}
                {bothCats.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-3 px-1 text-blue-500 dark:text-blue-400 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">swap_horiz</span> Geral
                        </h3>
                        <div className="space-y-2">
                            {bothCats.map(renderCategoryItem)}
                        </div>
                    </div>
                )}
            </>
        )}
      </main>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#1e2330] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-[scale-in_0.2s_ease-out]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold dark:text-white">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button onClick={closeModal}><span className="material-symbols-outlined text-slate-400">close</span></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 no-scrollbar">
              
              {/* Type Selector */}
              <div>
                 <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Tipo de Transação</label>
                 <div className="flex bg-slate-100 dark:bg-[#111620] p-1 rounded-lg">
                    {['income', 'expense', 'both'].map((t) => (
                       <button 
                         key={t}
                         onClick={() => setTempType(t as any)}
                         className={`flex-1 py-2 text-xs font-bold rounded-md capitalize transition-all ${tempType === t ? 'bg-white dark:bg-[#232f48] shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
                       >
                         {t === 'income' ? 'Receita' : t === 'expense' ? 'Despesa' : 'Geral'}
                       </button>
                    ))}
                 </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Nome</label>
                <input autoFocus type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-[#111620] dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary focus:outline-none" placeholder="Ex: Viagens" />
              </div>

              {/* Color Grid */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Cor</label>
                <div className="flex flex-wrap gap-3">
                   {COLOR_OPTIONS.map((c) => (
                      <button key={c.id} onClick={() => setTempColorId(c.id)} className={`w-10 h-10 rounded-full transition-transform active:scale-95 ${tempColorId === c.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-[#1e2330]' : ''}`} style={{ backgroundColor: c.preview }}></button>
                   ))}
                </div>
              </div>
              
              {/* Icon Grid */}
              <div>
                 <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Ícone</label>
                 <div className="grid grid-cols-6 gap-2">
                    {AVAILABLE_ICONS.map((icon) => (
                       <button key={icon} onClick={() => setTempIcon(icon)} className={`p-2 aspect-square rounded-lg flex items-center justify-center transition-colors ${tempIcon === icon ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 dark:bg-[#111620] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                          <span className="material-symbols-outlined text-[20px]">{icon}</span>
                       </button>
                    ))}
                 </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
               {editingId && (
                   <button onClick={handleDelete} className="p-3 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-xl hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors">
                       <span className="material-symbols-outlined">delete</span>
                   </button>
               )}
               <button onClick={handleSave} className="flex-1 h-12 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark transition-colors">
                   {editingId ? 'Atualizar' : 'Criar Categoria'}
               </button>
            </div>
          </div>
        </div>
      )}

      {!returnToTransaction && <BottomNav />}
    </div>
  );
};
export default CategoriesScreen;