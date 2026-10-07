const MAX_BYTES = 500 * 1024 * 1024;
const CHUNK_BYTES = 20 * 1024 * 1024;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `درخواست ناموفق بود (${response.status}).`);
  return data as T;
}

type SignedUpload = { provider: string; cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; publicId: string; filename: string; params: { allowed_formats: string; overwrite: string } };
type CloudinaryResult = { public_id?: string; secure_url?: string; duration?: number; bytes?: number; error?: { message?: string } };

function sendChunk(url: string, form: FormData, headers: Record<string, string>, start: number, length: number, total: number, onProgress: (value: number) => void, signal: AbortSignal): Promise<CloudinaryResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.min(99, Math.round((start + Math.min(event.loaded, length)) / total * 100))); };
    xhr.onload = () => {
      let data: CloudinaryResult = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* reported below */ }
      if (xhr.status < 200 || xhr.status >= 300) reject(new Error(data.error?.message || `Cloudinary بارگذاری را نپذیرفت (${xhr.status}).`));
      else resolve(data);
    };
    xhr.onerror = () => reject(new Error("ارتباط با Cloudinary قطع شد. اتصال را بررسی و دوباره تلاش کنید."));
    xhr.onabort = () => reject(new Error("بارگذاری لغو شد."));
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

export async function uploadLessonVideo(file: File, subject: "python" | "english", lessonId: string, onProgress: (value: number) => void, signal: AbortSignal) {
  if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name)) throw new Error("فایل باید ویدیو با فرمت MP4، WebM یا MOV باشد.");
  if (file.size <= 0 || file.size > MAX_BYTES) throw new Error("اندازه فایل باید بیشتر از صفر و حداکثر ۵۰۰ مگابایت باشد.");
  const signed = await postJson<SignedUpload>("/api/media/sign", { resourceType: "video", filename: file.name, lessonId });
  if (signed.provider !== "cloudinary") throw new Error("این نسخه رابط بارگذاری Cloudinary را فعال کرده است.");
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/video/upload`;
  const chunked = file.size > 100 * 1024 * 1024;
  const chunkSize = chunked ? CHUNK_BYTES : file.size;
  const uploadId = crypto.randomUUID();
  let result: CloudinaryResult | null = null;
  for (let start = 0; start < file.size; start += chunkSize) {
    if (signal.aborted) throw new Error("بارگذاری لغو شد.");
    const end = Math.min(start + chunkSize, file.size);
    const form = new FormData();
    form.append("file", file.slice(start, end), file.name);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("folder", signed.folder);
    form.append("public_id", signed.publicId);
    form.append("allowed_formats", signed.params.allowed_formats);
    form.append("overwrite", signed.params.overwrite);
    const headers: Record<string,string> = chunked ? { "X-Unique-Upload-Id": uploadId, "Content-Range": `bytes ${start}-${end - 1}/${file.size}` } : {};
    result = await sendChunk(endpoint, form, headers, start, end - start, file.size, onProgress, signal);
  }
  if (!result?.public_id || !result.secure_url || result.public_id !== `${signed.folder}/${signed.publicId}`) throw new Error("Cloudinary مشخصات فایل مطابق درخواست امضاشده را برنگرداند.");
  const saved = await postJson<{ media: { publicId: string; secureUrl: string; title: string; lessonId: string; status: string; bytes: number; duration: number; uploadedBy?: string } }>("/api/media", { publicId: result.public_id, secureUrl: result.secure_url, title: file.name, filename: file.name, lessonId, duration: result.duration || 0, bytes: result.bytes || file.size });
  const demoAsset={...saved.media,courseSubject:subject};
  try {
    const previous=JSON.parse(localStorage.getItem("nova-demo-media")||"[]") as Array<typeof demoAsset>;
    localStorage.setItem("nova-demo-media",JSON.stringify([demoAsset,...previous.filter(item=>item.publicId!==demoAsset.publicId)]));
  } catch { /* Local browser storage is only a demo index; the uploaded Cloudinary asset remains stored. */ }
  onProgress(100);
  return demoAsset;
}

