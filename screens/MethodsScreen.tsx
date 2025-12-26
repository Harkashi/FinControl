import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../services/database';
import { PaymentMethod } from '../types';

const MethodsScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add State
  const [newName, setNewName] = useState('');

  // Edit State
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editName, setEditName] = useState('');

  // Delete State
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag and Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await db.getPaymentMethods();
    setMethods(data);
    setLoading(false);
  };

  const handleBack = () => {
    if (location.state?.returnTo && location.state?.draft) {
       navigate(location.state.returnTo, { state: location.state.draft });
    } else {
       navigate(-1);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await db.savePaymentMethod({ name: newName });
    setNewName('');
    loadData();
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setEditName(method.name);
  };

  const handleUpdate = async () => {
    if (!editingMethod || !editName.trim()) return;
    await db.savePaymentMethod({ ...editingMethod, name: editName });
    setEditingMethod(null);
    setEditName('');
    loadData();
  };

  const confirmDelete = (e: React.MouseEvent, method: PaymentMethod) => {
    e.stopPropagation();
    setMethodToDelete(method);
  };

  const executeDelete = async () => {
    if (!methodToDelete) return;
    
    setIsDeleting(true);
    await db.deletePaymentMethod(methodToDelete.id);
    
    if (editingMethod?.id === methodToDelete.id) setEditingMethod(null);
    await loadData();
    setMethodToDelete(null);
    setIsDeleting(false);
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
        dragItem.current = null;
        dragOverItem.current = null;
        return;
    }

    const _methods = [...methods];
    const draggedItemContent = _methods[dragItem.current];
    
    _methods.splice(dragItem.current, 1);
    _methods.splice(dragOverItem.current, 0, draggedItemContent);

    dragItem.current = null;
    dragOverItem.current = null;
    setMethods(_methods);

    await db.updatePaymentMethodsOrder(_methods);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault(); 
  };

  // Helper para Branding (Ícone + Cor)
  const getMethodBranding = (name: string) => {
    const n = name.toLowerCase();

    // Pix (Verde Azulado Típico)
    if (n.includes('pix')) return { icon: 'qr_code_2', color: 'text-[#32BCAD]', bg: 'bg-[#32BCAD]/10' };
    
    // Boleto (Cinza/Neutro com código de barras)
    if (n.includes('boleto')) return { icon: 'barcode', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-200 dark:bg-white/5' };
    
    // Dinheiro (Verde)
    if (n.includes('dinheiro') || n.includes('espécie') || n.includes('cash')) return { icon: 'payments', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    
    // Crédito (Roxo/Lilas)
    if (n.includes('crédito') || n.includes('credito') || n.includes('credit')) return { icon: 'credit_card', color: 'text-purple-500', bg: 'bg-purple-500/10' };
    
    // Débito (Azul)
    if (n.includes('débito') || n.includes('debito') || n.includes('debit')) return { icon: 'credit_card', color: 'text-blue-500', bg: 'bg-blue-500/10' };
    
    // Vale Refeição (Laranja)
    if (n.includes('vale') || n.includes('refeição') || n.includes('alimentação')) return { icon: 'restaurant', color: 'text-orange-500', bg: 'bg-orange-500/10' };

    // Padrão
    return { icon: 'credit_card', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-[#111620]' };
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display relative">
      <header className="flex items-center p-4 sticky top-0 bg-background-light dark:bg-background-dark z-10">
        <button onClick={handleBack} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Métodos de Pagamento</h1>
      </header>
      <main className="p-4 space-y-6">
         {/* Add New Section */}
         <div className="flex gap-2">
            <input 
               type="text" 
               placeholder="Novo Método (ex: Vale Refeição)" 
               value={newName} 
               onChange={e => setNewName(e.target.value)}
               className="flex-1 p-3 rounded-xl bg-white dark:bg-[#192233] dark:text-white border-none shadow-sm focus:ring-2 focus:ring-primary"
            />
            <button onClick={handleAdd} disabled={!newName} className="bg-primary text-white p-3 rounded-xl font-bold disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center min-w-[50px]">
                <span className="material-symbols-outlined">add</span>
            </button>
         </div>

         <div className="space-y-3">
            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
            ) : methods.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">credit_card_off</span>
                    <p>Nenhum método cadastrado.</p>
                </div>
            ) : methods.map((m, index) => {
               const branding = getMethodBranding(m.name);
               return (
               <div 
                  key={m.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  className="flex items-center justify-between p-4 bg-white dark:bg-[#192233] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 animate-[fade-in_0.3s] cursor-move active:cursor-grabbing hover:border-primary/30 transition-colors"
               >
                  {/* Drag Handle & Icon & Name */}
                  <div className="flex items-center gap-3 flex-1 overflow-hidden" onClick={() => handleEdit(m)}>
                     <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing">drag_indicator</span>
                     
                     <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${branding.bg} ${branding.color}`}>
                        <span className="material-symbols-outlined">{branding.icon}</span>
                     </div>
                     <div className="min-w-0">
                        <p className="font-bold dark:text-white text-sm truncate">{m.name}</p>
                        <span className="text-[10px] text-slate-400">Toque para editar</span>
                     </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                     <button onClick={(e) => { e.stopPropagation(); handleEdit(m); }} className="p-2 text-slate-400 hover:text-blue-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                     </button>
                     <button onClick={(e) => confirmDelete(e, m)} className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 group">
                        <span className="material-symbols-outlined text-[20px] group-hover:fill-red-500">delete</span>
                     </button>
                  </div>
               </div>
            )})}
         </div>
      </main>

      {/* Edit Modal */}
      {editingMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setEditingMethod(null)}>
            <div className="bg-white dark:bg-[#1e2330] w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-[scale-in_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold dark:text-white">Editar Método</h3>
                    <button onClick={() => setEditingMethod(null)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>
                
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome</label>
                <input 
                    autoFocus
                    type="text" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-[#111620] border-2 border-transparent focus:border-primary outline-none dark:text-white mb-6"
                    placeholder="Nome do método"
                />

                <div className="flex gap-3">
                    <button 
                        onClick={() => setEditingMethod(null)}
                        className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleUpdate}
                        disabled={!editName.trim()}
                        className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-50"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {methodToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setMethodToDelete(null)}>
            <div className="bg-white dark:bg-[#1e2330] w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-[scale-in_0.2s_ease-out] border border-red-500/10" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                        <span className="material-symbols-outlined text-4xl">delete</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold dark:text-white mb-1">Excluir Método?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Tem certeza que deseja excluir <strong>{methodToDelete.name}</strong>? 
                        </p>
                        <p className="text-xs text-red-500 mt-2 font-bold bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">
                            Transações vinculadas a este método não serão apagadas, mas perderão a referência.
                        </p>
                    </div>
                    
                    <div className="flex gap-3 w-full mt-2">
                        <button 
                            onClick={() => setMethodToDelete(null)}
                            className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={executeDelete}
                            disabled={isDeleting}
                            className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MethodsScreen;