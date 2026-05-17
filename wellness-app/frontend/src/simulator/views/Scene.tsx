import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { SchematicRenderer } from './SchematicRenderer';
import { MannequinRenderer } from './MannequinRenderer';
import { DragHandles } from './DragHandles';
import { useSimStore } from '@/store/useSimStore';

type Mode = 'schematic' | 'mannequin';

export function Scene({ mode }: { mode: Mode }) {
  const isDragging = useSimStore(s => s.isDragging);

  return (
    <Canvas
      shadows
      camera={{ position: [1.6, 1.0, 1.6], fov: 35, near: 0.05, far: 50 }}
      style={{ background: '#0b1220' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[2, 3, 2]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* Ground reference */}
        <Grid
          args={[6, 6]}
          cellSize={0.1}
          cellThickness={0.5}
          cellColor="#1e293b"
          sectionSize={0.5}
          sectionThickness={1}
          sectionColor="#334155"
          fadeDistance={6}
          fadeStrength={1.2}
          followCamera={false}
          infiniteGrid
        />

        {mode === 'schematic' ? (
          <>
            <SchematicRenderer person="A" />
            <SchematicRenderer person="B" />
            <DragHandles person="A" />
            <DragHandles person="B" />
          </>
        ) : (
          <>
            <MannequinRenderer person="A" />
            <MannequinRenderer person="B" />
          </>
        )}

        <OrbitControls
          target={[0, 0.4, 0]}
          enablePan
          enableDamping
          enabled={!isDragging}
          minDistance={0.4}
          maxDistance={6}
        />
      </Suspense>
    </Canvas>
  );
}
