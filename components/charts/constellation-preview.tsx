"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type ConstellationPreviewProps = {
  items: { cluster: string; importance: number; momentum: number }[];
};

function Nodes({ items }: ConstellationPreviewProps) {
  const groupRef = useRef<THREE.Group>(null);

  const nodes = useMemo(() => {
    const clusters = Array.from(new Set(items.map((item) => item.cluster)));
    const palette = ["#67e8f9", "#fdba74", "#34d399", "#c084fc", "#f472b6", "#facc15"];
    const clusterCenters = new Map(
      clusters.map((cluster, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(1, clusters.length);
        return [
          cluster,
          {
            position: [Math.cos(angle) * 1.8, Math.sin(angle) * 1.25, Math.sin(angle * 2) * 0.2] as const,
            color: palette[index % palette.length],
          },
        ] as const;
      })
    );
    const itemCounts = new Map(clusters.map((cluster) => [cluster, 0]));

    return items.map((item) => {
      const currentIndex = itemCounts.get(item.cluster) ?? 0;
      itemCounts.set(item.cluster, currentIndex + 1);

      const center = clusterCenters.get(item.cluster) ?? {
        position: [0, 0, 0] as const,
        color: "#67e8f9",
      };
      const countInCluster = items.filter((candidate) => candidate.cluster === item.cluster).length;
      const angle = (Math.PI * 2 * currentIndex) / Math.max(1, countInCluster);
      const orbit = 0.28 + (currentIndex % 4) * 0.18;
      const radius = 0.18 + item.importance / 280;

      return {
        position: [
          center.position[0] + Math.cos(angle) * orbit,
          center.position[1] + Math.sin(angle) * orbit,
          center.position[2] + Math.sin(angle * 1.6) * 0.18,
        ] as const,
        radius,
        emissive: center.color,
      };
    });
  }, [items]);

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.08;
    groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.28) * 0.08;
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, index) => (
        <mesh key={`${node.emissive}-${index}`} position={node.position}>
          <sphereGeometry args={[node.radius, 24, 24]} />
          <meshStandardMaterial color={node.emissive} emissive={node.emissive} emissiveIntensity={0.7} metalness={0.18} roughness={0.12} />
        </mesh>
      ))}
    </group>
  );
}

export function ConstellationPreview({ items }: ConstellationPreviewProps) {
  return (
    <div className="relative h-[320px] overflow-hidden rounded-[1.7rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(103,232,249,0.18),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(249,115,22,0.12),_transparent_28%),linear-gradient(180deg,rgba(6,11,24,0.82),rgba(10,17,32,0.96))]">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 text-xs uppercase tracking-[0.22em] text-slate-400">
        <span>Constellation preview</span>
        <span>Similarity x momentum</span>
      </div>
      <Canvas camera={{ position: [0, 0, 5.8], fov: 42 }}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[5, 5, 4]} intensity={1.1} color="#ffffff" />
        <pointLight position={[-4, -2, 3]} intensity={2.4} color="#67e8f9" />
        <pointLight position={[3, 0, 2]} intensity={1.2} color="#fb923c" />
        <Nodes items={items} />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.22} />
      </Canvas>
    </div>
  );
}
