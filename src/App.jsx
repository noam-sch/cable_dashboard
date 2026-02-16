import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Activity, Map, Anchor, Server, Calendar, 
  TrendingUp, Globe, Search,
  Zap, Navigation, AlertCircle, 
  ShieldAlert, Clock, BarChart2, Globe2, Mail
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, 
  Pie, Cell, Area, ComposedChart, Line
} from 'recharts';

import rawData from './submarine_cables_complete.json';

let cableData = [];
if (Array.isArray(rawData)) {
  cableData = rawData;
} else if (rawData && typeof rawData === 'object') {
  cableData = rawData.cables || rawData.data || rawData.features || Object.values(rawData);
}

// --- CONFIG ---

const GEO_COLORS = {
  'USA': '#3b82f6', 'Europe': '#10b981', 'Japan': '#f43f5e',
  'China': '#f59e0b', 'Other': '#94a3b8'
};

const SUPPLIER_MAPPING = {
  'SubCom': 'USA', 'TE SubCom': 'USA', 'Tyco': 'USA', 'Simplex': 'USA',
  'ASN': 'Europe', 'Alcatel': 'Europe', 'Alcatel-Lucent': 'Europe', 'Elettra': 'Europe', 'NSW': 'Europe', 'Nexans': 'Europe',
  'NEC': 'Japan', 'Fujitsu': 'Japan', 'OCC': 'Japan',
  'HMN Tech': 'China', 'Huawei': 'China', 'Huawei Marine': 'China', 'Hengtong': 'China'
};

const HYPERSCALERS = ['Google', 'Meta', 'Facebook', 'Microsoft', 'Amazon', 'AWS', 'SoftBank'];

const COLOR_MAP = {
  '#3b82f6': { bg: '#eff6ff', text: '#3b82f6' },
  '#10b981': { bg: '#ecfdf5', text: '#10b981' },
  '#8b5cf6': { bg: '#f5f3ff', text: '#8b5cf6' },
  '#f59e0b': { bg: '#fffbeb', text: '#f59e0b' },
  '#ef4444': { bg: '#fef2f2', text: '#ef4444' },
  '#6366f1': { bg: '#eef2ff', text: '#6366f1' }
};

// --- UTILS ---

const parseLength = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/km/gi, '').replace(/,/g, '').trim();
  return Number(clean) || 0;
};

const splitList = (str) => {
  if (!str || typeof str !== 'string') return ['Unknown'];
  return str.split(/[,/]+/).map(s => s.trim()).filter(s => s.length > 0 && s !== 'null');
};

const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
};

// --- HOOKS ---

const useWindowWidth = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    let t;
    const h = () => { clearTimeout(t); t = setTimeout(() => setW(window.innerWidth), 120); };
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); clearTimeout(t); };
  }, []);
  return w;
};

// --- CHART WRAPPER ---
// Fixes Recharts "-1 width/height" by measuring parent with ResizeObserver,
// then only rendering ResponsiveContainer once real dimensions are known.
const ChartBox = ({ height, children }) => {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 20) setReady(true);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: '100%', height, minHeight: height }}>
      {ready && (
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
};

// --- COMPONENTS ---

const tooltipStyle = { borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' };

const KPICard = ({ title, value, subtext, icon: Icon, color, style: extraStyle }) => {
  const cs = COLOR_MAP[color] || { bg: '#f1f5f9', text: '#64748b' };
  return (
    <div style={{
      background: '#fff', padding: '20px', borderRadius: '12px',
      border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', ...extraStyle
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', margin: '0 0 4px 0' }}>{title}</p>
          <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</h3>
        </div>
        <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: cs.bg, color: cs.text, flexShrink: 0, marginLeft: '12px' }}>
          <Icon size={18} />
        </div>
      </div>
      {subtext && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', marginBottom: 0 }}>{subtext}</p>}
    </div>
  );
};

const Section = ({ title, icon: Icon, children }) => (
  <div style={{
    background: '#fff', padding: '20px', borderRadius: '12px',
    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9',
    }}>
      {Icon && <Icon size={16} color="#3b82f6" />}
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</h3>
    </div>
    <div style={{ flex: 1, overflow: 'visible' }}>
      {children}
    </div>
  </div>
);

// --- MAIN DASHBOARD ---

const Dashboard = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const winW = useWindowWidth();
  const mob = winW < 768;
  const tab = winW >= 768 && winW < 1024;
  const gap = mob ? 16 : 24;

  // --- ANALYTICS ---
  const stats = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { totalCables: 0, totalLength: 0, activeCount: 0, plannedCount: 0, topCountries: [], topOwners: [], topSuppliers: [], timelineData: [], supplierGeoData: [], hyperscalerData: [], ageData: [], riskCountries: 0, topPlanned: [], lengthData: [] };
    }

    let totalLength = 0, plannedCount = 0, activeCount = 0;
    const countryCounts = {}, ownerCounts = {}, supplierCounts = {}, cablesPerYear = {};
    const supplierGeoCounts = { 'USA': 0, 'Europe': 0, 'Japan': 0, 'China': 0, 'Other': 0 };
    const hyperscalerByEra = {};
    const ageDistribution = { 'Old (>20y)': 0, 'Mid-Life (10-20y)': 0, 'Modern (<10y)': 0 };
    const plannedByCountry = {};
    const lengthDistribution = { 'Short (<1k km)': 0, 'Regional (1k-5k)': 0, 'Long (>5k)': 0 };
    const currentYear = new Date().getFullYear();

    data.forEach(cable => {
      const len = parseLength(cable.length);
      totalLength += len;
      if (len > 0) {
        if (len < 1000) lengthDistribution['Short (<1k km)']++;
        else if (len < 5000) lengthDistribution['Regional (1k-5k)']++;
        else lengthDistribution['Long (>5k)']++;
      }
      const rfs = cable.rfs_year ? parseInt(cable.rfs_year) : null;
      const isFuture = rfs && rfs > currentYear;
      if (cable.is_planned || isFuture) { plannedCount++; }
      else {
        activeCount++;
        if (rfs) { const age = currentYear - rfs; if (age > 20) ageDistribution['Old (>20y)']++; else if (age > 10) ageDistribution['Mid-Life (10-20y)']++; else ageDistribution['Modern (<10y)']++; }
      }
      if (Array.isArray(cable.landing_points)) {
        const uc = new Set();
        cable.landing_points.forEach(pt => { if (pt?.country) uc.add(pt.country); });
        uc.forEach(c => { countryCounts[c] = (countryCounts[c] || 0) + 1; if (cable.is_planned || isFuture) plannedByCountry[c] = (plannedByCountry[c] || 0) + 1; });
      }
      const owners = splitList(cable.owners);
      let hasH = false;
      owners.forEach(o => { if (o !== 'Unknown') ownerCounts[o] = (ownerCounts[o] || 0) + 1; if (HYPERSCALERS.some(h => o.includes(h))) hasH = true; });
      if (rfs && rfs >= 2000 && rfs <= currentYear + 5) {
        const era = `${Math.floor(rfs / 5) * 5}-${Math.floor(rfs / 5) * 5 + 4}`;
        if (!hyperscalerByEra[era]) hyperscalerByEra[era] = { era, tech: 0, other: 0, techLength: 0, otherLength: 0 };
        if (hasH) { hyperscalerByEra[era].tech++; hyperscalerByEra[era].techLength += len; } else { hyperscalerByEra[era].other++; hyperscalerByEra[era].otherLength += len; }
      }
      splitList(cable.suppliers).forEach(s => {
        if (s !== 'Unknown') { supplierCounts[s] = (supplierCounts[s] || 0) + 1; let r = 'Other'; for (const [k, v] of Object.entries(SUPPLIER_MAPPING)) { if (s.includes(k)) r = v; } supplierGeoCounts[r]++; }
      });
      if (rfs && rfs > 1990 && rfs < 2030) { if (!cablesPerYear[rfs]) cablesPerYear[rfs] = { count: 0, length: 0 }; cablesPerYear[rfs].count++; cablesPerYear[rfs].length += len; }
    });

    return {
      totalCables: data.length, totalLength, activeCount, plannedCount,
      topCountries: Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({ name, count })),
      topOwners: Object.entries(ownerCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
      topSuppliers: Object.entries(supplierCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
      timelineData: Object.entries(cablesPerYear).map(([y, d]) => ({ year: parseInt(y), count: d.count, length: d.length })).sort((a, b) => a.year - b.year),
      supplierGeoData: Object.entries(supplierGeoCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      hyperscalerData: Object.values(hyperscalerByEra).sort((a, b) => parseInt(a.era) - parseInt(b.era)),
      ageData: Object.entries(ageDistribution).map(([name, value]) => ({ name, value })),
      riskCountries: Object.entries(countryCounts).filter(([_, c]) => c === 1).length,
      topPlanned: Object.entries(plannedByCountry).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
      lengthData: Object.entries(lengthDistribution).map(([name, value]) => ({ name, value })),
    };
  }, [data]);

  const filteredCables = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const s = searchTerm.toLowerCase();
    return data.filter(c =>
      (c.name?.toLowerCase().includes(s)) ||
      (c.owners?.toLowerCase().includes(s)) ||
      (c.landing_points?.some(p => p.country?.toLowerCase().includes(s)))
    ).slice(0, 100);
  }, [data, searchTerm]);

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <AlertCircle size={56} color="#ef4444" />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginTop: 16 }}>Data Loading Error</h2>
          <p style={{ color: '#64748b' }}>Unable to load submarine cable data.</p>
        </div>
      </div>
    );
  }

  // Grid helper
  const grid = (cols, extraStyle) => ({
    display: 'grid',
    gridTemplateColumns: mob ? '1fr' : cols,
    gap: `${gap}px`,
    ...extraStyle,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", color: '#1e293b', display: 'flex', flexDirection: 'column' }}>

      {/* ═══ HEADER ═══ */}
      <header style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff', position: 'sticky', top: 0, zIndex: 30, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: `0 ${mob ? 12 : 24}px`, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Anchor size={20} color="#60a5fa" />
            <span style={{ fontWeight: 700, fontSize: mob ? 14 : 16, letterSpacing: '-.02em' }}>Submarine Cable Explorer</span>
          </div>
          {!mob && <div style={{ fontSize: 11, color: '#94a3b8', background: '#1e293b', padding: '4px 12px', borderRadius: 20, border: '1px solid #334155' }}>{stats.totalCables} cables loaded</div>}
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: `${mob ? 20 : 32}px ${mob ? 12 : 24}px`, flex: 1, width: '100%', boxSizing: 'border-box' }}>

        {/* ── Network Overview ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Activity size={18} color="#64748b" />
            <h2 style={{ fontSize: mob ? 17 : 20, fontWeight: 700, margin: 0 }}>Network Overview</h2>
          </div>

          {/* KPIs */}
          <div style={grid(mob ? '1fr 1fr' : 'repeat(4,1fr)')}>
            <KPICard title="Total Cable Length" value={`${formatNumber(stats.totalLength)} km`} subtext="Global subsea fiber network" icon={Activity} color="#3b82f6" />
            <KPICard title="Total Systems" value={stats.totalCables} subtext={`${stats.activeCount} Active · ${stats.plannedCount} Planned`} icon={Zap} color="#10b981" />
            <KPICard title="Top Hub" value={stats.topCountries[0]?.name || '-'} subtext={`${stats.topCountries[0]?.count || 0} connections`} icon={Globe} color="#8b5cf6" />
            <KPICard title="Top Supplier" value={stats.topSuppliers[0]?.name || '-'} subtext={`${stats.topSuppliers[0]?.count || 0} systems`} icon={Server} color="#f59e0b" />
          </div>

          {/* Timeline + Countries */}
          <div style={{ ...grid('2fr 1fr'), marginTop: gap }}>
            <Section title="Systems RFS Timeline" icon={Calendar}>
              <ChartBox height={mob ? 240 : 300}>
                <ComposedChart data={stats.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} stroke="#94a3b8" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} stroke="#94a3b8" />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area yAxisId="left" type="monotone" dataKey="count" name="System Count" stroke="#3b82f6" fillOpacity={1} fill="url(#gc)" />
                  <Line yAxisId="right" type="monotone" dataKey="length" name="Total Length (km)" stroke="#ec4899" dot={false} strokeWidth={2} />
                </ComposedChart>
              </ChartBox>
            </Section>

            <Section title="Top 15 Connected Countries" icon={Map}>
              <ChartBox height={mob ? 300 : 340}>
                <BarChart data={stats.topCountries} layout="vertical" margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={mob ? 70 : 100} tick={{ fontSize: 10 }} interval={0} stroke="#94a3b8" />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ChartBox>
            </Section>
          </div>
        </div>

        {/* ── Geopolitics ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingTop: 24, borderTop: '1px solid #e2e8f0' }}>
            <Globe2 size={18} color="#64748b" />
            <h2 style={{ fontSize: mob ? 17 : 20, fontWeight: 700, margin: 0 }}>Geopolitics & Strategic Indicators</h2>
          </div>

          {/* Row 1: Supplier + Hyperscaler — side by side on desktop, stacked on mobile */}
          <div style={grid('1fr 1fr')}>
            <Section title="Technological Sovereignty (Supplier HQ)" icon={ShieldAlert}>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>Systems by supplier nationality</p>
              <ChartBox height={200}>
                <BarChart data={stats.supplierGeoData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {stats.supplierGeoData.map((e, i) => <Cell key={i} fill={GEO_COLORS[e.name] || '#94a3b8'} />)}
                  </Bar>
                </BarChart>
              </ChartBox>
            </Section>

            <Section title="Hyperscaler Shift (Big Tech vs Telco)" icon={TrendingUp}>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>Cable builds by era & length</p>
              <ChartBox height={200}>
                <ComposedChart data={stats.hyperscalerData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="era" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} stroke="#94a3b8" />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Bar yAxisId="left" dataKey="other" name="Trad." stackId="a" fill="#94a3b8" barSize={22} />
                  <Bar yAxisId="left" dataKey="tech" name="Tech" stackId="a" fill="#3b82f6" barSize={22} />
                  <Line yAxisId="right" type="monotone" dataKey="otherLength" name="Trad. km" stroke="#475569" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  <Line yAxisId="right" type="monotone" dataKey="techLength" name="Tech km" stroke="#2563eb" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ChartBox>
            </Section>
          </div>

          {/* Row 2: Age Pie | KPI pair | Planned — NEVER overlap */}
          <div style={{ ...grid(mob ? '1fr' : tab ? '1fr 1fr' : '1fr 1fr 2fr'), marginTop: gap }}>
            <Section title="Infrastructure Age Risk" icon={Clock}>
              <ChartBox height={220}>
                <PieChart>
                  <Pie data={stats.ageData} innerRadius={mob ? 30 : 40} outerRadius={mob ? 55 : 68} paddingAngle={3} dataKey="value" cx="50%" cy="42%">
                    <Cell fill="#ef4444" /><Cell fill="#f59e0b" /><Cell fill="#10b981" />
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ChartBox>
            </Section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <KPICard title="Vulnerable Nations" value={stats.riskCountries} subtext="Countries with only 1 cable" icon={AlertCircle} color="#ef4444" style={{ flex: 1 }} />
              <KPICard title="Strategic Reach" value={stats.lengthData.find(d => d.name.includes('Long'))?.value || 0} subtext="Long-haul (>5k km) systems" icon={BarChart2} color="#6366f1" style={{ flex: 1 }} />
            </div>

            <div style={tab ? { gridColumn: '1 / -1' } : {}}>
              <Section title="Future Battlegrounds: Top Planned" icon={Navigation}>
                <ChartBox height={mob ? 260 : 240}>
                  <BarChart data={stats.topPlanned} layout="vertical" margin={{ left: 5, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={mob ? 70 : 95} tick={{ fontSize: 10 }} interval={0} stroke="#94a3b8" />
                    <RechartsTooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ChartBox>
              </Section>
            </div>
          </div>
        </div>

        {/* ── Cable Database ── */}
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,.05)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', height: mob ? 420 : 600,
        }}>
          <div style={{
            padding: mob ? 12 : 16, borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          }}>
            <h3 style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 14 }}>
              <Navigation size={15} /> Cable Database
            </h3>
            <div style={{ position: 'relative', width: mob ? '100%' : 'auto' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text" placeholder="Search cables, owners, countries..."
                style={{
                  paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                  borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13,
                  width: mob ? '100%' : 240, outline: 'none', background: '#fff', boxSizing: 'border-box',
                }}
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflow: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', fontSize: 13, textAlign: 'left', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f8fafc', fontSize: 10, textTransform: 'uppercase', color: '#64748b', fontWeight: 600, position: 'sticky', top: 0, zIndex: 10 }}>
                  {['Cable Name','RFS','Length','Landing Points','Owners'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCables.map((c, i) => (
                  <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding: '10px 16px', fontWeight: 500, color: '#3b82f6', whiteSpace: 'nowrap' }}>
                      {c.name}
                      {c.is_planned && <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>PLANNED</span>}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{c.rfs_year || 'TBD'}</td>
                    <td style={{ padding: '10px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{c.length ? formatNumber(parseLength(c.length)) : '-'}</td>
                    <td style={{ padding: '10px 16px', color: '#64748b' }}>
                      <span style={{ fontWeight: 600, fontSize: 11, color: '#475569' }}>{c.landing_points?.length || 0}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>
                        {c.landing_points?.slice(0,3).map(p=>p.country).join(', ')}{c.landing_points?.length > 3 && '…'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.owners || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: 8, borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
            Showing {filteredCables.length} of {data.length} records
          </div>
        </div>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '24px 0', fontSize: 12, borderTop: '1px solid #1e293b', marginTop: 24 }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: `0 ${mob ? 12 : 24}px`,
          display: 'flex', flexDirection: mob ? 'column' : 'row',
          alignItems: mob ? 'flex-start' : 'center',
          justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={13} />
            <span>Data: <a href="https://www.submarinecablemap.com/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>TeleGeography</a></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>&copy; {new Date().getFullYear()} Submarine Cable Explorer</span>
            <span style={{ color: '#334155' }}>·</span>
            <span style={{ color: '#64748b' }}>React & Recharts</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
            <span>Built by</span>
            <a href="mailto:noam.schlanger@gmail.com" style={{ color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Noam Schlanger <Mail size={11} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return <Dashboard data={cableData || []} />;
}