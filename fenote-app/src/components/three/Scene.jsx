import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

const Particles = ({ count = 220 }) => {
  const mesh = useRef();
  const { isDark } = useTheme();
  const { invalidate } = useThree();

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return arr;
  }, [count]);

  useEffect(() => { invalidate(); }, [isDark, invalidate]);

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={1.2}
        color={isDark ? '#7DD3FC' : '#93C5FD'}
        transparent
        opacity={isDark ? 0.22 : 0.12}
        blending={THREE.NormalBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

export default function Scene() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 30], fov: 60 }}
      >
        <Particles />
      </Canvas>
    </div>
  );
}
