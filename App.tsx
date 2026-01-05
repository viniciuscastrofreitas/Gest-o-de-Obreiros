
import React, { useState, useEffect, useMemo } from 'react';
import { WORKERS, DAYS_OF_WEEK } from './constants';
import { Report, WorkerName, DayOfWeek, TaskCategory } from './types';
import { loadReports, saveReports, exportData, importData } from './utils/storage';
import Modal from './components/Modal';

const App: React.FC = () => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'stats' | 'backup'>('form');
  const [showToast, setShowToast] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [shareMonth, setShareMonth] = useState(new Date().getMonth());
  const [shareYear, setShareYear] = useState(new Date().getFullYear());

  const [date, setDate] = useState(getTodayStr());
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek | ''>('');
  const [portao, setPortao] = useState<WorkerName | ''>('');
  const [louvor, setLouvor] = useState<WorkerName | ''>('');
  const [palavra, setPalavra] = useState<WorkerName | ''>('');
  const [textoBiblico, setTextoBiblico] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  useEffect(() => {
    setReports(loadReports());
  }, []);

  useEffect(() => {
    saveReports(reports);
  }, [reports]);

  const handleSaveReport = () => {
    const isSegunda = dayOfWeek === 'SEG';
    const isPalavraPreenchida = !!palavra;
    
    if (!date || !dayOfWeek || !portao || !louvor || (!isSegunda && !isPalavraPreenchida)) {
      alert(`⚠️ Por favor, preencha os campos obrigatórios (Data, Dia e Obreiros).`);
      return;
    }

    const newReport: Report = {
      id: crypto.randomUUID(),
      date,
      dayOfWeek: dayOfWeek as DayOfWeek,
      portao: portao as WorkerName,
      louvor: louvor as WorkerName,
      palavra: (palavra || 'NÃO HOUVE') as WorkerName,
      textoBiblico: textoBiblico.trim() || 'Não informado',
      timestamp: Date.now(),
    };

    setReports(prev => [newReport, ...prev]);
    setDate(getTodayStr());
    setDayOfWeek('');
    setPortao('');
    setLouvor('');
    setPalavra('');
    setTextoBiblico('');
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDeleteReport = (id: string) => {
    if (confirm('Deseja apagar este registro do histórico?')) {
      setReports(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleShareWhatsApp = (report: Report) => {
    const formattedDate = new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR');
    const text = `*RELATÓRIO DE CULTO - ${report.dayOfWeek}*\n` +
                 `📅 *Data:* ${formattedDate}\n` +
                 `🚪 *Portão:* ${report.portao}\n` +
                 `🎤 *Louvor:* ${report.louvor}\n` +
                 (report.palavra !== 'NÃO HOUVE' ? `📖 *Palavra:* ${report.palavra}\n` : '') +
                 `📜 *Texto:* ${report.textoBiblico}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareSelectedMonth = () => {
    const filtered = reports.filter(r => {
      const d = new Date(r.date + 'T00:00:00');
      return d.getMonth() === shareMonth && d.getFullYear() === shareYear;
    });

    if (filtered.length === 0) return alert('Nenhum registro encontrado para este mês.');

    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    let text = `*RESUMO DE CULTOS - ${monthNames[shareMonth].toUpperCase()} / ${shareYear}*\n\n`;

    filtered.forEach(r => {
      const dateFmt = new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR');
      text += `📅 *${dateFmt} (${r.dayOfWeek})*\n`;
      text += `🚪 Portão: ${r.portao}\n🎤 Louvor: ${r.louvor}\n`;
      if (r.palavra !== 'NÃO HOUVE') text += `📖 Palavra: ${r.palavra}\n`;
      text += `📜 Texto: ${r.textoBiblico}\n--------------------------\n`;
    });

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleBackup = () => exportData(reports);
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importData(file);
      if (confirm('Restaurar dados de backup? Isso substituirá o histórico local.')) {
        setReports(data);
        alert('Dados restaurados com sucesso!');
      }
    } catch (err) { alert('Erro ao importar arquivo.'); }
    e.target.value = '';
  };

  const filteredReports = useMemo(() => {
    const sorted = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!searchTerm) return sorted;
    const lowerSearch = searchTerm.toLowerCase();
    return sorted.filter(r => 
      r.portao.toLowerCase().includes(lowerSearch) ||
      r.louvor.toLowerCase().includes(lowerSearch) ||
      r.palavra.toLowerCase().includes(lowerSearch) ||
      r.textoBiblico.toLowerCase().includes(lowerSearch) ||
      r.date.includes(lowerSearch) ||
      r.dayOfWeek.toLowerCase().includes(lowerSearch)
    );
  }, [reports, searchTerm]);

  const consultHistory = (worker: WorkerName | '', category: TaskCategory) => {
    if (!worker) return alert('Selecione o obreiro para consultar.');
    const history = reports.filter(r => {
      if (category === 'Portão') return r.portao === worker;
      if (category === 'Louvor') return r.louvor === worker;
      if (category === 'Palavra') return r.palavra === worker;
      return false;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setModalTitle(`${worker}`);
    setModalContent(
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Tarefa: {category}</span>
          <span className="bg-indigo-900 text-yellow-400 px-3 py-1 rounded-lg text-[10px] font-black">{history.length} VEZES</span>
        </div>
        <div className="grid gap-2 max-h-[350px] overflow-y-auto pr-1">
          {history.length > 0 ? history.map(h => (
            <div key={h.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm hover:bg-white transition-colors">
              <span className="font-black text-gray-700">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              <span className="text-[10px] bg-white px-2 py-1 rounded border font-black uppercase text-indigo-500">{h.dayOfWeek}</span>
            </div>
          )) : <p className="text-gray-400 text-center py-6 text-sm font-bold">Nenhum registro encontrado.</p>}
        </div>
      </div>
    );
    setModalOpen(true);
  };

  const workerStats = useMemo(() => {
    const stats: Record<string, { portao: number, louvor: number, palavra: number }> = {};
    WORKERS.forEach(w => { stats[w] = { portao: 0, louvor: 0, palavra: 0 }; });
    reports.forEach(r => {
      if (stats[r.portao]) stats[r.portao].portao++;
      if (stats[r.louvor]) stats[r.louvor].louvor++;
      if (stats[r.palavra] && r.palavra !== 'NÃO HOUVE') stats[r.palavra].palavra++;
    });
    return stats;
  }, [reports]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Toast Feedback */}
      {showToast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] animate-in zoom-in-95 duration-300">
          <div className="bg-green-600 text-white px-10 py-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 border-4 border-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
              <span className="material-icons text-5xl">check_circle</span>
            </div>
            <span className="font-black text-xl uppercase tracking-tighter">Registro Salvo!</span>
          </div>
        </div>
      )}

      {/* Header Clássico */}
      <header className="bg-indigo-900 text-white shadow-xl sticky top-0 z-40">
        <div className="px-6 py-5 flex items-center justify-between border-b border-indigo-800">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-800 rounded-xl flex items-center justify-center shadow-lg border border-indigo-700">
              <span className="material-icons text-2xl text-yellow-400">assignment_ind</span>
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight leading-none">ICM Santo Antônio II</h1>
              <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em] mt-1.5">Gestão de Obreiros</p>
            </div>
          </div>
          <div className="text-[10px] font-black bg-indigo-950 px-4 py-2 rounded-full uppercase border border-indigo-800 shadow-inner">{reports.length} CULTOS</div>
        </div>
        <nav className="flex bg-indigo-950">
          {[
            { id: 'form', icon: 'add_circle', label: 'NOVO' },
            { id: 'history', icon: 'history', label: 'HISTÓRICO' },
            { id: 'stats', icon: 'analytics', label: 'RESUMO' },
            { id: 'backup', icon: 'settings', label: 'SISTEMA' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all border-b-4 relative active:scale-95 ${
                activeTab === tab.id ? 'border-yellow-400 text-yellow-400 bg-indigo-900' : 'border-transparent text-indigo-400 opacity-70'
              }`}
            >
              <span className="material-icons text-xl">{tab.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
              {activeTab === tab.id && <div className="absolute inset-0 bg-yellow-400/5 pointer-events-none"></div>}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-xl mx-auto px-4 mt-8 pb-12">
        {activeTab === 'form' && (
          <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Campo Data - Refinado */}
            <div className="space-y-4">
              <label className="text-[11px] font-black text-indigo-900 uppercase block tracking-[0.2em] ml-1">Data e Dia</label>
              <div className="flex flex-col gap-3">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                />
                <div className="flex gap-3">
                  <button onClick={() => setDate(getTodayStr())} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 ${date === getTodayStr() ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>Hoje</button>
                  <button onClick={() => setDate(getYesterdayStr())} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 ${date === getYesterdayStr() ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>Ontem</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {DAYS_OF_WEEK.map(day => (
                  <button 
                    key={day} 
                    onClick={() => setDayOfWeek(day)} 
                    className={`py-3.5 rounded-xl font-black text-xs border-2 transition-all active:scale-95 ${dayOfWeek === day ? 'bg-indigo-900 text-yellow-400 border-indigo-900 shadow-lg scale-105 z-10' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Obreiros */}
            {(['Portão', 'Louvor', 'Palavra'] as TaskCategory[]).map((cat) => {
              const val = cat === 'Portão' ? portao : cat === 'Louvor' ? louvor : palavra;
              const set = cat === 'Portão' ? setPortao : cat === 'Louvor' ? setLouvor : setPalavra;
              const isPalavraOptional = cat === 'Palavra' && dayOfWeek === 'SEG';

              return (
                <div key={cat} className="space-y-3">
                  <label className="text-[11px] font-black text-indigo-900 uppercase block tracking-[0.2em] ml-1">
                    {cat} {isPalavraOptional && <span className="text-[9px] text-indigo-400 font-bold lowercase italic opacity-70">(opcional na seg)</span>}
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <select 
                        value={val} 
                        onChange={(e) => set(e.target.value as WorkerName)}
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none appearance-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner pr-12"
                      >
                        <option value="">Selecione o Obreiro</option>
                        {WORKERS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                    <button onClick={() => consultHistory(val as any, cat)} className="bg-indigo-50 text-indigo-700 px-5 rounded-2xl border-2 border-indigo-100 active:scale-90 transition-all shadow-sm hover:bg-indigo-100">
                      <span className="material-icons">history</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Texto Bíblico */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-indigo-900 uppercase block tracking-[0.2em] ml-1">Texto Bíblico / Título da Mensagem</label>
              <textarea 
                value={textoBiblico}
                onChange={(e) => setTextoBiblico(e.target.value)}
                placeholder="Ex: Isaías 40:31 - Renovo"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none h-24 shadow-inner resize-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <button onClick={handleSaveReport} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 rounded-2xl font-black uppercase tracking-[0.1em] text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4">
              <span className="material-icons text-3xl">save</span> Salvar Culto
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Busca e Resumo Mensal */}
            <div className="bg-white p-6 rounded-[2rem] shadow-xl space-y-5 border border-slate-100">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Pesquisar por obreiro ou data..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                />
                <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              </div>

              {/* Compartilhamento Mensal */}
              <div className="bg-indigo-900 p-5 rounded-2xl border border-indigo-800 space-y-4 shadow-lg">
                <p className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="material-icons text-sm">ios_share</span> Compartilhar Resumo Mensal
                </p>
                <div className="flex gap-2">
                  <select value={shareMonth} onChange={(e) => setShareMonth(Number(e.target.value))} className="flex-1 bg-indigo-800 border border-indigo-700 text-white rounded-xl p-3 text-xs font-black outline-none focus:border-yellow-400 appearance-none">
                    {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <select value={shareYear} onChange={(e) => setShareYear(Number(e.target.value))} className="flex-1 bg-indigo-800 border border-indigo-700 text-white rounded-xl p-3 text-xs font-black outline-none focus:border-yellow-400 appearance-none">
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <button onClick={handleShareSelectedMonth} className="bg-yellow-400 text-indigo-950 px-6 rounded-xl active:scale-90 transition-all shadow-md flex items-center justify-center">
                    <span className="material-icons">send</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Listagem de Cultos */}
            <div className="space-y-6">
              {filteredReports.length > 0 ? filteredReports.map(report => (
                <div key={report.id} className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all">
                  <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex flex-col">
                      <span className="font-black text-sm text-slate-900">{new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{report.dayOfWeek}</span>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleShareWhatsApp(report)} className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-full active:scale-90 transition-all shadow-sm" title="Compartilhar"><span className="material-icons text-xl">share</span></button>
                      <button onClick={() => handleDeleteReport(report.id)} className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-400 rounded-full active:scale-90 transition-all shadow-sm" title="Excluir"><span className="material-icons text-xl">delete_outline</span></button>
                    </div>
                  </div>
                  <div className="p-6 grid gap-4 text-sm">
                    <div className="bg-sky-50 p-3 rounded-2xl border border-sky-100 flex justify-between items-center px-5">
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-sky-400 text-xl">door_front</span>
                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-tighter">Portão</span>
                      </div>
                      <span className="font-black text-sky-900 uppercase truncate max-w-[150px]">{report.portao}</span>
                    </div>

                    <div className="bg-violet-50 p-3 rounded-2xl border border-violet-100 flex justify-between items-center px-5">
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-violet-400 text-xl">mic</span>
                        <span className="text-[10px] font-black text-violet-400 uppercase tracking-tighter">Louvor</span>
                      </div>
                      <span className="font-black text-violet-900 uppercase truncate max-w-[150px]">{report.louvor}</span>
                    </div>

                    {report.palavra !== 'NÃO HOUVE' && (
                      <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 flex justify-between items-center px-5">
                        <div className="flex items-center gap-3">
                          <span className="material-icons text-amber-500 text-xl">menu_book</span>
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Palavra</span>
                        </div>
                        <span className="font-black text-amber-900 uppercase truncate max-w-[150px]">{report.palavra}</span>
                      </div>
                    )}
                    
                    <div className="mt-2 p-5 bg-slate-50 rounded-2xl text-slate-600 italic leading-relaxed text-xs font-medium border-l-4 border-indigo-400 shadow-inner">
                      "{report.textoBiblico}"
                    </div>
                  </div>
                </div>
              )) : (
                <div className="bg-white p-20 rounded-[2.5rem] text-center text-slate-300 border-4 border-dashed border-slate-100 shadow-inner">
                  <span className="material-icons text-7xl mb-4 opacity-20">inventory_2</span>
                  <p className="font-black text-xs uppercase tracking-[0.3em]">Histórico Vazio</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-[11px] font-black text-slate-400 uppercase px-2 tracking-[0.3em]">Resumo por Obreiro</h2>
            <div className="grid gap-4">
              {WORKERS.filter(w => w !== 'TRANSMISSÃO' && w !== 'VISITANTE').map(worker => {
                const s = workerStats[worker];
                const total = s.portao + s.louvor + s.palavra;
                return (
                  <div key={worker} className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden group hover:border-indigo-200 transition-all">
                    <div className="px-6 py-5 bg-indigo-900 text-white flex justify-between items-center group-hover:bg-indigo-950 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <span className="material-icons text-sm">person</span>
                        </div>
                        <span className="font-black text-sm tracking-tighter uppercase">{worker}</span>
                      </div>
                      <span className="text-[10px] font-black bg-yellow-400 text-indigo-950 px-4 py-1.5 rounded-full uppercase shadow-md">{total} ATOS</span>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-3 bg-white">
                      {[
                        { label: 'Portão', key: 'Portão', count: s.portao, color: 'sky' },
                        { label: 'Louvor', key: 'Louvor', count: s.louvor, color: 'violet' },
                        { label: 'Palavra', key: 'Palavra', count: s.palavra, color: 'amber' }
                      ].map(item => (
                        <button 
                          key={item.label}
                          onClick={() => consultHistory(worker, item.key as any)}
                          className={`flex flex-col items-center p-4 rounded-2xl bg-${item.color}-50 border border-${item.color}-100 hover:border-${item.color}-300 hover:bg-white active:scale-95 transition-all shadow-sm group/btn`}
                        >
                          <span className={`text-[8px] font-black text-${item.color}-500 uppercase mb-2 tracking-tighter`}>{item.label}</span>
                          <span className={`text-2xl font-black text-${item.color}-950 group-hover/btn:scale-110 transition-transform`}>{item.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-10 animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="text-center">
              <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner transform rotate-3">
                <span className="material-icons text-indigo-500 text-6xl">cloud_sync</span>
              </div>
              <h2 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter">Sistema e Backup</h2>
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 opacity-70">Gestão Local de Dados</p>
            </div>
            
            <div className="grid gap-5">
              <button onClick={handleBackup} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-xs flex items-center justify-center gap-4 shadow-xl hover:bg-black active:scale-95 transition-all uppercase tracking-widest">
                <span className="material-icons text-xl">download</span> Exportar Dados (Backup)
              </button>
              
              <label className="w-full bg-indigo-50 text-indigo-800 py-6 rounded-2xl font-black text-xs flex items-center justify-center gap-4 border-2 border-indigo-100 cursor-pointer shadow-md hover:bg-indigo-100 active:scale-95 transition-all uppercase tracking-widest">
                <span className="material-icons text-xl">upload_file</span> Restaurar Dados (Backup)
                <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
              </label>

              <div className="pt-10 border-t border-slate-50 mt-4">
                <p className="text-[9px] text-rose-400 font-black uppercase text-center mb-5 tracking-widest opacity-60">Ação irreversível</p>
                <button onClick={() => confirm('Tem certeza? Isso apagará TODO o seu histórico de cultos permanentemente!') && (setReports([]), alert('Histórico removido.'))} className="w-full text-rose-500 py-5 font-black text-xs bg-rose-50 rounded-2xl border-2 border-rose-100 hover:bg-rose-500 hover:text-white transition-all uppercase tracking-[0.2em] active:scale-95">
                  Limpar Todos os Registros
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-16 text-center text-slate-300 font-black text-[9px] uppercase tracking-[0.5em] pb-12">
        ICM SANTO ANTÔNIO II &bull; GESTÃO DE OBREIROS
      </footer>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>{modalContent}</Modal>
    </div>
  );
};

export default App;
