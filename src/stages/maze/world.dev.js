

const MazeWorld = (() => {
  const placements = Object.freeze([
    { role:'caregiver', x:1.14, z:15.5, yaw:1.35 },
    { role:'neighbor', x:1.82, z:18.85, yaw:-1.57 },
    { role:'child', x:1.9, z:20.25, yaw:Math.PI }
  ]);
  function create(E, display) {
    if (typeof THREE === 'undefined') return null;
    const T=THREE, D=E.dimensions, surface=document.createElement('canvas');
    let renderer;
    try { renderer=new T.WebGLRenderer({canvas:surface,alpha:false,antialias:false,powerPreference:'low-power'}); }
    catch (_) { display.dataset.worldError='webgl-unavailable'; return null; }
    renderer.setPixelRatio(1); renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.NoToneMapping; renderer.shadowMap.enabled=false;
    const scene=new T.Scene(); scene.background=new T.Color(0xffffff);
    const camera=new T.PerspectiveCamera(60,1,.025,45);
    const ambient=new T.AmbientLight(0xffffff,.46), key=new T.DirectionalLight(0xffffff,1.65), fill=new T.DirectionalLight(0xffffff,.35);
    key.position.set(-2,5,3); fill.position.set(2,2,-3); scene.add(ambient,key,key.target,fill);
    const white=new T.MeshBasicMaterial({color:0xffffff}), black=new T.MeshBasicMaterial({color:0x080808});
    const plaster=new T.MeshLambertMaterial({color:0xf6f6f6}), grey=new T.MeshLambertMaterial({color:0x9c9c9c});
    const unitBox=new T.BoxGeometry(1,1,1), unitPlane=new T.PlaneGeometry(1,1);
    const materialCache=new Map(), actors=[];
    function box(parent,x,y,z,w,h,d,material=plaster,outline=false) {
      const m=new T.Mesh(unitBox,material); m.position.set(x,y,z); m.scale.set(w,h,d);parent.add(m);
      if(outline){const e=new T.LineSegments(new T.EdgesGeometry(unitBox),new T.LineBasicMaterial({color:0x111111}));m.add(e);}
      return m;
    }
    function plane(parent,x,y,z,w,h,material) {
      const m=new T.Mesh(unitPlane,material);m.position.set(x,y,z);m.scale.set(w,h,1);parent.add(m);return m;
    }
    function texture(kind,seed=0) {
      const id=kind+seed;if(materialCache.has(id))return materialCache.get(id);
      const c=document.createElement('canvas');c.width=c.height=256;const p=c.getContext('2d');
      p.fillStyle='#fff';p.fillRect(0,0,256,256);p.strokeStyle='#171717';p.fillStyle='#111';
      let rng=seed+73; const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
      if(kind==='brick') {
        p.lineWidth=1;
        for(let row=0;row<9;row++){
          const y=row*30;p.beginPath();p.moveTo(0,y);p.lineTo(256,y+1);p.stroke();
          for(let x=(row%2)*43-86;x<256;x+=86){p.beginPath();p.moveTo(x,y);p.lineTo(x-1,y+30);p.stroke();}
        }
        for(let i=0;i<1550;i++){const x=random()*256,y=random()*256;if(x<60||y>170||random()>.86)p.fillRect(x|0,y|0,1,1);}
        // Large worn plaster patches break up the repetitive brick grid.
        p.fillStyle='#fff';p.beginPath();p.moveTo(0,0);p.lineTo(170,0);p.lineTo(156,55);p.lineTo(116,63);p.lineTo(103,112);p.lineTo(37,100);p.lineTo(0,143);p.fill();
      } else if(kind==='care') {
        const top=Math.round(256*(1-(D.railHeight-.04)/D.wallHeight)),bottom=Math.round(256*(1-.045/D.wallHeight));
        p.fillStyle='#f4f4f4';p.fillRect(0,top,256,256-top);p.fillStyle='#000';
        for(let i=0;i<650;i++)p.fillRect(random()*256|0,top+(random()*(256-top)|0),1,1);
        p.fillRect(0,top-1,256,1);p.fillRect(0,bottom,256,2);
        for(let x=0;x<256;x+=64){p.fillRect(x,top,1,bottom-top);}
      } else if(kind==='floor') {
        p.lineWidth=1;p.strokeRect(.5,.5,255,255);p.beginPath();p.moveTo(128,0);p.lineTo(128,256);p.moveTo(0,128);p.lineTo(256,128);p.stroke();
        for(let i=0;i<110;i++)p.fillRect(random()*256|0,random()*256|0,1,1);
      } else if(kind==='door') {
        p.lineWidth=2;p.strokeRect(17,20,222,215);p.strokeRect(28,118,200,105);
        for(let i=0;i<160;i++)p.fillRect(17+(random()*222|0),207+(random()*32|0),1,1);
      }
      const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.magFilter=T.NearestFilter;
      const m=new T.MeshBasicMaterial({map});materialCache.set(id,m);return m;
    }
    function rail(g,left=-.5,right=.5) {
      const length=right-left;if(length<=0)return;
      box(g,(left+right)/2,D.railHeight,.043,length,.027,.036,white,true);
      for(const x of [left+.09,right-.09])box(g,x,D.railHeight-.027,.021,.018,.052,.030,black);
      box(g,(left+right)/2,.041,.006,length,.030,.009,black);
    }
    function door(g,old=false) {
      const h=D.doorHeight,w=D.doorWidth,frame=new T.Group();frame.name='room-door';frame.userData={doorHeight:h,doorWidth:w};g.add(frame);
      box(frame,0,h/2,.009,w,h,.012,black);
      plane(frame,0,h/2,.018,w-.028,h-.028,texture('door',0));
      for(const x of [-w/2-.01,w/2+.01])box(frame,x,(h+.026)/2,.028,.02,h+.026,.043,white,true);
      box(frame,0,h+.016,.028,w+.06,.032,.043,white,true);
      if(!old){
        box(frame,.02,.80,.025,.17,.20,.015,black);
        plane(frame,.02,.80,.034,.144,.174,grey);
        box(frame,0,h+.10,.012,.13,.044,.012,white,true);
        box(frame,0,h+.10,.020,.060,.004,.002,black);
      }
      box(frame,w/2-.045,D.handleHeight,.049,.011,.034,.044,black);box(frame,w/2-.075,D.handleHeight+.003,.072,.07,.010,.013,black);
      rail(g,-.5,-w/2-.035);rail(g,w/2+.035,.5);
    }
    function windowFrame(g,seed) {
      box(g,0,.80,.012,.69,.50,.025,black);
      plane(g,0,.80,.028,.61,.42,new T.MeshBasicMaterial({color:0x262626}));
      for(const x of [-.327,0,.327])box(g,x,.80,.037,.018,.50,.026,white,true);
      for(const y of [.555,.80,1.045])box(g,0,y,.037,.67,.017,.026,white,true);
      box(g,0,.535,.07,.75,.025,.15,white,true);
      box(g,-.20,.90,.035,.08,.17,.004,white);
      if(seed%2===0)box(g,.48,D.wallHeight/2,.035,.023,D.wallHeight,.030,grey,true);
    }
    function clock(g) {
      const face=new T.Mesh(new T.CircleGeometry(.058,24),white);face.position.set(.33,1.115,.012);g.add(face);
      const ring=new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:32},(_,i)=>new T.Vector3(Math.cos(i/32*Math.PI*2)*.061,Math.sin(i/32*Math.PI*2)*.061,0))),new T.LineBasicMaterial({color:0x000000}));ring.position.copy(face.position);g.add(ring);
      box(g,.33,1.135,.016,.003,.04,.002,black);box(g,.345,1.105,.016,.037,.003,.002,black);
    }
    const alley = MazeAlley.create(T, E, {box, plane, texture, white, black, grey, windowFrame, door, rail});
    let dressedFaces=0;
    for(let z=0;z<E.grid.length;z++)for(let x=0;x<E.grid[z].length;x++){
      if(E.wall(x,z))continue;
      const zone=E.zoneAt(x,z);
      // Existing interiors retain their white overhead occlusion. Town stays open.
      if(zone!=='town'){
        const ceiling=new T.Mesh(unitPlane,white);ceiling.rotation.x=Math.PI/2;
        ceiling.position.set(x+.5,D.wallHeight,z+.5);scene.add(ceiling);
      }
      if(zone!=='blank'){
        const f=new T.Mesh(unitPlane,zone==='town'?alley.floor:texture('floor',0));
        f.rotation.x=-Math.PI/2;f.position.set(x+.5,-.002,z+.5);scene.add(f);
      }
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        if(!E.wall(x+dx,z+dz))continue;
        const g=new T.Group();g.name=`wall/${x},${z}/${dx},${dz}`;g.userData.zone=zone;g.position.set(x+.5+dx*.5,0,z+.5+dz*.5);g.rotation.y=Math.atan2(-dx,-dz);scene.add(g);
        const seed=(x*11+z*7+(dx+1)*3+dz+1)%19;
        const exitFace = x===Math.floor(E.exit.x)&&z===Math.floor(E.exit.z)&&dx===0&&dz===1;
        if(zone==='town')alley.facade(g,x,z,dx,dz,seed,exitFace);
        else plane(g,0,D.wallHeight/2,-.003,1,D.wallHeight,zone==='blank'?white:texture('care',seed%3));
        if(zone==='blank')continue;
        dressedFaces++;
        if(x===Math.floor(E.exit.x)&&z===Math.floor(E.exit.z)&&dx===0&&dz===1)continue;
        if(zone==='care'){
          if(seed%4===0)door(g);else{rail(g);if(seed%7===0)clock(g);}
        }
      }
    }
    // Furniture is confined to widened pockets; the walkable grid is unchanged.
    function bench(x,z,yaw) {
      const g=new T.Group();g.position.set(x,0,z);g.rotation.y=yaw;scene.add(g);
      box(g,0,D.seatHeight,0,.58,.023,.20,white,true);box(g,0,D.seatHeight+.13,-.085,.58,.22,.026,white,true);
      for(const a of [-.23,.23])for(const b of [-.065,.065])box(g,a,(D.seatHeight-.012)/2,b,.018,D.seatHeight-.012,.018,black);
    }
    bench(1.10,13.7,Math.PI/2);bench(1.82,18.85,-Math.PI/2);
    const threshold=new T.Group(),doorH=D.doorHeight,doorW=D.doorWidth;
    threshold.name='exit-door';threshold.userData={doorHeight:doorH,doorWidth:doorW};threshold.position.set(E.exit.x,0,E.exit.z+.38);threshold.rotation.y=Math.PI;scene.add(threshold);
    box(threshold,0,doorH/2,0,doorW,doorH,.03,black);
    for(const x of [-doorW/2-.012,doorW/2+.012])box(threshold,x,(doorH+.028)/2,.03,.024,doorH+.028,.06,white,true);
    box(threshold,0,doorH+.016,.03,doorW+.068,.032,.06,white,true);
    const leaf=new T.Group(),leafW=doorW-.022;leaf.position.set(-doorW/2+.008,0,.04);leaf.rotation.y=-.50;threshold.add(leaf);
    box(leaf,leafW/2,(doorH-.014)/2,0,leafW,doorH-.014,.024,white,true);box(leaf,leafW-.044,D.handleHeight,.031,.025,.019,.04,black);
    // The only EXIT sign in the maze. A drawn egress symbol remains readable
    // without relying on an emoji font or adding color to the monochrome world.
    const signCanvas=document.createElement('canvas');signCanvas.width=768;signCanvas.height=192;
    const signInk=signCanvas.getContext('2d');signInk.fillStyle='#000';signInk.fillRect(0,0,768,192);
    signInk.strokeStyle=signInk.fillStyle='#fff';signInk.lineWidth=5;signInk.strokeRect(9,9,750,174);
    signInk.lineWidth=8;signInk.strokeRect(146,34,43,124);
    signInk.beginPath();signInk.arc(76,46,13,0,Math.PI*2);signInk.fill();
    signInk.lineWidth=15;signInk.lineCap='round';signInk.lineJoin='round';
    for(const points of [[[75,70],[94,103]],[[77,72],[48,91],[31,78]],[[79,74],[110,63],[126,81]],[[92,103],[65,128],[46,154]],[[95,105],[119,122],[126,151]]]){
      signInk.beginPath();points.forEach(([x,y],i)=>i?signInk.lineTo(x,y):signInk.moveTo(x,y));signInk.stroke();
    }
    signInk.lineWidth=7;signInk.beginPath();signInk.moveTo(198,97);signInk.lineTo(225,97);signInk.moveTo(214,85);signInk.lineTo(227,97);signInk.lineTo(214,109);signInk.stroke();
    signInk.font='bold 123px Arial, sans-serif';signInk.textBaseline='middle';signInk.fillText('EXIT',269,104);
    const signMap=new T.CanvasTexture(signCanvas);signMap.colorSpace=T.SRGBColorSpace;signMap.magFilter=T.NearestFilter;
    for(const x of [-.20,.20])box(threshold,x,doorH+.070,.007,.014,.10,.014,black);
    box(threshold,0,doorH+.14,.027,.80,.20,.038,black);
    const sign=plane(threshold,0,doorH+.14,.048,.784,.192,new T.MeshBasicMaterial({map:signMap}));
    sign.name='exit-sign';sign.userData.label='EXIT';sign.userData.symbol='running-person-door-arrow';
    // Close to the door the overhead board can leave the field of view.
    const nearSign=plane(leaf,leafW/2,D.eyeHeight,.015,.37,.0925,sign.material);
    nearSign.name='exit-door-label';nearSign.userData.label='EXIT';
    const footGeometry=new T.ShapeGeometry(new T.Shape().moveTo(-.028,-.064).lineTo(.024,-.06).lineTo(.031,.035).lineTo(.016,.064).lineTo(-.024,.044).closePath());
    footGeometry.rotateX(-Math.PI/2);
    const footMeshes=new T.InstancedMesh(footGeometry,black,6000);footMeshes.count=0;footMeshes.frustumCulled=false;scene.add(footMeshes);
    const dummy=new T.Object3D();let trailCount=0;
    const loader=new T.TextureLoader();let loaded=0,failed=false;
    function load(uri){const t=loader.load(uri,()=>{loaded++;display.dataset.npcTextures=String(loaded);},undefined,()=>{failed=true;display.dataset.worldError='npc-texture';});t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.LinearFilter;t.generateMipmaps=false;return t;}
    for(const entry of placements){
      const head=load(MazeNPCAssets[entry.role]),body=entry.role==='neighbor'?head:load(MazeNPCAssets[entry.role+'Body']);
      const data=MazeNPCMeshes[entry.role],neutral=createNPC(T,data,body,entry.role,head);
      const scale=D.npcHeights[entry.role]/(neutral.bounds.max.y-neutral.bounds.min.y);
      neutral.geometry.dispose();neutral.material.dispose();neutral.mesh.material[1].dispose();
      const npc=createNPC(T,data,body,entry.role,head,MazeNPCPoses.create(T,data,entry.role));
      // Keep the same stature when sitting. Never enlarge a seated pose to adult standing height.
      const x=entry.role==='child'?2-.007+npc.bounds.min.x*scale:entry.x;
      npc.object.position.set(x,.001-npc.bounds.min.y*scale,entry.z);npc.object.rotation.y=entry.yaw;npc.object.scale.setScalar(scale);scene.add(npc.object);
      npc.object.userData.standingHeight=D.npcHeights[entry.role];
      actors.push({...entry,x,scale,npc});
    }
    const target=new T.WebGLRenderTarget(1,1,{minFilter:T.NearestFilter,magFilter:T.NearestFilter});
    const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
    const post=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:target.texture},pixels:{value:new T.Vector2(1,1)}},
      vertexShader:'varying vec2 vUV;void main(){vUV=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`precision highp float;varying vec2 vUV;uniform sampler2D picture;uniform vec2 pixels;
        float bayer(vec2 p){return mod(2.*mod(p.x,2.)+3.*mod(p.y,2.),4.);}
        float srgb(float x){return x<=.0031308?12.92*x:1.055*pow(x,1./2.4)-.055;}
        void main(){vec2 p=floor(vUV*pixels);float v=srgb(dot(texture2D(picture,(p+.5)/pixels).rgb,vec3(.2126,.7152,.0722)));
          float t=(4.*bayer(p)+bayer(floor(p/2.))+.5)/16.;gl_FragColor=vec4(vec3(step(t,smoothstep(.13,.90,v))),1.);}`});
    postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));
    let pw=0,ph=0,seconds=0,disposed=false;const developerSeen=new Set();
    display.dataset.npcCount=String(actors.length);display.dataset.dressedFaces=String(dressedFaces);
    display.dataset.eyeHeight=String(D.eyeHeight);display.dataset.doorHeight=String(D.doorHeight);
    return {
      render(player,{width,height,lens,cameraOffset,reduced,dt=0,footprints=[]}) {
        if(disposed)return null;
        const w=Math.max(1,Math.round(width/1.6)),h=Math.max(1,Math.round(height/1.6));
        if(w!==pw||h!==ph){pw=w;ph=h;renderer.setSize(w,h,false);target.setSize(w,h);post.uniforms.pixels.value.set(w,h);}
        seconds+=dt;
        const focal=width/(2*lens);camera.fov=2*Math.atan(height/(2*focal))*180/Math.PI;camera.aspect=width/height;camera.updateProjectionMatrix();
        // Match the existing ray projection, including its vertical lens shift.
        camera.projectionMatrix.elements[9]=2*player.pitch;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
        camera.position.set(player.x,D.eyeHeight+cameraOffset,player.z);camera.lookAt(player.x+Math.cos(player.yaw),D.eyeHeight+cameraOffset,player.z+Math.sin(player.yaw));
        key.position.set(player.x-1.1,2.6,player.z+1.5);key.target.position.set(player.x+Math.cos(player.yaw)*3,.55,player.z+Math.sin(player.yaw)*3);
        camera.updateMatrixWorld();
        for(const a of actors){
          const d=Math.hypot(player.x-a.x,player.z-a.z);a.npc.object.visible=d<16;
          if(!a.npc.object.visible)continue;
          const bearing=Math.atan2(player.x-a.x,player.z-a.z)-a.yaw;
          const turn=Math.atan2(Math.sin(bearing),Math.cos(bearing));
          const glance=!reduced&&d<3.8&&Math.abs(turn)<1.5?Math.max(-.30,Math.min(.30,turn))*.65:0;
          const p=new T.Vector3(a.x,D.npcHeights[a.role]*.55,a.z).project(camera);
          if(d<3.5&&p.z>-1&&p.z<1&&Math.abs(p.x)<.97&&Math.abs(p.y)<.97)developerSeen.add(a.role);
          display.dataset.devNPCSeen=[...developerSeen].join(',');
          a.npc.pose(glance);a.npc.object.scale.y=a.scale*(1+(reduced?0:Math.sin(seconds*1.1+a.x)*.0025));
        }
        while(trailCount<footprints.length&&trailCount<6000){
          const f=footprints[trailCount];dummy.position.set(f.x,.002,f.z);dummy.rotation.set(0,-Math.atan2(f.dz,f.dx)-Math.PI/2,0);dummy.updateMatrix();footMeshes.setMatrixAt(trailCount,dummy.matrix);trailCount++;
        }
        if(footMeshes.count!==trailCount){footMeshes.count=trailCount;footMeshes.instanceMatrix.needsUpdate=true;}
        renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
        display.dataset.worldReady=String(loaded===5&&!failed);display.dataset.zone=E.zoneAt(player.x,player.z);
        return surface;
      },
      dispose(){if(disposed)return;disposed=true;target.dispose();scene.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){m?.map?.dispose();m?.dispose();}});post.dispose();renderer.dispose();}
    };
  }
  return {create,placements};
})();
