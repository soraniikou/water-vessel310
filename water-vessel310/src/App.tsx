import { useState, useEffect, useRef } from "react";

// ============================================================
//  the water vessel  (English version, no audio)
//  A hydrangea you grow with your own hands.
// ============================================================

// ---------- Blue hydrangea palette (main bloom: open · growing · tend) ----------
const PALETTE: { inner: string; outer: string; tip: string }[] = [
  { inner: "#4a78b8", outer: "#2d5288", tip: "#a8c8e8" },
  { inner: "#5688c4", outer: "#356098", tip: "#b8d4ec" },
  { inner: "#6896c8", outer: "#4070a0", tip: "#c4dcec" },
  { inner: "#7ca4cc", outer: "#4c7ca8", tip: "#d0e4f0" },
  { inner: "#88aed0", outer: "#5888b0", tip: "#dcecf4" },
  { inner: "#94b6d4", outer: "#6494b8", tip: "#e4f0f6" },
  { inner: "#a8b8d4", outer: "#7896b8", tip: "#ecf0f6" },
  { inner: "#9cb0d0", outer: "#6890b4", tip: "#e8eef4" },
  { inner: "#b0c0dc", outer: "#84a0c4", tip: "#f0f4f8" },
  { inner: "#5680b8", outer: "#345c90", tip: "#b4d0e8" },
  { inner: "#6890c0", outer: "#406898", tip: "#c0d8ec" },
  { inner: "#7898c4", outer: "#4870a0", tip: "#ccdcec" },
];

// ---------- Accent palette for florets added one at a time (tap in grow mode) ----------
const ACCENT_PALETTE: { inner: string; outer: string; tip: string }[] = [
  { inner: "#9b7fc4", outer: "#6e52a0", tip: "#d4c4e8" },
  { inner: "#e6acc4", outer: "#c97f9e", tip: "#f6e0ec" },
  { inner: "#eef0f6", outer: "#c4c8d4", tip: "#ffffff" },
  { inner: "#39497c", outer: "#222e52", tip: "#8a9ac2" },
  { inner: "#aad2ea", outer: "#79aed2", tip: "#ddf1f9" },
];

const PALETTE_BASE_LEN = PALETTE.length;
PALETTE.push(...ACCENT_PALETTE);

function randomAccentColorIndex(): number {
  return PALETTE_BASE_LEN + Math.floor(Math.random() * ACCENT_PALETTE.length);
}

type Floret = {
  id: number; x: number; y: number; r: number; rot: number;
  seed: number; colorIndex: number; born: number;
};

const MAX_FLORETS = 60;

function positionForIndex(i: number): { x: number; y: number; r: number; rot: number } {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const a = i * golden;
  // Tight 手毬 — slower radius growth, kept compact and overlapping
  const radius = Math.min(92, 10.5 * Math.sqrt(i + 0.25));
  const jitter = Math.sin(i * 12.9898) * 4.2;
  const x = Math.cos(a) * radius + jitter;
  const y = Math.sin(a) * radius + jitter * 0.52;
  // Depth: center smaller, outer edge larger (top-lit roundness)
  const distNorm = radius / 92;
  const baseR = 30 + (i % 4);
  const r = baseR * (0.76 + distNorm * 0.26);
  const rot = (a * 180) / Math.PI + 28 + Math.sin(i * 7.13) * 14;
  return { x, y, r, rot };
}

let floretCounter = 0;
function makeFloret(index: number, colorIndex?: number): Floret {
  const p = positionForIndex(index);
  return {
    id: floretCounter++,
    x: p.x, y: p.y, r: p.r, rot: p.rot,
    seed: index + 1,
    colorIndex: colorIndex ?? index % PALETTE_BASE_LEN,
    born: Date.now(),
  };
}

const INITIAL_FLORET_COUNT = 38;
const OPEN_FLORET_COUNT = 2;
const INTRO_BLOOM_MS = 10_000;
const INTRO_TO_TEND_MS = 1_500;
const STEM_GROW_MS = 6_000;

// ---------- Blessing scene (pink hydrangea + slow droplet + message) ----------
const PINK_PALETTE: { inner: string; outer: string; tip: string }[] = [
  { inner: "#e8a8c4", outer: "#c97f9e", tip: "#faf0f4" },
  { inner: "#f0bcd2", outer: "#d692ae", tip: "#fff6fa" },
  { inner: "#e89ab8", outer: "#c06e92", tip: "#fce8f0" },
  { inner: "#f4c8da", outer: "#dca0bc", tip: "#fff8fb" },
  { inner: "#e6b0c8", outer: "#c885a4", tip: "#fdf2f6" },
  { inner: "#f0c8dc", outer: "#d8a0b8", tip: "#fffafc" },
  { inner: "#eca8c0", outer: "#c8809c", tip: "#fceef4" },
  { inner: "#f8dce8", outer: "#dcb8c8", tip: "#ffffff" },
];
const HANDOVER_PETAL_SKY = { inner: "#aad2ea", outer: "#7eb8d8" };
const HANDOVER_PETAL_YELLOW = { inner: "#f5d04a", outer: "#d4a820" };
const SUNFLOWER_PETAL_BASE = "#F5A623";
const SUNFLOWER_PETAL_TIP = "#FFD93B";
const SUNFLOWER_DISK_OUTER = "#5C4033";
const SUNFLOWER_DISK_INNER = "#3d2a22";
const SUNFLOWER_GOLDEN_ANGLE = (137.50776405 * Math.PI) / 180;
const HANDOVER_SUNFLOWER_MS = 10_000;
const BLESSING_MESSAGE = "shall we let you go free?";
const BLESSING_DROP_MS = 10_000;
const BLESSING_TYPE_MS = 90;
const HANDOVER_MESSAGE = "you are allowed to be loved";
const HANDOVER_TYPE_MS = 90;
const REFLECTION_FALL_MS = 24_000;
const REFLECTION_FALL_DIST = 95;
const UNDERWATER_GRAY = { inner: "#adb2ba", outer: "#92969e", tip: "#d6d9de" };
const DESKTOP_MIN_WIDTH = 768;

function lerpHex(c1: string, c2: string, t: number): string {
  const parse = (h: string) => {
    const n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  };
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const ch = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = ch(r1, r2), g = ch(g1, g2), b = ch(b1, b2);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function lerpPalette(
  from: { inner: string; outer: string; tip: string },
  to: { inner: string; outer: string; tip: string },
  t: number,
) {
  return {
    inner: lerpHex(from.inner, to.inner, t),
    outer: lerpHex(from.outer, to.outer, t),
    tip: lerpHex(from.tip, to.tip, t),
  };
}

function useIsDesktop(minWidth = DESKTOP_MIN_WIDTH): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= minWidth,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [minWidth]);
  return isDesktop;
}

function seedBloom(): Floret[] {
  const born = Date.now() - 60_000;
  return Array.from({ length: OPEN_FLORET_COUNT }, (_, i) => {
    const f = makeFloret(i);
    return { ...f, r: f.r * 3, born };
  });
}

/** Hydrangea teardrop (base at origin, tip upward). */
function hydrangeaPetalPath(w: number, h: number, skew: number): string {
  return `M 0 0 C ${w * 0.55} ${-h * 0.05}, ${w * (0.55 + skew)} ${-h * 0.65}, ${skew * w * 0.5} ${-h} C ${-w * (0.55 - skew)} ${-h * 0.65}, ${-w * 0.55} ${-h * 0.05}, 0 0 Z`;
}

/** Ray floret: spatula / teardrop with soft rounded tip (base at origin, tip up). */
function rayPetalPath(halfW: number, len: number): string {
  const belly = -len * 0.4;
  const tipY = -len * 0.9;
  const dome = -len * 0.97;
  const w = halfW;
  return [
    "M 0 0",
    `C ${-w * 0.32} ${-len * 0.035}, ${-w * 0.95} ${belly * 0.55}, ${-w} ${belly}`,
    `C ${-w * 0.92} ${-len * 0.62}, ${-w * 0.5} ${-len * 0.82}, ${-w * 0.2} ${tipY}`,
    `C ${-w * 0.06} ${dome}, 0 ${dome}, ${w * 0.06} ${dome}`,
    `C ${w * 0.2} ${tipY}, ${w * 0.5} ${-len * 0.82}, ${w * 0.92} ${-len * 0.62}`,
    `C ${w} ${belly}, ${w * 0.95} ${belly * 0.55}, ${w * 0.32} ${-len * 0.035}`,
    "Z",
  ].join(" ");
}

const SUNFLOWER_LAYERS = [
  { count: 22, lenMul: 0.7, wMul: 0.52, rotOffset: 7.5, opacity: 0.88 },
  { count: 22, lenMul: 0.86, wMul: 0.66, rotOffset: 4.2, opacity: 0.94 },
  { count: 24, lenMul: 1, wMul: 0.8, rotOffset: 0, opacity: 1 },
] as const;

function SunflowerShape({ seed, radius = 52 }: { seed: number; radius?: number }) {
  const rand = (n: number) => {
    const v = Math.sin(seed * 9.7 + n * 3.1) * 10000;
    return v - Math.floor(v);
  };
  const diskR = radius * 0.38;
  const baseLen = radius * 0.92;
  const baseW = radius * 0.2;
  const seedCount = 150;

  const diskDots = Array.from({ length: seedCount }, (_, i) => {
    const angle = i * SUNFLOWER_GOLDEN_ANGLE;
    const t = (i + 0.5) / seedCount;
    const r = diskR * Math.sqrt(t) * (0.92 + rand(i) * 0.08);
    const jitter = (rand(i + 40) - 0.5) * diskR * 0.04;
    return {
      x: Math.cos(angle) * (r + jitter),
      y: Math.sin(angle) * (r + jitter),
      size: 0.35 + rand(i + 80) * 0.4,
      shade: t,
    };
  });

  return (
    <g>
      <defs>
        <linearGradient id="sun-ray-grad" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor={SUNFLOWER_PETAL_BASE} />
          <stop offset="45%" stopColor="#FBC630" />
          <stop offset="100%" stopColor={SUNFLOWER_PETAL_TIP} />
        </linearGradient>
        <radialGradient id="sun-disk-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={SUNFLOWER_DISK_INNER} />
          <stop offset="72%" stopColor="#4a3428" />
          <stop offset="100%" stopColor={SUNFLOWER_DISK_OUTER} />
        </radialGradient>
      </defs>
      {SUNFLOWER_LAYERS.map((layer, li) => (
        <g key={li} opacity={layer.opacity}>
          {Array.from({ length: layer.count }, (_, i) => {
            const angle =
              (360 / layer.count) * i
              + layer.rotOffset
              + (rand(i + li * 31) - 0.5) * 3.8;
            const lenMul = layer.lenMul * (1 + (rand(i + li + 1) - 0.5) * 0.06);
            const wMul = layer.wMul * (1 + (rand(i + li + 2) - 0.5) * 0.05);
            const len = baseLen * lenMul;
            const hw = baseW * wMul;
            const path = rayPetalPath(hw, len);
            const strokeOp = 0.14 + rand(i + li + 3) * 0.08;
            return (
              <g key={i} transform={`rotate(${angle})`}>
                <path d={path} fill="url(#sun-ray-grad)" stroke="#E8A020"
                  strokeWidth={0.28} strokeOpacity={strokeOp}
                  strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      ))}
      <circle r={diskR} fill="url(#sun-disk-grad)" />
      {diskDots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.size}
          fill={lerpHex(SUNFLOWER_DISK_INNER, SUNFLOWER_DISK_OUTER, d.shade * 0.85 + 0.08)}
          opacity={0.75 + rand(i + 200) * 0.2} />
      ))}
    </g>
  );
}

function HandoverCenterFlower({ blendT }: { blendT: number }) {
  const born = Date.now() - 60_000;
  const hOp = blendT < 0.48 ? 1 : Math.max(0, 1 - (blendT - 0.48) / 0.46);
  const sOp = blendT < 0.42 ? 0 : Math.min(1, (blendT - 0.42) / 0.52);
  const breath = sOp > 0.75;

  return (
    <g style={breath ? {
      transformOrigin: "center", transformBox: "fill-box",
      animation: "sunflowerBreath 4s ease-in-out infinite",
    } : undefined}>
      {hOp > 0.02 && (
        <g opacity={hOp}>
          <FloretShape
            floret={{
              id: -1, x: 0, y: 0, r: 52, rot: 0, seed: 8800, colorIndex: 0,
              born,
            }}
            colors={PINK_PALETTE[0]}
            mode="grow"
            onTap={() => {}}
            interactive={false}
            skipDepth
          />
        </g>
      )}
      {sOp > 0.02 && (
        <g opacity={sOp}>
          <SunflowerShape seed={8800} />
        </g>
      )}
    </g>
  );
}

function FloretShape({
  floret, mode, onTap, useFloatIn = false,
  colors, interactive = true, skipDepth = false, sizeMul = 1,
}: {
  floret: Floret; mode: GrowMode; onTap: (id: number) => void; useFloatIn?: boolean;
  colors?: { inner: string; outer: string; tip: string };
  interactive?: boolean;
  skipDepth?: boolean;
  sizeMul?: number;
}) {
  const paletteEntry = colors ?? PALETTE[floret.colorIndex];
  const { x: cx, y: cy, r: size, rot, inner, outer, tip, seed } = {
    ...floret,
    inner: paletteEntry.inner,
    outer: paletteEntry.outer,
    tip: paletteEntry.tip,
  };
  const s = size * 0.62 * sizeMul;
  const rand = (n: number) => {
    const v = Math.sin(seed * 9.7 + n * 3.1) * 10000;
    return v - Math.floor(v);
  };
  const gradId = `pg-${seed}`;
  const tipGradId = `pt-${seed}`;

  const now = Date.now();
  if (now < floret.born) return null;

  const age = now - floret.born;
  const isFloating = useFloatIn && age < 2800;
  const isNew = !useFloatIn && age < 700;

  // Depth & top-light: center darker/smaller feel, upper-outer brighter
  const dist = Math.sqrt(cx * cx + cy * cy);
  const distNorm = Math.min(1, dist / 92);
  const depthOpacity = 0.62 + distNorm * 0.38;
  const topLight = cy < -8 ? 1.06 : cy > 28 ? 0.88 : 1;

  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}
      onClick={interactive && mode === "remove" ? (e) => { e.stopPropagation(); onTap(floret.id); } : undefined}
      opacity={skipDepth ? 1 : depthOpacity * topLight}
      style={{
        cursor: interactive && mode === "remove" ? "pointer" : "default",
        transformOrigin: "center", transformBox: "fill-box",
        animation: isFloating ? "floretFloatIn 2.8s ease-out both"
          : isNew ? "floretBloom 0.7s ease-out both" : undefined,
      }}>
      <defs>
        <radialGradient id={gradId} cx="50%" cy="88%" r="98%">
          <stop offset="0%"  stopColor={outer} stopOpacity="0.92" />
          <stop offset="38%" stopColor={inner} />
          <stop offset="78%" stopColor={tip} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.98" />
        </radialGradient>
        <radialGradient id={tipGradId} cx="50%" cy="18%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
          <stop offset="100%" stopColor={tip} stopOpacity="0" />
        </radialGradient>
      </defs>
      {interactive && mode === "remove" && (
        <circle r={s * 1.15} fill="none" stroke={outer} strokeWidth="0.8" strokeOpacity="0.35" strokeDasharray="2 3" />
      )}
      {[0, 90, 180, 270].map((a, i) => {
        const jitterA = (rand(i) - 0.5) * 26;
        const w = s * (0.62 + rand(i + 1) * 0.24);
        const h = s * (0.88 + rand(i + 2) * 0.28);
        const skew = (rand(i + 3) - 0.5) * 0.22;
        const path = hydrangeaPetalPath(w, h, skew);
        return (
          <g key={a} transform={`rotate(${a + jitterA})`}>
            <path d={path} fill={`url(#${gradId})`} stroke={outer} strokeWidth="0.32" strokeOpacity="0.22" />
            <path d={path} fill={`url(#${tipGradId})`} />
          </g>
        );
      })}
      <circle r={s * 0.10} fill={outer} opacity="0.75" />
      <circle r={s * 0.04} fill="#fffef8" opacity="0.65" />
    </g>
  );
}

function FallenPetal({
  x, y, inner, outer, rot, delay,
}: { x: number; y: number; inner: string; outer: string; rot: number; delay: number; }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}
      style={{ opacity: 0, animation: `petalSettle 1.6s ease-out ${delay}s forwards` }}>
      <ellipse rx="15" ry="10.5" fill={inner} opacity="0.85" />
      <ellipse rx="15" ry="10.5" fill="none" stroke={outer} strokeWidth="0.5" />
    </g>
  );
}

type Step = "open" | "growing" | "awakening" | "tend" | "task"
          | "reflection" | "blessing" | "revealing" | "handover";
type GrowMode = "grow" | "remove";

export default function App() {
  const [step, setStep] = useState<Step>("open");
  const [florets, setFlorets] = useState<Floret[]>(seedBloom);
  const [mode, setMode] = useState<GrowMode>("grow");
  const [tasks, setTasks] = useState<{ id: number; text: string; done: boolean }[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const offeringDir = 0;
  const [handoverTouched, setHandoverTouched] = useState(false);

  const [dropletLanded, setDropletLanded] = useState(false);
  const [blessingTyped, setBlessingTyped] = useState(0);
  const [handoverTyped, setHandoverTyped] = useState(0);
  const [sunflowerBlendT, setSunflowerBlendT] = useState(0);
  const [reflectionFallT, setReflectionFallT] = useState(0);
  const isDesktop = useIsDesktop();

  const [, force] = useState(0);
  useEffect(() => {
    if (step !== "tend" && step !== "awakening") return;
    const id = setInterval(() => force((n) => n + 1), 80);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step !== "awakening") return;
    const id = setTimeout(() => setStep("tend"), INTRO_BLOOM_MS + INTRO_TO_TEND_MS);
    return () => clearTimeout(id);
  }, [step]);

  // Growing scene: the stem slowly extends to 2x, then the bloom awakens
  useEffect(() => {
    if (step !== "growing") return;
    const id = setTimeout(() => startIntro(), STEM_GROW_MS);
    return () => clearTimeout(id);
  }, [step]);

  // Blessing scene: droplet takes 10s to fall, then the message is typed out
  useEffect(() => {
    if (step !== "blessing") return;
    setDropletLanded(false);
    setBlessingTyped(0);
    const id = setTimeout(() => setDropletLanded(true), BLESSING_DROP_MS);
    return () => clearTimeout(id);
  }, [step]);

  useEffect(() => {
    if (step !== "blessing" || !dropletLanded) return;
    if (blessingTyped >= BLESSING_MESSAGE.length) return;
    const id = setTimeout(() => setBlessingTyped((n) => n + 1), BLESSING_TYPE_MS);
    return () => clearTimeout(id);
  }, [step, dropletLanded, blessingTyped]);

  useEffect(() => {
    if (step === "handover") {
      setHandoverTouched(false);
      setHandoverTyped(0);
      setSunflowerBlendT(0);
    }
  }, [step]);

  // Handover: after final message, hydrangea → sunflower over 10s (spin speed unchanged)
  useEffect(() => {
    if (step !== "handover" || handoverTyped < HANDOVER_MESSAGE.length) {
      if (step !== "handover") setSunflowerBlendT(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / HANDOVER_SUNFLOWER_MS);
      setSunflowerBlendT(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, handoverTyped]);

  // Handover scene: type the final message once the petal is touched
  useEffect(() => {
    if (step !== "handover" || !handoverTouched) return;
    if (handoverTyped >= HANDOVER_MESSAGE.length) return;
    const id = setTimeout(() => setHandoverTyped((n) => n + 1), HANDOVER_TYPE_MS);
    return () => clearTimeout(id);
  }, [step, handoverTouched, handoverTyped]);

  // Reflection: above petals fall into the water over 6s; underwater petals gray → blue
  useEffect(() => {
    if (step !== "reflection") {
      setReflectionFallT(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / REFLECTION_FALL_MS);
      setReflectionFallT(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const activeTasks = tasks.filter((t) => !t.done);
  const fallenTasks = tasks.filter((t) => t.done);
  const accentColor = "#4a78b8";
  const accentDeep  = "#2d5288";

  const addFloret = () => {
    setFlorets((fs) => {
      if (fs.length >= MAX_FLORETS) return fs;
      return [...fs, makeFloret(fs.length, randomAccentColorIndex())];
    });
  };

  const removeFloret = (id: number) => {
    if (mode !== "remove") return;
    setFlorets((fs) => {
      const next = fs.filter((f) => f.id !== id);
      return next.map((f, i) => {
        const p = positionForIndex(i);
        return { ...f, x: p.x, y: p.y, r: p.r, rot: p.rot, seed: i + 1 };
      });
    });
  };

  const removeLastFloret = () => {
    setFlorets((fs) => {
      if (fs.length === 0) return fs;
      const next = fs.slice(0, -1);
      return next.map((f, i) => {
        const p = positionForIndex(i);
        return { ...f, x: p.x, y: p.y, r: p.r, rot: p.rot, seed: i + 1 };
      });
    });
  };

  const handleBloomBackgroundTap = () => {
    if (step === "tend" && mode === "grow") addFloret();
  };

  const startIntro = () => {
    const start = Date.now();
    const bloom = Array.from({ length: INITIAL_FLORET_COUNT }, (_, i) => {
      const f = makeFloret(i);
      return { ...f, born: start + (i / INITIAL_FLORET_COUNT) * INTRO_BLOOM_MS };
    });
    setFlorets(bloom);
    setStep("awakening");
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      fontFamily: "'EB Garamond', 'Cormorant Garamond', 'Georgia', serif",
      background: "linear-gradient(180deg, #dce4dc 0%, #e8ece6 50%, #d4ddd4 100%)",
      transition: "background 2s ease", color: "#3a3a3a",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
      padding: "2rem 1rem 3rem", position: "relative", overflow: "hidden", boxSizing: "border-box",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background:
          "radial-gradient(ellipse at 18% 82%, rgba(110,145,100,0.22), transparent 48%)," +
          "radial-gradient(ellipse at 82% 78%, rgba(120,155,110,0.16), transparent 44%)," +
          "radial-gradient(ellipse at 20% 15%, rgba(255,255,255,0.45), transparent 50%)," +
          "radial-gradient(ellipse at 75% 25%, rgba(255,255,255,0.35), transparent 55%)," +
          "radial-gradient(ellipse at 50% 8%, rgba(255,255,255,0.3), transparent 60%)",
        animation: "cloudDrift 60s ease-in-out infinite alternate",
      }} />

      <style>{`
        @keyframes cloudDrift { 0% { transform: translateX(-3%); } 100% { transform: translateX(3%); } }
        @keyframes petalSettle {
          0%   { opacity: 0; transform: translate(0px, -80px) rotate(0deg) scale(0.6); }
          70%  { opacity: 0.9; }
          100% { opacity: 0.85; transform: translate(0px, 0px) rotate(0deg) scale(1); }
        }
        @keyframes floretBloom {
          0% { opacity: 0; transform: scale(0.2); }
          60% { opacity: 1; transform: scale(1.12); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes floretFloatIn {
          0% { opacity: 0; transform: scale(0.12) translateY(18px); }
          35% { opacity: 0.55; transform: scale(0.85) translateY(-6px); }
          65% { opacity: 0.92; transform: scale(1.1) translateY(3px); }
          85% { opacity: 1; transform: scale(0.97) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes panelReveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bloomReveal { from { opacity: 0.85; } to { opacity: 1; } }
        @keyframes breatheIn {
          0% { transform: scale(1); opacity: 0.85; }
          100% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes whisperIn {
          0%   { opacity: 0; transform: translateY(6px); letter-spacing: 0.5em; }
          100% { opacity: 1; transform: translateY(0);  letter-spacing: 0.22em; }
        }
        @keyframes waterRise {
          0%   { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0%);   opacity: 1; }
        }
        @keyframes blessingDrop {
          0%   { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          6%   { opacity: 1; transform: translate(-50%, 0) scale(1); }
          90%  { opacity: 1; }
          100% { transform: translate(-50%, var(--drop-dist, 150px)) scale(1.2, 0.75); opacity: 0.85; }
        }
        @keyframes ripple {
          0%   { transform: translateX(-50%) scale(0.3); opacity: 0.6; }
          100% { transform: translateX(-50%) scale(2.4); opacity: 0; }
        }
        @keyframes rippleWide {
          0%   { transform: translateX(-50%) scale(0.3); opacity: 0.95; }
          60%  { opacity: 0.7; }
          100% { transform: translateX(-50%) scale(7.2); opacity: 0; }
        }
        @keyframes reflectionRippleText {
          0%, 18%  { opacity: 0; transform: translate(-50%, -50%) scale(0.85); letter-spacing: 0.42em; }
          32%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); letter-spacing: 0.16em; }
        }
        @keyframes waterShimmer { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.85; } }
        @keyframes petalStream {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.85; }
          100% { transform: translate(var(--stream-x, 0px), var(--stream-y, -200px)) scale(0.6); opacity: 0; }
        }
        @keyframes petalDescend {
          0%   { transform: translate(-50%, calc(-50% - 240px)) rotate(-8deg); opacity: 0; }
          10%  { opacity: 1; }
          25%  { transform: translate(-50%, calc(-50% - 180px)) rotate(12deg); }
          45%  { transform: translate(-50%, calc(-50% - 100px)) rotate(-10deg); }
          65%  { transform: translate(-50%, calc(-50% - 40px)) rotate(8deg); }
          85%  { transform: translate(-50%, calc(-50% + 10px)) rotate(-4deg); }
          100% { transform: translate(-50%, -50%) rotate(0deg); opacity: 1; }
        }
        @keyframes petalGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(168,200,232,0.5)); }
          50%      { filter: drop-shadow(0 0 18px rgba(168,200,232,0.9)); }
        }
        @keyframes pulseHint { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes stemGrow {
          from { transform: scaleY(1); }
          to   { transform: scaleY(2); }
        }
        @keyframes spin12 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes sunflowerBreath {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.03); }
        }
        @keyframes petalRise {
          0%   { transform: translateY(12vh) rotate(0deg); opacity: 0; }
          12%  { opacity: 0.95; }
          88%  { opacity: 0.95; }
          100% { transform: translateY(-110vh) rotate(-380deg); opacity: 0; }
        }
        @keyframes petalFall {
          0%   { transform: translateY(-12vh) rotate(0deg); opacity: 0; }
          12%  { opacity: 0.95; }
          88%  { opacity: 0.95; }
          100% { transform: translateY(110vh) rotate(380deg); opacity: 0; }
        }
        /* handover: caption below centered flower; back button at bottom center */
        .handover-caption { top: calc(50% + 100px); }
        .handover-back { bottom: 1.2rem; }
        @media (max-width: 600px) {
          .handover-caption { top: calc(50% + 72px); }
          .handover-back { bottom: 1rem; }
        }
        .fade-up { animation: fadeUp 1.2s ease-out both; }
        .voice-line {
          font-style: italic; color: #5a5a5a; letter-spacing: 0.05em;
          font-size: 0.9rem; opacity: 0.75; min-height: 1.2em;
        }
        input:focus {
          border-color: ${accentDeep} !important;
          background: rgba(255,255,255,0.75) !important;
        }
        button:hover { background: rgba(255,255,255,0.75) !important; }
      `}</style>

      <div className="fade-up" style={{ marginBottom: "0.5rem", textAlign: "center", zIndex: 1 }}>
        <h1 style={{
          fontFamily: "'Great Vibes', cursive",
          fontSize: "2.8rem", fontWeight: 400, letterSpacing: "0.04em",
          margin: 0, fontStyle: "normal", color: "#3a3a3a",
        }}>
          the water vessel
        </h1>
        <p className="voice-line" style={{ marginTop: "0.4rem" }}>
          {step === "awakening" && ""}
          {step === "tend"      && (mode === "grow" ? "Touch an empty space, softly — and it blooms" : "Touch a petal, and let one go")}
          {step === "task"     && ""}
        </p>
      </div>

      <svg viewBox="-200 -200 400 780" width="100%" onClick={handleBloomBackgroundTap}
        style={{
          maxWidth: 360, height: "auto", zIndex: 1,
          transition: "filter 2s ease",
          cursor: step === "tend" && mode === "grow" ? "pointer" : "default",
        }}>
        <rect x="-200" y="-200" width="400" height="780" fill="transparent" />
        <g style={{
          transformBox: "fill-box", transformOrigin: "center top",
          animation: step === "growing" ? `stemGrow ${STEM_GROW_MS}ms ease-in-out forwards` : undefined,
        }}>
          <path d="M 0 110 C -7 240 9 366 -5 470" stroke="#5a6e4a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>

        <g>
          <defs>
            <linearGradient id="leafGradL" x1="0%" y1="0%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#6e8c6f" /><stop offset="50%" stopColor="#84a886" /><stop offset="100%" stopColor="#9ec4a0" />
            </linearGradient>
          </defs>
          <g transform="translate(-2 230) scale(0.6 -0.6) translate(2 -230)">
            <path d="M -2 230 Q -28 194 -52 206 Q -75 204 -88 284 Q -92 326 -80 356 Q -62 374 -42 356 Q -22 332 -8 290 Q -2 266 -2 230 Z"
              fill="url(#leafGradL)" stroke="#5a7a5b" strokeWidth="0.6" strokeOpacity="0.4" />
            <path d="M -2 254 Q -40 284 -82 314" stroke="#5a7a5b" strokeWidth="0.7" fill="none" opacity="0.45" />
            <path d="M -18 260 Q -28 284 -34 314" stroke="#5a7a5b" strokeWidth="0.4" fill="none" opacity="0.3" />
            <path d="M -40 272 Q -50 296 -56 332" stroke="#5a7a5b" strokeWidth="0.4" fill="none" opacity="0.3" />
            <path d="M -60 290 Q -70 312 -74 346" stroke="#5a7a5b" strokeWidth="0.4" fill="none" opacity="0.3" />
          </g>
        </g>

        <g>
          <defs>
            <linearGradient id="leafGradR" x1="100%" y1="0%" x2="0%" y2="50%">
              <stop offset="0%" stopColor="#6e8c6f" /><stop offset="50%" stopColor="#84a886" /><stop offset="100%" stopColor="#9ec4a0" />
            </linearGradient>
          </defs>
          <g transform="translate(2 306) scale(0.6 -0.6) translate(-2 -306)">
            <path d="M 2 306 Q 28 268 52 284 Q 75 306 88 366 Q 92 408 80 438 Q 62 452 42 434 Q 22 410 8 366 Q 2 342 2 306 Z"
              fill="url(#leafGradR)" stroke="#5a7a5b" strokeWidth="0.6" strokeOpacity="0.4" />
            <path d="M 2 332 Q 40 362 82 392" stroke="#5a7a5b" strokeWidth="0.7" fill="none" opacity="0.45" />
            <path d="M 20 338 Q 30 362 36 392" stroke="#5a7a5b" strokeWidth="0.4" fill="none" opacity="0.3" />
            <path d="M 42 350 Q 52 374 58 410" stroke="#5a7a5b" strokeWidth="0.4" fill="none" opacity="0.3" />
            <path d="M 62 368 Q 72 392 76 422" stroke="#5a7a5b" strokeWidth="0.4" fill="none" opacity="0.3" />
          </g>
        </g>

        <g style={{
          transformOrigin: "center",
          animation: step === "awakening" ? "bloomReveal 1.5s ease-out both" : undefined,
        }}>
          {[...florets]
            .sort((a, b) => (a.x * a.x + a.y * a.y) - (b.x * b.x + b.y * b.y))
            .map((f) => (
              <FloretShape key={f.id} floret={f} mode={mode} onTap={removeFloret}
                useFloatIn={step === "awakening"} sizeMul={isDesktop ? 1.5 : 1} />
            ))}
        </g>

        {fallenTasks.map((t, i) => {
          const c = PALETTE[i % PALETTE.length];
          const x = -100 + (i % 6) * 34 + (Math.floor(i / 6) % 2) * 17;
          const y = 516 + Math.floor(i / 6) * 14;
          const rot = (i * 47) % 360;
          return <FallenPetal key={t.id} x={x} y={y} inner={c.inner} outer={c.outer} rot={rot} delay={i * 0.15} />;
        })}
      </svg>

      <div style={{
        position: "fixed", bottom: "1.2rem", left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 360, padding: "0 1rem", boxSizing: "border-box", zIndex: 5,
      }}>
        {step === "open" && (
          <button type="button" onClick={() => setStep("growing")} style={btnStyle}>
            tap
          </button>
        )}

        {step === "tend" && (
          <div style={{ animation: "panelReveal 1.5s ease-out both" }}>
            <div style={{
              display: "flex", gap: "0.5rem", marginBottom: "0.8rem",
              background: "rgba(255,255,255,0.35)", padding: "0.35rem", borderRadius: "999px",
            }}>
              <button type="button" onClick={() => { setMode("grow"); addFloret(); }}
                style={{ ...pillStyle, padding: "0.46rem 0.6rem", fontSize: "0.7rem", letterSpacing: "0.06em", background: mode === "grow" ? accentColor : "transparent", color: mode === "grow" ? "#fff" : "#3a3a3a" }}>
                add a petal
              </button>
              <button type="button" onClick={() => { setMode("remove"); removeLastFloret(); }}
                style={{ ...pillStyle, padding: "0.46rem 0.6rem", fontSize: "0.7rem", letterSpacing: "0.06em", background: mode === "remove" ? accentColor : "transparent", color: mode === "remove" ? "#fff" : "#3a3a3a" }}>
                let one go
              </button>
            </div>
            <button type="button" onClick={() => setStep("task")} style={{ ...btnStyle, padding: "0.55rem 0.9rem", fontSize: "0.78rem", letterSpacing: "0.1em", background: accentColor, color: "#fff" }}>
              go on, as this flower (as me)
            </button>
          </div>
        )}

        {step === "task" && (
          <div className="fade-up">
            <input ref={inputRef} type="text" value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && taskInput.trim()) {
                  e.preventDefault();
                  setTasks((ts) => [...ts, { id: Date.now(), text: taskInput.trim(), done: false }]);
                  setTaskInput("");
                }
              }}
              placeholder="write what you want to say"
              style={{
                width: "100%", padding: "0.6rem 0.8rem",
                border: `1px solid ${accentDeep}`, borderRadius: "999px",
                background: "rgba(255,255,255,0.6)", fontFamily: "inherit",
                fontSize: "0.85rem", color: "#3a3a3a", outline: "none",
                marginBottom: "0.8rem", boxSizing: "border-box", transition: "all 0.3s ease",
              }} />
            <button type="button" onClick={() => setStep("reflection")}
              style={{ ...btnStyle, padding: "0.55rem 0.9rem", fontSize: "0.78rem", letterSpacing: "0.1em", background: accentColor, color: "#fff" }}>
              I'm going now
            </button>
            {activeTasks.length > 0 && (
              <ul style={{ marginTop: "1rem", padding: 0, listStyle: "none", fontSize: "0.9rem" }}>
                {activeTasks.map((t) => (
                  <li key={t.id} style={{
                    padding: "0.5rem 0.8rem", marginBottom: "0.3rem",
                    background: "rgba(255,255,255,0.4)", borderRadius: "8px",
                    borderLeft: `3px solid ${accentDeep}`,
                  }}>
                    {t.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </div>

      {/* === Closing arc: reflection → blessing → revealing → handover === */}

      {step === "reflection" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10,
          background: "linear-gradient(180deg, #cbcdd2 0%, #b8c2cf 50%, #6a8aa8 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "1.5rem", animation: "fadeUp 1.4s ease-out both",
        }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 320, marginTop: "-2rem" }}>
            <svg viewBox="-120 -130 240 260" width="100%" style={{ display: "block" }}>
              <path d="M 0 60 Q 6 90 -2 120" stroke="#3a4a2c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <g>
                {florets.slice(0, Math.min(florets.length, 28)).map((f, i) => {
                  const c = PALETTE[f.colorIndex];
                  const sx = f.x * 0.55;
                  const sy = f.y * 0.55 - 30;
                  const fallY = reflectionFallT * REFLECTION_FALL_DIST;
                  const fallOpacity = 1 - reflectionFallT * 0.35;
                  return (
                    <g key={f.id} transform={`translate(${sx} ${sy + fallY})`} opacity={fallOpacity}>
                      {[0, 90, 180, 270].map((a) => (
                        <path key={a} d="M 0 0 C 8 -1, 8 -12, 0 -16 C -8 -12, -8 -1, 0 0 Z"
                          transform={`rotate(${a + i * 3})`} fill={c.inner} stroke={c.outer} strokeWidth="0.4" opacity="0.92" />
                      ))}
                      <circle r="1.4" fill={c.outer} opacity="0.7" />
                    </g>
                  );
                })}
              </g>
            </svg>
            <div style={{
              position: "relative", width: "100%", height: "2px",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
              marginTop: "0.4rem",
            }} />
            <div style={{ position: "relative", width: "100%", animation: "waterRise 8.8s ease-out 0.4s both" }}>
              <svg viewBox="-120 -130 240 260" width="100%" style={{
                display: "block", transform: "scaleY(-1)",
                filter: "blur(0.7px) brightness(0.78) hue-rotate(-8deg)",
                opacity: 0.72, animation: "waterShimmer 4s ease-in-out infinite",
              }}>
                <path d="M 0 60 Q 6 90 -2 120" stroke="#3a4a2c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <g>
                  {florets.slice(0, Math.min(florets.length, 28)).map((f, i) => {
                    const blue = PALETTE[f.colorIndex];
                    const c = lerpPalette(UNDERWATER_GRAY, blue, reflectionFallT);
                    const sx = f.x * 0.55;
                    const sy = f.y * 0.55 - 30;
                    return (
                      <g key={f.id} transform={`translate(${sx} ${sy})`}>
                        {[0, 90, 180, 270].map((a) => (
                          <path key={a} d="M 0 0 C 8 -1, 8 -12, 0 -16 C -8 -12, -8 -1, 0 0 Z"
                            transform={`rotate(${a + i * 3})`} fill={c.inner} stroke={c.outer} strokeWidth="0.4" />
                        ))}
                      </g>
                    );
                  })}
                </g>
              </svg>
              <div style={{
                position: "absolute", top: "10%", left: "50%", width: "60px", height: "12px",
                pointerEvents: "none",
              }}>
                <div style={{
                  position: "absolute", inset: 0,
                  border: "2px solid rgba(255,255,255,0.98)", borderRadius: "50%",
                  boxShadow: "0 0 10px rgba(255,255,255,0.85)",
                  animation: "rippleWide 10.5s ease-out 1.5s infinite",
                }} />
                <p style={{
                  position: "absolute", left: 0, top: "50%",
                  margin: 0, whiteSpace: "nowrap",
                  fontSize: "1.02rem", letterSpacing: "0.12em",
                  color: "#2a3a52", fontStyle: "italic", fontFamily: "inherit",
                  opacity: 0,
                  animation: "reflectionRippleText 10.5s ease-out 5.5s 1 forwards",
                }}>
                  what I shut away is me, too
                </p>
              </div>
            </div>
          </div>

          <button type="button" onClick={() => setStep("blessing")}
            style={{
              position: "absolute", bottom: "2.5rem", right: "1.5rem",
              padding: "0.6rem 1.4rem", fontFamily: "inherit",
              fontSize: "0.85rem", letterSpacing: "0.25em",
              background: "transparent", border: "1px solid rgba(45,82,136,0.4)",
              borderRadius: "999px", color: "#2a3a52", cursor: "pointer",
              opacity: 0, animation: "whisperIn 1.4s ease-out 4s forwards",
            }}>
            next →
          </button>
        </div>
      )}

      {step === "blessing" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10,
          background: "linear-gradient(180deg, #f6e9ef 0%, #f0d8e4 55%, #e8c4d6 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "1.5rem", animation: "fadeUp 1.4s ease-out both",
        }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 300 }}>
            <svg viewBox="-120 -150 240 330" width="100%" style={{ display: "block" }}>
              <path d="M 0 30 Q 8 120 -2 230" stroke="#6e8a5a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <g>
                {[...florets].slice(0, Math.min(florets.length, 28))
                  .sort((a, b) => (a.x * a.x + a.y * a.y) - (b.x * b.x + b.y * b.y))
                  .map((f, i) => (
                    <FloretShape
                      key={f.id}
                      floret={{
                        ...f,
                        x: f.x * 0.55,
                        y: f.y * 0.55 - 40,
                        r: f.r * 2,
                        seed: f.seed + 5000,
                        born: Date.now() - 60_000,
                      }}
                      colors={PINK_PALETTE[i % PINK_PALETTE.length]}
                      mode="grow"
                      onTap={() => {}}
                      interactive={false}
                    />
                  ))}
              </g>
            </svg>

            {!dropletLanded && (
              <div style={{
                position: "absolute", left: "50%", top: "28%",
                ["--drop-dist" as any]: "150px",
                animation: "blessingDrop 10s ease-in forwards",
              }}>
                <svg viewBox="-6 -8 12 16" width="13" height="17" style={{ display: "block" }}>
                  <defs>
                    <radialGradient id="blessingDropGrad" cx="50%" cy="35%" r="65%">
                      <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.95" />
                      <stop offset="55%" stopColor="#f7dfeb" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#e2a6c4" stopOpacity="0.85" />
                    </radialGradient>
                  </defs>
                  <path d="M 0 -7 Q -5 0 -5 4 Q -5 8 0 8 Q 5 8 5 4 Q 5 0 0 -7 Z"
                    fill="url(#blessingDropGrad)" stroke="#d98ab0" strokeWidth="0.3" strokeOpacity="0.5" />
                </svg>
              </div>
            )}

            {dropletLanded && (
              <div style={{
                position: "absolute", left: "50%", top: "calc(28% + 150px)",
                width: "34px", height: "8px", transform: "translate(-50%, -50%)",
                border: "1px solid rgba(214,138,176,0.6)", borderRadius: "50%",
                animation: "ripple 2.4s ease-out 0s 2", pointerEvents: "none",
              }} />
            )}
          </div>

          <p style={{
            marginTop: "2rem", minHeight: "3em", maxWidth: 340, marginLeft: "auto", marginRight: "auto",
            fontSize: "1.2rem", letterSpacing: "0.08em", lineHeight: 1.8,
            color: "#a64d7a", fontStyle: "italic", textAlign: "center",
            fontFamily: "inherit",
          }}>
            {BLESSING_MESSAGE.slice(0, blessingTyped)}
            {dropletLanded && blessingTyped < BLESSING_MESSAGE.length && (
              <span style={{ opacity: 0.4 }}>|</span>
            )}
          </p>

          {blessingTyped >= BLESSING_MESSAGE.length && (
            <button type="button" onClick={() => setStep("revealing")}
              style={{
                position: "absolute", bottom: "2.5rem", right: "1.5rem",
                padding: "0.6rem 1.4rem", fontFamily: "inherit",
                fontSize: "0.85rem", letterSpacing: "0.25em",
                background: "transparent", border: "1px solid rgba(166,77,122,0.4)",
                borderRadius: "999px", color: "#a64d7a", cursor: "pointer",
                opacity: 0, animation: "whisperIn 1.4s ease-out 0.2s forwards",
              }}>
              next →
            </button>
          )}
        </div>
      )}

      {step === "revealing" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10,
          background: "#0f1828",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "1.5rem", animation: "fadeUp 2s ease-out both", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {fallenTasks.length === 0 ? (
              [0, 1, 2, 3, 4].map((i) => {
                const c = PALETTE[i % PALETTE.length];
                const startX = 50 + (i - 2) * 4;
                const dx = offeringDir * (180 + i * 30);
                const dy = -200 - i * 40;
                return (
                  <div key={i} style={{
                    position: "absolute", left: `${startX}%`, top: "55%",
                    width: 14, height: 10, borderRadius: "50%",
                    background: c.inner, boxShadow: `0 0 8px ${c.tip}`,
                    ["--stream-x" as any]: `${dx}px`,
                    ["--stream-y" as any]: `${dy}px`,
                    animation: `petalStream ${5 + i * 0.4}s ease-out ${i * 0.5}s infinite`,
                  }} />
                );
              })
            ) : (
              fallenTasks.map((t, i) => {
                const c = PALETTE[i % PALETTE.length];
                const startX = 45 + (i % 8) * 2;
                const dx = offeringDir * (160 + (i % 5) * 40) + (offeringDir === 0 ? (i % 2 === 0 ? -1 : 1) * 80 : 0);
                const dy = -220 - (i % 4) * 30;
                return (
                  <div key={t.id} style={{
                    position: "absolute", left: `${startX}%`, top: "55%",
                    width: 14, height: 10, borderRadius: "50%",
                    background: c.inner, boxShadow: `0 0 8px ${c.tip}`,
                    ["--stream-x" as any]: `${dx}px`,
                    ["--stream-y" as any]: `${dy}px`,
                    animation: `petalStream 6s ease-out ${i * 0.35}s infinite`,
                  }} />
                );
              })
            )}
          </div>

          <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 360 }}>
            <p style={{
              fontSize: "1.2rem", letterSpacing: "0.14em",
              color: "#e0e8f0", fontStyle: "italic", lineHeight: 1.9,
              opacity: 0, animation: "whisperIn 3s ease-out 1.5s forwards",
            }}>
              you may let go
            </p>
            <p style={{
              fontSize: "1.2rem", letterSpacing: "0.14em",
              color: "#c8d8e8", fontStyle: "italic", lineHeight: 1.9, marginTop: "0.5rem",
              opacity: 0, animation: "whisperIn 3s ease-out 4s forwards",
            }}>
              and if you don't, it goes on
            </p>
          </div>

          <button type="button" onClick={() => setStep("handover")}
            style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(calc(-50% - 24px), -50%)",
              padding: "0.6rem 1.8rem", fontFamily: "inherit",
              fontSize: "0.85rem", letterSpacing: "0.25em",
              background: "transparent", border: "1px solid rgba(200,216,232,0.4)",
              borderRadius: "999px", color: "#c8d8e8", cursor: "pointer",
              opacity: 0, animation: "whisperIn 1.6s ease-out 9s forwards",
            }}>
            next
          </button>
        </div>
      )}

      {step === "handover" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10,
          background: "linear-gradient(180deg, #c8cdd2 0%, #b4becd 60%, #a0afc3 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "2rem 1.5rem", animation: "fadeUp 1.4s ease-out both",
        }}>
          {/* petals drifting up (pink / sky) and down from top (yellow) — same speed */}
          {handoverTouched && (
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
              {Array.from({ length: 14 }).map((_, i) => {
                const pink = PINK_PALETTE[i % PINK_PALETTE.length];
                const isPinkPetal = i % 2 === 0;
                const inner = isPinkPetal ? pink.inner : HANDOVER_PETAL_SKY.inner;
                const outer = isPinkPetal ? pink.outer : HANDOVER_PETAL_SKY.outer;
                const left = (i * 37 + 6) % 100;
                const dur = 7 + (i % 5) * 1.6;
                const delay = (i % 7) * 0.7;
                const size = 7 + (i % 3) * 3;
                return (
                  <div key={`up-${i}`} style={{
                    position: "absolute", bottom: 0, left: `${left}%`,
                    width: size, height: size * 0.72,
                    background: inner,
                    borderRadius: "50% 50% 50% 50% / 62% 62% 38% 38%",
                    boxShadow: `0 0 4px ${outer}`,
                    opacity: 0,
                    animation: `petalRise ${dur}s linear ${delay}s infinite`,
                  }} />
                );
              })}
              {Array.from({ length: 14 }).map((_, i) => {
                const left = (i * 41 + 11) % 100;
                const dur = 7 + (i % 5) * 1.6;
                const delay = (i % 7) * 0.7;
                const size = 7 + (i % 3) * 3;
                return (
                  <div key={`down-${i}`} style={{
                    position: "absolute", top: 0, left: `${left}%`,
                    width: size, height: size * 0.72,
                    background: HANDOVER_PETAL_YELLOW.inner,
                    borderRadius: "50% 50% 50% 50% / 62% 62% 38% 38%",
                    boxShadow: `0 0 4px ${HANDOVER_PETAL_YELLOW.outer}`,
                    opacity: 0,
                    animation: `petalFall ${dur}s linear ${delay}s infinite`,
                  }} />
                );
              })}
            </div>
          )}

          <div style={{
            position: "absolute", left: "50%", top: "50%",
            animation: "petalDescend 4s cubic-bezier(0.4, 0, 0.4, 1) both",
            cursor: handoverTouched ? "default" : "pointer",
          }}
            onClick={() => {
              if (handoverTouched) return;
              setHandoverTouched(true);
            }}>
            <div style={{
              transition: "transform 0.6s ease, filter 1.2s ease",
              transform: handoverTouched ? "scale(1.15)" : "scale(1)",
              filter: sunflowerBlendT > 0 ? "blur(2.2px)" : "blur(1px)",
            }}>
            <svg viewBox="-95 -98 190 196" width="180" height="180" style={{
              display: "block", overflow: "visible",
              animation: handoverTouched
                ? `spin12 ${sunflowerBlendT > 0 ? 24 : 12}s linear infinite`
                : "petalGlow 2.8s ease-in-out infinite, spin12 12s linear infinite",
            }}>
              <HandoverCenterFlower blendT={sunflowerBlendT} />
            </svg>
            </div>
          </div>

          <div className="handover-caption" style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: 360,
            textAlign: "center",
            padding: "0 1rem",
            boxSizing: "border-box",
            pointerEvents: "none",
          }}>
            <div style={{
              opacity: 0,
              animation: "whisperIn 2s ease-out 4.2s forwards",
            }}>
              <p style={{
                fontSize: "1.25rem", letterSpacing: "0.14em",
                color: "#2a3a52", fontStyle: "italic",
                margin: 0, fontFamily: "inherit",
              }}>
                here, it gently falls
              </p>
              {!handoverTouched && (
                <p style={{
                  marginTop: "1.5rem", fontSize: "0.85rem",
                  letterSpacing: "0.25em", color: "#4a5e7a",
                  animation: "pulseHint 3s ease-in-out infinite",
                  fontStyle: "italic",
                }}>
                  touch a petal
                </p>
              )}
              {handoverTouched && (
                <p style={{
                  marginTop: "1.5rem", minHeight: "1.8em",
                  fontSize: "1.2rem", letterSpacing: "0.1em", color: "#a64d7a",
                  fontStyle: "italic",
                }}>
                  {HANDOVER_MESSAGE.slice(0, handoverTyped)}
                  {handoverTyped < HANDOVER_MESSAGE.length && <span style={{ opacity: 0.4 }}>|</span>}
                </p>
              )}
            </div>
          </div>

          <div className="handover-back" style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}>
            <button type="button"
            onClick={() => {
              setFlorets(seedBloom());
              setStep("open");
            }}
            style={{
              padding: "0.6rem 1.8rem", fontFamily: "inherit",
              fontSize: "0.85rem", letterSpacing: "0.25em",
              background: "transparent", border: "1px solid rgba(45,82,136,0.4)",
              borderRadius: "999px", color: "#2a3a52", cursor: "pointer",
              opacity: 0, animation: "whisperIn 1.6s ease-out 5.5s forwards",
            }}>
            back
          </button>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: "100%", padding: "0.7rem 1.2rem", fontFamily: "inherit",
  fontSize: "0.95rem", letterSpacing: "0.15em",
  background: "rgba(255,255,255,0.55)", border: "1px solid #2d5288",
  borderRadius: "999px", color: "#3a3a3a", cursor: "pointer",
  transition: "all 0.4s ease", backdropFilter: "blur(4px)",
};

const pillStyle: React.CSSProperties = {
  flex: 1, padding: "0.55rem 0.8rem", fontFamily: "inherit",
  fontSize: "0.9rem", letterSpacing: "0.1em",
  background: "transparent", border: "none",
  borderRadius: "999px", color: "#3a3a3a", cursor: "pointer",
  transition: "all 0.3s ease",
};