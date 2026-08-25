"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { StaticImageData } from "next/image";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import earthDay from "./assets/earth-day-4k.jpg";
import earthNight from "./assets/earth-night-4k.jpg";
import earthNormal from "./assets/earth-normal-2k.jpg";
import earthCloudData from "./assets/earth-surface-4k.jpg";
import styles from "./RealisticEarth.module.css";

export type EarthQuality = "auto" | "low" | "high";
type ResolvedEarthQuality = Exclude<EarthQuality, "auto">;

interface QualityProfile {
  antialias: boolean;
  detailSegments: number;
  maxAnisotropy: number;
  maxPixelRatio: number;
  starCount: number;
  surfaceSegments: number;
}

export interface EarthVisualState {
  atmosphereProgress: number;
  cutawayProgress: number;
  daylightProgress: number;
  renderVisibility: number;
}

export interface RealisticEarthProps {
  className?: string;
  quality?: EarthQuality;
  autoRotate?: boolean;
  rotationSpeed?: number;
  enableControls?: boolean;
  enableZoom?: boolean;
  showStars?: boolean;
  focusLongitude?: number;
  sunDirection?: readonly [x: number, y: number, z: number];
  visualStateRef?: RefObject<EarthVisualState>;
}

const DEFAULT_SUN_DIRECTION = [0.8, 1.2, 5] as const;
const CAMERA_FIELD_OF_VIEW = 32;
const DEFAULT_CAMERA_DISTANCE = 4.6;
const ATMOSPHERE_CAMERA_DISTANCE = 9.4;
export const ATMOSPHERE_VIEW_RADIUS =
  ATMOSPHERE_CAMERA_DISTANCE *
  Math.tan(THREE.MathUtils.degToRad(CAMERA_FIELD_OF_VIEW / 2));
export const ATMOSPHERE_SHELLS = {
  troposphere: { radius: 1.08, color: "#56d7ff", density: 0.28 },
  stratosphere: { radius: 1.34, color: "#7595ff", density: 0.18 },
  mesosphere: { radius: 1.64, color: "#bc7cff", density: 0.12 },
  thermosphere: { radius: 2, color: "#ff8e72", density: 0.075 },
  exosphere: { radius: 2.4, color: "#ffd36a", density: 0.042 },
} as const;
const QUALITY_PROFILES: Record<ResolvedEarthQuality, QualityProfile> = {
  low: {
    antialias: false,
    detailSegments: 40,
    maxAnisotropy: 4,
    maxPixelRatio: 1.2,
    starCount: 700,
    surfaceSegments: 64,
  },
  high: {
    antialias: true,
    detailSegments: 72,
    maxAnisotropy: 8,
    maxPixelRatio: 1.75,
    starCount: 1500,
    surfaceSegments: 128,
  },
};

const assetUrl = (asset: StaticImageData | string) =>
  typeof asset === "string" ? asset : asset.src;

function seededRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createStars(count: number) {
  const random = seededRandom(20260825);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const radius = 8 + random() * 12;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const positionIndex = index * 3;
    const warmth = 0.72 + random() * 0.28;

    positions[positionIndex] = radius * Math.sin(phi) * Math.cos(theta);
    positions[positionIndex + 1] = radius * Math.cos(phi);
    positions[positionIndex + 2] = radius * Math.sin(phi) * Math.sin(theta);
    colors[positionIndex] = 0.72 + warmth * 0.28;
    colors[positionIndex + 1] = 0.78 + warmth * 0.2;
    colors[positionIndex + 2] = 1;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.018,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.82,
    vertexColors: true,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

function createNightMaterial(texture: THREE.Texture, sunDirection: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uNightMap: { value: texture },
      uSunDirection: { value: sunDirection },
      uDaylight: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uNightMap;
      uniform vec3 uSunDirection;
      uniform float uDaylight;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vec3 nightColor = texture2D(uNightMap, vUv).rgb;
        float lightLevel = max(max(nightColor.r, nightColor.g), nightColor.b);
        float cityMask = smoothstep(0.08, 0.78, lightLevel);
        float nightSide = smoothstep(0.16, -0.22, dot(
          normalize(vWorldNormal),
          normalize(uSunDirection)
        ));
        float alpha = cityMask * nightSide * 0.9
          * (1.0 - uDaylight) * uOpacity;

        gl_FragColor = vec4(nightColor * nightSide * 1.9, alpha);
      }
    `,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    toneMapped: false,
  });
}

function createCloudMaterial(texture: THREE.Texture, sunDirection: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCloudDataMap: { value: texture },
      uSunDirection: { value: sunDirection },
      uDaylight: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uCloudDataMap;
      uniform vec3 uSunDirection;
      uniform float uDaylight;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        float cloudData = texture2D(uCloudDataMap, vUv).b;
        float cloudMask = smoothstep(0.22, 0.72, cloudData);
        float sunlight = mix(
          smoothstep(-0.32, 0.65, dot(
            normalize(vWorldNormal),
            normalize(uSunDirection)
          )),
          1.0,
          uDaylight
        );
        vec3 cloudColor = mix(
          vec3(0.16, 0.2, 0.28),
          vec3(1.0, 0.98, 0.94),
          sunlight
        );

        gl_FragColor = vec4(
          cloudColor,
          cloudMask * mix(0.18, 0.72, sunlight) * uOpacity
        );
      }
    `,
    depthWrite: false,
    transparent: true,
  });
}

function createAtmosphereMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uAtmosphereColor: { value: new THREE.Color("#4ca6ff") },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;

      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uAtmosphereColor;
      uniform float uOpacity;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;

      void main() {
        float fresnel = pow(
          1.0 - max(dot(normalize(vViewNormal), normalize(vViewDirection)), 0.0),
          2.7
        );
        gl_FragColor = vec4(uAtmosphereColor, fresnel * 0.72 * uOpacity);
      }
    `,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
    transparent: true,
    toneMapped: false,
  });
}

function createAtmosphereShellMaterial(color: string, density: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uDensity: { value: density },
      uProgress: { value: 0 },
    },
    vertexShader: `
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;

      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uDensity;
      uniform float uProgress;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;

      void main() {
        float facing = max(dot(normalize(vViewNormal), normalize(vViewDirection)), 0.0);
        float rim = pow(1.0 - facing, 2.15);
        float alpha = uDensity * uProgress * (rim * 1.15 + facing * 0.045);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    blending: THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    transparent: true,
    toneMapped: false,
  });
}

export default function RealisticEarth({
  className,
  quality = "auto",
  autoRotate = true,
  rotationSpeed = 0.055,
  enableControls = true,
  enableZoom = true,
  showStars = true,
  focusLongitude = 78,
  sunDirection: sunDirectionProp = DEFAULT_SUN_DIRECTION,
  visualStateRef,
}: RealisticEarthProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [sunX, sunY, sunZ] = sunDirectionProp;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;
    let isVisible = true;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isSmallScreen = window.matchMedia("(max-width: 767px)").matches;
    const resolvedQuality: ResolvedEarthQuality =
      quality === "auto" ? (isSmallScreen ? "low" : "high") : quality;
    const qualityProfile = QUALITY_PROFILES[resolvedQuality];

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CAMERA_FIELD_OF_VIEW,
      1,
      0.1,
      50,
    );
    camera.position.set(0, 0.04, DEFAULT_CAMERA_DISTANCE);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: qualityProfile.antialias,
        powerPreference: "high-performance",
      });
    } catch {
      const errorUpdateId = window.setTimeout(() => {
        setIsLoading(false);
        setHasError(true);
      }, 0);
      return () => window.clearTimeout(errorUpdateId);
    }
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, qualityProfile.maxPixelRatio),
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.enableZoom = enableControls && enableZoom;
    controls.enableRotate = enableControls;
    controls.minDistance = 2.2;
    controls.maxDistance = 14;
    controls.target.set(0, 0, 0);
    let userCameraDistance = camera.position.distanceTo(controls.target);

    const earthSystem = new THREE.Group();
    earthSystem.rotation.y = THREE.MathUtils.degToRad(
      -90 - focusLongitude,
    );
    earthSystem.rotation.z = THREE.MathUtils.degToRad(-23.4);
    scene.add(earthSystem);

    const sunDirection = new THREE.Vector3(sunX, sunY, sunZ).normalize();
    const sunlight = new THREE.DirectionalLight("#fff4df", 4.2);
    sunlight.position.copy(sunDirection).multiplyScalar(6);
    scene.add(sunlight);
    const fillLight = new THREE.HemisphereLight("#6b91c8", "#02030a", 0.24);
    scene.add(fillLight);
    const dayFill = new THREE.AmbientLight("#fff4e8", 0);
    scene.add(dayFill);
    const nightSkyColor = new THREE.Color("#6b91c8");
    const nightGroundColor = new THREE.Color("#02030a");
    const daySkyColor = new THREE.Color("#d7e7ff");
    const dayGroundColor = new THREE.Color("#c8b89a");

    const starField = showStars && createStars(qualityProfile.starCount);
    if (starField) scene.add(starField);

    const timer = new THREE.Timer();
    timer.connect(document);
    const textureLoader = new THREE.TextureLoader();
    const textures: THREE.Texture[] = [];
    const meshes: THREE.Mesh[] = [];
    const interiorMaterials: THREE.MeshStandardMaterial[] = [];
    const atmosphereShellMaterials: THREE.ShaderMaterial[] = [];
    const cutawayUniforms: Array<{
      maxWedge: number;
      uniform: { value: number };
    }> = [];
    const cutawayCaps: Array<{
      edgeDirection: -1 | 1;
      maxWedge: number;
      mesh: THREE.Mesh;
    }> = [];
    let cloudLayer: THREE.Mesh | undefined;
    let earthSurfaceMesh: THREE.Mesh | undefined;
    let dayMaterial: THREE.MeshStandardMaterial | undefined;
    let nightMaterial: THREE.ShaderMaterial | undefined;
    let cloudMaterial: THREE.ShaderMaterial | undefined;
    let atmosphereMaterial: THREE.ShaderMaterial | undefined;

    const storyLayersEnabled = visualStateRef !== undefined;
    const interiorGroup = new THREE.Group();
    interiorGroup.rotation.copy(earthSystem.rotation);
    interiorGroup.visible = false;
    const atmosphereShellGroup = new THREE.Group();
    atmosphereShellGroup.visible = false;
    if (storyLayersEnabled) {
      scene.add(interiorGroup);
      earthSystem.add(atmosphereShellGroup);
    }

    let crustMaterial: THREE.MeshStandardMaterial | undefined;

    const addAnimatedCutaway = (
      material: THREE.MeshStandardMaterial,
      maxWedge: number,
    ) => {
      if (maxWedge <= 0) return;

      const cutawayAngle = { value: 0 };
      cutawayUniforms.push({ maxWedge, uniform: cutawayAngle });
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uCutawayAngle = cutawayAngle;
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            `#include <common>
            varying vec3 vCutawayPosition;`,
          )
          .replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            vCutawayPosition = position;`,
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
            uniform float uCutawayAngle;
            varying vec3 vCutawayPosition;`,
          )
          .replace(
            "void main() {",
            `void main() {
            float longitude = atan(
              vCutawayPosition.z,
              -vCutawayPosition.x
            );
            float cutawayDelta = atan(
              sin(longitude - 1.57079632679),
              cos(longitude - 1.57079632679)
            );
            if (abs(cutawayDelta) < uCutawayAngle * 0.5) discard;`,
          );
      };
      material.customProgramCacheKey = () => `earth-cutaway-${maxWedge}`;
    };

    if (storyLayersEnabled) {
      const interiorLayers = [
        {
          radius: 1,
          wedge: THREE.MathUtils.degToRad(270),
          color: "#ffffff",
          emissive: "#1a140c",
          isCrust: true,
        },
        {
          radius: 0.91,
          wedge: THREE.MathUtils.degToRad(210),
          color: "#c84f35",
          emissive: "#351008",
        },
        {
          radius: 0.56,
          wedge: THREE.MathUtils.degToRad(145),
          color: "#ff9838",
          emissive: "#5b2004",
        },
        {
          radius: 0.27,
          wedge: 0,
          color: "#ffe8a3",
          emissive: "#8a4914",
        },
      ];

      interiorLayers.forEach((layer, index) => {
        const geometry = new THREE.SphereGeometry(
          layer.radius,
          qualityProfile.detailSegments,
          qualityProfile.detailSegments,
        );
        const material = new THREE.MeshStandardMaterial({
          color: layer.color,
          emissive: layer.emissive,
          emissiveIntensity: layer.isCrust ? 0 : 0.28,
          metalness: index > 1 ? 0.28 : 0.06,
          opacity: 0,
          roughness: layer.isCrust ? 0.76 : index > 1 ? 0.48 : 0.78,
          side: THREE.DoubleSide,
          transparent: true,
        });
        addAnimatedCutaway(material, layer.wedge);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = index;
        interiorGroup.add(mesh);
        interiorMaterials.push(material);
        meshes.push(mesh);
        if (layer.isCrust) crustMaterial = material;
      });

      const crossSections = [
        {
          inner: 0.91,
          outer: 1,
          wedge: interiorLayers[0].wedge,
          color: "#557d72",
          emissive: "#0d1b18",
        },
        {
          inner: 0.56,
          outer: 0.91,
          wedge: interiorLayers[1].wedge,
          color: "#d65a38",
          emissive: "#3d1007",
        },
        {
          inner: 0.27,
          outer: 0.56,
          wedge: interiorLayers[2].wedge,
          color: "#ff9e3d",
          emissive: "#5d2205",
        },
      ];

      crossSections.forEach((section, sectionIndex) => {
        ([-1, 1] as const).forEach((edgeDirection) => {
          const geometry = new THREE.RingGeometry(
            section.inner,
            section.outer,
            qualityProfile.detailSegments,
            1,
            -Math.PI / 2,
            Math.PI,
          );
          const material = new THREE.MeshStandardMaterial({
            color: section.color,
            emissive: section.emissive,
            emissiveIntensity: 0.32,
            metalness: sectionIndex > 1 ? 0.2 : 0.03,
            opacity: 0,
            roughness: sectionIndex > 1 ? 0.48 : 0.82,
            side: THREE.DoubleSide,
            transparent: true,
          });
          const cap = new THREE.Mesh(geometry, material);
          cap.rotation.y =
            Math.PI +
            Math.PI / 2 +
            edgeDirection * (section.wedge / 2);
          cap.renderOrder = 10 + sectionIndex;
          interiorGroup.add(cap);
          interiorMaterials.push(material);
          meshes.push(cap);
          cutawayCaps.push({
            edgeDirection,
            maxWedge: section.wedge,
            mesh: cap,
          });
        });
      });

      Object.values(ATMOSPHERE_SHELLS).forEach((shell, index) => {
        const geometry = new THREE.SphereGeometry(
          shell.radius,
          qualityProfile.detailSegments,
          qualityProfile.detailSegments,
        );
        const material = createAtmosphereShellMaterial(
          shell.color,
          shell.density,
        );
        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = 20 + index;
        atmosphereShellGroup.add(mesh);
        atmosphereShellMaterials.push(material);
        meshes.push(mesh);
      });
    }

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          timer.reset();
          if (frameId === 0) {
            frameId = window.requestAnimationFrame(render);
          }
        } else if (frameId !== 0) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }
      },
      { threshold: 0.02 },
    );
    visibilityObserver.observe(container);

    const handleDocumentVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
        return;
      }

      timer.reset();
      if (isVisible && frameId === 0) {
        frameId = window.requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", handleDocumentVisibility);

    const render = (timestamp: number) => {
      frameId = 0;
      if (!isVisible || document.hidden) return;
      if ((visualStateRef?.current.renderVisibility ?? 1) <= 0.001) {
        timer.reset();
        frameId = window.requestAnimationFrame(render);
        return;
      }

      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.05);
      const cutawayProgress = THREE.MathUtils.clamp(
        visualStateRef?.current.cutawayProgress ?? 0,
        0,
        1,
      );
      const daylight = THREE.MathUtils.clamp(
        visualStateRef?.current.daylightProgress ?? 0,
        0,
        1,
      );
      const atmosphereProgress = THREE.MathUtils.clamp(
        visualStateRef?.current.atmosphereProgress ?? 0,
        0,
        1,
      );
      const overlayOpacity =
        1 - THREE.MathUtils.smoothstep(cutawayProgress, 0.02, 0.92);
      const layerOpacity = THREE.MathUtils.smoothstep(
        cutawayProgress,
        0.02,
        0.28,
      );

      cutawayUniforms.forEach(({ maxWedge, uniform }) => {
        uniform.value = maxWedge * cutawayProgress;
      });
      cutawayCaps.forEach(({ edgeDirection, maxWedge, mesh }) => {
        mesh.rotation.y =
          Math.PI +
          Math.PI / 2 +
          edgeDirection * ((maxWedge * cutawayProgress) / 2);
      });
      atmosphereShellGroup.visible =
        atmosphereProgress > 0.001 && cutawayProgress < 0.72;
      const shellReveal = THREE.MathUtils.smoothstep(
        atmosphereProgress,
        0.08,
        1,
      );
      atmosphereShellGroup.scale.setScalar(
        THREE.MathUtils.lerp(0.4, 1, shellReveal),
      );
      atmosphereShellMaterials.forEach((material) => {
        material.uniforms.uProgress.value = shellReveal;
      });

      sunlight.intensity = THREE.MathUtils.lerp(4.2, 0.22, daylight);
      fillLight.intensity = THREE.MathUtils.lerp(0.24, 0.55, daylight);
      fillLight.color.copy(daylight > 0.01 ? daySkyColor : nightSkyColor);
      fillLight.groundColor.copy(
        daylight > 0.01 ? dayGroundColor : nightGroundColor,
      );
      dayFill.intensity = THREE.MathUtils.lerp(0, 1.35, daylight);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(1.08, 1.22, daylight);

      if (dayMaterial) {
        const bump = THREE.MathUtils.lerp(0.48, 0.06, daylight);
        dayMaterial.normalScale.set(bump, bump);
        dayMaterial.emissiveIntensity = daylight * 0.22;
      }
      if (crustMaterial) {
        const bump = THREE.MathUtils.lerp(0.48, 0.08, daylight);
        crustMaterial.normalScale.set(bump, bump);
        crustMaterial.emissiveIntensity = daylight * 0.28;
      }
      if (nightMaterial) {
        nightMaterial.uniforms.uDaylight.value = daylight;
        nightMaterial.uniforms.uOpacity.value = overlayOpacity;
      }
      if (cloudMaterial) {
        cloudMaterial.uniforms.uDaylight.value = daylight;
        cloudMaterial.uniforms.uOpacity.value = overlayOpacity;
      }
      if (atmosphereMaterial) {
        atmosphereMaterial.uniforms.uOpacity.value =
          overlayOpacity * (1 - atmosphereProgress);
      }
      if (starField) {
        (starField.material as THREE.PointsMaterial).opacity =
          THREE.MathUtils.lerp(0.82, 0.12, daylight);
      }

      if (earthSurfaceMesh) {
        earthSurfaceMesh.visible = cutawayProgress < 0.001;
      }
      interiorGroup.visible = cutawayProgress > 0.001;
      interiorGroup.rotation.y = earthSystem.rotation.y;
      interiorGroup.rotation.z = earthSystem.rotation.z;
      interiorMaterials.forEach((material) => {
        material.opacity = material === crustMaterial ? 1 : layerOpacity;
      });

      if (autoRotate && !prefersReducedMotion) {
        earthSystem.rotation.y += delta * rotationSpeed;
        if (cloudLayer) {
          cloudLayer.rotation.y += delta * rotationSpeed * 0.18;
        }
      }

      if (starField && !prefersReducedMotion) {
        starField.rotation.y += delta * 0.0015;
      }

      controls.update();
      const atmosphereCameraProgress = THREE.MathUtils.smoothstep(
        atmosphereProgress,
        0,
        0.55,
      );
      if (atmosphereCameraProgress <= 0.001) {
        userCameraDistance = camera.position.distanceTo(controls.target);
      } else {
        const cameraDistance = THREE.MathUtils.lerp(
          userCameraDistance,
          ATMOSPHERE_CAMERA_DISTANCE,
          atmosphereCameraProgress,
        );
        camera.position
          .sub(controls.target)
          .setLength(cameraDistance)
          .add(controls.target);
      }
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };
    frameId = window.requestAnimationFrame(render);

    Promise.all([
      textureLoader.loadAsync(assetUrl(earthDay)),
      textureLoader.loadAsync(assetUrl(earthNight)),
      textureLoader.loadAsync(assetUrl(earthNormal)),
      textureLoader.loadAsync(assetUrl(earthCloudData)),
    ])
      .then(([dayMap, nightMap, normalMap, cloudDataMap]) => {
        textures.push(dayMap, nightMap, normalMap, cloudDataMap);
        if (disposed) {
          textures.forEach((texture) => texture.dispose());
          return;
        }

        dayMap.colorSpace = THREE.SRGBColorSpace;
        nightMap.colorSpace = THREE.SRGBColorSpace;
        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        const anisotropy = Math.min(
          maxAnisotropy,
          qualityProfile.maxAnisotropy,
        );
        textures.forEach((texture) => {
          texture.anisotropy = anisotropy;
        });

        if (crustMaterial) {
          crustMaterial.map = dayMap;
          crustMaterial.normalMap = normalMap;
          crustMaterial.normalScale = new THREE.Vector2(0.48, 0.48);
          crustMaterial.needsUpdate = true;
        }

        const geometry = new THREE.SphereGeometry(
          1,
          qualityProfile.surfaceSegments,
          qualityProfile.surfaceSegments,
        );
        const earthDayMaterial = new THREE.MeshStandardMaterial({
          emissive: "#1a140c",
          map: dayMap,
          normalMap,
          normalScale: new THREE.Vector2(0.48, 0.48),
          roughness: 0.76,
          metalness: 0,
          transparent: true,
        });
        dayMaterial = earthDayMaterial;
        const earthMesh = new THREE.Mesh(geometry, earthDayMaterial);
        earthSurfaceMesh = earthMesh;

        nightMaterial = createNightMaterial(nightMap, sunDirection);
        const nightMesh = new THREE.Mesh(geometry.clone(), nightMaterial);
        nightMesh.scale.setScalar(1.0015);

        cloudMaterial = createCloudMaterial(cloudDataMap, sunDirection);
        const cloudMesh = new THREE.Mesh(geometry.clone(), cloudMaterial);
        cloudMesh.scale.setScalar(1.012);
        cloudLayer = cloudMesh;

        atmosphereMaterial = createAtmosphereMaterial();
        const atmosphereMesh = new THREE.Mesh(
          geometry.clone(),
          atmosphereMaterial,
        );
        atmosphereMesh.scale.setScalar(1.075);

        meshes.push(earthMesh, nightMesh, cloudMesh, atmosphereMesh);
        earthSystem.add(earthMesh, nightMesh, cloudMesh, atmosphereMesh);
        setIsLoading(false);
      })
      .catch(() => {
        if (!disposed) {
          setIsLoading(false);
          setHasError(true);
        }
      });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener(
        "visibilitychange",
        handleDocumentVisibility,
      );
      controls.dispose();
      timer.dispose();
      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        } else {
          mesh.material.dispose();
        }
      });
      textures.forEach((texture) => texture.dispose());
      if (starField) {
        starField.geometry.dispose();
        (starField.material as THREE.Material).dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [
    autoRotate,
    enableControls,
    enableZoom,
    focusLongitude,
    quality,
    rotationSpeed,
    showStars,
    sunX,
    sunY,
    sunZ,
    visualStateRef,
  ]);

  return (
    <div
      ref={containerRef}
      className={`${styles.earth} ${className ?? ""}`}
      data-interactive={enableControls}
      role="region"
      aria-label="Interactive 3D model of Earth"
      aria-busy={isLoading}
    >
      {isLoading && !hasError ? (
        <div className={styles.loading} aria-live="polite">
          <span className={styles.spinner} />
          <span>Loading Earth</span>
        </div>
      ) : null}
      {hasError ? (
        <p className={styles.error} role="alert">
          Your browser could not load the 3D Earth.
        </p>
      ) : null}
    </div>
  );
}
