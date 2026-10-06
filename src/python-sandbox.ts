type Pending = { resolve: (result: { output: string }) => void; reject: (error: Error) => void; timer: number };
type SandboxWorker = Worker & { __novaReady?: boolean };

let worker: SandboxWorker | null = null;
let nextId = 1;
let pending: Pending | null = null;
let queue: Promise<unknown> = Promise.resolve();

function getWorker(): SandboxWorker {
  if (worker) return worker;
  const created = new Worker("/python.worker.js", { type: "module" }) as SandboxWorker;
  created.onmessage = event => {
    if (event.data?.ready) { created.__novaReady = true; if (pending) armTimeout(created, pending, 2200); return; }
    if (event.data?.readyError) {
      if (pending) { window.clearTimeout(pending.timer); pending.reject(new Error(event.data.readyError)); pending = null; }
      created.terminate(); worker = null; return;
    }
    if (!pending || event.data?.id !== nextId - 1) return;
    const current = pending;
    pending = null;
    window.clearTimeout(current.timer);
    if (event.data.error) current.reject(new Error(event.data.error));
    else current.resolve({ output: String(event.data.output || "") });
  };
  created.onerror = event => {
    pending?.reject(new Error(event.message || "محیط اجرای پایتون بارگذاری نشد."));
    pending = null;
    created.terminate();
    worker = null;
  };
  worker = created;
  return created;
}

function armTimeout(active: SandboxWorker, current: Pending, ms: number) {
  window.clearTimeout(current.timer);
  current.timer = window.setTimeout(() => {
    if (pending !== current) return;
    pending = null;
    active.terminate();
    worker = null;
    current.reject(new Error("اجرای کد بیش از ۲ ثانیه طول کشید و برای روان ماندن برنامه متوقف شد."));
  }, ms);
}

function runOne(code: string): Promise<{ output: string }> {
  const active = getWorker();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const current: Pending = { resolve, reject, timer: 0 };
    pending = current;
    armTimeout(active, current, active.__novaReady ? 2200 : 60000);
    active.postMessage({ id, code });
  });
}

export function executePython(code: string): Promise<{ output: string }> {
  if (code.length > 4000) return Promise.reject(new Error("هر مثال باید کمتر از ۴۰۰۰ نویسه باشد."));
  const result = queue.then(() => runOne(code));
  queue = result.catch(() => undefined);
  return result;
}
