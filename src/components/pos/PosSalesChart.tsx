import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Receipt,
  Award,
  ChevronDown,
  ChevronUp,
  BarChart2,
} from 'lucide-react';

interface DaySalesData {
  dateKey: string;
  dayLabel: string;
  shortDate: string;
  salesUSD: number;
  salesCDF: number;
  transactions: number;
  isToday: boolean;
}

export const PosSalesChart: React.FC = () => {
  const { sales, settings } = useApp();
  const [chartType, setChartType] = useState<'BAR' | 'AREA'>('BAR');
  const [metric, setMetric] = useState<'SALES' | 'TRANSACTIONS'>('SALES');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const rate = settings.exchangeRateUSD_CDF || 2850;

  // Compute daily sales for the last 7 days
  const last7DaysData = useMemo(() => {
    const days: DaySalesData[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const localDateKey = `${y}-${m}-${dayNum}`;
      const isoDateKey = d.toISOString().slice(0, 10);

      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const monthNames = [
        'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
        'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
      ];

      const dayName = i === 0 ? "Aujourd'hui" : `${dayNames[d.getDay()]} ${d.getDate()}`;
      const shortDate = `${d.getDate()} ${monthNames[d.getMonth()]}`;

      // Filter sales that happened on this day
      const daySales = sales.filter((s) => {
        if (!s.createdAt) return false;
        const saleDate = s.createdAt.slice(0, 10);
        return saleDate === localDateKey || saleDate === isoDateKey;
      });

      const totalUSD = daySales.reduce((sum, s) => sum + (s.totalUSD || 0), 0);
      const totalCDF = Math.round(totalUSD * rate);

      days.push({
        dateKey: localDateKey,
        dayLabel: dayName,
        shortDate,
        salesUSD: Number(totalUSD.toFixed(2)),
        salesCDF: totalCDF,
        transactions: daySales.length,
        isToday: i === 0,
      });
    }

    return days;
  }, [sales, rate]);

  // Aggregate stats over the 7 days
  const stats = useMemo(() => {
    const totalUSD = last7DaysData.reduce((acc, d) => acc + d.salesUSD, 0);
    const totalTx = last7DaysData.reduce((acc, d) => acc + d.transactions, 0);
    const avgPerDay = totalUSD / 7;
    const avgBasket = totalTx > 0 ? totalUSD / totalTx : 0;

    let bestDay = last7DaysData[0];
    for (const d of last7DaysData) {
      if (d.salesUSD > (bestDay?.salesUSD || 0)) {
        bestDay = d;
      }
    }

    return {
      totalUSD,
      totalCDF: Math.round(totalUSD * rate),
      totalTx,
      avgPerDay,
      avgBasket,
      bestDay,
    };
  }, [last7DaysData, rate]);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden mb-4 transition-all">
      {/* Header with KPI & Toggle */}
      <div className="p-3 sm:p-4 bg-neutral-50/70 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-neutral-900">
                Tendances Ventes Quotidiennes (7 Derniers Jours)
              </h3>
              <span className="text-[10px] font-mono-nums font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                ${stats.totalUSD.toFixed(2)} USD
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Visualisation en temps réel Recharts des encaissements et tickets de caisse
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Controls */}
          {!isCollapsed && (
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-neutral-200 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setMetric('SALES')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  metric === 'SALES'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Ventes ($)
              </button>
              <button
                type="button"
                onClick={() => setMetric('TRANSACTIONS')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  metric === 'TRANSACTIONS'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Tickets
              </button>
              <span className="w-px h-3.5 bg-neutral-200 mx-1"></span>
              <button
                type="button"
                onClick={() => setChartType(chartType === 'BAR' ? 'AREA' : 'BAR')}
                className="px-2 py-1 text-[11px] text-neutral-600 hover:text-neutral-900 font-medium"
                title="Changer le style de graphique (Barres / Courbe)"
              >
                {chartType === 'BAR' ? 'Barres' : 'Courbe'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 rounded-lg transition-colors"
            title={isCollapsed ? 'Déplier le graphique' : 'Replier le graphique'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
                Total 7 Jours
              </span>
              <div className="font-bold text-sm text-neutral-900 mt-0.5">
                ${stats.totalUSD.toFixed(2)}
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">
                {new Intl.NumberFormat('fr-FR').format(stats.totalCDF)} FC
              </span>
            </div>

            <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
                Tickets Émis
              </span>
              <div className="font-bold text-sm text-neutral-900 mt-0.5">
                {stats.totalTx} {stats.totalTx > 1 ? 'tickets' : 'ticket'}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                Panier moyen : ${stats.avgBasket.toFixed(2)}
              </span>
            </div>

            <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
                Moyenne / Jour
              </span>
              <div className="font-bold text-sm text-neutral-900 mt-0.5">
                ${stats.avgPerDay.toFixed(2)}
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">
                {new Intl.NumberFormat('fr-FR').format(Math.round(stats.avgPerDay * rate))} FC/j
              </span>
            </div>

            <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200/60">
              <span className="text-[10px] text-amber-800 uppercase tracking-wider block font-semibold flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-600" />
                Pic de Vente
              </span>
              <div className="font-bold text-sm text-neutral-900 mt-0.5">
                ${(stats.bestDay?.salesUSD || 0).toFixed(2)}
              </div>
              <span className="text-[10px] text-amber-700 font-medium">
                {stats.bestDay?.dayLabel || 'N/A'}
              </span>
            </div>
          </div>

          {/* Recharts Canvas */}
          <div className="h-44 sm:h-52 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'BAR' ? (
                <BarChart data={last7DaysData} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => (metric === 'SALES' ? `$${val}` : `${val}`)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as DaySalesData;
                      return (
                        <div className="bg-neutral-900 text-white text-xs p-2.5 rounded-lg shadow-xl border border-neutral-700 space-y-1">
                          <p className="font-bold text-amber-400 flex items-center justify-between gap-3">
                            <span>{data.shortDate} ({data.dayLabel})</span>
                            {data.isToday && (
                              <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1 rounded">
                                En cours
                              </span>
                            )}
                          </p>
                          <div className="text-[11px] font-mono-nums space-y-0.5">
                            <p className="text-white">
                              Ventes : <span className="font-bold text-emerald-400">${data.salesUSD.toFixed(2)} USD</span>
                            </p>
                            <p className="text-neutral-400">
                              En Francs : {new Intl.NumberFormat('fr-FR').format(data.salesCDF)} FC
                            </p>
                            <p className="text-neutral-300 border-t border-neutral-800 pt-0.5">
                              Tickets : <span className="font-semibold text-white">{data.transactions}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey={metric === 'SALES' ? 'salesUSD' : 'transactions'}
                    fill={metric === 'SALES' ? '#f59e0b' : '#3b82f6'}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              ) : (
                <AreaChart data={last7DaysData} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => (metric === 'SALES' ? `$${val}` : `${val}`)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as DaySalesData;
                      return (
                        <div className="bg-neutral-900 text-white text-xs p-2.5 rounded-lg shadow-xl border border-neutral-700 space-y-1">
                          <p className="font-bold text-amber-400">
                            {data.shortDate} ({data.dayLabel})
                          </p>
                          <div className="text-[11px] font-mono-nums">
                            <p>Ventes : ${data.salesUSD.toFixed(2)} USD ({new Intl.NumberFormat('fr-FR').format(data.salesCDF)} FC)</p>
                            <p className="text-neutral-400">Tickets : {data.transactions}</p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric === 'SALES' ? 'salesUSD' : 'transactions'}
                    stroke={metric === 'SALES' ? '#f59e0b' : '#3b82f6'}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill={metric === 'SALES' ? 'url(#salesGrad)' : 'url(#txGrad)'}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
