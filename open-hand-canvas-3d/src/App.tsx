import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Hands, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import * as THREE from 'three';
import './App.css';

interface Landmark { x: number; y: number; z: number; }

interface Sparkle {
  x: number;
  y: number;
  createdAt: number;
}

const FINGER_CONNECTIONS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]];
const getLandmarkCoord = (lm: Landmark, w: number, h: number) => ({ x: (1 - lm.x) * w, y: lm.y * h });
const getFingerTips = (lms: Landmark[], w: number, h: number) => [getLandmarkCoord(lms[4], w, h), getLandmarkCoord(lms[8], w, h), getLandmarkCoord(lms[12], w, h), getLandmarkCoord(lms[16], w, h), getLandmarkCoord(lms[20], w, h)];

// ─── Three.js Blob ───────────────────────────────
function ThreeDBob({ blobRef }: {
  blobRef: React.RefObject<{
    visible: boolean;
    x: number;
    y: number;
    size: number;
    rotation?: number;
  }>
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, W, 0, H, 0.1, 1000);
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const vertexShader = `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uFrequency;
      uniform float uAmplitude;
      
      varying float vElevation;
      varying vec3 vStaticPos;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        vStaticPos = position;
        
        float noise = snoise(vec3(position * uFrequency + uTime * 0.23));
        float displacement = noise * uAmplitude;
        vElevation = displacement;
        
        vec3 newPosition = position + (normal * displacement);
        
        vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectedPosition = projectionMatrix * viewPosition;

        gl_Position = projectedPosition;
        gl_PointSize = 3.0 * uPixelRatio * (1.0 / -viewPosition.z);
      }
    `;

    const fragmentShader = `
      uniform vec3 uColor1Base;
      uniform vec3 uColor1Light;
      uniform vec3 uColor2Base;
      uniform vec3 uColor2Light;
      uniform vec3 uColor3Base;
      uniform vec3 uColor3Light;
      uniform vec3 uColor4Base;
      uniform vec3 uColor4Light;
      
      varying float vElevation;
      varying vec3 vStaticPos;

      void main() {
        float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
        if(distanceToCenter > 0.5) discard;

        vec3 nPos = normalize(vStaticPos);

        vec3 cNavy = mix(uColor1Base, uColor1Light, clamp(nPos.z * 0.5 + 0.5, 0.0, 1.0));
        vec3 cOrange = mix(uColor2Base, uColor2Light, clamp(nPos.y * 0.5 + 0.5, 0.0, 1.0));
        vec3 cPurple = uColor3Base;
        vec3 cTeal = mix(uColor4Base, uColor4Light, clamp(nPos.y * 0.5 + 0.5, 0.0, 1.0));

        vec3 finalColor = cNavy;

        float blendStart = 0.1;
        float blendWidth = 0.5;

        float eastFactor = smoothstep(blendStart, blendStart + blendWidth, nPos.x);
        finalColor = mix(finalColor, cOrange, eastFactor);

        float westFactor = smoothstep(blendStart, blendStart + blendWidth, -nPos.x);
        finalColor = mix(finalColor, cTeal, westFactor);

        float northFactor = smoothstep(blendStart, blendStart + blendWidth, nPos.y);
        finalColor = mix(finalColor, cPurple, northFactor);

        float sparkle = smoothstep(0.0, 0.05, vElevation);
        finalColor += sparkle * 0.1;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const color1Base = new THREE.Color("#114a81");
    const color1Light = new THREE.Color("#4169D4");
    const color2Base = new THREE.Color("#d0651c");
    const color2Light = new THREE.Color("#FFC201");
    const color3Base = new THREE.Color("#86469d");
    const color3Light = new THREE.Color("#a855f7");
    const color4Base = new THREE.Color("#12737c");
    const color4Light = new THREE.Color("#74E5D6");

    const geometry = new THREE.SphereGeometry(1, 160, 160);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uColor1Base: { value: color1Base },
        uColor1Light: { value: color1Light },
        uColor2Base: { value: color2Base },
        uColor2Light: { value: color2Light },
        uColor3Base: { value: color3Base },
        uColor3Light: { value: color3Light },
        uColor4Base: { value: color4Base },
        uColor4Light: { value: color4Light },
        uFrequency: { value: 2.2 },
        uAmplitude: { value: 0.05 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const particles = new THREE.Points(geometry, material);
    particles.visible = false;
    scene.add(particles);

    let alive = true;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!alive) return;
      requestAnimationFrame(animate);

      const ref = blobRef.current;
      if (!ref) {
        particles.visible = false;
        renderer.render(scene, camera);
        return;
      }

      particles.visible = ref.visible;

      if (ref.visible) {
        const elapsed = clock.getElapsedTime();
        material.uniforms.uTime.value = elapsed;

        particles.position.set(ref.x, ref.y, 0);

        const baseScale = ref.size * 0.5;
        particles.scale.setScalar(baseScale);

        particles.rotation.y = elapsed * 0.1;
        particles.rotation.x = Math.sin(elapsed * 0.1) * 0.1 + 0.2;
      }

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      camera.right = nw;
      camera.bottom = nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      alive = false;
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [blobRef]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  );
}

// ─── Main App ──────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const [started, setStarted] = useState(false);
  const [connections, setConnections] = useState(0);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const landmarksRef = useRef<Landmark[][] | null>(null);
  const rafId = useRef(0);
  const running = useRef(false);
  const connectedFingers = useRef<number[]>([]);
  const lastHand2Tips = useRef<{ x: number; y: number }[]>([]);
  const sparklesRef = useRef<Sparkle[]>([]);
  const lastTouchedFingers = useRef<Set<string>>(new Set());

  // Blob state communicated to ThreeDBob via ref (no React re-renders!)
  const blobRef = useRef({ visible: false, x: 0, y: 0, size: 10 });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      running.current = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (cameraRef.current) try { cameraRef.current.stop(); } catch { /* noop */ }
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main 2D canvas loop
  useEffect(() => {
    if (!started) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    console.log('Canvas setup - canvas:', !!canvas, 'ctx:', !!ctx);

    if (!canvas || !ctx) {
      console.error('Canvas or context not available');
      return;
    }

    running.current = true;

    const loop = () => {
      if (!running.current) return;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const lms = landmarksRef.current;

      // Draw hand skeletons
      if (lms && lms.length > 0) {
        for (let hi = 0; hi < lms.length; hi++) {
          const handLms = lms[hi];
          FINGER_CONNECTIONS.forEach(([a, b]) => {
            const p1 = getLandmarkCoord(handLms[a], canvas.width, canvas.height);
            const p2 = getLandmarkCoord(handLms[b], canvas.width, canvas.height);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#0066ff';
            ctx.lineWidth = 4;
            ctx.stroke();
          });
          handLms.forEach((lm) => {
            const p = getLandmarkCoord(lm, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff00';
            ctx.fill();
          });
        }
      }

      const now = Date.now();

      // Detect finger-to-finger touch within same hand
      if (lms) {
        for (let hi = 0; hi < lms.length; hi++) {
          const tips = getFingerTips(lms[hi], canvas.width, canvas.height);

          // Check all pairs of different fingers on the same hand
          for (let i = 0; i < 5; i++) {
            for (let j = i + 1; j < 5; j++) {
              const dx = tips[i].x - tips[j].x;
              const dy = tips[i].y - tips[j].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const threshold = 60;

              const touchKey = `hand${hi}-finger${i}-finger${j}`;
              if (dist < threshold) {
                if (!lastTouchedFingers.current.has(touchKey)) {
                  lastTouchedFingers.current.add(touchKey);
                  sparklesRef.current.push({
                    x: (tips[i].x + tips[j].x) / 2,
                    y: (tips[i].y + tips[j].y) / 2,
                    createdAt: now,
                  });
                }
              } else {
                lastTouchedFingers.current.delete(touchKey);
              }
            }
          }
        }
      }

      // Detect finger connections between two hands (for blob only, no sparkles)
      if (lms && lms.length === 2) {
        const tips1 = getFingerTips(lms[0], canvas.width, canvas.height);
        const tips2 = getFingerTips(lms[1], canvas.width, canvas.height);
        lastHand2Tips.current = tips2;
        const threshold = 80;

        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 5; j++) {
            const dx = tips1[i].x - tips2[j].x;
            const dy = tips1[i].y - tips2[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const touchKey = `hand1-finger${i}-hand2-finger${j}`;
            if (dist < threshold) {
              if (!lastTouchedFingers.current.has(touchKey)) {
                lastTouchedFingers.current.add(touchKey);
              }
              if (!connectedFingers.current.includes(i)) {
                connectedFingers.current.push(i);
                setConnections(connectedFingers.current.length);
              }
            } else {
              lastTouchedFingers.current.delete(touchKey);
            }
          }
        }
      } else {
        lastTouchedFingers.current.clear();
      }

      // Clean up old sparkles (older than 2 seconds)
      sparklesRef.current = sparklesRef.current.filter(s => now - s.createdAt < 2000);

      // Draw sparkles
      for (const sparkle of sparklesRef.current) {
        const age = now - sparkle.createdAt;
        const alpha = 1 - (age / 2000);
        const size = 3 + Math.sin(age * 0.01) * 2;

        ctx.beginPath();
        ctx.arc(sparkle.x, sparkle.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.fill();

        // Add glow effect
        ctx.beginPath();
        ctx.arc(sparkle.x, sparkle.y, size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.3})`;
        ctx.fill();
      }

      // Draw web lines & compute blob
      const connected = connectedFingers.current;
      if (connected.length > 0 && lms && lms.length >= 1) {
        const tips1 = getFingerTips(lms[0], canvas.width, canvas.height);
        const tips2 = lastHand2Tips.current;

        // Draw connection lines
        for (const idx of connected) {
          if (!tips1[idx] || !tips2[idx]) continue;
          const p1 = tips1[idx];
          const p2 = tips2[idx];

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = '#00ffdf';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#00ffdf';
          ctx.shadowBlur = 10;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Blob appears when all 5 connected
        if (connected.length === 5 && tips1.length === 5 && tips2.length === 5) {
          let tx = 0, ty = 0, maxDist = 0;
          for (let i = 0; i < 5; i++) {
            const dx = tips1[i].x - tips2[i].x;
            const dy = tips1[i].y - tips2[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            maxDist = Math.max(maxDist, dist);
            tx += (tips1[i].x + tips2[i].x) / 2;
            ty += (tips1[i].y + tips2[i].y) / 2;
          }

          // Update blob ref directly — no setState, no re-render
          blobRef.current.visible = true;
          blobRef.current.x = tx / 5;
          blobRef.current.y = ty / 5;
          blobRef.current.size = 15 + maxDist * 0.15;
        } else {
          blobRef.current.visible = false;
        }
      } else {
        blobRef.current.visible = false;
      }

      rafId.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      running.current = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [started]);

  // MediaPipe + Camera
  useEffect(() => {
    if (!started) return;

    const setup = async () => {
      console.log('Setting up MediaPipe...');
      const hands = new Hands({
        locateFile: (f) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${f}`,
      });
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      hands.onResults((r: Results) => {
        landmarksRef.current = r.multiHandLandmarks ?? null;
      });
      handsRef.current = hands;

      let attempts = 0;
      while (!webcamRef.current?.video && attempts < 50) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }
      const vid = webcamRef.current?.video;
      if (!vid) {
        console.error('Video not available');
        return;
      }
      console.log('Video available, starting camera...');

      const cam = new Camera(vid, {
        onFrame: async () => {
          if (handsRef.current && vid.readyState === 4) {
            try {
              await handsRef.current.send({ image: vid });
            } catch { /* ignore */ }
          }
        },
        width: 640,
        height: 480,
      });
      await cam.start();
      cameraRef.current = cam;
      console.log('Camera started!');
    };

    setup();
    return () => {
      if (cameraRef.current) try { cameraRef.current.stop(); } catch { /* noop */ }
    };
  }, [started]);

  const handleStart = () => {
    connectedFingers.current = [];
    lastHand2Tips.current = [];
    blobRef.current = { visible: false, x: 0, y: 0, size: 20 };
    sparklesRef.current = [];
    lastTouchedFingers.current = new Set();
    setConnections(0);
    setStarted(true);
  };

  return (
    <div className="app">
      {!started && (
        <div className="start-screen">
          <div className="logo-container">
            <img src="/logo.png" alt="Open Hand Canvas" className="logo-img" />
          </div>
          <p>Connect your fingers between two hands to create a 3D blob!</p>
          <button className="start-btn" onClick={handleStart}>START</button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={dimensions.width}
        height={dimensions.height}
      />

      {/* Three.js golden blob — always mounted, reads from blobRef every frame */}
      {started && <ThreeDBob blobRef={blobRef} />}

      {started && (
        <div className="camera-preview">
          <Webcam
            ref={webcamRef}
            mirrored
            width={200}
            height={150}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onUserMedia={() => console.log('Webcam access granted')}
            onUserMediaError={(err) => console.error('Webcam error:', err)}
          />
        </div>
      )}

      <div className="score">Connections: {connections}/5</div>
      <div className="instructions">
        {connections === 5
          ? 'All connected! Pull apart to see 3D blob!'
          : 'Connect all 5 fingers between both hands!'}
      </div>
    </div>
  );
}
