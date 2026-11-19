// 3D posture mannequin. Lazy-loaded (three.js chunk) from PostureViewer.
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Html, Lightformer, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { PostureFinding } from '../../types';
import {
  EXERCISES, ISSUES, NEUTRAL, exerciseFrame, highlightedSegments, issuePose,
  type Joint, type Pose, type Segment,
} from './library';

export type ViewerMode = 'issue' | 'corrected' | 'exercise';

const D2R = Math.PI / 180;
const BASE = new THREE.Color('#ECE8E1');
// Soft, desaturated tints: the figure should read as ceramic, not as a warning sign.
const TINT = {
  mild: new THREE.Color('#F4D79A'),
  moderate: new THREE.Color('#EFBC72'),
  severe: new THREE.Color('#EC9484'),
  good: new THREE.Color('#9BDCC0'),
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const smooth = (t: number) => t * t * (3 - 2 * t);

/* ---------------- body ---------------- */

type JointRefs = Partial<Record<Joint, THREE.Group>>;
type SegmentMats = Partial<Record<Segment, THREE.MeshPhysicalMaterial[]>>;

const Capsule: React.FC<{
  r: number; len: number; pos?: Vec; rot?: Vec; scale?: Vec; seg: Segment | null; mats: React.MutableRefObject<SegmentMats>;
}> = ({ r, len, pos, rot, scale, seg, mats }) => (
  <mesh position={pos} rotation={rot} scale={scale} castShadow>
    <capsuleGeometry args={[r, len, 8, 20]} />
    <Skin seg={seg} mats={mats} />
  </mesh>
);
type Vec = [number, number, number];

const Ball: React.FC<{ r: number; pos?: Vec; scale?: Vec; seg: Segment | null; mats: React.MutableRefObject<SegmentMats> }> = ({ r, pos, scale, seg, mats }) => (
  <mesh position={pos} scale={scale} castShadow>
    <sphereGeometry args={[r, 32, 24]} />
    <Skin seg={seg} mats={mats} />
  </mesh>
);

const Skin: React.FC<{ seg: Segment | null; mats: React.MutableRefObject<SegmentMats> }> = ({ seg, mats }) => (
  <meshPhysicalMaterial
    ref={(m) => {
      if (!m || !seg) return;
      const list = (mats.current[seg] ??= []);
      if (!list.includes(m)) list.push(m);
    }}
    color={BASE}
    roughness={0.45}
    clearcoat={0.6}
    clearcoatRoughness={0.4}
  />
);

const J: React.FC<{ name: Joint; at: Vec; refs: React.MutableRefObject<JointRefs>; order?: THREE.EulerOrder; children?: React.ReactNode }> = ({
  name, at, refs, order = 'XYZ', children,
}) => (
  <group
    position={at}
    rotation-order={order}
    ref={(g) => {
      if (g) refs.current[name] = g;
    }}
  >
    {children}
  </group>
);

const Callout: React.FC<{ text: string; tone: 'mild' | 'moderate' | 'severe'; offset: Vec }> = ({ text, tone, offset }) => (
  <Html position={offset} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
    <span
      className={`pill ${tone === 'severe' ? 'pill-critical' : 'pill-warning'} whitespace-nowrap shadow-card`}
      style={{ background: '#fff' }}
    >
      <span className="dot" />{text}
    </span>
  </Html>
);

/* ---------------- scene ---------------- */

const Figure: React.FC<{ findings: PostureFinding[]; mode: ViewerMode; exerciseId?: string; showLabels: boolean }> = ({
  findings, mode, exerciseId, showLabels,
}) => {
  const joints = useRef<JointRefs>({});
  const mats = useRef<SegmentMats>({});
  const root = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const reduced = prefersReducedMotion();

  const issueTarget = useMemo(() => issuePose(findings), [findings]);
  const highlights = useMemo(() => highlightedSegments(findings), [findings]);
  const exercise = exerciseId ? EXERCISES[exerciseId] : undefined;

  useFrame((_, dt) => {
    clock.current += dt;
    let target: Pose = NEUTRAL;
    if (mode === 'issue') target = issueTarget;
    if (mode === 'exercise' && exercise) {
      const beat = exercise.beat ?? 1.3;
      const t = reduced ? 1.3 : clock.current / beat;
      const i = Math.floor(t);
      const f = t - i;
      // Hold at each keyframe, then ease to the next one.
      const u = smooth(Math.min(1, Math.max(0, (f - 0.35) / 0.55)));
      const a = exerciseFrame(exercise, i);
      const b = exerciseFrame(exercise, i + 1);
      const rot: Pose['rot'] = {};
      const keys = new Set([...Object.keys(a.rot), ...Object.keys(b.rot)]) as Set<Joint>;
      keys.forEach((j) => {
        const va = a.rot[j] ?? [0, 0, 0];
        const vb = b.rot[j] ?? [0, 0, 0];
        rot[j] = [va[0] + (vb[0] - va[0]) * u, va[1] + (vb[1] - va[1]) * u, va[2] + (vb[2] - va[2]) * u];
      });
      const oa = a.offset ?? [0, 0, 0];
      const ob = b.offset ?? [0, 0, 0];
      target = { rot, offset: [oa[0] + (ob[0] - oa[0]) * u, oa[1] + (ob[1] - oa[1]) * u, oa[2] + (ob[2] - oa[2]) * u] };
    }

    const k = reduced ? 1 : 1 - Math.exp(-dt * (mode === 'exercise' ? 12 : 5));
    for (const [name, g] of Object.entries(joints.current) as [Joint, THREE.Group][]) {
      const v = target.rot[name] ?? [0, 0, 0];
      g.rotation.x += (v[0] * D2R - g.rotation.x) * k;
      g.rotation.y += (v[1] * D2R - g.rotation.y) * k;
      g.rotation.z += (v[2] * D2R - g.rotation.z) * k;
    }
    if (root.current) {
      const o = target.offset ?? [0, 0, 0];
      root.current.position.x += (o[0] - root.current.position.x) * k;
      root.current.position.y += (o[1] - root.current.position.y) * k;
      root.current.position.z += (o[2] - root.current.position.z) * k;
    }

    // Colour: issue → affected areas warm; corrected → same areas green;
    // exercise → only the parts that exercise works.
    const ck = reduced ? 1 : 1 - Math.exp(-dt * 4);
    for (const [seg, list] of Object.entries(mats.current) as [Segment, THREE.MeshPhysicalMaterial[]][]) {
      const sev = highlights.get(seg);
      const goal =
        mode === 'exercise'
          ? exercise?.targets.includes(seg) ? TINT.good : BASE
          : !sev ? BASE : mode === 'issue' ? TINT[sev] : TINT.good;
      for (const m of list) m.color.lerp(goal, ck);
    }
  });

  const anchor: Partial<Record<Joint, { text: string; tone: PostureFinding['severity']; offset: Vec }[]>> = {};
  if (showLabels && mode === 'issue') {
    const where: Record<string, [Joint, Vec]> = {
      forward_head: ['head', [0, 0.12, 0.26]], rounded_shoulders: ['chest', [0, 0.3, 0.3]], kyphosis: ['chest', [0, 0.18, -0.32]],
      anterior_pelvic_tilt: ['pelvis', [0, 0, 0.32]], posterior_pelvic_tilt: ['pelvis', [0, 0, 0.32]], lordosis: ['lumbar', [0, 0.06, -0.3]],
      flat_back: ['lumbar', [0, 0.06, -0.3]], uneven_shoulders: ['chest', [0, 0.42, 0]], lateral_pelvic_tilt: ['pelvis', [0, -0.1, 0.25]],
      knee_valgus: ['kneeL', [0.1, 0, 0.2]],
    };
    for (const f of findings) {
      const [j, offset] = where[f.issue];
      (anchor[j] ??= []).push({ text: ISSUES[f.issue].label, tone: f.severity, offset });
    }
  }
  const labels = (j: Joint) => anchor[j]?.map((a) => <Callout key={a.text} text={a.text} tone={a.tone} offset={a.offset} />);

  return (
    <group ref={root}>
      <J name="pelvis" at={[0, 0.95, 0]} refs={joints}>
        <Capsule r={0.1} len={0.15} rot={[0, 0, Math.PI / 2]} scale={[1, 1, 0.78]} seg="pelvis" mats={mats} />
        {labels('pelvis')}

        <J name="lumbar" at={[0, 0.07, 0]} refs={joints}>
          <Capsule r={0.085} len={0.1} pos={[0, 0.08, 0]} scale={[1.1, 1, 0.85]} seg="lumbar" mats={mats} />
          {labels('lumbar')}

          <J name="chest" at={[0, 0.17, 0]} refs={joints}>
            <Capsule r={0.12} len={0.13} pos={[0, 0.15, 0]} scale={[1.25, 1, 0.8]} seg="chest" mats={mats} />
            {labels('chest')}

            <J name="neck" at={[0, 0.31, 0]} refs={joints}>
              <Capsule r={0.042} len={0.06} pos={[0, 0.05, 0]} seg="neck" mats={mats} />
              <J name="head" at={[0, 0.1, 0]} refs={joints}>
                <Ball r={0.1} pos={[0, 0.1, 0.01]} scale={[0.86, 1.08, 0.98]} seg="head" mats={mats} />
                {/* nose, so you can tell which way the figure faces */}
                <Ball r={0.018} pos={[0, 0.1, 0.105]} seg="head" mats={mats} />
                {labels('head')}
              </J>
            </J>

            {([1, -1] as const).map((s) => (
              <J key={s} name={s > 0 ? 'scapL' : 'scapR'} at={[0, 0.27, 0]} refs={joints}>
                <J name={s > 0 ? 'shoulderL' : 'shoulderR'} at={[0.19 * s, 0, 0]} refs={joints} order="YXZ">
                  <Ball r={0.058} seg="shoulders" mats={mats} />
                  <Capsule r={0.044} len={0.2} pos={[0, -0.15, 0]} seg="shoulders" mats={mats} />
                  <J name={s > 0 ? 'elbowL' : 'elbowR'} at={[0, -0.3, 0]} refs={joints}>
                    <Capsule r={0.037} len={0.19} pos={[0, -0.13, 0]} seg={null} mats={mats} />
                    <Ball r={0.044} pos={[0, -0.29, 0]} scale={[0.8, 1.1, 0.6]} seg={null} mats={mats} />
                  </J>
                </J>
              </J>
            ))}
          </J>
        </J>

        {([1, -1] as const).map((s) => (
          <J key={s} name={s > 0 ? 'hipL' : 'hipR'} at={[0.095 * s, -0.04, 0]} refs={joints}>
            <Capsule r={0.064} len={0.31} pos={[0, -0.22, 0]} seg="thighs" mats={mats} />
            <J name={s > 0 ? 'kneeL' : 'kneeR'} at={[0, -0.44, 0]} refs={joints}>
              <Capsule r={0.05} len={0.31} pos={[0, -0.21, 0]} seg="shins" mats={mats} />
              <Capsule r={0.04} len={0.12} pos={[0, -0.42, 0.05]} rot={[Math.PI / 2, 0, 0]} seg={null} mats={mats} />
              {s > 0 && labels('kneeL')}
            </J>
          </J>
        ))}
      </J>
    </group>
  );
};

const CameraRig: React.FC<{ view: 'side' | 'front' }> = ({ view }) => {
  const { camera } = useThree();
  const goal = useMemo(() => (view === 'side' ? new THREE.Vector3(4.4, 1.2, 0.45) : new THREE.Vector3(0.45, 1.2, 4.4)), [view]);
  const look = useMemo(() => new THREE.Vector3(0, 0.9, 0), []);
  useFrame((_, dt) => {
    camera.position.lerp(goal, prefersReducedMotion() ? 1 : 1 - Math.exp(-dt * 4));
    camera.lookAt(look);
  });
  return null;
};

export const PostureScene: React.FC<{
  findings: PostureFinding[];
  mode: ViewerMode;
  exerciseId?: string;
  view: 'side' | 'front';
  showLabels?: boolean;
}> = ({ findings, mode, exerciseId, view, showLabels = true }) => (
  <Canvas
    shadows
    dpr={[1, 2]}
    camera={{ position: view === 'side' ? [4.4, 1.2, 0.45] : [0.45, 1.2, 4.4], fov: 30 }}
    gl={{ alpha: true, antialias: true, toneMapping: THREE.NeutralToneMapping }}
  >
    <ambientLight intensity={0.6} />
    <directionalLight position={[3, 5, 3]} intensity={1.1} castShadow />
    <Environment resolution={128}>
      <Lightformer form="rect" intensity={2.4} position={[0, 4, 3]} scale={[6, 3, 1]} />
      <Lightformer form="rect" intensity={1.2} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
      <Lightformer form="rect" intensity={1} position={[5, 1, 0]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
      <Lightformer form="rect" intensity={1} position={[0, -3, 1]} rotation-x={Math.PI / 2} scale={[6, 4, 1]} />
    </Environment>
    <CameraRig view={view} />

    {/* Plumb line: ideal alignment runs ear → shoulder → hip → knee → ankle */}
    {mode !== 'exercise' && (
      <Line points={[[0, 0.01, 0], [0, 1.92, 0]]} color="#059669" lineWidth={1.4} dashed dashSize={0.04} gapSize={0.03} />
    )}

    <Figure findings={findings} mode={mode} exerciseId={exerciseId} showLabels={showLabels} />
    <ContactShadows position={[0, 0, 0]} opacity={0.32} scale={3} blur={2.4} far={2} />
  </Canvas>
);
