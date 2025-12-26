import React from 'react';

export const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-2 mb-6 animate-[fade-in_0.3s]">
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-4">{title}</h3>
    <div className="bg-white dark:bg-[#192233] rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-transparent mx-2">
      {children}
    </div>
  </div>
);

interface SettingsItemProps {
  icon: string;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  isDestructive?: boolean;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({ 
  icon, 
  iconColor = "text-slate-600 dark:text-slate-300", 
  iconBg = "bg-slate-100 dark:bg-slate-700/50", 
  title, 
  subtitle, 
  onClick, 
  rightElement,
  isDestructive
}) => (
  <button 
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-[#202b40] transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 ${!onClick ? 'cursor-default' : ''}`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center ${iconColor}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="flex flex-col items-start">
        <span className={`font-medium text-sm ${isDestructive ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{title}</span>
        {subtitle && <span className="text-[11px] text-slate-400 text-left">{subtitle}</span>}
      </div>
    </div>
    {rightElement || (onClick && <span className="material-symbols-outlined text-slate-400 text-[20px]">chevron_right</span>)}
  </button>
);

export const SwitchItem: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <div 
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
  >
    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
  </div>
);

export const PlanBadge: React.FC<{ plan: string }> = ({ plan }) => {
  const colors = {
    free: 'bg-slate-500',
    pro: 'bg-gradient-to-r from-primary to-blue-400',
    ultra: 'bg-gradient-to-r from-purple-500 to-pink-500'
  };
  return (
    <span className={`${colors[plan as keyof typeof colors] || colors.free} text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide`}>
      {plan}
    </span>
  );
};