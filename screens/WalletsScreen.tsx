
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../services/database';
import { Wallet } from '../types';

const WalletsScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add State
  const [newName, setNewName] = useState('');
  
  // Edit State
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editName, setEditName] = useState('');

  // Delete State
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag and Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await db.getWallets();
    setWallets(data);
    setLoading(false);
  };

  const handleBack = () => {
     // Check if we have a return path and draft state (from AddTransactionScreen)
     if (location.state?.returnTo && location.state?.draft) {
        navigate(location.state.returnTo, { state: location.state.draft });
     } else {
        navigate(-1);
     }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const { success } = await db.saveWallet({ name: newName, type: 'account', is_default: false });
    
    if (success) {
      setNewName('');
      loadData();
    } else {
      alert("Erro ao adicionar conta. Tente novamente.");
    }
  };

  const handleEdit = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setEditName(wallet.name);
  };

  const handleUpdate = async () => {
    if (!editingWallet || !editName.trim()) return;
    const { success } = await db.saveWallet({ ...editingWallet, name: editName });
    
    if (success) {
      setEditingWallet(null);
      setEditName('');
      loadData();
    } else {
      alert("Erro ao atualizar conta.");
    }
  };

  const confirmDelete = (e: React.MouseEvent, wallet: Wallet) => {
    e.stopPropagation(); // Impede que o clique abra o modal de edição
    setWalletToDelete(wallet);
  };

  const executeDelete = async () => {
    if (!walletToDelete) return;
    
    setIsDeleting(true);
    const { success, error } = await db.deleteWallet(walletToDelete.id);
    
    if (success) {
        if (editingWallet?.id === walletToDelete.id) setEditingWallet(null);
        await loadData();
        setWalletToDelete(null);
    } else {
        console.error("Erro ao excluir:", error);
        alert("Não foi possível excluir esta conta. Verifique se existem transações vinculadas que impedem a exclusão.");
    }
    setIsDeleting(false);
  };

  const handleSetDefault = async (e: React.MouseEvent, w: Wallet) => {
     e.stopPropagation();
     // Atualização otimista local
     const updates = wallets.map(wallet => {
         if (wallet.id === w.id) return { ...wallet, is_default: true };
         if (wallet.is_default) return { ...wallet, is_default: false };
         return wallet;
     });
     setWallets(updates);

     // Persistir no banco
     const currentDefault = wallets.find(x => x.is_default);
     if (currentDefault && currentDefault.id !== w.id) {
         await db.saveWallet({ id: currentDefault.id, is_default: false });
     }
     await db.saveWallet({ id: w.id, is_default: true });
     
     loadData();
  };

  const handleEditClick = (e: React.MouseEvent, w: Wallet) => {
      e.stopPropagation();
      handleEdit(w);
  }

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

    const _wallets = [...wallets];
    const draggedItemContent = _wallets[dragItem.current];
    
    _wallets.splice(dragItem.current, 1);
    _wallets.splice(dragOverItem.current, 0, draggedItemContent);

    dragItem.current = null;
    dragOverItem.current = null;
    setWallets(_wallets);

    await db.updateWalletsOrder(_wallets);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault(); 
  };

  // --- BRANDING HELPER ---
  // Identifica o banco pelo nome e retorna cores e ícones oficiais
  const getWalletBranding = (name: string, type: string) => {
    const n = name.toLowerCase();

    // 1. Dinheiro / Espécie
    if (type === 'cash' || n.includes('dinheiro') || n.includes('carteira') || n.includes('físico')) {
        return { icon: 'payments', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    }
    // 2. Investimentos Genéricos
    if (type === 'investment' || type === 'savings' || n.includes('invest') || n.includes('poup')) {
        return { icon: 'savings', color: 'text-blue-500', bg: 'bg-blue-500/10' };
    }

    // 3. Bancos Específicos (Cores Oficiais aproximadas)
    if (n.includes('nubank') || n.includes('nu')) return { icon: 'account_balance', color: 'text-[#820ad1]', bg: 'bg-[#820ad1]/10' }; // Roxo Nu
    if (n.includes('inter')) return { icon: 'account_balance', color: 'text-[#ff7a00]', bg: 'bg-[#ff7a00]/10' }; // Laranja Inter
    if (n.includes('itaú') || n.includes('itau')) return { icon: 'account_balance', color: 'text-[#ec7000]', bg: 'bg-[#ec7000]/10' }; // Laranja Itaú
    if (n.includes('bradesco')) return { icon: 'account_balance', color: 'text-[#cc092f]', bg: 'bg-[#cc092f]/10' }; // Vermelho Bradesco
    if (n.includes('santander')) return { icon: 'account_balance', color: 'text-[#ec0000]', bg: 'bg-[#ec0000]/10' }; // Vermelho Santander
    if (n.includes('caixa')) return { icon: 'account_balance', color: 'text-[#005ca9]', bg: 'bg-[#005ca9]/10' }; // Azul Caixa
    if (n.includes('bb') || n.includes('brasil')) return { icon: 'account_balance', color: 'text-[#fbf600] dark:text-[#fbf600]', bg: 'bg-[#003da5]' }; // Amarelo/Azul BB
    if (n.includes('picpay')) return { icon: 'account_balance_wallet', color: 'text-[#11c76f]', bg: 'bg-[#11c76f]/10' }; // Verde PicPay
    if (n.includes('c6')) return { icon: 'account_balance', color: 'text-slate-800 dark:text-white', bg: 'bg-slate-200 dark:bg-white/10' }; // Carbon
    if (n.includes('btg')) return { icon: 'account_balance', color: 'text-blue-900 dark:text-blue-300', bg: 'bg-blue-900/10' }; // Azul BTG
    if (n.includes('neon')) return { icon: 'account_balance', color: 'text-[#00a4a6]', bg: 'bg-[#00a4a6]/10' }; // Cyan Neon
    if (n.includes('next')) return { icon: 'account_balance', color: 'text-[#00ff5f]', bg: 'bg-[#00ff5f]/10' }; // Verde Next
    if (n.includes('will')) return { icon: 'account_balance', color: 'text-[#ffd400]', bg: 'bg-[#ffd400]/10' }; // Amarelo Will
    if (n.includes('xp')) return { icon: 'show_chart', color: 'text-slate-800 dark:text-white', bg: 'bg-yellow-400/20' }; // XP
    if (n.includes('nomad')) return { icon: 'flight', color: 'text-slate-800 dark:text-white', bg: 'bg-yellow-400/20' }; 
    if (n.includes('wise')) return { icon: 'currency_exchange', color: 'text-[#9ce325]', bg: 'bg-[#9ce325]/10' }; 

    // Default
    return { icon: 'account_balance', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-[#111620]' };
  }

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display relative">
      <header className="flex items-center p-4 sticky top-0 bg-background-light dark:bg-background-dark z-10">
        <button onClick={handleBack} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Minhas Contas</h1>
      </header>
      <main className="p-4 space-y-6">
         {/* Add New Section */}
         <div className="flex gap-2">
            <input 
               type="text" 
               placeholder="Nova Conta (ex: Nubank)" 
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
            ) : wallets.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">account_balance_wallet</span>
                    <p>Nenhuma conta cadastrada.</p>
                </div>
            ) : wallets.map((w, index) => {
               const branding = getWalletBranding(w.name, w.type);
               
               return (
               <div 
                  key={w.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  className="flex items-center justify-between p-4 bg-white dark:bg-[#192233] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 animate-[fade-in_0.3s] cursor-move active:cursor-grabbing hover:border-primary/30 transition-colors"
               >
                  {/* Drag Handle & Icon & Name */}
                  <div className="flex items-center gap-3 flex-1 overflow-hidden" onClick={() => handleEdit(w)}>
                     <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing">drag_indicator</span>
                     
                     <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${branding.bg} ${branding.color}`}>
                        <span className="material-symbols-outlined">{branding.icon}</span>
                     </div>
                     <div className="min-w-0">
                        <p className="font-bold dark:text-white text-sm truncate">{w.name}</p>
                        {w.is_default ? (
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase inline-block mt-0.5">Padrão</span>
                        ) : (
                            <span className="text-[10px] text-slate-400">Toque para editar</span>
                        )}
                     </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                     {!w.is_default && (
                        <button onClick={(e) => handleSetDefault(e, w)} className="p-2 text-slate-400 hover:text-yellow-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Definir como Padrão">
                            <span className="material-symbols-outlined text-[20px]">star_outline</span>
                        </button>
                     )}
                     <button onClick={(e) => handleEditClick(e, w)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                     </button>
                     <button onClick={(e) => confirmDelete(e, w)} className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 group">
                        <span className="material-symbols-outlined text-[20px] group-hover:fill-red-500">delete</span>
                     </button>
                  </div>
               </div>
            )})}
         </div>
      </main>

      {/* Edit Modal */}
      {editingWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setEditingWallet(null)}>
            <div className="bg-white dark:bg-[#1e2330] w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-[scale-in_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold dark:text-white">Editar Conta</h3>
                    <button onClick={() => setEditingWallet(null)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>
                
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome da Conta</label>
                <input 
                    autoFocus
                    type="text" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-[#111620] border-2 border-transparent focus:border-primary outline-none dark:text-white mb-6"
                    placeholder="Nome da conta"
                />

                <div className="flex gap-3">
                    <button 
                        onClick={() => setEditingWallet(null)}
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
      {walletToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setWalletToDelete(null)}>
            <div className="bg-white dark:bg-[#1e2330] w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-[scale-in_0.2s_ease-out] border border-red-500/10" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                        <span className="material-symbols-outlined text-4xl">delete</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold dark:text-white mb-1">Excluir Conta?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Tem certeza que deseja excluir <strong>{walletToDelete.name}</strong>? 
                        </p>
                        <p className="text-xs text-red-500 mt-2 font-bold bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">
                            Atenção: Transações vinculadas a esta conta perderão a referência ou serão excluídas.
                        </p>
                    </div>
                    
                    <div className="flex gap-3 w-full mt-2">
                        <button 
                            onClick={() => setWalletToDelete(null)}
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

export default WalletsScreen;
