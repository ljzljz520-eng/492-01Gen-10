export interface Volunteer {
  id: string
  name: string
  phone: string
  email?: string
  id_card?: string
  languages: string[]
  medical_experience?: string
  medical_level: number
  guidance_experience?: string
  guidance_level: number
  security_experience?: string
  security_level: number
  skills: string[]
  status: 'registered' | 'trained' | 'assigned' | 'confirmed' | 'in_progress' | 'completed'
  training_score?: number
  training_passed: number
  created_at: string
  updated_at: string
  assignments?: Assignment[]
  match_score?: number
  experience_count?: number
}

export interface Venue {
  id: number
  name: string
  location?: string
  capacity: number
  description?: string
  created_at: string
  shifts?: Shift[]
}

export interface Shift {
  id: number
  venue_id: number
  name: string
  start_time: string
  end_time: string
  date: string
  capacity: number
  total_positions?: number
  filled_positions?: number
}

export interface Position {
  id: number
  shift_id: number
  type: 'language' | 'medical' | 'guidance' | 'security'
  required_skill: string
  required_level: number
  volunteer_id?: string
  status: string
  volunteer_name?: string
  volunteer_phone?: string
}

export interface Assignment {
  id: number
  volunteer_id: string
  position_id: number
  shift_id: number
  venue_id: number
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'in_progress' | 'completed' | 'substituted'
  confirmed_at?: string
  check_in_time?: string
  check_out_time?: string
  is_late: number
  service_minutes: number
  shift_name?: string
  start_time?: string
  end_time?: string
  date?: string
  venue_name?: string
  position_type?: string
  credential_id?: number
  credential_code?: string
  qr_data?: string
}

export interface Credential {
  id: number
  volunteer_id: string
  assignment_id: number
  credential_code: string
  qr_data: string
  issued_at: string
  valid_until: string
  used: number
}

export interface Certification {
  id: number
  volunteer_id: string
  type: string
  title: string
  total_service_minutes: number
  on_time_rate: number
  is_excellent: number
  issued_at: string
  certificate_code: string
  volunteer_name?: string
  volunteer_phone?: string
}

export interface SubstituteLog {
  id: number
  original_assignment_id: number
  original_volunteer_id: string
  substitute_volunteer_id?: string
  position_id: number
  reason: string
  status: string
  created_at: string
  resolved_at?: string
  original_volunteer_name: string
  substitute_volunteer_name?: string
  shift_name: string
  venue_name: string
  position_type: string
}

export const POSITION_TYPE_MAP: Record<string, string> = {
  language: '语言服务',
  medical: '医疗服务',
  guidance: '引导服务',
  security: '安检服务'
}

export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  registered: { label: '已报名', color: 'bg-gray-100 text-gray-800' },
  trained: { label: '已培训', color: 'bg-blue-100 text-blue-800' },
  assigned: { label: '已分配', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '已确认', color: 'bg-green-100 text-green-800' },
  in_progress: { label: '服务中', color: 'bg-accent-100 text-accent-700' },
  completed: { label: '已完成', color: 'bg-purple-100 text-purple-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-600' },
  substituted: { label: '已替补', color: 'bg-orange-100 text-orange-800' },
  pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-800' },
  open: { label: '待分配', color: 'bg-gray-100 text-gray-600' }
}

export const LEVEL_OPTIONS = [
  { value: 0, label: '无经验' },
  { value: 1, label: '初级' },
  { value: 2, label: '中级' },
  { value: 3, label: '高级' }
]

export const LANGUAGE_OPTIONS = [
  '中文', '英语', '日语', '韩语', '法语', '德语', '西班牙语', '俄语', '阿拉伯语', '葡萄牙语', '其他'
]
