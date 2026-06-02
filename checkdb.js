// PassForge — Database Checker
// Run: node checkdb.js

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function check() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'backend/passforge.db');

  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database not found. Start the server first with: npm start');
    return;
  }

  const db = new SQL.Database(fs.readFileSync(dbPath));

  console.log('\n👤 USERS\n' + '─'.repeat(60));
  const users = db.exec('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC');
  if (users[0]) {
    users[0].values.forEach(r => {
      console.log(`ID: ${r[0]} | Username: ${r[1]} | Email: ${r[2]} | Joined: ${r[3]}`);
    });
  } else {
    console.log('No users yet.');
  }

  console.log('\n🔑 PASSWORD HISTORY\n' + '─'.repeat(60));
  const hist = db.exec('SELECT label, strength, score, length, created_at FROM password_history ORDER BY created_at DESC LIMIT 10');
  if (hist[0]) {
    hist[0].values.forEach(r => {
      console.log(`Label: ${r[0]} | Strength: ${r[1]} | Score: ${r[2]} | Length: ${r[3]} | Saved: ${r[4]}`);
    });
  } else {
    console.log('No saved analyses yet.');
  }

  console.log('\n📊 STATS\n' + '─'.repeat(60));
  const stats = db.exec('SELECT COUNT(*) as total, AVG(score) as avg_score FROM password_history');
  if (stats[0]) {
    const [total, avg] = stats[0].values[0];
    console.log(`Total analyses: ${total} | Average score: ${Math.round(avg || 0)}`);
  }
  console.log('');
}

check().catch(console.error);
