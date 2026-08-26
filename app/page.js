'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const PALETTE = ['#B5502F', '#3A4A5C', '#7A8B99', '#C9884F', '#5C6B79', '#8C4A38', '#A66A4F', '#4E5D6C'];
const RISK_STYLES = [
  { label: 'Alto', className: 'bg-rust text-white' },
  { label: 'Medio', className: 'bg-amber-500 text-white' },
  { label: 'Bajo', className: 'bg-steel text-white' },
];

function money(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function sortWeeks(a, b) {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

// Agrupa filas por una llave y suma dos métricas (costo y cantidad)
function groupSum(rows, keyFn) {
  const map = new Map();
  rows.forEach((r) => {
    const key = keyFn(r) || 'Sin asignar';
    const entry = map.get(key) || { cost: 0, qty: 0, count: 0 };
    entry.cost += r.total_cost_num;
    entry.qty += r.quantity_num;
    entry.count += 1;
    map.set(key, entry);
  });
  return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
}

const EMPTY_FILTERS = { week: 'all', shift: 'all', area: 'all', depto: 'all', model: 'all' };

export default function Home() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    fetch('/api/scrap')
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setRows(json.data || []);
        setStatus('ready');
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus('error');
      });
  }, []);

  const options = useMemo(() => {
    const uniq = (field) =>
      Array.from(new Set(rows.map((r) => r[field]).filter(Boolean))).sort();
    return {
      week: uniq('week').sort(sortWeeks),
      shift: uniq('shift'),
      area: uniq('area'),
      depto: uniq('depto_responsible'),
      model: uniq('model'),
    };
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (filters.week === 'all' || r.week === filters.week) &&
          (filters.shift === 'all' || r.shift === filters.shift) &&
          (filters.area === 'all' || r.area === filters.area) &&
          (filters.depto === 'all' || r.depto_responsible === filters.depto) &&
          (filters.model === 'all' || r.model === filters.model)
      ),
    [rows, filters]
  );

  const totalCost = filtered.reduce((sum, r) => sum + r.total_cost_num, 0);
  const totalQty = filtered.reduce((sum, r) => sum + r.quantity_num, 0);

  const byShift = useMemo(
    () => groupSum(filtered, (r) => r.shift).sort((a, b) => b.cost - a.cost),
    [filtered]
  );
  const highestScrapShift = byShift[0]?.name || 'N/A';

  const byDepto = useMemo(
    () => groupSum(filtered, (r) => r.depto_responsible).sort((a, b) => b.qty - a.qty),
    [filtered]
  );
  const topDepto = byDepto[0]?.name || 'N/A';
  const top3Deptos = byDepto.slice(0, 3);

  const byArea = useMemo(
    () => groupSum(filtered, (r) => r.area).sort((a, b) => b.cost - a.cost),
    [filtered]
  );

  const byModel = useMemo(
    () => groupSum(filtered, (r) => r.model).sort((a, b) => b.qty - a.qty),
    [filtered]
  );
  const top3Models = byModel.slice(0, 3);

  const byReason = useMemo(
    () => groupSum(filtered, (r) => r.reason).sort((a, b) => b.qty - a.qty).slice(0, 10),
    [filtered]
  );

  const weeklyTrend = useMemo(
    () =>
      groupSum(filtered, (r) => r.week)
        .map((d) => ({ ...d, name: d.name }))
        .sort((a, b) => sortWeeks(a.name, b.name)),
    [filtered]
  );

  const activeFilterCount = Object.values(filters).filter((v) => v !== 'all').length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-steel/20 pb-4">
        <p className="text-xs font-mono uppercase tracking-widest text-rust">
          Hisense Manufacturing
        </p>
        <h1 className="text-2xl font-semibold text-graphite sm:text-3xl">
          PE Scrap Control Tower
        </h1>
        <p className="text-sm text-steel">
          Real-time scrap monitoring dashboard
        </p>
      </header>

      {status === 'loading' && (
        <p className="font-mono text-sm text-steel">Cargando datos de la hoja…</p>
      )}

      {status === 'error' && (
        <div className="rounded-md border border-rust/40 bg-rust/5 px-4 py-3 text-sm text-rust">
          No se pudieron cargar los datos: {errorMsg}
        </div>
      )}

      {status === 'ready' && (
        <>
          {/* Filtros estilo segmentadores de Power BI */}
          <div className="mb-6 rounded-lg border border-steel/15 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-xs uppercase tracking-widest text-steel">
                Filtros
              </h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="font-mono text-xs uppercase tracking-wide text-rust hover:underline"
                >
                  Limpiar ({activeFilterCount})
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <FilterSelect
                label="Semana"
                value={filters.week}
                options={options.week}
                onChange={(v) => setFilters((f) => ({ ...f, week: v }))}
                formatOption={(w) => `Semana ${w}`}
              />
              <FilterSelect
                label="Turno"
                value={filters.shift}
                options={options.shift}
                onChange={(v) => setFilters((f) => ({ ...f, shift: v }))}
              />
              <FilterSelect
                label="Área"
                value={filters.area}
                options={options.area}
                onChange={(v) => setFilters((f) => ({ ...f, area: v }))}
              />
              <FilterSelect
                label="Departamento"
                value={filters.depto}
                options={options.depto}
                onChange={(v) => setFilters((f) => ({ ...f, depto: v }))}
              />
              <FilterSelect
                label="Modelo"
                value={filters.model}
                options={options.model}
                onChange={(v) => setFilters((f) => ({ ...f, model: v }))}
              />
            </div>
          </div>

          {/* KPI cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard icon="💲" label="Total Scrap Cost" value={money(totalCost)} accent />
            <KpiCard icon="📦" label="Total Scrap Qty" value={totalQty.toLocaleString('en-US')} />
            <KpiCard icon="👤" label="Highest Scrap Shift" value={highestScrapShift} small />
            <KpiCard icon="👥" label="Top Responsible Dept" value={topDepto} small />
          </div>

          {/* Fila: Costo por turno | Top 3 departamentos */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Scrap Cost by Shift">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byShift} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EA" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {byShift.map((entry, index) => (
                      <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 3 Scrap Departments by Qty">
              <RankTable
                rows={top3Deptos}
                columns={['Risk', 'Department', 'Qty']}
                valueKey="qty"
                formatValue={(v) => v.toLocaleString('en-US')}
              />
            </ChartCard>
          </div>

          {/* Fila: Costo por área | Top 3 modelos */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard
              title="Scrap Cost by Area"
              headerRight={
                <span className="font-mono text-sm font-semibold text-graphite">
                  TOTAL {money(totalCost)}
                </span>
              }
            >
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byArea}
                    dataKey="cost"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {byArea.map((entry, index) => (
                      <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 3 Defective Models by Qty">
              <RankTable
                rows={top3Models}
                columns={['Risk', 'Model', 'Qty']}
                valueKey="qty"
                formatValue={(v) => v.toLocaleString('en-US')}
              />
            </ChartCard>
          </div>

          {/* Top 10 razones */}
          <ChartCard title="Top 10 Scrap Reasons" className="mb-6">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byReason} layout="vertical" margin={{ left: 24, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EA" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => v.toLocaleString('en-US')} />
                <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
                  {byReason.map((entry, index) => (
                    <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Tendencia semanal */}
          <ChartCard title="Weekly Scrap Cost Trend">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weeklyTrend} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EA" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => money(v)} />
                <Line type="monotone" dataKey="cost" stroke="#B5502F" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </main>
  );
}

function FilterSelect({ label, value, options, onChange, formatOption }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-steel">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-steel/30 bg-white px-2 py-1.5 text-sm text-graphite"
      >
        <option value="all">Todos</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {formatOption ? formatOption(opt) : opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function KpiCard({ icon, label, value, accent, small }) {
  return (
    <div className="rounded-lg border border-steel/15 bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden>{icon}</span>
        <p className="font-mono text-[11px] uppercase tracking-widest text-steel">
          {label}
        </p>
      </div>
      <p
        className={`font-semibold ${accent ? 'text-rust' : 'text-graphite'} ${
          small ? 'text-lg' : 'text-2xl'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ChartCard({ title, children, headerRight, className = '' }) {
  return (
    <div className={`rounded-lg border border-steel/15 bg-white p-4 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-steel">{title}</h2>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function RankTable({ rows, columns, valueKey, formatValue }) {
  if (rows.length === 0) {
    return <p className="text-sm text-steel">Sin datos para este filtro.</p>;
  }
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-steel/15">
          {columns.map((c) => (
            <th key={c} className="px-2 py-2 font-mono text-[11px] uppercase tracking-wide text-steel">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const risk = RISK_STYLES[i] || RISK_STYLES[RISK_STYLES.length - 1];
          return (
            <tr key={r.name} className="border-b border-steel/10 last:border-0">
              <td className="px-2 py-2">
                <span className={`rounded px-2 py-0.5 font-mono text-[11px] ${risk.className}`}>
                  {risk.label}
                </span>
              </td>
              <td className="px-2 py-2 text-graphite">{r.name}</td>
              <td className="px-2 py-2 text-right font-mono">{formatValue(r[valueKey])}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
