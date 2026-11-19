// Three.js scene. Only ever imported lazily (see ../Three3D.tsx) so three/r3f
// stays out of the initial bundle.
//
// One restrained element: a soft ceramic form, lit like a studio product shot,
// sitting on a contact shadow. Optional thin ring shows a 0–100 score.
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Float, Lightformer, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Studio lighting built from in-scene light panels (no HDR download). */
const Studio: React.FC = () => (
  <Environment resolution={256}>
    <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[6, 3, 1]} />
    <Lightformer form="rect" intensity={1.2} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
    <Lightformer form="rect" intensity={0.8} position={[5, 0, 0]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} color="#D1FAE5" />
    <Lightformer form="rect" intensity={1.4} position={[0, -4, 1]} rotation-x={Math.PI / 2} scale={[6, 4, 1]} />
    <Lightformer form="ring" intensity={0.6} position={[0, -3, 2]} scale={2} />
  </Environment>
);

const Form: React.FC<{ active?: boolean; color: string }> = ({ active, color }) => {
  const mat = useRef<React.ComponentRef<typeof MeshDistortMaterial>>(null);
  useFrame(() => {
    if (!mat.current) return;
    const target = active ? 0.45 : 0.3;
    mat.current.distort += (target - mat.current.distort) * 0.04;
  });
  return (
    <mesh castShadow>
      <icosahedronGeometry args={[1, 48]} />
      <MeshDistortMaterial
        ref={mat}
        color={color}
        roughness={0.32}
        metalness={0}
        envMapIntensity={1.35}
        clearcoat={1}
        clearcoatRoughness={0.25}
        distort={0.3}
        speed={active ? 3.2 : 1.1}
      />
    </mesh>
  );
};

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const ring = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const reduced = prefersReducedMotion();
  const target = Math.max(0.001, Math.min(score, 100) / 100);

  useFrame(() => {
    if (!ring.current) return;
    const next = reduced ? target : progress.current + (target - progress.current) * 0.05;
    if (Math.abs(next - progress.current) < 1e-4 && ring.current.userData.built) return;
    progress.current = next;
    ring.current.userData.built = true;
    ring.current.geometry.dispose();
    ring.current.geometry = new THREE.TorusGeometry(1.5, 0.025, 12, 200, Math.PI * 2 * progress.current);
  });

  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <torusGeometry args={[1.5, 0.008, 8, 200]} />
        <meshBasicMaterial color="#D6D3D1" />
      </mesh>
      <mesh ref={ring} scale={[-1, 1, 1]}>
        <torusGeometry args={[1.5, 0.025, 12, 200, 0.001]} />
        <meshStandardMaterial color="#059669" roughness={0.4} />
      </mesh>
    </group>
  );
};

export const SculptureScene: React.FC<{ score?: number; active?: boolean; color?: string; zoom?: number }> = ({
  score,
  active,
  color = '#C9EEDB',
  zoom = 6.2,
}) => {
  const reduced = prefersReducedMotion();
  return (
    <Canvas
      frameloop={reduced ? 'demand' : 'always'}
      dpr={[1, 2]}
      camera={{ position: [0, 0.2, zoom], fov: 38 }}
      gl={{ alpha: true, antialias: true, toneMapping: THREE.NeutralToneMapping }}
    >
      <ambientLight intensity={0.7} />
      <Studio />
      <Float speed={reduced ? 0 : 1.4} rotationIntensity={0.25} floatIntensity={0.35}>
        <Form active={active} color={color} />
        {typeof score === 'number' && <ScoreRing score={score} />}
      </Float>
      <ContactShadows position={[0, -1.65, 0]} opacity={0.28} scale={6} blur={2.6} far={3} />
    </Canvas>
  );
};
