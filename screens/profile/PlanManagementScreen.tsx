
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/database';

// --- Componentes Auxiliares de UI ---

const CheckIcon = ({ className = "text-green-500" }: { className?: string }) => (
  <span className={`material-symbols-outlined text-[18px] ${className} shrink-0`}>check_circle</span>
);

const LockIcon = () => (
  <span className="material-symbols-outlined text-[18px] text-slate-600 dark:text-slate-600 shrink-0">lock</span>
);

const FeatureItem: React.FC<{ text: string; included: boolean; highlight?: boolean }> = ({ text, included, highlight }) => (
  <li className={`flex items-start gap-3 text-sm leading-snug ${included ? (highlight ? 'text-white font-medium' : 'text-slate-700 dark:text-slate-300') : 'text-slate-400 dark:text-slate-600 line-through decoration-slate-300 dark:decoration-slate-700'}`}>
    {included ? (
      <CheckIcon className={highlight ? "text-green-400" : "text-green-600 dark:text-green-500"} />
    ) : (
      <LockIcon />
    )}
    <span>{text}</span>
  </li>
);

interface PlanProps {
  id: 'free' | 'pro' | 'ultra';
  title: string;
  price: string;
  period?: string;
  description: string;
  features: { text: string; included: boolean }[];
  currentPlan: string;
  onSelect: (id: 'free' | 'pro' | 'ultra') => void;
  isPromo?: boolean;
}

const PlanCard: React.FC<PlanProps> = ({ id, title, price, period, description, features, currentPlan, onSelect, isPromo }) => {
  const isActive = currentPlan === id;
  const isUltra = id === 'ultra';
  const isPro = id === 'pro';

  // Definição de estilos baseados no plano
  let cardStyle = "bg-white dark:bg-[#151f32] border-slate-200 dark:border-slate-800";
  let buttonStyle = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700";
  
  if (isActive) {
    if (isUltra) {
        cardStyle = "bg-black border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.15)] ring-1 ring-green-500/50";
        buttonStyle = "bg-green-600 text-white cursor-default";
    } else if (isPro) {
        cardStyle = "bg-[#151f32] border-blue-600 shadow-xl ring-1 ring-blue-600/50";
        buttonStyle = "bg-blue-600 text-white cursor-default";
    } else {
        cardStyle = "bg-white dark:bg-[#1e2330] border-slate-400 dark:border-slate-500";
        buttonStyle = "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-default";
    }
  } else {
    if (isUltra) {
        cardStyle = "bg-[#0a0a0a] border-slate-800 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/10";
        buttonStyle = "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/20";
    } else if (isPro) {
        cardStyle = "bg-white dark:bg-[#151f32] border-slate-200 dark:border-slate-700 hover:border-blue-500/50";
        buttonStyle = "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20";
    }
  }

  return (
    <div 
      onClick={() => !isActive && onSelect(id)}
      className={`relative w-full p-6 rounded-[1.5rem] border-2 transition-all duration-300 flex flex-col gap-4 overflow-hidden group ${cardStyle} ${!isActive ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      {/* Badge Promocional */}
      {isPromo && !isActive && (
        <div className="absolute top-0 right-0">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg shadow-sm uppercase tracking-wide">
                Promoção 1000 usuários
            </div>
        </div>
      )}

      {/* Badge Ativo */}
      {isActive && (
        <div className={`absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl flex items-center gap-1 uppercase tracking-wide ${isUltra ? 'bg-green-600 text-white' : isPro ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
            <span className="material-symbols-outlined text-[14px]">verified</span> SEU PLANO
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-xl font-extrabold uppercase tracking-wide ${isUltra ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {title}
            </h3>
            {isUltra && <span className="material-symbols-outlined text-green-400 animate-pulse">bolt</span>}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed min-h-[2.5em]">
            {description}
        </p>
      </div>

      {/* Pricing */}
      <div className="flex items-baseline gap-1 my-1">
        <span className={`text-3xl font-black ${isUltra ? 'text-green-400' : 'text-slate-900 dark:text-white'}`}>
            {price}
        </span>
        {period && <span className="text-sm font-bold text-slate-400">{period}</span>}
      </div>

      {/* Divider */}
      <div className={`h-px w-full ${isUltra ? 'bg-gradient-to-r from-green-500/50 to-transparent' : 'bg-slate-100 dark:bg-slate-800'}`}></div>

      {/* Features List */}
      <ul className="space-y-3 flex-1">
        {features.map((f, i) => (
            <FeatureItem key={i} text={f.text} included={f.included} highlight={isUltra} />
        ))}
      </ul>

      {/* Action Button */}
      <button 
        disabled={isActive}
        className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${buttonStyle}`}
      >
        {isActive ? (
            <>
                <span className="material-symbols-outlined text-[18px]">check</span>
                Plano Atual
            </>
        ) : (
            <>
                {id === 'free' ? 'Voltar para Grátis' : `Assinar ${title}`}
                {id !== 'free' && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
            </>
        )}
      </button>
    </div>
  );
};

const PlanManagementScreen: React.FC = () => {
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'ultra'>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      const profile = await db.getUserProfile();
      if (profile?.plan) {
        setCurrentPlan(profile.plan);
      }
      setLoading(false);
    };
    fetchPlan();
  }, []);

  const handleUpdate = async (plan: 'free' | 'pro' | 'ultra') => {
    if (plan === currentPlan) return;
    
    let confirmMsg = '';
    if (plan === 'free') {
        confirmMsg = 'Tem certeza? Você perderá acesso aos gráficos avançados, backup automático e exportações.';
    } else if (plan === 'pro') {
        confirmMsg = 'Confirmar assinatura do Plano PRO por R$ 9,90 mensais?';
    } else {
        confirmMsg = 'Confirmar assinatura do Plano ULTRA por R$ 19,90 mensais?';
    }

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    // Simulação de delay de rede/processamento
    await new Promise(r => setTimeout(r, 800));
    
    await db.updateUserProfile({ plan });
    setCurrentPlan(plan);
    setLoading(false);
    
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
            <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
    );
  }

  // Definição das funcionalidades por plano para garantir consistência e evitar repetição no JSX
  const freeFeatures = [
      { text: "Cadastro ilimitado de transações", included: true },
      { text: "Categorias manuais", included: true },
      { text: "Extrato e Gráficos básicos", included: true },
      { text: "Exportação CSV", included: true },
      { text: "Backup manual (JSON)", included: true },
      { text: "Exportação Excel / PDF", included: false },
      { text: "Automação e IA", included: false },
  ];

  const proFeatures = [
      { text: "Tudo do plano Free", included: true },
      { text: "Exportação Excel e PDF", included: true },
      { text: "Backup automático", included: true },
      { text: "Categorias inteligentes", included: true },
      { text: "Comparativo mensal automático", included: true },
      { text: "Alertas de orçamento", included: true },
      { text: "Temas premium & Sem anúncios", included: true },
      { text: "Leitura de notificações bancárias", included: false },
  ];

  const ultraFeatures = [
      { text: "Tudo do plano Pro", included: true },
      { text: "Leitura de notificações bancárias", included: true },
      { text: "Alertas preditivos inteligentes", included: true },
      { text: "Score financeiro avançado", included: true },
      { text: "Contas fixas automáticas", included: true },
      { text: "Parcelamentos inteligentes", included: true },
      { text: "Análise de comportamento", included: true },
      { text: "Acesso antecipado a novidades", included: true },
  ];

  return (
    <div className="bg-background-light dark:bg-[#050505] min-h-screen flex flex-col font-display transition-colors">
       <header className="flex items-center p-4 sticky top-0 bg-background-light/95 dark:bg-[#050505]/95 backdrop-blur-sm z-20 border-b border-slate-200 dark:border-white/5">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-slate-700 dark:text-white">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold ml-2 text-slate-900 dark:text-white">Níveis de Acesso</h1>
      </header>

      <main className="p-4 space-y-6 pb-12 overflow-y-auto">
        <div className="text-center py-2">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Evolua seu controle</h2>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
                Escolha o plano ideal para automatizar suas finanças e alcançar suas metas mais rápido.
            </p>
        </div>

        {/* ULTRA CARD */}
        <PlanCard 
            id="ultra"
            title="Ultra"
            price="R$ 19,90"
            period="/mês"
            description="Automação máxima e inteligência artificial para quem leva finanças a sério."
            features={ultraFeatures}
            currentPlan={currentPlan}
            onSelect={handleUpdate}
            isPromo={true}
        />

        {/* PRO CARD */}
        <PlanCard 
            id="pro"
            title="Pro"
            price="R$ 9,90"
            period="/mês"
            description="Ferramentas profissionais de análise e relatórios detalhados."
            features={proFeatures}
            currentPlan={currentPlan}
            onSelect={handleUpdate}
        />

        {/* FREE CARD */}
        <PlanCard 
            id="free"
            title="Free"
            price="R$ 0,00"
            description="O essencial para começar a organizar sua vida financeira hoje."
            features={freeFeatures}
            currentPlan={currentPlan}
            onSelect={handleUpdate}
        />

        <div className="flex flex-col items-center gap-2 mt-4 pb-6">
            <div className="flex items-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <span className="text-xs font-bold uppercase">Pagamento Seguro</span>
            </div>
            <p className="text-center text-[10px] text-slate-500 max-w-[280px] leading-relaxed">
                Cobrança mensal recorrente. Você pode cancelar ou alterar seu plano a qualquer momento nas configurações do aplicativo.
            </p>
        </div>
      </main>
    </div>
  );
};

export default PlanManagementScreen;
