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

// Import the JSON - it's likely an object with a "cables" or "data" property
import rawData from './submarine_cables_complete.json';

// Extract the array from the imported data
let cableData = [];
if (Array.isArray(rawData)) {
  cableData = rawData;
} else if (rawData && typeof rawData === 'object') {
  // Try common property names
  cableData = rawData.cables || rawData.data || rawData.features || Object.values(rawData);
}

console.log('Raw data type:', typeof rawData);
console.log('Raw data keys:', Object.keys(rawData || {}));
console.log('Cable data length:', cableData?.length);

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
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: colorStyle.bg, color: colorStyle.text }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
    </div>
  );
};

const Section = ({ title, children, icon: Icon, className = "", contentHeight = "h-[300px]" }) => (
  <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col ${className}`}>
    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
      {Icon && <Icon className="w-5 h-5 text-blue-600" />}
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
    </div>
    <div className={`w-full ${contentHeight}`}>
      {children}
    </div>
  </div>
);

// --- MAIN DASHBOARD ---

const Dashboard = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    console.log('Dashboard mounted with data:', data?.length);
    if (data && data.length > 0) {
      console.log('First cable sample:', data[0]);
    }
  }, [data]);

  // --- ANALYTICS ENGINE ---
  const stats = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        totalCables: 0,
        totalLength: 0,
        activeCount: 0,
        plannedCount: 0,
        topCountries: [],
        topOwners: [],
        topSuppliers: [],
        timelineData: [],
        supplierGeoData: [],
        hyperscalerData: [],
        ageData: [],
        riskCountries: 0,
        topPlanned: [],
        lengthData: []
      };
    }

    let totalLength = 0;
    let plannedCount = 0;
    let activeCount = 0;
    
    const countryCounts = {};
    const ownerCounts = {};
    const supplierCounts = {};
    const cablesPerYear = {};
    
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

    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));

    const topOwners = Object.entries(ownerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
      
    const topSuppliers = Object.entries(supplierCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const timelineData = Object.entries(cablesPerYear)
      .map(([year, data]) => ({ year: parseInt(year), count: data.count, length: data.length }))
      .sort((a, b) => a.year - b.year);

    const supplierGeoData = Object.entries(supplierGeoCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const hyperscalerData = Object.values(hyperscalerByEra).sort((a,b) => parseInt(a.era) - parseInt(b.era));
    
    const ageData = Object.entries(ageDistribution).map(([name, value]) => ({ name, value }));
    
    const riskCountries = Object.entries(countryCounts)
        .filter(([_, count]) => count === 1)
        .length;

    const topPlanned = Object.entries(plannedByCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

    const lengthData = Object.entries(lengthDistribution).map(([name, value]) => ({ name, value }));

    return {
      totalCables: data.length,
      totalLength,
      activeCount,
      plannedCount,
      topCountries,
      topOwners,
      topSuppliers,
      timelineData,
      supplierGeoData,
      hyperscalerData,
      ageData,
      riskCountries,
      topPlanned,
      lengthData
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

  // Show error state if no data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Data Loading Error</h2>
          <p className="text-slate-600 mb-4">Unable to load submarine cable data.</p>
          <div className="bg-slate-800 text-slate-100 p-4 rounded text-left text-xs font-mono max-w-2xl">
            <div>Raw data type: {typeof rawData}</div>
            <div>Available keys: {Object.keys(rawData || {}).join(', ')}</div>
            <div>Data length: {data?.length || 0}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Anchor className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-lg tracking-tight">Submarine Cable Explorer</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-xs text-slate-400 hidden sm:block bg-slate-800 px-3 py-1 rounded-full">
                Dataset: {stats.totalCables} cables loaded
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12 flex-1 w-full">
        
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-slate-400" />
                <h2 className="text-xl font-bold text-slate-800">Network Overview</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard 
                title="Total Cable Length" 
                value={`${formatNumber(stats.totalLength)} km`}
                subtext="Global subsea fiber network"
                icon={Activity} 
                color="#3b82f6" 
            />
            <KPICard 
                title="Total Systems" 
                value={stats.totalCables}
                subtext={`${stats.activeCount} Active • ${stats.plannedCount} Planned`}
                icon={Zap} 
                color="#10b981" 
            />
            <KPICard 
                title="Top Hub" 
                value={stats.topCountries[0]?.name || '-'}
                subtext={`${stats.topCountries[0]?.count || 0} unique connections`}
                icon={Globe} 
                color="#8b5cf6" 
            />
            <KPICard 
                title="Top Supplier" 
                value={stats.topSuppliers[0]?.name || '-'}
                subtext={`${stats.topSuppliers[0]?.count || 0} systems supplied`}
                icon={Server} 
                color="#f59e0b" 
            />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Section title="Systems RFS (Ready for Service) Timeline" icon={Calendar}>
                    {stats.timelineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={stats.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" tick={{fontSize: 12}} />
                            <YAxis yAxisId="left" tick={{fontSize: 12}} allowDecimals={false} />
                            <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                            <RechartsTooltip />
                            <Legend />
                            <Area yAxisId="left" type="monotone" dataKey="count" name="System Count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
                            <Line yAxisId="right" type="monotone" dataKey="length" name="Total Length (km)" stroke="#ec4899" dot={false} strokeWidth={2} />
                        </ComposedChart>
                    </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-slate-400">No timeline data</div>}
                    </Section>
                </div>
                
                <div className="lg:col-span-1">
                    <Section title="Top 15 Connected Countries" icon={Map}>
                    {stats.topCountries.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topCountries} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={110} tick={{fontSize: 10}} interval={0} />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                    </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-slate-400">No country data</div>}
                    </Section>
                </div>
            </div>
        </div>

        <div className="space-y-6">
             <div className="flex items-center gap-2 mb-2 pt-6 border-t border-slate-200">
                <Globe2 className="w-5 h-5 text-slate-400" />
                <h2 className="text-xl font-bold text-slate-800">Geopolitics & Strategic Indicators</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Section title="Technological Sovereignty (Supplier HQ)" icon={ShieldAlert} contentHeight="h-[200px]">
                    <div className="mb-2 text-xs text-slate-400">Total systems by supplier nationality</div>
                    {stats.supplierGeoData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.supplierGeoData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={60} tick={{fontSize: 11}} />
                            <RechartsTooltip />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                {stats.supplierGeoData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={GEO_COLORS[entry.name] || '#94a3b8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-slate-400">No supplier data</div>}
                </Section>

                <Section title="The Hyperscaler Shift (Big Tech vs Telco)" icon={TrendingUp} contentHeight="h-[200px]">
                    <div className="mb-2 text-xs text-slate-400">New cable builds by era & length breakdown</div>
                    {stats.hyperscalerData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={stats.hyperscalerData} margin={{ top: 10, right: 10, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="era" tick={{fontSize: 11}} />
                            <YAxis yAxisId="left" tick={{fontSize: 11}} />
                            <YAxis yAxisId="right" orientation="right" tick={{fontSize: 11}} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <RechartsTooltip />
                            <Bar yAxisId="left" dataKey="other" name="Trad. Count" stackId="a" fill="#94a3b8" barSize={32} />
                            <Bar yAxisId="left" dataKey="tech" name="Tech Count" stackId="a" fill="#3b82f6" barSize={32} />
                            <Line yAxisId="right" type="monotone" dataKey="otherLength" name="Trad. Length (km)" stroke="#475569" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                            <Line yAxisId="right" type="monotone" dataKey="techLength" name="Tech Length (km)" stroke="#2563eb" strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-slate-400">No hyperscaler data</div>}
                </Section>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                     <Section title="Infrastructure Age Risk" icon={Clock} contentHeight="h-[180px]">
                        {stats.ageData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stats.ageData} innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                                    <Cell fill="#ef4444" />
                                    <Cell fill="#f59e0b" />
                                    <Cell fill="#10b981" />
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-slate-400">No age data</div>}
                    </Section>
                </div>

                <div className="lg:col-span-1">
                     <KPICard 
                        title="Vulnerable Nations" 
                        value={stats.riskCountries}
                        subtext="Countries with only 1 cable connection"
                        icon={AlertCircle} 
                        color="#ef4444" 
                    />
                     <div className="mt-4">
                        <KPICard 
                            title="Strategic Reach" 
                            value={stats.lengthData.find(d => d.name.includes('Long'))?.value || 0}
                            subtext="Long-haul (>5k km) systems"
                            icon={BarChart2} 
                            color="#6366f1" 
                        />
                     </div>
                </div>

                <div className="lg:col-span-2">
                    <Section title="Future Battlegrounds: Top Planned Projects" icon={Navigation}>
                        {stats.topPlanned.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={stats.topPlanned} layout="vertical" margin={{ left: 10, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} interval={0} />
                                <RechartsTooltip />
                                <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-slate-400">No planned projects</div>}
                    </Section>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <h3 className="font-semibold text-slate-800 flex items-center gap-2">
               <Navigation className="w-4 h-4" />
               Cable Database
             </h3>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search cables, owners, countries..." 
                  className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
          
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 border-b border-slate-200">Cable Name</th>
                  <th className="px-6 py-3 border-b border-slate-200">RFS</th>
                  <th className="px-6 py-3 border-b border-slate-200">Length (km)</th>
                  <th className="px-6 py-3 border-b border-slate-200">Landing Points</th>
                  <th className="px-6 py-3 border-b border-slate-200">Owners</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCables.map((cable, idx) => (
                  <tr key={cable.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-blue-600">
                      {cable.name}
                      {cable.is_planned && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                          PLANNED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{cable.rfs_year || 'TBD'}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{cable.length ? formatNumber(parseLength(cable.length)).replace('k', '') : '-'}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs">
                      <div className="flex flex-col gap-1">
                          <span className="font-semibold text-xs text-slate-700">{cable.landing_points?.length || 0} Points</span>
                          <span className="text-xs text-slate-500 truncate" title={cable.landing_points?.map(p => p.country).join(', ')}>
                            {cable.landing_points?.slice(0, 3).map(p => p.country).join(', ')}
                            {cable.landing_points?.length > 3 && '...'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={cable.owners}>
                      {cable.owners || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 text-center">
             Showing {filteredCables.length} of {data.length} records
          </div>
        </div>

      </main>

      <footer className="bg-slate-900 text-slate-400 py-6 text-sm border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>
                    Data provided by <a href="https://www.submarinecablemap.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">TeleGeography</a>
                </span>
            </div>
            <div className="flex items-center gap-6">
                <span>© {new Date().getFullYear()} Submarine Cable Explorer</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-500">Visualization powered by React & Recharts</span>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return <Dashboard data={cableData || []} />;
}