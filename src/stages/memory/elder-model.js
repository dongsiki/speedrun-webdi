

/* Imported Obra Dinn GDC 2016 ferryman mesh; original UVs and skin weights.
 * Geometry copyright Lucas Pope / 3909. Newly painted elderly-man atlas.
 * See assets/obra-model-source.md. Kept inside this local study prototype. */
function createElderModel(T) {
  const data=/* @jsonraw assets/models/memory-elder-model-data-8ae71b7466.json */ null;
  const body=new T.Group(), geometry=new T.BufferGeometry();
  const count=data.positions.length,rest=new Float32Array(count*3),normals=new Float32Array(count*3);
  const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),p=V(),n=V(),sum=V(),nsum=V();
  const pivot=V(0,1.55,.035);
  function around(point,rotation){
    return new T.Matrix4().makeTranslation(...point.toArray()).multiply(rotation)
      .multiply(new T.Matrix4().makeTranslation(-point.x,-point.y,-point.z));
  }
  // Pose the source T-pose using its original shoulder skin weights.
  const left=around(V(-.209,1.469,0),new T.Matrix4().makeRotationZ(1.31));
  const right=around(V(.209,1.469,0),new T.Matrix4().makeRotationZ(-1.31));
  const identity=new T.Matrix4();
  for(let i=0;i<count;i++){
    sum.set(0,0,0);nsum.set(0,0,0);
    for(let j=0;j<4;j++){
      const w=data.boneWeights[i][j];if(!w)continue;
      const b=data.boneIndices[i][j],m=b>=9&&b<=33?left:b>=38&&b<=62?right:identity;
      p.fromArray(data.positions[i]).applyMatrix4(m);sum.addScaledVector(p,w);
      n.fromArray(data.normals[i]).transformDirection(m);nsum.addScaledVector(n,w);
    }
    sum.toArray(rest,i*3);nsum.normalize().toArray(normals,i*3);
  }
  const position=new T.BufferAttribute(new Float32Array(rest.length),3);
  const normal=new T.BufferAttribute(new Float32Array(rest.length),3);
  geometry.setAttribute('position',position);geometry.setAttribute('normal',normal);
  // Landmark alignment: the repaint raised its eye line within the same island.
  // Adjust the head UV sampling, without changing the imported facial geometry.
  const uv=data.uv.map(([u,v])=>{
    const y=1-v;
    if(u>.61||y<.535)return [u,v];
    const landmarks=[[.535,.535],[.70,.67],[.75,.72],[.80,.79],[.83,.83],[1,1]];
    for(let j=1;j<landmarks.length;j++)if(y<=landmarks[j][0]){
      const [a,b]=landmarks[j-1],[c,d]=landmarks[j],t=(y-a)/(c-a);
      return [u+.006*Math.max(0,1-Math.abs(u-.30)/.30),1-(b+(d-b)*t)];
    }
    return [u,v];
  });
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv.flat(),2));
  geometry.setIndex(data.triangles.flatMap(part=>part.flatMap(([a,b,c])=>[c,b,a])));
  const atlas=new T.TextureLoader().load('@@data:assets/images/elder-model-143319738660.png@@');
  atlas.colorSpace=T.SRGBColorSpace;atlas.magFilter=T.NearestFilter;
  atlas.minFilter=T.LinearFilter;atlas.generateMipmaps=false;
  const eyePaint=new T.TextureLoader().load('@@data:assets/images/elder-model-909eb9a596a5.png@@');
  eyePaint.colorSpace=T.SRGBColorSpace;eyePaint.magFilter=T.NearestFilter;
  eyePaint.minFilter=T.LinearFilter;eyePaint.generateMipmaps=false;
  const smilePaint=new T.TextureLoader().load('@@data:assets/images/elder-model-f6e62ce9dc17.png@@');
  smilePaint.colorSpace=T.SRGBColorSpace;smilePaint.magFilter=T.NearestFilter;
  smilePaint.minFilter=T.LinearFilter;smilePaint.generateMipmaps=false;
  const smileUniform={value:0};
  const distortUniform={value:0},distortTimeUniform={value:0},glitchUniform={value:0};
  const addWarp=shader=>{
    shader.uniforms.distortAmount=distortUniform;shader.uniforms.distortTime=distortTimeUniform;shader.uniforms.glitchAmount=glitchUniform;
    shader.vertexShader='uniform float distortAmount;\nuniform float distortTime;\nuniform float glitchAmount;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>'+"\n      // 2026-10-31 2페 거울 일그러짐(distortAmount 0~1): 머리가 세로로 늘어나고, 얼굴 앞쪽이 뭉개지고,\n      // 머리가 떨리고, 입 쪽이 처진다. glitchAmount는 가끔 한두 프레임 크게 튀는 값.\n      {\n        float d = distortAmount;\n        float head = smoothstep(1.50, 1.56, transformed.y) * (1.0 - smoothstep(.13, .22, abs(transformed.x)));\n        float face = head * smoothstep(.06, .12, transformed.z);\n        transformed.y = mix(transformed.y, 1.53 + (transformed.y - 1.53) * (1.0 + .35 * d), head);\n        float n = sin(transformed.y * 93.0 + distortTime * 3.1) * sin(transformed.x * 71.0 - distortTime * 2.3) * sin(transformed.z * 57.0 + 1.7);\n        transformed += normal * n * .018 * d * face;\n        transformed.x += sin(distortTime * 37.0) * .006 * d * head;\n        transformed.z += sin(distortTime * 29.0 + 1.3) * .004 * d * head;\n        float mouth = face * smoothstep(1.555, 1.575, transformed.y) * (1.0 - smoothstep(1.61, 1.63, transformed.y));\n        transformed.y -= .03 * d * mouth;\n        transformed += normal * glitchAmount * .07 * head * sin(transformed.y * 40.0 + distortTime * 50.0);\n      }");
  };
  const painted=new T.MeshLambertMaterial({map:atlas});
  // Preserve the painted face, with a restrained albedo lift. Directional
  // illumination supplies broad form shadows; the print pass supplies dots.
  painted.onBeforeCompile=shader=>{
    addWarp(shader);
    shader.uniforms.eyePaint={value:eyePaint};
    shader.uniforms.smilePaint={value:smilePaint};shader.uniforms.smileAmount=smileUniform;
    shader.fragmentShader='uniform sampler2D eyePaint;\nuniform sampler2D smilePaint;\nuniform float smileAmount;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
      `#include <map_fragment>
      // Use the corrected eye paint only within its UV island region, so the
      // approved clothing, mouth, skin and hair are unchanged by regeneration.
      float eyeMask = smoothstep(.204,.220,vMapUv.x)*(1.0-smoothstep(.401,.417,vMapUv.x))
        *smoothstep(.216,.229,vMapUv.y)*(1.0-smoothstep(.328,.343,vMapUv.y));
      diffuseColor.rgb = mix(diffuseColor.rgb,texture2D(eyePaint,vMapUv).rgb,eyeMask);
      float mouthMask = smoothstep(.225,.242,vMapUv.x)*(1.0-smoothstep(.365,.389,vMapUv.x))
        *smoothstep(.117,.135,vMapUv.y)*(1.0-smoothstep(.205,.229,vMapUv.y));
      diffuseColor.rgb = mix(diffuseColor.rgb,texture2D(smilePaint,vMapUv).rgb,mouthMask*smileAmount);
      diffuseColor.rgb = pow(diffuseColor.rgb, vec3(0.82));`);
  };
  const model=new T.Mesh(geometry,painted);model.frustumCulled=false;body.add(model);
  const edge=new T.MeshBasicMaterial({color:0x000000,side:T.BackSide});
  edge.onBeforeCompile=shader=>{
    addWarp(shader);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed += normal * 0.0018;');
  };
  const outline=new T.Mesh(geometry,edge);outline.frustumCulled=false;body.add(outline);
  const headWeights=data.boneIndices.map((ids,i)=>ids.reduce((a,b,j)=>a+((b===35||b===36)?data.boneWeights[i][j]:b===34?data.boneWeights[i][j]*.36:0),0));
  const torsoWeights=data.boneIndices.map((ids,i)=>ids.reduce((a,b,j)=>a+(b>=5&&b<=62?data.boneWeights[i][j]*(b===5?.25:b===6?.65:1):0),0));
  const scale=2.85;body.scale.setScalar(scale);body.visible=false;
  body.userData.source=data.source;
  body.userData.importedVertices=count;
  body.userData.importedTriangles=geometry.index.count/3;
  let previousYaw=NaN,previousPitch=NaN,previousLean=NaN;
  function deform(yaw,pitch,lean=0){
    const rotation=new T.Matrix4().makeRotationFromEuler(new T.Euler(pitch,-yaw,-.015,'YXZ'));
    const matrix=around(pivot,rotation);
    const leanMatrix=around(V(0,1.07,.03),new T.Matrix4().makeRotationX(lean*.17));
    for(let i=0;i<count;i++){
      const w=headWeights[i];p.fromArray(rest,i*3);sum.copy(p);
      if(w)sum.lerp(p.applyMatrix4(matrix),w);
      if(lean&&torsoWeights[i])sum.lerp(p.copy(sum).applyMatrix4(leanMatrix),torsoWeights[i]);
      n.fromArray(normals,i*3);nsum.copy(n);
      if(w)nsum.lerp(n.transformDirection(rotation),w).normalize();
      position.setXYZ(i,-sum.x,sum.y,sum.z);normal.setXYZ(i,-nsum.x,nsum.y,nsum.z);
    }
    position.needsUpdate=true;normal.needsUpdate=true;
    // The demo's stored normals were authored for its custom character shader.
    // Rebuild geometric normals after posing for this renderer's side light.
    geometry.computeVertexNormals();
  }
  deform(0,0);geometry.computeBoundingSphere();
  let nextGlitch=0,glitchUntil=0;
  // 2페 거울 일그러짐 정도(0~1). 절반 이상(3회차쯤)부터 2~3초에 한 번 한두 프레임 크게 튄다.
  function setDistort(amount,clock){
    distortUniform.value=amount;distortTimeUniform.value=clock;
    if(amount>=.5&&clock>nextGlitch){glitchUntil=clock+.05;nextGlitch=clock+2+Math.random();}
    glitchUniform.value=amount>=.5&&clock<glitchUntil?amount:0;
  }
  function update(camera,clock,reduced,reflection=0,sway=0,smile=0){
    const lean=reduced?0:Math.max(0,Math.min(1,reflection));
    smileUniform.value=reduced?0:Math.max(0,Math.min(1,smile));
    const direction=V(0,0,-1).applyQuaternion(camera.quaternion);
    let yaw=Math.atan2(direction.x,direction.z)-Math.PI;
    yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));
    const headYaw=yaw*.78+(reduced?0:sway),pitch=-Math.asin(Math.max(-1,Math.min(1,direction.y)))*.82;
    if(Math.abs(headYaw-previousYaw)>.0001||Math.abs(pitch-previousPitch)>.0001||Math.abs(lean-previousLean)>.0001||!Number.isFinite(previousYaw)){
      deform(headYaw,pitch,lean);previousYaw=headYaw;previousPitch=pitch;previousLean=lean;
    }
    body.rotation.y=Math.PI+yaw*.22;
    body.position.set(camera.position.x,camera.position.y-1.665*scale+(reduced?0:Math.sin(clock*1.25)*.002),camera.position.z+.10-lean*.22);
    return {yaw:headYaw,pitch};
  }
  return {object:body,update,setDistort};
}