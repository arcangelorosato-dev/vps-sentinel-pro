# 🛡️ VPS Sentinel Pro

**AI-Powered VPS Monitoring & Security Analysis (Node.js + n8n)**

VPS Sentinel Pro is a lightweight yet powerful monitoring system designed to:

* Monitor multiple VPS servers in real time
* Detect anomalies in CPU, RAM, and disk usage
* Identify suspicious processes and activity
* Perform AI-based security analysis
* Send instant alerts via Telegram

---

# 🏗️ Architecture Overview

[VPS Agent] → [n8n Workflow] → [AI Analysis] → [Telegram Alerts]

---

# 🔄 Workflow Explained

Each server follows this pipeline:

## 1. Health Check

* Endpoint: `/health`
* Verifies if the agent is alive
* If offline → 🚨 immediate alert

---

## 2. Metrics Collection

* Endpoint: `/stats`
* Authenticated via `x-auth-token`
* Collects:

  * CPU usage
  * RAM usage
  * Disk usage
  * Running processes
  * Security logs

---

## 3. Threshold Analysis

The system evaluates:

* CPU > 85%
* RAM > 90%
* Disk > 85%
* Failed logins > 5

If exceeded → ⚠️ metrics alert

---

## 4. AI Security Analysis

Using OpenAI (`gpt-4o-mini`), the system analyzes:

* Unknown processes
* Open ports
* Failed login attempts
* Active users
* System activity

Detects:

* Crypto miners
* Reverse shells
* Suspicious binaries
* Unauthorized access

---

## 5. Alert System (Telegram)

Different alert types:

* 🔴 Agent Offline
* 📊 Metrics Alert
* ⚠️ Suspicious Activity
* 🚨 Compromised Server
* ✅ Clean Report

---

# 📂 Project Structure

.
├── agent/ 
│   └── monitor-agent.js  
├── n8n/ 
│   └── workflow.json 
├── .env.example 
├── package.json 
└── README.md 

---

# ⚙️ Installation Guide

## 1. Install Agent on VPS

git clone https://github.com/arcangelorosato-dev/vps-sentinel-pro.git
cd vps-sentinel-pro/agent

npm install

---

## 2. Configure Environment

Create `.env` file:

PORT=3000

SECRET_TOKEN=your_secure_token 

AGENT_HOST=0.0.0.0 

---

## 3. Start the Agent

Run manually:

node monitor-agent.js

Or with PM2 (recommended):

npm install -g pm2
pm2 start monitor-agent.js --name sentinel
pm2 save
pm2 startup

---

## 4. Test the Agent

curl http://YOUR_SERVER_IP:3000/health

Expected response:

{ "status": "ok" }

---

# 🔗 API Endpoints

## Health Check

GET /health

## System Stats

GET /stats
Headers:
x-auth-token: YOUR_SECRET_TOKEN

---

# 🤖 n8n Setup

## 1. Import Workflow

Open n8n and import:

n8n/workflow.json

---

## 2. Configure Credentials

You must configure:

### OpenAI

* API Key required
* Used for AI security analysis

### Telegram Bot

* Create bot via @BotFather
* Insert token in n8n

---

## 3. Configure Servers

Edit the "VPS List" node:

servers: [
{
id: 'server-1',
name: 'Production VPS',
url: 'http://YOUR_SERVER_IP:3000',
secret: 'YOUR_SECRET_TOKEN',
environment: 'production',
alertLevel: 'high'
}
]

---

# ➕ Add a New VPS

1. Install agent on the new server
2. Add server config in n8n
3. Done

---

# 🔐 Security

* Token-based authentication (`x-auth-token`)
* No public endpoints without auth
* Minimal attack surface
* Local system commands sandboxed

---

# 📌 Requirements

* Node.js 18+
* n8n instance
* OpenAI API key
* Telegram bot

---

# 🚀 Future Improvements

* Web dashboard
* Historical metrics storage
* Prometheus integration
* Slack / Discord alerts
* Multi-user support

---

# 📜 License

MIT
