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
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DollarSign, Package, User, Users } from 'lucide-react';

const SHIFT_PALETTE = ['#34C3E8', '#F0A73F', '#9B7EF0', '#34D399'];
const AREA_PALETTE = ['#34C3E8', '#5B9FD6', '#7FB8E8', '#A3D0F0'];
const REASON_GRADIENT = ['#F2555A', '#F0793F', '#F0A73F', '#F0D43F', '#34C3E8', '#34C3E8', '#34C3E8', '#34C3E8', '#34C3E8', '#34C3E8'];

const RISK_TIERS = [
  { label: 'CRITICAL', text: '#F2555A', bg: 'rgba(242,85,90,0.15)', border: '#F2555A' },
  { label: 'HIGH', text: '#F0A73F', bg: 'rgba(240,167,63,0.15)', border: '#F0A73F' },
  { label: 'MEDIUM', text: '#F0D43F', bg: 'rgba(240,212,63,0.15)', border: '#F0D43F' },
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
  const [status, setStatus] = useState('loading');
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
    () => groupSum(filtered, (r) => r.shift).sort((a, b) => a.name.localeCompare(b.name)),
    [filtered]
  );
  const highestScrapShift = useMemo(
    () => [...byShift].sort((a, b) => b.cost - a.cost)[0]?.name || 'N/A',
    [byShift]
  );

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
    () => groupSum(filtered, (r) => r.reason).sort((a, b) => b.cost - a.cost).slice(0, 10),
    [filtered]
  );

  const weeklyTrend = useMemo(
    () => groupSum(filtered, (r) => r.week).sort((a, b) => sortWeeks(a.name, b.name)),
    [filtered]
  );

  const activeFilterCount = Object.values(filters).filter((v) => v !== 'all').length;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-line pb-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="bg-gradient-to-r from-cyan to-[#7FE0F5] bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
            PE Scrap Control Tower
          </h1>
          <p className="mt-1 text-sm text-mute">
            Real-time scrap monitoring dashboard · Hisense Manufacturing
          </p>
          {status === 'ready' && (
            <p className="mt-1 text-xs text-mute/70">Loaded {filtered.length.toLocaleString('en-US')} records</p>
          )}
        </div>

        {status === 'ready' && (
          <div className="flex flex-wrap gap-2">
            <FilterPill label="Semana" value={filters.week} options={options.week} onChange={(v) => setFilters((f) => ({ ...f, week: v }))} formatOption={(w) => `Week ${w}`} placeholder="All Weeks" />
            <FilterPill label="Turno" value={filters.shift} options={options.shift} onChange={(v) => setFilters((f) => ({ ...f, shift: v }))} formatOption={(s) => `Shift ${s}`} placeholder="All Shifts" />
            <FilterPill label="Área" value={filters.area} options={options.area} onChange={(v) => setFilters((f) => ({ ...f, area: v }))} placeholder="All Areas" />
            <FilterPill label="Depto" value={filters.depto} options={options.depto} onChange={(v) => setFilters((f) => ({ ...f, depto: v }))} placeholder="All Depts" />
            <FilterPill label="Modelo" value={filters.model} options={options.model} onChange={(v) => setFilters((f) => ({ ...f, model: v }))} placeholder="All Models" />
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="rounded-full border border-coral/40 px-3 py-1.5 text-xs font-medium text-coral hover:bg-coral/10"
              >
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
        )}
      </header>

      {status === 'loading' && (
        <p className="font-mono text-sm text-mute">Cargando datos de la hoja…</p>
      )}

      {status === 'error' && (
        <div className="rounded-md border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
          No se pudieron cargar los datos: {errorMsg}
        </div>
      )}

      {status === 'ready' && (
        <>
          {/* KPI cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard icon={<DollarSign size={20} />} iconColor="#34D399" label="TOTAL SCRAP COST" value={money(totalCost)} />
            <KpiCard icon={<Package size={20} />} iconColor="#34C3E8" label="TOTAL SCRAP QTY" value={totalQty.toLocaleString('en-US')} />
            <KpiCard icon={<User size={20} />} iconColor="#9B7EF0" label="HIGHEST SCRAP SHIFT" value={highestScrapShift} />
            <KpiCard icon={<Users size={20} />} iconColor="#5B9FD6" label="TOP RESPONSIBLE DEPT" value={topDepto} />
          </div>

          {/* Fila: costo por turno | top 3 departamentos */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Scrap Cost by Shift">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byShift} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2A35" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8496A8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8496A8' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(v) => money(v)}
                    contentStyle={{ background: '#1A2530', border: '1px solid #26333F', borderRadius: 6, fontSize: 12 }}
                  />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {byShift.map((entry, index) => (
                      <Cell key={entry.name} fill={SHIFT_PALETTE[index % SHIFT_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Top 3 Scrap Departments by Qty">
              <RankTable rows={top3Deptos} nameLabel="Department" valueKey="qty" formatValue={(v) => v.toLocaleString('en-US')} />
            </Panel>
          </div>

          {/* Fila: costo por área | top 3 modelos */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Scrap Cost by Area">
              <div className="flex items-center gap-6">
                <div className="relative h-[180px] w-[180px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byArea} dataKey="cost" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2}>
                        {byArea.map((entry, index) => (
                          <Cell key={entry.name} fill={AREA_PALETTE[index % AREA_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => money(v)}
                        contentStyle={{ background: '#1A2530', border: '1px solid #26333F', borderRadius: 6, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-mute">Total</p>
                  <p className="mb-3 text-xl font-bold text-ink">{money(totalCost)}</p>
                  <ul className="space-y-2">
                    {byArea.map((a, i) => (
                      <li key={a.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: AREA_PALETTE[i % AREA_PALETTE.length] }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-ink">{a.name}</span>
                          <span className="block text-xs text-mute">{money(a.cost)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Panel>

            <Panel title="Top 3 Defective Models by Qty">
              <RankTable rows={top3Models} nameLabel="Model" valueKey="qty" formatValue={(v) => v.toLocaleString('en-US')} />
            </Panel>
          </div>

          {/* Top 10 razones */}
          <Panel title="Top 10 Scrap Reasons" className="mb-6">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={byReason} layout="vertical" margin={{ left: 24, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2A35" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#8496A8' }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#8496A8' }} />
                <Tooltip
                  formatter={(v) => money(v)}
                  contentStyle={{ background: '#1A2530', border: '1px solid #26333F', borderRadius: 6, fontSize: 12 }}
                />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                  {byReason.map((entry, index) => (
                    <Cell key={entry.name} fill={REASON_GRADIENT[index % REASON_GRADIENT.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          {/* Tendencia semanal */}
          <Panel title="Weekly Scrap Cost Trend">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weeklyTrend} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2A35" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8496A8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8496A8' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(v) => money(v)}
                  contentStyle={{ background: '#1A2530', border: '1px solid #26333F', borderRadius: 6, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="cost" stroke="#34C3E8" strokeWidth={2} dot={{ r: 3, fill: '#34C3E8' }} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </>
      )}
    </main>
  );
}

function FilterPill({ value, options, onChange, formatOption, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-cyan"
    >
      <option value="all">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {formatOption ? formatOption(opt) : opt}
        </option>
      ))}
    </select>
  );
}

function KpiCard({ icon, iconColor, label, value }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
      <div className="mb-2 flex items-center gap-2">
        <span style={{ color: iconColor }}>{icon}</span>
        <p className="font-mono text-[10px] uppercase tracking-widest text-mute">{label}</p>
      </div>
      <p className="truncate text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function Panel({ title, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-line bg-panel p-4 shadow-glow ${className}`}>
      <h2 className="mb-4 text-sm font-semibold text-cyan">{title}</h2>
      {children}
    </div>
  );
}

function RankTable({ rows, nameLabel, valueKey, formatValue }) {
  if (rows.length === 0) {
    return <p className="text-sm text-mute">Sin datos para este filtro.</p>;
  }
  const max = Math.max(...rows.map((r) => r[valueKey]), 1);
  return (
    <div>
      <div className="mb-2 grid grid-cols-[80px_1fr_70px] gap-2 text-[11px] font-mono uppercase tracking-wide text-mute">
        <span>Risk</span>
        <span>{nameLabel}</span>
        <span className="text-right">Qty</span>
      </div>
      <div className="space-y-3">
        {rows.map((r, i) => {
          const tier = RISK_TIERS[i] || RISK_TIERS[RISK_TIERS.length - 1];
          const pct = Math.max(6, Math.round((r[valueKey] / max) * 100));
          return (
            <div key={r.name}>
              <div className="grid grid-cols-[80px_1fr_70px] items-center gap-2">
                <span
                  className="w-fit rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ color: tier.text, background: tier.bg, border: `1px solid ${tier.border}` }}
                >
                  {tier.label}
                </span>
                <span className="truncate text-sm font-medium text-ink">{r.name}</span>
                <span className="text-right text-sm font-mono font-semibold text-ink">
                  {formatValue(r[valueKey])}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-panel2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${tier.border}, #34C3E8)` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
