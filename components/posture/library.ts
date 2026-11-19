// Posture issues and corrective exercises, expressed as joint rotations for
// the 3D mannequin. Pure data: no three.js here, so the UI can use it freely.
//
// Conventions (degrees, figure faces +Z, viewer of the side view sits at +X):
//   x = pitch: + bends a joint forward (spine/neck flex), arms/legs: − raises forward
//   y = yaw, z = roll. For the left side (+X) positive z moves a limb outward;
//   mirrored values are used for the right side.
import type { PostureFinding, PostureIssue } from '../../types';

export type Joint =
  | 'pelvis' | 'lumbar' | 'chest' | 'neck' | 'head'
  | 'scapL' | 'scapR' | 'shoulderL' | 'shoulderR' | 'elbowL' | 'elbowR'
  | 'hipL' | 'hipR' | 'kneeL' | 'kneeR';

export type Vec3 = [number, number, number];

export interface Pose {
  rot: Partial<Record<Joint, Vec3>>;
  /** Whole-body offset in metres (e.g. lowering into a squat). */
  offset?: Vec3;
}

/** Body parts that light up when an issue is shown. */
export type Segment = 'head' | 'neck' | 'chest' | 'lumbar' | 'pelvis' | 'shoulders' | 'thighs' | 'shins';

export const NEUTRAL: Pose = {
  rot: {
    shoulderL: [0, 0, 5], shoulderR: [0, 0, -5],
    elbowL: [-8, 0, 0], elbowR: [-8, 0, 0],
  },
};

export interface IssueInfo {
  label: string;
  /** What it is, in plain words. */
  what: string;
  /** How it shows up against the plumb line. */
  look: string;
  segments: Segment[];
  pose: (side: PostureFinding['side']) => Pose;
  exercises: string[];
}

export const ISSUES: Record<PostureIssue, IssueInfo> = {
  forward_head: {
    label: 'Forward head posture',
    what: 'The head sits in front of the shoulders instead of stacked above them, loading the neck.',
    look: 'Ear is in front of the plumb line.',
    segments: ['head', 'neck'],
    pose: () => ({ rot: { neck: [26, 0, 0], head: [-20, 0, 0] } }),
    exercises: ['chin_tuck', 'thoracic_extension'],
  },
  rounded_shoulders: {
    label: 'Rounded shoulders',
    what: 'Shoulders roll forward, usually from tight chest muscles and a weak upper back.',
    look: 'Shoulder joints sit in front of the plumb line.',
    segments: ['shoulders', 'chest'],
    pose: () => ({ rot: { scapL: [0, -16, 0], scapR: [0, 16, 0], chest: [6, 0, 0], shoulderL: [0, -10, 5], shoulderR: [0, 10, -5] } }),
    exercises: ['band_pull_apart', 'doorway_stretch', 'wall_angel'],
  },
  kyphosis: {
    label: 'Rounded upper back',
    what: 'Excessive curve in the upper spine (thoracic kyphosis), giving a hunched look.',
    look: 'Upper back curves forward away from the line.',
    segments: ['chest'],
    pose: () => ({ rot: { chest: [22, 0, 0], neck: [10, 0, 0], head: [-14, 0, 0], scapL: [0, -6, 0], scapR: [0, 6, 0] } }),
    exercises: ['thoracic_extension', 'wall_angel'],
  },
  anterior_pelvic_tilt: {
    label: 'Anterior pelvic tilt',
    what: 'The pelvis tips forward, increasing the low-back arch. Often tight hip flexors and weak glutes.',
    look: 'Front of the pelvis drops; lower back arches.',
    segments: ['pelvis', 'lumbar'],
    pose: () => ({ rot: { pelvis: [16, 0, 0], hipL: [-16, 0, 0], hipR: [-16, 0, 0], lumbar: [-18, 0, 0], chest: [4, 0, 0] } }),
    exercises: ['pelvic_tilt', 'hip_flexor_stretch'],
  },
  posterior_pelvic_tilt: {
    label: 'Posterior pelvic tilt',
    what: 'The pelvis tucks under, flattening the lower back. Often tight hamstrings.',
    look: 'Pelvis tucks; lower back looks flat.',
    segments: ['pelvis', 'lumbar'],
    pose: () => ({ rot: { pelvis: [-12, 0, 0], hipL: [12, 0, 0], hipR: [12, 0, 0], lumbar: [10, 0, 0], chest: [6, 0, 0] } }),
    exercises: ['hip_hinge', 'thoracic_extension'],
  },
  lordosis: {
    label: 'Excessive lower-back arch',
    what: 'The lower spine curves inward more than normal (hyperlordosis).',
    look: 'Deep curve in the lower back.',
    segments: ['lumbar'],
    pose: () => ({ rot: { lumbar: [-22, 0, 0], pelvis: [8, 0, 0], hipL: [-8, 0, 0], hipR: [-8, 0, 0], chest: [6, 0, 0] } }),
    exercises: ['pelvic_tilt', 'hip_flexor_stretch'],
  },
  flat_back: {
    label: 'Flat back',
    what: 'The natural curves of the spine are reduced, so the back looks straight and stiff.',
    look: 'Spine runs straight with little curve.',
    segments: ['lumbar', 'chest'],
    pose: () => ({ rot: { lumbar: [10, 0, 0], chest: [-6, 0, 0], pelvis: [-8, 0, 0], hipL: [8, 0, 0], hipR: [8, 0, 0] } }),
    exercises: ['hip_hinge', 'pelvic_tilt'],
  },
  uneven_shoulders: {
    label: 'Uneven shoulders',
    what: 'One shoulder sits higher than the other, often from one-sided habits or muscle imbalance.',
    look: 'Shoulder line is not level (front view).',
    segments: ['shoulders'],
    pose: (side) => (side === 'right'
      ? { rot: { scapR: [0, 0, -9], chest: [0, 0, -3] } }
      : { rot: { scapL: [0, 0, 9], chest: [0, 0, 3] } }),
    exercises: ['side_bend', 'band_pull_apart'],
  },
  lateral_pelvic_tilt: {
    label: 'Lateral pelvic tilt',
    what: 'One hip sits higher than the other, which can shift load to one leg.',
    look: 'Hip line is not level (front view).',
    segments: ['pelvis'],
    pose: (side) => {
      const s = side === 'right' ? -1 : 1;
      return { rot: { pelvis: [0, 0, 7 * s], hipL: [0, 0, -7 * s], hipR: [0, 0, -7 * s], lumbar: [0, 0, -8 * s] } };
    },
    exercises: ['side_bend', 'squat'],
  },
  knee_valgus: {
    label: 'Knees caving in',
    what: 'Knees drift inward toward each other (valgus), often from weak hip muscles.',
    look: 'Knees point inward (front view).',
    segments: ['thighs', 'shins'],
    pose: () => ({ rot: { hipL: [0, 0, -9], hipR: [0, 0, 9], kneeL: [0, 0, 14], kneeR: [0, 0, -14] } }),
    exercises: ['squat'],
  },
};

export interface Exercise {
  name: string;
  reps: string;
  steps: string[];
  /** Best camera for this movement. */
  view: 'side' | 'front';
  /** Body parts this exercise works; highlighted while it plays. */
  targets: Segment[];
  /** Keyframes, looped. Each is held/eased over `beat` seconds. */
  frames: Pose[];
  beat?: number;
}

const goalpost: Pose['rot'] = { shoulderL: [0, 0, 90], shoulderR: [0, 0, -90], elbowL: [0, 0, 90], elbowR: [0, 0, -90] };

export const EXERCISES: Record<string, Exercise> = {
  chin_tuck: {
    targets: ['neck', 'head'],
    name: 'Chin tucks',
    reps: '3 × 10, hold 3 s',
    view: 'side',
    steps: ['Stand tall, eyes level.', 'Glide your chin straight back, making a "double chin".', 'Hold, then relax. Don\'t tip your head down.'],
    frames: [{ rot: {} }, { rot: { neck: [-10, 0, 0], head: [12, 0, 0] } }],
  },
  thoracic_extension: {
    targets: ['chest'],
    name: 'Standing back extension',
    reps: '2 × 10',
    view: 'side',
    steps: ['Raise both arms overhead.', 'Gently lift your chest and lean the upper back backward.', 'Keep your lower back and hips still.'],
    frames: [
      { rot: {} },
      { rot: { shoulderL: [-170, 0, 8], shoulderR: [-170, 0, -8], elbowL: [0, 0, 0], elbowR: [0, 0, 0] } },
      { rot: { shoulderL: [-175, 0, 8], shoulderR: [-175, 0, -8], elbowL: [0, 0, 0], elbowR: [0, 0, 0], chest: [-16, 0, 0], neck: [-6, 0, 0] } },
    ],
  },
  band_pull_apart: {
    targets: ['shoulders'],
    name: 'Band pull-aparts',
    reps: '3 × 15',
    view: 'front',
    steps: ['Hold a band at shoulder height, arms straight in front.', 'Pull the band apart by squeezing your shoulder blades together.', 'Return slowly.'],
    frames: [
      { rot: { shoulderL: [-90, 0, 0], shoulderR: [-90, 0, 0], elbowL: [0, 0, 0], elbowR: [0, 0, 0] } },
      { rot: { shoulderL: [-90, 85, 0], shoulderR: [-90, -85, 0], elbowL: [0, 0, 0], elbowR: [0, 0, 0], scapL: [0, 10, 0], scapR: [0, -10, 0] } },
    ],
  },
  doorway_stretch: {
    targets: ['chest', 'shoulders'],
    name: 'Doorway chest stretch',
    reps: '3 × 30 s',
    view: 'side',
    steps: ['Place forearms on a door frame, elbows at shoulder height.', 'Step through gently until you feel a stretch across the chest.', 'Breathe and hold.'],
    frames: [
      { rot: { ...goalpost } },
      { rot: { ...goalpost, scapL: [0, 14, 0], scapR: [0, -14, 0], chest: [-8, 0, 0] }, offset: [0, 0, 0.06] },
    ],
    beat: 1.8,
  },
  wall_angel: {
    targets: ['shoulders', 'chest'],
    name: 'Wall angels',
    reps: '2 × 10',
    view: 'front',
    steps: ['Stand with your back, head and arms against a wall.', 'Slide your arms up overhead, keeping contact with the wall.', 'Slide back down to a "goalpost" position.'],
    frames: [
      { rot: { ...goalpost } },
      { rot: { shoulderL: [0, 0, 165], shoulderR: [0, 0, -165], elbowL: [0, 0, 15], elbowR: [0, 0, -15] } },
    ],
  },
  pelvic_tilt: {
    targets: ['pelvis', 'lumbar'],
    name: 'Standing pelvic tilts',
    reps: '2 × 12',
    view: 'side',
    steps: ['Stand with knees soft.', 'Tighten your stomach and glutes to tuck the pelvis under.', 'Feel the lower back flatten, then release.'],
    frames: [{ rot: {} }, { rot: { pelvis: [-12, 0, 0], hipL: [12, 0, 0], hipR: [12, 0, 0], lumbar: [10, 0, 0], kneeL: [8, 0, 0], kneeR: [8, 0, 0] }, offset: [0, -0.01, 0] }],
  },
  hip_flexor_stretch: {
    targets: ['pelvis', 'thighs'],
    name: 'Hip flexor lunge stretch',
    reps: '2 × 30 s each side',
    view: 'side',
    steps: ['Step one foot forward into a lunge.', 'Tuck your pelvis under and squeeze the back glute.', 'Shift forward until you feel the front of the back hip stretch.'],
    frames: [
      { rot: {} },
      { rot: { hipL: [-45, 0, 0], kneeL: [62, 0, 0], hipR: [22, 0, 0], kneeR: [40, 0, 0], pelvis: [-6, 0, 0], lumbar: [4, 0, 0] }, offset: [0, -0.14, 0.05] },
    ],
    beat: 1.8,
  },
  hip_hinge: {
    targets: ['pelvis', 'thighs'],
    name: 'Hip hinge',
    reps: '2 × 10',
    view: 'side',
    steps: ['Stand with soft knees, hands on hips.', 'Push your hips back, keeping the back long and neutral.', 'Return by squeezing the glutes.'],
    frames: [
      { rot: {} },
      { rot: { pelvis: [42, 0, 0], hipL: [-42, 0, 0], hipR: [-42, 0, 0], kneeL: [12, 0, 0], kneeR: [12, 0, 0], neck: [-10, 0, 0] }, offset: [0, -0.03, -0.1] },
    ],
  },
  side_bend: {
    targets: ['lumbar', 'chest'],
    name: 'Standing side bend',
    reps: '2 × 8 each side',
    view: 'front',
    steps: ['Reach one arm overhead.', 'Bend sideways away from that arm, without leaning forward.', 'Return and switch sides.'],
    frames: [
      { rot: {} },
      { rot: { lumbar: [0, 0, 14], chest: [0, 0, 10], shoulderR: [0, 0, -165], elbowR: [0, 0, -10] } },
      { rot: {} },
      { rot: { lumbar: [0, 0, -14], chest: [0, 0, -10], shoulderL: [0, 0, 165], elbowL: [0, 0, 10] } },
    ],
  },
  squat: {
    targets: ['thighs', 'shins', 'pelvis'],
    name: 'Squat, knees out',
    reps: '3 × 10',
    view: 'front',
    steps: ['Feet shoulder-width, toes slightly out.', 'Sit back and down, pushing your knees outward over your toes.', 'Drive up through the whole foot.'],
    frames: [
      { rot: {} },
      {
        rot: {
          hipL: [-75, 0, 10], hipR: [-75, 0, -10], kneeL: [100, 0, 0], kneeR: [100, 0, 0],
          lumbar: [12, 0, 0], chest: [10, 0, 0], neck: [-12, 0, 0],
          shoulderL: [-85, 0, 0], shoulderR: [-85, 0, 0], elbowL: [0, 0, 0], elbowR: [0, 0, 0],
        },
        offset: [0, -0.33, -0.18],
      },
    ],
    beat: 1.4,
  },
};

const SEVERITY_SCALE = { mild: 0.55, moderate: 0.8, severe: 1 } as const;

/** Merge poses by adding rotations/offsets. */
export function addPoses(...poses: Pose[]): Pose {
  const rot: Pose['rot'] = {};
  const offset: Vec3 = [0, 0, 0];
  for (const p of poses) {
    for (const [j, v] of Object.entries(p.rot) as [Joint, Vec3][]) {
      const cur = rot[j] ?? [0, 0, 0];
      rot[j] = [cur[0] + v[0], cur[1] + v[1], cur[2] + v[2]];
    }
    if (p.offset) p.offset.forEach((v, i) => (offset[i] += v));
  }
  return { rot, offset };
}

function scale(p: Pose, k: number): Pose {
  const rot: Pose['rot'] = {};
  for (const [j, v] of Object.entries(p.rot) as [Joint, Vec3][]) rot[j] = [v[0] * k, v[1] * k, v[2] * k];
  return { rot, offset: p.offset ? [p.offset[0] * k, p.offset[1] * k, p.offset[2] * k] : undefined };
}

/** The user's posture: neutral plus every finding, scaled by severity. */
export function issuePose(findings: PostureFinding[]): Pose {
  return addPoses(
    NEUTRAL,
    ...findings.map((f) => scale(ISSUES[f.issue].pose(f.side), SEVERITY_SCALE[f.severity] ?? 0.7)),
  );
}

/** Exercise frames: what the exercise prescribes is absolute, on top of neutral. */
export function exerciseFrame(ex: Exercise, i: number): Pose {
  const f = ex.frames[i % ex.frames.length];
  // Keyframes that set an arm joint replace the neutral arm hang instead of adding to it.
  const base: Pose = { rot: { ...NEUTRAL.rot } };
  for (const j of Object.keys(f.rot) as Joint[]) delete base.rot[j];
  return addPoses(base, f);
}

/** Which segments to highlight, with the worst severity touching each. */
export function highlightedSegments(findings: PostureFinding[]): Map<Segment, PostureFinding['severity']> {
  const order = { mild: 0, moderate: 1, severe: 2 };
  const m = new Map<Segment, PostureFinding['severity']>();
  for (const f of findings) {
    for (const s of ISSUES[f.issue].segments) {
      const prev = m.get(s);
      if (!prev || order[f.severity] > order[prev]) m.set(s, f.severity);
    }
  }
  return m;
}

/** Side view shows sagittal issues best; asymmetries need the front view. */
export function bestView(findings: PostureFinding[]): 'side' | 'front' {
  const frontal: PostureIssue[] = ['uneven_shoulders', 'lateral_pelvic_tilt', 'knee_valgus'];
  return findings.length && findings.every((f) => frontal.includes(f.issue)) ? 'front' : 'side';
}
