
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../services/database';

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize tab from navigation state, default to login
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Watch for navigation state changes to switch tabs
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);
  
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
          let msg = result.message || 'Erro ao cadastrar.';
          if (msg.includes('already registered')) {
             msg = 'Este e-mail já está em uso.';
          }
          setError(msg);
          setLoading(false);
        }
      }
    } catch (err) {
      setError('Erro de conexão.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden mx-auto bg-[#0B111D] text-white">
      {/* Back Button */}
      <div className="absolute top-6 left-4 z-10">
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
           <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </div>

      {/* Header Section */}
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-6 gap-6">
        <div className="flex flex-col items-center gap-4">
          {/* Logo with Glow */}
          <div className="relative">
             <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
             <div className="relative bg-[#151f32] p-4 rounded-2xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
                <span className="material-symbols-outlined text-blue-500 text-4xl">account_balance_wallet</span>
             </div>
          </div>
          
          {/* Text */}
          <div className="flex flex-col items-center justify-center space-y-1 mt-2">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-center text-white">
              Bem-vindo
            </h1>
            <p className="text-slate-400 text-sm font-medium text-center">
              Controle suas finanças pessoais
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Control (Tabs) */}
      <div className="px-6 mb-6">
        <div className="flex h-12 w-full items-center justify-center rounded-xl bg-[#151f32] p-1 border border-[#1e2a40]">
          <button
            onClick={() => { setActiveTab('login'); setError(''); }}
            className={`flex cursor-pointer h-full flex-1 items-center justify-center overflow-hidden rounded-lg px-2 transition-all duration-300 ${activeTab === 'login' ? 'bg-[#1e2a40] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="text-sm font-bold">Login</span>
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(''); }}
            className={`flex cursor-pointer h-full flex-1 items-center justify-center overflow-hidden rounded-lg px-2 transition-all duration-300 ${activeTab === 'register' ? 'bg-[#1e2a40] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="text-sm font-bold">Registrar</span>
          </button>
        </div>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6">
        
        {/* Name Input (Register only) */}
        {activeTab === 'register' && (
          <div className="space-y-1.5 animate-[fade-in_0.3s_ease-out]">
            <p className="text-slate-300 text-xs font-bold ml-1">Nome</p>
            <div className="relative flex items-center group">
              <div className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <input 
                type="text" 
                placeholder="Seu nome completo" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex w-full h-14 pl-11 pr-4 rounded-xl bg-[#151f32] border border-[#1e2a40] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm font-medium"
              />
            </div>
          </div>
        )}

        {/* Email Input */}
        <div className="space-y-1.5">
          <p className="text-slate-300 text-xs font-bold ml-1">E-mail</p>
          <div className="relative flex items-center group">
            <div className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors">
              <span className="material-symbols-outlined text-[20px]">mail</span>
            </div>
            <input 
              type="email" 
              placeholder="usuario@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex w-full h-14 pl-11 pr-4 rounded-xl bg-[#151f32] border border-[#1e2a40] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm font-medium"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <p className="text-slate-300 text-xs font-bold">Senha</p>
          </div>
          <div className="relative flex items-center group">
            <div className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="********" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex w-full h-14 pl-11 pr-12 rounded-xl bg-[#151f32] border border-[#1e2a40] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm font-medium"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 h-full px-4 text-slate-500 hover:text-white transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {/* Remember Me */}
        {activeTab === 'login' && (
          <div className="flex justify-between items-center mt-1">
             <label className="flex items-center gap-2 cursor-pointer select-none group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-slate-600'}`}>
                   {rememberMe && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                </div>
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="hidden"
                />
                <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">Lembrar de mim</span>
             </label>
             <a href="#" className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors">Esqueceu a senha?</a>
          </div>
        )}

        {/* Error Message */}
        {error && (
           <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-[fade-in_0.3s]">
             <span className="material-symbols-outlined text-[18px]">error</span>
             {error}
           </div>
        )}

        {/* Primary Action Button */}
        <button 
          type="submit" 
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] h-14 text-white text-base font-bold leading-normal tracking-wide shadow-lg shadow-blue-900/20 transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
             <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <span>{activeTab === 'login' ? 'Entrar' : 'Criar Conta'}</span>
          )}
        </button>
      </form>

      {/* Footer / Socials */}
      <div className="mt-auto pb-8 pt-6 px-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-[#1e2a40]"></div>
          <p className="text-slate-500 text-xs font-medium">Ou continue com</p>
          <div className="h-px flex-1 bg-[#1e2a40]"></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#1e2a40] bg-[#151f32] hover:bg-[#1e2a40] active:scale-[0.98] transition-all">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            <span className="text-white text-sm font-bold">Google</span>
          </button>
          <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#1e2a40] bg-[#151f32] hover:bg-[#1e2a40] active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-white text-[24px]">ios</span>
            <span className="text-white text-sm font-bold">Apple</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
