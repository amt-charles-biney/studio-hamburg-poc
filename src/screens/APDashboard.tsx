import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AlarmClock,
  Activity,
  CheckCircle2,
  ChevronRight,
  Hourglass,
  Layers,
  LineChart as LineChartIcon,
  Send,
  ShieldCheck,
  Timer,
  TrendingUp,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { SectionTitle } from '@/components/ui/primitives'
import { Avatar } from '@/components/ui/Avatar'
import { SlaBadge } from '@/components/invoice/tags'
import { bucketVisual } from '@/lib/statusMeta'
import { statusBucketFor } from '@/engine/status'
import { slaInfo } from '@/engine/sla'
import { currentStep, effectiveActorId } from '@/engine/approval'
import { daysBetween } from '@/engine/util'
import { monthly, throughput } from '@/data/analytics'
import type { StatusBucket } from '@/types'

// Recharts renders raw SVG, so it needs hex — mirror the tailwind bucket palette.
const bucketHex: Record<StatusBucket, string> = {
  pending_you: '#f59e0b',
  waiting_others: '#0ea5e9',
  approved: '#10b981',
  exported: '#8b5cf6',
  rejected: '#f43f5e',
  error: '#ef4444',
  manual: '#64748b',
  duplicate: '#f97316',
  incomplete: '#a1a1aa',
  new: '#6366f1',
}

const tooltipStyle: CSSProperties = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 8px 24px -8px rgb(15 23 42 / 0.18)',
  fontSize: 12,
  padding: '8px 12px',
}

const axisTick = { fontSize: 11, fill: '#94a3b8' }

function DemoBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-400">
      <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />
      {label}
    </span>
  )
}

function ChartCard({
  icon,
  title,
  sub,
  action,
  delay,
  children,
}: {
  icon: LucideIcon
  title: string
  sub?: string
  action?: ReactNode
  delay: number
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="card p-5"
    >
      <SectionTitle icon={icon} action={action}>
        {title}
      </SectionTitle>
      {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
      {children}
    </motion.div>
  )
}

export function APDashboard() {
  const { t, formatCurrency, formatNumber } = useI18n()
  const invoices = useStore((s) => s.invoices)
  const config = useStore((s) => s.config)
  const getUser = useStore((s) => s.getUser)

  const metrics = useMemo(() => {
    const closed = invoices.filter((i) => i.status === 'APPROVED' || i.status === 'EXPORTED')
    let sum = 0
    let n = 0
    for (const inv of closed) {
      const created = inv.approvalHistory.find((e) => e.action === 'CREATED')?.timestamp ?? inv.createdAt
      const approvals = inv.approvalHistory.filter((e) => e.action === 'APPROVED')
      const close = approvals.length ? approvals[approvals.length - 1].timestamp : undefined
      if (created && close) {
        sum += daysBetween(created, close)
        n += 1
      }
    }
    return {
      avgApproval: n ? sum / n : 0,
      inFlight: invoices.filter((i) => i.status === 'IN_REVIEW').length,
      approvedMonth: closed.length,
      slaRisk: invoices.filter((i) => {
        const s = slaInfo(i, config)
        return s.overdue || s.dueSoon
      }).length,
      exported: invoices.filter((i) => i.status === 'EXPORTED').length,
      rejected: invoices.filter((i) => i.status === 'REJECTED').length,
    }
  }, [invoices, config])

  const statusData = useMemo(() => {
    const counts = new Map<StatusBucket, number>()
    for (const inv of invoices) {
      const bucket = statusBucketFor(inv, false)
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([bucket, count]) => ({
        bucket,
        count,
        name: t(bucketVisual[bucket].labelKey),
        color: bucketHex[bucket],
      }))
      .sort((a, b) => b.count - a.count)
  }, [invoices, t])

  const backlogData = useMemo(() => {
    const tally = new Map<string, number>()
    for (const inv of invoices) {
      if (inv.status !== 'IN_REVIEW') continue
      const step = currentStep(inv)
      if (!step || step.state !== 'current') continue
      const actor = effectiveActorId(step)
      if (!actor) continue
      tally.set(actor, (tally.get(actor) ?? 0) + 1)
    }
    return Array.from(tally.entries())
      .map(([userId, count]) => ({ userId, count, name: getUser(userId)?.name ?? userId }))
      .sort((a, b) => b.count - a.count)
  }, [invoices, getUser])

  const slaList = useMemo(() => {
    return invoices
      .filter((i) => i.status === 'IN_REVIEW')
      .map((inv) => ({ inv, sla: slaInfo(inv, config) }))
      .filter((x) => x.sla.overdue || x.sla.dueSoon)
      .sort((a, b) => b.sla.daysWaiting - a.sla.daysWaiting)
  }, [invoices, config])

  const compactEur = (v: number) => '€' + formatNumber(Math.round(v / 1000)) + 'k'
  const demoBadge = <DemoBadge label={t('dash.demoData')} />

  return (
    <div>
      <PageHeader title={t('dash.title')} subtitle={t('dash.subtitle')} />

      {/* KPI row */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Timer} tone="brand" label={t('dash.metric.avgApproval')} value={metrics.avgApproval} decimals={1} suffix={' ' + t('dash.metric.avgApproval.unit')} delay={0} />
        <StatCard icon={Hourglass} tone="sky" label={t('dash.metric.inFlight')} value={metrics.inFlight} delay={0.05} />
        <StatCard icon={CheckCircle2} tone="emerald" label={t('dash.metric.approvedMonth')} value={metrics.approvedMonth} delay={0.1} />
        <StatCard icon={AlarmClock} tone="rose" label={t('dash.metric.slaRisk')} value={metrics.slaRisk} delay={0.15} />
        <StatCard icon={Send} tone="violet" label={t('dash.metric.exported')} value={metrics.exported} delay={0.2} />
        <StatCard icon={XCircle} tone="amber" label={t('dash.metric.rejected')} value={metrics.rejected} delay={0.25} />
      </div>

      {/* Hero: throughput area chart */}
      <ChartCard icon={TrendingUp} title={t('dash.chart.throughput')} sub={t('dash.chart.throughput.sub')} action={demoBadge} delay={0.3}>
        <div className="mt-4" style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={throughput} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="gReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="received" name={t('dash.series.received')} stroke="#6366f1" strokeWidth={2.5} fill="url(#gReceived)" />
              <Area type="monotone" dataKey="approved" name={t('dash.series.approved')} stroke="#10b981" strokeWidth={2.5} fill="url(#gApproved)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Monthly volume & spend + cycle-time trend */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartCard icon={Activity} title={t('dash.chart.monthly')} sub={t('dash.chart.monthly.sub')} action={demoBadge} delay={0.36}>
          <div className="mt-4" style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthly} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} width={30} />
                <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={44} tickFormatter={compactEur} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) =>
                    name === t('dash.series.spend') ? formatCurrency(value) : formatNumber(value)
                  }
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar yAxisId="left" dataKey="volume" name={t('dash.series.volume')} fill="#a5b4fc" radius={[6, 6, 0, 0]} barSize={22} />
                <Line yAxisId="right" type="monotone" dataKey="spend" name={t('dash.series.spend')} stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard icon={LineChartIcon} title={t('dash.chart.cycleTime')} sub={t('dash.chart.cycleTime.sub')} action={demoBadge} delay={0.42}>
          <div className="mt-4" style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughput} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="gCycle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} domain={[0, 'dataMax + 1']} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toFixed(1)} />
                <Area type="monotone" dataKey="cycleDays" name={t('dash.series.cycle')} stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gCycle)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Status donut + approver backlog */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartCard icon={Layers} title={t('dash.chart.byStatus')} delay={0.48}>
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
            <div className="w-full sm:w-1/2" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="count" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2} stroke="none">
                    {statusData.map((d) => (
                      <Cell key={d.bucket} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-1.5 sm:w-1/2">
              {statusData.map((d) => (
                <li key={d.bucket} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 truncate text-ink-600">{d.name}</span>
                  <span className="font-semibold text-ink-900 tabular">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard icon={Users} title={t('dash.chart.backlog')} sub={t('dash.chart.backlog.sub')} delay={0.54}>
          {backlogData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-ink-400">{t('dash.backlog.none')}</div>
          ) : (
            <div className="mt-4" style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={backlogData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(99,102,241,0.06)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name={t('dash.chart.backlog')} fill="#6366f1" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Approaching / past SLA */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.35 }} className="card mt-5 p-5">
        <SectionTitle icon={AlarmClock}>{t('dash.chart.sla')}</SectionTitle>
        <p className="mt-0.5 text-xs text-ink-400">{t('dash.chart.sla.sub', { n: config.slaDaysThreshold })}</p>

        {slaList.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-2xl bg-emerald-50 px-6 py-10 text-center ring-1 ring-emerald-100">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <ShieldCheck size={24} />
            </span>
            <p className="text-sm font-semibold text-emerald-700">{t('dash.sla.none')}</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {slaList.map(({ inv, sla }, i) => {
              const step = currentStep(inv)
              const actorId = step ? effectiveActorId(step) : null
              const actor = actorId ? getUser(actorId) : undefined
              return (
                <motion.li key={inv.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                  <Link
                    to={`/invoice/${inv.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-ink-200/70 bg-white px-3.5 py-3 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-300/70 hover:shadow-card focus-ring"
                  >
                    <span className={`h-9 w-1 shrink-0 rounded-full ${sla.overdue ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink-900">{inv.creditorName}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-400">
                        <span className="font-mono text-[11px] text-ink-500">{inv.systemInvoiceNumber}</span>
                        <span className="text-ink-300">·</span>
                        <span className="tabular">{formatCurrency(inv.totalAmount, inv.currency)}</span>
                      </div>
                    </div>
                    <SlaBadge sla={sla} />
                    {actor && <Avatar user={actor} size="sm" />}
                    <ChevronRight size={18} className="hidden shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500 sm:block" />
                  </Link>
                </motion.li>
              )
            })}
          </ul>
        )}
      </motion.div>
    </div>
  )
}
