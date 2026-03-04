// 3D Blob using Three.js - can be easily removed if not needed
// To disable: Remove ThreeBlob component from App.tsx

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeBlobProps {
  position: { x: number; y: number };
  size: number;
  visible: boolean;
}

export function useThreeBlob({ position, size, visible }: ThreeBlobProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 50;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(150, 150);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Main sphere with custom shader
    const geometry = new THREE.IcosahedronGeometry(20, 2);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      emissive: 0xffaa00,
      specular: 0xffffff,
      shininess: 100,
      transparent: true,
      opacity: 0.8,
      wireframe: false,
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;

    // Particle ring
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 25 + Math.random() * 10;
      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(theta);
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffff00,
      size: 2,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffaa00, 1, 100);
    pointLight.position.set(10, 10, 50);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x00ffff, 0.5, 100);
    pointLight2.position.set(-10, -10, 30);
    scene.add(pointLight2);

    // Animation loop
    let rotation = 0;
    const animate = () => {
      if (!sphereRef.current || !particlesRef.current) return;
      
      rotation += 0.02;
      sphereRef.current.rotation.x = rotation;
      sphereRef.current.rotation.y = rotation * 0.7;
      sphereRef.current.rotation.z = rotation * 0.3;
      
      particlesRef.current.rotation.x = rotation * 0.5;
      particlesRef.current.rotation.y = rotation * 0.8;

      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update visibility and scale
  useEffect(() => {
    if (sphereRef.current) {
      sphereRef.current.visible = visible;
      const scale = size / 40;
      sphereRef.current.scale.set(scale, scale, scale);
    }
    if (particlesRef.current) {
      particlesRef.current.visible = visible;
      const scale = size / 40;
      particlesRef.current.scale.set(scale, scale, scale);
    }
  }, [visible, size]);

  // Update position
  useEffect(() => {
    if (cameraRef.current && visible) {
      // Convert 2D position to 3D - approximate
      const x = (position.x / window.innerWidth) * 2 - 1;
      const y = -(position.y / window.innerHeight) * 2 + 1;
      cameraRef.current.position.x = x * 30;
      cameraRef.current.position.y = y * 30;
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, [position, visible]);

  return { containerRef };
}
