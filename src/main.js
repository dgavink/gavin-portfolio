import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './style.css';

gsap.registerPlugin(TextPlugin, ScrollTrigger);

// Scene setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.querySelector('#app').appendChild(renderer.domElement);

// Liquid Glass Shader Material
const liquidGlassShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;

    // Noise functions
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vUv = uv;

      vec3 pos = position;

      // Create liquid/organic movement
      float noise1 = snoise(vec3(pos.x * 0.5 + uTime * 0.2, pos.y * 0.5, pos.z * 0.5 + uTime * 0.15));
      float noise2 = snoise(vec3(pos.x * 0.8 - uTime * 0.15, pos.y * 0.8 + uTime * 0.1, pos.z * 0.8));
      float noise3 = snoise(vec3(pos.x * 1.2, pos.y * 1.2 - uTime * 0.25, pos.z * 1.2 + uTime * 0.2));

      pos += normal * (noise1 * 0.3 + noise2 * 0.2 + noise3 * 0.15);

      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,

  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uFrontness;

    // Improved noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = vUv;

      // Create flowing liquid glass effect
      float n1 = snoise(vec2(uv.x * 3.0 + uTime * 0.1, uv.y * 3.0 - uTime * 0.08));
      float n2 = snoise(vec2(uv.x * 5.0 - uTime * 0.12, uv.y * 5.0 + uTime * 0.15));
      float n3 = snoise(vec2(uv.x * 2.0 + uTime * 0.05, uv.y * 2.0 + uTime * 0.1));

      // Combine noise for complex pattern
      float noise = (n1 + n2 * 0.5 + n3 * 0.3) / 1.8;

      // Create iridescent color shift
      vec3 color1 = vec3(0.4, 0.3, 0.8); // Purple
      vec3 color2 = vec3(0.2, 0.5, 0.9); // Blue
      vec3 color3 = vec3(0.6, 0.2, 0.7); // Magenta
      vec3 color4 = vec3(0.1, 0.3, 0.6); // Deep blue
      vec3 glowColor = vec3(0.25, 0.4, 0.88); // Royal blue for frontness glow

      // Mix colors based on noise and position
      vec3 finalColor = mix(color1, color2, sin(noise + uTime * 0.2) * 0.5 + 0.5);
      finalColor = mix(finalColor, color3, cos(noise * 2.0 - uTime * 0.15) * 0.5 + 0.5);
      finalColor = mix(finalColor, color4, sin(vPosition.y + uTime * 0.1) * 0.3 + 0.5);

      // Add frontness glow effect (intensifies when card is at front)
      float glowIntensity = uFrontness * 0.6;
      finalColor += glowColor * glowIntensity;

      // Make colors more vibrant and visible
      finalColor *= 1.3;

      // Add border glow effect
      vec2 center = vUv - 0.5;
      float distFromCenter = length(center);
      float borderGlow = smoothstep(0.45, 0.5, distFromCenter);
      finalColor += vec3(0.3, 0.5, 0.9) * borderGlow * 0.5;

      // Much higher alpha so cards are clearly visible
      float alpha = 0.65 + noise * 0.15 + glowIntensity * 0.2;

      // Add subtle highlights
      float highlight = smoothstep(0.5, 1.0, noise);
      finalColor += vec3(highlight * 0.3);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

// Matrix Rain Background
const matrixCanvas = document.createElement('canvas');
matrixCanvas.style.position = 'fixed';
matrixCanvas.style.top = '0';
matrixCanvas.style.left = '0';
matrixCanvas.style.width = '100%';
matrixCanvas.style.height = '100%';
matrixCanvas.style.zIndex = '-1';
matrixCanvas.style.opacity = '0.15';
document.body.insertBefore(matrixCanvas, document.body.firstChild);

const matrixCtx = matrixCanvas.getContext('2d');
matrixCanvas.width = window.innerWidth;
matrixCanvas.height = window.innerHeight;

const fontSize = 16;
const columns = Math.floor(matrixCanvas.width / fontSize);
const drops = Array(columns).fill(1);

function drawMatrixRain() {
  matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

  matrixCtx.fillStyle = '#4169E1';
  matrixCtx.font = `${fontSize}px monospace`;

  for (let i = 0; i < drops.length; i++) {
    const text = Math.random() > 0.5 ? '1' : '0';
    const x = i * fontSize;
    const y = drops[i] * fontSize;

    matrixCtx.fillText(text, x, y);

    if (y > matrixCanvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  }
}

setInterval(drawMatrixRain, 50);

window.addEventListener('resize', () => {
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
});

// Ambient light for subtle illumination
const ambientLight = new THREE.AmbientLight(0x6b5fb5, 0.5);
scene.add(ambientLight);

// Point lights for dynamic lighting
const pointLight1 = new THREE.PointLight(0x8b7fc7, 2, 10);
pointLight1.position.set(5, 5, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x5f8fc9, 1.5, 10);
pointLight2.position.set(-5, -3, 3);
scene.add(pointLight2);

// Create space station and its shattered pieces
const stationGroup = new THREE.Group();
scene.add(stationGroup);

let spaceStation = null;
const stationShards = [];
const shardCount = 25;
let stationState = 'whole'; // 'whole', 'shattered', 'reforming'
let stationLoaded = false;

// Load space station model
const gltfLoader = new GLTFLoader();

function loadSpaceStation() {
  gltfLoader.load(
    '/space-station.glb',
    (gltf) => {
      spaceStation = gltf.scene;

      // Scale and position the space station
      spaceStation.scale.set(0.5, 0.5, 0.5);
      spaceStation.position.set(0, 0, -2);

      // Apply blue color and lower opacity to all meshes
      spaceStation.traverse((child) => {
        if (child.isMesh) {
          // Clone material to avoid affecting other instances
          child.material = child.material.clone();

          // Change color to blue
          child.material.color.setHex(0x4169E1); // Royal blue
          child.material.emissive = new THREE.Color(0x2244aa); // Blue emissive
          child.material.emissiveIntensity = 0.3;

          // Apply transparency
          child.material.transparent = true;
          child.material.opacity = 0.1;
          child.material.needsUpdate = true;
        }
      });

      stationGroup.add(spaceStation);
      stationLoaded = true;

      // Create shards after station loads
      createStationShards();
    },
    (progress) => {
      console.log('Loading space station:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
      console.error('Error loading space station:', error);
    }
  );
}

// Create shattered pieces (smaller geometric shapes)
function createStationShards() {
  const geometries = [
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.TetrahedronGeometry(0.4, 0),
    new THREE.OctahedronGeometry(0.35, 0),
    new THREE.BoxGeometry(0.25, 0.5, 0.25),
    new THREE.TetrahedronGeometry(0.5, 0),
    new THREE.DodecahedronGeometry(0.3, 0)
  ];

  for (let i = 0; i < shardCount; i++) {
    const geometry = geometries[i % geometries.length];
    const material = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      metalness: 0.7,
      roughness: 0.3,
      transparent: true,
      opacity: 0.4,
      emissive: 0x224466,
      emissiveIntensity: 0.2
    });

    const shard = new THREE.Mesh(geometry, material);

    // Start at station center
    shard.position.set(0, 0, -2);

    // Calculate explosion direction (spherical distribution)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 8 + Math.random() * 12;

    shard.userData.explosionTarget = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi) - 2
    );

    shard.userData.originalPosition = new THREE.Vector3(0, 0, -2);
    shard.userData.velocity = new THREE.Vector3();
    shard.userData.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.12,
      (Math.random() - 0.5) * 0.12,
      (Math.random() - 0.5) * 0.12
    );

    shard.visible = false;
    stationGroup.add(shard);
    stationShards.push(shard);
  }
}

loadSpaceStation();

// Mouse interaction
let mouseX = 0;
let mouseY = 0;
const mouse3D = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

document.addEventListener('mousemove', (event) => {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update 3D mouse position for elastic effect
  mouse3D.set(mouseX, mouseY, 0.5);
  mouse3D.unproject(camera);
  mouse3D.sub(camera.position).normalize();
  const distance = -camera.position.z / mouse3D.z;
  mouse3D.copy(camera.position).add(mouse3D.multiplyScalar(distance));
});

// Track current section for diamond behavior
let currentSection = 'home';

// Function to shatter the space station
function shatterStation() {
  if (stationState === 'whole' && stationLoaded) {
    stationState = 'shattered';

    // Hide space station
    if (spaceStation) {
      gsap.to(spaceStation.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => {
          spaceStation.visible = false;
        }
      });
    }

    // Show and explode shards
    stationShards.forEach((shard, index) => {
      shard.visible = true;
      shard.scale.set(0, 0, 0);

      gsap.to(shard.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.3,
        delay: index * 0.015,
        ease: "back.out(2)"
      });

      gsap.to(shard.position, {
        x: shard.userData.explosionTarget.x,
        y: shard.userData.explosionTarget.y,
        z: shard.userData.explosionTarget.z,
        duration: 1.8,
        delay: index * 0.015,
        ease: "power2.out"
      });
    });
  }
}

// Function to reform the space station
function reformStation() {
  if (stationState === 'shattered' && stationLoaded) {
    stationState = 'reforming';

    // Gather shards back to center
    stationShards.forEach((shard, index) => {
      gsap.to(shard.position, {
        x: 0,
        y: 0,
        z: -2,
        duration: 1.4,
        delay: index * 0.025,
        ease: "power2.inOut"
      });

      gsap.to(shard.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.5,
        delay: 0.9 + index * 0.025,
        ease: "power2.in",
        onComplete: () => {
          shard.visible = false;

          // Show space station again when last shard disappears
          if (index === stationShards.length - 1) {
            stationState = 'whole';
            spaceStation.visible = true;
            spaceStation.scale.set(0, 0, 0);
            gsap.to(spaceStation.scale, {
              x: 0.5,
              y: 0.5,
              z: 0.5,
              duration: 0.8,
              ease: "back.out(2)"
            });
          }
        }
      });
    });
  }
}



// Animation loop with space station effects
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  // Update space station
  if (spaceStation && spaceStation.visible && stationLoaded) {
    // Slow rotation
    spaceStation.rotation.x += 0.001;
    spaceStation.rotation.y += 0.002;

    // Elastic pulling effect when mouse is near
    const distanceToMouse = spaceStation.position.distanceTo(mouse3D);
    if (distanceToMouse < 5) {
      const pullStrength = (5 - distanceToMouse) / 5;
      const direction = new THREE.Vector3().subVectors(mouse3D, spaceStation.position);
      direction.normalize().multiplyScalar(pullStrength * 0.08);

      // Subtle pull effect
      spaceStation.position.add(direction);
      spaceStation.position.lerp(new THREE.Vector3(0, 0, -2), 0.1); // Return to center
    }
  }

  // Update station shards
  stationShards.forEach((shard, index) => {
    if (shard.visible) {
      // Rotation based on stored rotation speed
      shard.rotation.x += shard.userData.rotationSpeed.x;
      shard.rotation.y += shard.userData.rotationSpeed.y;
      shard.rotation.z += shard.userData.rotationSpeed.z;

      // Elastic pulling effect when mouse is near (only when shattered)
      if (stationState === 'shattered') {
        const distanceToMouse = shard.position.distanceTo(mouse3D);
        if (distanceToMouse < 3) {
          const pullStrength = (3 - distanceToMouse) / 3;
          const direction = new THREE.Vector3().subVectors(mouse3D, shard.position);
          direction.normalize().multiplyScalar(pullStrength * 0.1);

          // Apply elastic pull
          if (!shard.userData.velocity) {
            shard.userData.velocity = new THREE.Vector3();
          }
          shard.userData.velocity.add(direction);

          // Apply velocity with damping
          shard.userData.velocity.multiplyScalar(0.92);
          shard.position.add(shard.userData.velocity);
        }
      }
    }
  });

  renderer.render(scene, camera);
}

animate();

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Function to close sidebar (globally accessible)
window.closeSidebar = function() {
  const navLinksContainer = document.querySelector('.nav-links');
  const hamburger = document.querySelector('.hamburger');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');

  if (navLinksContainer) navLinksContainer.classList.remove('active');
  if (hamburger) hamburger.classList.remove('active');
  if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Function to open sidebar (globally accessible)
window.openSidebar = function() {
  const navLinksContainer = document.querySelector('.nav-links');
  const hamburger = document.querySelector('.hamburger');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');

  if (navLinksContainer) navLinksContainer.classList.add('active');
  if (hamburger) hamburger.classList.add('active');
  if (sidebarOverlay) sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Wait for DOM to be ready before attaching sidebar handlers
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navLinksContainer = document.querySelector('.nav-links');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');

  // Ensure sidebar is closed on page load
  window.closeSidebar();

  // Toggle sidebar with hamburger button
  if (hamburger) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navLinksContainer && navLinksContainer.classList.contains('active')) {
        window.closeSidebar();
      } else {
        window.openSidebar();
      }
    });
  }

  // Close sidebar when clicking overlay
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      window.closeSidebar();
    });
  }

  // Close sidebar when resizing to desktop view
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      window.closeSidebar();
    }
  });
});


// GSAP Animations for Hero Section
const descriptionElement = document.getElementById('description-text');
const descriptionText = descriptionElement.textContent;
descriptionElement.textContent = '';

const smallDescElement = document.querySelector('.small-description');
const smallDescText = smallDescElement.textContent;
smallDescElement.textContent = '';

// Set initial states
gsap.set(".glass-card", { opacity: 0, x: -100, scale: 0.9 });
gsap.set(".content h1", { opacity: 0, y: 50 });
gsap.set("#description-text", { opacity: 1 }); // Keep visible for typing
gsap.set(".small-description", { opacity: 1 }); // Keep visible for typing
gsap.set(".hero-actions", { opacity: 0, y: 20 });
gsap.set(".view-work-btn", { opacity: 0, scale: 0.9 });
gsap.set(".social-links", { opacity: 0, y: 20 });
gsap.set(".navbar", { opacity: 0, y: -20 });

// Hero section timeline
const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

tl.to(".navbar", {
  duration: 0.8,
  opacity: 1,
  y: 0,
  delay: 0.3
})
.to(".glass-card", {
  duration: 1.2,
  opacity: 1,
  x: 0,
  scale: 1,
  ease: "back.out(1.4)"
}, "-=0.4")
.to(".content h1", {
  duration: 1,
  opacity: 1,
  y: 0,
  ease: "power2.out"
}, "-=0.6")
.to(descriptionElement, {
  duration: 2,
  text: {
    value: descriptionText,
    delimiter: ""
  },
  ease: "none",
}, "-=0.3")
.to(smallDescElement, {
  duration: 2.5,
  text: {
    value: smallDescText,
    delimiter: ""
  },
  ease: "none",
}, "-=0.8")
.to(".hero-actions", {
  duration: 0.8,
  opacity: 1,
  y: 0,
  ease: "power2.out"
}, "-=1")
.to(".view-work-btn", {
  duration: 0.6,
  opacity: 1,
  scale: 1,
  ease: "back.out(1.5)"
}, "-=0.6")
.to(".social-links", {
  duration: 0.6,
  opacity: 1,
  y: 0,
  ease: "power2.out"
}, "-=0.4");

// GSAP Animations for About Section
const aboutMeDescriptionElement = document.getElementById('about-me-description');
if (aboutMeDescriptionElement) {
  const fullAboutMeText = aboutMeDescriptionElement.textContent;
  aboutMeDescriptionElement.textContent = '';

  gsap.timeline({
    scrollTrigger: {
      trigger: "#about",
      start: "top center",
      toggleActions: "play none none none",
    }
  })
  .to(aboutMeDescriptionElement, {
    duration: fullAboutMeText.length * 0.008,
    text: {
      value: fullAboutMeText,
    },
    ease: "none",
  });
}

// Projects Data for HTML projects section
const portfolioProjects = {
  apparelgenesis: {
    id: 'apparelgenesis',
    title: 'Apparel Genesis',
    tagline: 'RFID-based Garment Inbound Verification and Inventory Controlling System',
    description: 'An industrial-based software and hardware integrated solution for automated garment verification and inventory management using RFID and barcode technologies.',
    fullDetails: 'Apparel Genesis is an industrial-based software and hardware integrated solution developed as part of our 5th semester university project. The system is designed for a logistics company engaged in garment imports and distribution in Sri Lanka, addressing the inefficiencies in manual garment verification and inventory handling processes. The solution combines RFID and barcode technologies to automate the verification of garments received from foreign suppliers. A custom-built RFID scanning machine identifies and validates garment tags, while a connected web application records, processes, and displays real-time data such as garment counts, mismatched entries, and stock updates. Key features include RFID and barcode tag scanning integration for automated verification, duplicate and mismatch detection with alert notifications, real-time data visualization through an interactive web dashboard, role-based access for administrators, warehouse staff, and retailers, report generation and analytics for warehouse management, and integration of a payment module for retail order management. The system enhances accuracy, efficiency, and traceability in logistics operations while reducing manual workload. This project demonstrates the potential of combining IoT and web technologies to modernize traditional logistics workflows in the apparel industry.',
    status: 'In Development',
    techStack: ['next.js', 'Supabase', 'RFID Technology', 'IoT', 'Barcode Scanner'],
    photos: [
      '/a1.png',
      '/a2.png',
      '/a3.png',
      '/a4.png',
      '/a5.png',
      '/a6.png',
      '/a7.png',
      '/a8.png',
      '/a9.png'
    ],
    links: {
      github: 'https://github.com/dgavink/Apparel-Genesis',
      live: null
    }
  },
  rydora: {
    id: 'rydora',
    title: 'Rydora',
    tagline: 'AI-Optimized Expressway Bus Transit Safety and Efficiency System',
    description: 'Developed a mobile application for public expressway bus transportation focused on passenger safety and efficiency.',
    fullDetails: 'Rydora is a comprehensive mobile application designed to revolutionize public expressway bus transportation. The system integrates AI-powered route optimization, real-time safety monitoring, passenger tracking, and emergency response features. Built with modern technologies to ensure seamless user experience and operational efficiency.',
    status: 'In Development',
    techStack: ['React JS', 'PostgreSQL', 'Supabase', 'TensorFlow', 'Google Maps API'],
    photos: [
      '/r1.jpg',
      '/r2.jpg',
      '/r3.jpg',
      '/r4.jpg',
      '/r5.jpg',
      '/r6.jpg'
    ],
    links: {
      github: 'https://github.com/dgavink/Rydora-mobile',
      live: 'https://rydora-demo.com'
    }
  },
  flymate: {
    id: 'flymate',
    title: 'Flymate',
    tagline: 'Online Flight Tracking and AirTicket Booking Enterprise Platform',
    description: 'Built a more reliable platform to book flight tickets and track flights from one space, using React JS and Java Springboot.',
    fullDetails: 'Flymate is an enterprise-grade flight booking and tracking platform that provides real-time flight information, seamless ticket booking, price comparison, and travel management features. The platform integrates with multiple airline APIs to offer comprehensive travel solutions in one unified interface.',
    status: 'Completed',
    techStack: ['React JS', 'Java Spring Boot', 'MySQL', 'Redis', 'Stripe API'],
    photos: [
      '/f1.png',
      '/f2.png',
      '/f3.png',
      '/f4.png',
      '/f5.png'
    ],
    links: {
      github: 'https://github.com/dgavink/Flymate',
      live: 'https://flymate-demo.com'
    }
  },
  justicehire: {
    id: 'justicehire',
    title: 'JusticeHire',
    tagline: 'Website to Hire Attorneys Online',
    description: 'A full-stack web application designed to revolutionize the legal hiring process in Sri Lanka. This platform enables clients to find, consult, and hire attorneys online.',
    fullDetails: 'JusticeHire is a comprehensive legal services platform that connects clients with qualified attorneys. Features include attorney profiles, practice area filtering, online consultation booking, secure document sharing, case management, and integrated payment processing. The platform aims to make legal services more accessible and transparent.',
    status: 'Completed',
    techStack: ['Full-Stack', 'Node.js', 'MongoDB', 'Socket.io', 'Stripe'],
    photos: [
      '/j1.png',
      '/j2.png',
      '/j3.png',
      '/j4.png',
      '/j5.png',
      '/j6.png'
    ],
    links: {
      github: 'https://github.com/dgavink/JusticeHire',
      live: 'https://justicehire.netlify.app/'
    }
  },
  nexusgalleria: {
    id: 'nexusgalleria',
    title: 'NexusGalleria',
    tagline: 'Desktop Application for a Virtual Art Gallery & Auction',
    description: 'Created a desktop app to buy and sell artworks through both direct and auction methods. Built using C++.',
    fullDetails: 'NexusGalleria is a sophisticated desktop application that brings the art gallery experience to your computer. It features a virtual gallery space, real-time auction system, secure payment processing, artist portfolio management, and artwork authentication. Built with modern C++ and Qt framework for a rich user interface.',
    status: 'Completed',
    techStack: ['C#','Desktop App'],
    photos: [
      '/n1.png',
      '/n2.png',
      '/n3.png',
      '/n4.png',
      '/n5.png',
      '/n6.png'
    ],
    links: {
      github: 'https://github.com/dgavink/NexusGalleria',
      live: null
    }
  },

  newshub: {
    id: 'newshub',
    title: 'NewsHub',
    tagline: 'Worldwide news webpage',
    description: 'A webpage to see news information worldwide by searching for a single keyword. fetched real time information using API',
    fullDetails: 'Newshub by Gavin, is a Webpage that the user can view realtime information from just 1 place. The user should search a keyword that they want to get the information about and through an API, the releted news info is fetched. ',
    status: 'Completed',
    techStack: ['HTML', 'CSS'],
    photos: [
      '/newshub.png',
      '/nh1.png',
      '/nh2.png'
    ],
    links: {
      github: 'https://github.com/dgavink/NewsHub',
      live: 'https://newshub-by-gavin.netlify.app/'
    }
  },

  codmrulebook: {
    id: 'codmrulebook',
    title: 'COD Mobile Rulebook',
    tagline: 'Tournament Rulebook for Call of Duty Mobile Esports',
    description: 'An informational webpage serving as the official rulebook for a Call of Duty Mobile esports tournament held at our university.',
    fullDetails: 'COD Mobile Rulebook is a comprehensive informational webpage created for a Call of Duty Mobile esports tournament organized by QuantumRift at our university. The page features a cyberpunk-themed interface with purple neon styling, providing participants with all essential tournament information. It covers game modes (Search & Destroy), detailed gameplay rules including banned items such as legendary weapon skins and specific operator skills, the competitive map pool featuring Summit, Standoff, Raid, and other popular maps, as well as registered team rosters. The rulebook ensures fair play by clearly outlining prohibited practices like exploiting bugs, using third-party software, and match-fixing.',
    status: ['Informational-frontend'],
    techStack: ['HTML', 'CSS'],
    photos: [
      '/cod.png',
      '/cod1.png',
      '/cod2.png',
      '/cod3.png'
    ],
    links: {
      github: null,
      live: 'https://codmrulesqr25.netlify.app/'
    }
  }
};

// Projects Data
const projectsData = [
  {
    id: 1,
    title: "Project Alpha",
    thumbnail: "/vite.svg",
    shortDescription: "A web application built with modern frameworks.",
    fullDetails: "This project is a sophisticated web application designed to demonstrate full-stack capabilities, responsive design, and advanced data visualization techniques. Technologies used include React, Node.js, and MongoDB.",
    fullImage: "/vite.svg"
  },
  {
    id: 2,
    title: "Project Beta",
    thumbnail: "/javascript.svg",
    shortDescription: "Mobile application development with a focus on UX.",
    fullDetails: "Project Beta is a mobile application focused on delivering an exceptional user experience and robust offline capabilities. Developed with React Native, it integrates with cloud services for data synchronization.",
    fullImage: "/javascript.svg"
  },
  {
    id: 3,
    title: "Project Gamma",
    thumbnail: "/gavin.png",
    shortDescription: "Backend system for real-time data processing.",
    fullDetails: "An enterprise-grade backend system built for real-time data processing and high-performance API management. Ensures scalability and fault tolerance using microservices architecture and Kafka.",
    fullImage: "/gavin.png"
  },
  {
    id: 4,
    title: "Project Delta",
    thumbnail: "/vite.svg",
    shortDescription: "Machine Learning model for predictive analytics.",
    fullDetails: "Project Delta involves the development and deployment of a machine learning model for predictive analytics. It uses Python, TensorFlow, and is hosted on AWS SageMaker.",
    fullImage: "/vite.svg"
  },
  {
    id: 5,
    title: "Project Epsilon",
    thumbnail: "/javascript.svg",
    shortDescription: "Interactive data visualization dashboard.",
    fullDetails: "An interactive dashboard for visualizing complex datasets, allowing users to explore trends and patterns. Implemented using D3.js and a Flask backend.",
    fullImage: "/javascript.svg"
  },
  {
    id: 6,
    title: "Project Zeta",
    thumbnail: "/gavin.png",
    shortDescription: "Decentralized application (dApp) on Ethereum.",
    fullDetails: "Project Zeta is a decentralized application (dApp) built on the Ethereum blockchain, showcasing smart contract development and Web3 integration for secure and transparent transactions.",
    fullImage: "/gavin.png"
  },
  {
    id: 7,
    title: "Project Eta",
    thumbnail: "/vite.svg",
    shortDescription: "E-commerce platform with microservices.",
    fullDetails: "A scalable e-commerce platform built with a microservices architecture, including services for product catalog, order management, and payment processing.",
    fullImage: "/vite.svg"
  },
  {
    id: 8,
    title: "Project Theta",
    thumbnail: "/javascript.svg",
    shortDescription: "IoT device management system.",
    fullDetails: "An IoT device management system providing real-time monitoring, control, and data analytics for a network of smart devices. Integrates with MQTT and cloud platforms.",
    fullImage: "/javascript.svg"
  }
];

// 3D Coverflow Carousel
let carouselScene, carouselCamera, carouselRenderer;
let cardsArray = [];
let currentCardIndex = 0;
let isAnimating = false;
const carouselClock = new THREE.Clock();

// Create a single card with liquid glass shader
function createCard(project, index) {
  const geometry = new THREE.PlaneGeometry(3.5, 4.5);
  const material = new THREE.ShaderMaterial({
    vertexShader: liquidGlassShader.vertexShader,
    fragmentShader: liquidGlassShader.fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(350, 450) },
      uFrontness: { value: 0 }
    },
    transparent: true,
    side: THREE.DoubleSide
  });

  const card = new THREE.Mesh(geometry, material);
  card.userData = { project, index };

  // Holographic scan line
  const scanLineGeometry = new THREE.PlaneGeometry(3.6, 0.08);
  const scanLineMaterial = new THREE.MeshBasicMaterial({
    color: 0x4169E1,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending
  });
  const scanLine = new THREE.Mesh(scanLineGeometry, scanLineMaterial);
  scanLine.position.z = 0.1;
  card.add(scanLine);

  return card;
}

// Position 3 visible cards in coverflow style
function updateCardPositions(animate = true) {
  const duration = animate ? 0.8 : 0;

  cardsArray.forEach((card, index) => {
    const offset = index - currentCardIndex;

    // Hide all 3D cards - we're using HTML overlays instead
    card.visible = false;
  });

  // Update center card overlay
  updateCenterCardOverlay();
}

// Create HTML card element
function createProjectCard(project, position) {
  // position: 'left', 'center', 'right'
  const isCenter = position === 'center';

  return `
    <div class="project-card ${position}">
      <div class="card-content">
        <h3>${project.title}</h3>
        <p class="short-desc">${project.shortDescription}</p>
        ${isCenter ? `
          <div class="card-details">
            <img src="${project.fullImage}" alt="${project.title}">
            <p class="full-details">${project.fullDetails}</p>
            <div class="tech-stack">
              <div class="tech-badge">React</div>
              <div class="tech-badge">Node.js</div>
              <div class="tech-badge">MongoDB</div>
            </div>
            <div class="project-actions">
              <a href="#" class="action-btn primary">View Live Demo</a>
              <a href="#" class="action-btn secondary">GitHub Repository</a>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Update HTML overlay for all 3 visible cards
function updateCenterCardOverlay(animate = false) {
  const overlayContainer = document.getElementById('carousel-overlays');

  const leftIndex = (currentCardIndex - 1 + projectsData.length) % projectsData.length;
  const rightIndex = (currentCardIndex + 1) % projectsData.length;

  const leftProject = projectsData[leftIndex];
  const centerProject = projectsData[currentCardIndex];
  const rightProject = projectsData[rightIndex];

  if (animate) {
    // Smooth crossfade animation
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.width = '100%';
    tempDiv.style.height = '100%';
    tempDiv.style.display = 'flex';
    tempDiv.style.alignItems = 'center';
    tempDiv.style.justifyContent = 'center';
    tempDiv.style.gap = '40px';
    tempDiv.innerHTML = `
      ${createProjectCard(leftProject, 'left')}
      ${createProjectCard(centerProject, 'center')}
      ${createProjectCard(rightProject, 'right')}
    `;

    overlayContainer.appendChild(tempDiv);

    // Fade out old cards and fade in new cards simultaneously
    gsap.to(overlayContainer.children[0], {
      opacity: 0,
      duration: 0.4,
      ease: "power2.inOut"
    });

    gsap.fromTo(tempDiv,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.4,
        ease: "power2.inOut",
        onComplete: () => {
          overlayContainer.children[0]?.remove();

          // Animate center card details
          setTimeout(() => {
            const details = tempDiv.querySelector('.center .card-details');
            if (details) {
              gsap.fromTo(details,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
              );
            }
          }, 200);
        }
      }
    );
  } else {
    overlayContainer.innerHTML = `
      ${createProjectCard(leftProject, 'left')}
      ${createProjectCard(centerProject, 'center')}
      ${createProjectCard(rightProject, 'right')}
    `;

    // Animate in the center card details on initial load
    setTimeout(() => {
      const details = overlayContainer.querySelector('.center .card-details');
      if (details) {
        gsap.fromTo(details,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
        );
      }
    }, 400);
  }
}

// Navigate to next card
function navigateNext() {
  if (isAnimating) return;
  isAnimating = true;
  currentCardIndex = (currentCardIndex + 1) % projectsData.length;
  updateCenterCardOverlay(true);
  setTimeout(() => { isAnimating = false; }, 600);
}

// Navigate to previous card
function navigatePrev() {
  if (isAnimating) return;
  isAnimating = true;
  currentCardIndex = (currentCardIndex - 1 + projectsData.length) % projectsData.length;
  updateCenterCardOverlay(true);
  setTimeout(() => { isAnimating = false; }, 600);
}

// Initialize coverflow carousel
function initCarouselDisplay() {
  const container = document.getElementById('carousel-container');
  if (!container) return;

  // Scene
  carouselScene = new THREE.Scene();

  // Camera
  carouselCamera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  carouselCamera.position.set(0, 0, 14);

  // Renderer
  carouselRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  carouselRenderer.setSize(container.clientWidth, container.clientHeight);
  carouselRenderer.setClearColor(0x000000, 0);
  container.appendChild(carouselRenderer.domElement);

  // Create all project cards
  projectsData.forEach((project, index) => {
    const card = createCard(project, index);
    cardsArray.push(card);
    carouselScene.add(card);
  });

  // Lighting
  const ambLight = new THREE.AmbientLight(0xffffff, 0.7);
  carouselScene.add(ambLight);

  const pointLight1 = new THREE.PointLight(0x4169E1, 1);
  pointLight1.position.set(6, 3, 8);
  carouselScene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x8b7fc7, 0.6);
  pointLight2.position.set(-6, -2, 6);
  carouselScene.add(pointLight2);

  // Initial positioning
  updateCardPositions(false);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') navigateNext();
    if (e.key === 'ArrowLeft') navigatePrev();
  });

  // Start animation
  animateCarousel();
}

// Animation loop
function animateCarousel() {
  requestAnimationFrame(animateCarousel);

  const elapsedTime = carouselClock.getElapsedTime();

  // Update shader time and scan lines
  cardsArray.forEach((card, index) => {
    if (card.visible) {
      card.material.uniforms.uTime.value = elapsedTime;

      // Scan line animation on center card
      if (index === currentCardIndex && card.children[0]) {
        const scanLine = card.children[0];
        scanLine.position.y = Math.sin(elapsedTime * 2) * 2;
        scanLine.material.opacity = 0.5 + Math.sin(elapsedTime * 3) * 0.3;
      } else if (card.children[0]) {
        card.children[0].material.opacity = 0;
      }
    }
  });

  if (carouselRenderer && carouselScene && carouselCamera) {
    carouselRenderer.render(carouselScene, carouselCamera);
  }
}

// Initialize when section is visible
const projectsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !carouselRenderer) {
      initCarouselDisplay();
    }
  });
}, { threshold: 0.1 });

const projectsSection = document.getElementById('projects');
if (projectsSection) {
  projectsObserver.observe(projectsSection);
}

// Modal functionality
function showProjectModal(project) {
  const modal = document.getElementById('project-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalImage = document.getElementById('modal-image');
  const modalDetails = document.getElementById('modal-details');
  
  modalTitle.textContent = project.title;
  modalImage.src = project.fullImage;
  modalDetails.textContent = project.fullDetails;
  
  modal.classList.add('active');
}

// Close modal
const closeBtn = document.querySelector('.close-button');
const modal = document.getElementById('project-modal');

if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });
}

if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
}

// Window resize handler for carousel
window.addEventListener('resize', () => {
  if (carouselRenderer && carouselCamera) {
    const container = document.getElementById('carousel-container');
    if (container) {
      carouselCamera.aspect = container.clientWidth / container.clientHeight;
      carouselCamera.updateProjectionMatrix();
      carouselRenderer.setSize(container.clientWidth, container.clientHeight);
    }
  }
});

// ===================================
// SCROLL TRIGGERED ANIMATIONS
// ===================================

// Intersection Observer for scroll animations
const animateOnScroll = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animated');
      // Unobserve after animation to improve performance
      animateOnScroll.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
});

// Initialize all fade-in sections
document.addEventListener('DOMContentLoaded', () => {
  // Select all elements with fade-in classes
  const fadeInElements = document.querySelectorAll('.fade-in-section, .slide-in-left, .slide-in-right');

  fadeInElements.forEach(element => {
    animateOnScroll.observe(element);
  });

  // About Section - Add specific animations to columns
  const aboutSection = document.getElementById('about');
  if (aboutSection) {
    const aboutColumns = aboutSection.querySelectorAll('.about-column');
    aboutColumns.forEach((col, index) => {
      col.classList.add('fade-in-section');
      col.style.transitionDelay = `${index * 0.2}s`;
      animateOnScroll.observe(col);
    });

    const educationItems = aboutSection.querySelectorAll('.education-item');
    educationItems.forEach((item, index) => {
      item.classList.add('fade-in-section');
      item.style.transitionDelay = `${index * 0.15}s`;
      animateOnScroll.observe(item);
    });
  }

  // Projects Section - Stagger animation
  const projectsSection2 = document.getElementById('projects');
  if (projectsSection2) {
    const projectItems = projectsSection2.querySelectorAll('.project-item');
    projectItems.forEach((item, index) => {
      item.classList.add('fade-in-section');
      item.style.transitionDelay = `${index * 0.15}s`;
      animateOnScroll.observe(item);
    });
  }

  // Certifications Section - Stagger animation
  const certificationsSection = document.getElementById('certifications');
  if (certificationsSection) {
    const certItems = certificationsSection.querySelectorAll('.certification-item');
    certItems.forEach((item, index) => {
      item.classList.add('fade-in-section');
      item.style.transitionDelay = `${index * 0.15}s`;
      animateOnScroll.observe(item);
    });
  }

  // Tech Marquee Section
  const techMarqueeSection = document.querySelector('.tech-marquee-section');
  if (techMarqueeSection) {
    techMarqueeSection.classList.add('fade-in-section');
    animateOnScroll.observe(techMarqueeSection);
  }

  // Let's Connect Section - Minimal design animation
  const connectSection = document.getElementById('connect');
  if (connectSection) {
    const connectBox = connectSection.querySelector('.connect-box');
    if (connectBox) {
      animateOnScroll.observe(connectBox);
    }
  }
});

// Image Modal Functionality
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById("cert-image-modal");
  const modalImg = document.getElementById("modal-cert-image");
  const certImages = document.querySelectorAll(".cert-img");
  const closeModal = document.querySelector(".close-image-modal");

  certImages.forEach(img => {
    img.addEventListener('click', () => {
      modal.style.display = "block";
      modalImg.src = img.src;
    });
  });

  closeModal.addEventListener('click', () => {
    modal.style.display = "none";
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});

// ===================================
// PROJECT DETAIL MODAL FUNCTIONALITY
// ===================================

let currentPhotoIndex = 0;
let currentProjectPhotos = [];

function openProjectModal(projectId) {
  const project = portfolioProjects[projectId];
  if (!project) return;

  const modal = document.getElementById('project-detail-modal');

  // Populate project details
  document.getElementById('modal-project-title').textContent = project.title;
  document.getElementById('modal-project-tagline').textContent = project.tagline;
  document.getElementById('modal-project-status').textContent = project.status;
  document.getElementById('modal-project-description').textContent = project.fullDetails;

  // Populate tech stack
  const techStackContainer = document.getElementById('modal-tech-stack');
  techStackContainer.innerHTML = '';
  project.techStack.forEach(tech => {
    const tag = document.createElement('span');
    tag.className = 'modal-tech-tag';
    tag.textContent = tech;
    techStackContainer.appendChild(tag);
  });

  // Setup project links
  const githubLink = document.getElementById('modal-github-link');
  const liveLink = document.getElementById('modal-live-link');

  if (project.links.github) {
    githubLink.href = project.links.github;
    githubLink.style.display = 'flex';
  } else {
    githubLink.style.display = 'none';
  }

  if (project.links.live) {
    liveLink.href = project.links.live;
    liveLink.style.display = 'flex';
  } else {
    liveLink.style.display = 'none';
  }

  // Setup photo gallery
  currentProjectPhotos = project.photos;
  currentPhotoIndex = 0;
  updatePhotoGallery();

  // Show modal with animation
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function updatePhotoGallery() {
  const mainPhoto = document.getElementById('modal-main-photo');
  const thumbnailsContainer = document.querySelector('.photo-thumbnails');

  // Update main photo
  mainPhoto.src = currentProjectPhotos[currentPhotoIndex];

  // Create thumbnails
  thumbnailsContainer.innerHTML = '';
  currentProjectPhotos.forEach((photo, index) => {
    const thumbnail = document.createElement('img');
    thumbnail.src = photo;
    thumbnail.className = 'photo-thumbnail';
    if (index === currentPhotoIndex) {
      thumbnail.classList.add('active');
    }
    thumbnail.addEventListener('click', () => {
      currentPhotoIndex = index;
      updatePhotoGallery();
    });
    thumbnailsContainer.appendChild(thumbnail);
  });
}

function closeProjectModal() {
  const modal = document.getElementById('project-detail-modal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Make functions globally accessible
window.openProjectModal = openProjectModal;
window.closeProjectModal = closeProjectModal;

// Setup modal close functionality and project link handlers
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('project-detail-modal');
  const closeBtn = document.querySelector('.modal-close-btn');
  const overlay = document.querySelector('.modal-overlay');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeProjectModal);
  }

  if (overlay) {
    overlay.addEventListener('click', closeProjectModal);
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeProjectModal();
    }
  });

  // Setup project link click handlers
  document.querySelectorAll('.project-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const projectCard = link.closest('.project-item');

      // Determine project ID from card class
      let projectId = null;
      if (projectCard.classList.contains('apparelgenesis-card')) {
        projectId = 'apparelgenesis';
      } else if (projectCard.classList.contains('rydora-card')) {
        projectId = 'rydora';
      } else if (projectCard.classList.contains('flymate-card')) {
        projectId = 'flymate';
      } else if (projectCard.classList.contains('justicehire-card')) {
        projectId = 'justicehire';
      } else if (projectCard.classList.contains('nexusgalleria-card')) {
        projectId = 'nexusgalleria';
      }
      else if (projectCard.classList.contains('newshub-card')) {
        projectId = 'newshub';
      }
      else if (projectCard.classList.contains('codmrulebook-card')) {
        projectId = 'codmrulebook';
      }

      if (projectId) {
        openProjectModal(projectId);
      }
    });
  });
});

// ============================================
// MESSAGE MODAL FUNCTIONALITY
// ============================================

function openMessageModal() {
  const modal = document.getElementById('message-modal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMessageModal() {
  const modal = document.getElementById('message-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';

  // Reset form
  const form = document.getElementById('contact-form');
  if (form) {
    form.reset();
  }
}

// Handle form submission
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();

    // Get form data
    const formData = {
      name: document.getElementById('contact-name').value,
      email: document.getElementById('contact-email').value,
      subject: document.getElementById('contact-subject').value,
      message: document.getElementById('contact-message').value
    };

    // Here you can add your email sending logic
    // For now, we'll just log it and show a success message
    console.log('Form submitted:', formData);

    // Show success message (you can customize this)
    alert('Message sent successfully! I\'ll get back to you soon.');

    // Close modal and reset form
    closeMessageModal();
  });
}

// Close modal when clicking overlay
const messageModal = document.getElementById('message-modal');
if (messageModal) {
  const overlay = messageModal.querySelector('.modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeMessageModal);
  }
}

// Close modal on ESC key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const messageModal = document.getElementById('message-modal');
    if (messageModal && messageModal.classList.contains('active')) {
      closeMessageModal();
    }
  }
});

// Make functions globally accessible
window.openMessageModal = openMessageModal;
window.closeMessageModal = closeMessageModal;

// ============================================
// SMOOTH SCROLL & ACTIVE NAV STATE
// ============================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Get all navigation links
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section, #home');

  console.log('Nav links found:', navLinks.length);
  console.log('Sections found:', sections.length);

  // Function to update active nav link
  function updateActiveNavLink() {
    let currentSection = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;

      // Account for navbar height offset (adjust based on your navbar height)
      if (window.scrollY >= (sectionTop - 150)) {
        currentSection = section.getAttribute('id');
      }
    });

    // Remove active class from all links
    navLinks.forEach(link => {
      link.classList.remove('active');

      // Add active class to current section link
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  }

  // Update active nav on scroll
  window.addEventListener('scroll', updateActiveNavLink);

  // Update active nav on page load
  setTimeout(updateActiveNavLink, 100);

  // Smooth scroll with offset for fixed navbar
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();

      const targetId = this.getAttribute('href');
      console.log('Clicked link with target:', targetId);

      const targetSection = document.querySelector(targetId);
      console.log('Target section found:', targetSection);

      if (targetSection) {
        const offsetTop = targetSection.offsetTop - 100; // Offset for fixed navbar

        console.log('Scrolling to:', offsetTop);

        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });

        // Close mobile sidebar if open
        if (window.closeSidebar) {
          window.closeSidebar();
        }
      }
    });
  });
});
