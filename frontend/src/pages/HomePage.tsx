import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

interface StatsSummary {
  total_volunteers: number
  trained_volunteers: number
  assigned_volunteers: number
  total_assignments: number
  completed_assignments: number
  total_service_hours: number
  late_count: number
  substitute_count: number
}

export default function HomePage() {
  const [stats, setStats] = useState<StatsSummary | null>(null)

  useEffect(() => {
    api.get<StatsSummary>('/statistics/summary').then((data) => setStats(data))
  }, [])

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 text-white p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur rounded-full text-sm mb-6">
            <span>🎯</span>
            <span>2026 国际体育赛事</span>
          </div>
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            汇聚志愿力量，<br />
            <span className="text-accent-100">共襄赛事盛典</span>
          </h1>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            从报名、培训、岗位分配到服务统计，一站式志愿者管理平台。
            智能匹配技能与岗位，高效保障赛事每一个环节。
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              <span>📝</span>
              <span>立即报名</span>
            </Link>
            <Link
              to="/volunteer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/20 backdrop-blur text-white font-bold rounded-xl border border-white/30 hover:bg-white/30 transition-all"
            >
              <span>👤</span>
              <span>志愿者入口</span>
            </Link>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '报名人数', value: stats.total_volunteers, icon: '👥', color: 'from-blue-500 to-blue-600' },
            { label: '已培训', value: stats.trained_volunteers, icon: '🎓', color: 'from-green-500 to-green-600' },
            { label: '已分配岗位', value: stats.assigned_volunteers, icon: '📍', color: 'from-accent-500 to-accent-600' },
            { label: '服务总时长(时)', value: stats.total_service_hours, icon: '⏱️', color: 'from-purple-500 to-purple-600' },
          ].map((item, idx) => (
            <div key={idx} className="card p-6 hover:shadow-md transition-all">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl mb-4 shadow-md`}>
                {item.icon}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{item.value}</div>
              <div className="text-sm text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {[
          {
            title: '技能匹配',
            desc: '基于语言、医疗、引导、安检四类核心经验，智能匹配最适合的岗位',
            icon: '🎯',
            color: 'bg-blue-50 border-blue-200'
          },
          {
            title: '班次管理',
            desc: '按场馆与班次灵活分配，支持多场地、多时段的复杂排班需求',
            icon: '📅',
            color: 'bg-green-50 border-green-200'
          },
          {
            title: '凭证入场',
            desc: '确认后自动生成唯一入场凭证，扫码验证，安全高效',
            icon: '🎫',
            color: 'bg-accent-50 border-accent-200'
          },
          {
            title: '智能替补',
            desc: '临时缺人时自动推荐同技能志愿者，快速响应调度需求',
            icon: '🔄',
            color: 'bg-purple-50 border-purple-200'
          },
          {
            title: '服务统计',
            desc: '自动统计服务时长、出勤率，精准记录每一份付出',
            icon: '📊',
            color: 'bg-red-50 border-red-200'
          },
          {
            title: '证明发放',
            desc: '自动判定优秀志愿者条件，一键生成电子证明与证书',
            icon: '🏅',
            color: 'bg-yellow-50 border-yellow-200'
          }
        ].map((item, idx) => (
          <div key={idx} className={`card p-6 border-2 ${item.color} hover:shadow-lg transition-all hover:-translate-y-1`}>
            <div className="text-4xl mb-4">{item.icon}</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="card p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">📋 志愿者服务流程</h2>
        <div className="grid md:grid-cols-5 gap-4">
          {[
            { step: '1', title: '在线报名', desc: '填写个人信息与技能经验', icon: '📝' },
            { step: '2', title: '培训考核', desc: '参加统一培训并通过考核', icon: '🎓' },
            { step: '3', title: '岗位分配', desc: '组委会按场馆班次分配岗位', icon: '📍' },
            { step: '4', title: '确认签到', desc: '确认岗位后生成入场凭证', icon: '🎫' },
            { step: '5', title: '服务完成', desc: '统计时长发放服务证明', icon: '🏅' }
          ].map((item, idx) => (
            <div key={idx} className="relative text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-3xl shadow-lg mb-4">
                {item.icon}
              </div>
              <div className="absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-300 to-transparent -translate-x-1/2 hidden md:block" />
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-sm font-bold mb-2">{item.step}</div>
              <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 px-6 py-3 card hover:shadow-md transition-all text-gray-700 font-medium"
        >
          <span>⚙️</span>
          <span>组委会管理后台</span>
        </Link>
        <Link
          to="/statistics"
          className="inline-flex items-center gap-2 px-6 py-3 card hover:shadow-md transition-all text-gray-700 font-medium"
        >
          <span>📊</span>
          <span>查看数据统计</span>
        </Link>
        <Link
          to="/certifications"
          className="inline-flex items-center gap-2 px-6 py-3 card hover:shadow-md transition-all text-gray-700 font-medium"
        >
          <span>🏅</span>
          <span>证明管理中心</span>
        </Link>
      </div>
    </div>
  )
}
