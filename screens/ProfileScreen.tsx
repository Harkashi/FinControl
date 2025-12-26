import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/database';
import { User, UserProfile, UserStats } from '../types';
import { SettingsSection, SettingsItem } from '../components/SettingsComponents';

const DEFAULT_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuCJhIxaEBwY2zopCT-KpzKsTCniMxM1KxHatRJvMvLiFu0uh99SZzVzXi2iSPt5ceck7s2RBB-nIiKmRnD0uljQGvYA6_0Qn7I3-mdIWmSVxnAbbfTLd4r1a7U4z9-za16-q93deEunS_ImVWVp3NfAmR_vTLIgsfazwv4Cx-OBLibnPFGR6dNkH5swn77HPuRLWx_1MPM8w1DEHtMsz1vjCsODbFWLZ23zrDHOtNfFXfceZjlqhupvMobuWH77BfcHQ2rFoeCkn0IH";

const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ daysActive: 0, totalTransactions: 0, currentStreak: 0, maxStreak: 0 });
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
  const [loading, setLoading] = useState(true);
  
  // Name Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  
  // Clear Transactions Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const u = db.getCurrentUser();
      setUser(u);
      if (u) setEditName(u.name);
      
      // Load Avatar from LocalStorage first (Fastest)
      const savedAvatar = localStorage.getItem('fincontrol_user_avatar');
      if (savedAvatar) setAvatarUrl(savedAvatar);

      if (u) {
        const p = await db.getUserProfile();
        const s = await db.getUserStats();
        setProfile(p);
        setStats(s);
        
        // If DB has avatar and we don't have local (or want to sync), use DB
        if (p?.avatar_url) {
           setAvatarUrl(p.avatar_url);
           localStorage.setItem('fincontrol_user_avatar', p.avatar_url);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => {
    await db.logout();
    localStorage.removeItem('fincontrol_user_avatar');
    navigate('/login');
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Utilitário para redimensionar imagem (Crucial para salvar no LocalStorage/DB sem exceder limites)
  const resizeImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const img = document.createElement('img');
          img.src = URL.createObjectURL(file);
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // Max dimension 500px is enough for avatar and keeps string size low (~50-100kb)
              const MAX_SIZE = 500;
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                  if (width > MAX_SIZE) {
                      height *= MAX_SIZE / width;
                      width = MAX_SIZE;
                  }
              } else {
                  if (height > MAX_SIZE) {
                      width *= MAX_SIZE / height;
                      height = MAX_SIZE;
                  }
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);
              
              // Convert to base64 jpeg with compression
              resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = reject;
      });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        setLoading(true);
        // Resize image first! This fixes the "disappearing on reload" issue caused by storage limits
        const compressedBase64 = await resizeImage(file);
        
        setAvatarUrl(compressedBase64);
        localStorage.setItem('fincontrol_user_avatar', compressedBase64);
        
        if (profile) {
            await db.updateUserProfile({ avatar_url: compressedBase64 });
        }
    } catch (error) {
        console.error("Erro ao processar imagem", error);
        alert("Erro ao processar imagem.");
    } finally {
        setLoading(false);
    }
  };

  const saveNameChange = async () => {
      if (!editName.trim()) return;
      setIsEditingName(false);
      
      // Optimistic update
      if (user) setUser({ ...user, name: editName });
      
      // DB Update
      await db.updateUserName(editName);
  };

  const openClearTransactionsModal = () => {
    setDeleteConfirmationText('');
    setShowDeleteModal(true);
  };

  const executeClearTransactions = async () => {
    if (deleteConfirmationText.toUpperCase() !== 'ZERAR') return;

    setShowDeleteModal(false);
    setLoading(true);
    const result = await db.clearTransactions();
    
    if (result.success) {
      setStats(prev => ({ ...prev, totalTransactions: 0 }));
      setLoading(false);
      alert('Sucesso! Todas as transações foram apagadas e seu saldo foi redefinido.');
    } else {
      console.error(result.error);
      alert('Erro ao apagar transações. Verifique sua conexão ou as permissões do banco de dados.');
      setLoading(false);
    }
  };

  // Gamification Logic
  const calculateLevel = (totalTx: number) => Math.floor(totalTx / 20) + 1;
  const calculateProgress = (totalTx: number) => (totalTx % 20) * 5; 
  
  const currentLevel = calculateLevel(stats.totalTransactions);
  const progressPercent = calculateProgress(stats.totalTransactions);
  const nextLevel = currentLevel + 1;

  if (loading) return <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display text-slate-900 dark:text-white pb-safe relative">
      {/* Custom Header Area */}
      <div className="bg-white dark:bg-[#192233] pb-6 rounded-b-[2rem] shadow-sm border-b border-slate-100 dark:border-transparent relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/10 to-transparent"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>

        {/* Top Bar */}
        <header className="relative z-10 flex items-center justify-between px-4 py-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 backdrop-blur-sm transition-colors border border-slate-200/50 dark:border-white/5"
          >
            <span className="material-symbols-outlined text-slate-700 dark:text-white">arrow_back</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-slate-200/50 dark:border-white/5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700 dark:text-white">Online</span>
          </div>
        </header>

        {/* User Info & Gamification */}
        <div className="relative z-10 px-6 flex flex-col items-center">
          
          {/* Avatar com Upload */}
          <div className="relative mb-4 group cursor-pointer" onClick={handleAvatarClick}>
             <div 
                className="bg-center bg-no-repeat bg-cover rounded-full w-24 h-24 ring-4 ring-white dark:ring-[#232f48] shadow-lg transition-transform group-hover:scale-105"
                style={{backgroundImage: `url("${avatarUrl}")`}}
              ></div>
              {/* Overlay Icon */}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white text-[28px]">photo_camera</span>
              </div>
              {/* Edit Badge (Mobile friendly) */}
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full border-2 border-white dark:border-[#192233] flex items-center justify-center shadow-md">
                 <span className="material-symbols-outlined text-white text-[16px]">edit</span>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg"
                className="hidden"
              />
          </div>
          
          {/* Name Editing Section */}
          <div className="flex items-center gap-2 mb-1">
              {isEditingName ? (
                  <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={saveNameChange}
                        onKeyDown={(e) => e.key === 'Enter' && saveNameChange()}
                        className="text-2xl font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded px-2 py-0.5 text-center w-full max-w-[200px] border-none focus:ring-2 focus:ring-primary"
                      />
                      <button onClick={saveNameChange} className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px]">check</span>
                      </button>
                  </div>
              ) : (
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{user?.name || 'Usuário'}</h2>
                      <span className="material-symbols-outlined text-slate-400 text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                  </div>
              )}
          </div>
          
          <div className="flex items-center gap-2 mb-4">
             <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{user?.email}</span>
             <span className="text-slate-300 dark:text-slate-600">•</span>
             <button onClick={() => navigate('/profile/plan')} className="text-xs font-bold bg-gradient-to-r from-primary to-blue-500 px-3 py-0.5 rounded-full text-white uppercase tracking-wide shadow-md shadow-primary/30 active:scale-95 transition-transform">
                {profile?.plan || 'Free'}
             </button>
          </div>

          {/* Level Progress Bar */}
          <div className="w-full max-w-xs mb-2">
             <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-primary">Nível {currentLevel}</span>
                <span className="text-slate-400">Próximo: Nível {nextLevel}</span>
             </div>
             <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
             </div>
             <p className="text-[10px] text-center text-slate-400 mt-1.5 font-medium">
               {20 - (stats.totalTransactions % 20)} transações para o próximo nível
             </p>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pt-6 px-4 pb-10 space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-[#192233] p-3 rounded-2xl border border-slate-100 dark:border-transparent shadow-sm flex flex-col items-center justify-center gap-1">
             <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-1">
               <span className="material-symbols-outlined text-[18px]">calendar_month</span>
             </span>
             <span className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">{stats.daysActive}</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase">Dias</span>
          </div>
          <div className="bg-white dark:bg-[#192233] p-3 rounded-2xl border border-slate-100 dark:border-transparent shadow-sm flex flex-col items-center justify-center gap-1">
             <span className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-1">
               <span className="material-symbols-outlined text-[18px]">receipt</span>
             </span>
             <span className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">{stats.totalTransactions}</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
          </div>
          <div className="bg-white dark:bg-[#192233] p-3 rounded-2xl border border-slate-100 dark:border-transparent shadow-sm flex flex-col items-center justify-center gap-1">
             <span className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-1">
               <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
             </span>
             <span className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">
                {stats.currentStreak} <span className="text-[10px] text-slate-500 font-normal">({stats.maxStreak})</span>
             </span>
             <span className="text-[10px] font-bold text-slate-400 uppercase">Sequência</span>
          </div>
        </div>

        {/* Upgrade Banner (Visible only if Free) */}
        {profile?.plan === 'free' && (
          <div 
            onClick={() => navigate('/profile/plan')}
            className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 p-5 cursor-pointer shadow-lg shadow-orange-500/20 group"
          >
             <div className="absolute right-0 top-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
             <div className="relative z-10 flex items-center justify-between">
                <div>
                   <h3 className="text-white font-extrabold text-lg flex items-center gap-2">
                     <span className="material-symbols-outlined">diamond</span>
                     Seja Premium
                   </h3>
                   <p className="text-white/90 text-xs font-medium max-w-[200px] mt-1">Desbloqueie gráficos avançados, exportação CSV e remova anúncios.</p>
                </div>
                <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                   <span className="material-symbols-outlined text-white">arrow_forward</span>
                </div>
             </div>
          </div>
        )}

        <SettingsSection title="Conta">
           <SettingsItem 
            icon="mail" 
            title="Alterar E-mail" 
            onClick={() => navigate('/profile/email')}
            iconBg="bg-blue-100 dark:bg-blue-500/10" 
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <SettingsItem 
            icon="credit_card" 
            title="Meu Plano" 
            subtitle={(profile?.plan === 'free' || !profile?.plan) ? 'Básico (Grátis)' : `${profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)} (Ativo)`}
            onClick={() => navigate('/profile/plan')}
            iconBg="bg-yellow-100 dark:bg-yellow-500/10" 
            iconColor="text-yellow-600 dark:text-yellow-400"
          />
        </SettingsSection>

        <SettingsSection title="App & Visual">
           <SettingsItem 
            icon="palette" 
            title="Aparência" 
            subtitle={`Tema: ${profile?.theme || 'Padrão'}`}
            onClick={() => navigate('/profile/appearance')}
            iconBg="bg-purple-100 dark:bg-purple-500/10" 
            iconColor="text-purple-600 dark:text-purple-400"
          />
          <SettingsItem 
            icon="notifications" 
            title="Notificações" 
            onClick={() => navigate('/profile/notifications')}
            iconBg="bg-pink-100 dark:bg-pink-500/10" 
            iconColor="text-pink-600 dark:text-pink-400"
          />
           <SettingsItem 
            icon="auto_awesome" 
            title="Regras Inteligentes" 
            subtitle="Categorização automática"
            onClick={() => navigate('/profile/smart-rules')}
            iconBg="bg-indigo-100 dark:bg-indigo-500/10" 
            iconColor="text-indigo-600 dark:text-indigo-400"
          />
        </SettingsSection>

        <SettingsSection title="Dados & Segurança">
           <SettingsItem 
            icon="lock" 
            title="Senha e Segurança" 
            onClick={() => navigate('/profile/security')}
            iconBg="bg-emerald-100 dark:bg-emerald-500/10" 
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
           <SettingsItem 
            icon="cloud_download" 
            title="Backup e Exportação" 
            onClick={() => navigate('/profile/data')}
            iconBg="bg-cyan-100 dark:bg-cyan-500/10" 
            iconColor="text-cyan-600 dark:text-cyan-400"
          />
        </SettingsSection>

        <SettingsSection title="Sobre">
           <SettingsItem 
            icon="info" 
            title="Sobre o App" 
            onClick={() => navigate('/profile/about')}
            iconBg="bg-gray-100 dark:bg-gray-700" 
            iconColor="text-gray-600 dark:text-gray-300"
          />
        </SettingsSection>

        <SettingsSection title="Zona de Perigo">
          <SettingsItem 
            icon="delete_sweep" 
            title="Zerar Transações" 
            onClick={openClearTransactionsModal}
            iconBg="bg-red-100 dark:bg-red-500/10" 
            iconColor="text-red-600 dark:text-red-400"
            isDestructive
          />
          <SettingsItem 
            icon="logout" 
            title="Sair da Conta" 
            onClick={handleLogout}
            iconBg="bg-slate-100 dark:bg-slate-700" 
            iconColor="text-slate-500 dark:text-slate-400"
          />
        </SettingsSection>

        <div className="px-4 pb-4">
          <button 
             onClick={() => navigate('/profile/delete-account')}
             className="w-full py-3 text-red-500/60 text-xs font-bold hover:text-red-500 transition-colors flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">heart_broken</span>
            Excluir minha conta permanentemente
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-4">
            FinControl v1.0.3 • Build 2024.11
          </p>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s]">
          <div className="bg-white dark:bg-[#192233] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-red-500/20 transform animate-[scale-in_0.2s_ease-out]">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                 <span className="material-symbols-outlined text-4xl">delete_forever</span>
              </div>
              <h3 className="text-xl font-bold dark:text-white">Zerar Transações?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Essa ação apagará <strong>todas</strong> as suas receitas e despesas. O saldo voltará a zero. <br/>
                <span className="text-red-500 font-bold">Isso não pode ser desfeito.</span>
              </p>
              
              <div className="w-full mt-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Digite "ZERAR" para confirmar</label>
                 <input 
                   autoFocus
                   type="text" 
                   value={deleteConfirmationText}
                   className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 outline-none text-center font-bold uppercase dark:text-white transition-colors"
                   placeholder="ZERAR"
                   onChange={(e) => setDeleteConfirmationText(e.target.value)}
                 />
              </div>

              <div className="flex gap-3 w-full mt-4">
                <button 
                   onClick={() => setShowDeleteModal(false)}
                   className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                   onClick={executeClearTransactions}
                   disabled={deleteConfirmationText.toUpperCase() !== 'ZERAR'}
                   className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  Apagar Tudo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;