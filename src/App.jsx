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
  '#3b82f6': { bg: '#eff6ff', text: '#3b82f6' },
  '#10b981': { bg: '#ecfdf5', text: '#10b981' },
  '#8b5cf6': { bg: '#f5f3ff', text: '#8b5cf6' },
  '#f59e0b': { bg: '#fffbeb', text: '#f59e0b' },
  '#ef4444': { bg: '#fef2f2', text: '#ef4444' },
  '#6366f1': { bg: '#eef2ff', text: '#6366f1' },
  '#ec4899': { bg: '#fdf2f8', text: '#ec4899' },
  '#14b8a6': { bg: '#f0fdfa', text: '#14b8a6' },
};

const REGION_MAP = {
  'United States': 'N. America', Canada: 'N. America', Mexico: 'N. America',
  Brazil: 'S. America', Argentina: 'S. America', Colombia: 'S. America', Chile: 'S. America', Peru: 'S. America', Uruguay: 'S. America', Ecuador: 'S. America',
  'United Kingdom': 'Europe', France: 'Europe', Germany: 'Europe', Italy: 'Europe', Spain: 'Europe', Denmark: 'Europe', Sweden: 'Europe', Norway: 'Europe', Ireland: 'Europe', Netherlands: 'Europe', Portugal: 'Europe', Greece: 'Europe', Finland: 'Europe', Poland: 'Europe', Belgium: 'Europe', Croatia: 'Europe', Estonia: 'Europe',
  Japan: 'E. Asia', China: 'E. Asia', 'South Korea': 'E. Asia', Taiwan: 'E. Asia', 'Hong Kong': 'E. Asia',
  India: 'S. Asia', Pakistan: 'S. Asia', Bangladesh: 'S. Asia', 'Sri Lanka': 'S. Asia',
  Singapore: 'SE Asia', Indonesia: 'SE Asia', Malaysia: 'SE Asia', Philippines: 'SE Asia', Thailand: 'SE Asia', Vietnam: 'SE Asia', Myanmar: 'SE Asia', Cambodia: 'SE Asia',
  Australia: 'Oceania', 'New Zealand': 'Oceania', Fiji: 'Oceania',
  'Saudi Arabia': 'Middle East', 'United Arab Emirates': 'Middle East', Oman: 'Middle East', Egypt: 'Middle East', Qatar: 'Middle East', Bahrain: 'Middle East', Kuwait: 'Middle East', Jordan: 'Middle East', Israel: 'Middle East',
  'South Africa': 'Africa', Kenya: 'Africa', Nigeria: 'Africa', Ghana: 'Africa', Tanzania: 'Africa', Mozambique: 'Africa', Djibouti: 'Africa', Madagascar: 'Africa',
};

const REGION_COLORS = {
  'N. America': '#3b82f6', 'S. America': '#8b5cf6', Europe: '#10b981', 'E. Asia': '#f43f5e',
  'S. Asia': '#f59e0b', 'SE Asia': '#14b8a6', Oceania: '#6366f1', 'Middle East': '#ec4899', Africa: '#f97316',
};

// ── Utils ──

const parseLen = (v) => { if (v == null) return 0; if (typeof v === 'number') return v; const c = String(v).replace(/km/gi, '').replace(/,/g, '').trim(); return Number(c) || 0; };
const splitList = (s) => { if (!s || typeof s !== 'string') return ['Unknown']; return s.split(/[,/]+/).map(x => x.trim()).filter(x => x.length > 0 && x !== 'null'); };
const fmt = (n) => { if (!n) return '0'; if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'; return n.toLocaleString(); };

// ── Hooks ──

const useWinW = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => { let t; const h = () => { clearTimeout(t); t = setTimeout(() => setW(window.innerWidth), 100); }; window.addEventListener('resize', h); return () => { window.removeEventListener('resize', h); clearTimeout(t); }; }, []);
  return w;
};

// ── ChartBox: ensures Recharts always gets real dimensions ──

const ChartBox = ({ h, children }) => {
  const ref = useRef(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => { if (entries[0]?.contentRect.width > 20) setOk(true); });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return <div ref={ref} style={{ width: '100%', height: h, minHeight: h }}>{ok && <ResponsiveContainer width="100%" height={h}>{children}</ResponsiveContainer>}</div>;
};

// ── UI Components ──

const tt = { borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.08)', fontSize: 12 };

const KPI = ({ title, value, sub, icon: I, color }) => {
  const c = COLOR_MAP[color] || { bg: '#f1f5f9', text: '#64748b' };
  return (
    <div style={{ background: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#64748b', margin: '0 0 3px' }}>{title}</p>
          <h3 style={{ fontSize: 21, fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</h3>
        </div>
        <div style={{ padding: 7, borderRadius: 8, backgroundColor: c.bg, color: c.text, flexShrink: 0, marginLeft: 10 }}><I size={17} /></div>
      </div>
      {sub && <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, marginBottom: 0 }}>{sub}</p>}
    </div>
  );
};

const Card = ({ title, icon: I, children, subtitle }) => (
  <div style={{ background: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,.04)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: subtitle ? 4 : 12, paddingBottom: subtitle ? 0 : 10, borderBottom: subtitle ? 'none' : '1px solid #f1f5f9' }}>
      {I && <I size={15} color="#3b82f6" />}
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</h3>
    </div>
    {subtitle && <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 10px' }}>{subtitle}</p>}
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

// ── Dashboard ──

const Dashboard = ({ data }) => {
  const [search, setSearch] = useState('');
  const w = useWinW();
  const mob = w < 640;
  const tab = w < 1024;
  const g = mob ? 12 : 20;

  const gr = (cols) => ({ display: 'grid', gridTemplateColumns: mob ? '1fr' : cols, gap: g });

  // ── Analytics ──
  const stats = useMemo(() => {
    if (!data?.length) return null;
    let totalLen = 0, planned = 0, active = 0;
    const cc = {}, oc = {}, sc = {}, yc = {};
    const sgc = { USA: 0, Europe: 0, Japan: 0, China: 0, Other: 0 };
    const hbe = {};
    const age = { 'Old (>20y)': 0, 'Mid (10-20y)': 0, 'Modern (<10y)': 0 };
    const pbc = {};
    const ld = { '<1k km': 0, '1k-5k km': 0, '>5k km': 0 };
    const now = new Date().getFullYear();

    // New chart data accumulators
    const regionPairs = {};
    const supplierByEra = {};
    const ownershipTypes = { 'Solo-owned': 0, 'Small (2-3)': 0, 'Consortium (4-5)': 0, 'Mega (6+)': 0 };
    const countryVuln = {};

    data.forEach(cable => {
      const len = parseLen(cable.length);
      totalLen += len;
      if (len > 0) { if (len < 1000) ld['<1k km']++; else if (len < 5000) ld['1k-5k km']++; else ld['>5k km']++; }

      const rfs = cable.rfs_year ? parseInt(cable.rfs_year) : null;
      const isFut = rfs && rfs > now;

      if (cable.is_planned || isFut) planned++;
      else {
        active++;
        if (rfs) { const a = now - rfs; if (a > 20) age['Old (>20y)']++; else if (a > 10) age['Mid (10-20y)']++; else age['Modern (<10y)']++; }
      }

      // Countries
      const cSet = new Set();
      if (Array.isArray(cable.landing_points)) {
        cable.landing_points.forEach(p => { if (p?.country) cSet.add(p.country); });
        cSet.forEach(c => {
          cc[c] = (cc[c] || 0) + 1;
          if (cable.is_planned || isFut) pbc[c] = (pbc[c] || 0) + 1;
          countryVuln[c] = (countryVuln[c] || 0) + 1;
        });

        // Region pairs
        const regions = new Set();
        cSet.forEach(c => { const r = REGION_MAP[c]; if (r) regions.add(r); });
        const rArr = [...regions].sort();
        for (let i = 0; i < rArr.length; i++)
          for (let j = i + 1; j < rArr.length; j++) {
            const k = `${rArr[i]} ↔ ${rArr[j]}`;
            regionPairs[k] = (regionPairs[k] || 0) + 1;
          }
      }

      // Owners
      const owners = splitList(cable.owners);
      let hasH = false;
      owners.forEach(o => { if (o !== 'Unknown') oc[o] = (oc[o] || 0) + 1; if (HYPERSCALERS.some(h => o.includes(h))) hasH = true; });

      const ownCount = owners.filter(o => o !== 'Unknown').length;
      if (ownCount <= 1) ownershipTypes['Solo-owned']++;
      else if (ownCount <= 3) ownershipTypes['Small (2-3)']++;
      else if (ownCount <= 5) ownershipTypes['Consortium (4-5)']++;
      else ownershipTypes['Mega (6+)']++;

      // Hyperscaler eras
      if (rfs && rfs >= 2000 && rfs <= now + 5) {
        const era = `${Math.floor(rfs / 5) * 5}-${Math.floor(rfs / 5) * 5 + 4}`;
        if (!hbe[era]) hbe[era] = { era, tech: 0, other: 0, techLength: 0, otherLength: 0 };
        if (hasH) { hbe[era].tech++; hbe[era].techLength += len; } else { hbe[era].other++; hbe[era].otherLength += len; }
      }

      // Suppliers
      const suppliers = splitList(cable.suppliers);
      suppliers.forEach(s => {
        if (s !== 'Unknown') {
          sc[s] = (sc[s] || 0) + 1;
          let r = 'Other';
          for (const [k, v] of Object.entries(SUPPLIER_MAPPING)) { if (s.includes(k)) r = v; }
          sgc[r]++;
        }
      });

      // Supplier by era
      if (rfs && rfs >= 1995 && rfs <= 2029) {
        const era = `${Math.floor(rfs / 5) * 5}s`;
        if (!supplierByEra[era]) supplierByEra[era] = { era, ASN: 0, SubCom: 0, NEC: 0, 'HMN Tech': 0, Other: 0 };
        let matched = false;
        suppliers.forEach(s => {
          if (s.includes('ASN') || s.includes('Alcatel')) { supplierByEra[era].ASN++; matched = true; }
          else if (s.includes('SubCom') || s.includes('Tyco') || s.includes('TE Sub')) { supplierByEra[era].SubCom++; matched = true; }
          else if (s.includes('NEC')) { supplierByEra[era].NEC++; matched = true; }
          else if (s.includes('HMN') || s.includes('Huawei') || s.includes('Hengtong')) { supplierByEra[era]['HMN Tech']++; matched = true; }
        });
        if (!matched && suppliers.some(s => s !== 'Unknown')) supplierByEra[era].Other++;
      }

      if (rfs && rfs > 1990 && rfs < 2030) {
        if (!yc[rfs]) yc[rfs] = { count: 0, length: 0 };
        yc[rfs].count++;
        yc[rfs].length += len;
      }
    });

    // Vulnerability buckets
    const vulnBuckets = { '1 cable (critical)': 0, '2 cables (fragile)': 0, '3-5 cables': 0, '6-10 cables': 0, '10+ cables': 0 };
    Object.values(countryVuln).forEach(n => {
      if (n === 1) vulnBuckets['1 cable (critical)']++;
      else if (n === 2) vulnBuckets['2 cables (fragile)']++;
      else if (n <= 5) vulnBuckets['3-5 cables']++;
      else if (n <= 10) vulnBuckets['6-10 cables']++;
      else vulnBuckets['10+ cables']++;
    });

    return {
      totalCables: data.length, totalLen, active, planned,
      topCountries: Object.entries(cc).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({ name, count })),
      topSuppliers: Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
      timeline: Object.entries(yc).map(([y, d]) => ({ year: +y, count: d.count, length: d.length })).sort((a, b) => a.year - b.year),
      supplierGeo: Object.entries(sgc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      hyperscaler: Object.values(hbe).sort((a, b) => +a.era.split('-')[0] - +b.era.split('-')[0]),
      ageData: Object.entries(age).map(([name, value]) => ({ name, value })),
      risk: Object.entries(cc).filter(([_, c]) => c === 1).length,
      topPlanned: Object.entries(pbc).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
      lengthData: Object.entries(ld).map(([name, value]) => ({ name, value })),
      // New charts
      corridors: Object.entries(regionPairs).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count })),
      supplierEra: Object.values(supplierByEra).sort((a, b) => a.era.localeCompare(b.era)),
      ownership: Object.entries(ownershipTypes).map(([name, value]) => ({ name, value })),
      vulnerability: Object.entries(vulnBuckets).map(([name, value]) => ({ name, value })),
    };
  }, [data]);

  const filtered = useMemo(() => {
    if (!data?.length) return [];
    const s = search.toLowerCase();
    return data.filter(c =>
      c.name?.toLowerCase().includes(s) ||
      c.owners?.toLowerCase().includes(s) ||
      c.landing_points?.some(p => p.country?.toLowerCase().includes(s))
    ).slice(0, 100);
  }, [data, search]);

  if (!stats) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <AlertCircle size={48} color="#ef4444" />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginTop: 16 }}>No Data</h2>
        <p style={{ color: '#64748b', fontSize: 14 }}>Unable to load submarine cable data.</p>
      </div>
    </div>
  );

  const PIE_COLORS_AGE = ['#ef4444', '#f59e0b', '#10b981'];
  const PIE_COLORS_OWN = ['#3b82f6', '#6366f1', '#ec4899', '#f59e0b'];
  const PIE_COLORS_VULN = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", color: '#1e293b', display: 'flex', flexDirection: 'column' }}>

      {/* ═══ HEADER ═══ */}
      <header style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff', position: 'sticky', top: 0, zIndex: 30, boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: `0 ${mob ? 12 : 20}px`, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Anchor size={18} color="#60a5fa" />
            <span style={{ fontWeight: 700, fontSize: mob ? 13 : 15, letterSpacing: '-.02em' }}>Submarine Cable Explorer</span>
          </div>
          {!mob && <div style={{ fontSize: 10, color: '#94a3b8', background: 'rgba(255,255,255,.06)', padding: '3px 10px', borderRadius: 16, border: '1px solid rgba(255,255,255,.08)' }}>{stats.totalCables} cables</div>}
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: `${mob ? 16 : 28}px ${mob ? 12 : 20}px`, flex: 1, width: '100%', boxSizing: 'border-box' }}>

        {/* ═══ NETWORK OVERVIEW ═══ */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: mob ? 15 : 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 7 }}><Activity size={16} color="#64748b" />Network Overview</h2>

          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4,1fr)', gap: g }}>
            <KPI title="Total Cable Length" value={`${fmt(stats.totalLen)} km`} sub="Global subsea fiber" icon={Activity} color="#3b82f6" />
            <KPI title="Total Systems" value={stats.totalCables} sub={`${stats.active} Active · ${stats.planned} Planned`} icon={Zap} color="#10b981" />
            <KPI title="Top Hub" value={stats.topCountries[0]?.name || '-'} sub={`${stats.topCountries[0]?.count || 0} connections`} icon={Globe} color="#8b5cf6" />
            <KPI title="Top Supplier" value={stats.topSuppliers[0]?.name || '-'} sub={`${stats.topSuppliers[0]?.count || 0} systems`} icon={Server} color="#f59e0b" />
          </div>

          <div style={{ ...gr(tab ? '1fr' : '2fr 1fr'), marginTop: g }}>
            <Card title="Systems RFS Timeline" icon={Calendar}>
              <ChartBox h={mob ? 220 : 280}>
                <ComposedChart data={stats.timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={.7} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis yAxisId="l" tick={{ fontSize: 10 }} allowDecimals={false} stroke="#94a3b8" />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1e3).toFixed(0)}k`} stroke="#94a3b8" />
                  <RTooltip contentStyle={tt} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area yAxisId="l" type="monotone" dataKey="count" name="Systems" stroke="#3b82f6" fillOpacity={1} fill="url(#gc)" />
                  <Line yAxisId="r" type="monotone" dataKey="length" name="Length (km)" stroke="#ec4899" dot={false} strokeWidth={2} />
                </ComposedChart>
              </ChartBox>
            </Card>
            <Card title="Top 15 Connected Countries" icon={Map}>
              <ChartBox h={mob ? 280 : 320}>
                <BarChart data={stats.topCountries} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={mob ? 65 : 95} tick={{ fontSize: 10 }} interval={0} stroke="#94a3b8" />
                  <RTooltip contentStyle={tt} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={13} />
                </BarChart>
              </ChartBox>
            </Card>
          </div>
        </section>

        {/* ═══ GEOPOLITICS ═══ */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: mob ? 15 : 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 7, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}><Globe2 size={16} color="#64748b" />Geopolitics & Strategy</h2>

          <div style={gr('1fr 1fr')}>
            <Card title="Supplier HQ Sovereignty" icon={ShieldAlert} subtitle="Systems by supplier nationality">
              <ChartBox h={190}>
                <BarChart data={stats.supplierGeo} layout="vertical" margin={{ left: 5, right: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <RTooltip contentStyle={tt} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                    {stats.supplierGeo.map((e, i) => <Cell key={i} fill={GEO_COLORS[e.name] || '#94a3b8'} />)}
                  </Bar>
                </BarChart>
              </ChartBox>
            </Card>
            <Card title="Hyperscaler Shift" icon={TrendingUp} subtitle="Big Tech vs Traditional by era">
              <ChartBox h={190}>
                <ComposedChart data={stats.hyperscaler} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="era" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis yAxisId="l" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1e3).toFixed(0)}k`} stroke="#94a3b8" />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <RTooltip contentStyle={tt} />
                  <Bar yAxisId="l" dataKey="other" name="Trad." stackId="a" fill="#94a3b8" barSize={20} />
                  <Bar yAxisId="l" dataKey="tech" name="Tech" stackId="a" fill="#3b82f6" barSize={20} />
                  <Line yAxisId="r" type="monotone" dataKey="techLength" name="Tech km" stroke="#2563eb" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ChartBox>
            </Card>
          </div>

          <div style={{ ...gr(mob ? '1fr' : tab ? '1fr 1fr' : '1fr 1fr 2fr'), marginTop: g }}>
            <Card title="Infrastructure Age" icon={Clock}>
              <ChartBox h={200}>
                <PieChart>
                  <Pie data={stats.ageData} innerRadius={mob ? 28 : 36} outerRadius={mob ? 52 : 64} paddingAngle={3} dataKey="value" cx="50%" cy="42%">
                    {stats.ageData.map((_, i) => <Cell key={i} fill={PIE_COLORS_AGE[i]} />)}
                  </Pie>
                  <RTooltip contentStyle={tt} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ChartBox>
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: g }}>
              <KPI title="Vulnerable Nations" value={stats.risk} sub="Countries with only 1 cable" icon={AlertCircle} color="#ef4444" />
              <KPI title="Strategic Reach" value={stats.lengthData.find(d => d.name.includes('>5k'))?.value || 0} sub="Long-haul (>5k km) systems" icon={BarChart2} color="#6366f1" />
            </div>

            <div style={tab && !mob ? { gridColumn: '1 / -1' } : {}}>
              <Card title="Top Planned Projects by Country" icon={Navigation}>
                <ChartBox h={mob ? 240 : 220}>
                  <BarChart data={stats.topPlanned} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={mob ? 65 : 90} tick={{ fontSize: 10 }} interval={0} stroke="#94a3b8" />
                    <RTooltip contentStyle={tt} />
                    <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={11} />
                  </BarChart>
                </ChartBox>
              </Card>
            </div>
          </div>
        </section>

        {/* ═══ DEEP DIVE: 4 NEW CHARTS ═══ */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: mob ? 15 : 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 7, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}><Shield size={16} color="#64748b" />Deep Dive: Power, Risk & Control</h2>

          <div style={gr('1fr 1fr')}>
            {/* 1) Cross-Continental Corridors */}
            <Card title="Cross-Continental Corridors" icon={Link2} subtitle="Region-to-region cable routes — who's connected to whom">
              <ChartBox h={mob ? 280 : 300}>
                <BarChart data={stats.corridors} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={mob ? 90 : 130} tick={{ fontSize: mob ? 8 : 10 }} interval={0} stroke="#94a3b8" />
                  <RTooltip contentStyle={tt} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                    {stats.corridors.map((e, i) => {
                      const r = e.name.split(' ↔ ')[0];
                      return <Cell key={i} fill={REGION_COLORS[r] || '#94a3b8'} />;
                    })}
                  </Bar>
                </BarChart>
              </ChartBox>
            </Card>

            {/* 2) Supplier Market Share Over Time */}
            <Card title="Supplier Arms Race" icon={TrendingUp} subtitle="Market dominance shifts across eras — who builds the internet?">
              <ChartBox h={mob ? 280 : 300}>
                <AreaChart data={stats.supplierEra} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="era" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <RTooltip contentStyle={tt} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="ASN" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.7} name="ASN (EU)" />
                  <Area type="monotone" dataKey="SubCom" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.7} name="SubCom (US)" />
                  <Area type="monotone" dataKey="NEC" stackId="1" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.7} name="NEC (JP)" />
                  <Area type="monotone" dataKey="HMN Tech" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.7} name="HMN Tech (CN)" />
                  <Area type="monotone" dataKey="Other" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.5} name="Other" />
                </AreaChart>
              </ChartBox>
            </Card>
          </div>

          <div style={{ ...gr('1fr 1fr'), marginTop: g }}>
            {/* 3) Ownership Structure */}
            <Card title="Who Controls the Pipes?" icon={Users} subtitle="Ownership concentration — solo operators vs large consortiums">
              <ChartBox h={220}>
                <PieChart>
                  <Pie data={stats.ownership} innerRadius={mob ? 25 : 35} outerRadius={mob ? 55 : 68} paddingAngle={3} dataKey="value" cx="50%" cy="42%">
                    {stats.ownership.map((_, i) => <Cell key={i} fill={PIE_COLORS_OWN[i]} />)}
                  </Pie>
                  <RTooltip contentStyle={tt} />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ChartBox>
            </Card>

            {/* 4) Digital Vulnerability Index */}
            <Card title="Digital Vulnerability Index" icon={AlertCircle} subtitle="How many countries are one cable cut from going dark?">
              <ChartBox h={220}>
                <BarChart data={stats.vulnerability} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: mob ? 8 : 10 }} stroke="#94a3b8" interval={0} angle={mob ? -20 : 0} textAnchor={mob ? 'end' : 'middle'} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <RTooltip contentStyle={tt} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={mob ? 28 : 36}>
                    {stats.vulnerability.map((_, i) => <Cell key={i} fill={PIE_COLORS_VULN[i]} />)}
                  </Bar>
                </BarChart>
              </ChartBox>
            </Card>
          </div>
        </section>

        {/* ═══ TABLE ═══ */}
        <section style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,.04)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', height: mob ? 400 : 560,
        }}>
          <div style={{
            padding: mob ? '10px 12px' : '12px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
          }}>
            <h3 style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, margin: 0, fontSize: 13 }}>
              <Navigation size={14} /> Cable Database
            </h3>
            <div style={{ position: 'relative', flexShrink: 0, width: mob ? '100%' : 220 }}>
              <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text" placeholder="Search cables, owners, countries..."
                style={{
                  paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
                  borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12,
                  width: '100%', outline: 'none', background: '#fff', boxSizing: 'border-box',
                }}
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div style={{ overflow: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', fontSize: 12, textAlign: 'left', borderCollapse: 'collapse', minWidth: 580 }}>
              <thead>
                <tr style={{ background: '#f8fafc', fontSize: 9, textTransform: 'uppercase', color: '#64748b', fontWeight: 600, position: 'sticky', top: 0, zIndex: 10 }}>
                  {['Cable Name', 'RFS', 'Length', 'Points', 'Owners'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '8px 14px', fontWeight: 500, color: '#3b82f6', whiteSpace: 'nowrap' }}>
                      {c.name}
                      {c.is_planned && <span style={{ marginLeft: 5, padding: '1px 4px', borderRadius: 3, fontSize: 8, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>PLANNED</span>}
                    </td>
                    <td style={{ padding: '8px 14px', color: '#64748b', fontFamily: 'monospace', fontSize: 10 }}>{c.rfs_year || 'TBD'}</td>
                    <td style={{ padding: '8px 14px', color: '#64748b', fontFamily: 'monospace', fontSize: 10 }}>{c.length ? fmt(parseLen(c.length)) : '-'}</td>
                    <td style={{ padding: '8px 14px', color: '#64748b', fontSize: 10 }}>
                      <b style={{ color: '#475569' }}>{c.landing_points?.length || 0}</b>{' '}
                      <span style={{ color: '#94a3b8' }}>{c.landing_points?.slice(0, 2).map(p => p.country).join(', ')}{c.landing_points?.length > 2 && '…'}</span>
                    </td>
                    <td style={{ padding: '8px 14px', color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.owners || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: 6, borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
            {filtered.length} of {data.length} cables
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '20px 0', fontSize: 11, borderTop: '1px solid #1e293b', marginTop: 20 }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: `0 ${mob ? 12 : 20}px`,
          display: 'flex', flexDirection: mob ? 'column' : 'row',
          alignItems: mob ? 'flex-start' : 'center',
          justifyContent: 'space-between', gap: 10,
        }}>
          <span>Data: <a href="https://www.submarinecablemap.com/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>TeleGeography</a></span>
          <span>&copy; {new Date().getFullYear()} Submarine Cable Explorer</span>
          <span>
            Built by{' '}
            <a href="mailto:noam.schlanger@gmail.com" style={{ color: '#60a5fa', textDecoration: 'none' }}>
              Noam Schlanger
            </a>
            {' '}<Mail size={10} style={{ verticalAlign: 'middle' }} />
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return <Dashboard data={cableData || []} />;
}