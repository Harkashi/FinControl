import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import { UserProfile } from '../../types';

export const DataScreen: React.FC = () => {
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  // SQL Migration State
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    db.getUserProfile().then(setProfile);
  }, []);

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
       navigate('/profile/plan');
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
              
              /* Header */
              .header { margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
              .header h1 { color: #0f172a; margin: 0 0 5px 0; font-size: 24px; }
              .header p { margin: 0; color: #64748b; font-size: 12px; }
              
              /* Cards */
              .summary { display: flex; gap: 15px; margin-bottom: 30px; }
              .card { background: #f8fafc; padding: 15px; border-radius: 8px; flex: 1; border: 1px solid #e2e8f0; }
              .card h3 { margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 0.5px; }
              .card p { margin: 0; font-size: 18px; font-weight: bold; color: #0f172a; }
              
              /* Table */
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

              @media print {
                 .no-print { display: none; }
                 body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1>FinControl</h1>
                <p>Extrato Financeiro Completo</p>
              </div>
              <div style="text-align: right">
                <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
              </div>
            </div>

            <div class="summary">
              <div class="card">
                <h3>Saldo Total</h3>
                <p>R$ ${balance.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              </div>
              <div class="card">
                <h3>Receitas</h3>
                <p style="color: #16a34a">R$ ${balance.income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              </div>
              <div class="card">
                <h3>Despesas</h3>
                <p style="color: #dc2626">R$ ${balance.expense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th width="15%">Data</th>
                  <th width="35%">Descrição</th>
                  <th width="20%">Categoria</th>
                  <th width="15%">Conta / Método</th>
                  <th width="15%" class="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${richData.map(t => `
                  <tr>
                    <td>${t.dateFormatted}</td>
                    <td>
                        <div style="font-weight: 600; color: #0f172a;">${t.title}</div>
                    </td>
                    <td>
                        <div class="badge">${t.categoryName}</div>
                    </td>
                    <td>
                        <div style="color: #334155;">${t.walletName}</div>
                        <div class="meta">${t.methodName}</div>
                    </td>
                    <td class="text-right ${t.type === 'Receita' ? 'income' : 'expense'}">
                      ${t.type === 'Despesa' ? '-' : '+'} R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; color: #94a3b8; font-size: 10px;">
                Fim do relatório • FinControl App
            </div>

            <script>
              window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); }
            </script>
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

  const isPro = profile?.plan === 'pro' || profile?.plan === 'ultra';

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display relative">
       <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
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
                 <p className="text-xs text-slate-400">{isPro ? 'Disponível' : 'Exclusivo PRO'}</p>
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
                 <p className="font-bold dark:text-white text-sm">Fazer Backup</p>
                 <p className="text-xs text-slate-400">Salvar arquivo .JSON</p>
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

        {/* --- DATABASE FIX TOOL --- */}
        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-200 dark:border-yellow-900/30">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-yellow-700 dark:text-yellow-500 flex items-center gap-2">
                    <span className="material-symbols-outlined">construction</span>
                    Reparo do Banco
                </h3>
                <button onClick={() => setShowSql(!showSql)} className="text-xs font-bold uppercase text-yellow-600 dark:text-yellow-400 hover:underline">
                    {showSql ? 'Ocultar' : 'Mostrar Instruções'}
                </button>
            </div>
            <p className="text-xs text-yellow-800 dark:text-yellow-200/80 mb-2">
                Se os orçamentos não estiverem salvando, você precisa adicionar colunas ao banco de dados.
            </p>
            
            {showSql && (
                <div className="mt-2">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                        Copie o código abaixo e execute no <strong>SQL Editor</strong> do seu painel Supabase:
                    </p>
                    <div className="bg-slate-800 p-3 rounded-lg overflow-x-auto">
                        <code className="text-[10px] font-mono text-green-400 block whitespace-pre">
{`ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS budget_limit NUMERIC DEFAULT 0;`}
                        </code>
                    </div>
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