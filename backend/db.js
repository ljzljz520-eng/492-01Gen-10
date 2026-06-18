const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const { promisify } = require('util')

const dbPath = path.join(__dirname, 'volunteer.db')
const db = new sqlite3.Database(dbPath)

const originalRun = db.run.bind(db)
db.run = function(sql, ...params) {
  let args = []
  if (params.length === 0) {
    args = []
  } else if (params.length === 1 && Array.isArray(params[0])) {
    args = params[0]
  } else {
    args = params
  }
  return new Promise((resolve, reject) => {
    originalRun(sql, args, function(err) {
      if (err) reject(err)
      else resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}
db.get = promisify(db.get).bind(db)
db.all = promisify(db.all).bind(db)
db.exec = promisify(db.exec).bind(db)
db.prepare = (sql, params = []) => {
  return {
    run: async (...p) => {
      const args = params.length ? params : p
      return new Promise((resolve, reject) => {
        db.run(sql, args, function(err) {
          if (err) reject(err)
          else resolve({ lastID: this.lastID, changes: this.changes })
        })
      })
    },
    get: async (...p) => {
      const args = params.length ? params : p
      return new Promise((resolve, reject) => {
        db.get(sql, args, (err, row) => {
          if (err) reject(err)
          else resolve(row)
        })
      })
    },
    all: async (...p) => {
      const args = params.length ? params : p
      return new Promise((resolve, reject) => {
        db.all(sql, args, (err, rows) => {
          if (err) reject(err)
          else resolve(rows)
        })
      })
    }
  }
}

async function initDatabase() {
  await db.run('PRAGMA journal_mode = WAL')
  await db.run('PRAGMA foreign_keys = ON')

  await db.exec(`
    CREATE TABLE IF NOT EXISTS volunteers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      id_card TEXT,
      languages TEXT,
      medical_experience TEXT,
      medical_level INTEGER DEFAULT 0,
      guidance_experience TEXT,
      guidance_level INTEGER DEFAULT 0,
      security_experience TEXT,
      security_level INTEGER DEFAULT 0,
      skills TEXT,
      status TEXT DEFAULT 'registered',
      training_score INTEGER,
      training_passed INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      capacity INTEGER,
      description TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      date TEXT NOT NULL,
      capacity INTEGER DEFAULT 10,
      FOREIGN KEY (venue_id) REFERENCES venues(id)
    );

    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      required_skill TEXT,
      required_level INTEGER DEFAULT 0,
      volunteer_id TEXT,
      status TEXT DEFAULT 'open',
      FOREIGN KEY (shift_id) REFERENCES shifts(id),
      FOREIGN KEY (volunteer_id) REFERENCES volunteers(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL,
      position_id INTEGER NOT NULL,
      shift_id INTEGER NOT NULL,
      venue_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      confirmed_at TEXT,
      check_in_time TEXT,
      check_out_time TEXT,
      is_late INTEGER DEFAULT 0,
      service_minutes INTEGER DEFAULT 0,
      FOREIGN KEY (volunteer_id) REFERENCES volunteers(id),
      FOREIGN KEY (position_id) REFERENCES positions(id),
      FOREIGN KEY (shift_id) REFERENCES shifts(id),
      FOREIGN KEY (venue_id) REFERENCES venues(id)
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL,
      assignment_id INTEGER NOT NULL,
      credential_code TEXT UNIQUE NOT NULL,
      qr_data TEXT,
      issued_at TEXT,
      valid_until TEXT,
      used INTEGER DEFAULT 0,
      FOREIGN KEY (volunteer_id) REFERENCES volunteers(id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(id)
    );

    CREATE TABLE IF NOT EXISTS substitute_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_assignment_id INTEGER NOT NULL,
      original_volunteer_id TEXT NOT NULL,
      substitute_volunteer_id TEXT,
      position_id INTEGER NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT,
      resolved_at TEXT,
      FOREIGN KEY (original_assignment_id) REFERENCES assignments(id)
    );

    CREATE TABLE IF NOT EXISTS certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      total_service_minutes INTEGER DEFAULT 0,
      on_time_rate REAL,
      is_excellent INTEGER DEFAULT 0,
      issued_at TEXT,
      certificate_code TEXT UNIQUE,
      FOREIGN KEY (volunteer_id) REFERENCES volunteers(id)
    );
  `)

  const venueRow = await db.get('SELECT COUNT(*) as count FROM venues')
  if (venueRow.count === 0) {
    const venues = [
      ['主体育场', '城市中心区A1', 80000, '开闭幕式及主要田径比赛场地', new Date().toISOString()],
      ['游泳中心', '滨江区B2', 15000, '游泳、跳水等水上项目', new Date().toISOString()],
      ['篮球馆', '体育园区C3', 20000, '篮球比赛场地', new Date().toISOString()],
      ['媒体中心', '会展区D4', 5000, '新闻媒体及转播中心', new Date().toISOString()],
      ['运动员村', '居住区E5', 10000, '运动员住宿及后勤区', new Date().toISOString()]
    ]

    for (const v of venues) {
      await db.run('INSERT INTO venues (name, location, capacity, description, created_at) VALUES (?, ?, ?, ?, ?)', v)
    }

    const shifts = [
      [1, '早班', '06:00', '14:00', '2026-08-01', 30],
      [1, '中班', '14:00', '22:00', '2026-08-01', 30],
      [1, '晚班', '22:00', '06:00', '2026-08-02', 15],
      [2, '早班', '06:00', '14:00', '2026-08-01', 20],
      [2, '中班', '14:00', '22:00', '2026-08-01', 20],
      [3, '早班', '07:00', '15:00', '2026-08-01', 25],
      [3, '中班', '15:00', '23:00', '2026-08-01', 25],
      [4, '全日班', '08:00', '20:00', '2026-08-01', 40],
      [5, '早班', '06:00', '14:00', '2026-08-01', 35],
      [5, '晚班', '14:00', '22:00', '2026-08-01', 35]
    ]

    for (const s of shifts) {
      await db.run('INSERT INTO shifts (venue_id, name, start_time, end_time, date, capacity) VALUES (?, ?, ?, ?, ?, ?)', s)
    }

    const positionTemplates = [
      { type: 'language', skill: 'languages', name: '语言服务' },
      { type: 'medical', skill: 'medical_level', name: '医疗服务' },
      { type: 'guidance', skill: 'guidance_level', name: '引导服务' },
      { type: 'security', skill: 'security_level', name: '安检服务' }
    ]

    const shiftCountRow = await db.get('SELECT COUNT(*) as count FROM shifts')
    for (let i = 1; i <= shiftCountRow.count; i++) {
      for (let idx = 0; idx < positionTemplates.length; idx++) {
        const p = positionTemplates[idx]
        const count = idx === 3 ? 6 : 4
        for (let j = 0; j < count; j++) {
          await db.run('INSERT INTO positions (shift_id, type, required_skill, required_level) VALUES (?, ?, ?, ?)', [i, p.type, p.skill, j % 3])
        }
      }
    }
  }

  console.log('数据库初始化完成')
  return db
}

module.exports = { db, initDatabase }
