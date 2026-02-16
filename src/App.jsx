import React, { useState, useMemo, useEffect } from 'react';
import { 
  Activity, Map, Anchor, Server, Calendar, 
  TrendingUp, Globe, Search, Filter, Hash,
  Zap, Navigation, Layers, AlertCircle, 
  ShieldAlert, Clock, BarChart2, Globe2, ExternalLink
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, LineChart, Line, PieChart, 
  Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';

import rawData from './submarine_cables_complete.json';

let cableData = [];
if (Array.isArray(rawData)) {
  cableData = rawData;
} else if (rawData && typeof rawData === 'object') {
  cableData = rawData.cables || rawData.data || rawData.features || Object.values(rawData);
}

// --- CONFIG ---

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#14b8a6', '#f97316'];
const GEO_COLORS = {
  'USA': '#3b82f6',
  'Europe': '#10b981',
  'Japan': '#f43f5e',
  'China': '#f59e0b',
  'Other': '#94a3b8'
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

// --- COMPONENTS ---

const KPICard = ({ title, value, subtext, icon: Icon, color }) => {
  const colorStyle = COLOR_MAP[color] || { bg: '#f1f5f9', text: '#64748b' };
  
  return (
    <div style={{
      background: '#fff',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>{title}</p>
          <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{value}</h3>
        </div>
        <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: colorStyle.bg, color: colorStyle.text }}>
          <Icon size={20} />
        </div>
      </div>
      {subtext && <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>{subtext}</p>}
    </div>
  );
};

/* KEY FIX: Use inline style for the chart container height instead of Tailwind arbitrary values.
   Tailwind's h-[300px] only works with JIT compilation — in a pre-built stylesheet it's missing. */
const Section = ({ title, children, icon: Icon, height = 300 }) => (
  <div style={{
    background: '#fff',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px',
      paddingBottom: '12px',
      borderBottom: '1px solid #f1f5f9',
    }}>
      {Icon && <Icon size={18} color="#3b82f6" />}
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</h3>
    </div>
    <div style={{ width: '100%', height: `${height}px`, minHeight: `${height}px`, flex: '1 1 auto' }}>
      {children}
    </div>
  </div>
);

const EmptyState = ({ message }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: '#94a3b8', fontSize: '14px',
  }}>
    {message}
  </div>
);

// --- MAIN DASHBOARD ---

const Dashboard = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // --- ANALYTICS ENGINE ---
  const stats = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        totalCables: 0, totalLength: 0, activeCount: 0, plannedCount: 0,
        topCountries: [], topOwners: [], topSuppliers: [], timelineData: [],
        supplierGeoData: [], hyperscalerData: [], ageData: [],
        riskCountries: 0, topPlanned: [], lengthData: []
      };
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

      if (cable.is_planned || isFuture) {
        plannedCount++;
      } else {
        activeCount++;
        if (rfs) {
          const age = currentYear - rfs;
          if (age > 20) ageDistribution['Old (>20y)']++;
          else if (age > 10) ageDistribution['Mid-Life (10-20y)']++;
          else ageDistribution['Modern (<10y)']++;
        }
      }

      if (Array.isArray(cable.landing_points)) {
        const uniqueCountries = new Set();
        cable.landing_points.forEach(pt => {
          if (pt && pt.country) uniqueCountries.add(pt.country);
        });
        uniqueCountries.forEach(c => {
          countryCounts[c] = (countryCounts[c] || 0) + 1;
          if (cable.is_planned || isFuture) {
            plannedByCountry[c] = (plannedByCountry[c] || 0) + 1;
          }
        });
      }

      const owners = splitList(cable.owners);
      let hasHyperscaler = false;
      owners.forEach(o => {
        if (o !== 'Unknown') ownerCounts[o] = (ownerCounts[o] || 0) + 1;
        if (HYPERSCALERS.some(h => o.includes(h))) hasHyperscaler = true;
      });

      if (rfs && rfs >= 2000 && rfs <= currentYear + 5) {
        const era = `${Math.floor(rfs / 5) * 5}-${Math.floor(rfs / 5) * 5 + 4}`;
        if (!hyperscalerByEra[era]) hyperscalerByEra[era] = { era, tech: 0, other: 0, techLength: 0, otherLength: 0 };
        if (hasHyperscaler) {
          hyperscalerByEra[era].tech++;
          hyperscalerByEra[era].techLength += len;
        } else {
          hyperscalerByEra[era].other++;
          hyperscalerByEra[era].otherLength += len;
        }
      }

      const suppliers = splitList(cable.suppliers);
      suppliers.forEach(s => {
        if (s !== 'Unknown') {
          supplierCounts[s] = (supplierCounts[s] || 0) + 1;
          let region = 'Other';
          for (const [key, val] of Object.entries(SUPPLIER_MAPPING)) {
            if (s.includes(key)) region = val;
          }
          supplierGeoCounts[region]++;
        }
      });

      if (rfs && rfs > 1990 && rfs < 2030) {
        if (!cablesPerYear[rfs]) cablesPerYear[rfs] = { count: 0, length: 0 };
        cablesPerYear[rfs].count++;
        cablesPerYear[rfs].length += len;
      }
    });

    return {
      totalCables: data.length,
      totalLength,
      activeCount,
      plannedCount,
      topCountries: Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({ name, count })),
      topOwners: Object.entries(ownerCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
      topSuppliers: Object.entries(supplierCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
      timelineData: Object.entries(cablesPerYear).map(([year, d]) => ({ year: parseInt(year), count: d.count, length: d.length })).sort((a, b) => a.year - b.year),
      supplierGeoData: Object.entries(supplierGeoCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      hyperscalerData: Object.values(hyperscalerByEra).sort((a, b) => parseInt(a.era) - parseInt(b.era)),
      ageData: Object.entries(ageDistribution).map(([name, value]) => ({ name, value })),
      riskCountries: Object.entries(countryCounts).filter(([_, count]) => count === 1).length,
      topPlanned: Object.entries(plannedByCountry).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
      lengthData: Object.entries(lengthDistribution).map(([name, value]) => ({ name, value })),
    };
  }, [data]);

  const filteredCables = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(c =>
      (c.name && c.name.toLowerCase().includes(lowerSearch)) ||
      (c.owners && c.owners.toLowerCase().includes(lowerSearch)) ||
      (c.landing_points && c.landing_points.some(p => p.country && p.country.toLowerCase().includes(lowerSearch)))
    ).slice(0, 100);
  }, [data, searchTerm]);

  // Error state
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <AlertCircle size={64} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Data Loading Error</h2>
          <p style={{ color: '#64748b' }}>Unable to load submarine cable data.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: '#1e293b', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Anchor size={22} color="#60a5fa" />
            <span style={{ fontWeight: 700, fontSize: '17px', letterSpacing: '-0.02em' }}>Submarine Cable Explorer</span>
          </div>
          <div style={{
            fontSize: '12px', color: '#94a3b8', background: '#1e293b',
            padding: '4px 12px', borderRadius: '20px', border: '1px solid #334155',
          }}>
            {stats.totalCables} cables loaded
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px', flex: 1, width: '100%' }}>

        {/* Section: Network Overview */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Activity size={20} color="#64748b" />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Network Overview</h2>
          </div>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <KPICard title="Total Cable Length" value={`${formatNumber(stats.totalLength)} km`} subtext="Global subsea fiber network" icon={Activity} color="#3b82f6" />
            <KPICard title="Total Systems" value={stats.totalCables} subtext={`${stats.activeCount} Active · ${stats.plannedCount} Planned`} icon={Zap} color="#10b981" />
            <KPICard title="Top Hub" value={stats.topCountries[0]?.name || '-'} subtext={`${stats.topCountries[0]?.count || 0} unique connections`} icon={Globe} color="#8b5cf6" />
            <KPICard title="Top Supplier" value={stats.topSuppliers[0]?.name || '-'} subtext={`${stats.topSuppliers[0]?.count || 0} systems supplied`} icon={Server} color="#f59e0b" />
          </div>

          {/* Timeline + Countries */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <Section title="Systems RFS Timeline" icon={Calendar} height={300}>
              {stats.timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} stroke="#94a3b8" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} stroke="#94a3b8" />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="count" name="System Count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
                    <Line yAxisId="right" type="monotone" dataKey="length" name="Total Length (km)" stroke="#ec4899" dot={false} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <EmptyState message="No timeline data" />}
            </Section>

            <Section title="Top 15 Connected Countries" icon={Map} height={300}>
              {stats.topCountries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topCountries} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} interval={0} stroke="#94a3b8" />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState message="No country data" />}
            </Section>
          </div>
        </div>

        {/* Section: Geopolitics & Strategic Indicators */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
            <Globe2 size={20} color="#64748b" />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Geopolitics & Strategic Indicators</h2>
          </div>

          {/* Supplier + Hyperscaler row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <Section title="Technological Sovereignty (Supplier HQ)" icon={ShieldAlert} height={220}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>Total systems by supplier nationality</div>
              {stats.supplierGeoData.length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={stats.supplierGeoData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                      {stats.supplierGeoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={GEO_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState message="No supplier data" />}
            </Section>

            <Section title="The Hyperscaler Shift (Big Tech vs Telco)" icon={TrendingUp} height={220}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>New cable builds by era & length breakdown</div>
              {stats.hyperscalerData.length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                  <ComposedChart data={stats.hyperscalerData} margin={{ top: 10, right: 10, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="era" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} stroke="#94a3b8" />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar yAxisId="left" dataKey="other" name="Trad. Count" stackId="a" fill="#94a3b8" barSize={28} />
                    <Bar yAxisId="left" dataKey="tech" name="Tech Count" stackId="a" fill="#3b82f6" barSize={28} />
                    <Line yAxisId="right" type="monotone" dataKey="otherLength" name="Trad. Length (km)" stroke="#475569" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                    <Line yAxisId="right" type="monotone" dataKey="techLength" name="Tech Length (km)" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <EmptyState message="No hyperscaler data" />}
            </Section>
          </div>

          {/* Bottom row: Age + Risk + Planned */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '24px' }}>
            <Section title="Infrastructure Age Risk" icon={Clock} height={200}>
              {stats.ageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.ageData} innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value">
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState message="No age data" />}
            </Section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <KPICard
                title="Vulnerable Nations"
                value={stats.riskCountries}
                subtext="Countries with only 1 cable connection"
                icon={AlertCircle}
                color="#ef4444"
              />
              <KPICard
                title="Strategic Reach"
                value={stats.lengthData.find(d => d.name.includes('Long'))?.value || 0}
                subtext="Long-haul (>5k km) systems"
                icon={BarChart2}
                color="#6366f1"
              />
            </div>

            <Section title="Future Battlegrounds: Top Planned Projects" icon={Navigation} height={240}>
              {stats.topPlanned.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topPlanned} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} interval={0} stroke="#94a3b8" />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState message="No planned projects" />}
            </Section>
          </div>
        </div>

        {/* Cable Database Table */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '600px',
        }}>
          <div style={{
            padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
          }}>
            <h3 style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '15px' }}>
              <Navigation size={16} />
              Cable Database
            </h3>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search cables, owners, countries..."
                style={{
                  paddingLeft: '36px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px',
                  borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', width: '260px',
                  outline: 'none', background: '#fff',
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: '100%', fontSize: '13px', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0' }}>Cable Name</th>
                  <th style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0' }}>RFS</th>
                  <th style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0' }}>Length (km)</th>
                  <th style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0' }}>Landing Points</th>
                  <th style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0' }}>Owners</th>
                </tr>
              </thead>
              <tbody>
                {filteredCables.map((cable, idx) => (
                  <tr key={cable.id || idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 20px', fontWeight: 500, color: '#3b82f6' }}>
                      {cable.name}
                      {cable.is_planned && (
                        <span style={{
                          marginLeft: '8px', display: 'inline-flex', alignItems: 'center',
                          padding: '1px 6px', borderRadius: '4px', fontSize: '10px',
                          fontWeight: 500, background: '#fef3c7', color: '#92400e',
                        }}>
                          PLANNED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 20px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{cable.rfs_year || 'TBD'}</td>
                    <td style={{ padding: '12px 20px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{cable.length ? formatNumber(parseLength(cable.length)) : '-'}</td>
                    <td style={{ padding: '12px 20px', color: '#64748b', maxWidth: '240px' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#475569' }}>{cable.landing_points?.length || 0} Points</span>
                        <br />
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {cable.landing_points?.slice(0, 3).map(p => p.country).join(', ')}
                          {cable.landing_points?.length > 3 && '...'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', color: '#64748b', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cable.owners || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '8px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
            Showing {filteredCables.length} of {data.length} records
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: '#0f172a', color: '#94a3b8', padding: '20px 0',
        fontSize: '13px', borderTop: '1px solid #1e293b',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={14} />
            <span>
              Data provided by{' '}
              <a href="https://www.submarinecablemap.com/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>
                TeleGeography
              </a>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>&copy; {new Date().getFullYear()} Submarine Cable Explorer</span>
            <span style={{ color: '#334155' }}>|</span>
            <span style={{ color: '#64748b' }}>React & Recharts</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return <Dashboard data={cableData || []} />;
}