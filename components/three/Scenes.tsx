// Three.js scenes. This module is only ever imported lazily (see ../Three3D.tsx)
// so the ~600 KB of three/r3f stays out of the initial bundle.
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const MINT = '#4FF0B4';
const VIOLET = '#8B7CFF';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const StageLights: React.FC = () => (
  <>
    <ambientLight intensity={0.35} />
    <pointLight position={[4, 4, 4]} intensity={60} color={MINT} />
    <pointLight position={[-4, -2, 3]} intensity={50} color={VIOLET} />
    <directionalLight position={[0, 3, 5]} intensity={0.6} />
  </>
);

/* ---------------- DNA helix (login backdrop) ---------------- */

const Helix: React.FC = () => {
  const group = useRef<THREE.Group>(null);
  const strandA = useRef<THREE.InstancedMesh>(null);
  const strandB = useRef<THREE.InstancedMesh>(null);
  const rungs = useRef<THREE.InstancedMesh>(null);

  const COUNT = 42;
  const layout = useMemo(() => {
    const a: THREE.Vector3[] = [];
    const b: THREE.Vector3[] = [];
    for (let i = 0; i < COUNT; i++) {
      const t = i * 0.42;
      const y = (i - COUNT / 2) * 0.22;
      a.push(new THREE.Vector3(Math.cos(t) * 1.1, y, Math.sin(t) * 1.1));
      b.push(new THREE.Vector3(Math.cos(t + Math.PI) * 1.1, y, Math.sin(t + Math.PI) * 1.1));
    }
    return { a, b };
  }, []);

  React.useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    layout.a.forEach((p, i) => {
      m.makeTranslation(p.x, p.y, p.z);
      strandA.current!.setMatrixAt(i, m);
      const pb = layout.b[i];
      m.makeTranslation(pb.x, pb.y, pb.z);
      strandB.current!.setMatrixAt(i, m);
      // Rung: a thin cylinder from p to pb, every other step.
      const mid = p.clone().add(pb).multiplyScalar(0.5);
      const dir = pb.clone().sub(p);
      q.setFromUnitVectors(up, dir.clone().normalize());
      const scale = new THREE.Vector3(1, i % 2 === 0 ? dir.length() : 0.0001, 1);
      m.compose(mid, q, scale);
      rungs.current!.setMatrixAt(i, m);
    });
    [strandA, strandB, rungs].forEach((r) => (r.current!.instanceMatrix.needsUpdate = true));
  }, [layout]);

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.35;
  });

  return (
    <group ref={group} rotation={[0.35, 0, -0.35]}>
      <instancedMesh ref={strandA} args={[undefined, undefined, COUNT]}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color={MINT} emissive={MINT} emissiveIntensity={1.4} roughness={0.25} />
      </instancedMesh>
      <instancedMesh ref={strandB} args={[undefined, undefined, COUNT]}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color={VIOLET} emissive={VIOLET} emissiveIntensity={1.4} roughness={0.25} />
      </instancedMesh>
      <instancedMesh ref={rungs} args={[undefined, undefined, COUNT]}>
        <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
        <meshStandardMaterial color="#AEBBD0" transparent opacity={0.35} />
      </instancedMesh>
    </group>
  );
};

export const HelixScene: React.FC = () => {
  const reduced = prefersReducedMotion();
  return (
    <Canvas
      frameloop={reduced ? 'demand' : 'always'}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 9], fov: 40 }}
      gl={{ alpha: true, antialias: true }}
    >
      <fog attach="fog" args={['#060A12', 7.5, 13]} />
      <StageLights />
      <Float speed={reduced ? 0 : 1.2} rotationIntensity={0.2} floatIntensity={0.6}>
        <Helix />
      </Float>
      {!reduced && <Sparkles count={70} scale={[8, 6, 4]} size={2.2} speed={0.3} color={MINT} opacity={0.5} />}
    </Canvas>
  );
};

/* ---------------- Vital orb + score ring (dashboard, coach) ---------------- */

const Orb: React.FC<{ active?: boolean }> = ({ active }) => {
  const mat = useRef<React.ComponentRef<typeof MeshDistortMaterial>>(null);
  useFrame(() => {
    if (!mat.current) return;
    // Ease toward the target "energy" so state changes feel organic.
    const targetDistort = active ? 0.55 : 0.32;
    mat.current.distort += (targetDistort - mat.current.distort) * 0.05;
  });
  const shell = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (shell.current) {
      shell.current.rotation.y += dt * (active ? 0.9 : 0.25);
      shell.current.rotation.x += dt * 0.1;
    }
  });
  return (
    <group>
      {/* Dark glassy core with a living, distorting surface */}
      <mesh>
        <icosahedronGeometry args={[0.92, 32]} />
        <MeshDistortMaterial
          ref={mat}
          color="#0B3B2C"
          emissive={MINT}
          emissiveIntensity={active ? 0.35 : 0.18}
          roughness={0.12}
          metalness={0.75}
          distort={0.32}
          speed={active ? 4.5 : 1.6}
        />
      </mesh>
      {/* Faint geodesic shell, like a scanner cage */}
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.18, 1]} />
        <meshBasicMaterial color={MINT} wireframe transparent opacity={0.16} />
      </mesh>
      {/* Inner glow */}
      <pointLight position={[0, 0, 0]} intensity={active ? 6 : 3} color={MINT} distance={3} />
    </group>
  );
};

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const progress = useRef(0);
  const ring = useRef<THREE.Mesh>(null);
  const target = Math.max(0.001, Math.min(score, 100) / 100);
  const reduced = prefersReducedMotion();

  useFrame(() => {
    if (!ring.current) return;
    const next = reduced ? target : progress.current + (target - progress.current) * 0.04;
    // Only rebuild the arc while it is still animating toward the score.
    if (Math.abs(next - progress.current) < 1e-4 && ring.current.userData.built) return;
    progress.current = next;
    ring.current.userData.built = true;
    const geo = new THREE.TorusGeometry(1.55, 0.06, 16, 160, Math.PI * 2 * progress.current);
    ring.current.geometry.dispose();
    ring.current.geometry = geo;
  });

  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <torusGeometry args={[1.55, 0.02, 12, 160]} />
        <meshBasicMaterial color="#2A3A57" />
      </mesh>
      <mesh ref={ring} scale={[-1, 1, 1]}>
        <torusGeometry args={[1.55, 0.06, 16, 160, 0.001]} />
        <meshStandardMaterial color={MINT} emissive={MINT} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  );
};

export const OrbScene: React.FC<{ score?: number; active?: boolean }> = ({ score, active }) => {
  const reduced = prefersReducedMotion();
  return (
    <Canvas
      frameloop={reduced ? 'demand' : 'always'}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 4.6], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
    >
      <StageLights />
      <Float speed={reduced ? 0 : 1.6} rotationIntensity={0.35} floatIntensity={0.5}>
        <Orb active={active} />
        {typeof score === 'number' && <ScoreRing score={score} />}
      </Float>
      {!reduced && <Sparkles count={28} scale={[4, 4, 3]} size={1.8} speed={active ? 1.2 : 0.35} color={MINT} opacity={0.6} />}
    </Canvas>
  );
};
