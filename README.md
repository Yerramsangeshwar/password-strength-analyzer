# 🔐 PassForge — Password Strength Analyzer

A full-stack password strength analyzer with real-time feedback, password generator, history tracking, and statistics.

## Features

- **Real-time analysis** — Score, strength label, crack time estimation, entropy calculation
- **6 criteria checks** — Length, uppercase, lowercase, numbers, special chars, long length
- **Character distribution** — Visual bars showing char type breakdown
- **Smart suggestions** — Personalized tips to improve your password
- **Pattern warnings** — Detects common weak patterns (dictionary words, sequences, keyboard patterns)
- **Password Generator** — Cryptographically secure, customizable generator
- **History** — Save and review past analyses (requires account)
- **Statistics** — Overview of your password health trends
- **Auth system** — Register/login or continue as guest

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
http://localhost:3000
```

## Check Database

```bash
node checkdb.js
```

## Project Structure

```
passforge/
├── backend/
│   ├── server.js
│   ├── database.js
│   ├── middleware/auth.js
│   └── routes/
│       ├── auth.js
│       └── passwords.js
├── frontend/public/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── checkdb.js
├── .env
└── package.json
```

## Environment Variables (.env)

```
PORT=3000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```
