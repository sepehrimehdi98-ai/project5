import { loadPyodide } from "/vendor/pyodide/pyodide.mjs";

const pyodideReady = loadPyodide({ indexURL: new URL("/vendor/pyodide/", self.location.origin).href });
const guardReady = fetch(new URL("./python-sandbox-guard.py", import.meta.url)).then(response => {
  if (!response.ok) throw new Error(`کد امن محیط پایتون بارگیری نشد (${response.status}).`);
  return response.text();
});
let output = "";
Promise.all([pyodideReady, guardReady]).then(([pyodide, guard]) => { pyodide.runPython(guard); self.postMessage({ ready: true }); }).catch(error => self.postMessage({ readyError: error?.message || "Pyodide load failed." }));

self.onmessage = async event => {
  const { id, code } = event.data;
  try {
    const [pyodide] = await Promise.all([pyodideReady, guardReady]);
    output = "";
    pyodide.setStdout({ batched: text => { output += text; } });
    pyodide.globals.set("source", code);
    try {
      await pyodide.runPythonAsync("nova_run(source)");
      self.postMessage({ id, output: output.trimEnd() });
    } finally { pyodide.globals.delete("source"); }
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
