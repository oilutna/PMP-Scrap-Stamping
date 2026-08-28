'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Activity, BarChart3, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign,
  ClipboardCheck, Clock3, Factory, Layers3, Package, Plus, RefreshCw, ShieldAlert,
  Sparkles, Target, Users, X,
} from 'lucide-react';

const COLORS = ['#34C3E8', '#F0A73F', '#9B7EF0', '#34D399', '#F2555A'];
const EMPTY_FILTERS = { week: 'all', shift: 'all', area: 'all', depto: 'all', model: 'all' };
const EMPTY_ACTION = { scrapDate: '', week: '', department: '', cause: '', problem: '', containment: '', action: '', owner: '', dueDate: '', status: 'Abierta', effectiveness: 'Pendiente de validar', notes: '' };
const STATUS_STYLE = {
  Abierta: 'border-coral/30 bg-coral/10 text-coral',
  'En proceso': 'border-amber/30 bg-amber/10 text-amber',
  Implementada: 'border-cyan/30 bg-cyan/10 text-cyan',
  Cerrada: 'border-teal/30 bg-teal/10 text-teal',
};

function money(value) { return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }); }
function sortWeeks(a, b) { return (parseFloat(a) || 0) - (parseFloat(b) || 0) || String(a).localeCompare(String(b)); }
function groupSum(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row) || 'Sin asignar';
    const item = map.get(key) || { cost: 0, qty: 0, count: 0 };
    item.cost += row.total_cost_num; item.qty += row.quantity_num; item.count += 1; map.set(key, item);
  });
  return [...map.entries()].map(([name, value]) => ({ name, ...value }));
}
function applyFilters(rows, filters) {
  return rows.filter((r) =>
    (filters.week === 'all' || r.week === filters.week) &&
    (filters.shift === 'all' || r.shift === filters.shift) &&
    (filters.area === 'all' || r.area === filters.area) &&
    (filters.depto === 'all' || r.depto_responsible === filters.depto) &&
    (filters.model === 'all' || r.model === filters.model)
  );
}
function getDate(row) { return row.date || row.fecha || row.scrap_date || row.fecha_scrap || row.day || 'Sin fecha'; }
function shortDate(value) {
  if (!value || value === 'Sin fecha') return value || '—';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}
function dateTime(value) { const time = new Date(value).getTime(); return Number.isNaN(time) ? 0 : time; }

export default function Home() {
  const [rows, setRows] = useState([]);
  const [actions, setActions] = useState([]);
  const [status, setStatus] = useState('loading');
  const [actionsStatus, setActionsStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [overviewFilters, setOverviewFilters] = useState(EMPTY_FILTERS);
  const [dailyFilters, setDailyFilters] = useState(EMPTY_FILTERS);
  const [tab, setTab] = useState('overview');
  const [dailyMode, setDailyMode] = useState('date');
  const [dailyDate, setDailyDate] = useState('latest');
  const [meetingMode, setMeetingMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_ACTION);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadScrap = () => {
    setStatus('loading');
    fetch('/api/scrap').then((res) => res.json()).then((json) => {
      if (json.error) throw new Error(json.error);
      setRows(json.data || []); setStatus('ready');
    }).catch((error) => { setErrorMsg(error.message); setStatus('error'); });
  };
  const loadActions = () => {
    setActionsStatus('loading');
    fetch('/api/countermeasures').then((res) => res.json()).then((json) => {
      if (json.error) throw new Error(json.error);
      setActions(json.data || []); setActionsStatus('ready');
    }).catch((error) => { setActionsStatus('error'); setFormError(error.message); });
  };
  useEffect(() => { loadScrap(); }, []);
  useEffect(() => { if (tab === 'daily' && actionsStatus === 'idle') loadActions(); }, [tab, actionsStatus]);

  const options = useMemo(() => {
    const uniq = (field) => [...new Set(rows.map((r) => r[field]).filter(Boolean))].sort();
    return { week: uniq('week').sort(sortWeeks), shift: uniq('shift'), area: uniq('area'), depto: uniq('depto_responsible'), model: uniq('model') };
  }, [rows]);
  const overviewFiltered = useMemo(() => applyFilters(rows, overviewFilters), [rows, overviewFilters]);
  const dailyFiltered = useMemo(() => applyFilters(rows, dailyFilters), [rows, dailyFilters]);
  const availableDates = useMemo(() => [...new Set(dailyFiltered.map(getDate).filter((date) => date && date !== 'Sin fecha'))].sort((a, b) => dateTime(a) - dateTime(b) || String(a).localeCompare(String(b))), [dailyFiltered]);
  const selectedDailyDate = dailyDate === 'latest' || !availableDates.includes(dailyDate) ? availableDates[availableDates.length - 1] || '' : dailyDate;
  const selectedDateIndex = availableDates.indexOf(selectedDailyDate);
  const previousDailyDate = selectedDateIndex > 0 ? availableDates[selectedDateIndex - 1] : '';
  const meetingRows = useMemo(() => selectedDailyDate ? dailyFiltered.filter((r) => getDate(r) === selectedDailyDate) : dailyFiltered, [dailyFiltered, selectedDailyDate]);
  const previousRows = useMemo(() => previousDailyDate ? dailyFiltered.filter((r) => getDate(r) === previousDailyDate) : [], [dailyFiltered, previousDailyDate]);
  const currentFilters = tab === 'overview' ? overviewFilters : dailyFilters;
  const setCurrentFilters = tab === 'overview' ? setOverviewFilters : setDailyFilters;
  const currentFiltered = tab === 'overview' ? overviewFiltered : dailyFiltered;

  const totalCost = overviewFiltered.reduce((sum, r) => sum + r.total_cost_num, 0);
  const totalQty = overviewFiltered.reduce((sum, r) => sum + r.quantity_num, 0);
  const byShift = useMemo(() => groupSum(overviewFiltered, (r) => r.shift).sort((a, b) => a.name.localeCompare(b.name)), [overviewFiltered]);
  const byDept = useMemo(() => groupSum(overviewFiltered, (r) => r.depto_responsible).sort((a, b) => b.qty - a.qty), [overviewFiltered]);
  const byArea = useMemo(() => groupSum(overviewFiltered, (r) => r.area).sort((a, b) => b.cost - a.cost), [overviewFiltered]);
  const byModel = useMemo(() => groupSum(overviewFiltered, (r) => r.model).sort((a, b) => b.qty - a.qty), [overviewFiltered]);
  const byReason = useMemo(() => groupSum(overviewFiltered, (r) => r.reason).sort((a, b) => b.cost - a.cost).slice(0, 10), [overviewFiltered]);
  const weeklyTrend = useMemo(() => groupSum(overviewFiltered, (r) => r.week).sort((a, b) => sortWeeks(a.name, b.name)), [overviewFiltered]);
  const dailyByDept = useMemo(() => groupSum(meetingRows, (r) => r.depto_responsible).sort((a, b) => b.cost - a.cost), [meetingRows]);
  const dailyReasons = useMemo(() => groupSum(meetingRows, (r) => r.reason).sort((a, b) => b.cost - a.cost).slice(0, 10), [meetingRows]);
  const dailyDeptIssues = useMemo(() => dailyByDept.slice(0, 3).map((department) => ({
    ...department,
    issues: groupSum(meetingRows.filter((r) => (r.depto_responsible || 'Sin asignar') === department.name), (r) => r.reason)
      .sort((a, b) => b.cost - a.cost).slice(0, 3).map((issue) => ({ ...issue, recurrenceDays: new Set(dailyFiltered.filter((r) => (r.depto_responsible || 'Sin asignar') === department.name && (r.reason || 'Sin asignar') === issue.name).map(getDate)).size })),
  })), [dailyByDept, meetingRows, dailyFiltered]);
  const dailyPivot = useMemo(() => groupSum(dailyFiltered, (r) => dailyMode === 'date' ? getDate(r) : r.depto_responsible).sort((a, b) => dailyMode === 'date' ? String(a.name).localeCompare(String(b.name)) : b.cost - a.cost), [dailyFiltered, dailyMode]);
  const dailyActions = useMemo(() => dailyFilters.week === 'all' ? actions : actions.filter((item) => item.week === dailyFilters.week), [actions, dailyFilters.week]);
  const openActions = dailyActions.filter((item) => item.status !== 'Cerrada').length;
  const closedActions = dailyActions.filter((item) => item.status === 'Cerrada').length;
  const actionCoverage = dailyByDept.length ? Math.round((new Set(dailyActions.map((a) => a.department)).size / dailyByDept.length) * 100) : 0;
  const activeFilterCount = Object.values(currentFilters).filter((v) => v !== 'all').length;
  const meetingCost = meetingRows.reduce((sum, row) => sum + row.total_cost_num, 0);
  const meetingQty = meetingRows.reduce((sum, row) => sum + row.quantity_num, 0);
  const previousCost = previousRows.reduce((sum, row) => sum + row.total_cost_num, 0);
  const costDelta = previousCost ? ((meetingCost - previousCost) / previousCost) * 100 : 0;
  const overdueActions = dailyActions.filter((item) => item.status !== 'Cerrada' && item.dueDate && dateTime(item.dueDate) < Date.now()).length;

  async function saveAction(event) {
    event.preventDefault(); setSaving(true); setFormError('');
    try {
      const response = await fetch('/api/countermeasures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error);
      setActions((current) => [json.data, ...current]); setForm(EMPTY_ACTION); setShowForm(false);
    } catch (error) { setFormError(error.message); } finally { setSaving(false); }
  }
  async function changeStatus(item, nextStatus) {
    setActions((current) => current.map((action) => action.id === item.id ? { ...action, status: nextStatus } : action));
    const response = await fetch('/api/countermeasures', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, status: nextStatus }) });
    if (!response.ok) { loadActions(); }
  }
  function openActionForm(prefill = {}) {
    setForm({ ...EMPTY_ACTION, scrapDate: selectedDailyDate, week: dailyFilters.week === 'all' ? '' : dailyFilters.week, ...prefill });
    setShowForm(true);
  }
  function closeActionForm() { setShowForm(false); setFormError(''); }
  async function saveActionRow(item) {
    const response = await fetch('/api/countermeasures', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'No se pudo guardar la fila.');
    setActions((current) => current.map((action) => action.id === item.id ? json.data : action));
    return json.data;
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
      <header className="animate-enter mb-5 rounded-2xl border border-line/80 glass-panel px-4 py-4 shadow-glow sm:px-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan/25 bg-cyan/10 text-cyan shadow-cyan"><Activity size={23} /></div>
            <div><div className="flex items-center gap-2"><h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">PE Scrap <span className="text-cyan">Control Tower</span></h1><span className="pulse-dot h-2 w-2 rounded-full bg-teal" /></div><p className="mt-0.5 text-xs text-mute">Manufacturing intelligence · Datos en vivo</p></div>
          </div>
          <nav className="flex w-fit rounded-xl border border-line bg-void/55 p-1">
            <NavButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={<BarChart3 size={15} />} label="Vista ejecutiva" />
            <NavButton active={tab === 'daily'} onClick={() => setTab('daily')} icon={<ClipboardCheck size={15} />} label="Análisis diario" badge={openActions || undefined} />
          </nav>
        </div>
      </header>

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <div className="rounded-xl border border-coral/35 bg-coral/10 p-4 text-sm text-coral">No se pudieron cargar los datos: {errorMsg}</div>}
      {status === 'ready' && <>
        <div className="animate-enter mb-5 flex flex-col justify-between gap-3 rounded-xl border border-line/70 bg-panel/65 p-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-xs text-mute"><Layers3 size={15} className="text-cyan" /><span>{currentFiltered.length.toLocaleString('en-US')} registros visibles en esta pestaña</span>{activeFilterCount > 0 && <button onClick={() => setCurrentFilters(EMPTY_FILTERS)} className="ml-2 text-coral hover:text-white">Limpiar {activeFilterCount}</button>}</div>
          <div className="flex flex-wrap gap-2">
            <Filter value={currentFilters.week} options={options.week} onChange={(v) => setCurrentFilters((f) => ({ ...f, week: v }))} placeholder="Todas las semanas" format={(v) => `Semana ${v}`} />
            <Filter value={currentFilters.shift} options={options.shift} onChange={(v) => setCurrentFilters((f) => ({ ...f, shift: v }))} placeholder="Todos los turnos" format={(v) => `Turno ${v}`} />
            <Filter value={currentFilters.area} options={options.area} onChange={(v) => setCurrentFilters((f) => ({ ...f, area: v }))} placeholder="Todas las áreas" />
            <Filter value={currentFilters.depto} options={options.depto} onChange={(v) => setCurrentFilters((f) => ({ ...f, depto: v }))} placeholder="Todos los deptos" />
            <Filter value={currentFilters.model} options={options.model} onChange={(v) => setCurrentFilters((f) => ({ ...f, model: v }))} placeholder="Todos los modelos" />
          </div>
        </div>
        {tab === 'overview' ? <Overview totalCost={totalCost} totalQty={totalQty} byShift={byShift} byDept={byDept} byArea={byArea} byModel={byModel} byReason={byReason} weeklyTrend={weeklyTrend} /> :
          <DailyAnalysis dailyMode={dailyMode} setDailyMode={setDailyMode} dailyPivot={dailyPivot} byDept={dailyByDept} dailyReasons={dailyReasons} dailyDeptIssues={dailyDeptIssues} actions={dailyActions} actionsStatus={actionsStatus} openActions={openActions} closedActions={closedActions} overdueActions={overdueActions} actionCoverage={actionCoverage} showForm={showForm} openActionForm={openActionForm} closeActionForm={closeActionForm} form={form} setForm={setForm} formError={formError} saving={saving} saveAction={saveAction} saveActionRow={saveActionRow} changeStatus={changeStatus} weeks={options.week} availableDates={availableDates} selectedDailyDate={selectedDailyDate} setDailyDate={setDailyDate} previousDailyDate={previousDailyDate} meetingCost={meetingCost} meetingQty={meetingQty} costDelta={costDelta} meetingMode={meetingMode} setMeetingMode={setMeetingMode} />}
      </>}
    </main>
  );
}

function Overview({ totalCost, totalQty, byShift, byDept, byArea, byModel, byReason, weeklyTrend }) {
  return <section className="animate-rise">
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi icon={<CircleDollarSign />} color="text-teal" label="Costo total scrap" value={money(totalCost)} />
      <Kpi icon={<Package />} color="text-cyan" label="Cantidad total" value={totalQty.toLocaleString('en-US')} />
      <Kpi icon={<Factory />} color="text-violet" label="Turno de mayor costo" value={[...byShift].sort((a, b) => b.cost - a.cost)[0]?.name || 'N/A'} />
      <Kpi icon={<ShieldAlert />} color="text-amber" label="Departamento crítico" value={byDept[0]?.name || 'N/A'} />
    </div>
    <div className="mb-5 grid gap-4 lg:grid-cols-2">
      <Panel title="Costo de scrap por turno" subtitle="Comparación operacional"><Chart type="bar" data={byShift} dataKey="cost" /></Panel>
      <Panel title="Departamentos con mayor impacto" subtitle="Top por cantidad"><Rank rows={byDept.slice(0, 5)} /></Panel>
    </div>
    <div className="mb-5 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
      <Panel title="Distribución por área" subtitle="Participación en costo"><Donut data={byArea} total={totalCost} /></Panel>
      <Panel title="Modelos con mayor scrap" subtitle="Cantidad acumulada"><Chart type="bar" data={byModel.slice(0, 8)} dataKey="qty" /></Panel>
    </div>
    <Panel title="Principales razones de scrap" subtitle="Top 10 por costo" className="mb-5"><Chart type="horizontal" data={byReason} dataKey="cost" height={350} /></Panel>
    <Panel title="Tendencia semanal" subtitle="Evolución de costo"><Chart type="line" data={weeklyTrend} dataKey="cost" /></Panel>
  </section>;
}

function DailyAnalysis(props) {
  const { dailyMode, setDailyMode, dailyPivot, byDept, dailyReasons, dailyDeptIssues, actions, actionsStatus, openActions, closedActions, overdueActions, actionCoverage, showForm, openActionForm, closeActionForm, form, setForm, formError, saving, saveAction, saveActionRow, changeStatus, weeks, availableDates, selectedDailyDate, setDailyDate, previousDailyDate, meetingCost, meetingQty, costDelta, meetingMode, setMeetingMode } = props;
  const issuesWithoutAction = dailyDeptIssues.reduce((total, department) => total + department.issues.filter((issue) => !actions.some((item) => item.department === department.name && item.cause === issue.name)).length, 0);
  const meetingWeekCost = dailyPivot.reduce((total, item) => total + item.cost, 0);
  const meetingWeekQty = dailyPivot.reduce((total, item) => total + item.qty, 0);
  return <section className="animate-rise">
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div><h2 className="text-xl font-bold text-ink">Análisis diario y contramedidas</h2><p className="mt-1 text-sm text-mute">Pivotea el impacto, asigna responsables y conserva el historial departamental.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => { if (!meetingMode) setDailyMode('date'); setMeetingMode((value) => !value); }} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${meetingMode ? 'border-amber/40 bg-amber/15 text-amber' : 'border-line bg-panel2 text-ink hover:border-cyan/40'}`}><Users size={17} /> {meetingMode ? 'Salir modo junta' : 'Modo junta'}</button><button onClick={() => openActionForm()} className="flex items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-sm font-bold text-void shadow-cyan hover:bg-[#6bd8ef]"><Plus size={17} /> Nueva contramedida</button></div>
    </div>
    <div className="mb-5 rounded-2xl border border-cyan/25 bg-gradient-to-r from-cyan/[.08] to-violet/[.06] p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-cyan">Revisión del día anterior</p><h3 className="mt-1 text-lg font-bold text-ink">{selectedDailyDate ? shortDate(selectedDailyDate) : 'Sin fecha disponible'}</h3><p className="mt-1 text-xs text-mute">Comparativo contra {previousDailyDate ? shortDate(previousDailyDate) : 'el día previo disponible'}</p></div><select value={selectedDailyDate || ''} onChange={(event) => setDailyDate(event.target.value)} className="rounded-xl border border-line bg-void/70 px-4 py-2.5 text-sm text-ink outline-none focus:border-cyan">{availableDates.length ? availableDates.slice().reverse().map((date, index) => <option key={date} value={date}>{index === 0 ? 'Último con datos · ' : ''}{shortDate(date)}</option>) : <option value="">Sin fechas</option>}</select></div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7"><MeetingMetric label="Costo de la semana" value={money(meetingWeekCost)} tone="teal" /><MeetingMetric label="Piezas de la semana" value={meetingWeekQty.toLocaleString()} tone="violet" /><MeetingMetric label="Costo del día" value={money(meetingCost)} tone="cyan" /><MeetingMetric label="Piezas del día" value={meetingQty.toLocaleString()} tone="violet" /><MeetingMetric label="Vs. día anterior" value={previousDailyDate ? `${costDelta > 0 ? '+' : ''}${costDelta.toFixed(1)}%` : 'N/A'} tone={costDelta > 0 ? 'coral' : 'teal'} /><MeetingMetric label="Acciones vencidas" value={overdueActions} tone={overdueActions ? 'coral' : 'teal'} /><MeetingMetric label="Issues sin acción" value={issuesWithoutAction} tone={issuesWithoutAction ? 'amber' : 'teal'} /></div>
    </div>
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi icon={<Clock3 />} color="text-coral" label="Acciones abiertas" value={openActions} />
      <Kpi icon={<CheckCircle2 />} color="text-teal" label="Acciones cerradas" value={closedActions} />
      <Kpi icon={<Target />} color="text-amber" label="Cobertura departamental" value={`${actionCoverage}%`} />
      <Kpi icon={<Users />} color="text-violet" label="Deptos con scrap" value={byDept.length} />
    </div>
    {meetingMode && <Panel title="Tendencia diaria de la semana" subtitle="Costo de scrap por cada día disponible con los filtros seleccionados" className="mb-5">
      <Chart type="line" data={dailyPivot} dataKey="cost" formatName={shortDate} />
    </Panel>}
    {!meetingMode && <><div className="mb-5 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <Panel title="Pivote de impacto" subtitle={dailyMode === 'date' ? 'Costo y cantidad por día' : 'Costo y cantidad por departamento'} action={<div className="flex rounded-lg border border-line bg-void/50 p-1"><MiniTab active={dailyMode === 'date'} onClick={() => setDailyMode('date')}>Por día</MiniTab><MiniTab active={dailyMode === 'department'} onClick={() => setDailyMode('department')}>Por depto</MiniTab></div>}>
        <Chart type="bar" data={dailyPivot.slice(-14)} dataKey="cost" formatName={dailyMode === 'date' ? shortDate : undefined} />
      </Panel>
      <Panel title="Matriz departamental" subtitle="Prioridad para plan de acción"><DepartmentMatrix rows={byDept} actions={actions} /></Panel>
    </div>
    <Panel title="Top 10 causas del análisis diario" subtitle="Causas ordenadas por impacto económico con los filtros exclusivos de esta pestaña" className="mb-5">
      <Chart type="horizontal" data={dailyReasons} dataKey="cost" height={350} />
    </Panel></>}
    <Panel title="Top 3 departamentos y sus issues críticos" subtitle="Los 3 departamentos de mayor costo; dentro de cada uno, sus 3 issues principales" className="mb-5">
      <DepartmentIssueBoard departments={dailyDeptIssues} actions={actions} changeStatus={changeStatus} openActionForm={openActionForm} />
    </Panel>
    <Panel title="Registro de contramedidas" subtitle="Historial compartido en Google Sheets" action={<span className="flex items-center gap-1.5 text-xs text-mute"><RefreshCw size={12} className={actionsStatus === 'loading' ? 'animate-spin' : ''} />{actions.length} registros</span>}>
      {actionsStatus === 'error' && <p className="rounded-lg border border-amber/30 bg-amber/10 p-3 text-sm text-amber">{formError || 'No se pudo cargar el registro de contramedidas.'}</p>}
      {actionsStatus === 'loading' ? <p className="py-8 text-center text-sm text-mute">Cargando historial…</p> : <EditableActionTable actions={actions} saveActionRow={saveActionRow} />}
    </Panel>
    {showForm && <ActionForm form={form} setForm={setForm} departments={byDept.map((d) => d.name)} causes={[...new Set([...dailyReasons.map((r) => r.name), ...dailyDeptIssues.flatMap((d) => d.issues.map((issue) => issue.name))])]} weeks={weeks} onClose={closeActionForm} onSubmit={saveAction} error={formError} saving={saving} />}
  </section>;
}

function NavButton({ active, onClick, icon, label, badge }) { return <button onClick={onClick} className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${active ? 'bg-panel2 text-ink shadow-glow' : 'text-mute hover:text-ink'}`}>{icon}{label}{badge ? <span className="rounded-full bg-coral/15 px-1.5 text-[10px] text-coral">{badge}</span> : null}{active && <span className="tab-indicator absolute -bottom-1 left-3 right-3 h-0.5 rounded-full bg-cyan" />}</button>; }
function MiniTab({ active, onClick, children }) { return <button onClick={onClick} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${active ? 'bg-cyan/15 text-cyan' : 'text-mute'}`}>{children}</button>; }
function Filter({ value, options, onChange, placeholder, format }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-line bg-void/65 px-3 py-2 text-xs text-ink outline-none hover:border-cyan/40 focus:border-cyan"><option value="all">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{format ? format(option) : option}</option>)}</select>; }
function LoadingState() { return <div className="grid min-h-[55vh] place-items-center"><div className="text-center"><Sparkles className="mx-auto mb-3 animate-pulse text-cyan" /><p className="font-mono text-sm text-mute">Sincronizando control tower…</p></div></div>; }
function Kpi({ icon, color, label, value }) { return <div className="panel-hover shimmer rounded-xl border border-line glass-panel p-4 shadow-glow"><div className={`mb-3 w-fit ${color}`}>{icon}</div><p className="mb-1 font-mono text-[10px] uppercase tracking-[.16em] text-mute">{label}</p><p className="truncate text-xl font-bold text-ink sm:text-2xl">{value}</p></div>; }
function MeetingMetric({ label, value, tone }) { const tones = { cyan: 'text-cyan', violet: 'text-violet', coral: 'text-coral', teal: 'text-teal', amber: 'text-amber' }; return <div className="rounded-xl border border-line/70 bg-void/45 p-3"><p className="font-mono text-[9px] uppercase tracking-wider text-mute">{label}</p><p className={`mt-1 text-lg font-bold ${tones[tone] || 'text-ink'}`}>{value}</p></div>; }
function Panel({ title, subtitle, action, children, className = '' }) { return <div className={`panel-hover rounded-2xl border border-line glass-panel p-4 shadow-glow sm:p-5 ${className}`}><div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-ink">{title}</h3>{subtitle && <p className="mt-1 text-xs text-mute">{subtitle}</p>}</div>{action}</div>{children}</div>; }

function Chart({ type, data, dataKey, height = 280, formatName }) {
  const common = { background: '#17222E', border: '1px solid #243241', borderRadius: 10, fontSize: 12 };
  if (!data.length) return <p className="py-16 text-center text-sm text-mute">Sin datos para estos filtros.</p>;
  if (type === 'line') return <ResponsiveContainer width="100%" height={height}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#1F2A35" vertical={false} /><XAxis dataKey="name" tickFormatter={formatName} tick={{ fontSize: 11, fill: '#8295A7' }} /><YAxis tick={{ fontSize: 11, fill: '#8295A7' }} tickFormatter={(v) => `$${v}`} /><Tooltip labelFormatter={formatName} formatter={(v) => money(v)} contentStyle={common} /><Line type="monotone" dataKey={dataKey} stroke="#34C3E8" strokeWidth={3} dot={{ r: 4, fill: '#34C3E8' }} activeDot={{ r: 7 }} animationDuration={900} /></LineChart></ResponsiveContainer>;
  const horizontal = type === 'horizontal';
  return <ResponsiveContainer width="100%" height={height}><BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={horizontal ? { left: 30, right: 30 } : { left: 0, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#1F2A35" vertical={!horizontal} horizontal={horizontal} />{horizontal ? <><XAxis type="number" tick={{ fontSize: 11, fill: '#8295A7' }} /><YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 10, fill: '#8295A7' }} /></> : <><XAxis dataKey="name" tickFormatter={formatName} tick={{ fontSize: 10, fill: '#8295A7' }} /><YAxis tick={{ fontSize: 11, fill: '#8295A7' }} tickFormatter={(v) => dataKey === 'cost' ? `$${v}` : v} /></>}<Tooltip formatter={(v) => dataKey === 'cost' ? money(v) : Number(v).toLocaleString()} contentStyle={common} /><Bar dataKey={dataKey} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} animationDuration={800}>{data.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>;
}
function Donut({ data, total }) { return <div className="flex items-center gap-5"><div className="relative h-52 w-52 shrink-0"><ResponsiveContainer><PieChart><Pie data={data} dataKey="cost" innerRadius={62} outerRadius={88} paddingAngle={3} animationDuration={900}>{data.map((item, i) => <Cell key={item.name} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#17222E', border: '1px solid #243241', borderRadius: 10 }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-[10px] uppercase text-mute">Total</p><p className="text-sm font-bold text-ink">{money(total)}</p></div></div></div><div className="min-w-0 space-y-3">{data.map((item, i) => <div key={item.name} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><div><p className="font-semibold text-ink">{item.name}</p><p className="text-mute">{money(item.cost)}</p></div></div>)}</div></div>; }
function Rank({ rows }) { const max = Math.max(...rows.map((r) => r.qty), 1); return <div className="space-y-4">{rows.map((row, i) => <div key={row.name}><div className="mb-1.5 flex items-center gap-3 text-sm"><span className="grid h-6 w-6 place-items-center rounded-md bg-panel2 font-mono text-[10px] text-mute">0{i + 1}</span><span className="min-w-0 flex-1 truncate font-medium text-ink">{row.name}</span><span className="font-mono font-bold text-ink">{row.qty.toLocaleString()}</span></div><div className="ml-9 h-1.5 overflow-hidden rounded-full bg-void"><div className="h-full rounded-full bg-gradient-to-r from-cyan to-violet transition-all duration-700" style={{ width: `${Math.max(5, row.qty / max * 100)}%` }} /></div></div>)}</div>; }
function DepartmentMatrix({ rows, actions }) { return <div className="max-h-[280px] space-y-2 overflow-auto pr-1">{rows.slice(0, 8).map((row, i) => { const count = actions.filter((a) => a.department === row.name && a.status !== 'Cerrada').length; return <div key={row.name} className="flex items-center gap-3 rounded-lg border border-line/70 bg-void/35 p-3"><span className={`h-2 w-2 rounded-full ${i < 2 ? 'bg-coral' : i < 5 ? 'bg-amber' : 'bg-teal'}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{row.name}</p><p className="text-[11px] text-mute">{row.qty.toLocaleString()} pzas · {money(row.cost)}</p></div><span className="rounded-full border border-line px-2 py-1 text-[10px] text-mute">{count} abiertas</span></div>; })}</div>; }
function DepartmentIssueBoard({ departments, actions, changeStatus, openActionForm }) {
  if (!departments.length) return <p className="py-10 text-center text-sm text-mute">Sin información para la semana seleccionada.</p>;
  return <div className="grid gap-4 xl:grid-cols-3">{departments.map((department, departmentIndex) => <div key={department.name} className="rounded-xl border border-line bg-void/35 p-4"><div className="mb-4 flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan/10 font-mono text-xs font-bold text-cyan">0{departmentIndex + 1}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{department.name}</p><p className="mt-1 text-[11px] text-mute">{money(department.cost)} · {department.qty.toLocaleString()} pzas</p></div></div><div className="space-y-3">{department.issues.map((issue, issueIndex) => { const linked = actions.filter((item) => item.department === department.name && item.cause === issue.name); const overdue = linked.some((item) => item.dueDate && dateTime(item.dueDate) < Date.now() && !['Cerrada', 'Implementada'].includes(item.status)); const complete = linked.length > 0 && linked.every((item) => ['Cerrada', 'Implementada'].includes(item.status)); const signal = !linked.length || overdue ? 'border-coral/30 bg-coral/10 text-coral' : complete ? 'border-teal/30 bg-teal/10 text-teal' : 'border-amber/30 bg-amber/10 text-amber'; return <div key={issue.name} className="rounded-lg border border-line/80 bg-panel/65 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-mono uppercase text-coral">Issue 0{issueIndex + 1}</p><p className="mt-1 line-clamp-2 text-xs font-semibold text-ink">{issue.name}</p><p className="mt-1 text-[10px] text-mute">{money(issue.cost)} · {issue.qty.toLocaleString()} pzas · {issue.recurrenceDays || 1} día(s) recurrente</p></div><span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${signal}`}>{!linked.length ? 'Sin acción' : overdue ? 'Vencida' : complete ? 'Controlado' : 'En seguimiento'}</span></div>{linked.map((item) => <div key={item.id} className="mt-2 rounded-md border border-line/60 bg-void/45 p-2"><div className="flex items-center justify-between gap-2"><p className="truncate text-[10px] text-mute">{item.owner || 'Sin responsable'}</p><select value={item.status} onChange={(e) => changeStatus(item, e.target.value)} className={`rounded-full border px-2 py-1 text-[9px] font-semibold outline-none ${STATUS_STYLE[item.status] || STATUS_STYLE.Abierta}`}><option>Abierta</option><option>En proceso</option><option>Implementada</option><option>Cerrada</option></select></div><p className="mt-1 text-[9px] uppercase text-mute">Contención</p><p className="line-clamp-2 text-[10px] text-ink">{item.containment || 'Sin contención registrada'}</p><p className="mt-1 text-[9px] uppercase text-mute">Contramedida</p><p className="line-clamp-2 text-[10px] text-ink">{item.action}</p><p className="mt-1 text-[9px] text-cyan">Efectividad: {item.effectiveness || 'Pendiente de validar'}</p></div>)}<button onClick={() => openActionForm({ department: department.name, cause: issue.name, problem: issue.name })} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan/25 bg-cyan/5 px-2 py-2 text-[10px] font-bold text-cyan hover:bg-cyan/10"><Plus size={12} /> Agregar contención y contramedida</button></div>; })}</div></div>)}</div>;
}

function EditableActionTable({ actions, saveActionRow }) {
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { setDrafts(Object.fromEntries(actions.map((item) => [item.id, { ...item }]))); }, [actions]);
  if (!actions.length) return <div className="py-10 text-center"><ClipboardCheck className="mx-auto mb-2 text-mute" /><p className="text-sm text-mute">No hay contramedidas para la semana seleccionada.</p></div>;
  const setField = (id, field, value) => setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  const save = async (id) => { setSavingId(id); setMessage(''); try { await saveActionRow(drafts[id]); setMessage(`Guardado ${id}`); } catch (error) { setMessage(error.message); } finally { setSavingId(''); } };
  return <div>{message && <p className="mb-3 text-xs text-cyan">{message}</p>}<div className="overflow-x-auto"><table className="w-full min-w-[1850px] text-left text-[11px]"><thead className="border-b border-line font-mono uppercase tracking-wide text-mute"><tr><th className="pb-3">ID</th><th className="pb-3">Semana</th><th className="pb-3">Departamento</th><th className="pb-3">Issue / causa</th><th className="pb-3">Problema</th><th className="pb-3">Contención inmediata</th><th className="pb-3">Contramedida</th><th className="pb-3">Responsable</th><th className="pb-3">Compromiso</th><th className="pb-3">Estatus</th><th className="pb-3">Efectividad</th><th className="pb-3">Notas</th><th className="pb-3"></th></tr></thead><tbody className="divide-y divide-line/60">{actions.map((item) => { const draft = drafts[item.id] || item; return <tr key={item.id} className="align-top hover:bg-white/[.018]"><td className="py-3 pr-2 font-mono text-cyan">{item.id}</td><td className="py-3 pr-2"><TableInput value={draft.week} onChange={(v) => setField(item.id, 'week', v)} width="w-16" /></td><td className="py-3 pr-2"><TableInput value={draft.department} onChange={(v) => setField(item.id, 'department', v)} width="w-32" /></td><td className="py-3 pr-2"><TableInput value={draft.cause} onChange={(v) => setField(item.id, 'cause', v)} width="w-44" /></td><td className="py-3 pr-2"><TableInput value={draft.problem} onChange={(v) => setField(item.id, 'problem', v)} width="w-48" /></td><td className="py-3 pr-2"><TableInput value={draft.containment} onChange={(v) => setField(item.id, 'containment', v)} width="w-52" /></td><td className="py-3 pr-2"><TableInput value={draft.action} onChange={(v) => setField(item.id, 'action', v)} width="w-56" /></td><td className="py-3 pr-2"><TableInput value={draft.owner} onChange={(v) => setField(item.id, 'owner', v)} width="w-32" /></td><td className="py-3 pr-2"><input type="date" value={draft.dueDate || ''} onChange={(e) => setField(item.id, 'dueDate', e.target.value)} className="w-32 rounded-md border border-line bg-void/60 px-2 py-1.5 text-ink outline-none focus:border-cyan" /></td><td className="py-3 pr-2"><select value={draft.status} onChange={(e) => setField(item.id, 'status', e.target.value)} className={`rounded-full border px-2 py-1.5 text-[10px] font-semibold outline-none ${STATUS_STYLE[draft.status] || STATUS_STYLE.Abierta}`}><option>Abierta</option><option>En proceso</option><option>Implementada</option><option>Cerrada</option></select></td><td className="py-3 pr-2"><select value={draft.effectiveness || 'Pendiente de validar'} onChange={(e) => setField(item.id, 'effectiveness', e.target.value)} className="w-40 rounded-md border border-line bg-void/60 px-2 py-1.5 text-ink outline-none focus:border-cyan"><option>Pendiente de validar</option><option>Efectiva</option><option>Parcialmente efectiva</option><option>No efectiva</option></select></td><td className="py-3 pr-2"><TableInput value={draft.notes} onChange={(v) => setField(item.id, 'notes', v)} width="w-40" /></td><td className="py-3"><button onClick={() => save(item.id)} disabled={savingId === item.id} className="rounded-lg bg-cyan px-3 py-1.5 font-bold text-void disabled:opacity-50">{savingId === item.id ? 'Guardando…' : 'Guardar'}</button></td></tr>; })}</tbody></table></div></div>;
}
function TableInput({ value, onChange, width }) { return <input value={value || ''} onChange={(e) => onChange(e.target.value)} className={`${width} rounded-md border border-line bg-void/60 px-2 py-1.5 text-ink outline-none focus:border-cyan`} />; }
function TopCauseCards({ causes, actions, changeStatus }) {
  if (!causes.length) return <p className="py-8 text-center text-sm text-mute">Sin causas para los filtros seleccionados.</p>;
  return <div className="grid gap-3 lg:grid-cols-3">{causes.map((cause, index) => { const linked = actions.filter((item) => item.cause === cause.name); return <div key={cause.name} className="rounded-xl border border-line bg-void/35 p-4"><div className="mb-3 flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-coral/10 font-mono text-xs font-bold text-coral">0{index + 1}</span><div className="min-w-0"><p className="line-clamp-2 text-sm font-bold text-ink">{cause.name}</p><p className="mt-1 text-[11px] text-mute">{money(cause.cost)} · {cause.qty.toLocaleString()} pzas</p></div></div>{linked.length ? <div className="space-y-2">{linked.map((item) => <div key={item.id} className="rounded-lg border border-line/70 bg-panel/60 p-3"><p className="text-[10px] font-mono uppercase text-mute">Issue</p><p className="mt-1 line-clamp-2 text-xs font-semibold text-ink">{item.problem}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="truncate text-[11px] text-mute">Responsable: <b className="text-ink">{item.owner}</b></span><select value={item.status} onChange={(e) => changeStatus(item, e.target.value)} className={`rounded-full border px-2 py-1 text-[10px] font-semibold outline-none ${STATUS_STYLE[item.status] || STATUS_STYLE.Abierta}`}><option>Abierta</option><option>En proceso</option><option>Implementada</option><option>Cerrada</option></select></div></div>)}</div> : <p className="rounded-lg border border-dashed border-amber/30 bg-amber/5 p-3 text-xs text-amber">Sin contramedida vinculada a esta causa.</p>}</div>; })}</div>;
}
function ActionTable({ actions, changeStatus }) { if (!actions.length) return <div className="py-10 text-center"><ClipboardCheck className="mx-auto mb-2 text-mute" /><p className="text-sm text-mute">Aún no hay contramedidas registradas.</p></div>; return <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><thead className="border-b border-line font-mono uppercase tracking-wide text-mute"><tr><th className="pb-3">ID / fecha</th><th className="pb-3">Departamento</th><th className="pb-3">Causa</th><th className="pb-3">Problema y contramedida</th><th className="pb-3">Responsable</th><th className="pb-3">Compromiso</th><th className="pb-3">Estatus</th></tr></thead><tbody className="divide-y divide-line/60">{actions.map((item) => <tr key={item.id} className="group hover:bg-white/[.018]"><td className="py-3 pr-4"><p className="font-mono text-cyan">{item.id}</p><p className="mt-1 text-mute">{shortDate(item.scrapDate || item.createdAt)}</p></td><td className="py-3 pr-4 font-semibold text-ink">{item.department}</td><td className="max-w-[170px] py-3 pr-4 text-mute"><span className="line-clamp-2">{item.cause || 'Sin vincular'}</span></td><td className="max-w-md py-3 pr-5"><p className="font-medium text-ink">{item.problem}</p><p className="mt-1 line-clamp-2 text-mute">{item.action}</p></td><td className="py-3 pr-4 text-ink">{item.owner}</td><td className="py-3 pr-4 text-mute">{shortDate(item.dueDate)}</td><td className="py-3"><select value={item.status} onChange={(e) => changeStatus(item, e.target.value)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold outline-none ${STATUS_STYLE[item.status] || STATUS_STYLE.Abierta}`}><option>Abierta</option><option>En proceso</option><option>Implementada</option><option>Cerrada</option></select></td></tr>)}</tbody></table></div>; }

function ActionForm({ form, setForm, departments, causes, weeks, onClose, onSubmit, error, saving }) {
  const field = (name) => ({ value: form[name], onChange: (e) => setForm((current) => ({ ...current, [name]: e.target.value })) });
  return <div className="fixed inset-0 z-50 grid place-items-center bg-void/80 p-4 backdrop-blur-sm">
    <form onSubmit={onSubmit} className="animate-rise max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl border border-line glass-panel p-5 shadow-2xl sm:p-6">
      <div className="mb-5 flex items-start justify-between"><div><h3 className="text-lg font-bold text-ink">Nueva contramedida</h3><p className="mt-1 text-xs text-mute">Se guardará en Registro_Contramedidas y quedará vinculada a la semana e issue.</p></div><button type="button" onClick={onClose} className="rounded-lg border border-line p-2 text-mute hover:text-ink"><X size={17} /></button></div>
      {error && <p className="mb-4 rounded-lg border border-coral/30 bg-coral/10 p-3 text-xs text-coral">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Semana *"><select required {...field('week')}><option value="">Seleccionar…</option>{weeks.map((week) => <option key={week} value={week}>Semana {week}</option>)}</select></FormField>
        <FormField label="Fecha del scrap"><input type="date" {...field('scrapDate')} /></FormField>
        <FormField label="Departamento *"><select required {...field('department')}><option value="">Seleccionar…</option>{departments.map((d) => <option key={d}>{d}</option>)}</select></FormField>
        <FormField label="Causa / issue *"><select required {...field('cause')}><option value="">Seleccionar…</option>{causes.map((cause) => <option key={cause}>{cause}</option>)}</select></FormField>
        <FormField label="Descripción del issue *" full><textarea required rows="2" {...field('problem')} /></FormField>
        <FormField label="Contención inmediata *" full><textarea required rows="2" placeholder="Qué se hará hoy para proteger al proceso o cliente…" {...field('containment')} /></FormField>
        <FormField label="Contramedida *" full><textarea required rows="3" placeholder="Acción concreta a ejecutar…" {...field('action')} /></FormField>
        <FormField label="Responsable *"><input required placeholder="Nombre o equipo" {...field('owner')} /></FormField>
        <FormField label="Fecha compromiso"><input type="date" {...field('dueDate')} /></FormField>
        <FormField label="Estatus"><select {...field('status')}><option>Abierta</option><option>En proceso</option><option>Implementada</option><option>Cerrada</option></select></FormField>
        <FormField label="Efectividad"><select {...field('effectiveness')}><option>Pendiente de validar</option><option>Efectiva</option><option>Parcialmente efectiva</option><option>No efectiva</option></select></FormField>
        <FormField label="Notas"><input placeholder="Evidencia, folio, comentario…" {...field('notes')} /></FormField>
      </div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2.5 text-sm text-mute hover:text-ink">Cancelar</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-sm font-bold text-void disabled:opacity-50">{saving ? <RefreshCw size={16} className="animate-spin" /> : <ChevronRight size={16} />}{saving ? 'Guardando…' : 'Registrar acción'}</button></div>
    </form>
  </div>;
}
function FormField({ label, full, children }) { return <label className={`block ${full ? 'sm:col-span-2' : ''}`}><span className="mb-1.5 block text-xs font-semibold text-mute">{label}</span><div className="[&>*]:w-full [&>*]:rounded-lg [&>*]:border [&>*]:border-line [&>*]:bg-void/65 [&>*]:px-3 [&>*]:py-2.5 [&>*]:text-sm [&>*]:text-ink [&>*]:outline-none focus-within:[&>*]:border-cyan">{children}</div></label>; }

