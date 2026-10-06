'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const guard = fs.readFileSync(path.join(__dirname, '..', 'public', 'python-sandbox-guard.py'), 'utf8');
const runtimeReady = import('pyodide').then(({ loadPyodide }) => loadPyodide());

test('Python sandbox runs the lesson snippet and captures the exact printed output', async () => {
  const py = await runtimeReady;
  py.runPython(guard);
  let output = '';
  py.setStdout({ batched: text => { output += text; } });
  const source = 'name = "Nila"\nage = 14\nprint(name, age)';
  py.globals.set('source', source);
  try { await py.runPythonAsync('nova_run(source)'); }
  finally { py.globals.delete('source'); }
  assert.equal(output.trimEnd(), 'Nila 14');
});

test('Python sandbox rejects imports, filesystem access, and attribute access', async () => {
  const py = await runtimeReady;
  for (const source of ['import os', 'open("secret.txt")', 'print((1).__class__)']) {
    py.globals.set('source', source);
    try { await assert.rejects(py.runPythonAsync('nova_run(source)')); }
    finally { py.globals.delete('source'); }
  }
});
