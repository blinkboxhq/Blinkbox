import { useMemo, useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeReduced(cb) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => (typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(REDUCE_QUERY).matches
      : false),
    () => false,
  );
}

const ACCENT = new THREE.Color('#5b8cff');
const ACCENT_HOT = new THREE.Color('#8ab4ff');
const EDGE = new THREE.Color('#3d5488');

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const CLUSTER_COUNT = 5;
const NODES_PER_CLUSTER = 7;

function buildGraph() {
  const rng = seededRandom(7);
  const clusters = [];
  for (let c = 0; c < CLUSTER_COUNT; c++) {
    const cz = -c * 14;
    const nodes = [];
    for (let i = 0; i < NODES_PER_CLUSTER; i++) {
      nodes.push({
        pos: new THREE.Vector3(
          (rng() - 0.5) * 7,
          (rng() - 0.5) * 6.5,
          cz + (rng() - 0.5) * 6,
        ),
        scale: 0.18 + rng() * 0.22,
        phase: rng() * Math.PI * 2,
        hot: rng() > 0.62,
      });
    }
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      const links = 1 + Math.floor(rng() * 2);
      for (let l = 0; l < links; l++) {
        const j = Math.floor(rng() * nodes.length);
        if (j !== i) edges.push([i, j]);
      }
    }
    clusters.push({ nodes, edges, cz });
  }
  return clusters;
}

function Nodes({ clusters }) {
  const meshRef = useRef();
  const matRef = useRef();
  const all = useMemo(() => clusters.flatMap((c) => c.nodes), [clusters]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => {
    const arr = new Float32Array(all.length * 3);
    all.forEach((n, i) => {
      const col = n.hot ? ACCENT_HOT : ACCENT;
      arr[i * 3] = col.r;
      arr[i * 3 + 1] = col.g;
      arr[i * 3 + 2] = col.b;
    });
    return arr;
  }, [all]);

  const reduced = useReducedMotion();
  const settled = useRef(false);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (reduced && settled.current) return;
    const t = reduced ? 0 : clock.elapsedTime;
    all.forEach((n, i) => {
      const float = Math.sin(t * 0.8 + n.phase) * 0.25;
      dummy.position.set(n.pos.x, n.pos.y + float, n.pos.z);
      const pulse = 1 + Math.sin(t * 1.6 + n.phase) * 0.08;
      dummy.scale.setScalar(n.scale * pulse);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    settled.current = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, all.length]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        ref={matRef}
        vertexColors
        emissive={ACCENT}
        emissiveIntensity={1.4}
        roughness={0.25}
        metalness={0.1}
        toneMapped={false}
      />
      <instancedBufferAttribute attach="instanceColor" args={[colorArray, 3]} />
    </instancedMesh>
  );
}

function Edges({ clusters }) {
  const geom = useMemo(() => {
    const positions = [];
    clusters.forEach((c) => {
      c.edges.forEach(([a, b]) => {
        const pa = c.nodes[a].pos;
        const pb = c.nodes[b].pos;
        positions.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
      });
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [clusters]);

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color={EDGE} transparent opacity={0.85} toneMapped={false} />
    </lineSegments>
  );
}

function Particles() {
  const ref = useRef();
  const { positions, count } = useMemo(() => {
    const count = 420;
    const positions = new Float32Array(count * 3);
    const rng = seededRandom(99);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rng() - 0.5) * 40;
      positions[i * 3 + 1] = (rng() - 0.5) * 24;
      positions[i * 3 + 2] = -rng() * 70 + 6;
    }
    return { positions, count };
  }, []);

  const reduced = useReducedMotion();
  useFrame(({ clock }) => {
    if (ref.current && !reduced) ref.current.rotation.y = clock.elapsedTime * 0.012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#4a5a82" transparent opacity={0.55} sizeAttenuation toneMapped={false} />
    </points>
  );
}

function CameraRig() {
  const scroll = useScroll();
  const { camera, pointer } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const reduced = useReducedMotion();

  useFrame(() => {
    const offset = scroll.offset;
    const z = 10 - offset * (CLUSTER_COUNT - 1) * 14;
    const px = reduced ? 0 : pointer.x * 1.6;
    const py = reduced ? 0 : pointer.y * 1.2;
    target.set(px, py, z);
    camera.position.lerp(target, reduced ? 0.18 : 0.06);
    camera.lookAt(0, 0, z - 12);
  });

  return null;
}

function Scene() {
  const clusters = useMemo(() => buildGraph(), []);
  const { size } = useThree();
  const portrait = size.width < 820;
  const groupPos = portrait ? [0.6, 4.4, -3] : [2.7, 0.2, 0];
  const groupScale = portrait ? 0.78 : 1;
  return (
    <>
      <color attach="background" args={['#050507']} />
      <fog attach="fog" args={['#050507', 14, 46]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[8, 6, 8]} intensity={60} color="#7aa2ff" />
      <pointLight position={[-8, -4, -10]} intensity={40} color="#3b4d80" />
      <group position={groupPos} scale={groupScale}>
        <Nodes clusters={clusters} />
        <Edges clusters={clusters} />
      </group>
      <Particles />
      <CameraRig />
    </>
  );
}

export { Scene };
