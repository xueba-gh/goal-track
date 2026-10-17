'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  /** 0..1 share of the focus goal's plan that is done */
  progress: number;
  /** Colours of the other goals, drawn as orbiting moons */
  moons: { color: string; status: string }[];
  accent: string;
}

/**
 * The focus goal sits at the centre as a glowing core. The amber ring around it fills as
 * sessions get done. Other goals orbit on tilted paths: active and next goals close in,
 * later goals further out.
 */
export default function OrbitScene({ progress, moons, accent }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const key = JSON.stringify({ progress: Math.round(progress * 1000), moons, accent });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // No WebGL: the countdown still renders on its own.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.2, 7.2);
    camera.lookAt(0, 0, 0);

    const accentColor = new THREE.Color(accent);
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T) => {
      disposables.push(x);
      return x;
    };

    // Star dust
    const starCount = 500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 12 + Math.random() * 18;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(p) * Math.cos(t);
      starPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      starPos[i * 3 + 2] = r * Math.cos(p);
    }
    const starGeo = track(new THREE.BufferGeometry());
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      track(new THREE.PointsMaterial({ color: 0x9fb3d9, size: 0.05, transparent: true, opacity: 0.7 })),
    );
    scene.add(stars);

    // Core: the focus goal
    const core = new THREE.Group();
    const coreMesh = new THREE.Mesh(
      track(new THREE.IcosahedronGeometry(0.62, 1)),
      track(new THREE.MeshBasicMaterial({ color: accentColor, wireframe: true, transparent: true, opacity: 0.9 })),
    );
    const glow = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.42, 32, 32)),
      track(new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.35 })),
    );
    core.add(coreMesh, glow);
    scene.add(core);

    // Progress ring: faint full track plus a bright arc for what is done
    const ringGroup = new THREE.Group();
    ringGroup.rotation.x = Math.PI / 2.35;
    const trackRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.35, 0.018, 8, 160)),
      track(new THREE.MeshBasicMaterial({ color: 0x40507a, transparent: true, opacity: 0.6 })),
    );
    ringGroup.add(trackRing);
    const arc = Math.max(0.0001, Math.min(1, progress)) * Math.PI * 2;
    const progressRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.35, 0.05, 12, 200, arc)),
      track(new THREE.MeshBasicMaterial({ color: accentColor })),
    );
    progressRing.rotation.z = Math.PI / 2;
    ringGroup.add(progressRing);
    scene.add(ringGroup);

    // Moons: the other goals
    const moonObjs: { pivot: THREE.Object3D; speed: number }[] = [];
    moons.forEach((m, i) => {
      const near = m.status === 'active' || m.status === 'next';
      const radius = near ? 2.1 + i * 0.12 : 2.7 + (i % 4) * 0.32;
      const tilt = new THREE.Group();
      tilt.rotation.x = Math.PI / 2.35 + (i % 2 ? 0.18 : -0.12);
      tilt.rotation.z = (i * 0.37) % 0.9;
      const path = new THREE.Mesh(
        track(new THREE.TorusGeometry(radius, 0.006, 6, 180)),
        track(new THREE.MeshBasicMaterial({ color: 0x40507a, transparent: true, opacity: near ? 0.55 : 0.25 })),
      );
      tilt.add(path);
      const pivot = new THREE.Object3D();
      pivot.rotation.z = (i / Math.max(1, moons.length)) * Math.PI * 2;
      const moon = new THREE.Mesh(
        track(new THREE.SphereGeometry(near ? 0.13 : 0.09, 20, 20)),
        track(new THREE.MeshBasicMaterial({ color: new THREE.Color(m.color), transparent: true, opacity: near ? 1 : 0.65 })),
      );
      moon.position.x = radius;
      pivot.add(moon);
      tilt.add(pivot);
      scene.add(tilt);
      moonObjs.push({ pivot, speed: (near ? 0.35 : 0.14) / (1 + i * 0.08) });
    });

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.position.z = w < 480 ? 6.2 : 7.2;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;

    const frame = () => {
      const t = clock.getElapsedTime();
      coreMesh.rotation.y = t * 0.25;
      coreMesh.rotation.x = t * 0.12;
      glow.scale.setScalar(1 + Math.sin(t * 1.6) * 0.06);
      stars.rotation.y = t * 0.01;
      moonObjs.forEach((m) => (m.pivot.rotation.z += m.speed * 0.01));
      renderer.render(scene, camera);
      if (running && !reduced) raf = requestAnimationFrame(frame);
    };
    frame();

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        clock.getDelta();
        frame();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={mountRef} className="orbit" aria-hidden="true" />;
}
