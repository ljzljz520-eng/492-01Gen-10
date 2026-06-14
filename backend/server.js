const express = require('express')
const cors = require('cors')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const { db, initDatabase } = require('./db')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

const parseJson = (str) => {
  try { return JSON.parse(str) } catch { return [] }
}

// ========== 志愿者相关 API ==========

app.post('/api/volunteers/register', async (req, res) => {
  const {
    name, phone, email, id_card,
    languages, medical_experience, medical_level,
    guidance_experience, guidance_level,
    security_experience, security_level,
    skills
  } = req.body

  if (!name || !phone) {
    return res.status(400).json({ error: '姓名和手机号必填' })
  }

  const id = uuidv4()
  const now = new Date().toISOString()

  await db.run(`
    INSERT INTO volunteers (
      id, name, phone, email, id_card,
      languages, medical_experience, medical_level,
      guidance_experience, guidance_level,
      security_experience, security_level,
      skills, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, name, phone, email || null, id_card || null,
    JSON.stringify(languages || []),
    medical_experience || null, medical_level || 0,
    guidance_experience || null, guidance_level || 0,
    security_experience || null, security_level || 0,
    JSON.stringify(skills || []),
    'registered', now, now
  ])

  res.json({ id, message: '报名成功' })
})

app.get('/api/volunteers', async (req, res) => {
  const { status, training_passed } = req.query
  let sql = 'SELECT * FROM volunteers WHERE 1=1'
  const params = []

  if (status) { sql += ' AND status = ?'; params.push(status) }
  if (training_passed !== undefined) {
    sql += ' AND training_passed = ?'
    params.push(training_passed === 'true' ? 1 : 0)
  }
  sql += ' ORDER BY created_at DESC'

  const volunteers = await db.all(sql, params)
  const result = volunteers.map(v => ({
    ...v,
    languages: parseJson(v.languages),
    skills: parseJson(v.skills)
  }))
  res.json(result)
})

app.get('/api/volunteers/:id', async (req, res) => {
  const volunteer = await db.get('SELECT * FROM volunteers WHERE id = ?', [req.params.id])
  if (!volunteer) return res.status(404).json({ error: '志愿者不存在' })

  volunteer.languages = parseJson(volunteer.languages)
  volunteer.skills = parseJson(volunteer.skills)

  const assignments = await db.all(`
    SELECT a.*, s.name as shift_name, s.start_time, s.end_time, s.date,
           v.name as venue_name, p.type as position_type,
           c.id as credential_id, c.credential_code, c.qr_data
    FROM assignments a
    JOIN shifts s ON a.shift_id = s.id
    JOIN venues v ON a.venue_id = v.id
    JOIN positions p ON a.position_id = p.id
    LEFT JOIN credentials c ON a.id = c.assignment_id
    WHERE a.volunteer_id = ?
    ORDER BY s.date, s.start_time
  `, [req.params.id])

  res.json({ ...volunteer, assignments })
})

app.put('/api/volunteers/:id/training', async (req, res) => {
  const { training_score, training_passed } = req.body
  const now = new Date().toISOString()

  const volunteer = await db.get('SELECT * FROM volunteers WHERE id = ?', [req.params.id])
  if (!volunteer) return res.status(404).json({ error: '志愿者不存在' })

  const newStatus = training_passed ? 'trained' : volunteer.status

  await db.run(`
    UPDATE volunteers
    SET training_score = ?, training_passed = ?, status = ?, updated_at = ?
    WHERE id = ?
  `, [training_score, training_passed ? 1 : 0, newStatus, now, req.params.id])

  res.json({ message: '培训结果已更新' })
})

// ========== 场馆相关 API ==========

app.get('/api/venues', async (req, res) => {
  const venues = await db.all('SELECT * FROM venues ORDER BY id')
  const result = []
  for (const venue of venues) {
    const shifts = await db.all(`
      SELECT s.*,
        (SELECT COUNT(*) FROM positions p WHERE p.shift_id = s.id) as total_positions,
        (SELECT COUNT(*) FROM positions p WHERE p.shift_id = s.id AND p.volunteer_id IS NOT NULL) as filled_positions
      FROM shifts s WHERE s.venue_id = ? ORDER BY date, start_time
    `, [venue.id])
    result.push({ ...venue, shifts })
  }
  res.json(result)
})

app.post('/api/venues', async (req, res) => {
  const { name, location, capacity, description } = req.body
  const now = new Date().toISOString()

  const info = await db.run(`
    INSERT INTO venues (name, location, capacity, description, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [name, location || null, capacity || 0, description || null, now])

  res.json({ id: info.lastID, message: '场馆创建成功' })
})

// ========== 班次相关 API ==========

app.post('/api/shifts', async (req, res) => {
  const { venue_id, name, start_time, end_time, date, capacity } = req.body
  const info = await db.run(`
    INSERT INTO shifts (venue_id, name, start_time, end_time, date, capacity)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [venue_id, name, start_time, end_time, date, capacity || 10])

  res.json({ id: info.lastID, message: '班次创建成功' })
})

app.get('/api/shifts/:id/positions', async (req, res) => {
  const positions = await db.all(`
    SELECT p.*, v.name as volunteer_name, v.phone as volunteer_phone
    FROM positions p
    LEFT JOIN volunteers v ON p.volunteer_id = v.id
    WHERE p.shift_id = ?
    ORDER BY p.type, p.required_level
  `, [req.params.id])
  res.json(positions)
})

// ========== 岗位分配 API ==========

app.get('/api/assignments/eligible-volunteers', async (req, res) => {
  const { position_id } = req.query
  const position = await db.get('SELECT * FROM positions WHERE id = ?', [position_id])
  if (!position) return res.status(404).json({ error: '岗位不存在' })

  let sql = `
    SELECT v.* FROM volunteers v
    WHERE v.training_passed = 1
      AND v.status IN ('trained', 'assigned')
      AND v.id NOT IN (
        SELECT a.volunteer_id FROM assignments a
        JOIN shifts s ON a.shift_id = s.id
        WHERE s.id = (SELECT shift_id FROM positions WHERE id = ?)
          AND a.status != 'cancelled'
      )
  `
  const params = [position_id]

  if (position.required_skill === 'medical_level') {
    sql += ' AND v.medical_level >= ?'; params.push(position.required_level)
  } else if (position.required_skill === 'guidance_level') {
    sql += ' AND v.guidance_level >= ?'; params.push(position.required_level)
  } else if (position.required_skill === 'security_level') {
    sql += ' AND v.security_level >= ?'; params.push(position.required_level)
  }

  sql += ' ORDER BY v.training_score DESC'
  const volunteers = await db.all(sql, params)
  const result = volunteers.map(v => ({
    ...v,
    languages: parseJson(v.languages),
    skills: parseJson(v.skills)
  }))
  res.json(result)
})

app.post('/api/assignments', async (req, res) => {
  const { volunteer_id, position_id } = req.body

  const position = await db.get('SELECT * FROM positions WHERE id = ?', [position_id])
  if (!position) return res.status(404).json({ error: '岗位不存在' })
  if (position.volunteer_id) return res.status(400).json({ error: '该岗位已被分配' })

  const volunteer = await db.get('SELECT * FROM volunteers WHERE id = ?', [volunteer_id])
  if (!volunteer) return res.status(404).json({ error: '志愿者不存在' })
  if (!volunteer.training_passed) return res.status(400).json({ error: '志愿者未通过培训' })

  const shift = await db.get('SELECT * FROM shifts WHERE id = ?', [position.shift_id])

  const info = await db.run(`
    INSERT INTO assignments (volunteer_id, position_id, shift_id, venue_id, status)
    VALUES (?, ?, ?, ?, 'pending')
  `, [volunteer_id, position_id, shift.id, shift.venue_id])

  await db.run(`
    UPDATE positions SET volunteer_id = ?, status = 'assigned' WHERE id = ?
  `, [volunteer_id, position_id])

  await db.run(`
    UPDATE volunteers SET status = 'assigned', updated_at = ? WHERE id = ?
  `, [new Date().toISOString(), volunteer_id])

  res.json({ assignment_id: info.lastID, message: '岗位分配成功' })
})

app.post('/api/assignments/:id/confirm', async (req, res) => {
  const assignment = await db.get('SELECT * FROM assignments WHERE id = ?', [req.params.id])
  if (!assignment) return res.status(404).json({ error: '分配记录不存在' })

  const now = new Date().toISOString()
  const credentialCode = 'CRED-' + uuidv4().substring(0, 8).toUpperCase()
  const qrData = JSON.stringify({
    assignment_id: assignment.id,
    volunteer_id: assignment.volunteer_id,
    code: credentialCode,
    timestamp: now
  })

  await db.run(`UPDATE assignments SET status = 'confirmed', confirmed_at = ? WHERE id = ?`, [now, req.params.id])
  await db.run(`UPDATE volunteers SET status = 'confirmed', updated_at = ? WHERE id = ?`, [now, assignment.volunteer_id])

  const validUntil = new Date(); validUntil.setDate(validUntil.getDate() + 30)
  await db.run(`
    INSERT INTO credentials (volunteer_id, assignment_id, credential_code, qr_data, issued_at, valid_until)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [assignment.volunteer_id, assignment.id, credentialCode, qrData, now, validUntil.toISOString()])

  const credential = await db.get('SELECT * FROM credentials WHERE assignment_id = ?', [req.params.id])
  res.json({ credential, message: '确认成功，入场凭证已生成' })
})

app.post('/api/assignments/:id/reject', async (req, res) => {
  const assignment = await db.get('SELECT * FROM assignments WHERE id = ?', [req.params.id])
  if (!assignment) return res.status(404).json({ error: '分配记录不存在' })

  await db.run(`UPDATE assignments SET status = 'rejected' WHERE id = ?`, [req.params.id])
  await db.run(`UPDATE positions SET volunteer_id = NULL, status = 'open' WHERE id = ?`, [assignment.position_id])

  res.json({ message: '已拒绝岗位分配' })
})

app.post('/api/assignments/:id/cancel', async (req, res) => {
  const assignment = await db.get('SELECT * FROM assignments WHERE id = ?', [req.params.id])
  if (!assignment) return res.status(404).json({ error: '分配记录不存在' })

  await db.run(`UPDATE assignments SET status = 'cancelled' WHERE id = ?`, [req.params.id])
  await db.run(`UPDATE positions SET volunteer_id = NULL, status = 'open' WHERE id = ?`, [assignment.position_id])

  res.json({ message: '分配已取消' })
})

// ========== 替补推荐 API ==========

app.get('/api/substitutes/recommendations', async (req, res) => {
  const { assignment_id, position_id } = req.query

  let position
  if (position_id) {
    position = await db.get('SELECT * FROM positions WHERE id = ?', [position_id])
  } else {
    position = await db.get(`
      SELECT p.* FROM positions p
      JOIN assignments a ON a.position_id = p.id
      WHERE a.id = ?
    `, [assignment_id])
  }
  if (!position) return res.status(404).json({ error: '岗位不存在' })

  const shift = await db.get('SELECT * FROM shifts WHERE id = ?', [position.shift_id])
  const venue = await db.get('SELECT * FROM venues WHERE id = ?', [shift.venue_id])

  let skillScoreSql = '0'
  if (position.required_skill === 'medical_level') skillScoreSql = 'v.medical_level * 10'
  else if (position.required_skill === 'guidance_level') skillScoreSql = 'v.guidance_level * 10'
  else if (position.required_skill === 'security_level') skillScoreSql = 'v.security_level * 10'

  const volunteers = await db.all(`
    SELECT v.*,
      (${skillScoreSql}) + COALESCE(v.training_score, 0) as match_score,
      (
        SELECT COUNT(*) FROM assignments a
        WHERE a.volunteer_id = v.id AND a.status = 'completed'
      ) as experience_count
    FROM volunteers v
    WHERE v.training_passed = 1
      AND v.id NOT IN (
        SELECT a2.volunteer_id FROM assignments a2
        WHERE a2.shift_id = ?
          AND a2.status NOT IN ('cancelled', 'rejected')
          AND a2.id != COALESCE(?, 0)
      )
      AND v.id != COALESCE((SELECT volunteer_id FROM assignments WHERE id = COALESCE(?, 0)), '')
    ORDER BY match_score DESC, experience_count DESC
    LIMIT 15
  `, [position.shift_id, assignment_id || 0, assignment_id || 0])

  const result = volunteers.map(v => ({
    ...v,
    languages: parseJson(v.languages),
    skills: parseJson(v.skills),
    venue_name: venue.name,
    shift_name: `${shift.name} (${shift.start_time}-${shift.end_time})`,
    shift_date: shift.date
  }))

  res.json({
    position: { ...position, shift_name: shift.name, venue_name: venue.name },
    recommendations: result
  })
})

app.post('/api/substitutes', async (req, res) => {
  const { assignment_id, substitute_volunteer_id, reason } = req.body

  const originalAssignment = await db.get('SELECT * FROM assignments WHERE id = ?', [assignment_id])
  if (!originalAssignment) return res.status(404).json({ error: '原分配记录不存在' })

  const now = new Date().toISOString()

  const logInfo = await db.run(`
    INSERT INTO substitute_logs (original_assignment_id, original_volunteer_id, substitute_volunteer_id, position_id, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'resolved', ?)
  `, [assignment_id, originalAssignment.volunteer_id, substitute_volunteer_id, originalAssignment.position_id, reason || '临时缺人', now])

  await db.run(`UPDATE assignments SET status = 'substituted' WHERE id = ?`, [assignment_id])

  const info = await db.run(`
    INSERT INTO assignments (volunteer_id, position_id, shift_id, venue_id, status)
    VALUES (?, ?, ?, ?, 'pending')
  `, [substitute_volunteer_id, originalAssignment.position_id, originalAssignment.shift_id, originalAssignment.venue_id])

  await db.run(`UPDATE positions SET volunteer_id = ? WHERE id = ?`, [substitute_volunteer_id, originalAssignment.position_id])
  await db.run(`UPDATE volunteers SET status = 'assigned', updated_at = ? WHERE id = ?`, [now, substitute_volunteer_id])
  await db.run(`UPDATE substitute_logs SET resolved_at = ? WHERE id = ?`, [now, logInfo.lastID])

  res.json({ new_assignment_id: info.lastID, message: '替补分配成功' })
})

app.get('/api/substitutes/logs', async (req, res) => {
  const logs = await db.all(`
    SELECT sl.*,
      ov.name as original_volunteer_name,
      sv.name as substitute_volunteer_name,
      s.name as shift_name,
      v.name as venue_name,
      p.type as position_type
    FROM substitute_logs sl
    JOIN volunteers ov ON sl.original_volunteer_id = ov.id
    LEFT JOIN volunteers sv ON sl.substitute_volunteer_id = sv.id
    JOIN positions p ON sl.position_id = p.id
    JOIN shifts s ON p.shift_id = s.id
    JOIN venues v ON s.venue_id = v.id
    ORDER BY sl.created_at DESC
  `)
  res.json(logs)
})

// ========== 签到签退 API ==========

app.post('/api/assignments/:id/check-in', async (req, res) => {
  const assignment = await db.get('SELECT * FROM assignments WHERE id = ?', [req.params.id])
  if (!assignment) return res.status(404).json({ error: '分配记录不存在' })

  const shift = await db.get('SELECT * FROM shifts WHERE id = ?', [assignment.shift_id])
  const now = new Date()
  const nowTime = now.toTimeString().substring(0, 5)
  const isLate = nowTime > shift.start_time ? 1 : 0

  await db.run(`
    UPDATE assignments SET check_in_time = ?, is_late = ?, status = 'in_progress' WHERE id = ?
  `, [now.toISOString(), isLate, req.params.id])

  await db.run(`UPDATE credentials SET used = 1 WHERE assignment_id = ?`, [req.params.id])

  res.json({ message: `签到成功${isLate ? '（迟到）' : ''}`, is_late: isLate })
})

app.post('/api/assignments/:id/check-out', async (req, res) => {
  const assignment = await db.get('SELECT * FROM assignments WHERE id = ?', [req.params.id])
  if (!assignment || !assignment.check_in_time) return res.status(400).json({ error: '未签到，无法签退' })

  const now = new Date()
  const checkIn = new Date(assignment.check_in_time)
  const serviceMinutes = Math.floor((now - checkIn) / (1000 * 60))

  await db.run(`
    UPDATE assignments SET check_out_time = ?, service_minutes = ?, status = 'completed' WHERE id = ?
  `, [now.toISOString(), serviceMinutes, req.params.id])

  await db.run(`UPDATE volunteers SET status = 'completed', updated_at = ? WHERE id = ?`, [now.toISOString(), assignment.volunteer_id])

  res.json({ message: '签退成功', service_minutes: serviceMinutes })
})

// ========== 统计 API ==========

app.get('/api/statistics/summary', async (req, res) => {
  const r1 = await db.get('SELECT COUNT(*) as count FROM volunteers')
  const r2 = await db.get('SELECT COUNT(*) as count FROM volunteers WHERE training_passed = 1')
  const r3 = await db.get(`SELECT COUNT(DISTINCT volunteer_id) as count FROM assignments WHERE status IN ('pending', 'confirmed', 'in_progress', 'completed')`)
  const r4 = await db.get('SELECT COUNT(*) as count FROM assignments')
  const r5 = await db.get("SELECT COUNT(*) as count FROM assignments WHERE status = 'completed'")
  const r6 = await db.get("SELECT COALESCE(SUM(service_minutes), 0) as total FROM assignments WHERE status = 'completed'")
  const r7 = await db.get('SELECT COUNT(*) as count FROM assignments WHERE is_late = 1')
  const r8 = await db.get('SELECT COUNT(*) as count FROM substitute_logs')

  res.json({
    total_volunteers: r1.count,
    trained_volunteers: r2.count,
    assigned_volunteers: r3.count,
    total_assignments: r4.count,
    completed_assignments: r5.count,
    total_service_minutes: r6.total,
    total_service_hours: Math.floor(r6.total / 60),
    late_count: r7.count,
    substitute_count: r8.count
  })
})

app.get('/api/statistics/volunteer/:id', async (req, res) => {
  const assignments = await db.all(`
    SELECT a.*, s.name as shift_name, s.start_time, s.end_time, s.date,
           v.name as venue_name, p.type as position_type
    FROM assignments a
    JOIN shifts s ON a.shift_id = s.id
    JOIN venues v ON a.venue_id = v.id
    JOIN positions p ON a.position_id = p.id
    WHERE a.volunteer_id = ?
    ORDER BY s.date
  `, [req.params.id])

  const completed = assignments.filter(a => a.status === 'completed')
  const totalMinutes = completed.reduce((sum, a) => sum + (a.service_minutes || 0), 0)
  const lateCount = completed.filter(a => a.is_late).length
  const onTimeRate = completed.length > 0 ? ((completed.length - lateCount) / completed.length) * 100 : 100

  const skillStats = { language: 0, medical: 0, guidance: 0, security: 0 }
  completed.forEach(a => { if (skillStats[a.position_type] !== undefined) skillStats[a.position_type]++ })

  res.json({
    assignments,
    total_assignments: assignments.length,
    completed_assignments: completed.length,
    total_service_minutes: totalMinutes,
    total_service_hours: Math.floor(totalMinutes / 60),
    late_count: lateCount,
    on_time_rate: onTimeRate.toFixed(1),
    skill_stats: skillStats
  })
})

app.get('/api/statistics/positions', async (req, res) => {
  const stats = await db.all(`
    SELECT
      p.type,
      COUNT(*) as total,
      SUM(CASE WHEN p.volunteer_id IS NOT NULL THEN 1 ELSE 0 END) as filled,
      SUM(CASE WHEN p.volunteer_id IS NULL THEN 1 ELSE 0 END) as open
    FROM positions p
    GROUP BY p.type
  `)
  res.json(stats)
})

// ========== 优秀证明 API ==========

app.get('/api/certifications/eligibility/:volunteerId', async (req, res) => {
  const stats = await db.all(`SELECT a.* FROM assignments a WHERE a.volunteer_id = ? AND a.status = 'completed'`, [req.params.volunteerId])
  const totalMinutes = stats.reduce((sum, a) => sum + (a.service_minutes || 0), 0)
  const lateCount = stats.filter(a => a.is_late).length
  const onTimeRate = stats.length > 0 ? ((stats.length - lateCount) / stats.length) * 100 : 0
  const isExcellent = stats.length >= 3 && totalMinutes >= 480 && onTimeRate >= 90

  res.json({
    total_assignments: stats.length,
    total_service_minutes: totalMinutes,
    on_time_rate: onTimeRate.toFixed(1),
    is_excellent: isExcellent,
    requirements: { min_assignments: 3, min_service_minutes: 480, min_on_time_rate: 90 }
  })
})

app.post('/api/certifications', async (req, res) => {
  const { volunteer_id, type } = req.body
  const volunteer = await db.get('SELECT * FROM volunteers WHERE id = ?', [volunteer_id])
  if (!volunteer) return res.status(404).json({ error: '志愿者不存在' })

  const stats = await db.all(`SELECT * FROM assignments WHERE volunteer_id = ? AND status = 'completed'`, [volunteer_id])
  const totalMinutes = stats.reduce((sum, a) => sum + (a.service_minutes || 0), 0)
  const lateCount = stats.filter(a => a.is_late).length
  const onTimeRate = stats.length > 0 ? ((stats.length - lateCount) / stats.length) * 100 : 100
  const isExcellent = stats.length >= 3 && totalMinutes >= 480 && onTimeRate >= 90

  const existing = await db.get('SELECT * FROM certifications WHERE volunteer_id = ? AND type = ?', [volunteer_id, type || 'service'])
  if (existing) return res.status(400).json({ error: '该类型证明已发放' })

  const certCode = 'CERT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
  const titles = { service: '志愿服务证明', excellent: '优秀志愿者证书' }

  const info = await db.run(`
    INSERT INTO certifications (volunteer_id, type, title, total_service_minutes, on_time_rate, is_excellent, issued_at, certificate_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [volunteer_id, type || 'service', titles[type || 'service'] || '志愿服务证明', totalMinutes, parseFloat(onTimeRate.toFixed(1)), isExcellent ? 1 : 0, new Date().toISOString(), certCode])

  const cert = await db.get('SELECT * FROM certifications WHERE id = ?', [info.lastID])
  res.json({ certification: cert, message: '证明发放成功' })
})

app.get('/api/certifications', async (req, res) => {
  const certs = await db.all(`
    SELECT c.*, v.name as volunteer_name, v.phone as volunteer_phone
    FROM certifications c JOIN volunteers v ON c.volunteer_id = v.id
    ORDER BY c.issued_at DESC
  `)
  res.json(certs)
})

app.get('/api/certifications/volunteer/:id', async (req, res) => {
  const certs = await db.all(`SELECT * FROM certifications WHERE volunteer_id = ? ORDER BY issued_at DESC`, [req.params.id])
  res.json(certs)
})

app.get('/api/certifications/verify/:code', async (req, res) => {
  const cert = await db.get(`
    SELECT c.*, v.name as volunteer_name
    FROM certifications c JOIN volunteers v ON c.volunteer_id = v.id
    WHERE certificate_code = ?
  `, [req.params.code])
  if (!cert) return res.status(404).json({ valid: false, error: '证明不存在' })
  res.json({ valid: true, certification: cert })
})

// ========== 凭证验证 API ==========

app.get('/api/credentials/verify/:code', async (req, res) => {
  const credential = await db.get(`
    SELECT c.*, v.name as volunteer_name, v.phone as volunteer_phone,
           a.status as assignment_status,
           s.name as shift_name, s.start_time, s.end_time, s.date,
           vn.name as venue_name, p.type as position_type
    FROM credentials c
    JOIN volunteers v ON c.volunteer_id = v.id
    JOIN assignments a ON c.assignment_id = a.id
    JOIN shifts s ON a.shift_id = s.id
    JOIN venues vn ON a.venue_id = vn.id
    JOIN positions p ON a.position_id = p.id
    WHERE credential_code = ?
  `, [req.params.code])

  if (!credential) return res.status(404).json({ valid: false, error: '凭证不存在' })

  const now = new Date()
  const validUntil = new Date(credential.valid_until)
  const isValid = now <= validUntil

  res.json({
    valid: isValid,
    used: credential.used === 1,
    credential,
    volunteer: { name: credential.volunteer_name, phone: credential.volunteer_phone },
    assignment: {
      status: credential.assignment_status,
      shift: credential.shift_name,
      shift_time: `${credential.start_time}-${credential.end_time}`,
      date: credential.date,
      venue: credential.venue_name,
      position: credential.position_type
    }
  })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

async function start() {
  try {
    await initDatabase()
    app.listen(PORT, () => {
      console.log(`志愿者管理系统后端服务已启动: http://localhost:${PORT}`)
    })
  } catch (e) {
    console.error('启动失败:', e)
    process.exit(1)
  }
}

start()
