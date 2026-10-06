'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const backendPort = '3003';
const children = [];
let stopping = false;

function start(command, args, env = process.env) {
  const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (stopping) return;
    if (code !== 0) {
      console.error(`Nova development process stopped (${signal || code}).`);
      stop(code || 1);
    }
  });
  child.on('error', error => {
    console.error(`Could not start Nova development process: ${error.message}`);
    stop(1);
  });
  return child;
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill();
  process.exitCode = code;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

// Demo sign-in is enabled by default only for this local development stack.
// An explicit NOVA_DEMO_MODE=false still disables it; production/Vercel is
// separately rejected by isDemoMode() in lib/demo-auth.js.
start(process.execPath, [path.join(root, 'server.js')], {
  ...process.env,
  PORT: backendPort,
  NOVA_DEMO_MODE: process.env.NOVA_DEMO_MODE || 'true',
});
start(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--configLoader', 'native', '--host', '127.0.0.1', '--port', '3002', '--strictPort']);
console.log('Nova demo: http://127.0.0.1:3002 (API server: http://127.0.0.1:3003)');
