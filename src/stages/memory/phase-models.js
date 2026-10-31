// 기억 스테이지 3D 엄마·아이(Codex 제작 모델, 2026-10-31 Claude Code가 연결).
// 엄마 = 아이 맵에 서 있는 엄마·양치해 주는 팔·차려 주는 팔. 아이 = 1페 3회차 거울에 비치는 나.
// 모델: assets/models/memory-phase/*.json, 텍스처: assets/images/memory-phase/*-model-atlas.png(phase-images.js에 묶임).
(function (root) {
  const DATA = {
    mom: /* @jsonraw assets/models/memory-phase/mom-model.json */ null,
    child: /* @jsonraw assets/models/memory-phase/child-model.json */ null,
    cockroach: /* @jsonraw assets/models/memory-phase/cockroach-model.json */ null
  };
  function build(T, name) {
    const data = DATA[name];
    if (!data || !data.parts) return null;
    const src = root.MemoryPhaseImages && root.MemoryPhaseImages[name + '-model-atlas'];
    let map = null;
    if (src) {
      map = new T.TextureLoader().load(src);
      map.colorSpace = T.SRGBColorSpace; map.magFilter = T.NearestFilter; map.minFilter = T.LinearFilter; map.generateMipmaps = false;
    }
    // 장면 조명이 거울 쪽(노인 얼굴용)이라 엄마는 역광으로 까맣게 뭉개진다. 아틀라스를 스스로 밝히는 빛을 더한다.
    const painted = new T.MeshLambertMaterial(map ? { map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: .62 } : { color: 0xdddddd });
    // 노인 모델과 같은 검은 윤곽선(뒷면을 법선 방향으로 조금 부풀림).
    const edge = new T.MeshBasicMaterial({ color: 0x000000, side: T.BackSide });
    edge.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * 0.008;');
    };
    const group = new T.Group(), parts = {};
    for (const [key, p] of Object.entries(data.parts)) {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(p.positions, 3));
      if (p.uv && p.uv.length) g.setAttribute('uv', new T.Float32BufferAttribute(p.uv, 2));
      g.setIndex(p.indices);
      g.computeVertexNormals();
      const pivot = p.pivot || [0, 0, 0];
      g.translate(-pivot[0], -pivot[1], -pivot[2]);
      g.computeBoundingBox();
      const holder = new T.Group(); holder.position.fromArray(pivot); group.add(holder);
      const mesh = new T.Mesh(g, painted), outline = new T.Mesh(g, edge);
      mesh.frustumCulled = outline.frustumCulled = false;
      holder.add(mesh, outline);
      holder.userData.pivot = pivot; holder.userData.box = g.boundingBox;
      parts[key] = holder;
    }
    group.userData.height = data.height || 1;
    return { group, parts, height: data.height || 1 };
  }
  root.MemoryPhaseModels = { build, has: name => !!(DATA[name] && DATA[name].parts) };
})(window);
