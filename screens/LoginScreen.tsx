import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/database';

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Carregar credenciais salvas ao iniciar
  useEffect(() => {
    const savedEmail = localStorage.getItem('fincontrol_saved_email');
    const savedPass = localStorage.getItem('fincontrol_saved_pass');
    
    if (savedEmail && savedPass) {
      setEmail(savedEmail);
      setPassword(savedPass);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'login') {
        const result = await db.loginUser(email, password);
        if (result.success) {
          // Lógica do Lembrar de Mim
          if (rememberMe) {
            localStorage.setItem('fincontrol_saved_email', email);
            localStorage.setItem('fincontrol_saved_pass', password);
          } else {
            localStorage.removeItem('fincontrol_saved_email');
            localStorage.removeItem('fincontrol_saved_pass');
          }

          navigate('/dashboard');
        } else {
          setError(result.message || 'Erro ao entrar.');
          setLoading(false);
        }
      } else {
        if (!name || !email || !password) {
          setError('Preencha todos os campos.');
          setLoading(false);
          return;
        }
        const result = await db.registerUser(name, email, password);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.message || 'Erro ao cadastrar.');
          setLoading(false);
        }
      }
    } catch (err) {
      setError('Erro de conexão.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden mx-auto">
      {/* Status Bar Spacer */}
      <div className="h-12 w-full"></div>

      {/* Header Section */}
      <div className="flex flex-col items-center justify-center p-6 gap-6">
        <div className="flex flex-col items-center gap-4">
          {/* Logo */}
          <div 
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl h-20 w-20 shadow-lg shadow-primary/20"
            style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAluRBtB2U_DgKxhggDCYMRs2ZFSh18ylEcl7ZygPtITPKtAl8nu-_waC24HqLXJcvBaCtI0F6OgLNFYZ8ZxIKO66q0dvA-6yCSCBNLQwL0pGd9_Fs4eskFALYt9h-Ci0a4hhLUtXLTFmk2aCCA3qzXJWNvWujETjloMR2AJlfyqWMsWNhe9RN8cYr_OMyand0-ZJY4t6VVXytkmWiFaS3RqxJx0-U0dXv10v8mZsz1DlytuTDrR0vTDm0SBnQwn7YMQKz9NsYYftma")'}}
          ></div>
          {/* Text */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <h1 className="text-slate-900 dark:text-white text-[28px] font-extrabold leading-tight tracking-tight text-center">
              Bem-vindo
            </h1>
            <p className="text-slate-500 dark:text-[#92a4c9] text-base font-medium leading-normal text-center">
              Controle suas finanças pessoais
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Control (Tabs) */}
      <div className="px-6 py-2">
        <div className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-200 dark:bg-[#232f48] p-1">
          <button
            onClick={() => { setActiveTab('login'); setError(''); }}
            className={`flex cursor-pointer h-full flex-1 items-center justify-center overflow-hidden rounded-lg px-2 transition-all duration-200 ${activeTab === 'login' ? 'bg-white dark:bg-[#111722] shadow-sm text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-[#92a4c9] hover:text-slate-700 dark:hover:text-white font-medium'}`}
          >
            <span className="truncate text-sm">Login</span>
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(''); }}
            className={`flex cursor-pointer h-full flex-1 items-center justify-center overflow-hidden rounded-lg px-2 transition-all duration-200 ${activeTab === 'register' ? 'bg-white dark:bg-[#111722] shadow-sm text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-[#92a4c9] hover:text-slate-700 dark:hover:text-white font-medium'}`}
          >
            <span className="truncate text-sm">Registrar</span>
          </button>
        </div>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-4">
        
        {/* Name Input (Register only) */}
        {activeTab === 'register' && (
          <label className="flex flex-col gap-1.5 w-full animate-[fade-in_0.3s_ease-out]">
            <p className="text-slate-900 dark:text-white text-sm font-semibold leading-normal">Nome</p>
            <div className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Seu nome completo" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-[#324467] bg-white dark:bg-[#192233] h-14 placeholder:text-slate-400 dark:placeholder:text-[#92a4c9] pl-11 pr-4 text-base font-normal leading-normal transition-colors"
              />
              <div className="absolute left-4 text-slate-400 dark:text-[#92a4c9]">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
            </div>
          </label>
        )}

        {/* Email Input */}
        <label className="flex flex-col gap-1.5 w-full">
          <p className="text-slate-900 dark:text-white text-sm font-semibold leading-normal">E-mail</p>
          <div className="relative flex items-center">
            <input 
              type="email" 
              placeholder="usuario@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-[#324467] bg-white dark:bg-[#192233] h-14 placeholder:text-slate-400 dark:placeholder:text-[#92a4c9] pl-11 pr-4 text-base font-normal leading-normal transition-colors"
            />
            <div className="absolute left-4 text-slate-400 dark:text-[#92a4c9]">
              <span className="material-symbols-outlined text-[20px]">mail</span>
            </div>
          </div>
        </label>

        {/* Password Input */}
        <label className="flex flex-col gap-1.5 w-full">
          <div className="flex justify-between items-center">
            <p className="text-slate-900 dark:text-white text-sm font-semibold leading-normal">Senha</p>
          </div>
          <div className="relative flex items-center">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="********" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-[#324467] bg-white dark:bg-[#192233] h-14 placeholder:text-slate-400 dark:placeholder:text-[#92a4c9] pl-11 pr-12 text-base font-normal leading-normal transition-colors"
            />
            <div className="absolute left-4 text-slate-400 dark:text-[#92a4c9]">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </div>
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 h-full px-4 text-slate-400 dark:text-[#92a4c9] hover:text-primary transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </label>

        {/* Remember Me & Forgot Password Row */}
        {activeTab === 'login' && (
          <div className="flex justify-between items-center -mt-2">
             <label className="flex items-center gap-2 cursor-pointer select-none group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-primary border-primary' : 'bg-transparent border-slate-400 dark:border-slate-600'}`}>
                   {rememberMe && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                </div>
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="hidden"
                />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Lembrar de mim</span>
             </label>

             <a href="#" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">Esqueceu a senha?</a>
          </div>
        )}

        {/* Error Message */}
        {error && (
           <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium p-3 rounded-xl flex items-center gap-2">
             <span className="material-symbols-outlined text-[20px]">error</span>
             {error}
           </div>
        )}

        {/* Primary Action Button */}
        <button 
          type="submit" 
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-primary hover:bg-blue-600 active:scale-[0.98] h-14 text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/25 transition-all mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
             <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <span className="truncate">{activeTab === 'login' ? 'Entrar' : 'Criar Conta'}</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="h-px flex-1 bg-slate-200 dark:bg-[#324467]"></div>
        <p className="text-slate-500 dark:text-[#92a4c9] text-sm font-medium">Ou continue com</p>
        <div className="h-px flex-1 bg-slate-200 dark:bg-[#324467]"></div>
      </div>

      {/* Social Buttons */}
      <div className="grid grid-cols-2 gap-4 px-6 pb-8">
        <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[#324467] bg-white dark:bg-[#192233] hover:bg-slate-50 dark:hover:bg-[#232f48] active:scale-[0.98] transition-all">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBE27cB-Aww_vEQvoCXRt9tQPnsIA2mKTvVOy_LjONNXGMJVw4TcTOexRbOhtRVJrjOML0JTgFMAizYE25ifgOz-stvDDrr98GAS-XeJZy6wRznAGF_XbWiUVfUvEjrpYjMHKlA2yDX4aihzpNxUa3FQVPw8Ud3FcknqPTUU1kRQOqiyDxp0sw8mFapHVmKj8K3liIw1H-gp8iiP9D9PVQejZTgMZeZDShAvu1K7N6J_MFVUyq8eS5o3eRJwd-9iG_9VXDT8-FwfZ6M" alt="Google Logo" className="w-5 h-5" />
          <span className="text-slate-900 dark:text-white text-sm font-bold">Google</span>
        </button>
        <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[#324467] bg-white dark:bg-[#192233] hover:bg-slate-50 dark:hover:bg-[#232f48] active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined text-slate-900 dark:text-white text-[24px]">ios</span>
          <span className="text-slate-900 dark:text-white text-sm font-bold">Apple</span>
        </button>
      </div>

      {/* Footer / Biometrics Hint */}
      <div className="mt-auto pb-8 flex justify-center">
        <button className="flex flex-col items-center gap-2 text-primary opacity-80 hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined text-[32px]">face</span>
          <span className="text-xs font-medium">Face ID</span>
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;