
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import { UserProfile } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import { SwitchItem } from '../../components/SettingsComponents';

export const DataScreen: React.FC = () => {
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  // Google Drive State
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);

  useEffect(() => {
    db.getUserProfile().then(setProfile);
    
    // Init Google Service
    googleDriveService.init();
    checkDriveStatus();

    // Listen for token updates
    window.addEventListener('gdrive_token_updated', checkDriveStatus);
    return () => window.removeEventListener('gdrive_token_updated', checkDriveStatus);
  }, []);

  const checkDriveStatus = () => {
      setIsDriveConnected(googleDriveService.isAuthenticated());
      const savedAuto = localStorage.getItem('fincontrol_auto_backup') === 'true';
      setIsAutoBackupEnabled(savedAuto);
  };

  // 1. Export CSV (Padrão) - AGORA FUNCIONAL
  const handleExportCSV = async () => {
    const csv = await db.exportData();
    if (!csv) {
       setStatus({ type: 'error', msg: 'Sem dados para exportar.' });
       return;
    }
    downloadFile(csv, `fincontrol_export_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  };

  // 2. Criar Backup (JSON Completo)
  const handleCreateBackup = async () => {
    const json = await db.createFullBackup();
    downloadFile(json, `fincontrol_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    setStatus({ type: 'success', msg: 'Backup criado com sucesso!' });
  };

  // 3. Exportar Excel ou PDF (Lógica Pro)
  const handleExportRichClick = () => {
     if (!isPro) {
       if (confirm('A exportação em Excel e PDF é exclusiva para assinantes Premium (Pro e Ultra). Deseja ver os planos?')) {
           navigate('/profile/plan');
       }
       return;
     }
     setShowExportOptions(true);
  };

  const executeExportExcel = async () => {
    const csvExcel = await db.exportExcelData();
    downloadFile(csvExcel, `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    setShowExportOptions(false);
  };

  const executeExportPDF = async () => {
    // Busca dados JÁ TRATADOS do novo pipeline
    const richData = await db.getExportableData();
    const balance = await db.getBalance();
    
    if (richData.length === 0) {
        alert('Não há transações para gerar o relatório.');
        return;
    }
    
    // HTML Limpo e Estruturado para Impressão
    const printWindow = window.open('', '', 'height=800,width=900');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <title>Relatório Financeiro - FinControl</title>
            <meta charset="utf-8">
            <style>
              @page { size: A4; margin: 15mm; }
              body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #1e293b; max-width: 800px; margin: 0 auto; }
              .header { margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
              .header h1 { color: #0f172a; margin: 0 0 5px 0; font-size: 24px; }
              .header p { margin: 0; color: #64748b; font-size: 12px; }
              .summary { display: flex; gap: 15px; margin-bottom: 30px; }
              .card { background: #f8fafc; padding: 15px; border-radius: 8px; flex: 1; border: 1px solid #e2e8f0; }
              .card h3 { margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 0.5px; }
              .card p { margin: 0; font-size: 18px; font-weight: bold; color: #0f172a; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              thead { display: table-header-group; }
              tr { page-break-inside: avoid; }
              th { text-align: left; padding: 12px 8px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #475569; font-weight: bold; text-transform: uppercase; }
              td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
              .text-right { text-align: right; }
              .income { color: #16a34a; font-weight: bold; }
              .expense { color: #dc2626; font-weight: bold; }
              .meta { color: #94a3b8; font-size: 10px; margin-top: 2px; }
              .badge { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; color: #475569; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="header">
              <div><h1>FinControl</h1><p>Extrato Financeiro Completo</p></div>
              <div style="text-align: right"><p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p></div>
            </div>
            <div class="summary">
              <div class="card"><h3>Saldo Total</h3><p>R$ ${balance.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
              <div class="card"><h3>Receitas</h3><p style="color: #16a34a">R$ ${balance.income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
              <div class="card"><h3>Despesas</h3><p style="color: #dc2626">R$ ${balance.expense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
            </div>
            <table>
              <thead><tr><th width="15%">Data</th><th width="35%">Descrição</th><th width="20%">Categoria</th><th width="15%">Conta / Método</th><th width="15%" class="text-right">Valor</th></tr></thead>
              <tbody>
                ${richData.map(t => `
                  <tr>
                    <td>${t.dateFormatted}</td>
                    <td><div style="font-weight: 600; color: #0f172a;">${t.title}</div></td>
                    <td><div class="badge">${t.categoryName}</div></td>
                    <td><div style="color: #334155;">${t.walletName}</div><div class="meta">${t.methodName}</div></td>
                    <td class="text-right ${t.type === 'Receita' ? 'income' : 'expense'}">${t.type === 'Despesa' ? '-' : '+'} R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <script>window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    setShowExportOptions(false);
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setStatus(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const result = await db.importData(content);
      
      setImporting(false);
      if (result.success) {
        setStatus({ type: 'success', msg: result.message || 'Importação concluída!' });
        setTimeout(() => {
           if (e.target) e.target.value = ''; // Limpa o input para permitir re-upload se necessário
           navigate('/dashboard');
        }, 1500);
      } else {
        setStatus({ type: 'error', msg: result.message || 'Erro ao importar dados.' });
      }
    };
    reader.onerror = () => {
      setImporting(false);
      setStatus({ type: 'error', msg: 'Erro ao ler arquivo.' });
    };
    reader.readAsText(file);
  };

  // --- GOOGLE DRIVE LOGIC ---
  const handleConnectDrive = () => {
      if (!isPro) {
          if(confirm('Backup automático no Google Drive é exclusivo para planos Pro e Ultra. Deseja assinar?')) {
              navigate('/profile/plan');
          }
          return;
      }
      googleDriveService.requestToken();
  };

  const handleDisconnectDrive = () => {
      googleDriveService.logout();
      setIsAutoBackupEnabled(false);
      localStorage.removeItem('fincontrol_auto_backup');
  };

  const handleManualDriveBackup = async () => {
      setDriveLoading(true);
      const json = await db.createFullBackup();
      const filename = `FinControl_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const result = await googleDriveService.uploadFile(json, filename);
      
      if (result.success) {
          setStatus({ type: 'success', msg: result.message || 'Backup enviado!' });
      } else {
          setStatus({ type: 'error', msg: result.message || 'Falha no envio.' });
          // Se falhou por token, desconecta
          if (result.message?.includes('Token')) handleDisconnectDrive();
      }
      setDriveLoading(false);
  };

  const toggleAutoBackup = (enabled: boolean) => {
      setIsAutoBackupEnabled(enabled);
      localStorage.setItem('fincontrol_auto_backup', enabled ? 'true' : 'false');
  };

  const isPro = profile?.plan === 'pro' || profile?.plan === 'ultra';

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display relative">
       <header className="flex items-center p-4">
        <button onClick={() => navigate('/profile')} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
        <h1 className="text-lg font-bold dark:text-white ml-2">Dados e Backup</h1>
      </header>
      <main className="p-4 space-y-4">
        
        {status && (
            <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${status.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
               <span className="material-symbols-outlined text-[18px]">{status.type === 'error' ? 'error' : 'check_circle'}</span>
               {status.msg}
            </div>
        )}

        <div className="bg-white dark:bg-[#192233] p-4 rounded-xl space-y-4">
          
          {/* CSV Export */}
          <button onClick={handleExportCSV} className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
             <div className="flex items-center gap-3">
               <span className="material-symbols-outlined text-slate-500">description</span>
               <div className="text-left">
                 <p className="font-bold dark:text-white text-sm">Exportar CSV</p>
                 <p className="text-xs text-slate-400">Gratuito para todos</p>
               </div>
             </div>
             <span className="material-symbols-outlined text-primary">download</span>
          </button>

          {/* PDF/Excel Export (Pro Only) */}
          <button 
             onClick={handleExportRichClick}
             className={`w-full flex items-center justify-between p-3 rounded-lg border ${isPro ? 'bg-slate-50 dark:bg-slate-800 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700' : 'bg-slate-100 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 opacity-70'}`}
          >
             <div className="flex items-center gap-3">
               <span className="material-symbols-outlined text-green-600">table_view</span>
               <div className="text-left">
                 <p className="font-bold dark:text-white text-sm">Exportar Excel / PDF</p>
                 <p className="text-xs text-slate-400">{isPro ? 'Disponível' : 'Exclusivo Premium'}</p>
               </div>
             </div>
             {isPro ? (
                <span className="material-symbols-outlined text-green-600">expand_more</span>
             ) : (
                <span className="material-symbols-outlined text-slate-400">lock</span>
             )}
          </button>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>

          {/* Create Backup */}
          <button onClick={handleCreateBackup} className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
             <div className="flex items-center gap-3">
               <span className="material-symbols-outlined text-blue-500">save</span>
               <div className="text-left">
                 <p className="font-bold dark:text-white text-sm">Fazer Backup Local</p>
                 <p className="text-xs text-slate-400">Salvar arquivo .JSON no dispositivo</p>
               </div>
             </div>
             <span className="material-symbols-outlined text-blue-500">download</span>
          </button>

          {/* Import JSON */}
          <div className="relative w-full">
            <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={importing} />
            <div className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-purple-500">backup</span>
                <div className="text-left">
                  <p className="font-bold dark:text-white text-sm">{importing ? 'Restaurando...' : 'Restaurar Backup'}</p>
                  <p className="text-xs text-slate-400">Ler arquivo .JSON</p>
                </div>
              </div>
              {importing ? (
                 <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              ) : (
                 <span className="material-symbols-outlined text-purple-500">upload</span>
              )}
            </div>
          </div>
        </div>

        {/* --- GOOGLE DRIVE SECTION --- */}
        <div className={`p-4 rounded-xl border transition-all ${isPro ? 'bg-white dark:bg-[#192233] border-slate-100 dark:border-transparent' : 'bg-slate-100 dark:bg-[#111620] border-dashed border-slate-300 dark:border-slate-800 opacity-80'}`}>
            <div className="flex items-center gap-3 mb-4">
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo_%282020%29.svg" alt="Google Drive" className="w-8 h-8" />
                <div className="flex-1">
                    <h3 className="font-bold dark:text-white text-sm">Backup no Google Drive</h3>
                    <p className="text-xs text-slate-500">{isPro ? 'Sincronização na nuvem' : 'Exclusivo Pro/Ultra'}</p>
                </div>
                {!isPro && <span className="material-symbols-outlined text-slate-400">lock</span>}
            </div>

            {isPro && (
                <div className="space-y-3">
                    {!isDriveConnected ? (
                        <button onClick={handleConnectDrive} className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-white flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors">
                            <span className="material-symbols-outlined">add_link</span>
                            Conectar Conta Google
                        </button>
                    ) : (
                        <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span> Conectado
                                </span>
                                <button onClick={handleDisconnectDrive} className="text-xs text-red-500 hover:underline">Desconectar</button>
                            </div>
                            
                            <div className="flex items-center justify-between mb-3 bg-white dark:bg-slate-800 p-2 rounded-md shadow-sm">
                                <span className="text-sm font-medium dark:text-white">Backup Automático</span>
                                <SwitchItem checked={isAutoBackupEnabled} onChange={toggleAutoBackup} />
                            </div>

                            <button 
                                onClick={handleManualDriveBackup} 
                                disabled={driveLoading}
                                className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {driveLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-[14px]">cloud_upload</span>}
                                Fazer Backup Agora
                            </button>
                        </div>
                    )}
                    <p className="text-[10px] text-slate-400 text-center">
                        Os arquivos são salvos na sua conta Google.
                    </p>
                </div>
            )}
        </div>

      </main>

      {/* Action Sheet for Rich Export */}
      {showExportOptions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowExportOptions(false)}>
           <div className="w-full max-w-sm bg-white dark:bg-[#192233] rounded-t-2xl sm:rounded-2xl p-4 animate-[slide-up_0.3s]" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold dark:text-white mb-4 px-2">Escolha o formato</h3>
              <div className="flex flex-col gap-2">
                 <button onClick={executeExportExcel} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-green-900/20 group transition-colors">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                      <span className="material-symbols-outlined">table_view</span>
                    </div>
                    <div className="text-left">
                       <p className="font-bold text-slate-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400">Excel (CSV)</p>
                       <p className="text-xs text-slate-500">Melhor para planilhas</p>
                    </div>
                 </button>
                 <button onClick={executeExportPDF} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 group transition-colors">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                      <span className="material-symbols-outlined">picture_as_pdf</span>
                    </div>
                    <div className="text-left">
                       <p className="font-bold text-slate-900 dark:text-white group-hover:text-red-700 dark:group-hover:text-red-400">PDF (Impressão)</p>
                       <p className="text-xs text-slate-500">Melhor para leitura</p>
                    </div>
                 </button>
              </div>
              <button onClick={() => setShowExportOptions(false)} className="w-full mt-4 py-3 font-bold text-slate-500 dark:text-slate-400">Cancelar</button>
           </div>
        </div>
      )}
    </div>
  );
};
