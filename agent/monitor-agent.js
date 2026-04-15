/**
 * VPS Sentinel Pro - Monitor Agent v2.1
 * Installazione: 
 * 1. npm init -y && npm install dotenv
 * 2. pm2 start monitor-agent.js --name sentinel
 */

'use strict';

// Carica le variabili dal file .env se presente
require('dotenv').config();

const http    = require('http');
const { execSync } = require('child_process');
const os      = require('os');

// ─── Configurazione ────────────────────────────────────────────────────────────
const PORT         = process.env.PORT || 3000;
const SECRET_TOKEN = process.env.SECRET_TOKEN;
const BIND_HOST    = process.env.AGENT_HOST || '0.0.0.0';

if (!SECRET_TOKEN) {
  console.error('[FATAL] Variabile SECRET_TOKEN non impostata nel file .env. Uscita.');
  process.exit(1);
}

// Processi legittimi — filtrati per risparmiare token AI
const WHITELIST = new Set([
  'node', 'sshd', 'systemd', 'systemd-j', 'systemd-n', 'systemd-r', 'systemd-u',
  'nginx', 'apache2', 'containerd', 'dockerd', 'docker-proxy', 'mysql', 'mysqld', 
  'postgres', 'mongod', 'redis-server', 'php-fpm', 'php', 'rsyslogd', 'cron', 'atd',
  'dbus-daemon', 'NetworkManager', 'agetty', 'login', 'polkitd', 'irqbalance',
  'python3', 'bash', 'sh', 'zsh', 'pm2', 'npm', 'ufw-init', 'iptables'
]);

// ─── Utility ──────────────────────────────────────────────────────────────────
function safeExec(cmd, fallback = '') {
  try { return execSync(cmd, { timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return fallback; }
}

// ─── Metriche ──────────────────────────────────────────────────────────────────
function getMemoryMetrics() {
  const raw = safeExec('free -m');
  const lines = raw.split('\n');
  const memLine = lines.find(l => l.startsWith('Mem:'));
  if (!memLine) return { percent_used: 0 };
  
  const p = memLine.split(/\s+/);
  const total = parseInt(p[1]);
  const available = parseInt(p[6]) || parseInt(p[3]); // fallback per vecchie versioni
  return {
    total_mb: total,
    available_mb: available,
    percent_used: total > 0 ? Math.round(((total - available) / total) * 100) : 0
  };
}

function getDiskMetrics() {
  const raw = safeExec("df -hP | grep -E '^/dev/'");
  return raw.split('\n').filter(Boolean).map(line => {
    const p = line.trim().split(/\s+/);
    return { mount: p[5], size: p[1], used: p[2], percent: parseInt(p[4]) };
  });
}

function getCpuMetrics() {
  const uptimeRaw = safeExec('uptime');
  const loadMatch = uptimeRaw.match(/load average:\s+([\d.]+)/);
  const cores = parseInt(safeExec('nproc') || '1');
  const load1 = loadMatch ? parseFloat(loadMatch[1]) : 0;
  return {
    load1,
    cores,
    percent_used: Math.round((load1 / cores) * 100)
  };
}

function getProcesses() {
  const raw = safeExec('ps -eo comm,%cpu,%mem --sort=-%cpu | head -30');
  return raw.split('\n').slice(1).map(line => {
    const p = line.trim().split(/\s+/);
    if (p.length < 3) return null;
    const name = p[0];
    const cpu = parseFloat(p[1]);
    // Filtro: solo se CPU > 0.3% e non è in whitelist
    return (cpu > 0.3 && !WHITELIST.has(name)) ? { name, cpu: cpu + '%', mem: p[2] + '%' } : null;
  }).filter(Boolean);
}

function getSecurityData() {
  return {
    last_logins: safeExec('last -n 5 -a').split('\n').filter(Boolean),
    failed_auth: safeExec("grep 'Failed password' /var/log/auth.log 2>/dev/null | tail -5").split('\n').filter(Boolean),
    logged_users: safeExec('who').split('\n').filter(Boolean),
    listening_ports: safeExec("ss -tulpn | grep LISTEN | awk '{print $5}' | cut -d: -f2 | sort -u").split('\n').filter(Boolean)
  };
}

function getSystemStats() {
  return {
    host: os.hostname(),
    timestamp: new Date().toISOString(),
    uptime_hours: Math.round(os.uptime() / 3600),
    memory: getMemoryMetrics(),
    cpu: getCpuMetrics(),
    disks: getDiskMetrics(),
    processes: { unrecognized: getProcesses() },
    security: getSecurityData()
  };
}

// ─── Server ───────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'ok', host: os.hostname() }));
  }

  if (req.headers['x-auth-token'] !== SECRET_TOKEN) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }

  if (req.url === '/stats') {
    res.writeHead(200);
    return res.end(JSON.stringify(getSystemStats()));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, BIND_HOST, () => {
  console.log(`\x1b[32m[Sentinel Agent] In ascolto su ${BIND_HOST}:${PORT}\x1b[0m`);
});