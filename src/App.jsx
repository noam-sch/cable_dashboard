import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Activity, Map, Anchor, Server, Calendar,
  TrendingUp, Globe, Search, Zap, Navigation,
  AlertCircle, ShieldAlert, Clock, BarChart2, Globe2,
  Mail, Link2, Users, Shield
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
  Area, AreaChart, ComposedChart, Line
} from 'recharts';

import rawData from './submarine_cables_complete.json';

let cableData = [];
if (Array.isArray(rawData)) cableData = rawData;
else if (rawData && typeof rawData === 'object') cableData = rawData.cables || rawData.data || rawData.features || Object.values(rawData);

/* ═══════════════════════════════════════════
   GLOBAL CSS RESET — force full-width layout
   This overrides any framework/template CSS
   that might be constraining the app width
   ═══════════════════════════════════════════ */
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root, #app, main, [data-reactroot] {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow-x: hidden;
  }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; }
  @media (max-width: 640px) {
    html { font-size: 14px; }
  }
`;

// ── Config ──

const GEO_COLORS = { USA: '#3b82f6', Europe: '#10b981', Japan: '#f43f5e', China: '#f59e0b', Other: '#94a3b8' };
const SUPPLIER_MAPPING = {
  SubCom: 'USA', 'TE SubCom': 'USA', Tyco: 'USA', Simplex: 'USA',
  ASN: 'Europe', Alcatel: 'Europe', 'Alcatel-Lucent': 'Europe', Elettra: 'Europe', NSW: 'Europe', Nexans: 'Europe', Prysmian: 'Europe',
  NEC: 'Japan', Fujitsu: 'Japan', OCC: 'Japan',
  'HMN Tech': 'China', Huawei: 'China', 'Huawei Marine': 'China', Hengtong: 'China'
};
const HYPERSCALERS = ['Google', 'Meta', 'Facebook', 'Microsoft', 'Amazon', 'AWS'];
const COLOR_MAP = {
  '#3b82f6': { bg: '#eff6ff', t: '#3b82f6' }, '#10b981': { bg: '#ecfdf5', t: '#10b981' },
  '#8b5cf6': { bg: '#f5f3ff', t: '#8b5cf6' }, '#f59e0b': { bg: '#fffbeb', t: '#f59e0b' },
  '#ef4444': { bg: '#fef2f2', t: '#ef4444' }, '#6366f1': { bg: '#eef2ff', t: '#6366f1' },
};
const REGION_MAP = {
  'United States': 'N. America', Canada: 'N. America', Mexico: 'N. America',
  Brazil: 'S. America', Argentina: 'S. America', Colombia: 'S. America', Chile: 'S. America', Peru: 'S. America',
  'United Kingdom': 'Europe', France: 'Europe', Germany: 'Europe', Italy: 'Europe', Spain: 'Europe', Denmark: 'Europe', Sweden: 'Europe', Norway: 'Europe', Ireland: 'Europe', Netherlands: 'Europe', Portugal: 'Europe', Greece: 'Europe', Finland: 'Europe', Poland: 'Europe', Belgium: 'Europe',
  Japan: 'E. Asia', China: 'E. Asia', 'South Korea': 'E. Asia', Taiwan: 'E. Asia', 'Hong Kong': 'E. Asia',
  India: 'S. Asia', Pakistan: 'S. Asia', Bangladesh: 'S. Asia', 'Sri Lanka': 'S. Asia',
  Singapore: 'SE Asia', Indonesia: 'SE Asia', Malaysia: 'SE Asia', Philippines: 'SE Asia', Thailand: 'SE Asia', Vietnam: 'SE Asia',
  Australia: 'Oceania', 'New Zealand': 'Oceania', Fiji: 'Oceania',
  'Saudi Arabia': 'Middle East', 'United Arab Emirates': 'Middle East', Oman: 'Middle East', Egypt: 'Middle East', Qatar: 'Middle East', Israel: 'Middle East',
  'South Africa': 'Africa', Kenya: 'Africa', Nigeria: 'Africa', Ghana: 'Africa', Djibouti: 'Africa',
};
const RC = { 'N. America': '#3b82f6', 'S. America': '#8b5cf6', Europe: '#10b981', 'E. Asia': '#f43f5e', 'S. Asia': '#f59e0b', 'SE Asia': '#14b8a6', Oceania: '#6366f1', 'Middle East': '#ec4899', Africa: '#f97316' };

// ── Utils ──
const parseLen = v => { if (v == null) return 0; if (typeof v === 'number') return v; return Number(String(v).replace(/km/gi, '').replace(/,/g, '').trim()) || 0; };
const splitList = s => (!s || typeof s !== 'string') ? ['Unknown'] : s.split(/[,/]+/).map(x => x.trim()).filter(x => x.length && x !== 'null');
const fmt = n => { if (!n) return '0'; if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'; return n.toLocaleString(); };

// ── Hooks ──
const useW = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1400);
  useEffect(() => { let t; const h = () => { clearTimeout(t); t = setTimeout(() => setW(window.innerWidth), 80); }; window.addEventListener('resize', h); return () => { window.removeEventListener('resize', h); clearTimeout(t); }; }, []);
  return w;
};

// ── ChartBox ──
const ChartBox = ({ h, children }) => {
  const ref = useRef(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(e => { if (e[0]?.contentRect.width > 20) setOk(true); });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return <div ref={ref} style={{ width: '100%', height: h, minHeight: h }}>{ok && <ResponsiveContainer width="100%" height={h}>{children}</ResponsiveContainer>}</div>;
};

// ── Atoms ──
const ttp = { borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.08)', fontSize: 12 };

const KPI = ({ title, value, sub, icon: I, color }) => {
  const c = COLOR_MAP[color] || { bg: '#f1f5f9', t: '#64748b' };
  return (
    <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#64748b', margin: '0 0 2px' }}>{title}</p>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</h3>
        </div>
        <div style={{ padding: 6, borderRadius: 7, backgroundColor: c.bg, color: c.t, flexShrink: 0, marginLeft: 8 }}><I size={16} /></div>
      </div>
      {sub && <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, marginBottom: 0 }}>{sub}</p>}
    </div>
  );
};

const Card = ({ title, icon: I, children, sub }) => (
  <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: sub ? 1 : 8, paddingBottom: sub ? 0 : 8, borderBottom: sub ? 'none' : '1px solid #f1f5f9' }}>
      {I && <I size={14} color="#3b82f6" />}
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</h3>
    </div>
    {sub && <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 6px' }}>{sub}</p>}
    <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
  </div>
);

// ── Dashboard ──
const Dashboard = ({ data }) => {
  const [search, setSearch] = useState('');
  const w = useW();
  const mob = w < 640;
  const sm = w < 900;
  const md = w < 1200;

  // Inject global CSS on mount
  useEffect(() => {
    const id = '__uts_global';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = GLOBAL_CSS;
      document.head.appendChild(style);
    }
  }, []);

  const g = mob ? 10 : sm ? 12 : 16;
  const px = mob ? 12 : sm ? 20 : md ? 32 : 48; // side padding scales with screen

  const grid = (desktop, tablet, mobile) => ({
    display: 'grid',
    gridTemplateColumns: mob ? (mobile || '1fr') : sm ? (tablet || desktop) : desktop,
    gap: g,
  });

  // ── Analytics ──
  const stats = useMemo(() => {
    if (!data?.length) return null;
    let totalLen = 0, planned = 0, active = 0;
    const cc = {}, oc = {}, sc = {}, yc = {};
    const sgc = { USA: 0, Europe: 0, Japan: 0, China: 0, Other: 0 };
    const hbe = {}, age = { 'Old (>20y)': 0, 'Mid (10-20y)': 0, 'Modern (<10y)': 0 };
    const pbc = {}, ld = { '<1k km': 0, '1k-5k km': 0, '>5k km': 0 };
    const now = new Date().getFullYear();
    const rp = {}, sbe = {};
    const ot = { 'Solo-owned': 0, 'Small (2-3)': 0, 'Consortium (4-5)': 0, 'Mega (6+)': 0 };
    const cv = {};

    data.forEach(c => {
      const len = parseLen(c.length); totalLen += len;
      if (len > 0) { if (len < 1000) ld['<1k km']++; else if (len < 5000) ld['1k-5k km']++; else ld['>5k km']++; }
      const rfs = c.rfs_year ? parseInt(c.rfs_year) : null;
      const fut = rfs && rfs > now;
      if (c.is_planned || fut) planned++; else { active++; if (rfs) { const a = now - rfs; if (a > 20) age['Old (>20y)']++; else if (a > 10) age['Mid (10-20y)']++; else age['Modern (<10y)']++; } }

      const cSet = new Set();
      if (Array.isArray(c.landing_points)) {
        c.landing_points.forEach(p => { if (p?.country) cSet.add(p.country); });
        cSet.forEach(x => { cc[x] = (cc[x] || 0) + 1; if (c.is_planned || fut) pbc[x] = (pbc[x] || 0) + 1; cv[x] = (cv[x] || 0) + 1; });
        const regs = new Set(); cSet.forEach(x => { const r = REGION_MAP[x]; if (r) regs.add(r); });
        const ra = [...regs].sort();
        for (let i = 0; i < ra.length; i++) for (let j = i + 1; j < ra.length; j++) { const k = `${ra[i]} ↔ ${ra[j]}`; rp[k] = (rp[k] || 0) + 1; }
      }

      const owners = splitList(c.owners); let hasH = false;
      owners.forEach(o => { if (o !== 'Unknown') oc[o] = (oc[o] || 0) + 1; if (HYPERSCALERS.some(h => o.includes(h))) hasH = true; });
      const on = owners.filter(o => o !== 'Unknown').length;
      if (on <= 1) ot['Solo-owned']++; else if (on <= 3) ot['Small (2-3)']++; else if (on <= 5) ot['Consortium (4-5)']++; else ot['Mega (6+)']++;

      if (rfs && rfs >= 2000 && rfs <= now + 5) {
        const era = `${Math.floor(rfs / 5) * 5}-${Math.floor(rfs / 5) * 5 + 4}`;
        if (!hbe[era]) hbe[era] = { era, tech: 0, other: 0, techLength: 0, otherLength: 0 };
        if (hasH) { hbe[era].tech++; hbe[era].techLength += len; } else { hbe[era].other++; hbe[era].otherLength += len; }
      }

      const sups = splitList(c.suppliers);
      sups.forEach(s => { if (s !== 'Unknown') { sc[s] = (sc[s] || 0) + 1; let r = 'Other'; for (const [k, v] of Object.entries(SUPPLIER_MAPPING)) { if (s.includes(k)) r = v; } sgc[r]++; } });
      if (rfs && rfs >= 1995 && rfs <= 2029) {
        const era = `${Math.floor(rfs / 5) * 5}s`;
        if (!sbe[era]) sbe[era] = { era, ASN: 0, SubCom: 0, NEC: 0, 'HMN Tech': 0, Other: 0 };
        let m = false;
        sups.forEach(s => {
          if (s.includes('ASN') || s.includes('Alcatel')) { sbe[era].ASN++; m = true; }
          else if (s.includes('SubCom') || s.includes('Tyco') || s.includes('TE Sub')) { sbe[era].SubCom++; m = true; }
          else if (s.includes('NEC')) { sbe[era].NEC++; m = true; }
          else if (s.includes('HMN') || s.includes('Huawei') || s.includes('Hengtong')) { sbe[era]['HMN Tech']++; m = true; }
        });
        if (!m && sups.some(s => s !== 'Unknown')) sbe[era].Other++;
      }
      if (rfs && rfs > 1990 && rfs < 2030) { if (!yc[rfs]) yc[rfs] = { count: 0, length: 0 }; yc[rfs].count++; yc[rfs].length += len; }
    });

    const vb = { '1 cable': 0, '2 cables': 0, '3-5': 0, '6-10': 0, '10+': 0 };
    Object.values(cv).forEach(n => { if (n === 1) vb['1 cable']++; else if (n === 2) vb['2 cables']++; else if (n <= 5) vb['3-5']++; else if (n <= 10) vb['6-10']++; else vb['10+']++; });

    return {
      totalCables: data.length, totalLen, active, planned,
      topCountries: Object.entries(cc).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([n, c]) => ({ name: n, count: c })),
      topSuppliers: Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, c]) => ({ name: n, count: c })),
      timeline: Object.entries(yc).map(([y, d]) => ({ year: +y, count: d.count, length: d.length })).sort((a, b) => a.year - b.year),
      supplierGeo: Object.entries(sgc).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value),
      hyperscaler: Object.values(hbe).sort((a, b) => +a.era.split('-')[0] - +b.era.split('-')[0]),
      ageData: Object.entries(age).map(([n, v]) => ({ name: n, value: v })),
      risk: Object.entries(cc).filter(([_, c]) => c === 1).length,
      topPlanned: Object.entries(pbc).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, c]) => ({ name: n, count: c })),
      lengthData: Object.entries(ld).map(([n, v]) => ({ name: n, value: v })),
      corridors: Object.entries(rp).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, c]) => ({ name: n, count: c })),
      supplierEra: Object.values(sbe).sort((a, b) => a.era.localeCompare(b.era)),
      ownership: Object.entries(ot).map(([n, v]) => ({ name: n, value: v })),
      vulnerability: Object.entries(vb).map(([n, v]) => ({ name: n, value: v })),
    };
  }, [data]);

  const filtered = useMemo(() => {
    if (!data?.length) return [];
    const s = search.toLowerCase();
    return data.filter(c => c.name?.toLowerCase().includes(s) || c.owners?.toLowerCase().includes(s) || c.landing_points?.some(p => p.country?.toLowerCase().includes(s))).slice(0, 100);
  }, [data, search]);

  if (!stats) return <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={48} color="#ef4444" /><p style={{ marginLeft: 12, fontSize: 16 }}>No cable data found</p></div>;

  const PA = ['#ef4444', '#f59e0b', '#10b981'];
  const PO = ['#3b82f6', '#6366f1', '#ec4899', '#f59e0b'];
  const PV = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6'];
  const ch = b => mob ? Math.round(b * .75) : sm ? Math.round(b * .85) : b;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f8fafc', color: '#1e293b', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <header style={{ width: '100%', background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff', position: 'sticky', top: 0, zIndex: 30, boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
        <div style={{ width: '100%', padding: `0 ${px}px`, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Anchor size={17} color="#60a5fa" />
            <span style={{ fontWeight: 700, fontSize: mob ? 13 : 15, letterSpacing: '-.03em' }}>under_the_sea</span>
          </div>
          {!mob && <div style={{ fontSize: 10, color: '#94a3b8', background: 'rgba(255,255,255,.06)', padding: '3px 10px', borderRadius: 16, border: '1px solid rgba(255,255,255,.08)' }}>{stats.totalCables} cables</div>}
        </div>
      </header>

      {/* MAIN — full width, padding only */}
      <main style={{ width: '100%', padding: `${mob ? 14 : 24}px ${px}px`, flex: 1 }}>

        {/* NETWORK OVERVIEW */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: mob ? 14 : 16, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={15} color="#64748b" />Network Overview</h2>
          <div style={grid('repeat(4,1fr)', 'repeat(4,1fr)', '1fr 1fr')}>
            <KPI title="Total Cable Length" value={`${fmt(stats.totalLen)} km`} sub="Global subsea fiber" icon={Activity} color="#3b82f6" />
            <KPI title="Total Systems" value={stats.totalCables} sub={`${stats.active} Active · ${stats.planned} Planned`} icon={Zap} color="#10b981" />
            <KPI title="Top Hub" value={stats.topCountries[0]?.name || '-'} sub={`${stats.topCountries[0]?.count || 0} connections`} icon={Globe} color="#8b5cf6" />
            <KPI title="Top Supplier" value={stats.topSuppliers[0]?.name || '-'} sub={`${stats.topSuppliers[0]?.count || 0} systems`} icon={Server} color="#f59e0b" />
          </div>
          <div style={{ ...grid('1fr 1fr', '1fr 1fr', '1fr'), marginTop: g }}>
            <Card title="Systems RFS Timeline" icon={Calendar}>
              <ChartBox h={ch(300)}>
                <ComposedChart data={stats.timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={.7} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis yAxisId="l" tick={{ fontSize: 10 }} allowDecimals={false} stroke="#94a3b8" />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1e3).toFixed(0)}k`} stroke="#94a3b8" />
                  <RTooltip contentStyle={ttp} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area yAxisId="l" type="monotone" dataKey="count" name="Systems" stroke="#3b82f6" fillOpacity={1} fill="url(#gc)" />
                  <Line yAxisId="r" type="monotone" dataKey="length" name="Length (km)" stroke="#ec4899" dot={false} strokeWidth={2} />
                </ComposedChart>
              </ChartBox>
            </Card>
            <Card title="Top 15 Connected Countries" icon={Map}>
              <ChartBox h={ch(340)}>
                <BarChart data={stats.topCountries} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={mob ? 55 : 85} tick={{ fontSize: 10 }} interval={0} stroke="#94a3b8" />
                  <RTooltip contentStyle={ttp} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={13} />
                </BarChart>
              </ChartBox>
            </Card>
          </div>
        </section>

        {/* GEOPOLITICS */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: mob ? 14 : 16, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}><Globe2 size={15} color="#64748b" />Geopolitics & Strategy</h2>
          <div style={grid('1fr 1fr', '1fr 1fr', '1fr')}>
            <Card title="Supplier HQ Sovereignty" icon={ShieldAlert} sub="Systems by supplier nationality">
              <ChartBox h={ch(200)}>
                <BarChart data={stats.supplierGeo} layout="vertical" margin={{ left: 5, right: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={48} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <RTooltip contentStyle={ttp} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                    {stats.supplierGeo.map((e, i) => <Cell key={i} fill={GEO_COLORS[e.name] || '#94a3b8'} />)}
                  </Bar>
                </BarChart>
              </ChartBox>
            </Card>
            <Card title="Hyperscaler Shift" icon={TrendingUp} sub="Big Tech vs Traditional — count & total km by era">
              <ChartBox h={ch(200)}>
                <ComposedChart data={stats.hyperscaler} margin={{ top: 5, right: 5, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="era" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis yAxisId="l" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1e3).toFixed(0)}k`} stroke="#94a3b8" />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <RTooltip contentStyle={ttp} />
                  <Bar yAxisId="l" dataKey="other" name="Trad. Count" stackId="a" fill="#94a3b8" barSize={20} />
                  <Bar yAxisId="l" dataKey="tech" name="Tech Count" stackId="a" fill="#3b82f6" barSize={20} />
                  <Line yAxisId="r" type="monotone" dataKey="otherLength" name="Trad. km" stroke="#475569" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  <Line yAxisId="r" type="monotone" dataKey="techLength" name="Tech km" stroke="#2563eb" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ChartBox>
            </Card>
          </div>
          <div style={{ ...grid('1fr 1fr 2fr', '1fr 1fr', '1fr'), marginTop: g }}>
            <Card title="Infrastructure Age" icon={Clock}>
              <ChartBox h={ch(210)}>
                <PieChart><Pie data={stats.ageData} innerRadius={mob ? 25 : 34} outerRadius={mob ? 50 : 62} paddingAngle={3} dataKey="value" cx="50%" cy="42%">{stats.ageData.map((_, i) => <Cell key={i} fill={PA[i]} />)}</Pie><RTooltip contentStyle={ttp} /><Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 10 }} /></PieChart>
              </ChartBox>
            </Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: g }}>
              <KPI title="Vulnerable Nations" value={stats.risk} sub="Countries with only 1 cable" icon={AlertCircle} color="#ef4444" />
              <KPI title="Strategic Reach" value={stats.lengthData.find(d => d.name.includes('>5k'))?.value || 0} sub="Long-haul (>5k km) systems" icon={BarChart2} color="#6366f1" />
            </div>
            <div style={sm && !mob ? { gridColumn: '1 / -1' } : {}}>
              <Card title="Top Planned Projects by Country" icon={Navigation}>
                <ChartBox h={ch(230)}>
                  <BarChart data={stats.topPlanned} layout="vertical" margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={mob ? 55 : 80} tick={{ fontSize: 10 }} interval={0} stroke="#94a3b8" />
                    <RTooltip contentStyle={ttp} />
                    <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={11} />
                  </BarChart>
                </ChartBox>
              </Card>
            </div>
          </div>
        </section>

        {/* DEEP DIVE */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: mob ? 14 : 16, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}><Shield size={15} color="#64748b" />Deep Dive: Power, Risk & Control</h2>
          <div style={grid('1fr 1fr', '1fr 1fr', '1fr')}>
            <Card title="Cross-Continental Corridors" icon={Link2} sub="Region-to-region cable routes — who's wired to whom">
              <ChartBox h={ch(300)}>
                <BarChart data={stats.corridors} layout="vertical" margin={{ left: 5, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={mob ? 75 : sm ? 100 : 125} tick={{ fontSize: mob ? 8 : 10 }} interval={0} stroke="#94a3b8" />
                  <RTooltip contentStyle={ttp} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                    {stats.corridors.map((e, i) => <Cell key={i} fill={RC[e.name.split(' ↔ ')[0]] || '#94a3b8'} />)}
                  </Bar>
                </BarChart>
              </ChartBox>
            </Card>
            <Card title="Supplier Arms Race" icon={TrendingUp} sub="Market dominance shifts — who builds the internet?">
              <ChartBox h={ch(300)}>
                <AreaChart data={stats.supplierEra} margin={{ top: 5, right: 5, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="era" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <RTooltip contentStyle={ttp} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="ASN" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={.7} name="ASN (EU)" />
                  <Area type="monotone" dataKey="SubCom" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={.7} name="SubCom (US)" />
                  <Area type="monotone" dataKey="NEC" stackId="1" stroke="#f43f5e" fill="#f43f5e" fillOpacity={.7} name="NEC (JP)" />
                  <Area type="monotone" dataKey="HMN Tech" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={.7} name="HMN Tech (CN)" />
                  <Area type="monotone" dataKey="Other" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={.4} name="Other" />
                </AreaChart>
              </ChartBox>
            </Card>
          </div>
          <div style={{ ...grid('1fr 1fr', '1fr 1fr', '1fr'), marginTop: g }}>
            <Card title="Who Controls the Pipes?" icon={Users} sub="Ownership concentration — solo vs consortiums">
              <ChartBox h={ch(220)}>
                <PieChart><Pie data={stats.ownership} innerRadius={mob ? 24 : 32} outerRadius={mob ? 52 : 64} paddingAngle={3} dataKey="value" cx="50%" cy="42%">{stats.ownership.map((_, i) => <Cell key={i} fill={PO[i]} />)}</Pie><RTooltip contentStyle={ttp} /><Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: 10 }} /></PieChart>
              </ChartBox>
            </Card>
            <Card title="Digital Vulnerability Index" icon={AlertCircle} sub="Countries by cable redundancy — how many are one cut from darkness?">
              <ChartBox h={ch(220)}>
                <BarChart data={stats.vulnerability} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: mob ? 8 : 10 }} stroke="#94a3b8" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <RTooltip contentStyle={ttp} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={mob ? 24 : 36}>
                    {stats.vulnerability.map((_, i) => <Cell key={i} fill={PV[i]} />)}
                  </Bar>
                </BarChart>
              </ChartBox>
            </Card>
          </div>
        </section>

        {/* TABLE */}
        <section style={{
          background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', height: mob ? 360 : 520,
        }}>
          <div style={{ padding: mob ? '8px 10px' : '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 5, margin: 0, fontSize: 13, whiteSpace: 'nowrap' }}><Navigation size={13} /> Cable Database</h3>
            <div style={{ position: 'relative', width: mob ? '100%' : 200, flexShrink: 0 }}>
              <Search size={12} color="#94a3b8" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 26, paddingRight: 8, paddingTop: 5, paddingBottom: 5, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, width: '100%', outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ overflow: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', fontSize: 12, textAlign: 'left', borderCollapse: 'collapse', minWidth: 540 }}>
              <thead><tr style={{ background: '#f8fafc', fontSize: 9, textTransform: 'uppercase', color: '#64748b', fontWeight: 600, position: 'sticky', top: 0, zIndex: 10 }}>
                {['Cable Name', 'RFS', 'Length', 'Points', 'Owners'].map(h => <th key={h} style={{ padding: '7px 12px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '7px 12px', fontWeight: 500, color: '#3b82f6', whiteSpace: 'nowrap' }}>{c.name}{c.is_planned && <span style={{ marginLeft: 4, padding: '0 4px', borderRadius: 3, fontSize: 8, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>PLANNED</span>}</td>
                    <td style={{ padding: '7px 12px', color: '#64748b', fontFamily: 'monospace', fontSize: 10 }}>{c.rfs_year || 'TBD'}</td>
                    <td style={{ padding: '7px 12px', color: '#64748b', fontFamily: 'monospace', fontSize: 10 }}>{c.length ? fmt(parseLen(c.length)) : '-'}</td>
                    <td style={{ padding: '7px 12px', color: '#64748b', fontSize: 10 }}><b style={{ color: '#475569' }}>{c.landing_points?.length || 0}</b> <span style={{ color: '#94a3b8' }}>{c.landing_points?.slice(0, 2).map(p => p.country).join(', ')}{c.landing_points?.length > 2 && '…'}</span></td>
                    <td style={{ padding: '7px 12px', color: '#64748b', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.owners || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: 5, borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>{filtered.length} of {data.length} cables</div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ width: '100%', background: '#0f172a', color: '#94a3b8', padding: '14px 0', fontSize: 11, borderTop: '1px solid #1e293b', marginTop: 16 }}>
        <div style={{ width: '100%', padding: `0 ${px}px`, display: 'flex', flexDirection: mob ? 'column' : 'row', alignItems: mob ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 8 }}>
          <span>Data sourced from <a href="https://www.submarinecablemap.com/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>TeleGeography's</a> publicly available Submarine Cable Map</span>
          <span>&copy; {new Date().getFullYear()} under_the_sea</span>
          <span>Built by <a href="mailto:noam.schlanger@gmail.com" style={{ color: '#60a5fa', textDecoration: 'none' }}>Noam Schlanger</a> <Mail size={10} style={{ verticalAlign: 'middle' }} /></span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return <Dashboard data={cableData || []} />;
}