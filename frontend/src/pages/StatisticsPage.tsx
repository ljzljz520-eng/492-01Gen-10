import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { Volunteer, STATUS_MAP, POSITION_TYPE_MAP } from '../types'

export default function StatisticsPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<any>(null)
  const [positionStats, setPositionStats] = useState<any[]>([])
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null)
  const [volunteerStats, setVolunteerStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchId, setSearchId] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<any>('/statistics/summary'),
      api.get<any[]>('/statistics/positions'),
      api.get<Volunteer[]>('/volunteers')
    ]).then(([s, p, v]) => {
      setSummary(s)
      setPositionStats(p)
      setVolunteers(v)
      setLoading(false)
    })
  }, [])

  const fetchVolunteerStats = async (vid: string) => {
    try {
      const data: any = await api.get(`/statistics/volunteer/${vid}`)
      setVolunteerStats(data)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const getCompletedVolunteers = () => {
    return volunteers.filter(v => {
      const completed = (v as any).assignments?.filter((a: any) => a.status === 'completed') || []
      return completed.length > 0
    })
  }

  const completedVolunteers = getCompletedVolunteers()

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4" />
        <p className="text-gray-500">加载统计数据中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '总报名人数', value: summary?.total_volunteers || 0, icon: '👥', sub: `已培训 ${summary?.trained_volunteers || 0} 人`, color: 'from-blue-500 to-indigo-600' },
          { label: '已分配岗位', value: summary?.assigned_volunteers || 0, icon: '📍', sub: `共 ${summary?.total_assignments || 0} 次分配`, color: 'from-green-500 to-emerald-600' },
          { label: '服务总时长', value: `${summary?.total_service_hours || 0} 小时`, icon: '⏱️', sub: `${summary?.total_service_minutes || 0} 分钟`, color: 'from-accent-500 to-orange-600' },
          { label: '完成服务', value: summary?.completed_assignments || 0, icon: '✅', sub: `迟到 ${summary?.late_count || 0} 次`, color: 'from-purple-500 to-pink-600' }
        ].map((item, idx) => (
          <div key={idx} className="card p-6 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br ${item.color} -translate-y-8 translate-x-8`} />
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl mb-4 shadow-md relative z-10`}>
              {item.icon}
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1 relative z-10">{item.value}</div>
            <div className="text-sm text-gray-500 mb-2 relative z-10">{item.label}</div>
            <div className="text-xs text-gray-400 relative z-10">{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <span>📊</span> 岗位类型分布
          </h3>
          <div className="space-y-5">
            {positionStats.map(s => {
              const total = s.total || 1
              const filledPct = (s.filled / total) * 100
              const openPct = (s.open / total) * 100
              const meta: Record<string, { label: string; color: string; icon: string }> = {
                language: { label: '语言服务', color: 'bg-blue-500', icon: '🌐' },
                medical: { label: '医疗服务', color: 'bg-red-500', icon: '🏥' },
                guidance: { label: '引导服务', color: 'bg-green-500', icon: '🧭' },
                security: { label: '安检服务', color: 'bg-purple-500', icon: '🛡️' }
              }
              const m = meta[s.type] || { label: s.type, color: 'bg-gray-500', icon: '📌' }
              return (
                <div key={s.type}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.icon}</span>
                      <span className="font-medium">{m.label}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <strong className="text-gray-900">{s.filled}</strong> / {s.total} 已分配
                    </div>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className={`${m.color} transition-all`} style={{ width: `${filledPct}%` }} />
                    <div className="bg-gray-300" style={{ width: `${openPct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>分配率 {filledPct.toFixed(0)}%</span>
                    <span>剩余 {s.open} 个空缺</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <span>📈</span> 志愿者状态分布
          </h3>
          <div className="space-y-3">
            {Object.entries(STATUS_MAP).slice(0, 7).map(([key, info]) => {
              const count = volunteers.filter(v => v.status === key).length
              const pct = volunteers.length ? (count / volunteers.length) * 100 : 0
              return (
                <div key={key} className="flex items-center gap-4">
                  <span className={`badge ${info.color} w-24 justify-center text-xs py-1.5`}>{info.label}</span>
                  <div className="flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-lg transition-all flex items-center justify-end pr-2"
                      style={{ width: `${pct}%`, minWidth: count > 0 ? '40px' : '0' }}>
                      {count > 0 && <span className="text-xs text-white font-bold">{count}</span>}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 w-16 text-right">{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <span>🏅</span> 志愿者服务排行榜
            <span className="text-sm font-normal text-gray-500">（按服务时长排序）</span>
          </h3>
          <div className="flex gap-2 items-center">
            <input type="text" className="input-field max-w-xs" placeholder="输入志愿者ID查询详情..."
              value={searchId} onChange={e => setSearchId(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchId.trim()) { fetchVolunteerStats(searchId.trim()); setSelectedVolunteer(volunteers.find(v => v.id === searchId.trim()) || null) } }} />
            <button onClick={() => { if (searchId.trim()) { fetchVolunteerStats(searchId.trim()); setSelectedVolunteer(volunteers.find(v => v.id === searchId.trim()) || null) } }}
              className="btn btn-primary">查询</button>
          </div>
        </div>

        {completedVolunteers.length > 0 ? (
          <RankingList volunteers={volunteers} onSelect={(v) => { setSelectedVolunteer(v); fetchVolunteerStats(v.id); setSearchId(v.id) }} />
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">🏃</div>
            <p>暂无已完成服务的志愿者记录</p>
            <p className="text-xs mt-2">志愿者签到签退后将在此展示统计数据</p>
          </div>
        )}
      </div>

      {selectedVolunteer && volunteerStats && (
        <div className="card p-6 border-l-4 border-primary-500">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold mb-1">👤 {selectedVolunteer.name} 的服务详情</h3>
              <p className="text-sm text-gray-500 font-mono">ID: {selectedVolunteer.id}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/volunteer/${selectedVolunteer.id}`)} className="btn btn-secondary">
                进入志愿者中心
              </button>
              <button onClick={() => { setSelectedVolunteer(null); setVolunteerStats(null) }} className="btn btn-secondary">
                关闭
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            {[
              { label: '累计服务时长', value: `${volunteerStats.total_service_hours}时${volunteerStats.total_service_minutes % 60}分`, icon: '⏱️', color: 'bg-blue-50 text-blue-700' },
              { label: '完成任务数', value: `${volunteerStats.completed_assignments}/${volunteerStats.total_assignments}`, icon: '✅', color: 'bg-green-50 text-green-700' },
              { label: '准时率', value: `${volunteerStats.on_time_rate}%`, icon: '⏰', color: volunteerStats.late_count > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700' },
              { label: '迟到次数', value: volunteerStats.late_count, icon: '⚠️', color: volunteerStats.late_count > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700' }
            ].map((item, idx) => (
              <div key={idx} className={`rounded-xl p-5 ${item.color}`}>
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-2xl font-bold">{item.value}</div>
                <div className="text-sm opacity-80 mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold mb-4 text-gray-700">📋 岗位参与分布</h4>
              <div className="space-y-3">
                {Object.entries(volunteerStats.skill_stats as Record<string, number>).map(([key, count]) => {
                  const label = POSITION_TYPE_MAP[key] || key
                  const total = Object.values(volunteerStats.skill_stats as Record<string, number>).reduce((s: number, n: number) => s + n, 0) || 1
                  const pct = (count / total) * 100
                  const meta: Record<string, string> = { language: '🌐', medical: '🏥', guidance: '🧭', security: '🛡️' }
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{meta[key] || '📌'} {label}</span>
                        <span className="font-medium">{count} 次 ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-gray-700">📅 服务记录明细</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {volunteerStats.assignments.map((a: any) => (
                  <div key={a.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm">{POSITION_TYPE_MAP[a.position_type] || a.position_type} · {a.venue_name}</span>
                      <span className={`badge ${STATUS_MAP[a.status]?.color}`}>{STATUS_MAP[a.status]?.label}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{a.date} {a.shift_name} {a.start_time}-{a.end_time}</span>
                      {a.status === 'completed' && (
                        <span className={a.is_late ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                          {Math.floor(a.service_minutes / 60)}时{a.service_minutes % 60}分
                          {a.is_late && ' · 迟到'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RankingList({ volunteers, onSelect }: { volunteers: Volunteer[]; onSelect: (v: Volunteer) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [ranked, setRanked] = useState<any[]>([])

  useEffect(() => {
    const promises = volunteers.map(v => api.get(`/statistics/volunteer/${v.id}`).catch(() => null))
    Promise.all(promises).then(results => {
      const list = results.map((r: any, i) => r ? { volunteer: volunteers[i], stats: r } : null).filter(Boolean)
      list.sort((a: any, b: any) => b.stats.total_service_minutes - a.stats.total_service_minutes)
      setRanked(list.filter((x: any) => x.stats.completed_assignments > 0))
    })
  }, [volunteers])

  const display = expanded ? ranked : ranked.slice(0, 5)
  const medals = ['🥇', '🥈', '🥉']

  if (ranked.length === 0) return <div className="text-center py-8 text-gray-400">暂无排名数据</div>

  return (
    <div>
      <div className="space-y-3">
        {display.map((item: any, idx: number) => {
          const isTop3 = idx < 3
          return (
            <div key={item.volunteer.id} className={`p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all hover:shadow-md ${
              isTop3 ? `bg-gradient-to-r ${idx === 0 ? 'from-yellow-50 to-amber-50 border border-yellow-200' : idx === 1 ? 'from-gray-50 to-slate-100 border border-gray-200' : 'from-orange-50 to-amber-50 border border-orange-200'}` : 'bg-gray-50 hover:bg-white border border-transparent'
            }`}
              onClick={() => onSelect(item.volunteer)}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                isTop3 ? 'text-2xl' : 'bg-white border-2 border-gray-200 text-gray-600 text-lg'
              }`}>
                {isTop3 ? medals[idx] : idx + 1}
              </div>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 text-white flex items-center justify-center font-bold">
                  {item.volunteer.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{item.volunteer.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    完成 {item.stats.completed_assignments} 次任务 · 准时率 {item.stats.on_time_rate}%
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-bold text-primary-600">{item.stats.total_service_hours}
                  <span className="text-sm text-gray-400 font-normal ml-1">小时</span>
                </div>
                <div className="text-xs text-gray-400">
                  {item.stats.total_service_minutes} 分钟
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {ranked.length > 5 && (
        <div className="text-center mt-4">
          <button onClick={() => setExpanded(!expanded)} className="btn btn-secondary">
            {expanded ? '收起' : `查看全部 ${ranked.length} 名 →`}
          </button>
        </div>
      )}
    </div>
  )
}
