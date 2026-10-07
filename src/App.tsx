import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { AIAnswer, AISource, PythonRun } from "./AIAnswer";
import { uploadLessonVideo } from "./media-upload";
import { englishLessons, getEnglishLesson } from "./english-course";

type Role = "student" | "teacher" | "admin";
type LearningPath = "python" | "english";
type AuthUser = { id: string; username: string; name: string; role: Role; courseSubject: LearningPath; courseId: string };
type StudentPage = "student-home" | "student-course" | "student-lesson" | "student-progress" | "student-yar";
type TeacherPage = "dashboard" | "courses" | "builder" | "lesson-review" | "students" | "student" | "reports" | "ai" | "upload" | "preview";
type AdminPage = "admin-home" | "users" | "admin-courses" | "media";
type Page = StudentPage | TeacherPage | AdminPage;
type BlockKind = "heading" | "text" | "code" | "video" | "quiz" | "note" | "ai" | "vocabulary" | "example" | "dialogue";
type Block = { id: number; kind: BlockKind; title: string; body: string; invalid?: boolean; options?: string[]; correctOption?: number };
type DemoPublishedLesson = { lessonId: string; path: LearningPath; title: string; blocks: Block[]; publishedAt: string };
function publishedKey(path:LearningPath,lessonId:string){return `nova-published:${path}:${lessonId}`}
function readPublishedLesson(path:LearningPath,lessonId:string):DemoPublishedLesson|null{try{const value=JSON.parse(localStorage.getItem(publishedKey(path,lessonId))||"null");return value&&Array.isArray(value.blocks)?value:null}catch{return null}}

async function requestApi<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }); } catch {
    throw new Error(path === "/api/ai" ? "ارتباط با سرویس AI قطع شد یا پاسخ از مهلت اجرای Vercel گذشت. دوباره تلاش کنید؛ اگر تکرار شد، وضعیت مدل رایگان OpenRouter را بررسی کنید." : "ارتباط با سرور برقرار نشد. صفحه را تازه کنید و دوباره تلاش کنید.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "درخواست ناموفق بود. دوباره تلاش کنید.");
  return payload as T;
}

const icons: Record<string, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  course: <><path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 7a3 3 0 0 1 3-3M8 9h8"/></>,
  builder: <><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M17 14v6M14 17h6"/></>,
  users: <><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M17 15a6 6 0 0 1 5 6"/></>,
  report: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  spark: <><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/></>,
  back: <path d="m15 18-6-6 6-6"/>,
  grip: <path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"/>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></>,
  play: <><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></>,
  media: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16" cy="8" r="2"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/></>,
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>;
}

function NovaLogo({ variant = "icon", className = "" }: { variant?: "icon" | "full"; className?: string }) {
  return <span className={`official-logo ${variant} ${className}`}><img src="/nova-logo.png" alt={variant === "full" ? "Nova، پلتفرم‌های آموزشی" : "Nova"}/></span>;
}

function Button({ children, icon, tone = "primary", onClick, disabled, type = "button" }: {
  children: ReactNode; icon?: string; tone?: "primary" | "secondary" | "ghost" | "danger"; onClick?: () => void; disabled?: boolean; type?: "button" | "submit";
}) {
  return <button className={`btn ${tone}`} onClick={onClick} disabled={disabled} type={type}>{icon && <Icon name={icon} size={17}/>}<span>{children}</span></button>;
}

function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "amber" | "purple" | "red" }) {
  return <span className={`badge ${tone}`}>{tone === "green" && <Icon name="check" size={12}/>} {children}</span>;
}

const teacherNav: { page: TeacherPage; label: string; icon: string }[] = [
  { page: "dashboard", label: "خانه مدرس", icon: "home" },
  { page: "courses", label: "دوره‌های من", icon: "course" },
  { page: "builder", label: "سازنده درس", icon: "builder" },
  { page: "lesson-review", label: "بازبینی درس", icon: "eye" },
  { page: "students", label: "دانش‌آموزان", icon: "users" },
  { page: "reports", label: "گزارش‌ها", icon: "report" },
  { page: "ai", label: "پیش‌نویس AI", icon: "spark" },
];
const studentNav: { page: StudentPage; label: string; icon: string }[] = [
  { page: "student-home", label: "خانه من", icon: "home" },
  { page: "student-course", label: "دوره من", icon: "course" },
  { page: "student-lesson", label: "ادامه درس", icon: "play" },
  { page: "student-progress", label: "پیشرفت من", icon: "report" },
  { page: "student-yar", label: "یارِ درس", icon: "spark" },
];
const adminNav: { page: AdminPage; label: string; icon: string }[] = [
  { page: "admin-home", label: "نمای کلی", icon: "home" },
  { page: "users", label: "کاربران", icon: "users" },
  { page: "admin-courses", label: "همه دوره‌ها", icon: "course" },
  { page: "media", label: "رسانه و تأییدها", icon: "media" },
];

const meta: Record<Page, [string, string]> = {
  "student-home": ["سلام، نیلا!", "آماده‌ای مسیر پایتون را ادامه بدهی؟"],
  "student-course": ["پایتون از پایه", "فصل‌ها و درس‌های مسیر یادگیری تو"],
  "student-lesson": ["متغیرها و انواع داده", "فصل دوم · درس سوم"],
  "student-progress": ["پیشرفت من", "روند یادگیری بر پایه فعالیت‌های ثبت‌شده"],
  "student-yar": ["یارِ درس", "دستیار یادگیری برای همین درس"],
  dashboard: ["سلام، سارا!", "وضعیت دوره‌ها و فعالیت‌های اخیر کلاس"],
  courses: ["دوره‌های من", "ساخت، ویرایش و مدیریت انتشار دوره‌ها"],
  builder: ["سازنده درس", "ساخت محتوای درس با بلوک‌های قابل جابه‌جایی"],
  "lesson-review": ["بازبینی درس", "کنترل متن، ویدیو و تجربه دانش‌آموز پیش از انتشار"],
  students: ["دانش‌آموزان", "فقط دانش‌آموزان دوره‌های مجاز شما"],
  student: ["جزئیات دانش‌آموز", "نمای فردی و تفکیک‌شده داده‌های یادگیری"],
  reports: ["گزارش‌های کلاس", "تحلیل تکمیل درس‌ها و نتیجه آزمون‌ها"],
  ai: ["پیش‌نویس با کمک AI", "پیشنهاد هوشمند؛ بازبینی و انتشار همیشه با شماست"],
  upload: ["افزودن ویدیو", "بارگذاری و پیگیری وضعیت تأیید رسانه"],
  preview: ["پیش‌نمایش دانش‌آموز", "نمای نهایی درس پیش از انتشار"],
  "admin-home": ["مرکز مدیریت Nova", "کنترل سراسری کاربران، دوره‌ها و رسانه"],
  users: ["مدیریت کاربران", "نقش‌ها، وضعیت دسترسی و فعالیت حساب‌ها"],
  "admin-courses": ["مدیریت دوره‌ها", "بازبینی وضعیت انتشار همه دوره‌ها"],
  media: ["رسانه و تأییدها", "بررسی فایل‌های در انتظار تأیید"],
};

function PathSelect({ role, onSelect, onBack }: { role: Role | null; onSelect: (path: LearningPath) => void; onBack?: () => void }) {
  return <main className="path-select" dir="rtl">
    <header><NovaLogo variant="full"/>{onBack && <button onClick={onBack}><Icon name="back"/> بازگشت</button>}</header>
    <section><span className="eyebrow">انتخاب مسیر آموزشی</span><h1>دو مسیر، یک تجربه یادگیری متمرکز</h1><p>مسیر مورد نظر را انتخاب کنید. ساختار پنل ثابت می‌ماند و محتوا متناسب با مسیر تغییر می‌کند.</p>
      <div className="path-cards">
        <button onClick={()=>onSelect("python")}><div className="path-illustration python"><span>&lt;/&gt;</span><i/><i/></div><Badge tone="purple">برنامه‌نویسی</Badge><h2>پایتون از پایه</h2><p>{role==="student"?"یادگیری قدم‌به‌قدم با تمرین و یار":role==="teacher"?"ساخت درس‌های کدنویسی و تمرین اجرایی":role==="admin"?"مدیریت دوره‌ها و رسانه‌های برنامه‌نویسی":"یادگیری قدم‌به‌قدم، ساخت درس یا مدیریت دوره"}</p><span className="path-action">انتخاب این مسیر <Icon name="back"/></span></button>
        <button onClick={()=>onSelect("english")}><div className="path-illustration english"><span>Hello</span><b>سلام</b><div className="sound-wave"><i/><i/><i/><i/></div></div><Badge tone="green">زبان‌آموزی</Badge><h2>انگلیسی از پایه</h2><p>{role==="student"?"واژگان، شنیداری و گفت‌وگو از سطح A1":role==="teacher"?"ساخت درس واژگان، گرامر و شنیداری":role==="admin"?"مدیریت سطوح، کاربران و محتوای زبان":"واژگان، مکالمه، طراحی درس یا مدیریت دوره"}</p><span className="path-action">انتخاب این مسیر <Icon name="back"/></span></button>
      </div>
    </section>
  </main>;
}

function Intro({ role, path, onDone }: { role: Role; path: LearningPath; onDone: () => void }) {
  const copy = role==="student" ? "آماده‌ای یادگیری را شروع کنی؟" : role==="teacher" ? "فضای ساخت درس آماده است." : "نمای کلی پلتفرم آماده بررسی است.";
  useEffect(()=>{const timer=window.setTimeout(onDone,3200);return()=>window.clearTimeout(timer)},[onDone]);
  return <main className={`role-intro ${path}`} dir="rtl">
    <button onClick={onDone}>رد کردن</button>
    <div className="intro-scene"><NovaLogo variant="icon"/><div className="intro-line"/><h1>{path==="python"?"پایتون از پایه":"انگلیسی از پایه"}</h1><p>{copy}</p><div className="intro-art">{path==="python"?<><code dir="ltr">print("Nova")</code><span>&lt;/&gt;</span></>:<><b dir="ltr">Hello!</b><span className="sound-wave"><i/><i/><i/><i/></span></>}</div></div>
  </main>;
}

function Login({ onDemo, subject }: { onDemo: (role: Role, subject: LearningPath) => void; subject: LearningPath }) {
  const [role, setRole] = useState<Role>("student");
  const roleName = role === "student" ? "دانش‌آموز" : role === "teacher" ? "مدرس" : "مدیر";
  return <main className="login" dir="rtl">
    <section className="login-visual">
      <NovaLogo variant="icon" className="animate-logo"/>
      <div className="visual-copy">
        <Badge tone="purple">نسخه نمایشی Nova</Badge>
        <h1><span>درس بساز.</span><br/>مسیر یادگیری را روشن کن.</h1>
        <p>محتوا، کلاس و پیشنهادهای هوشمند را در یک فضای متمرکز مدیریت کنید.</p>
      </div>
      <div className="login-animation" aria-hidden="true">
        <div className="orbit-card card-a"><Icon name="builder"/><i/><i/></div>
        <div className="orbit-card card-b"><Icon name="report"/><b>۸۶٪</b></div>
        <div className="orbit-card card-c"><Icon name="spark"/><span>پیشنهاد آماده است</span></div>
        <svg viewBox="0 0 600 300"><path d="M40 190C150 40 300 270 560 75"/><circle cx="40" cy="190" r="6"/><circle cx="295" cy="167" r="6"/><circle cx="560" cy="75" r="6"/></svg>
      </div>
    </section>
    <section className="login-panel">
      <section className="login-box">
        <div className="mobile-logo"><NovaLogo variant="icon"/><b>Nova</b></div>
        <div className="login-code-motion" aria-label={subject==="python"?"نمونه کد پایتون":"نمونه عبارت انگلیسی"} dir="ltr">{subject==="python"?<><span>student = "Nila"</span><span>path = "Python"</span><span>print("Let’s learn!")<i/></span></>:<><span>Hello, I’m Nila.</span><span>I’m from Tehran.</span><span>Nice to meet you!<i/></span></>}</div>
        <span className="eyebrow">ورود به نسخه نمایشی · مسیر {roleName}</span><h2>محیط دمو را ببینید</h2><p>برای ورود به حساب نمونه، نقش موردنظر را انتخاب کنید. نام کاربری و گذرواژه لازم نیست.</p>
        <div className="role-switch" role="radiogroup" aria-label="انتخاب نقش">
          <button type="button" role="radio" aria-checked={role === "student"} className={role === "student" ? "active" : ""} onClick={() => setRole("student")}><Icon name="play"/><span><b>دانش‌آموز</b><small>یادگیری و تمرین</small></span></button>
          <button type="button" role="radio" aria-checked={role === "teacher"} className={role === "teacher" ? "active" : ""} onClick={() => setRole("teacher")}><Icon name="course"/><span><b>مدرس</b><small>مدیریت دوره و کلاس</small></span></button>
          <button type="button" role="radio" aria-checked={role === "admin"} className={role === "admin" ? "active" : ""} onClick={() => setRole("admin")}><Icon name="users"/><span><b>مدیر</b><small>کنترل سراسری سامانه</small></span></button>
        </div>
        <div className="demo-access-note" role="note">این نسخه از اطلاعات نمونه در همین مرورگر استفاده می‌کند. ورود دمو دسترسی به کاربران یا داده‌های واقعی نمی‌دهد.</div>
        <Button onClick={() => onDemo(role, subject)}>مشاهده پنل {roleName}</Button>
        <small className="demo-note">نسخه نمایشی · بدون ساخت حساب و بدون ذخیره‌سازی اطلاعات واقعی</small>
        <div className="word-motion" aria-label="یادگیری زبان انگلیسی"><span><b>Hello</b><small>سلام</small></span><span><b>Learn</b><small>یاد بگیر</small></span><span><b>Speak</b><small>صحبت کن</small></span><i/><i/><i/></div>
      </section>
    </section>
  </main>;
}

function Shell({ role, path, page, setPage, onLogout, user, children }: { role: Role; path: LearningPath; page: Page; setPage: (p: Page) => void; onLogout: () => void; user: AuthUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const nav = role === "student" ? studentNav : role === "teacher" ? teacherNav : adminNav;
  const headerMeta=path==="english"?{...meta,"student-home":["سلام، نیلا!","آماده‌ای امروز انگلیسی تمرین کنی؟"] as [string,string],"student-course":["انگلیسی از پایه","سطح‌ها و درس‌های مسیر زبان تو"] as [string,string]}:meta;
  return <div className="shell" dir="rtl">
    {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="بستن منو"/>}
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="side-brand"><NovaLogo variant="icon"/><div><b>Nova</b><small>پنل {role === "student" ? "دانش‌آموز" : role === "teacher" ? "مدرس" : "مدیر"}</small></div><button className="icon-btn side-close" onClick={() => setOpen(false)}><Icon name="close"/></button></div>
      <Badge tone="purple">نسخه نمایشی</Badge>
      <div className="side-path-switch locked" aria-label="مسیر قفل‌شده تا خروج از حساب"><div className="active"><span>{path==="python"?<Icon name="builder" size={15}/> : "Aa"}</span>{path==="python"?"پایتون":"انگلیسی"}</div><small>برای تغییر مسیر، ابتدا خارج شوید.</small></div>
      <nav>{nav.map(item => <button key={item.page} className={page === item.page ? "active" : ""} onClick={() => { setPage(item.page); setOpen(false); }}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav>
      <div className="side-account"><div className="avatar">{user.name?.[0] || "ن"}</div><div><b>{user.name}</b><small>{role === "student" ? "دانش‌آموز" : role === "teacher" ? "مدرس" : "مدیر سامانه"} · {path === "python" ? "پایتون" : "انگلیسی"}</small></div><button onClick={onLogout} aria-label="خروج"><Icon name="logout"/></button></div>
    </aside>
    <div className="main">
      <header><button className="icon-btn menu-btn" onClick={() => setOpen(true)}><Icon name="menu"/></button><div><h1>{page==="student-lesson"&&path==="english"?"معرفی خود · سطح A1":headerMeta[page][0]}</h1><p>{page==="student-lesson"&&path==="english"?"درس زبان انگلیسی · گفت‌وگو و جمله‌سازی":headerMeta[page][1]}</p></div><button className="icon-btn notify"><Icon name="bell"/></button></header>
      <main className={page === "builder" ? "builder-main" : ""}>{children}</main>
    </div>
  </div>;
}

function Metric({ icon, label, value, detail, tone }: { icon: string; label: string; value: string; detail: string; tone: string }) {
  return <article className="metric"><span className={tone}><Icon name={icon}/></span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></article>;
}

function TeacherDashboard({ go, path }: { go: (p: Page) => void; path: LearningPath }) {
  const english = path === "english";
  const activities = english
    ? [["ن", "نیلا احمدی", "گفت‌وگوی معرفی خود را تمرین کرد", "۱۲ دقیقه پیش"], ["آ", "آرین یوسفی", "در تمرین واژگان A1 امتیاز ۸۸٪ گرفت", "۳۸ دقیقه پیش"], ["ر", "رها کریمی", "درس پرسیدن درباره شهر را آغاز کرد", "۱ ساعت پیش"]]
    : [["ن", "نیلا احمدی", "تمرین متغیرها را کامل کرد", "۱۲ دقیقه پیش"], ["آ", "آرین یوسفی", "در آزمون فصل دوم ۸۸٪ گرفت", "۳۸ دقیقه پیش"], ["ر", "رها کریمی", "درس رشته‌ها را آغاز کرد", "۱ ساعت پیش"]];
  return <div className="page teacher-dashboard">
    <section className={"welcome " + path}><div><Badge tone="purple">{english ? "انگلیسی از پایه · A1" : "پایتون از پایه"}</Badge><h2>{english ? "کلاس زبان آماده درس تازه است." : "کلاس با ریتم خوبی پیش می‌رود."}</h2><p>{english ? "۷۲٪ زبان‌آموزان درس واژگان روزمره را کامل کرده‌اند." : "۷۸٪ دانش‌آموزان درس متغیرها را کامل کرده‌اند."} سه پیش‌نویس برای بازبینی دارید.</p><Button icon="plus" onClick={() => go("builder")}>ساخت درس جدید</Button></div><div className="welcome-art">{english ? <><strong dir="ltr">Aa</strong><small>Hello · Speak</small></> : <Icon name="builder" size={48}/>}<i/><i/><i/></div></section>
    <Badge tone="amber">آمار و نتایج این صفحه نمونه‌اند و هنوز به سوابق پایگاه داده وصل نیستند.</Badge>
    <section className="metrics"><Metric icon="course" label="دوره فعال" value={english ? "۲" : "۳"} detail={english ? "۱ دوره منتشرشده" : "۲ دوره منتشرشده"} tone="purple"/><Metric icon="builder" label="پیش‌نویس" value={english ? "۳" : "۵"} detail="نیازمند بازبینی" tone="amber"/><Metric icon="users" label={english ? "زبان‌آموز فعال" : "دانش‌آموز فعال"} value={english ? "۵۴" : "۶۸"} detail="۱۲ نفر امروز فعال" tone="green"/><Metric icon="report" label={english ? "میانگین تمرین" : "میانگین آزمون"} value={english ? "۸۰٪" : "۸۱٪"} detail="۴٪ رشد این ماه" tone="blue"/></section>
    <div className="two-col"><section className="panel"><div className="panel-head"><div><span className="eyebrow">دوره‌های شما</span><h2>ادامه مدیریت</h2></div><button className="text-btn" onClick={() => go("courses")}>همه دوره‌ها</button></div>
      {english ? <><CourseRow title="انگلیسی از پایه · سطح A1" status="منتشرشده" progress={76} go={() => go("courses")}/><CourseRow title="واژگان و مکالمه روزمره" status="پیش‌نویس" progress={42} go={() => go("builder")}/><CourseRow title="گرامر کاربردی · سطح A2" status="در حال بازبینی" progress={58} go={() => go("builder")}/></> : <><CourseRow title="پایتون از پایه" status="منتشرشده" progress={72} go={() => go("courses")}/><CourseRow title="حل مسئله با پایتون" status="پیش‌نویس" progress={35} go={() => go("builder")}/><CourseRow title="پروژه پایانی" status="در حال بازبینی" progress={58} go={() => go("builder")}/></>}
    </section><section className="panel activity"><div className="panel-head"><div><span className="eyebrow">کلاس من</span><h2>فعالیت اخیر</h2></div></div>
      {activities.map(x => <div className="activity-row" key={x[1]}><span>{x[0]}</span><div><b>{x[1]}</b><p>{x[2]}</p></div><small>{x[3]}</small></div>)}
    </section></div>
  </div>;
}
function CourseRow({ title, status, progress, go }: { title: string; status: string; progress: number; go: () => void }) {
  return <button className="course-row" onClick={go}><div className="course-icon"><Icon name="course"/></div><div className="grow"><b>{title}</b><small>آخرین ویرایش: امروز</small><div className="mini-progress"><i style={{ width: `${progress}%` }}/></div></div><Badge tone={status === "منتشرشده" ? "green" : status === "پیش‌نویس" ? "gray" : "amber"}>{status}</Badge><Icon name="back"/></button>;
}

function Courses({ go, path }: { go: (p: Page) => void; path: LearningPath }) {
  return <div className="page">
    <div className="toolbar"><div className="search"><Icon name="course"/><input placeholder="جست‌وجوی دوره…"/></div><select aria-label="فیلتر وضعیت"><option>همه وضعیت‌ها</option><option>منتشرشده</option><option>پیش‌نویس</option></select><Button icon="plus" onClick={() => go("builder")}>ساخت دوره</Button></div>
    <section className="course-grid">
      {(path==="python"?[["پایتون از پایه","منتشرشده","۲۴ درس · ۶۸ دانش‌آموز","۷۲"],["حل مسئله با پایتون","پیش‌نویس","۸ درس · بدون دانش‌آموز","۳۵"],["پروژه پایانی پایتون","در حال بازبینی","۱۲ درس · ۲۳ دانش‌آموز","۵۸"]]:[["انگلیسی از پایه A1","منتشرشده","۳۰ درس · ۵۴ زبان‌آموز","۷۶"],["مکالمه روزمره A2","پیش‌نویس","۱۲ درس · بدون زبان‌آموز","۴۲"],["آمادگی سطح B1","در حال بازبینی","۱۸ درس · ۱۹ زبان‌آموز","۶۱"]]).map((c,i) => <article className="course-card" key={c[0]}><div className={`course-cover c${i}`}>{path==="english"?<strong className="english-cover" dir="ltr">{i===0?"A1":i===1?"A2":"B1"}</strong>:<Icon name={i===1?"spark":"course"} size={36}/>}<Badge tone={i===0?"green":i===1?"gray":"amber"}>{c[1]}</Badge></div><div className="course-card-body"><h2>{c[0]}</h2><p>{c[2]}</p><div><span>آماده‌سازی محتوا</span><b>{c[3]}٪</b></div><div className="progress"><i style={{width:`${c[3]}%`}}/></div><Button tone="secondary" onClick={() => go("builder")}>ویرایش فصل‌ها و درس‌ها</Button></div></article>)}
      <button className="new-course" onClick={() => go("builder")}><span><Icon name="plus"/></span><b>ساخت دوره تازه</b><small>فصل‌ها و درس‌ها را قدم‌به‌قدم اضافه کنید.</small></button>
    </section>
  </div>;
}

const palette: { kind: BlockKind; label: string; icon: string }[] = [
  {kind:"heading",label:"عنوان / زیرعنوان",icon:"course"},{kind:"text",label:"متن آموزشی",icon:"builder"},{kind:"code",label:"کد و مثال اجرایی",icon:"play"},{kind:"video",label:"ویدیو",icon:"media"},{kind:"quiz",label:"سؤال آزمون",icon:"report"},{kind:"note",label:"نکته / هشدار",icon:"bell"},{kind:"ai",label:"پیشنهاد با AI",icon:"spark"},
];
const englishPalette: { kind: BlockKind; label: string; icon: string }[] = [
  {kind:"heading",label:"عنوان درس",icon:"course"},{kind:"text",label:"توضیح فارسی",icon:"builder"},{kind:"vocabulary",label:"واژگان و معنی",icon:"course"},{kind:"example",label:"جمله با ترجمه",icon:"play"},{kind:"dialogue",label:"گفت‌وگو",icon:"users"},{kind:"video",label:"ویدیوی شنیداری",icon:"media"},{kind:"quiz",label:"تمرین زبان",icon:"report"},{kind:"note",label:"نکته گرامری",icon:"bell"},{kind:"ai",label:"پیشنهاد با AI",icon:"spark"},
];
const defaults: Record<BlockKind, [string,string]> = {
  heading:["متغیرها چیستند؟","عنوان بخش"], text:["متغیر را مثل یک جعبه نام‌دار در نظر بگیرید.","متن آموزشی را اینجا ویرایش کنید."], code:["مثال اجرایی",'name = "Nila"\nage = 14\nprint(name, age)'], video:["ویدیوی درس","برای بارگذاری ویدیو کلیک کنید."], quiz:["یک نام معتبر برای متغیر انتخاب کنید.","گزینه صحیح را در پنل ویژگی‌ها انتخاب کنید."], note:["نکته مهم","نام متغیر باید کوتاه و معنادار باشد."], ai:["پیشنهاد هوشمند","این محتوا پیش‌نویس است و پیش از افزودن باید بازبینی شود."], vocabulary:["واژگان تازه","hello | سلام\nname | نام\ncity | شهر"], example:["جمله نمونه","سلام، من نیلا هستم.\nHello, I’m Nila."], dialogue:["گفت‌وگوی کوتاه","A: Hello! What’s your name?\nB: My name is Nila."],
};

function Builder({ go, path }: { go: (p: Page) => void; path: LearningPath }) {
  const storageKey = `nova-builder:${path}`;
  const [blocks, setBlocks] = useState<Block[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((item): item is Block => Boolean(item && typeof item === "object" && typeof item.id === "number" && typeof item.title === "string" && typeof item.body === "string" && (path === "python" || item.kind !== "code")));
      }
    } catch { /* Ignore stale or malformed local drafts. */ }
    if (path === "english") return [
      {id:1,kind:"heading",...toBlock("معرفی خود به انگلیسی","در این درس یاد می‌گیریم نام و محل زندگی خود را ساده و روشن بیان کنیم.")},
      {id:2,kind:"text",...toBlock("یک گفت‌وگوی کوتاه","با جمله‌های کوتاه شروع کنید و پس از هر جمله، تلفظ را با صدای بلند تمرین کنید.")},
      {id:3,kind:"vocabulary",...toBlock("واژگان کلیدی", "name | نام\ncity | شهر\nfrom | اهلِ")},
      {id:4,kind:"example",...toBlock("جمله نمونه", "سلام، من نیلا هستم و اهل تهرانم.\nHello, I’m Nila. I’m from Tehran.")},
      {id:5,kind:"dialogue",...toBlock("تمرین گفت‌وگو", "A: Hi! What’s your name?\nB: I’m Nila. Nice to meet you.\nترجمه: سلام! اسمت چیست؟ من نیلا هستم. از آشنایی با تو خوشحالم.")},
      {id:6,kind:"quiz",...toBlock("تمرین کوتاه","برای گفتن «من اهل تهرانم» کدام جمله درست است؟"),options:["I’m from Tehran.","I live name Tehran.","I from Tehran live.","I am Tehran from."],correctOption:0},
    ];
    return [
    {id:1,kind:"heading",...toBlock("متغیرها چیستند؟","در این درس با جعبه‌های نام‌دار پایتون آشنا می‌شویم.")},
    {id:2,kind:"text",...toBlock("یک تعریف ساده","متغیر نامی است که به یک مقدار اشاره می‌کند و استفاده دوباره از داده را آسان‌تر می‌کند.")},
    {id:3,kind:"code",...toBlock("اولین متغیر", 'name = "Nila"\nage = 14\nprint(name, age)')},
    {id:4,kind:"quiz",...toBlock("سؤال کوتاه","کدام نام برای متغیر مناسب است؟"),invalid:true},
    ];
  });
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(blocks)); } catch { /* Local storage may be disabled or full. */ } }, [storageKey, blocks]);
  useEffect(()=>{const key=`nova-ai-insert:${path}`;const raw=localStorage.getItem(key);if(!raw)return;try{const draft=JSON.parse(raw) as {title?:string;content?:string};const content=typeof draft.content==="string"?draft.content:"";if(content.trim()){const now=Date.now(),title=draft.title||"پیش‌نویس AI";setBlocks(current=>[...current,{id:now,kind:"heading",title,body:"پیشنهاد تولیدشده آماده بازبینی مدرس است."},{id:now+1,kind:"text",title:"محتوای پیشنهادی",body:content}]);setSelected(now+1);setSaved("dirty");setToast("پیش‌نویس AI به‌صورت بلوک قابل ویرایش به بوم اضافه شد.")}}catch{setToast("پیش‌نویس ذخیره‌شده خوانده نشد.")}finally{localStorage.removeItem(key)}},[path]);
  const [selected, setSelected] = useState(2);
  const [dragging, setDragging] = useState<number | null>(null);
  const [draggingPaletteKind, setDraggingPaletteKind] = useState<BlockKind | null>(null);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [saved, setSaved] = useState<"saved"|"saving"|"dirty">("saved");
  const [toast, setToast] = useState("");
  const active = blocks.find(b => b.id === selected);
  const add = (kind: BlockKind, at = blocks.length) => {
    const id = Date.now() + Math.floor(Math.random()*1000); let [title,body] = defaults[kind];
    let options:string[]|undefined, correctOption:number|undefined;
    if(kind==="quiz"){if(path==="english"){title="کدام پاسخ درست است؟";body="برای پرسیدن محل زندگی، کدام پرسش را می‌گوییم؟";options=["Where are you from?","What is your name?","How old are you?","Do you like tea?"];correctOption=0}else{title="یک نام معتبر برای متغیر انتخاب کنید";body="کدام گزینه از قواعد نام‌گذاری پایتون پیروی می‌کند؟";options=["user_name","2name"];correctOption=0}}
    const copy = [...blocks]; copy.splice(at,0,{id,kind,title,body,invalid:kind==="quiz"&&correctOption===undefined,options,correctOption});
    setBlocks(copy); setSelected(id); setSaved("dirty"); setToast(`بلوک «${(path==="english"?englishPalette:palette).find(p=>p.kind===kind)?.label||title}» اضافه شد؛ ویژگی‌های آن در پنل کناری آماده ویرایش است.`);
  };
  const move = (id: number, direction: -1|1) => {
    const index=blocks.findIndex(b=>b.id===id), target=index+direction;
    if(target<0||target>=blocks.length){setToast("این بلوک بیشتر از این جابه‌جا نمی‌شود.");return}
    const next=[...blocks]; [next[index],next[target]]=[next[target],next[index]]; setBlocks(next);setSaved("dirty");
  };
  const remove = (id:number) => { const old=blocks.find(b=>b.id===id);setBlocks(blocks.filter(b=>b.id!==id));setToast(`بلوک «${old?.title}» حذف شد. بازگردانی`); };
  const duplicate=(id:number)=>{const b=blocks.find(x=>x.id===id);if(b){const i=blocks.indexOf(b);const n=[...blocks];n.splice(i+1,0,{...b,id:Date.now(),title:`${b.title} (کپی)`});setBlocks(n);}};
  const update=(patch:Partial<Block>)=>{setBlocks(blocks.map(b=>b.id===selected?{...b,...patch,...(patch.correctOption!==undefined?{invalid:false}:{})}:b));setSaved("dirty")};
  const save=()=>{setSaved("saving");try{localStorage.setItem(storageKey,JSON.stringify(blocks));setSaved("saved");setToast("پیش‌نویس در همین مرورگر ذخیره شد.")}catch{setSaved("dirty");setToast("ذخیره‌سازی مرورگر در دسترس نیست.")}};
  const publish=()=>{const quiz=blocks.find(block=>block.kind==="quiz"&&block.correctOption===undefined);if(quiz){setSelected(quiz.id);setToast("برای انتشار، پاسخ صحیح این سؤال را در پنل ویژگی‌ها انتخاب کنید.");return}try{const lessonId=path==="python"?"l2-1":getEnglishLesson(localStorage.getItem("nova-selected-english-lesson")||undefined).id;const title=blocks.find(block=>block.kind==="heading")?.title||(path==="english"?"درس انگلیسی":"درس پایتون");localStorage.setItem(publishedKey(path,lessonId),JSON.stringify({lessonId,path,title,blocks,publishedAt:new Date().toISOString()} satisfies DemoPublishedLesson));localStorage.setItem(storageKey,JSON.stringify(blocks));setSaved("saved");setToast("درس برای نقش دانش‌آموز همین مرورگر منتشر شد.")}catch{setToast("انتشار دمو در مرورگر انجام نشد؛ فضای ذخیره‌سازی را بررسی کنید.")}};
  const dropAt=(index:number)=>{if(dragging===null)return;const from=blocks.findIndex(b=>b.id===dragging);const next=[...blocks];const [item]=next.splice(from,1);next.splice(index,0,item);setBlocks(next);setDragging(null);setSelected(item.id);setSaved("dirty");setToast("جای بلوک تغییر کرد.")};
  return <div className="lesson-builder">
    <div className="builder-bar"><div><button onClick={() => go("courses")}><Icon name="back"/></button><span><b>{path==="python"?"متغیرها و انواع داده":getEnglishLesson(localStorage.getItem("nova-selected-english-lesson")||undefined).title}</b><small>{path==="python"?"پایتون از پایه · فصل دوم":"انگلیسی از پایه · سطح A1"}</small></span></div><div className={`save-state ${saved}`}><i/>{saved==="saved"?"ذخیره‌شده":saved==="saving"?"در حال ذخیره…":"تغییرات ذخیره نشده"}</div><div><Button tone="secondary" icon="eye" onClick={()=>go("preview")}>پیش‌نمایش</Button><Button tone="secondary" onClick={save}>ذخیره پیش‌نویس</Button><Button onClick={publish}>انتشار برای دمو</Button></div></div>
    <div className="builder-workspace">
      <aside className="palette"><span className="eyebrow">بلوک‌های {path==="english"?"درس زبان":"محتوا"}</span><h3>یک نوع بلوک انتخاب کنید</h3><p>پس از افزودن، عنوان و محتوا را در پنل ویژگی‌ها وارد کنید.</p>{(path==="english"?englishPalette:palette).map(x=><button key={x.kind} draggable onDragStart={event=>{event.dataTransfer.effectAllowed="copy";setDragging(-1);setDraggingPaletteKind(x.kind)}} onDragEnd={()=>{setDragging(null);setDraggingPaletteKind(null)}} onClick={()=>add(x.kind)}><Icon name={x.icon}/><span>{x.label}</span><Icon name="grip" size={17}/></button>)}{path==="english"&&<div className="english-blocks"><span>محتوای زبان</span><small>هر جمله نمونه ابتدا ترجمه فارسی و سپس متن انگلیسی را نشان می‌دهد.</small></div>}<div className="keyboard-help"><b>جابه‌جایی با صفحه‌کلید</b><p>روی دستگیره Space بزنید، با فلش‌ها جابه‌جا و با Space رها کنید.</p></div></aside>
      <section className="canvas"><div className="canvas-head"><div><Badge tone="purple">درس ۳</Badge><h2>بوم درس</h2></div><span>{blocks.length} بلوک</span></div>
        {blocks.length===0&&<div className="empty"><Icon name="builder" size={35}/><h3>درس هنوز خالی است</h3><p>نوع بلوک را از فهرست کنار صفحه انتخاب کنید تا همان عنصر به درس اضافه شود.</p><Button icon="plus" onClick={()=>setMobilePaletteOpen(true)}>انتخاب نوع بلوک</Button></div>}
        <div className="drop-line" onDragOver={e=>e.preventDefault()} onDrop={()=>dragging===-1?add(draggingPaletteKind||"text",0):dropAt(0)}><span>اینجا رها کنید</span></div>
        {blocks.map((b,index)=><div key={b.id}>
          <article draggable onDragStart={()=>setDragging(b.id)} onDragEnd={()=>setDragging(null)} onClick={()=>setSelected(b.id)} className={`content-block ${selected===b.id?"selected":""} ${dragging===b.id?"dragging":""} ${b.invalid?"invalid":""}`}>
            <div className="block-tools"><button aria-label="دستگیره جابه‌جایی" onKeyDown={e=>{if(e.key==="ArrowUp")move(b.id,-1);if(e.key==="ArrowDown")move(b.id,1);if(e.key==="Delete")remove(b.id)}}><Icon name="grip"/></button><span>{(path==="english"?englishPalette:palette).find(p=>p.kind===b.kind)?.label||b.kind}</span><button onClick={e=>{e.stopPropagation();duplicate(b.id)}} aria-label="تکرار بلوک"><Icon name="copy" size={15}/></button><button onClick={e=>{e.stopPropagation();remove(b.id)}} aria-label="حذف بلوک"><Icon name="trash" size={15}/></button></div>
            <BlockView block={b} go={go}/>{b.invalid&&<div className="validation">پاسخ صحیح سؤال مشخص نشده است.</div>}
            <div className="mobile-move"><button onClick={()=>move(b.id,-1)}>بالا</button><button onClick={()=>move(b.id,1)}>پایین</button></div>
          </article>
          <div className="drop-line" onDragOver={e=>e.preventDefault()} onDrop={()=>dragging===-1?add(draggingPaletteKind||"text",index+1):dropAt(index+1)}><span>اینجا رها کنید</span></div>
        </div>)}
      </section>
      <aside className="properties">{active?<><div className="properties-head"><div><span className="eyebrow">ویژگی‌های بلوک</span><h3>{(path==="english"?englishPalette:palette).find(p=>p.kind===active.kind)?.label}</h3></div><button><Icon name="close"/></button></div><label>عنوان<input value={active.title} onChange={e=>update({title:e.target.value})}/></label><label>{active.kind==="dialogue"?"خطوط گفت‌وگو و ترجمه":active.kind==="vocabulary"?"هر واژه در یک خط با جداکننده | و معنی فارسی":"محتوا"}<textarea dir={active.kind==="code"?"ltr":"rtl"} value={active.body} onChange={e=>update({body:e.target.value})}/></label>{active.kind==="video"&&<MediaUploader path={path} lessonId={path==="english"?getEnglishLesson(localStorage.getItem("nova-selected-english-lesson")||undefined).id:"l2-1"} compact onUploaded={asset=>{update({title:asset.title,body:`ویدیو در Cloudinary بارگذاری شد و برای بررسی مدیر آماده است.\n${asset.secureUrl}`});setToast("ویدیوی این بلوک به Cloudinary بارگذاری شد و برای بازبینی در صف مدیر قرار گرفت.")}}/>}{active.kind==="quiz"&&<div className="quiz-editor"><b>گزینه‌ها</b>{(active.options||["گزینه اول","گزینه دوم"]).map((option,index)=><label className="quiz-option-edit" key={index}><input type="radio" name={`correct-${active.id}`} checked={active.correctOption===index} onChange={()=>update({correctOption:index})}/><input value={option} onChange={e=>update({options:(active.options||[]).map((item,i)=>i===index?e.target.value:item)})}/></label>)}<small>دایره کنار گزینه درست را انتخاب کنید.</small></div>}{active.kind==="quiz"&&active.correctOption===undefined&&<div className="property-error">یک پاسخ صحیح را انتخاب کنید.</div>}<div className="property-actions"><Button tone="secondary" onClick={()=>duplicate(active.id)}>تکرار</Button><Button onClick={save}>ذخیره همین پیش‌نویس</Button></div></>:<div className="empty small"><p>برای شروع، یک بلوک از فهرست انتخاب کنید.</p></div>}</aside>
    </div>
    <div className="mobile-add-wrap">{mobilePaletteOpen&&<div className="mobile-add-menu" role="menu">{(path==="english"?englishPalette:palette).map(item=><button key={item.kind} role="menuitem" onClick={()=>{add(item.kind);setMobilePaletteOpen(false)}}><Icon name={item.icon}/>{item.label}</button>)}</div>}<button className="mobile-add" aria-expanded={mobilePaletteOpen} onClick={()=>setMobilePaletteOpen(value=>!value)}><Icon name={mobilePaletteOpen?"close":"plus"}/> {mobilePaletteOpen?"بستن فهرست":"انتخاب نوع بلوک"}</button></div>
    {toast&&<div className="toast"><Icon name="check"/><span>{toast}</span><button onClick={()=>setToast("")}><Icon name="close"/></button></div>}
  </div>;
}
function toBlock(title:string,body:string){return{title,body}}
function BlockView({block,go}:{block:Block;go:(p:Page)=>void}) {
  if(block.kind==="heading")return <div className="block-heading"><span>فصل دوم</span><h2>{block.title}</h2><p>{block.body}</p></div>;
  if(block.kind==="code")return <div><h3>{block.title}</h3><PythonRun code={block.body}/></div>;
  if(block.kind==="video")return <button className="video-placeholder" onClick={()=>go("upload")}><Icon name="upload"/><b>{block.title}</b><span>{block.body}</span></button>;
  if(block.kind==="quiz")return <div className="builder-quiz"><h3>{block.title}</h3><p>{block.body}</p>{(block.options||["گزینه اول را ویرایش کنید","گزینه دوم را ویرایش کنید"]).map((option,index)=><div className={`fake-option ${block.correctOption===index?"correct":""}`} key={index}>{option}</div>)}</div>;
  if(block.kind==="vocabulary")return <div className="language-vocabulary"><h3>{block.title}</h3>{block.body.split(/\r?\n/).filter(Boolean).map((line,i)=>{const [word,meaning]=line.split("|").map(part=>part.trim());return <div key={i}><b dir="ltr">{word}</b><span>{meaning||"معنی فارسی را در پنل ویژگی‌ها وارد کنید"}</span></div>})}</div>;
  if(block.kind==="example") {const [translation,english]=block.body.split(/\r?\n/);return <div className="language-example"><h3>{block.title}</h3><span>ترجمه فارسی</span><p>{translation}</p><span>English</span><b dir="ltr">{english||"جمله انگلیسی را در پنل ویژگی‌ها وارد کنید"}</b></div>}
  if(block.kind==="dialogue")return <div className="language-dialogue"><h3>{block.title}</h3>{block.body.split(/\r?\n/).filter(Boolean).map((line,i)=><p key={i} dir={/^[AB]:/.test(line)?"ltr":"rtl"}>{line}</p>)}</div>;
  if(block.kind==="note")return <div className="note-block"><Icon name="bell"/><div><b>{block.title}</b><p>{block.body}</p></div></div>;
  if(block.kind==="ai")return <div className="ai-block"><Badge tone="purple">پیشنهاد AI · نیازمند بازبینی</Badge><h3>{block.title}</h3><p>{block.body}</p></div>;
  return <div><h3>{block.title}</h3><p>{block.body}</p></div>;
}

function StudentPublishedBlock({block,go}:{block:Block;go:(p:Page)=>void}){
  const [choice,setChoice]=useState<number|null>(null);
  if(block.kind!=="quiz")return <article className="published-lesson-block"><BlockView block={block} go={go}/></article>;
  const options=block.options||[];
  return <section className="panel lesson-practice published-quiz"><h2>{block.title}</h2><p>{block.body}</p>{options.map((option,index)=><button type="button" key={`${block.id}-${index}`} className={`practice-answer ${choice===index?(index===block.correctOption?"correct":"incorrect"):""}`} onClick={()=>setChoice(index)}>{option}</button>)}{choice!==null&&<p className={choice===block.correctOption?"practice-feedback correct":"practice-feedback incorrect"} role="status">{choice===block.correctOption?"پاسخ درست است. آفرین!":"این گزینه درست نیست؛ متن درس را مرور کن و دوباره تلاش کن."}</p>}</section>;
}

function Upload({go,path}:{go:(p:Page)=>void;path:LearningPath}) {
  return <div className="page narrow"><button className="back-link" onClick={()=>go("builder")}><Icon name="back"/> بازگشت به سازنده</button><MediaUploader path={path}/></div>;
}

function AIDraft({ go, path }: { go:(p:Page)=>void;path:LearningPath }) {
  const [prompt,setPrompt]=useState("");const [title,setTitle]=useState("");const [state,setState]=useState<"empty"|"loading"|"ready"|"saved">("empty");const [draft,setDraft]=useState("");const [source,setSource]=useState<AISource>();const [error,setError]=useState("");
  const [targetLessonId,setTargetLessonId]=useState(()=>path==="english"?getEnglishLesson(localStorage.getItem("nova-selected-english-lesson")||undefined).id:"l2-1");
  const targetLesson=path==="english"?getEnglishLesson(targetLessonId):undefined;
  const generate=async()=>{if(!prompt.trim())return;setState("loading");setError("");try{const result=await requestApi<{answer:string;source:AISource}>("/api/ai",{mode:"teacher",topic:prompt,level:targetLesson?.level||"مقدماتی",subject:path,lessonId:targetLessonId});setTitle(prompt.slice(0,100));setDraft(result.answer);setSource(result.source);setState("ready")}catch(reason){setError(reason instanceof Error?reason.message:"ساخت پیش‌نویس ناموفق بود.");setState("empty")}};
  const saveDraft=()=>{const key=`nova-drafts:${path}`,saved=JSON.parse(localStorage.getItem(key)||"[]");saved.unshift({id:Date.now(),title,content:draft,createdAt:new Date().toISOString(),status:"draft"});localStorage.setItem(key,JSON.stringify(saved));setState("saved")};
  const addDraftToCanvas=()=>{saveDraft();localStorage.setItem(`nova-ai-insert:${path}`,JSON.stringify({title,content:draft}));go("builder")};
  return <div className="page ai-page"><section className="ai-request"><div className="ai-title"><span><Icon name="spark"/></span><div><h2>یک پیش‌نویس بسازیم</h2><p>دستیار از مدل AI متصل به سرور استفاده می‌کند؛ بازبینی و انتشار با شماست.</p></div></div>{path==="english"&&<label>درس مرجع<select value={targetLessonId} onChange={event=>{setTargetLessonId(event.target.value);localStorage.setItem("nova-selected-english-lesson",event.target.value)}}>{englishLessons.map(lesson=><option value={lesson.id} key={lesson.id}>{lesson.level} · {lesson.title}</option>)}</select></label>}<label>درخواست شما<textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={path==="python"?"مثلاً: یک توضیح ساده درباره متغیر برای دانش‌آموز ۱۴ ساله بنویس…":`مثلاً: برای درس «${targetLesson?.title}» یک تمرین گفت‌وگو و سه پرسش چهارگزینه‌ای بساز…`}/></label><div className="prompt-chips">{(path==="python"?["توضیح ساده مفهوم","ساخت مثال کد","طراحی سؤال آزمون"]:["ساخت گفت‌وگوی کوتاه","آموزش واژه با ترجمه","طراحی تمرین گرامر"]).map(x=><button onClick={()=>setPrompt(x+(path==="python"?" برای درس متغیرها":` برای درس ${targetLesson?.title} در سطح ${targetLesson?.level}`))} key={x}>{x}</button>)}</div><Button icon="spark" onClick={()=>void generate()} disabled={!prompt.trim()||state==="loading"}>{state==="loading"?"در حال آماده‌سازی پیش‌نویس…":"ساخت پیش‌نویس"}</Button>{error&&<div className="notice" role="alert">{error}<button className="text-btn" onClick={()=>void generate()}>تلاش دوباره</button></div>}</section>
    <section className="ai-preview"><div className="panel-head"><div><span className="eyebrow">پیشنهاد قابل ویرایش</span><h2>پیش‌نمایش پیش‌نویس</h2></div>{state==="ready"&&<Badge tone="purple">تولیدشده با AI</Badge>}</div>
      {state==="empty"&&<div className="empty"><Icon name="spark" size={32}/><h3>هنوز پیش‌نویسی ساخته نشده</h3><p>درخواست خود را بنویسید تا پیشنهاد اینجا نمایش داده شود.</p></div>}
      {state==="loading"&&<div className="ai-loading"><span><Icon name="spark"/></span><b>در حال آماده‌سازی پیش‌نویس…</b><p>ساختار و زبان محتوا در حال تنظیم است.</p><div><i/><i/><i/></div></div>}
      {(state==="ready"||state==="saved")&&<><div className="ai-warning">این محتوا پیشنهادی است و بدون تصمیم شما منتشر نمی‌شود.</div><label>عنوان<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label>متن پیشنهادی<textarea value={draft} onChange={e=>setDraft(e.target.value)}/></label><AIAnswer text={draft} subject={path} source={source}/>{state==="saved"&&<div className="success-message"><Icon name="check"/> پیش‌نویس در این مرورگر ذخیره شد؛ هنوز به پایگاه داده یا درس منتشرشده اضافه نشده است.</div>}<div className="form-actions"><Button tone="secondary" onClick={saveDraft}>ذخیره پیش‌نویس</Button><Button onClick={addDraftToCanvas}>افزودن به بوم درس</Button></div></>}
    </section></div>;
}

const studentRows=[["نیلا احمدی","۸۲٪","۸۶٪","۲:۴۵"],["آرین یوسفی","۷۴٪","۸۱٪","۱:۵۰"],["رها کریمی","۶۸٪","۷۷٪","۲:۱۰"],["پارسا رضایی","۴۹٪","۶۲٪","۰:۵۵"]];
function Students({go,path}:{go:(p:Page)=>void;path:LearningPath}){const rows=path==="python"?studentRows:[["نیلا احمدی","۸۶٪","۸۲٪","۲:۴۵"],["آرین یوسفی","۷۸٪","۸۰٪","۱:۵۰"],["رها کریمی","۶۹٪","۷۶٪","۲:۱۰"],["پارسا رضایی","۵۲٪","۶۵٪","۰:۵۵"]];return <div className="page"><Badge tone="amber">نتایج و زمان حضور در این صفحه داده نمونه است.</Badge><div className="toolbar"><div className="search"><Icon name="users"/><input placeholder="جست‌وجوی زبان‌آموز…"/></div><select><option>{path==="python"?"پایتون از پایه":"انگلیسی از پایه · A1"}</option></select><select><option>{path==="python"?"همه فصل‌ها":"همه مهارت‌ها"}</option></select></div><section className="panel table-panel"><table><thead><tr><th>زبان‌آموز</th><th>پیشرفت دوره</th><th>میانگین تمرین</th><th>زمان این هفته</th><th>آخرین فعالیت</th><th/></tr></thead><tbody>{rows.map((s,i)=><tr key={s[0]} onClick={()=>go("student")}><td><span className="student-avatar">{s[0][0]}</span><b>{s[0]}</b></td><td><div className="table-progress"><i style={{width:s[1]}}/></div>{s[1]}</td><td>{s[2]}</td><td dir="ltr">{s[3]}</td><td>{i+1} ساعت پیش</td><td><Icon name="back"/></td></tr>)}</tbody></table></section></div>}

function StudentDetail({go,path}:{go:(p:Page)=>void;path:LearningPath}) {
  const english=path==="english";
  const topics=english?[["پرسیدن درباره محل زندگی","۲ پاسخ نیازمند مرور"],["کاربرد from و live","اعتمادبه‌نفس در گفت‌وگو: رو به رشد"]]:[["تفاوت عدد و رشته","۲ پاسخ نادرست در تمرین‌ها"],["قواعد نام‌گذاری","اعتمادبه‌نفس ثبت‌شده: متوسط"]];
  return <div className="page"><button className="back-link" onClick={()=>go("students")}><Icon name="back"/> بازگشت به فهرست</button><section className="student-head"><div className="student-avatar large">ن</div><div><h2>نیلا احمدی</h2><p>{english?"انگلیسی از پایه · سطح A1":"پایتون از پایه"} · به‌روزرسانی: امروز، ساعت ۱۰:۴۲</p></div><select><option>۳۰ روز اخیر</option><option>۷ روز اخیر</option></select></section><section className="metrics"><Metric icon="course" label="تکمیل درس‌ها" value={english?"۷۶٪":"۸۲٪"} detail={english?"۲۳ از ۳۰ درس":"۱۹ از ۲۴ درس"} tone="purple"/><Metric icon="report" label={english?"میانگین تمرین":"میانگین آزمون"} value={english?"۸۲٪":"۸۶٪"} detail={english?"۵ تمرین":"۵ آزمون"} tone="green"/><Metric icon="clock" label="زمان مطالعه" value="۹:۲۰" detail="ساعت در ۳۰ روز" tone="amber"/><Metric icon="spark" label="نیازمند مرور" value="۲" detail="موضوع پیشنهادی" tone="blue"/></section><div className="two-col"><section className="panel"><div className="panel-head"><h2>{english?"روند نتیجه تمرین":"روند نتیجه آزمون"}</h2><Badge tone="gray">۳۰ روز اخیر</Badge></div><Chart/></section><section className="panel"><div className="panel-head"><h2>درس‌های نیازمند مرور</h2></div>{topics.map((topic,index)=><div className="review-row" key={topic[0]}><span>{index+1}</span><div><b>{topic[0]}</b><p>{topic[1]}</p></div><Badge tone="amber">مرور</Badge></div>)}</section></div></div>;
}
function Chart(){return <div className="chart" role="img" aria-label="روند نمره‌های نیلا از ۶۲ تا ۸۶ درصد"><div className="chart-grid"/><svg viewBox="0 0 500 180" preserveAspectRatio="none"><path d="M20 135L135 115L250 92L365 70L480 45"/>{[[20,135],[135,115],[250,92],[365,70],[480,45]].map(p=><circle key={p[0]} cx={p[0]} cy={p[1]} r="6"/>)}</svg><div className="chart-labels"><span>آزمون ۱</span><span>آزمون ۲</span><span>آزمون ۳</span><span>آزمون ۴</span><span>آزمون ۵</span></div></div>}

function Reports({path}:{path:LearningPath}){const english=path==="english",topics=english?[["معرفی و احوال‌پرسی",94],["واژگان روزمره",78],["پرسیدن درباره شهر",61],["جمله‌سازی A1",38]]:[["شروع با پایتون",94],["داده‌ها و متغیرها",78],["شرط‌ها",61],["حلقه‌ها",38]],rows=english?[["معرفی خود · A1","۵۴","۷۶٪","۸۲٪","۱۵ دقیقه"],["واژگان روزمره","۴۸","۶۹٪","۷۸٪","۱۸ دقیقه"],["پرسش و پاسخ کوتاه","۴۱","۵۸٪","۷۴٪","۱۶ دقیقه"]]:[["متغیرها و انواع داده","۶۸","۷۸٪","۸۱٪","۱۸ دقیقه"],["رشته‌ها","۶۱","۶۹٪","۷۶٪","۲۲ دقیقه"],["عملگرها","۵۴","۵۸٪","۷۹٪","۱۶ دقیقه"]];return <div className="page"><Badge tone="amber">این گزارش داده نمونه است و به پایگاه داده وصل نیست.</Badge><div className="toolbar"><select><option>{english?"انگلیسی از پایه · A1":"پایتون از پایه"}</option></select><select><option>همه درس‌ها</option></select><select><option>۳۰ روز اخیر</option></select><Button tone="secondary">دریافت گزارش</Button></div><section className="metrics"><Metric icon="users" label={english?"زبان‌آموز فعال":"دانش‌آموز فعال"} value={english?"۵۴":"۶۸"} detail={english?"از ۶۰ نفر":"از ۷۲ نفر"} tone="purple"/><Metric icon="course" label="نرخ تکمیل" value={english?"۷۶٪":"۷۸٪"} detail="نمونه" tone="green"/><Metric icon="report" label={english?"میانگین تمرین":"میانگین آزمون"} value={english?"۸۰٪":"۸۱٪"} detail="۴ فعالیت" tone="blue"/><Metric icon="clock" label="میانگین مطالعه" value="۲:۱۰" detail="ساعت در هفته" tone="amber"/></section><div className="two-col report-grid"><section className="panel"><div className="panel-head"><h2>{english?"روند نتیجه تمرین‌ها":"روند نتیجه آزمون‌ها"}</h2><Badge tone="gray">داده نمونه</Badge></div><Chart/></section><section className="panel bars"><div className="panel-head"><h2>{english?"پیشرفت مهارت‌ها":"تکمیل فصل‌ها"}</h2></div>{topics.map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}٪</b><div className="progress"><i style={{width:`${x[1]}%`}}/></div></div>)}</section></div><section className="panel table-panel report-table"><div className="panel-head"><h2>جزئیات درس‌ها</h2></div><table><thead><tr><th>درس</th><th>شروع‌کنندگان</th><th>تکمیل</th><th>{english?"میانگین تمرین":"میانگین آزمون"}</th><th>زمان متوسط</th></tr></thead><tbody>{rows.map(r=><tr key={r[0]}>{r.map(c=><td key={c}>{c}</td>)}</tr>)}</tbody></table></section></div>}

function Preview({go,path}:{go:(p:Page)=>void;path:LearningPath}){const lesson=getEnglishLesson(localStorage.getItem("nova-selected-english-lesson")||undefined);return <div className="preview-shell"><div className="preview-bar"><div><Badge tone="amber">حالت پیش‌نمایش دانش‌آموز</Badge><span>این صفحه هنوز منتشر نشده است.</span></div><Button tone="secondary" onClick={()=>go("builder")}>بازگشت به سازنده</Button></div><article className="student-preview">{path==="english"?<><span className="eyebrow">انگلیسی از پایه · سطح {lesson.level}</span><h1>{lesson.title}</h1><p className="lead">{lesson.goal}</p><div className="language-vocabulary"><h2>واژگان کلیدی</h2>{lesson.vocabulary.map(([word,meaning])=><div key={word}><b dir="ltr">{word}</b><span>{meaning}</span></div>)}</div><div className="language-example"><span>ترجمه فارسی</span><p>{lesson.dialogue[0]?.persian}</p><span>English</span><b dir="ltr">{lesson.dialogue[0]?.english}</b></div><div className="language-dialogue"><h2>گفت‌وگو</h2>{lesson.dialogue.map((line,index)=><div className="dialogue-line" key={index}><p>ترجمه فارسی: {line.persian}</p><p dir="ltr">{line.speaker}: {line.english}</p></div>)}</div><div className="preview-note"><b>تمرین</b><p>{lesson.practice}</p></div></>:<><span className="eyebrow">فصل دوم · درس سوم</span><h1>متغیرها چیستند؟</h1><p className="lead">در این درس با جعبه‌های نام‌دار پایتون آشنا می‌شویم.</p><div className="preview-video"><button><Icon name="play" size={30}/></button></div><h2>یک تعریف ساده</h2><p>متغیر نامی است که به یک مقدار اشاره می‌کند و استفاده دوباره از داده را آسان‌تر می‌کند.</p><pre dir="ltr"><code>{'name = "Nila"\nage = 14\nprint(name, age)'}</code></pre><div className="preview-note"><b>نکته</b><p>نام متغیر را کوتاه و معنادار انتخاب کنید.</p></div></>}</article></div>}

function VideoStage({ review = false, src, title, loading=false, error }: { review?: boolean; src?: string; title?: string; loading?:boolean; error?:string }) {
  const [playbackError,setPlaybackError]=useState(false);
  useEffect(()=>setPlaybackError(false),[src]);
  const message=loading?"در حال بررسی ویدیوی این درس…":error?"ویدیوی درس بارگذاری نشد":playbackError?"پخش ویدیو ناموفق بود":"برای این درس ویدیوی تأییدشده‌ای ثبت نشده است";
  return <div className={`video-stage ${src&&!playbackError?"video-stage-loaded":"video-stage-empty"}`}>
    {src&&!playbackError?<video src={src} controls playsInline preload="metadata" aria-label={title||"ویدیوی درس"} onError={()=>setPlaybackError(true)}/>:<div className="video-empty-message"><Icon name={loading?"clock":"media"} size={31}/><b>{message}</b><span>{error|| (review?"پس از بارگذاری و تأیید رسانه، پیش‌نمایش آن اینجا نمایش داده می‌شود.":"مدرس پس از بارگذاری و تأیید مدیر، ویدیو را برای همین درس منتشر می‌کند.")}</span></div>}
  </div>;
}

function StudentHome({go,path}:{go:(p:Page)=>void;path:LearningPath}) {
  return <div className="page student-demo"><section className={`student-welcome ${path}`}><div><Badge tone="purple">{path==="python"?"پایتون از پایه":"انگلیسی از پایه · A1"}</Badge><h2>{path==="python"?"متغیرها و انواع داده":"واژگان روزمره و معرفی خود"}</h2><p>{path==="python"?"فصل دوم · ۱۲ دقیقه تا پایان این درس":"سطح A1 · شنیداری و گفت‌وگو · ۱۵ دقیقه"}</p><Button icon="play" onClick={()=>go("student-lesson")}>ادامه درس</Button></div><div className="learning-path">{path==="english"?<><span className="path-word" dir="ltr">Hello</span><i/><span className="path-word active" dir="ltr">Speak</span></>:<><span className="path-dot done"><Icon name="check"/></span><i/><span className="path-dot active">۳</span><i/><span className="path-dot">۴</span></>}</div></section>
    <Badge tone="amber">آمار یادگیری زیر برای نمایش طراحی است؛ سوابق این صفحه هنوز به پایگاه داده متصل نیستند.</Badge>
    <section className="metrics"><Metric icon="course" label="پیشرفت دوره" value="۶۴٪" detail={path==="python"?"۱۲ از ۲۴ درس":"۸ از ۳۶ درس · نمونه"} tone="purple"/><Metric icon="clock" label="یادگیری این هفته" value="۲:۴۵" detail="ساعت" tone="amber"/><Metric icon="report" label="آخرین نتیجه" value="۸۶٪" detail={path==="python"?"آزمون فصل دوم":"تمرین واژگان A1 · نمونه"} tone="green"/><Metric icon="spark" label={path==="python"?"پرسش از یار":"تمرین با یار"} value="۳" detail="این هفته · نمونه" tone="blue"/></section>
    <div className="two-col"><section className="panel student-next"><div className="panel-head"><div><span className="eyebrow">برنامه من</span><h2>قدم‌های بعدی</h2></div></div><button onClick={()=>go("student-lesson")}><span className="step-icon"><Icon name="play"/></span><div><b>{path==="python"?"دیدن ادامه ویدیوی درس":"گوش‌دادن به گفت‌وگوی درس"}</b><small>{path==="python"?"متغیرها و انواع داده":"معرفی خود · سطح A1"} · ۵ دقیقه</small></div><Badge tone="purple">ادامه</Badge></button><button onClick={()=>go("student-course")}><span className="step-icon amber"><Icon name="builder"/></span><div><b>{path==="python"?"تمرین کوتاه متغیرها":"تمرین جمله‌سازی انگلیسی"}</b><small>حدود ۸ دقیقه</small></div><Icon name="back"/></button></section>
      <section className="student-yar-card"><span><Icon name="spark"/></span><h2>جایی گیر کردی؟</h2><p>یار با پرسش و مثال کمکت می‌کند خودت به پاسخ برسی.</p><Button tone="secondary" onClick={()=>go("student-yar")}>پرسیدن از یار</Button></section></div>
  </div>;
}

function StudentCourse({go,path}:{go:(p:Page)=>void;path:LearningPath}) {
  const openLesson=(id:string)=>{localStorage.setItem("nova-selected-english-lesson",id);go("student-lesson")};
  const chapters=path==="python"?[["فصل ۱","شروع سفر با پایتون","تکمیل‌شده",100],["فصل ۲","داده‌ها و متغیرها","در حال یادگیری",60],["فصل ۳","شرط‌ها و تصمیم‌گیری","قفل",0]]:[["سطح A1","سلام و معرفی خود","تکمیل‌شده",100],["سطح A1","واژگان روزمره و گفت‌وگو","در حال یادگیری",64],["سطح A2","گرامر و مکالمه کاربردی","قفل",0],["سطح B1","گفت‌وگوی مستقل","قفل",0]];
  return <div className="page student-course"><section className={`course-student-hero ${path}`}><div><Badge tone="purple">دوره فعال</Badge><h2>{path==="python"?"پایتون از پایه":"انگلیسی از پایه"}</h2><p>{path==="python"?"۲۴ درس · ۶ فصل · مدرس: سارا محمودی":"۳۶ درس · سطح A1 تا B1 · مدرس: سارا محمودی"}</p></div><div><strong>۶۴٪</strong><span>پیشرفت تو</span></div></section>
    {path==="english"?<section className="student-chapter english-lesson-list"><div><span>مهارت‌های سطح A1</span><h3>درس‌های انگلیسی</h3><p>هر درس با واژگان، نمونه گفت‌وگو، تمرین فهم و یک فعالیت کوتاه تمام می‌شود.</p></div>{englishLessons.map((lesson,index)=>{const published=readPublishedLesson("english",lesson.id);return <button className="english-lesson-row" key={lesson.id} onClick={()=>openLesson(lesson.id)}><span className="lesson-number">{index+1}</span><span className="grow"><b>{published?.title||lesson.title}</b><small>{lesson.level} · {lesson.duration} · {lesson.goal}</small></span><Badge tone={published?"green":"purple"}>{published?"درس منتشرشده":"درس دمو"}</Badge><Icon name="back"/></button>})}</section>:chapters.map((c,i)=><section className="student-chapter" key={`${c[0]}-${c[1]}`}><div><span>{c[0]}</span><h3>{c[1]}</h3></div><Badge tone={i===0?"green":i===1?"purple":"gray"}>{c[2]}</Badge><div className="progress"><i style={{width:`${c[3]}%`}}/></div>{i===1&&<button onClick={()=>go("student-lesson")}><span>۳</span><div><b>متغیرها و انواع داده</b><small>ادامه از دقیقه ۵:۱۸</small></div><Button tone="secondary">ادامه درس</Button></button>}</section>)}
  </div>;
}

type MediaAsset={publicId:string;secureUrl:string;title:string;lessonId:string;status:string;bytes:number;duration:number;uploadedBy?:string;courseSubject?:LearningPath};
function readBrowserMedia():MediaAsset[]{try{const rows=JSON.parse(localStorage.getItem("nova-demo-media")||"[]");return Array.isArray(rows)?rows:[]}catch{return []}}
function writeBrowserMedia(items:MediaAsset[]){try{localStorage.setItem("nova-demo-media",JSON.stringify(items))}catch{/* The demo remains usable without persistent browser storage. */}}
function MediaUploader({path,compact=false,lessonId:requestedLessonId,onUploaded}:{path:LearningPath;compact?:boolean;lessonId?:string;onUploaded?:(asset:MediaAsset)=>void}){
  const lessonId=requestedLessonId||(path==="python"?"l2-1":getEnglishLesson(localStorage.getItem("nova-selected-english-lesson")||undefined).id);
  const [file,setFile]=useState<File|null>(null),[progress,setProgress]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(""),[asset,setAsset]=useState<MediaAsset|null>(null);
  const controller=useMemo(()=>({current:null as AbortController|null}),[]);
  const upload=async(selected:File)=>{setError("");setAsset(null);setProgress(0);setBusy(true);const aborter=new AbortController();controller.current=aborter;try{const saved=await uploadLessonVideo(selected,path,lessonId,setProgress,aborter.signal);setAsset(saved);onUploaded?.(saved)}catch(reason){setError(reason instanceof Error?reason.message:"بارگذاری ویدیو ناموفق بود.")}finally{controller.current=null;setBusy(false)}};
  return <section className={`panel shared-uploader ${compact?"compact":""}`}><div className="panel-head"><div><span className="eyebrow">افزودن رسانه به درس</span><h2>بارگذاری ویدیو</h2></div><Badge tone="gray">حداکثر ۵۰۰ مگابایت</Badge></div><div className="upload-lesson-lock"><Icon name="course"/> {path==="python"?"پایتون · متغیرها و انواع داده":"انگلیسی · معرفی خود (A1)"}</div><input type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg,.m4v" disabled={busy} aria-label="انتخاب ویدیوی درس" onChange={event=>{const chosen=event.target.files?.[0];if(chosen){setFile(chosen);setAsset(null);setError("");setProgress(0)}event.currentTarget.value=""}}/>{file&&!busy&&!asset&&<Button icon="upload" onClick={()=>void upload(file)}>بارگذاری به Cloudinary</Button>}{file&&<div className="upload-status"><div className="video-thumb"><Icon name={asset?"check":"media"}/></div><div className="grow"><b>{file.name}</b><span>{busy?`در حال بارگذاری امن… ${progress}٪`:asset?"بارگذاری تأیید شد؛ در انتظار بررسی مدیر":"فایل انتخاب شده؛ برای شروع بارگذاری، دکمه را بزنید."}</span><div className="progress"><i style={{width:`${progress}%`}}/></div></div>{busy?<button className="btn secondary" onClick={()=>controller.current?.abort()}>لغو</button>:asset&&<Badge tone="amber">در انتظار تأیید</Badge>}</div>}{error&&<div className="notice" role="alert">{error}</div>}<p className="upload-help">پس از انتخاب، دکمه بارگذاری را بزنید. فایل به Cloudinary می‌رود؛ سرور شناسه، نشانی پخش و اندازه واقعی را بررسی می‌کند. داده نمایشی این دمو برای همین مرورگر نگهداری می‌شود.</p></section>
}

function StudentLesson({go,path}:{go:(p:Page)=>void;path:LearningPath}) {
  const englishLesson=getEnglishLesson(localStorage.getItem("nova-selected-english-lesson")||undefined);
  const lessonId=path==="python"?"l2-1":englishLesson.id;
  const published=readPublishedLesson(path,lessonId);
  const [video,setVideo]=useState<MediaAsset|null>(null),[loading,setLoading]=useState(true),[videoError,setVideoError]=useState("");
  const [englishAnswer,setEnglishAnswer]=useState<number|null>(null);
  useEffect(()=>{setLoading(true);setVideoError("");requestApi<{media:MediaAsset|null}>(`/api/media/lesson/${lessonId}`).then(result=>{const local=readBrowserMedia().find(item=>item.lessonId===lessonId&&item.courseSubject===path&&item.status==="approved")||null;setVideo(result.media||local)}).catch(reason=>{const local=readBrowserMedia().find(item=>item.lessonId===lessonId&&item.courseSubject===path&&item.status==="approved")||null;if(local)setVideo(local);else setVideoError(reason instanceof Error?reason.message:"ویدیوی درس بارگذاری نشد.")}).finally(()=>setLoading(false))},[lessonId,path]);
  const speak=(text:string)=>{if(typeof window!="undefined"&&"speechSynthesis" in window){window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang="en-US";window.speechSynthesis.speak(utterance)}};
  const answers=["I’m from Tehran.","My name is Nila.","I’m fourteen years old.","Yes, I do."];
  return <div className="page student-lesson-page"><div className="lesson-crumb"><button onClick={()=>go("student-course")}>{path==="python"?"پایتون از پایه":"انگلیسی از پایه"}</button><Icon name="back" size={14}/><span>{published?.title||(path==="python"?"متغیرها و انواع داده":englishLesson.title)}</span></div><VideoStage src={video?.secureUrl} title={video?.title} loading={loading} error={videoError}/><section className="student-reading"><div><span className="eyebrow">{path==="python"?"فصل دوم · درس سوم":`سطح ${englishLesson.level} · ${englishLesson.duration}`}</span><h1>{published?.title||(path==="python"?"متغیرها؛ جعبه‌هایی برای نگهداری داده":englishLesson.title)}</h1><p>{published?"این درس در نسخه نمایشی توسط مدرس منتشر شده است; پاسخ‌ها و تمرین‌ها برای بررسی آموزشی آماده‌اند.":path==="python"?"متغیر را مثل یک جعبه نام‌دار در نظر بگیر. می‌توانی مقداری را داخل آن بگذاری و هر وقت لازم شد، با نامش به آن دسترسی پیدا کنی.":englishLesson.goal}</p></div><div className="reading-note"><Icon name="spark"/><div><b>{path==="python"?"نکته مهم":"هدف درس"}</b><p>{published?"محتوای این پیش‌نویس را مرور کن و تمرین را کامل کن.":path==="python"?"نام متغیر بهتر است کوتاه و گویا باشد تا کد خواناتر بماند.":englishLesson.goal}</p></div></div>{published?<div className="published-lesson-content">{published.blocks.map(block=><StudentPublishedBlock key={block.id} block={block} go={go}/>)}</div>:path==="python"?<PythonRun code={'# A name and an age\nname = "Nila"\nage = 14\nprint(name, age)'}/>:<>
      <section className="language-vocabulary"><h2>واژگان کلیدی</h2>{englishLesson.vocabulary.map(([word,meaning])=><div key={word}><b dir="ltr">{word}</b><span>{meaning}</span><button type="button" aria-label={`شنیدن ${word}`} onClick={()=>speak(word)}>پخش تلفظ</button></div>)}</section>
      <section className="language-dialogue"><h2>گفت‌وگوی نمونه</h2>{englishLesson.dialogue.map((line,index)=><div className="dialogue-line" key={`${line.speaker}-${index}`}><p>ترجمه فارسی: {line.persian}</p><p dir="ltr">{line.speaker}: {line.english}</p><button type="button" onClick={()=>speak(line.english)}>شنیدن جمله</button></div>)}<Button tone="secondary" onClick={()=>speak(englishLesson.dialogue.map(line=>line.english).join(" "))}>شنیدن گفت‌وگو</Button></section>
      <section className="panel lesson-practice"><h2>تمرین کوتاه</h2><p>{englishLesson.question}</p>{englishLesson.options.map((answer,index)=><button type="button" key={answer} className={`practice-answer ${englishAnswer===index?(index===englishLesson.correct?"correct":"incorrect"):""}`} onClick={()=>setEnglishAnswer(index)} dir="ltr">{answer}</button>)}{englishAnswer!==null&&<div className={englishAnswer===englishLesson.correct?"practice-feedback correct":"practice-feedback incorrect"} role="status">{englishAnswer===englishLesson.correct?englishLesson.feedback:"این گزینه با پرسش جور نیست. جمله‌های گفت‌وگوی درس را مرور کن و دوباره انتخاب کن."}</div>}<p className="practice-prompt">تمرین کاربردی: {englishLesson.practice}</p></section>
      </>}<div className="lesson-actions"><Button tone="secondary" onClick={()=>go("student-course")}>بازگشت به درس‌ها</Button><Button onClick={()=>go("student-progress")}>تکمیل درس و ادامه</Button></div></section></div>;
}

function StudentProgress({path}:{path:LearningPath}){const topics=path==="python"?["تفاوت عدد و رشته","قواعد نام‌گذاری"]:["پرسیدن درباره محل زندگی","کاربرد from و live"];return <div className="page"><section className="student-score"><div><strong>{path==="python"?"۸۶":"۸۲"}</strong><span>از ۱۰۰</span></div><div><Badge tone="green">نتیجه نمونه</Badge><h2>{path==="python"?"آفرین، روندت رو به رشد است!":"پیشرفت زبانت را ادامه بده!"}</h2><p>{path==="python"?"در چهار آزمون اخیر ۲۴ واحد پیشرفت داشته‌ای.":"در تمرین‌های اخیر واژگان و معرفی خود بهتر عمل کرده‌ای."}</p></div></section><div className="two-col"><section className="panel"><div className="panel-head"><h2>{path==="python"?"روند نتیجه آزمون":"روند تمرین‌های زبان"}</h2><Badge tone="gray">۴ فعالیت اخیر</Badge></div><Chart/></section><section className="panel"><div className="panel-head"><h2>پیشنهاد مرور</h2></div>{topics.map((topic,index)=><div className="review-row" key={topic}><span>{index+1}</span><div><b>{topic}</b><p>{index===0?"یک پاسخ نیاز به مرور دارد":"برای تثبیت بیشتر تمرین کن"}</p></div><Badge tone="amber">مرور</Badge></div>)}</section></div></div>}

type ChatMessage={role:"assistant"|"user";content:string;source?:AISource};
function loadChatThreads():Record<string,ChatMessage[]>{try{return JSON.parse(localStorage.getItem("nova-ai-threads-v2")||"{}")}catch{return {}}}
function StudentYar({path,user}:{path:LearningPath;user:AuthUser|null}){
  const lessonId=path==="python"?"l2-1":getEnglishLesson(localStorage.getItem("nova-selected-english-lesson")||undefined).id,username=user?.username||"preview",chatKey=`${username}:${path}:${lessonId}`;
  const [threads,setThreads]=useState<Record<string,ChatMessage[]>>(loadChatThreads),[text,setText]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const currentEnglishLesson=path==="english"?getEnglishLesson(lessonId):undefined;
  const initial:ChatMessage={role:"assistant",content:path==="python"?"سلام! درباره متغیرها و مثال‌های همین درس چه پرسشی داری؟":`سلام! درباره درس «${currentEnglishLesson?.title}» چه کمکی می‌خواهی؟`};
  const messages=threads[chatKey]||[initial];
  const replaceMessages=(next:ChatMessage[])=>setThreads(previous=>{const updated={...previous,[chatKey]:next};localStorage.setItem("nova-ai-threads-v2",JSON.stringify(updated));return updated});
  const send=async()=>{const question=text.trim();if(!question||busy)return;setText("");setError("");setBusy(true);const pending=[...messages,{role:"user" as const,content:question},{role:"assistant" as const,content:"در حال نوشتن پاسخ…"}];replaceMessages(pending);
    const courseTitle=path==="python"?"پایتون از پایه":"انگلیسی از پایه · A1",lessonTitle=path==="python"?"متغیرها و انواع داده":"معرفی خود در یک گفت‌وگوی کوتاه",lessonContent=path==="python"?"در این درس متغیر را به‌عنوان نامی برای دسترسی دوباره به یک مقدار می‌آموزیم. مثال درس: name = \"Nila\"; age = 14; print(name, age).":"در این درس زبان‌آموز نام، شهر و علایق خود را با جمله‌های کوتاه معرفی می‌کند. مثال درس: Hello, I’m Nila. / سلام، من نیلا هستم.";
    try{const result=await requestApi<{answer:string;source:AISource}>("/api/ai",{mode:"tutor",role:"student",message:question,subject:path,lessonId});replaceMessages([...pending.slice(0,-1),{role:"assistant",content:result.answer,source:result.source}])}
    catch(reason){const message=reason instanceof Error?reason.message:"پاسخ یار دریافت نشد.";setError(message);replaceMessages(pending.slice(0,-1))}finally{setBusy(false)}};
  return <div className="page yar-demo"><section className="student-chat"><div className="chat-head"><span><Icon name="spark"/></span><div><b>یارِ {path==="python"?"متغیرها":"گفت‌وگوی انگلیسی"}</b><small><i/> آماده گفت‌وگو</small></div><Badge tone="purple">فقط همین درس</Badge></div><div className="chat-scope"><Icon name="course"/>پاسخ‌ها بر اساس درس منتشرشده، راهنمای تأییدشده مدرس و سوابق ثبت‌شده در مسیر انتخابی ساخته می‌شوند.</div><div className="chat-messages">{messages.map((m,i)=><div className={m.role==="user"?"mine":"yar-message"} key={`${chatKey}-${i}`}>{m.role==="assistant"&&<span><Icon name="spark" size={15}/></span>}{m.role==="user"?<p>{m.content}</p>:<div className="message-content"><AIAnswer text={m.content} subject={path} source={m.source}/></div>}</div>)}</div>{error&&<div className="notice" role="alert">{error}</div>}<div className="chat-compose"><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send()}}} placeholder={path==="python"?"پرسشت را درباره همین درس بنویس…":"پرسشت را درباره واژه یا جمله بنویس…"}/><button onClick={()=>void send()} disabled={!text.trim()||busy} aria-label="ارسال پرسش"><Icon name="back"/></button><small>پرسش‌ها در همین مرورگر و جدا برای هر مسیر ذخیره می‌شوند.</small></div></section></div>
}

function LessonReview({go}:{go:(p:Page)=>void}) {
  return <div className="page review-page"><div className="review-layout"><section><VideoStage review/><div className="video-review-meta"><div><Badge tone="amber">در انتظار بازبینی مدرس</Badge><h2>متغیرها و انواع داده</h2><p>lesson-03-variables.mp4 · ۱۲:۴۰ دقیقه · 1080p</p></div><Button icon="eye" tone="secondary" onClick={()=>go("preview")}>نمای دانش‌آموز</Button></div><div className="review-timeline"><h3>نشانگرهای بازبینی</h3><button><b>۰۱:۴۲</b><span>زیرنویس «متغییر» نیاز به اصلاح دارد.</span><Badge tone="red">اصلاح</Badge></button><button><b>۰۸:۱۵</b><span>مثال کد با متن درس هماهنگ است.</span><Badge tone="green">تأیید</Badge></button></div></section><aside className="review-side"><span className="eyebrow">چک‌لیست انتشار</span><h2>بازبینی نهایی درس</h2>{[["هماهنگی ویدیو با متن",true],["کیفیت صدا و تصویر",true],["زیرنویس کامل و صحیح",false],["مثال کد قابل اجرا",true]].map(x=><label key={String(x[0])}><input type="checkbox" defaultChecked={Boolean(x[1])}/><span>{x[0]}</span></label>)}<label className="review-comment">یادداشت بازبینی<textarea placeholder="نکته‌ای برای اصلاح این درس بنویسید…"/></label><div className="review-decisions"><Button tone="secondary" onClick={()=>go("builder")}>بازگشت برای اصلاح</Button><Button disabled>تأیید برای انتشار</Button></div><p className="decision-hint">تا رفع ایراد زیرنویس، انتشار غیرفعال است.</p></aside></div></div>
}

function AdminMediaReview({path}:{path:LearningPath}) {
  const [media,setMedia]=useState<MediaAsset[]>([]),[selectedId,setSelectedId]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const refresh=async()=>{const result=await requestApi<{media:MediaAsset[]}>("/api/media");const merged=[...(result.media||[]),...readBrowserMedia().filter(item=>item.courseSubject===path)];const unique=[...new Map(merged.map(item=>[item.publicId,item])).values()];setMedia(unique);setSelectedId(current=>unique.some(item=>item.publicId===current)?current:unique[0]?.publicId||"")};
  useEffect(()=>{void refresh().catch(reason=>setError(reason instanceof Error?reason.message:"فهرست رسانه بارگذاری نشد."))},[]);
  const selected=media.find(item=>item.publicId===selectedId);
  const review=async(status:"approved"|"rejected")=>{if(!selected)return;setBusy(true);setError("");try{const result=await requestApi<{media?:Partial<MediaAsset>}>(`/api/media/${encodeURIComponent(selected.publicId)}/review`,{status});const next={...selected,...result.media,status,reviewedBy:"admin-demo",updatedAt:new Date().toISOString()};writeBrowserMedia([next,...readBrowserMedia().filter(item=>item.publicId!==next.publicId)]);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"ثبت تصمیم رسانه ناموفق بود.")}finally{setBusy(false)}};
  const statusLabel=(status:string)=>status==="approved"?"تأییدشده":status==="rejected"?"ردشده":"در انتظار تأیید";
  return <div className="page admin-media"><MediaUploader path={path} compact onUploaded={()=>void refresh()}/><div className="media-queue"><section className="panel"><div className="panel-head"><div><span className="eyebrow">صف بررسی</span><h2>رسانه‌های ثبت‌شده</h2></div><Badge tone="amber">{media.filter(item=>item.status==="pending-review").length} در انتظار</Badge></div>{media.map(item=><button className={item.publicId===selectedId?"active":""} key={item.publicId} onClick={()=>setSelectedId(item.publicId)}><span className="media-mini"><Icon name="play"/></span><div><b>{item.title}</b><small>{statusLabel(item.status)} · {item.uploadedBy||"مدرس"}</small></div>{item.publicId===selectedId&&<i/>}</button>)}{media.length===0&&<div className="empty">هنوز رسانه‌ای برای بررسی ثبت نشده است.</div>}</section><section className="media-review-main">{selected?<><VideoStage review src={selected.secureUrl} title={selected.title}/><div className="video-review-meta"><div><Badge tone={selected.status==="approved"?"green":selected.status==="rejected"?"red":"amber"}>{statusLabel(selected.status)}</Badge><h2>{selected.title}</h2><p>{selected.uploadedBy||"مدرس"} · {selected.bytes?`${(selected.bytes/1024/1024).toFixed(1)} مگابایت`:"اندازه نامشخص"} · {selected.lessonId||"بدون پیوند درس"}</p></div></div><div className="media-checks"><span><Icon name="check"/>از کتابخانه فضای ابری</span><span><Icon name="check"/>مشاهده ویدیو برای بازبینی</span></div></>:<div className="panel empty">برای بازبینی، یک رسانه از فهرست انتخاب کنید.</div>}</section><aside className="review-side admin-decision"><span className="eyebrow">تصمیم مدیر</span><h2>بررسی انتشار رسانه</h2><p>تأیید، ویدیو را برای دانش‌آموزان این درس قابل نمایش می‌کند.</p>{error&&<div className="notice" role="alert">{error}</div>}<div className="review-decisions vertical"><Button disabled={!selected||selected.status!=="pending-review"||busy} onClick={()=>void review("approved")}>تأیید رسانه</Button><Button tone="danger" disabled={!selected||selected.status!=="pending-review"||busy} onClick={()=>void review("rejected")}>رد و بازگشت به مدرس</Button></div><div className="audit-note"><Icon name="clock"/><p>وضعیت در API رسانه ثبت می‌شود و فقط برای همین مسیر قابل بازبینی است.</p></div></aside></div></div>
}

function AdminPageView({page,path}:{page:Page;path:LearningPath}) {
  const [health,setHealth]=useState<{databaseConfigured:boolean;aiConfigured:boolean;cloudinaryConfigured:boolean;production:boolean}|null>(null);
  useEffect(()=>{requestApi<{databaseConfigured:boolean;aiConfigured:boolean;cloudinaryConfigured:boolean;production:boolean}>("/api/health").then(setHealth).catch(()=>setHealth(null))},[]);
  const pageName:string=page;
  const cards = pageName==="users"?[["دانش‌آموزان","۲٬۴۸۱","فعال"],["مدرسان","۱۲۶","فعال"],["مدیران","۸","محدود"],["حساب‌های معلق","۱۴","نیازمند بررسی"]]:pageName==="admin-courses"?[["منتشرشده","۴۸","دوره"],["پیش‌نویس","۲۱","دوره"],["در بازبینی","۷","دوره"],["گزارش‌شده","۲","نیازمند بررسی"]]:[["در انتظار تأیید","۱۲","رسانه"],["تأییدشده امروز","۲۸","فایل"],["خطای پردازش","۳","فایل"],["فضای مصرف‌شده","۶۸٪","از ظرفیت"]];
  if(page==="admin-home") return <div className="page"><section className={`admin-hero ${path}`}><div><Badge tone="purple">{path==="python"?"مسیر پایتون":"مسیر زبان انگلیسی"}</Badge><h2>مرکز مدیریت Nova</h2><p>این صفحه وضعیت تنظیمات سرور را نشان می‌دهد؛ آمار کاربران و رسانه‌های زیر نمونه طراحی هستند.</p></div><div className="system-ok"><i/><b>{health?"وضعیت پیکربندی":"در حال بررسی تنظیمات"}<small>این بررسی اتصال واقعی پایگاه داده را آزمایش نمی‌کند.</small></b></div></section><div className="media-checks"><span>{health?.databaseConfigured?"✓":"○"} پایگاه داده {health?.databaseConfigured?"تنظیم شده":"تنظیم نشده"}</span><span>{health?.aiConfigured?"✓":"○"} کلید AI {health?.aiConfigured?"تنظیم شده":"تنظیم نشده"}</span><span>{health?.cloudinaryConfigured?"✓":"○"} فضای رسانه {health?.cloudinaryConfigured?"تنظیم شده":"تنظیم نشده"}</span></div><Badge tone="amber">آمارهای این کارت‌ها و جدول، داده نمایشی هستند.</Badge><section className="metrics"><Metric icon="users" label="کاربران فعال" value="۲٬۶۱۵" detail="نمونه طراحی" tone="purple"/><Metric icon="course" label="دوره منتشرشده" value="۴۸" detail="نمونه طراحی" tone="green"/><Metric icon="media" label="رسانه در انتظار" value="۱۲" detail="نمونه طراحی" tone="amber"/><Metric icon="report" label="گزارش دسترسی" value="۲" detail="نمونه طراحی" tone="blue"/></section><AdminTable type="activity"/></div>;
  if(page==="media") return <AdminMediaReview path={path}/>;
  return <div className="page"><div className="toolbar"><div className="search"><Icon name={pageName==="users"?"users":pageName==="media"?"media":"course"}/><input placeholder="جست‌وجو…"/></div><select><option>{path==="python"?"مسیر پایتون":"مسیر انگلیسی"}</option><option>همه مسیرها</option></select><select><option>همه وضعیت‌ها</option></select><Button icon="plus">{pageName==="users"?"افزودن کاربر":pageName==="media"?"بارگذاری رسانه":"افزودن دوره"}</Button></div><section className="metrics compact">{cards.map((c,i)=><Metric key={c[0]} icon={pageName==="users"?"users":pageName==="media"?"media":"course"} label={c[0]} value={c[1]} detail={c[2]} tone={["purple","green","amber","blue"][i]}/>)}</section><AdminTable type={pageName}/></div>
}
function AdminTable({type}:{type:string}){const rows=type==="users"?[["نیلا احمدی","دانش‌آموز","فعال","امروز"],["سارا محمودی","مدرس","فعال","امروز"],["علی رضایی","مدرس","معلق","۲ روز پیش"]]:type==="media"?[["lesson-03.mp4","سارا محمودی","در انتظار تأیید","امروز"],["loops-cover.jpg","امیر کریمی","تأییدشده","امروز"],["project-demo.mp4","سارا محمودی","خطای پردازش","دیروز"]]:[["پایتون از پایه","سارا محمودی","منتشرشده","۶۸ دانش‌آموز"],["حل مسئله با پایتون","سارا محمودی","پیش‌نویس","—"],["پایتون پیشرفته","امیر کریمی","در بازبینی","۲۳ دانش‌آموز"]];return <section className="panel table-panel"><div className="panel-head"><h2>{type==="activity"?"فعالیت مدیریتی اخیر":"فهرست و وضعیت"}</h2><Badge tone="gray">داده نمونه</Badge></div><table><thead><tr><th>عنوان / نام</th><th>مالک / نقش</th><th>وضعیت</th><th>آخرین فعالیت</th><th/></tr></thead><tbody>{rows.map(r=><tr key={r[0]}>{r.map((c,i)=><td key={c}>{i===2?<Badge tone={c.includes("فعال")||c.includes("منتشر")||c.includes("تأییدشده")?"green":c.includes("خطا")?"red":"amber"}>{c}</Badge>:c}</td>)}<td><Button tone="ghost">بررسی</Button></td></tr>)}</tbody></table></section>}

export default function App() {
  const [user,setUser]=useState<AuthUser|null>(null);
  const [authChecked,setAuthChecked]=useState(false);
  const [path,setPathState]=useState<LearningPath|null>(()=>{
    const saved=sessionStorage.getItem("nova-learning-path");
    return saved==="python"||saved==="english"?saved:null;
  });
  const [introDone,setIntroDone]=useState(false);
  const [page,setPage]=useState<Page>("dashboard");
  useEffect(()=>{
    requestApi<{user:AuthUser|null}>("/api/auth/me").then(result=>{
      setUser(result.user);
      if(result.user){setPage(result.user.role==="student"?"student-home":result.user.role==="teacher"?"dashboard":"admin-home");setIntroDone(localStorage.getItem(`nova-intro:${result.user.username}`)==="done")}
    }).catch(()=>setUser(null)).finally(()=>setAuthChecked(true));
  },[]);
  useEffect(()=>{if(user?.courseSubject&&path!==user.courseSubject){sessionStorage.setItem("nova-learning-path",user.courseSubject);setPathState(user.courseSubject)}},[user,path]);
  const setPath=(selected:LearningPath)=>{if(user)return;sessionStorage.setItem("nova-learning-path",selected);setPathState(selected)};
  const enterDemo=async(selectedRole:Role,subject:LearningPath)=>{
    const result=await requestApi<{user:AuthUser}>("/api/auth/login",{demoRole:selectedRole,subject});
    const demoUser=result.user;
    sessionStorage.setItem("nova-learning-path",subject);
    setUser(demoUser);setPage(demoUser.role==="student"?"student-home":demoUser.role==="teacher"?"dashboard":"admin-home");
    setIntroDone(localStorage.getItem(`nova-intro:${demoUser.username}`)==="done");
  };
  const logout=async()=>{try{await requestApi("/api/auth/logout",{})}finally{setUser(null);setIntroDone(false);sessionStorage.removeItem("nova-learning-path");setPathState(null)}};
  const activePath=user?.courseSubject??path??"python";
  const content=useMemo(()=>{
    if(page==="student-home")return <StudentHome go={setPage} path={activePath}/>;
    if(page==="student-course")return <StudentCourse go={setPage} path={activePath}/>;
    if(page==="student-lesson")return <StudentLesson go={setPage} path={activePath}/>;
    if(page==="student-progress")return <StudentProgress path={activePath}/>;
    if(page==="student-yar")return <StudentYar path={activePath} user={user}/>;
    if(page==="dashboard")return <TeacherDashboard go={setPage} path={activePath}/>;
    if(page==="courses")return <Courses go={setPage} path={activePath}/>;
    if(page==="builder")return <Builder key={activePath} go={setPage} path={activePath}/>;
    if(page==="lesson-review")return <LessonReview go={setPage}/>;
    if(page==="upload")return <Upload go={setPage} path={activePath}/>;
    if(page==="ai")return <AIDraft go={setPage} path={activePath}/>;
    if(page==="students")return <Students go={setPage} path={activePath}/>;
    if(page==="student")return <StudentDetail go={setPage} path={activePath}/>;
    if(page==="reports")return <Reports path={activePath}/>;
    if(page==="preview")return <Preview go={setPage} path={activePath}/>;
    return <AdminPageView page={page} path={activePath}/>;
  },[page,activePath,user]);
  if(!authChecked)return <main dir="rtl" style={{minHeight:"100vh",display:"grid",placeItems:"center"}}>در حال اتصال امن…</main>;
  if(!user&&!path)return <PathSelect role={null} onSelect={setPath}/>;
  if(!user)return <Login onDemo={enterDemo} subject={activePath}/>;
  const role=user.role;
  if(!introDone)return <Intro role={role} path={activePath} onDone={()=>{localStorage.setItem(`nova-intro:${user.username}`,"done");setIntroDone(true)}}/>;
  return <Shell role={role} path={activePath} page={page} setPage={setPage} onLogout={()=>{void logout()}} user={user}>{content}</Shell>;
}

