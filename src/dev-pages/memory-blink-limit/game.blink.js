

(() => {
  'use strict';
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
        // 2026-10-26 개발자용 시안: 물건마다 정해진 횟수만 흰색으로 깜빡이고, 다 깜빡이면 검정 굵은 선으로 멈춘다.
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
  const edgeMaterial = new THREE.LineBasicMaterial({ color: C.ink });
  const fineMaterial = new THREE.LineBasicMaterial({ color: C.ink });
  // 깜빡임 횟수 제한: 물건(묶음)마다 마스크 재질을 따로 두고, 방에 들어와 보이기 시작한 때부터 센다.
  const blinkGroups = [];
  function emphasize(object, key = 'etc') {
    const group = { key, object, mask: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0, 0), side: THREE.DoubleSide }), start: null, flashes: 0, count: 0 };
    blinkGroups.push(group);
    object.traverse(part => {
      if (part.isMesh && part.material.visible) { part.userData.boldOutline = true; part.userData.blinkGroupIndex = blinkGroups.length - 1; }
    });
    return object;
  }
  function mesh(parent, geometry, mat, outline = true) {
    const object = new THREE.Mesh(geometry, mat);
    parent.add(object);
    if (outline) object.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 24), edgeMaterial));
    return object;
  }
  function box(parent, x, y, z, w, h, d, color = C.white, outline = true) {
    const object = mesh(parent, new THREE.BoxGeometry(w, h, d), material(color), outline);
    object.position.set(x, y, z);
    return object;
  }
  function line(parent, points, fine = false) {
    const object = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => V(...p))), fine ? fineMaterial : edgeMaterial);
    parent.add(object);
    return object;
  }
  function cylinder(parent, x, y, z, top, bottom, height, color = C.white, sides = 12, outline = true) {
    const object = mesh(parent, new THREE.CylinderGeometry(top, bottom, height, sides), material(color), outline);
    object.position.set(x, y, z);
    return object;
  }
  function rod(parent, a, b, radius = .025, color = C.ink, sides = 8) {
    const start = V(...a), end = V(...b), delta = end.clone().sub(start);
    const object = cylinder(parent, ...start.clone().add(end).multiplyScalar(.5).toArray(), radius, radius, delta.length(), color, sides, false);
    object.quaternion.setFromUnitVectors(V(0, 1, 0), delta.normalize());
    return object;
  }
  function torus(parent, x, y, z, radius, thickness, color = C.white, arc = Math.PI * 2, sides = 28) {
    const object = mesh(parent, new THREE.TorusGeometry(radius, thickness, 6, sides, arc), material(color), true);
    object.position.set(x, y, z);
    return object;
  }
  function dots(parent, points, size = .015, color = C.ink) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => V(...p)));
    const object = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size, sizeAttenuation: true }));
    parent.add(object);
    return object;
  }
  // Later mornings reuse the same paper, but the writing has worn away or been
  // corrected by an unknown hand. Coordinates are in the 768px note canvas.
  function wearNote(ctx, marks) {
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const [x, y, w, h] of marks.erase || []) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(x, y + h * .2);
      for (let i = 0; i <= 8; i++) ctx.lineTo(x + w * i / 8, y + (random() - .5) * h * .25);
      for (let i = 8; i >= 0; i--) ctx.lineTo(x + w * i / 8, y + h + (random() - .5) * h * .25);
      ctx.closePath(); ctx.fill();
      // A few surviving ink specks keep the erasure from reading as blank paper.
      ctx.fillStyle = '#000000';
      for (let i = 0; i < w * h / 900; i++) ctx.fillRect(x + random() * w, y + random() * h, 7, 7);
    }
    ctx.strokeStyle = '#000000';
    for (const [x, y, w] of marks.strike || []) {
      ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x + w * .55, y - 4); ctx.lineTo(x + w, y + 3); ctx.stroke();
    }
    ctx.fillStyle = '#000000';
    for (const [text, x, y, size, angle] of marks.write || []) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.font = '700 ' + size + 'px "Malgun Gothic", sans-serif'; ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
  function note(parent, x, y, z, title, tasks, width, height, rotation = -.025, marks = null) {
    // 2026-10-13: a tall card gets a tall sheet, so its letters keep their shape.
    const sheetHeight = Math.max(768, Math.round(768 * height / width));
    const surface = document.createElement('canvas'); surface.width = 768; surface.height = sheetHeight;
    const ctx = surface.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 768, sheetHeight);
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(13, 19); ctx.lineTo(749, 11); ctx.lineTo(758, sheetHeight - 22); ctx.lineTo(8, sheetHeight - 11); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#000000'; ctx.font = '700 77px "Malgun Gothic", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 65, 143, 635); ctx.lineWidth = 5; ctx.strokeText(title, 65, 143, 635);
    ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(63, 207); ctx.lineTo(702, 203); ctx.stroke();
    ctx.font = '700 96px "Malgun Gothic", sans-serif';
    let row = 325;
    for (const lines of tasks) {
      ctx.lineWidth = 12; ctx.strokeRect(61, row - 23, 39, 41);
      for (const text of lines) { ctx.fillText(text, 128, row, 581); ctx.lineWidth = 6; ctx.strokeText(text, 128, row, 581); row += 117; }
      row += 62;
    }
    if (marks) wearNote(ctx, marks);
    const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const card = mesh(parent, new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }), false);
    card.position.set(x, y, z); card.rotation.z = rotation;
    card.userData.sheet = surface; card.userData.size = [width, height];
    const pin = cylinder(card, 0, height / 2 - .042, .012, .014, .014, .016, C.ink, 8, false); pin.rotation.x = Math.PI / 2;
    return card;
  }
  function photo(parent, x, y, z, w = .36, h = .46) {
    const frame = new THREE.Group(); parent.add(frame); frame.position.set(x, y, z);
    box(frame, 0, 0, 0, w, h, .03, C.ink);
    box(frame, 0, 0, .019, w - .035, h - .035, .015, C.pale, false);
    // Only a sparse human silhouette, no raster reference or invented identity.
    cylinder(frame, -.04, .06, .034, .047, .047, .012, C.dark, 12, false).rotation.x = Math.PI / 2;
    const body = mesh(frame, new THREE.CircleGeometry(.092, 16, 0, Math.PI), material(C.dark), false); body.position.set(-.04, -.105, .044);
    return frame;
  }
  function room(parent, kitchen = false) {
    box(parent, 0, -.08, .4, 6, .16, 6, C.white);
    box(parent, 0, 1.65, -2.66, 6.12, 3.3, .12, C.white);
    box(parent, -3.06, 1.65, .4, .12, 3.3, 6.12, C.white);
    // A real opening in the right wall gives the automatic walk a destination.
    box(parent, 3.06, 1.65, -1.19, .12, 3.3, 3.06, C.white);
    box(parent, 3.06, 2.89, 1.0, .12, .82, 1.3, C.white);
    box(parent, 3.06, 1.65, 2.52, .12, 3.3, 1.74, C.white);
    box(parent, 3.8, 1.3, 1.0, .07, 2.6, 1.3, C.white);
    box(parent, 3.4, -.015, 1, .8, .06, 1.3, C.gray);
    box(parent, 3.00, 1.24, .33, .18, 2.48, .07, C.white);
    box(parent, 3.00, 1.24, 1.67, .18, 2.48, .07, C.white);
    box(parent, 3.00, 2.49, 1.0, .18, .07, 1.4, C.white);
    const floorPoints = [];
    for (let x = -3; x <= 3; x += 1) {
      line(parent, [[x, .007, -2.6], [x, .007, 3.4]], true);
      for (let z = -2.6; z <= 3.4; z += 1) floorPoints.push([x, .012, z]);
    }
    for (let z = -2.6; z <= 3.41; z += kitchen ? 1.5 : 1) line(parent, [[-3, .007, z], [3, .007, z]], true);
    dots(parent, floorPoints, .016, C.ink);
    line(parent, [[-3, .09, 3.4], [-3, .09, -2.58], [3, .09, -2.58]], true);
    // No cast shadows, fake pools of light, or orientation-based face shading.
    const cross = new THREE.Group(); parent.add(cross);
    line(cross, [[-2.94, 2.52, -.45], [-2.94, 2.52, .55]], true);
    line(cross, [[-2.94, 2.14, .05], [-2.94, 2.92, .05]], true);
  }

  function bathroom() {
    const group = new THREE.Group(); scene.add(group); room(group);
    box(group, -.6, .43, -2.09, 1.9, .8, .83, C.pale);
    box(group, -.6, .14, -2.05, 1.75, .11, .7, C.dark);
    box(group, -.6, .52, -1.666, .018, .56, .009, C.gray, false);
    rod(group, [-.82, .72, -1.654], [-.7, .72, -1.654], .012);
    rod(group, [-.5, .72, -1.654], [-.38, .72, -1.654], .012);
    // A basin built from separate rim and interior planes, genuinely hollow.
    const basin = new THREE.Group(); group.add(basin);
    box(basin, -.6, .91, -2.08, 2.04, .12, .91, C.white);
    box(basin, -.6, .976, -2.02, 1.24, .012, .52, C.white);
    box(basin, -.6, .997, -2.33, 1.38, .04, .14, C.white);
    box(basin, -.6, .997, -1.71, 1.38, .04, .14, C.white);
    box(basin, -1.29, .997, -2.02, .14, .04, .75, C.white);
    box(basin, .09, .997, -2.02, .14, .04, .75, C.white);
    cylinder(basin, -.6, .99, -2.02, .047, .047, .01, C.ink, 12, false);
    emphasize(basin,'basin');
    const tap = new THREE.Group(); group.add(tap); tap.position.set(-.6, .999, -2.34);
    cylinder(tap, 0, .025, 0, .077, .077, .05, C.ink);
    rod(tap, [0, .025, 0], [0, .25, 0], .038, C.gray);
    rod(tap, [0, .25, 0], [0, .25, .22], .038, C.gray);
    rod(tap, [0, .25, .22], [0, .20, .22], .036, C.gray);
    const handle = new THREE.Group(); tap.add(handle); handle.position.set(0, .275, 0);
    rod(handle, [0, 0, 0], [.18, .025, 0], .016, C.ink);
    emphasize(tap,'tap');
    const cabinet = new THREE.Group(); group.add(cabinet); cabinet.position.set(-.63, 2.04, -2.55);
    box(cabinet, 0, 0, .015, 1.91, 1.18, .03, C.white);
    for(const x of [-.93,.93])box(cabinet,x,0,.16,.06,1.18,.32,C.white);
    for(const y of [-.575,.575])box(cabinet,0,y,.16,1.91,.05,.32,C.white);
    for(const y of [-.20,.18])box(cabinet,0,y,.16,1.80,.035,.29,C.white);
    for(const [x,y,r,h] of [[-.60,-.40,.075,.30],[-.25,-.42,.06,.26],[.12,-.40,.08,.30],[-.53,.36,.055,.32]]){
      cylinder(cabinet,x,y,.16,r,r,h,C.white,10);
      cylinder(cabinet,x,y+h/2+.02,.16,r*.8,r*.8,.04,C.ink,10,false);
    }
    for(let i=0;i<3;i++)box(cabinet,.42,.225+i*.075,.16,.48,.065,.22,C.white);
    const mirrorDoor = new THREE.Group(); cabinet.add(mirrorDoor); mirrorDoor.position.set(-.95,0,.34);
    box(mirrorDoor,.95,0,0,1.91,1.18,.05,C.ink);
    box(mirrorDoor,.95,0,-.032,1.83,1.10,.012,C.white,false);
    const mirrorSurface=new Reflector(new THREE.PlaneGeometry(1.83,1.10),{
      textureWidth:1024,textureHeight:1024,multisample:0,clipBias:.003,color:new THREE.Color().setRGB(.5,.5,.5)
    });
    mirrorSurface.position.set(.95,0,.044);mirrorDoor.add(mirrorSurface);
    const reflect=mirrorSurface.onBeforeRender;
    mirrorSurface.onBeforeRender=function(...args){
      // The outline pass must not overwrite the mirror with mask materials.
      if(renderer.getRenderTarget()===outlineTarget)return;
      reflectedSelf.visible=true;
      try{reflect.apply(this,args);}finally{reflectedSelf.visible=false;}
    };
    line(mirrorDoor,[[.16,-.31,.043],[.59,.46,.043]],true);
    line(mirrorDoor,[[.32,-.31,.044],[.74,.46,.044]],true);
    rod(mirrorDoor,[1.79,-.38,.06],[1.79,-.17,.06],.019,C.ink);
    emphasize(mirrorDoor,'mirror');
    const mirrorHit=box(mirrorDoor,.95,0,.055,1.91,1.18,.08,C.white,false);
    mirrorHit.material=new THREE.MeshBasicMaterial({visible:false});
    box(group, -.63, 1.424, -2.4, 2.03, .06, .27, C.white);
    cylinder(group, -1.35, 1.55, -2.36, .06, .05, .19, C.white, 10);
    rod(group, [-1.365, 1.55, -2.36], [-1.39, 1.79, -2.36], .013, C.ink);
    box(group, -1.39, 1.8, -2.36, .04, .06, .025, C.gray, false);
    const bathNotes=[
      note(group, .99, 2.00, -2.58, '나가기 전에', [['수도 잠그기'], ['주방 가기']], 1.18, 1.08),
      // Round 3: someone has corrected the first task.
      note(group, .99, 2.00, -2.58, '나가기 전에', [['수도 잠그기'], ['주방 가기']], 1.18, 1.08, -.025, {strike:[[370,325,280]],write:[['틀기',300,640,150,-.07]]}),
      // Round 4: the verbs have worn away.
      note(group, .99, 2.00, -2.58, '나가기 전에', [['수도 잠그기'], ['주방 가기']], 1.18, 1.08, -.025, {erase:[[355,270,330,110],[120,450,215,110],[40,95,180,95]]})
    ];
    for(const [i,card] of bathNotes.entries())card.visible=i===0;
    // Geometric toilet: tank, bowl, dark recess and an open ring.
    box(group, 1.72, .79, -2.23, .63, .67, .30, C.white);
    box(group, 1.72, 1.15, -2.23, .69, .07, .34, C.white);
    const flushButton=box(group,1.90,1.198,-2.23,.17,.026,.11,C.white);
    emphasize(flushButton,'flush');
    const flushHit=box(group,1.90,1.22,-2.20,.29,.15,.26,C.white,false);
    flushHit.material=new THREE.MeshBasicMaterial({visible:false});
    const bowl = cylinder(group, 1.72, .33, -1.84, .32, .20, .51, C.white, 12); bowl.scale.z = 1.28;
    const inside = cylinder(group, 1.72, .594, -1.80, .24, .24, .015, C.dark, 14, false); inside.scale.z = 1.25;
    const seat = torus(group, 1.72, .61, -1.8, .282, .033, C.white); seat.rotation.x = -Math.PI / 2; seat.scale.y = 1.25;
    const bowlWater=new THREE.Group();group.add(bowlWater);bowlWater.position.set(1.72,.607,-1.8);
    const waterSurface=cylinder(bowlWater,0,0,0,.222,.222,.006,C.white,24,false);waterSurface.scale.z=1.25;
    const whirlpool=new THREE.Group();bowlWater.add(whirlpool);
    for(let j=0;j<3;j++)line(whirlpool,Array.from({length:35},(_,i)=>{
      const a=i/34*Math.PI*1.22+j*Math.PI*2/3,r=.20-i/34*.13;
      return [Math.cos(a)*r,.006,Math.sin(a)*r*1.25];
    }),true);
    const lotion=new THREE.Group();group.add(lotion);lotion.position.set(.24,1.035,-2.12);
    cylinder(lotion,0,.14,0,.085,.105,.28,C.white,12);
    cylinder(lotion,0,.295,0,.045,.06,.045,C.white,10);
    box(lotion,0,.15,.096,.105,.115,.012,C.white);
    line(lotion,[[-.026,.165,.105],[.027,.165,.105]],true);
    const pump=new THREE.Group();lotion.add(pump);pump.position.y=.355;
    cylinder(pump,0,-.021,0,.019,.019,.07,C.ink,8,false);
    box(pump,0,.018,.055,.14,.036,.23,C.white);
    box(pump,0,-.005,.161,.045,.042,.026,C.ink,false);
    const tray=cylinder(lotion,0,-.035,.34,.107,.11,.026,C.white,20);tray.scale.z=.72;
    const cream=new THREE.Group();lotion.add(cream);cream.position.set(0,.32,.175);cream.visible=false;
    const creamPath=new THREE.QuadraticBezierCurve3(V(0,0,0),V(.017,-.07,.15),V(0,-.326,.165));
    mesh(cream,new THREE.TubeGeometry(creamPath,18,.012,6,false),material(C.white),true);
    const dollop=mesh(lotion,new THREE.SphereGeometry(.036,12,8),material(C.white),true);
    dollop.position.set(0,-.01,.34);dollop.scale.set(1,.52,1);dollop.visible=false;
    emphasize(lotion,'lotion');
    const lotionHit=box(lotion,0,.19,.04,.31,.49,.31,C.white,false);
    lotionHit.material=new THREE.MeshBasicMaterial({visible:false});
    rod(group, [2.46, .98, -2.18], [2.46, .98, -1.94], .018, C.ink);
    const roll = cylinder(group, 2.46, .94, -2.06, .08, .08, .15, C.white, 12); roll.rotation.x = Math.PI / 2;
    rod(group, [-2.4, 1.38, -2.50], [-1.84, 1.38, -2.50], .018, C.ink);
    box(group, -2.09, 1.1, -2.45, .33, .56, .026, C.gray);
    line(group, [[-2.22, .86, -2.43], [-1.97, .86, -2.43]], true);
    box(group, -.6, .018, -.98, 1.45, .023, .53, C.white);
    for (let x = -1.18; x <= .02; x += .10) line(group, [[x, .032, -1.19], [x, .032, -.77]], true);
    const water = new THREE.Group(); group.add(water);
    const waterSegments = [];
    for (let i = 0; i < 7; i++) {
      waterSegments.push(line(water, [[-.6 + ((i % 3) - 1) * .012, 1.177 - i * .025, -2.115], [-.6 + ((i % 3) - 1) * .012, 1.162 - i * .025, -2.115]], true));
    }
    const ripples = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 36 }, (_, j) => V(Math.cos(j / 36 * Math.PI * 2) * .10, 0, Math.sin(j / 36 * Math.PI * 2) * .07))), fineMaterial);
      ring.position.set(-.6, .986, -2.115); water.add(ring); ripples.push(ring);
    }
    const hit = box(tap, 0, .14, .08, .46, .36, .46, C.white, false); hit.material = new THREE.MeshBasicMaterial({ visible: false });
    const approachHit=box(group,-.6,1.48,-1.98,2.2,2.25,.85,C.white,false);
    approachHit.material=new THREE.MeshBasicMaterial({visible:false});
    approachHit.userData.interaction='approach';
    const props={mirrorDoor,flushButton,bowlWater,whirlpool,pump,cream,dollop,approachHit,hits:{flush:flushHit,lotion:lotionHit,mirror:mirrorHit}};
    for(const [id,target] of Object.entries(props.hits))target.userData.interaction=id;
    return { group, tap, handle, water, waterSegments, ripples, hit, props, notes: bathNotes, name: '화장실', label: '수도꼭지', reminder: '벽의 메모. 나가기 전에: 수도 잠그기, 주방 가기.',
      reminders: ['벽의 메모. 나가기 전에: 수도 잠그기, 주방 가기.','벽의 메모. 나가기 전에: 수도 잠그기, 주방 가기. 잠그기에 줄이 그어지고 틀기라고 고쳐 적혀 있다.','벽의 메모. 전에: 수도, 가기. 나머지 글씨는 지워졌다.'] };
  }

  function kitchen() {
    const group = new THREE.Group(); scene.add(group); room(group, true);
    box(group, -1.04, .46, -2.19, 2.80, .86, .69, C.pale);
    box(group, -1.04, .925, -2.15, 2.94, .08, .84, C.white);
    for (let x of [-1.97, -1.04, -.11]) {
      box(group, x, .48, -1.832, .86, .77, .027, C.white);
      rod(group, [x - .10, .74, -1.80], [x + .10, .74, -1.80], .012, C.ink);
    }
    box(group, -.57, .979, -2.15, 1.04, .024, .60, C.gray);
    for (const [x, z, r] of [[-.85, -2.16, .15], [-.30, -2.16, .12]]) {
      const ring = torus(group, x, 1.005, z, r, .01, C.ink); ring.rotation.x = -Math.PI / 2;
      line(group, [[x - r - .03, 1.01, z], [x + r + .03, 1.01, z]]);
      line(group, [[x, 1.01, z - r - .03], [x, 1.01, z + r + .03]]);
    }
    box(group, -1.42, 2.07, -2.55, 1.74, 1.15, .06, C.ink);
    box(group, -1.42, 2.07, -2.507, 1.67, 1.08, .025, C.stipple, false);
    box(group, -1.42, 2.07, -2.48, .038, 1.09, .04, C.white);
    box(group, -1.42, 2.02, -2.478, 1.67, .038, .04, C.white);
    box(group, -1.42, 1.467, -2.37, 1.89, .06, .4, C.white);
    // The lower fridge door hinges outward; a shallow white interior stays visible.
    box(group, 1.58, 1.12, -2.50, .97, 2.24, .15, C.white);
    for(const x of [1.12,2.04])box(group,x,1.12,-2.17,.07,2.24,.74,C.white);
    box(group,1.58,.035,-2.17,.97,.07,.74,C.white);
    box(group,1.58,2.205,-2.17,.97,.07,.74,C.white);
    box(group,1.58,1.43,-2.17,.90,.055,.72,C.white);
    box(group,1.58,.69,-2.16,.88,.035,.66,C.white);
    cylinder(group,1.42,.82,-2.27,.09,.09,.24,C.white,10);
    cylinder(group,1.74,.79,-2.30,.12,.10,.17,C.white,8);
    box(group,1.58,1.82,-1.749,.91,.71,.025,C.white);
    rod(group,[1.22,1.58,-1.70],[1.22,1.83,-1.70],.014,C.ink);
    const fridgeDoor=new THREE.Group();group.add(fridgeDoor);fridgeDoor.position.set(2.035,0,-1.744);
    box(fridgeDoor,-.455,.73,0,.91,1.36,.055,C.white);
    rod(fridgeDoor,[-.81,.99,.050],[-.81,1.31,.050],.014,C.ink);
    const fridgeDoorHit=box(fridgeDoor,-.455,.73,.065,.91,1.36,.11,C.white,false);
    fridgeDoorHit.material=new THREE.MeshBasicMaterial({visible:false});fridgeDoorHit.userData.interaction='fridge';emphasize(fridgeDoor,'fridge');
    const fridgeHit=box(group,1.58,.73,-1.70,.91,1.36,.09,C.white,false);
    fridgeHit.material=new THREE.MeshBasicMaterial({visible:false});fridgeHit.userData.interaction='fridge';
    const morningNote=note(group,.29,2.00,-2.58,'아침에',[['차 따르기','식사하기']],1.18,1.08,.022);
    const secondNote=note(group,.29,2.00,-2.58,'아침에',[['냉장고 열기','차·식사하기']],1.18,1.08,.022);
    secondNote.visible=false;
    const thirdNote=note(group,.29,2.00,-2.58,'아침에',[['차 따르기','식사하기']],1.18,1.08,.022,{write:[['두 잔!',150,650,150,-.06]]});
    const fourthNote=note(group,.29,2.00,-2.58,'아침에',[['냉장고 열기','차·식사하기']],1.18,1.08,.022,{erase:[[120,270,330,110],[390,390,300,110]]});
    thirdNote.visible=fourthNote.visible=false;
    const kitchenNotes=[morningNote,secondNote,thirdNote,fourthNote];
    const fridgeFood=new THREE.Group();group.add(fridgeFood);fridgeFood.position.set(1.58,.735,-1.97);
    box(fridgeFood,0,.012,0,.54,.025,.37,C.ink);
    for(let i=0;i<3;i++){
      const piece=new THREE.Group();fridgeFood.add(piece);piece.position.set((i-1)*.13,.062,i===1?-.025:.022);
      box(piece,0,0,0,.12,.075,.15,C.white);
      line(piece,[[-.044,.041,-.047],[.040,.041,.045]],true);
    }
    emphasize(fridgeFood,'fridgeFood');
    const fridgeFoodHit=box(group,1.58,.815,-1.97,.66,.27,.47,C.white,false);
    fridgeFoodHit.material=new THREE.MeshBasicMaterial({visible:false});fridgeFoodHit.userData.interaction='takeFood';
    const table = new THREE.Group(); group.add(table); table.position.set(-.35, 0, -.94);
    box(table, 0, .945, 0, 2.16, .09, .94, C.white);
    for (const x of [-.91, .91]) for (const z of [-.33, .33]) box(table, x, .44, z, .058, .88, .058, C.gray);
    box(table, 0, .847, .0, 1.93, .14, .075, C.gray);
    const chair = new THREE.Group(); group.add(chair); chair.position.set(-.90, 0, -.05); chair.rotation.y = Math.PI * .75;
    box(chair, 0, .45, 0, .53, .05, .55, C.gray);
    for (const x of [-.22, .22]) for (const z of [-.22, .22]) box(chair, x, .22, z, .041, .43, .041, C.ink);
    for (const x of [-.22, .22]) box(chair, x, .77, -.25, .04, .62, .04, C.ink);
    box(chair, 0, .94, -.25, .50, .24, .04, C.white);
    const chairHit=box(chair,0,.64,-.09,.68,1.04,.69,C.white,false);
    chairHit.material=new THREE.MeshBasicMaterial({visible:false});chairHit.userData.interaction='chair';emphasize(chair,'chair');
    // A faceted kettle assembled as one group so the pour is a spatial action.
    const kettle = new THREE.Group(); group.add(kettle); kettle.position.set(-.63, .991, -1.04);
    cylinder(kettle, 0, .18, 0, .18, .23, .34, C.white, 10);
    cylinder(kettle, 0, .36, 0, .105, .18, .06, C.gray, 10);
    cylinder(kettle, 0, .398, 0, .047, .047, .035, C.ink, 10, false);
    rod(kettle, [.14, .19, 0], [.35, .32, 0], .047, C.white, 8);
    cylinder(kettle, .355, .32, 0, .036, .036, .004, C.ink, 8, false).rotation.z = -.8;
    const handle = torus(kettle, -.145, .22, 0, .20, .02, C.ink, Math.PI * 1.22, 18); handle.rotation.z = Math.PI * .40;
    const cup = new THREE.Group(); group.add(cup); cup.position.set(.35, .997, -1.04);
    cylinder(cup, 0, -.003, 0, .235, .235, .018, C.white, 24);
    // Open mug wall and independently rising tea surface.
    const outer = mesh(cup, new THREE.CylinderGeometry(.125, .096, .225, 16, 1, true), material(C.white)); outer.position.y = .122;
    const inner = cylinder(cup, 0, .022, 0, .101, .10, .016, C.white, 16, false);
    const rim = torus(cup, 0, .237, 0, .119, .009, C.white); rim.rotation.x = -Math.PI / 2;
    const mugHandle = torus(cup, .136, .134, 0, .072, .014, C.white, Math.PI * 1.7, 20); mugHandle.rotation.z = -Math.PI * .83;
    const liquid = cylinder(cup, 0, .03, 0, .10, .10, .006, C.ink, 24, false);
    liquid.name = 'tea';
    emphasize(kettle,'kettle'); emphasize(cup,'cup');
    const plate=new THREE.Group();group.add(plate);plate.position.set(-.10,.998,-.62);
    cylinder(plate,0,.014,0,.215,.215,.028,C.white,18);
    const plateRim=torus(plate,0,.030,0,.19,.008,C.ink);plateRim.rotation.x=-Math.PI/2;
    const bites=[];
    for(let i=0;i<3;i++){
      const bite=new THREE.Group();plate.add(bite);bite.position.set((i-1)*.084,.07,(i===1?-.012:.022));
      box(bite,0,0,0,.088,.055,.12,C.white);
      line(bite,[[-.03,.03,-.04],[.022,.03,.015]],true);
      bites.push(bite);
    }
    emphasize(plate,'plate');
    const foodHit=box(plate,0,.06,0,.43,.18,.43,C.white,false);
    foodHit.material=new THREE.MeshBasicMaterial({visible:false});foodHit.userData.interaction='food';
    const spoon = rod(table, [.81, 1.005, .23], [1.0, 1.005, -.02], .012, C.ink, 6);
    cylinder(table, .99, 1.011, -.01, .028, .028, .004, C.gray, 12).scale.z = 1.4;
    box(group, -.21, 1.017, -.91, .24, .012, .24, C.pale);
    line(group, [[-.3, 1.025, -.88], [-.13, 1.025, -.97]], true);
    photo(group, .39, 1.20, -2.34, .30, .37).rotation.z = -.025;
    // From round 3 a second, cold cup waits at the table end where no chair stands;
    // four worn marks on the floor show where a chair used to be.
    const otherCup=cup.clone();otherCup.position.set(-1.18,.997,-.72);otherCup.rotation.y=Math.PI*.15;group.add(otherCup);
    otherCup.getObjectByName('tea').position.y=.17;
    otherCup.visible=false;
    const chairMarks=new THREE.Group();group.add(chairMarks);chairMarks.position.set(-1.95,0,-.78);chairMarks.rotation.y=Math.PI*.5;chairMarks.visible=false;
    for(const x of [-.22,.22])for(const z of [-.22,.22])dots(chairMarks,Array.from({length:16},(_,i)=>[x+((i%4)-1.5)*.022,.016,z+(Math.floor(i/4)-1.5)*.022]),.026,C.ink);
    const jar = cylinder(group, -2.21, 1.14, -2.24, .09, .09, .34, C.pale, 10);
    cylinder(group, -2.21, 1.321, -2.24, .095, .095, .025, C.ink, 10);
    const pour = new THREE.Group(); group.add(pour); pour.visible = false;
    const pourPoints = dots(pour, Array.from({ length: 6 }, (_, i) => [.35, 1.335 - i * .018, -1.04]), .014, C.ink);
    const steam = new THREE.Group(); cup.add(steam); steam.visible = false;
    for (let i = 0; i < 3; i++) {
      line(steam, Array.from({ length: 16 }, (_, j) => [(i - 1) * .055 + Math.sin(j * .48 + i) * .018, .27 + j * .014, 0]), true);
    }
    const hit = box(kettle, .04, .23, 0, .64, .53, .40, C.white, false); hit.material = new THREE.MeshBasicMaterial({ visible: false });
    return { group, chairHit, fridgeDoor, fridgeDoorHit, fridgeHit, fridgeFood, fridgeFoodHit, morningNote, secondNote, notes: kitchenNotes, otherCup, chairMarks, foodHit, bites, kettle, cup, liquid, pour, pourPoints, steam, hit, name: '주방', label: '주전자', reminder: '벽의 메모. 아침에: 차 따르기, 식사하기.',
      reminders: ['벽의 메모. 아침에: 차 따르기, 식사하기.','벽의 메모. 아침에: 냉장고 열기, 차 따르기, 식사하기.','벽의 메모. 아침에: 차 따르기, 식사하기. 옆에 두 잔이라고 적혀 있다.','벽의 메모. 아침에: 열기, 차·식사. 나머지 글씨는 지워졌다.'] };
  }

  function entryway(){
    const group=new THREE.Group();scene.add(group);
    box(group,0,-.08,.25,3.40,.16,6.0,C.white);
    box(group,0,2.75,.25,3.40,.12,6.0,C.white);
    box(group,-1.76,1.38,.25,.12,2.76,6.0,C.white);
    box(group,1.76,1.38,.25,.12,2.76,6.0,C.white);
    box(group,0,1.38,3.25,3.52,2.76,.12,C.white);
    box(group,-1.26,1.38,-2.75,.95,2.76,.12,C.white);
    box(group,1.26,1.38,-2.75,.95,2.76,.12,C.white);
    box(group,0,2.51,-2.75,1.57,.50,.12,C.white);
    box(group,0,.075,-2.72,1.58,.15,.23,C.white);
    for(const x of [-.77,.77])box(group,x,1.38,-2.68,.09,2.76,.16,C.ink);
    box(group,0,2.74,-2.68,1.63,.08,.16,C.ink);
    // The door opens onto darkness before the next awakening in bed.
    box(group,0,1.30,-3.18,1.55,2.58,.08,C.ink);
    const door=new THREE.Group();group.add(door);door.position.set(-.71,0,-2.58);
    box(door,.71,1.38,0,1.42,2.70,.085,C.white);
    box(door,.71,2.18,.052,1.17,.68,.014,C.white);
    box(door,.71,.77,.052,1.17,1.02,.014,C.white);
    const peephole=cylinder(door,.71,1.72,.057,.026,.026,.015,C.ink,12,false);peephole.rotation.x=Math.PI/2;
    const knob=cylinder(door,1.24,1.13,.09,.055,.055,.09,C.ink,12);knob.rotation.x=Math.PI/2;
    emphasize(door,'door');
    const hit=box(group,0,1.38,-2.46,1.48,2.66,.18,C.white,false);
    hit.material=new THREE.MeshBasicMaterial({visible:false});
    box(group,0,.022,-1.73,.85,.024,.53,C.white);
    for(let x=-.30;x<=.31;x+=.15)line(group,[[x,.041,-1.95],[x,.041,-1.50]],true);
    for(let z=-2.72;z<=3.22;z+=.75)line(group,[[-1.68,.012,z],[1.68,.012,z]],true);
    for(let x of [-1.65,-.82,0,.82,1.65])line(group,[[x,.012,-2.72],[x,.012,3.21]],true);
    const rack=new THREE.Group();group.add(rack);rack.position.set(-1.25,0,-.35);
    for(const y of [.14,.44])box(rack,0,y,0,.58,.045,.96,C.white);
    for(const x of [-.26,.26])for(const z of [-.43,.43])box(rack,x,.26,z,.035,.50,.035,C.ink);
    for(const [x,z] of [[-.24,.36],[.17,.42]]){
      const shoe=mesh(group,new THREE.SphereGeometry(.14,8,5),material(C.white));
      shoe.position.set(x,.115,z+1.0);shoe.scale.set(.8,.48,1.5);
    }
    // Coat and low shoes make the narrow passage read as a lived-in entrance.
    const coat=new THREE.Group();group.add(coat);coat.position.set(1.34,1.27,-.93);
    const coatShape=new THREE.Shape();
    coatShape.moveTo(-.13,.42);coatShape.lineTo(.13,.42);coatShape.lineTo(.21,.29);
    coatShape.lineTo(.35,.16);coatShape.lineTo(.27,-.10);coatShape.lineTo(.19,-.04);
    coatShape.lineTo(.22,-.51);coatShape.lineTo(-.22,-.51);coatShape.lineTo(-.19,-.04);
    coatShape.lineTo(-.27,-.10);coatShape.lineTo(-.35,.16);coatShape.lineTo(-.21,.29);
    coatShape.closePath();
    mesh(coat,new THREE.ShapeGeometry(coatShape),material(C.ink),false);
    cylinder(coat,0,.49,0,.045,.045,.07,C.ink,8,false);
    const stitch=new THREE.LineBasicMaterial({color:C.white});
    const lapel=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-.10,.39,.01),V(0,.16,.01),V(.10,.39,.01)]),stitch);coat.add(lapel);
    for(const y of [.02,-.15,-.32])cylinder(coat,0,y,.012,.012,.012,.008,C.white,8,false).rotation.x=Math.PI/2;
    rod(group,[1.53,1.55,-1.40],[1.53,1.55,-.50],.017,C.ink);
    for(const z of [-1.23,-.78]){
      const hook=rod(group,[1.53,1.55,z],[1.37,1.38,z],.012,C.ink);
    }
    const entryNote=note(group,1.22,1.98,-2.53,'나갈 때',[['문 열기']],.74,.96,-.02);
    // Round 4, first visit: the door is a way into the kitchen, not out.
    const detourNote=note(group,1.22,1.98,-2.53,'나갈 때',[['문 열기']],.74,.96,-.02,{strike:[[60,150,300]],write:[['밥 먹으러',70,600,140,-.06]]});
    detourNote.visible=false;
    return {group,door,hit,notes:[entryNote,detourNote],name:'현관',label:'현관문 열기',reminder:'현관 벽의 메모. 나갈 때: 문 열기.',
      detourReminder:'현관 벽의 메모. 나갈 때에 줄이 그어지고 밥 먹으러라고 고쳐 적혀 있다. 문 열기.'};
  }

  function bedroom(){
    const group=new THREE.Group();scene.add(group);
    box(group,0,-.08,.15,5.4,.16,5.9,C.white);
    box(group,0,2.60,.15,5.4,.12,5.9,C.white);
    for(const x of [-2.76,2.76])box(group,x,1.30,.15,.12,2.6,5.9,C.white);
    box(group,0,1.30,3.14,5.52,2.6,.12,C.white);
    box(group,-1.42,1.30,-2.82,2.56,2.6,.12,C.white);
    box(group,1.42,1.30,-2.82,2.56,2.6,.12,C.white);
    box(group,0,2.32,-2.79,1.17,.57,.16,C.white);
    for(const x of [-.63,.63])box(group,x,1.15,-2.76,.085,2.30,.12,C.ink);
    box(group,0,2.33,-2.75,1.34,.07,.12,C.ink);
    box(group,0,1.12,-2.84,1.10,2.20,.04,C.ink);
    box(group,0,.10,-2.71,1.06,.04,.40,C.white);
    for(const z of [-2.4,-1.4,-.4,.6,1.6,2.6])line(group,[[-2.69,.008,z],[2.69,.008,z]],true);
    for(const x of [-2.5,-1.25,0,1.25,2.5])line(group,[[x,.009,-2.78],[x,.009,3.02]],true);
    const bed=new THREE.Group();group.add(bed);bed.position.set(-.22,0,.96);
    // Real bed topology, uniformly scaled: mattress, wooden frame, feet,
    // a continuous cover with a folded white cuff, and a separate pillow.
    const importedBed=/* @json assets/models/memory-game-imported-bed-d312f94a19.json */ null;
    for(const part of importedBed.parts){
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));
      if(part.indices)geometry.setIndex(part.indices);
      if(part.normals)geometry.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3));
      else geometry.computeVertexNormals();
      const tone=part.material==='metal'?C.ink:part.material==='carpet'?0xbcbcbc:C.white;
      let clothMaterial=material(tone);
      if(part.material==='carpet'){
        // Print gentle form tones into the existing one-bit pass. No cast
        // shadows; the portrait light must not turn the bed into a black mass.
        const shades=[],normals=geometry.attributes.normal;
        for(let i=0;i<normals.count;i++){
          const up=Math.abs(normals.getY(i));
          const brightness=clamp(.45+.32*up+.06*normals.getZ(i));
          const linear=Math.pow((brightness+.055)/1.055,2.4);
          shades.push(linear,linear,linear);
        }
        geometry.setAttribute('color',new THREE.Float32BufferAttribute(shades,3));
        clothMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
      }
      const piece=mesh(bed,geometry,clothMaterial);
      piece.name='Kenney '+part.name+' '+part.material;
    }
    emphasize(bed,'bed');
    const stand=box(group,-1.55,.47,1.32,.61,.76,.53,C.white);
    box(group,-1.55,.88,1.32,.67,.06,.58,C.white);
    cylinder(group,-1.55,1.17,1.32,.105,.105,.45,C.white,9);
    cylinder(group,-1.55,1.40,1.32,.22,.12,.10,C.white,10);
    box(group,1.95,1.79,-2.72,.65,.67,.025,C.white);
    line(group,[[1.64,1.64,-2.695],[2.25,1.64,-2.695]],true);
    const hit=box(bed,0,.49,-.23,1.15,.30,1.72,C.white,false);
    hit.material=new THREE.MeshBasicMaterial({visible:false});
    return {group,hit,name:'침실',label:'침대에서 일어나기',reminder:'침대에 누워 있습니다.'};
  }

  const stages = [bathroom(), kitchen(), entryway(), bedroom()];
  let propState=RoutineProps.create();
  const propIds=['flush','lotion','mirror'];
  let propVisual=RoutineProps.sample(propState);
  const maskForeground = new THREE.MeshBasicMaterial({ color: C.white, side: THREE.DoubleSide });
  const maskOccluder = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.DoubleSide });
  const maskHidden = new THREE.MeshBasicMaterial({ visible: false });
  const outlineObjects = [];
  scene.traverse(object => {
    // Keep invisible click targets out of the mask; keep all visible surfaces
    // as depth-tested occluders so outlines cannot reveal objects through walls.
    if (!object.material || !object.material.visible) return;
    outlineObjects.push({ object, original: object.material, mask: object.isMesh ? (object.userData.boldOutline ? (object.userData.blinkGroupIndex !== undefined ? blinkGroups[object.userData.blinkGroupIndex].mask : maskForeground) : maskOccluder) : maskHidden });
  });
  let stageIndex = 3;
  let round = 1;
  // Each new morning drifts further: round 3 corrects the notes and sets a second
  // cup; round 4 wears the notes away, tangles the doors and loosens the mirror.
  const lastRound = 4;
  const foodInFridge = () => round === 2 || round === 4;
  let entryDetour = false;
  const mirrorHistory = [], laggedView = { position: V(0, 0, 0), quaternion: new THREE.Quaternion() };
  let mirrorFrozen = false;
  let sinkFocused=false;
  let seated=false,fridgeOpen=false,fridgeAmount=0,foodCollected=false,poured=false,eaten=false,pendingRoom=1;
  let reflectionAmount=0,reflectionSway=0,reflectionSmile=0;
  let phase = 'ready';
  let elapsed = 0, clock = 0, lastTime = performance.now();
  let actionValue = 0;
  let width = 1, height = 1;
  let lookX = 0, lookY = 0, desiredX = 0, desiredY = 0;
  let drag = null;
  let cameraStart = V(1.55, 1.82, 3.40);
  let cameraTarget = V(-.30, 1.27, -1.55);
  let phaseStartPosition = cameraStart.clone(), phaseStartTarget = cameraTarget.clone();
  let keyboardActivation = false;
  let soundChoice = null;
  let audio = null;
  let waterVolume = null;
  const scheduledSounds = new Set();

  function soundUI() {
    const on = Boolean(audio && soundChoice !== false);
    $('sound').setAttribute('aria-pressed', String(on));
    $('sound').setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기');
    $('sound').title = on ? '소리 끄기' : '소리 켜기';
  }
  function motionUI() {
    $('motion').setAttribute('aria-pressed', String(!reduced));
    $('motion').setAttribute('aria-label', reduced ? '전체 이동 연출 켜기' : '이동 연출 줄이기');
    $('motion').title = reduced ? '전체 이동 연출 켜기' : '이동 연출 줄이기';
  }
  function startAudio() {
    if (soundChoice === false) return;
    try {
      if (!audio) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        audio = new Context();
        const data = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
        const samples = data.getChannelData(0);
        let filtered = 0;
        for (let i = 0; i < samples.length; i++) { filtered = .82 * filtered + .18 * (Math.random() * 2 - 1); samples[i] = filtered; }
        const source = audio.createBufferSource(); source.buffer = data; source.loop = true;
        const filter = audio.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 820;
        waterVolume = audio.createGain(); waterVolume.gain.value = 0;
        source.connect(filter); filter.connect(waterVolume); waterVolume.connect(audio.destination); source.start();
      }
      audio.resume().catch(() => {});
      soundUI();
    } catch (_) { audio = null; soundUI(); }
  }
  function tone(frequency, duration, volume = .05, type = 'sine') {
    if (!audio || soundChoice === false || document.hidden) return;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * .63), audio.currentTime + duration);
    gain.gain.setValueAtTime(.00001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, audio.currentTime + .012);
    gain.gain.exponentialRampToValueAtTime(.00001, audio.currentTime + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration + .02);
    scheduledSounds.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); scheduledSounds.delete(oscillator); };
  }
  function transition(next) {
    phase = next; elapsed = 0; document.body.dataset.phase = next;
    syncTargets();
    canvas.setAttribute('aria-busy', String(['waking','rising','leavingBed','approaching','reflection','sitting','acting','eating','leaving','leavingKitchen','closing','opening'].includes(next)));
  }
  function syncTargets(){
    const far=stageIndex===0&&!sinkFocused,ready=phase==='ready';
    const mainHidden=far||(stageIndex===1&&(!seated||poured));
    action.hidden=mainHidden;action.disabled=!ready||mainHidden;
    $('approach').hidden=!far;$('approach').disabled=!ready||!far;
    for(const id of propIds){
      const hidden=stageIndex!==0||(far&&id!=='flush');
      $('prop-'+id).hidden=hidden;$('prop-'+id).disabled=!ready||hidden;
    }
    for(const [id,hidden] of [['chair',stageIndex!==1||seated||(foodInFridge()&&!foodCollected)],['fridge',stageIndex!==1||seated],['fridge-food',stageIndex!==1||seated||!foodInFridge()||!fridgeOpen||foodCollected],['food',stageIndex!==1||!seated||eaten]]){
      $(id).hidden=hidden;$(id).disabled=!ready||hidden;
    }
    canvas.dataset.sinkDistance=stageIndex!==0?'away':sinkFocused?'close':phase==='approaching'?'approaching':'far';
  }
  function blink(amount) {
    if (reduced) {
      $('eyelid-top').style.transform = 'scaleY(0)'; $('eyelid-bottom').style.transform = 'scaleY(0)';
      $('reduced-cut').style.opacity = String(amount);
    } else {
      $('reduced-cut').style.opacity = '0';
      $('eyelid-top').style.transform = 'scaleY(' + amount + ')';
      $('eyelid-bottom').style.transform = 'scaleY(' + amount + ')';
    }
  }
  function setRoom(index) {
    stageIndex = index;
    for (const group of blinkGroups) { group.start = null; group.flashes = 0; }
    stages.forEach((s, i) => s.group.visible = i === index);
    $('room-name').textContent = stages[index].name;
    action.setAttribute('aria-label', stages[index].label);
    $('room-note').textContent = index===2?(entryDetour?stages[2].detourReminder:stages[2].reminder):stages[index].reminders?stages[index].reminders[index===0?Math.max(0,round-2):round-1]:stages[index].reminder;
    if(index===2){stages[2].door.rotation.y=0;stages[2].notes[0].visible=!entryDetour;stages[2].notes[1].visible=entryDetour;}
    for(const id of propIds)$('prop-'+id).hidden=index!==0;
    canvas.setAttribute('aria-label', stages[index].name + '. 드래그하거나 방향키로 둘러봅니다. Tab으로 물건을 선택하고 Enter 또는 Space로 사용합니다.');
    $('caption').textContent = stages[index].name;
    desiredX = desiredY = lookX = lookY = 0;
    frameCamera();
    syncTargets();
  }
  function sinkPose(){
    const narrow=width/height<.85;
    return {position:V(-.49,1.96,narrow?.60:-.35),target:V(-.60,1.60,-2.24)};
  }
  function seatPose(){return {position:V(-.90,1.28,-.05),target:V(-.16,1.04,-1.13)};}
  function frameCamera() {
    const narrow = width / height < .85;
    camera.fov = narrow ? stageIndex===1?(seated?75:85):61 : 51;
    cameraStart = narrow ? stageIndex===1?V(.65,2.08,4.45):V(1.12,2.08,4.45) : V(1.55,1.82,3.40);
    cameraTarget = stageIndex === 0 ? V(narrow ? .30 : -.15, 1.29, -1.56) : stageIndex===1?V(narrow?.05:-.25,1.27,-1.30):V(0,1.34,-2.60);
    // Take two short steps into each room without changing eye height or lens.
    const forward = cameraTarget.clone().sub(cameraStart); forward.y = 0;
    cameraStart.addScaledVector(forward.normalize(), 1.15);
    if(stageIndex===0&&sinkFocused){const pose=sinkPose();cameraStart=pose.position;cameraTarget=pose.target;}
    if(stageIndex===1&&seated){const pose=seatPose();cameraStart=pose.position;cameraTarget=pose.target;}
    if(stageIndex===2){cameraStart=V(0,1.62,2.00);cameraTarget=V(0,1.34,-2.60);}
    if(stageIndex===3){cameraStart=V(-.08,1.12,2.10);cameraTarget=V(-.30,.42,-1.40);camera.fov=narrow?70:58;}
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  function resize() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    // Keep native detail in narrow windows; use a deliberate 800px bitmap on desktop.
    const bitmapWidth = Math.max(1, Math.min(Math.round(width), 800));
    const bitmapHeight = Math.max(1, Math.round(bitmapWidth * height / width));
    bitmapTarget.setSize(bitmapWidth, bitmapHeight);
    outlineTarget.setSize(bitmapWidth, bitmapHeight);
    bitmapMaterial.uniforms.pixels.value.set(bitmapWidth, bitmapHeight);
    frameCamera();
  }
  function reset(startRoom=3) {
    for (const oscillator of scheduledSounds) { try { oscillator.stop(); } catch (_) {} }
    scheduledSounds.clear();
    if (drag) { try { canvas.releasePointerCapture(drag.id); } catch (_) {} drag = null; }
    stages[0].handle.rotation.y = 0; stages[0].water.visible = true;
    sinkFocused=false;
    seated=fridgeOpen=foodCollected=poured=eaten=false;fridgeAmount=0;pendingRoom=1;
    reflectionAmount=reflectionSway=reflectionSmile=0;canvas.dataset.reflectionShot='idle';
    propState=RoutineProps.create();updateProps(0);
    stages[1].kettle.position.set(-.63, .991, -1.04); stages[1].kettle.rotation.z = 0;
    stages[1].liquid.position.y = .03; stages[1].pour.visible = false; stages[1].steam.visible = false;
    stages[1].fridgeDoor.rotation.y=0;
    stages[1].notes.forEach((card,i)=>card.visible=i===round-1);
    stages[0].notes.forEach((card,i)=>card.visible=i===Math.max(0,round-2));
    stages[1].otherCup.visible=round===3;stages[1].chairMarks.visible=round>=3;
    stages[1].fridgeFood.visible=foodInFridge();
    for(const [i,bite] of stages[1].bites.entries()){bite.visible=!foodInFridge();bite.position.set((i-1)*.084,.07,i===1?-.012:.022);}
    entryDetour=false;mirrorFrozen=false;mirrorHistory.length=0;
    stages[2].door.rotation.y=0;
    $('fridge').setAttribute('aria-expanded','false');$('fridge').setAttribute('aria-label','냉장고 열기');
    actionValue = 0;
    blink(0); setRoom(startRoom); transition('ready');
    camera.position.copy(cameraStart); camera.lookAt(cameraTarget); camera.updateMatrixWorld();
    if (keyboardActivation) canvas.focus({ preventScroll: true });
  }
  function wakeAtBed(focusCanvas=false){
    keyboardActivation=false;
    reset(3);
    blink(1);transition('waking');
    $('caption').textContent='침대에서 눈을 뜹니다.';
    if(focusCanvas)canvas.focus({preventScroll:true});
  }
  function beginApproach(event){
    if(phase!=='ready'||stageIndex!==0||sinkFocused)return;
    keyboardActivation=Boolean(event&&event.type==='click'&&event.detail===0);
    phaseStartPosition.copy(camera.position);
    camera.getWorldDirection(phaseStartTarget).multiplyScalar(4).add(camera.position);
    desiredX=desiredY=lookX=lookY=0;
    startAudio();transition('approaching');
    $('caption').textContent='세면대 앞으로 다가갑니다.';
  }
  $('approach').addEventListener('click',beginApproach);
  function activate(event) {
    if (phase !== 'ready') return;
    if(stageIndex===3){
      keyboardActivation=Boolean(event&&event.type==='click'&&event.detail===0);
      phaseStartPosition.copy(camera.position);camera.getWorldDirection(phaseStartTarget).multiplyScalar(4).add(camera.position);
      desiredX=desiredY=lookX=lookY=0;startAudio();transition('rising');
      $('caption').textContent='침대에서 일어납니다.';
      return;
    }
    if(RoutineProps.intent('main',stageIndex,phase,sinkFocused)==='approach'){beginApproach(event);return;}
    if(stageIndex===1&&(!seated||poured))return;
    keyboardActivation = Boolean(event && event.type === 'click' && event.detail === 0);
    startAudio();
    desiredX = desiredY = 0;
    transition('acting'); actionValue = 0;
    $('caption').textContent = stageIndex === 0 ? '수도꼭지를 돌리고 있습니다.' : stageIndex===1?'차를 따르고 있습니다.':'현관문을 엽니다.';
    tone(stageIndex === 0 ? 820 : stageIndex===1?1100:300, .08, .018, 'triangle');
  }
  action.addEventListener('click', activate);
  function sit(event){
    if(phase!=='ready'||stageIndex!==1||seated||(foodInFridge()&&!foodCollected))return;
    keyboardActivation=Boolean(event&&event.type==='click'&&event.detail===0);
    phaseStartPosition.copy(camera.position);camera.getWorldDirection(phaseStartTarget).multiplyScalar(4).add(camera.position);
    desiredX=desiredY=lookX=lookY=0;startAudio();transition('sitting');
    $('caption').textContent='의자에 앉습니다.';
  }
  function toggleFridge(){
    if(phase!=='ready'||stageIndex!==1||seated)return;
    fridgeOpen=!fridgeOpen;startAudio();tone(fridgeOpen?260:190,.12,.022,'triangle');
    $('fridge').setAttribute('aria-expanded',String(fridgeOpen));
    $('fridge').setAttribute('aria-label',fridgeOpen?'냉장고 닫기':'냉장고 열기');
    $('caption').textContent=fridgeOpen?'냉장고 안쪽이 보입니다.':'냉장고를 닫았습니다.';
    syncTargets();
  }
  function takeFood(event){
    if(phase!=='ready'||stageIndex!==1||!foodInFridge()||seated||!fridgeOpen||foodCollected)return;
    keyboardActivation=Boolean(event&&event.type==='click'&&event.detail===0);
    foodCollected=true;stages[1].fridgeFood.visible=false;
    for(const bite of stages[1].bites)bite.visible=true;
    startAudio();tone(440,.12,.025,'triangle');
    $('caption').textContent='냉장고에서 음식을 꺼내 식탁에 놓았습니다.';
    syncTargets();
    if(keyboardActivation)$('chair').focus({preventScroll:true});
  }
  function eat(event){
    if(phase!=='ready'||stageIndex!==1||!seated||eaten)return;
    keyboardActivation=Boolean(event&&event.type==='click'&&event.detail===0);
    desiredX=desiredY=0;startAudio();transition('eating');
    $('caption').textContent='식탁의 음식을 먹습니다.';
  }
  $('chair').addEventListener('click',sit);
  $('fridge').addEventListener('click',toggleFridge);
  $('fridge-food').addEventListener('click',takeFood);
  $('food').addEventListener('click',eat);
  function activateProp(id,event){
    if(RoutineProps.intent(id,stageIndex,phase,sinkFocused)==='approach'){beginApproach(event);return;}
    if(phase!=='ready'||stageIndex!==0||!RoutineProps.activate(propState,id))return;
    keyboardActivation=Boolean(event&&event.type==='click'&&event.detail===0);startAudio();
    $('caption').textContent=id==='flush'?'변기 물이 내려갑니다.':id==='lotion'?'로션이 나옵니다.':propState.mirrorTarget?'거울 뒤 선반장이 열립니다.':'거울 선반장을 닫습니다.';
    tone(id==='flush'?135:id==='lotion'?330:200,id==='flush'?.8:.10,id==='flush'?.025:.015,'triangle');
    updateProps(0);
  }
  for(const id of propIds)$('prop-'+id).addEventListener('click',event=>activateProp(id,event));
  $('restart').addEventListener('click', event => { round=1;wakeAtBed(event.detail===0); });
  $('sound').addEventListener('click', () => {
    soundChoice = !(audio && soundChoice !== false);
    if (soundChoice) startAudio();
    if (waterVolume) waterVolume.gain.setTargetAtTime(0, audio.currentTime, .05);
    soundUI();
  });
  $('motion').addEventListener('click', () => {
    reduced = !reduced;
    motionChoice = reduced;
    desiredX = desiredY = 0;
    motionUI();
    if (phase === 'ready') $('caption').textContent = reduced ? '이동 연출을 줄였습니다.' : '걸음과 눈 깜빡임으로 다음 방에 갑니다.';
  });
  function hitAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    scene.updateMatrixWorld(true);
    let targets;
    if(stageIndex===0){targets=[stages[0].hit,...Object.values(stages[0].props.hits)];if(!sinkFocused)targets.push(stages[0].props.approachHit);}
    else if(stageIndex===1){
      targets=seated?[...(!poured?[stages[1].hit]:[]),...(!eaten?[stages[1].foodHit]:[])]:[
        ...((!foodInFridge()||foodCollected)?[stages[1].chairHit]:[]),
        stages[1].fridgeDoorHit,
        ...((foodInFridge()&&fridgeOpen&&!foodCollected)?[stages[1].fridgeFoodHit]:[stages[1].fridgeHit])
      ];
    }
    else targets=[stages[stageIndex].hit];
    const hit=raycaster.intersectObjects(targets,false)[0];
    return hit?(hit.object.userData.interaction||'main'):null;
  }
  canvas.addEventListener('pointerdown', event => {
    if (phase !== 'ready' || drag || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) {
      if (phase === 'ready' && event.pointerType !== 'touch') canvas.style.cursor = hitAt(event.clientX, event.clientY) ? 'pointer' : 'grab';
      return;
    }
    if (drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) drag.moved = true;
    desiredX = clamp(desiredX - dx * .0013, -.24, .24);
    desiredY = clamp(desiredY + dy * .0011, -.14, .14);
    drag.x = event.clientX; drag.y = event.clientY;
  });
  function stopDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const clicked = !drag.moved && event.type === 'pointerup' && hitAt(event.clientX, event.clientY);
    try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    drag = null;
    if(clicked==='approach')beginApproach(event);
    else if(clicked==='main')activate(event);
    else if(clicked==='chair')sit(event);
    else if(clicked==='fridge')toggleFridge();
    else if(clicked==='takeFood')takeFood(event);
    else if(clicked==='food')eat(event);
    else if(clicked)activateProp(clicked,event);
  }
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('lostpointercapture', () => drag = null);
  canvas.addEventListener('keydown', event => {
    if (phase !== 'ready') return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'ArrowLeft') desiredX = clamp(desiredX - .06, -.24, .24);
      if (event.key === 'ArrowRight') desiredX = clamp(desiredX + .06, -.24, .24);
      if (event.key === 'ArrowUp') desiredY = clamp(desiredY + .04, -.14, .14);
      if (event.key === 'ArrowDown') desiredY = clamp(desiredY - .04, -.14, .14);
    } else if (event.key === 'Escape') { desiredX = desiredY = 0; }
  });
  reducedPreference.addEventListener('change', event => {
    if (motionChoice === null) { reduced = event.matches; desiredX = desiredY = 0; motionUI(); }
  });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    lastTime = performance.now(); drag = null;
    if (waterVolume && document.hidden) waterVolume.gain.setTargetAtTime(0, audio.currentTime, .03);
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); $('error').hidden = false; action.disabled = true;
    $('approach').disabled=true;
    for(const id of propIds)$('prop-'+id).disabled=true;
    for(const id of ['chair','fridge','food'])$(id).disabled=true;
    if (waterVolume) waterVolume.gain.setTargetAtTime(0, audio.currentTime, .03);
  });
  canvas.addEventListener('webglcontextrestored', () => { $('error').hidden = true; wakeAtBed(); });

  function updateProps(dt){
    if(stageIndex===0)RoutineProps.advance(propState,dt,reduced);
    propVisual=RoutineProps.sample(propState,reduced);
    const p=stages[0].props,v=propVisual;
    p.flushButton.position.y=1.198-v.flushPress*.021;
    p.bowlWater.position.y=.607-v.drain*.058;
    p.whirlpool.rotation.y=reduced?0:v.swirlAngle;
    p.whirlpool.scale.setScalar(v.flushActive?.98-v.drain*.76:.7);
    p.pump.position.y=.355-v.pumpPress*.052;
    p.cream.position.y=.32-v.pumpPress*.052;
    p.cream.visible=v.cream;p.cream.scale.set(1,v.creamLength,Math.max(.03,v.creamLength));
    p.dollop.visible=v.dollop;p.dollop.scale.set(1+(v.doses-1)*.25,.52+(v.doses-1)*.14,1+(v.doses-1)*.25);
    p.mirrorDoor.rotation.y=v.mirrorAngle;
    $('prop-flush').setAttribute('aria-busy',String(propState.flush!==null));
    $('prop-lotion').setAttribute('aria-busy',String(propState.lotion!==null));
    $('prop-mirror').setAttribute('aria-expanded',String(Boolean(propState.mirrorTarget)));
    $('prop-mirror').setAttribute('aria-label',propState.mirrorTarget?'거울 수납장 닫기':'거울 수납장 열기');
    Object.assign(canvas.dataset,{flush:propState.flush===null?'idle':'running',flushCount:String(propState.flushCount),lotion:propState.lotion===null?'idle':'running',pumpCount:String(propState.pumpCount),mirror:propState.mirror>.999?'open':propState.mirror<.001?'closed':'moving'});
  }
  function updateKitchen(dt){
    fridgeAmount+=(Number(fridgeOpen)-fridgeAmount)*Math.min(1,dt/(reduced?.12:.44));
    if(Math.abs(Number(fridgeOpen)-fridgeAmount)<.001)fridgeAmount=Number(fridgeOpen);
    stages[1].fridgeDoor.rotation.y=1.55*smooth(fridgeAmount);
    canvas.dataset.fridge=fridgeAmount>.98?'open':fridgeAmount<.02?'closed':'moving';
    canvas.dataset.round=String(round);
    canvas.dataset.foodLocation=eaten?'eaten':!foodInFridge()||foodCollected?'table':'fridge';
    canvas.dataset.secondCup=String(stages[1].otherCup.visible);
    canvas.dataset.entryDetour=String(entryDetour);
    canvas.dataset.seated=String(seated);
    canvas.dataset.poured=String(poured);
    canvas.dataset.eaten=String(eaten);
  }
  function updateWater() {
    const bathroom = stages[0];
    if (bathroom.water.visible) {
      const strength = stageIndex === 0 && phase === 'acting' ? 1 - range(actionValue, .50, 1) : 1;
      bathroom.water.scale.x = Math.max(.15, strength);
      // Scale around the stream center instead of the room origin.
      bathroom.water.position.x = -.6 * (1 - bathroom.water.scale.x);
      bathroom.waterSegments.forEach((segment, i) => segment.position.y = reduced ? 0 : -((clock * .23 + i * .023) % .026));
      bathroom.ripples.forEach((ring, i) => {
        const size = reduced ? .7 + i * .3 : .3 + ((clock * .8 + i / 3) % 1);
        ring.scale.set(size * strength, 1, size * strength);
      });
    }
    const kitchen = stages[1];
    if (kitchen.pour.visible) {
      // Derive the stream from the moving spout, keeping every drop attached to the actual pour.
      kitchen.kettle.updateWorldMatrix(true, false);
      const outlet = kitchen.kettle.localToWorld(V(.355, .32, 0));
      const positions = kitchen.pourPoints.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const t = (i / positions.count + (reduced ? 0 : clock * 1.8)) % 1;
        positions.setXYZ(i, outlet.x + (.35 - outlet.x) * t, outlet.y + (1.229 - outlet.y) * t, outlet.z);
      }
      positions.needsUpdate = true;
    }
    if (kitchen.steam.visible && !reduced) kitchen.steam.position.x = Math.sin(clock * .7) * .006;
    if (waterVolume) {
      let gain = 0;
      if (soundChoice !== false && !document.hidden) {
        if (stageIndex === 0 && bathroom.water.visible) gain = .055 * (phase === 'acting' ? 1 - range(actionValue, .45, 1) : 1);
        if(stageIndex===0&&propVisual.flushActive)gain+=.065*(.25+propVisual.swirl);
        if (stageIndex === 1 && kitchen.pour.visible) gain = .040;
      }
      waterVolume.gain.setTargetAtTime(gain, audio.currentTime, .10);
    }
  }
  function updateAction() {
    if (stageIndex === 0) {
      actionValue = clamp(elapsed / 1.35);
      stages[0].handle.rotation.y = -smooth(actionValue) * Math.PI / 2;
      if (actionValue >= 1) {
        stages[0].water.visible = false;
        tone(620, .10, .027, 'triangle');
        // Round 4: the bathroom door opens onto the entrance instead of the kitchen.
        entryDetour=round===lastRound;pendingRoom=entryDetour?2:1;
        if(entryDetour)mirrorFrozen=true;
        phaseStartPosition.copy(camera.position); phaseStartTarget.copy(cameraTarget);
        transition('leaving');
        $('caption').textContent = '물을 잠갔다. 주방으로 간다.';
      }
    } else if(stageIndex===1){
      actionValue = clamp(elapsed / 3.7);
      const lift = range(actionValue, 0, .20) * (1 - range(actionValue, .79, 1));
      const tilt = range(actionValue, .18, .34) * (1 - range(actionValue, .75, .88));
      stages[1].kettle.position.set(-.63 + .52 * lift, .991 + .31 * lift, -1.04);
      stages[1].kettle.rotation.z = -.66 * tilt;
      stages[1].pour.visible = actionValue > .34 && actionValue < .76;
      stages[1].liquid.position.y = .03 + .164 * range(actionValue, .34, .77);
      if (actionValue >= 1) {
        stages[1].steam.visible = true;
        stages[1].pour.visible = false;
        tone(940, .17, .015, 'triangle');
        poured=true;
        // 2026-10-13: tea and food in either order; the second one ends breakfast.
        if(eaten){phaseStartPosition.copy(camera.position);phaseStartTarget.copy(cameraTarget);transition('leavingKitchen');$('caption').textContent='차를 따르고 현관으로 갑니다.';}
        else{transition('ready');$('caption').textContent='찻잔에 차를 따랐습니다. 식탁의 음식을 먹을 수 있습니다.';if(keyboardActivation)$('food').focus({preventScroll:true});}
      }
    } else {
      actionValue=clamp(elapsed/1.15);
      stages[2].door.rotation.y=-1.35*smooth(actionValue);
      if(actionValue>=1&&entryDetour){
        // The front door leads back into the kitchen; the second visit is a real exit.
        entryDetour=false;pendingRoom=1;transition('closing');
      } else if(actionValue>=1){
        const focusCanvas=keyboardActivation;
        round=Math.min(lastRound,round+1);
        wakeAtBed(focusCanvas);
      }
    }
  }
  let lastStep = -1;
  function updateCamera(dt) {
    const lerp = reduced ? 1 : 1 - Math.exp(-dt * 11);
    lookX += (desiredX - lookX) * lerp; lookY += (desiredY - lookY) * lerp;
    const target = cameraTarget.clone();
    reflectionAmount=reflectionSway=reflectionSmile=0;
    if(phase==='waking'){
      const t=clamp(elapsed/(reduced?.18:.90));
      blink(1-smooth(t));
      camera.position.copy(cameraStart);
      if(t>=1){blink(0);transition('ready');$('caption').textContent='침대에서 눈을 떴습니다.';}
    } else if(phase==='rising'){
      const t=clamp(elapsed/(reduced?.18:1.45)),u=smooth(t);
      camera.position.lerpVectors(phaseStartPosition,V(-.93,1.62,.52),u);
      if(!reduced)camera.position.y+=Math.sin(t*Math.PI*4)*.012*Math.sin(t*Math.PI);
      target.lerpVectors(phaseStartTarget,V(0,1.42,-2.73),u);
      if(t>=1){phaseStartPosition.copy(camera.position);phaseStartTarget.copy(target);transition('leavingBed');$('caption').textContent='침실 문으로 걸어갑니다.';}
    } else if(phase==='leavingBed'){
      const t=clamp(elapsed/(reduced?.28:1.45)),u=smooth(t);
      camera.position.lerpVectors(phaseStartPosition,V(0,1.58,-1.92),u);
      if(!reduced)camera.position.y+=Math.sin(t*Math.PI*6)*.012*Math.sin(t*Math.PI);
      target.lerpVectors(phaseStartTarget,V(0,1.40,-3.72),u);
      if(t>=1){pendingRoom=0;transition('closing');}
    } else if(phase==='approaching'){
      const t=clamp(elapsed/(reduced?.18:1.85)),u=smooth(t),pose=sinkPose();
      camera.position.lerpVectors(phaseStartPosition,pose.position,u);
      if(!reduced)camera.position.y+=Math.sin(t*Math.PI*6)*.012*Math.sin(t*Math.PI);
      target.lerpVectors(phaseStartTarget,pose.target,u);
      if(t>=1){
        sinkFocused=true;frameCamera();transition('reflection');
        canvas.dataset.reflectionShot='approach';
        $('caption').textContent='거울 속 자신의 얼굴을 가까이 봅니다.';
      }
    } else if(phase==='reflection'){
      const shot=ReflectionIntro.sample(elapsed,reduced),pose=sinkPose();
      camera.position.copy(pose.position);camera.position.z-=shot.camera*.80;
      target.copy(pose.target).lerp(V(-.50,1.96,-2.24),shot.camera);
      reflectionAmount=shot.figure;reflectionSway=shot.sway;reflectionSmile=shot.smile;
      canvas.dataset.reflectionShot=shot.shot;
      if(shot.done){
        reflectionAmount=reflectionSway=reflectionSmile=0;camera.position.copy(pose.position);target.copy(pose.target);
        canvas.dataset.reflectionShot='idle';transition('ready');
        $('caption').textContent='거울을 보던 시선이 돌아왔습니다. 이제 물건을 사용할 수 있습니다.';
        if(keyboardActivation)action.focus({preventScroll:true});
      }
    } else if(phase==='sitting'){
      const t=clamp(elapsed/(reduced?.18:1.75)),u=smooth(t),pose=seatPose();
      camera.position.lerpVectors(phaseStartPosition,pose.position,u);
      if(!reduced)camera.position.y+=Math.sin(t*Math.PI*5)*.012*Math.sin(t*Math.PI);
      target.lerpVectors(phaseStartTarget,pose.target,u);
      if(t>=1){seated=true;frameCamera();transition('ready');$('caption').textContent='의자에 앉았습니다.';if(keyboardActivation)action.focus({preventScroll:true});}
    } else if(phase==='eating'){
      const biteTime=reduced?.75:2.40,t=clamp(elapsed/biteTime);
      stages[1].bites.forEach((bite,i)=>{
        const segment=clamp(t*3-i);
        bite.visible=segment<1;
        bite.position.set((i-1)*.084-.62*range(segment,.12,.88),.07+.42*range(segment,.12,.88),(i===1?-.012:.022)+.48*range(segment,.12,.88));
      });
      camera.position.copy(cameraStart);
      target.lerpVectors(cameraTarget,V(-.10,1.00,-.62),.25*Math.sin(t*Math.PI));
      if(t>=1){
        eaten=true;
        if(poured){phaseStartPosition.copy(camera.position);phaseStartTarget.copy(cameraTarget);transition('leavingKitchen');$('caption').textContent='식사를 마치고 현관으로 갑니다.';}
        else{transition('ready');$('caption').textContent='음식을 먹었습니다. 주전자로 차를 따를 수 있습니다.';if(keyboardActivation)action.focus({preventScroll:true});}
      }
    } else if (phase === 'leaving') {
      const walkTime = reduced ? .32 : 2.35;
      const t = clamp((elapsed - .22) / walkTime);
      const u = smooth(t);
      if (!reduced) {
        camera.position.lerpVectors(phaseStartPosition, V(2.36, 1.73, 1.65), u);
        camera.position.y += Math.sin(t * Math.PI * 7) * .016 * Math.sin(t * Math.PI);
        target.lerpVectors(phaseStartTarget, V(3.70, 1.51, 1.02), range(t, 0, .68));
        const step = Math.floor(t * 4);
        if (step !== lastStep && t > .03 && t < .95) { tone(step % 2 ? 95 : 108, .13, .045); lastStep = step; }
      }
      if (t >= 1) { transition('closing'); lastStep = -1; }
    } else if(phase==='leavingKitchen'){
      const t=clamp(elapsed/(reduced?.28:2.15)),u=smooth(t);
      camera.position.lerpVectors(phaseStartPosition,V(2.30,1.62,1.49),u);
      if(!reduced)camera.position.y+=Math.sin(t*Math.PI*6)*.013*Math.sin(t*Math.PI);
      target.lerpVectors(phaseStartTarget,V(3.60,1.45,1.00),u);
      if(t>=1){pendingRoom=2;transition('closing');}
    } else if (phase === 'closing') {
      blink(smooth(elapsed / .20));
      // Swap only after the eyelids cover the entire frame, including a short black hold.
      if (elapsed >= .36) {
        setRoom(pendingRoom); camera.position.copy(cameraStart).add(reduced ? V(0, 0, 0) : V(0, 0, .23));
        transition('opening');
      }
      return;
    } else if (phase === 'opening') {
      blink(1 - smooth(elapsed / .39));
      camera.position.copy(cameraStart);
      if (!reduced) camera.position.z += .23 * (1 - range(elapsed, 0, .70));
      if (elapsed >= .75) {
        blink(0); transition('ready');
        if (keyboardActivation) (stageIndex===0?$('approach'):stageIndex===1?(foodInFridge()&&!foodCollected?$('fridge'):$('chair')):action).focus({ preventScroll: true });
      }
    } else {
      camera.position.copy(cameraStart);
    }
    if (phase === 'ready') { target.x += lookX * 5; target.y += lookY * 4; }
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }
  function positionTarget(target,button) {
    targetBounds.setFromObject(target);
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const x of [targetBounds.min.x, targetBounds.max.x]) {
      for (const y of [targetBounds.min.y, targetBounds.max.y]) {
        for (const z of [targetBounds.min.z, targetBounds.max.z]) {
          projected.set(x, y, z).project(camera);
          const px = (projected.x * .5 + .5) * width, py = (-projected.y * .5 + .5) * height;
          left = Math.min(left, px); right = Math.max(right, px);
          top = Math.min(top, py); bottom = Math.max(bottom, py);
        }
      }
    }
    button.style.left = (left + right) / 2 + 'px'; button.style.top = (top + bottom) / 2 + 'px';
    button.style.width = Math.max(44, right - left) + 'px'; button.style.height = Math.max(44, bottom - top) + 'px';
  }
  function positionAction(){
    positionTarget(stages[stageIndex].hit,action);
    if(stageIndex===0){
      positionTarget(stages[0].props.approachHit,$('approach'));
      for(const id of propIds)positionTarget(stages[0].props.hits[id],$('prop-'+id));
    }else if(stageIndex===1){
      positionTarget(stages[1].chairHit,$('chair'));
      positionTarget(stages[1].fridgeHit,$('fridge'));
      positionTarget(stages[1].fridgeFoodHit,$('fridge-food'));
      positionTarget(stages[1].foodHit,$('food'));
    }
  }
  // 2026-10-13: the wall notes blurred into dots in the 800px one-bit print.
  // Each sheet is laid over its card as a page layer, warped to the card's
  // projected corners, so the handwriting stays sharp at any distance.
  const noteLayer=document.createElement('div');noteLayer.id='note-layer';noteLayer.setAttribute('aria-hidden','true');canvas.after(noteLayer);
  const noteSheets=[],noteCorner=new THREE.Vector3(),noteRay=new THREE.Raycaster(),noteProbe=new THREE.Vector3();
  // A page layer cannot be hidden behind a kettle, so a card that anything
  // covers (seated at the table, an open cabinet door) keeps its 3D print.
  function noteCovered(card,w,h){
    for(const [fx,fy] of [[0,0],[-.42,.42],[.42,.42],[-.42,-.42],[.42,-.42],[0,.42],[0,-.42]]){
      noteProbe.set(fx*w,fy*h,0);card.localToWorld(noteProbe);
      const toward=noteProbe.clone().sub(camera.position),distance=toward.length();
      noteRay.set(camera.position,toward.normalize());noteRay.far=distance-.01;
      for(const hit of noteRay.intersectObject(stages[stageIndex].group,true)){
        if(!hit.object.isMesh||!hit.object.material.visible)continue;
        let part=hit.object,shown=true,own=false;
        for(;part;part=part.parent){if(part===card)own=true;if(!part.visible)shown=false;}
        if(shown&&!own)return true;
      }
    }
    return false;
  }
  stages.forEach((stage,index)=>(stage.notes||[]).forEach(card=>{noteLayer.append(card.userData.sheet);noteSheets.push({card,sheet:card.userData.sheet,index});}));
  function positionNotes(){
    let shown=0;
    for(const {card,sheet,index} of noteSheets){
      let show=index===stageIndex&&card.visible;const points=[];
      if(show){
        const [w,h]=card.userData.size;card.updateWorldMatrix(true,false);
        for(const [x,y] of [[-w/2,h/2],[w/2,h/2],[w/2,-h/2],[-w/2,-h/2]]){
          noteCorner.set(x,y,0);card.localToWorld(noteCorner);noteCorner.project(camera);
          if(!(noteCorner.z>-1&&noteCorner.z<1)){show=false;break;}
          points.push([(noteCorner.x*.5+.5)*width,(-noteCorner.y*.5+.5)*height]);
        }
        if(show&&noteCovered(card,w,h))show=false;
      }
      sheet.style.display=show?'block':'none';
      if(!show)continue;
      shown++;
      // Square-to-quad homography (Heckbert), scaled to the sheet's pixel size.
      const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=points;
      const sx=x0-x1+x2-x3,sy=y0-y1+y2-y3,dx1=x1-x2,dx2=x3-x2,dy1=y1-y2,dy2=y3-y2,det=dx1*dy2-dx2*dy1||1e-9;
      const g=(sx*dy2-dx2*sy)/det,k=(dx1*sy-sx*dy1)/det,W=sheet.width,H=sheet.height;
      const a=x1-x0+g*x1,b=x3-x0+k*x3,d=y1-y0+g*y1,e=y3-y0+k*y3;
      sheet.style.transform='matrix3d('+[a/W,d/W,0,g/W,b/H,e/H,0,k/H,0,0,1,0,x0,y0,0,1].map(n=>+n.toFixed(6)).join(',')+')';
    }
    canvas.dataset.notesShown=String(shown);
  }
  // Round 4: the reflection follows half a second late, and once the tap is shut
  // it stays at the sink instead of following the player out.
  function mirrorView(){
    if(round!==lastRound||reduced)return camera;
    if(!mirrorFrozen){
      mirrorHistory.push({time:clock,position:camera.position.clone(),quaternion:camera.quaternion.clone()});
      while(mirrorHistory.length>1&&mirrorHistory[1].time<=clock-.55)mirrorHistory.shift();
      laggedView.position.copy(mirrorHistory[0].position);laggedView.quaternion.copy(mirrorHistory[0].quaternion);
    }
    canvas.dataset.mirror4=mirrorFrozen?'stayed':'late';
    return laggedView;
  }
  // 필요한 물건 = 3번, 필요 없는 물건 = 1~2번 (todo.md 10/13 기록 기준).
  const BLINK_RULES = {
    bed: 3, basin: 3, tap: 3, chair: 3, kettle: 3, cup: 3, plate: 3, door: 3,
    fridge: () => foodInFridge() ? 3 : 2,
    fridgeFood: 3,
    flush: 1, mirror: 1, lotion: 2,
  };
  // 냉장고 안 음식은 문이 열렸을 때부터 센다(닫힌 문 뒤에서 횟수를 다 써 버리지 않게).
  const BLINK_READY = { fridgeFood: () => fridgeOpen };
  const shownInWorld = object => { for (let o = object; o; o = o.parent) if (!o.visible) return false; return true; };
  function updateBlinkMasks() {
    const t = performance.now() / 1000, report = [];
    for (const group of blinkGroups) {
      const rule = BLINK_RULES[group.key];
      group.count = typeof rule === 'function' ? rule() : (rule ?? 3);
      // 눈을 뜨는 중·방 이동 중에는 세지 않는다. 조작할 수 있게 된(ready) 때부터 센다.
      const ready = phase === 'ready' && shownInWorld(group.object) && (!BLINK_READY[group.key] || BLINK_READY[group.key]());
      if (ready && group.start === null) group.start = t;
      let lit = 0;
      if (group.start !== null) {
        const age = t - group.start;
        // 0.5초 검정 → 0.5초 흰색을 1번으로 센다. 정해진 횟수가 끝나면 검정 선으로 멈춘다.
        group.flashes = Math.min(group.count, Math.floor(age + .5));
        lit = age < group.count && age % 1 >= .5 ? 1 : 0;
      }
      group.mask.color.setRGB(1, lit, 0);
      if (shownInWorld(group.object)) report.push(group.key + ':' + group.flashes + '/' + group.count);
    }
    canvas.dataset.blinkCounts = report.join(' ');
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = document.hidden ? 0 : Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    if (document.hidden || !$('error').hidden) return;
    elapsed += dt; clock += dt;
    if (phase === 'acting') updateAction();
    updateProps(dt);updateKitchen(dt);updateWater();updateCamera(dt);positionAction();positionNotes();
    // Actual face volumes, eye line and shoulder/head turns follow the camera.
    const pose=elder.update(mirrorView(),clock,reduced,reflectionAmount,reflectionSway,reflectionSmile);
    canvas.dataset.reflectionLean=reflectionAmount.toFixed(3);
    canvas.dataset.reflectionSmile=reflectionSmile.toFixed(3);
    canvas.dataset.headYaw=pose.yaw.toFixed(3);canvas.dataset.headPitch=pose.pitch.toFixed(3);
    renderer.setRenderTarget(bitmapTarget);
    renderer.render(scene, camera);
    updateBlinkMasks();
    outlineObjects.forEach(({ object, mask }) => object.material = mask);
    renderer.setClearColor(C.ink);
    renderer.setRenderTarget(outlineTarget);
    renderer.render(scene, camera);
    outlineObjects.forEach(({ object, original }) => object.material = original);
    renderer.setClearColor(C.paper);
    renderer.setRenderTarget(null);
    // 사용자 PC는 Windows 애니메이션 효과가 꺼져 있어(동작 줄이기) 예전 반짝임이 멈춰 있었다. 이 반짝임은 쓸 수 있는 물건 표시라 늘 켠다(초당 2번, 선만).
    bitmapMaterial.uniforms.blinkTime.value = performance.now() / 1000;
    renderer.render(bitmapScene, bitmapCamera);
  }
  resize(); wakeAtBed(); soundUI(); motionUI(); requestAnimationFrame(frame);
})();
