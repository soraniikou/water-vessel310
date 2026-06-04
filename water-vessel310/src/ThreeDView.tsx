import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ============================================================
//  the water vessel — 3D
//  A hydrangea standing in space.
// ============================================================

// ---------- Blue hydrangea palette (Phase 1 keeps everything blue;
//            the pink "received" floret comes in Phase 2) ----------
const PALETTE = [
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
];

const FLORET_COUNT = 60;
const BLOOM_RADIUS = 1.4;

// Fibonacci sphere — distributes points evenly on a sphere
function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // -1 to 1
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }
  return points;
}

// ---------- A single 3D floret (4 petals in a cross) ----------
function Floret3D({
  position, normal, colorIndex, index,
}: {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  colorIndex: number;
  index: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const c = PALETTE[colorIndex % PALETTE.length];

  // orient the floret to face outward from the bloom's center
  useEffect(() => {
    if (!groupRef.current) return;
    const target = new THREE.Vector3().copy(position).add(normal);
    groupRef.current.lookAt(target);
  }, [position, normal]);

  // gentle individual bobbing
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    const phase = index * 0.37;
    groupRef.current.position.x = position.x + Math.sin(t * 0.6 + phase) * 0.012;
    groupRef.current.position.y = position.y + Math.cos(t * 0.5 + phase) * 0.012;
    groupRef.current.position.z = position.z + Math.sin(t * 0.7 + phase) * 0.012;
  });

  // a single teardrop petal — built as a custom flat geometry
  const petalGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // teardrop: pointed at top, rounded at bottom (base at origin)
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.12, 0.02, 0.12, 0.22, 0, 0.28);
    shape.bezierCurveTo(-0.12, 0.22, -0.12, 0.02, 0, 0);
    return new THREE.ShapeGeometry(shape, 16);
  }, []);

  return (
    <group ref={groupRef} position={position}>
      {/* 4 petals in a cross */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} geometry={petalGeometry} rotation={[0, 0, (i * Math.PI) / 2]}>
          <meshStandardMaterial
            color={c.inner}
            roughness={0.65}
            metalness={0.05}
            side={THREE.DoubleSide}
            transparent
            opacity={0.92}
          />
        </mesh>
      ))}
      {/* center dot (darker eye) */}
      <mesh>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color={c.outer} roughness={0.4} />
      </mesh>
      {/* tiny golden highlight */}
      <mesh position={[0, 0, 0.026]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color="#fff8d8" emissive="#fff8d8" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// ---------- The whole bloom (60 florets on a sphere) ----------
function Bloom() {
  const positions = useMemo(() => fibonacciSphere(FLORET_COUNT, BLOOM_RADIUS), []);

  return (
    <group position={[0, 0.6, 0]}>
      {positions.map((pos, i) => {
        const normal = pos.clone().normalize();
        return (
          <Floret3D
            key={i}
            position={pos}
            normal={normal}
            colorIndex={i}
            index={i}
          />
        );
      })}
    </group>
  );
}

// ---------- Stem (cylinder) + leaves (planes) ----------
function Stem() {
  const stemRef = useRef<THREE.Group>(null);

  // gentle sway
  useFrame((state) => {
    if (!stemRef.current) return;
    const t = state.clock.getElapsedTime();
    stemRef.current.rotation.z = Math.sin(t * 0.4) * 0.025;
  });

  // hydrangea-leaf shape
  const leafGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.18, 0.05, 0.32, 0.25, 0.30, 0.55);
    shape.bezierCurveTo(0.28, 0.78, 0.18, 0.90, 0, 0.95);
    shape.bezierCurveTo(-0.18, 0.90, -0.28, 0.78, -0.30, 0.55);
    shape.bezierCurveTo(-0.32, 0.25, -0.18, 0.05, 0, 0);
    return new THREE.ShapeGeometry(shape, 24);
  }, []);

  return (
    <group ref={stemRef} position={[0, -0.4, 0]}>
      {/* stem */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 2.0, 12]} />
        <meshStandardMaterial color="#3d5a3e" roughness={0.8} />
      </mesh>

      {/* left leaf */}
      <mesh
        geometry={leafGeometry}
        position={[-0.25, -0.6, 0.05]}
        rotation={[0, 0.3, -1.1]}
        scale={[1.2, 1.2, 1]}
      >
        <meshStandardMaterial
          color="#2f4a30"
          roughness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* right leaf */}
      <mesh
        geometry={leafGeometry}
        position={[0.25, -1.0, -0.05]}
        rotation={[0, -0.3, 1.1]}
        scale={[1.2, 1.2, 1]}
      >
        <meshStandardMaterial
          color="#3d5e3d"
          roughness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ---------- Camera demo: gentle automatic rotation for the first 3s
//            so users without instructions notice the flower moves ----------
function CameraIntro({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const startRef = useRef(Date.now());
  const userInteractedRef = useRef(false);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onStart = () => { userInteractedRef.current = true; };
    controls.addEventListener("start", onStart);
    return () => controls.removeEventListener("start", onStart);
  }, [controlsRef]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls || userInteractedRef.current) return;
    const elapsed = (Date.now() - startRef.current) / 1000;
    if (elapsed < 3) {
      // sway side to side, like a flower in breeze
      const angle = Math.sin(elapsed * 0.9) * 0.18;
      controls.setAzimuthalAngle(angle);
    }
  });

  return null;
}

// ---------- Gyro for mobile (device tilt → camera rotation) ----------
function GyroControl({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const enabledRef = useRef(false);

  useEffect(() => {
    // Listen for device orientation; on iOS Safari permission must be granted
    // but we don't ask explicitly — the auto-intro is the discovery hint.
    function onOrientation(e: DeviceOrientationEvent) {
      const controls = controlsRef.current;
      if (!controls) return;
      if (e.gamma === null || e.beta === null) return;
      // gamma: left-right tilt (-90 to 90), beta: front-back tilt
      const azimuth = (e.gamma / 90) * 0.6;
      const polar = Math.PI / 2 - ((e.beta - 60) / 90) * 0.4;
      controls.setAzimuthalAngle(azimuth);
      controls.setPolarAngle(Math.max(0.3, Math.min(Math.PI - 0.3, polar)));
      enabledRef.current = true;
    }
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [controlsRef]);

  return null;
}

// ============================================================
//  Main 3D View
// ============================================================
export default function ThreeDView() {
  const controlsRef = useRef<any>(null);
  const [, setReady] = useState(false);

  useEffect(() => {
    // small delay so controlsRef binds before CameraIntro starts
    const id = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(id);
  }, []);

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "linear-gradient(180deg, #cbcdd2 0%, #d8dde2 50%, #b8c2cf 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Title overlay */}
      <div style={{
        position: "absolute", top: "1.5rem", left: 0, right: 0,
        textAlign: "center", zIndex: 10, pointerEvents: "none",
      }}>
        <h1 style={{
          fontFamily: "'Great Vibes', cursive",
          fontSize: "2.4rem", fontWeight: 400,
          letterSpacing: "0.04em", margin: 0,
          color: "#3a3a3a",
          textShadow: "0 1px 4px rgba(255,255,255,0.5)",
        }}>
          the water vessel
        </h1>
      </div>

      {/* Drifting cloud layer */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background:
          "radial-gradient(ellipse at 20% 15%, rgba(255,255,255,0.45), transparent 50%)," +
          "radial-gradient(ellipse at 75% 25%, rgba(255,255,255,0.35), transparent 55%)",
      }} />

      <Canvas
        camera={{ position: [0, 0.5, 4.5], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* lights */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={0.8} />
        <directionalLight position={[-3, -2, -3]} intensity={0.25} color="#a8c8e8" />

        {/* scene */}
        <Stem />
        <Bloom />

        {/* controls — drag to rotate */}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI * 2 / 3}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
        />

        {/* auto-sway for 3s on load (silent demo of "this moves") */}
        <CameraIntro controlsRef={controlsRef} />

        {/* gyro on mobile (no permission prompt; works on Android & some iOS) */}
        <GyroControl controlsRef={controlsRef} />
      </Canvas>

      {/* back link */}
      <a
        href="/"
        style={{
          position: "absolute", top: "1.2rem", left: "1.2rem",
          padding: "0.4rem 1rem", fontFamily: "'Shippori Mincho', serif",
          fontSize: "0.78rem", letterSpacing: "0.2em",
          background: "rgba(255,255,255,0.5)",
          border: "1px solid rgba(45,82,136,0.35)",
          borderRadius: "999px", color: "#2a3a52",
          textDecoration: "none",
          backdropFilter: "blur(4px)",
          zIndex: 20,
        }}
      >
        ← もどる
      </a>
    </div>
  );
}