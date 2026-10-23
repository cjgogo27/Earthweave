"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useI18n } from "../../lib/i18n";

type GlobePoint = { id: string; title: string; lat: number; lng: number };
type GlobeProps = {
  scenes: GlobePoint[];
  selectedId: string;
  onSelect: (id: string) => void;
  focus?: { lat: number; lng: number };
};

function position(lat: number, lng: number, radius: number) {
  const p = THREE.MathUtils.degToRad(lat);
  const l = THREE.MathUtils.degToRad(lng);
  return new THREE.Vector3(radius * Math.cos(p) * Math.cos(l), radius * Math.sin(p), -radius * Math.cos(p) * Math.sin(l));
}

export default function Globe({ scenes, selectedId, onSelect, focus }: GlobeProps) {
  const { t } = useI18n();
  const canvasLabel = t("交互式地球。拖动旋转，滚轮缩放，点击光点选择地点。也可以使用地点列表。", "Interactive globe. Drag to rotate, scroll to zoom, and select a glowing point. You can also use the place list.");
  const host = useRef<HTMLDivElement>(null);
  const points = useRef(scenes);
  const selected = useRef(selectedId);
  const select = useRef(onSelect);
  const runtime = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; pins: THREE.Group; target: THREE.Vector3 | null } | null>(null);
  const [notice, setNotice] = useState<[string, string] | null>(null);
  points.current = scenes;
  selected.current = selectedId;
  select.current = onSelect;

  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setNotice(["当前设备暂不支持 3D 地球。仍可从地点列表进入体验。", "This device cannot display the 3D globe. You can still explore places from the list."]); return; }
    let disposed = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.copy(position(25, 108, 5.6));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x080e11, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;outline:none";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 2.65;
    controls.maxDistance = 8;
    controls.rotateSpeed = 0.5;
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.12;
    scene.add(new THREE.AmbientLight(0xa6cbd0, 1.25));
    const light = new THREE.DirectionalLight(0xd5ffef, 2.3);
    light.position.set(-3, 4, -4);
    scene.add(light);
    const rim = new THREE.DirectionalLight(0x14746b, 1.2);
    rim.position.set(4, -1, 4);
    scene.add(rim);

    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x749b98, shininess: 8, specular: 0x123638 });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1.6, 96, 64), earthMaterial);
    scene.add(earth);
    const texture = new THREE.TextureLoader().load("/earth.jpg", loaded => {
      if (disposed) { loaded.dispose(); return; }
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      earthMaterial.map = loaded;
      earthMaterial.color.set(0xb7d1c9);
      earthMaterial.needsUpdate = true;
    }, undefined, () => { if (!disposed) setNotice(["地球底图加载失败；地理坐标和地点浏览仍可使用。", "The Earth texture could not load. Coordinates and place browsing are still available."]); });

    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.64, 64, 48), new THREE.ShaderMaterial({
      vertexShader: "varying vec3 vNormal; varying vec3 vView; void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}",
      fragmentShader: "varying vec3 vNormal; varying vec3 vView; void main(){float a=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.5);gl_FragColor=vec4(.13,.63,.53,a*.42);}",
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(atmosphere);

    // Thin parallels and meridians make the atlas legible even without imagery.
    const grid = new THREE.Group();
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x6a968e, transparent: true, opacity: 0.13 });
    for (let lat = -60; lat <= 60; lat += 30) {
      const vertices = Array.from({ length: 145 }, (_, i) => position(lat, i * 2.5 - 180, 1.607));
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(vertices), gridMaterial));
    }
    for (let lng = 0; lng < 180; lng += 30) {
      const vertices = Array.from({ length: 145 }, (_, i) => {
        const angle = i * Math.PI / 72;
        const a = THREE.MathUtils.degToRad(lng);
        return new THREE.Vector3(Math.cos(angle) * Math.cos(a), Math.sin(angle), -Math.cos(angle) * Math.sin(a)).multiplyScalar(1.607);
      });
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(vertices), gridMaterial));
    }
    scene.add(grid);

    const starPositions = new Float32Array(360 * 3);
    let seed = 514;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 360; i++) {
      const p = position(random() * 180 - 90, random() * 360 - 180, 18 + random() * 20);
      starPositions.set(p.toArray(), i * 3);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x88b5ac, size: 0.025, transparent: true, opacity: 0.5 }));
    scene.add(stars);
    const pins = new THREE.Group();
    scene.add(pins);
    runtime.current = { camera, controls, pins, target: null };

    const raycaster = new THREE.Raycaster();
    let down = { x: 0, y: 0 };
    const pointerDown = (event: PointerEvent) => { down = { x: event.clientX, y: event.clientY }; controls.autoRotate = false; if (runtime.current) runtime.current.target = null; };
    const pointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hits = raycaster.intersectObjects([...pins.children, earth], true);
      const first = hits[0];
      if (first?.object.userData.sceneId) select.current(first.object.userData.sceneId);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    renderer.setAnimationLoop(() => {
      const current = runtime.current;
      if (current?.target) {
        camera.position.lerp(current.target, 0.06);
        if (camera.position.distanceTo(current.target) < 0.005) current.target = null;
      }
      pins.children.forEach(pin => {
        const active = pin.userData.sceneId === selected.current;
        pin.scale.setScalar(active ? 1.6 : 1);
        const material = (pin as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (material?.color) material.color.set(active ? 0xf2e8a8 : 0x78ffba);
      });
      controls.update();
      renderer.render(scene, camera);
    });
    return () => {
      disposed = true;
      runtime.current = null;
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      controls.dispose();
      texture.dispose();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const current = runtime.current;
    if (!current) return;
    current.pins.children.slice().forEach(object => {
      current.pins.remove(object);
      const mesh = object as THREE.Mesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    scenes.forEach(point => {
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.027, 14, 10), new THREE.MeshBasicMaterial({ color: 0x78ffba }));
      pin.position.copy(position(point.lat, point.lng, 1.632));
      pin.userData.sceneId = point.id;
      current.pins.add(pin);
    });
  }, [scenes]);

  useEffect(() => {
    if (focus && runtime.current) {
      runtime.current.controls.autoRotate = false;
      runtime.current.target = position(focus.lat, focus.lng, runtime.current.camera.position.length());
    }
  }, [focus?.lat, focus?.lng]);

  // Update accessibility text without rebuilding the WebGL scene.
  useEffect(() => { host.current?.querySelector("canvas")?.setAttribute("aria-label", canvasLabel); }, [canvasLabel]);

  return <div ref={host} style={{ width: "100%", height: "100%", position: "relative", minHeight: 260 }}>
    {notice && <div role="status" style={{ position: "absolute", zIndex: 2, bottom: 70, left: "10%", right: "10%", color: "#a9bdb5", textAlign: "center", fontSize: 12, background: "#0b1618cc", padding: 12, borderRadius: 8 }}>{t(notice[0], notice[1])}</div>}
  </div>;
}
