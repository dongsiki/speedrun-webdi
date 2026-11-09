  // ── 1장. 화면 준비: 3D 화면·카메라·흑백 점 인쇄 효과, 작은 계산 도구 ──
  const $ = id => document.getElementById(id);
  const canvas = $('world');
  const action = $('action');
  const reducedPreference = matchMedia('(prefers-reduced-motion:reduce-off)');
  let reduced = reducedPreference.matches;
  let motionChoice = null;
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const range = (n, a, b) => smooth((n - a) / (b - a));
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const C = { paper: 0xffffff, white: 0xffffff, ink: 0x000000, gray: 0xffffff, pale: 0xffffff, dark: 0x000000, line: 0x000000, stipple: 0xeeeeee };
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
    renderer.setClearColor(C.paper);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = false;
  } catch (err) {
    $('error').hidden = false;
    action.hidden = true;
    console.error('3D renderer could not start:', err);
    return;
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(51, 1, 0.05, 70);
  const elder=createElderModel(THREE),reflectedSelf=elder.object;
  canvas.dataset.character='imported-obra-dinn-3d';
  scene.add(reflectedSelf);
  // 2026-10-31: 1페 3회차(아이 맵, 엄마가 나오는 회차)에는 거울에 노인 대신 아이가 비친다(Codex 3D 아이 모델).
  const childSelf=window.MemoryPhaseModels&&MemoryPhaseModels.has('child')?MemoryPhaseModels.build(THREE,'child'):null;
  if(childSelf){childSelf.group.visible=false;scene.add(childSelf.group);}
  let mirrorChild=false;
  // Only the imported portrait has a lit material. The room keeps its white
  // paper planes. Front light separates its face, neck and shoulders;
  // no shadow maps or cast shadows are introduced.
  const portraitFill=new THREE.AmbientLight(0xffffff,.18);
  const portraitKey=new THREE.DirectionalLight(0xffffff,2.0);
  portraitKey.position.set(-.49,2.6,-5.0);
  portraitKey.target.position.set(-.49,1.9,-.1);
  scene.add(portraitFill,portraitKey,portraitKey.target);
  // Render flat, unlit geometry first, then print it through a two-color bitmap pass.
  const bitmapTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    generateMipmaps: false, depthBuffer: true, stencilBuffer: false
  });
  const outlineTarget = bitmapTarget.clone();
  const bitmapScene = new THREE.Scene();
  const bitmapCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bitmapMaterial = new THREE.ShaderMaterial({
    uniforms: { picture: { value: bitmapTarget.texture }, silhouettes: { value: outlineTarget.texture }, pixels: { value: new THREE.Vector2(1, 1) }, blinkTime: { value: 0 } },
    depthTest: false, depthWrite: false,
    vertexShader: `
      varying vec2 screenUV;
      void main() { screenUV = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: `
      precision highp float;
      uniform sampler2D picture;
      uniform sampler2D silhouettes;
      uniform vec2 pixels;
      uniform float blinkTime;
      varying vec2 screenUV;
      float bayer2(vec2 p) { return mod(2.0 * mod(p.x, 2.0) + 3.0 * mod(p.y, 2.0), 4.0); }
      float perceptual(float value) {
        return value <= 0.0031308 ? value * 12.92 : 1.055 * pow(value, 1.0 / 2.4) - 0.055;
      }
      void main() {
        vec2 pixel = floor(screenUV * pixels);
        vec3 color = texture2D(picture, (pixel + 0.5) / pixels).rgb;
        float brightness = perceptual(dot(color, vec3(0.2126, 0.7152, 0.0722)));
        float threshold = (4.0 * bayer2(pixel) + bayer2(floor(pixel / 2.0)) + 0.5) / 16.0;
        // Two actual colors. Light/dark masses stay solid, while the curved
        // transition of the lit portrait becomes ordered ink dots.
        float printedTone = smoothstep(0.16, 0.88, brightness);
        float ink = step(threshold, printedTone);
        // Outline only the visible silhouette of the task objects. Dither dots,
        // lettering and interior facets keep their original fine line weight.
        vec2 uv = (pixel + 0.5) / pixels;
        float outside = 0.0;
        float litNear = 0.0;
        float inside = texture2D(silhouettes, uv).r;
        for (int y = -2; y <= 2; y++) {
          for (int x = -2; x <= 2; x++) {
            float distanceSquared = float(x * x + y * y);
            if (distanceSquared <= 4.0) {
              vec4 sampleTexel = texture2D(silhouettes, uv + vec2(float(x), float(y)) / pixels);
              float sampleMask = sampleTexel.r;
              outside = max(outside, sampleMask);
              litNear = max(litNear, sampleTexel.r * sampleTexel.g);
              if (distanceSquared <= 1.0) inside = min(inside, sampleMask);
            }
          }
        }
        float outline = step(0.5, outside - inside);
        // 2026-10-13: 윤곽선 전체가 0.5초마다 검정 → 흰색 → 검정. 흰 차례엔 흰 선이 물건을 둘러 보이도록 바깥쪽 1px은 검정으로 남긴다.
        // 2026-10-27: 물건마다 정해진 횟수만 흰색으로 깜빡이고, 다 깜빡이면 검정 굵은 선으로 멈춘다(마스크 G 채널 = 지금 흰 차례).
        float lit = step(0.5, litNear);
        float rim = 0.0;
        for (int y = -3; y <= 3; y++) {
          for (int x = -3; x <= 3; x++) {
            float d = float(x * x + y * y);
            if (d > 4.0 && d <= 9.0) { vec4 rimTexel = texture2D(silhouettes, uv + vec2(float(x), float(y)) / pixels); rim = max(rim, rimTexel.r * rimTexel.g); }
          }
        }
        rim *= (1.0 - outside);
        gl_FragColor = vec4(vec3(mix(ink, lit, outline) * (1.0 - rim)), 1.0);
      }
    `
  });
  const bitmapQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bitmapMaterial);
  bitmapQuad.frustumCulled = false;
  bitmapScene.add(bitmapQuad);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const projected = new THREE.Vector3();
  const targetBounds = new THREE.Box3();
  const materialCache = new Map();
  function material(color, opacity = 1) {
    const key = color + ':' + opacity;
    if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: opacity < 1, opacity, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    return materialCache.get(key);
  }