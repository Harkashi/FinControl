
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/database';

export const SecurityScreen: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  const handleUpdate = async () => {
    if (password.length < 6) {
      setStatus({ type: 'error', msg: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    setLoading(true);
    setStatus(null);
    const { error } = await db.supabase.auth.updateUser({ password });
    setLoading(false);
    
    if (error) {
      setStatus({ type: 'error', msg: error.message || 'Erro ao atualizar senha.' });
    } else {
      setStatus({ type: 'success', msg: 'Senha atualizada com sucesso!' });
      setTimeout(() => navigate(-1), 1500);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
       <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Segurança</h1>
      </header>
      <main className="p-4 space-y-4">
        <div className="bg-white dark:bg-[#192233] p-4 rounded-xl shadow-sm">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nova Senha</label>
          <input 
            type="password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
            placeholder="Mínimo 6 caracteres"
          />
          
          {status && (
            <div className={`mt-3 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${status.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
               <span className="material-symbols-outlined text-[18px]">{status.type === 'error' ? 'error' : 'check_circle'}</span>
               {status.msg}
            </div>
          )}

          <button 
            onClick={handleUpdate}
            disabled={loading}
            className="w-full mt-4 bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? 'Atualizando...' : 'Atualizar Senha'}
          </button>
        </div>
      </main>
    </div>
  );
};

export const TwoFactorScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
      <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">2FA</h1>
      </header>
      <main className="p-4 flex flex-col items-center justify-center pt-20 text-center opacity-60">
         <span className="material-symbols-outlined text-6xl mb-4 dark:text-white">phonelink_lock</span>
         <h2 className="text-xl font-bold dark:text-white">Em breve</h2>
         <p className="text-sm max-w-xs mt-2 dark:text-slate-400">A autenticação em duas etapas estará disponível na próxima atualização para contas Pro e Ultra.</p>
      </main>
    </div>
  );
};

export const ChangeEmailScreen: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'warning' | 'error', msg: string} | null>(null);
  
  const handleUpdate = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
       setStatus({ type: 'error', msg: 'Digite um e-mail válido.' });
       return;
    }

    setLoading(true);
    setStatus(null);
    
    // Chama o serviço
    const result = await db.updateEmail(cleanEmail);
    setLoading(false);

    if (result.success) {
      if (result.type === 'updated') {
        setStatus({ type: 'success', msg: 'E-mail atualizado com sucesso!' });
        setEmail('');
      } else {
        // Mensagem refinada explicando o fluxo de segurança do Supabase
        setStatus({ 
            type: 'warning', 
            msg: 'Por segurança, enviamos um link de confirmação para o seu NOVO e para o ANTIGO e-mail. Confirme em ambos para concluir.' 
        });
        setEmail('');
      }
    } else {
      let errorMsg = result.message || 'Erro ao atualizar e-mail.';
      if (errorMsg.includes('invalid')) errorMsg = 'E-mail inválido ou mal formatado.';
      if (errorMsg.includes('already registered')) errorMsg = 'Este e-mail já está em uso.';
      setStatus({ type: 'error', msg: errorMsg });
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
      <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Alterar Email</h1>
      </header>
      <main className="p-4">
         <div className="bg-white dark:bg-[#192233] p-4 rounded-xl shadow-sm">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Novo E-mail</label>
          <input 
            type="email" 
            value={email}
            onChange={e => {
                setEmail(e.target.value);
                if (status) setStatus(null);
            }}
            className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
            placeholder="seu@email.com"
          />
          
          {status && (
            <div className={`mt-3 p-3 rounded-lg text-sm font-medium flex items-start gap-2 ${
                status.type === 'error' ? 'bg-red-500/10 text-red-500' : 
                status.type === 'warning' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                'bg-green-500/10 text-green-500'
            }`}>
               <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                   {status.type === 'error' ? 'error' : status.type === 'warning' ? 'mark_email_unread' : 'check_circle'}
               </span>
               <span>{status.msg}</span>
            </div>
          )}

          <button 
            onClick={handleUpdate}
            disabled={loading}
            className="w-full mt-4 bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? 'Enviando...' : 'Atualizar Email'}
          </button>
        </div>
      </main>
    </div>
  );
};

export const DeleteAccountScreen: React.FC = () => {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null); // Novo estado para feedback

  const handleDelete = async () => {
    if (confirmText !== 'DELETAR') {
      setStatus({ type: 'error', msg: 'Digite "DELETAR" corretamente para confirmar.' });
      return;
    }
    setLoading(true);
    setStatus(null); // Limpa status anterior
    
    const result = await db.deleteAccount();
    
    if (result.success) {
      setStatus({ type: 'success', msg: 'Conta excluída permanentemente. Redirecionando...' });
      setTimeout(() => navigate('/login'), 1500); // Atraso para o usuário ver a mensagem
    } else {
      // Exibe a mensagem de erro específica do serviço
      setStatus({ type: 'error', msg: result.error?.message || 'Erro desconhecido ao excluir conta.' });
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
       <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Excluir Conta</h1>
      </header>
      <main className="p-4 space-y-6">
         <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 text-center">
             <span className="material-symbols-outlined text-red-500 text-5xl mb-2">warning</span>
             <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Ação Irreversível</h2>
             <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
               Você está prestes a excluir sua conta permanentemente. Todos os seus dados, histórico e configurações serão perdidos para sempre.
             </p>
             
             <label className="block text-left text-xs font-bold text-slate-500 mb-2 uppercase">Digite "DELETAR" para confirmar</label>
             <input 
               type="text" 
               value={confirmText}
               onChange={e => {
                   setConfirmText(e.target.value);
                   if (status) setStatus(null); // Limpa o status ao digitar
               }}
               className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent focus:border-red-500 outline-none text-center font-bold dark:text-white"
               placeholder="DELETAR"
             />

             {status && (
                <div className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${status.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                   <span className="material-symbols-outlined text-[18px]">{status.type === 'error' ? 'error' : 'check_circle'}</span>
                   {status.msg}
                </div>
             )}

             <button 
               onClick={handleDelete}
               disabled={confirmText !== 'DELETAR' || loading}
               className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-red-500/20"
             >
               {loading ? 'Excluindo...' : 'Excluir Minha Conta'}
             </button>
         </div>
      </main>
    </div>
  );
};
