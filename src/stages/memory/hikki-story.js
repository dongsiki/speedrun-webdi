// 2026-11-10 승인: 2페 4회차, 방 안의 두 끼와 세 번째 기상의 퇴거 컷신.
window.MemoryHikkiStory = {
  create({ T, scene, bedroom, camera, canvas, PH, kit, blink, start, finish, sound }) {
    const { box, cylinder, rod, line, torus, mesh, C, V } = kit;
    const group = new T.Group(); bedroom.group.add(group); group.visible = false;
    const passage = new T.Group(); scene.add(passage); passage.visible = false;
    const street = new T.Group(); scene.add(street); street.visible = false;
    let active = false, step = 0, mode = 'off', time = 0, spoken = false, lastBite = -1;
    const clamp = x => Math.max(0, Math.min(1, x));
    const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
    const button = document.createElement('button'); button.id = 'hikki-action'; button.className = 'object-action'; button.hidden = true;
    document.getElementById('experience').append(button);
    const ink = new T.MeshBasicMaterial({ color: C.ink }), paper = new T.MeshBasicMaterial({ color: C.white });
    const door = new T.Group(); group.add(door); door.position.set(-.55, 0, -2.50);
    box(door, .55, 1.09, 0, 1.08, 2.18, .045, C.white);
    cylinder(door, .97, 1.04, .045, .033, .033, .055, C.ink, 10).rotation.x = Math.PI / 2;
    const mother = window.MemoryPhaseModels.build(T, 'mom'); group.add(mother.group);
    mother.parts.brush.visible = false; mother.group.position.set(0, 0, -2.64); mother.group.visible = false;
    const father = createElderModel(T); group.add(father.object); father.object.scale.setScalar(.97); father.object.visible = false;
    // 거울용 조명은 방문 쪽 인물에게 역광이다. 이 인물의 기존 스킨만 은은하게 보이게 한다.
    const fatherPaint = father.object.children[0].material;
    fatherPaint.emissive.setHex(0xffffff); fatherPaint.emissiveMap = fatherPaint.map; fatherPaint.emissiveIntensity = .62;
    // 기존 모델의 피부·옷 이미지를 재사용한다. 스킨이나 무늬를 코드로 그리지 않는다.
    const fatherGeometry = father.object.children[0].geometry, fp = fatherGeometry.attributes.position, rest = fp.array.slice();
    const armPivot = V(.20, 1.46, 0), tmp = V();
    function fatherReach(amount) {
      const rotate = new T.Matrix4().makeRotationX(-amount * 1.5);
      for (let i = 0; i < fp.count; i++) {
        tmp.fromArray(rest, i * 3);
        if (tmp.x > .16 && tmp.y > .72 && tmp.y < 1.49) tmp.sub(armPivot).applyMatrix4(rotate).add(armPivot);
        fp.setXYZ(i, tmp.x, tmp.y, tmp.z);
      }
      fp.needsUpdate = true; fatherGeometry.computeVertexNormals();
    }
    const tray = new T.Group(); group.add(tray); tray.position.set(0, .055, -2.10);
    box(tray, 0, .025, 0, .60, .04, .40, C.white);
    for (const x of [-.3,.3]) box(tray, x, .055, 0, .025, .04, .42, C.ink);
    for (const z of [-.2,.2]) box(tray, 0, .055, z, .60, .04, .025, C.ink);
    cylinder(tray, -.09, .10, 0, .105, .075, .11, C.white, 18);
    cylinder(tray, -.09, .157, 0, .098, .098, .008, C.ink, 18);
    const rice = new T.Group(); tray.add(rice); rice.position.set(-.09, .165, 0);
    const riceMaterial = new T.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 7; i++) {
      const p = mesh(rice, new T.SphereGeometry(.034, 8, 6), riceMaterial);
      p.position.set(Math.cos(i * 2.4) * .047, i === 0 ? .03 : .009, Math.sin(i * 2.4) * .047); p.scale.y = .7;
    }
    cylinder(tray, .16, .09, -.025, .065, .045, .08, C.white, 14);
    cylinder(tray, .16, .134, -.025, .054, .054, .005, 0x555555, 14);
    for (const x of [.15,.18]) rod(tray, [x, .08, .09], [x, .08, .19], .004, C.ink, 6);
    const steam = new T.Group(); tray.add(steam);
    for (let i = 0; i < 3; i++) line(steam, [[-.14 + i*.045,.23,0],[-.15+i*.045,.32,.01],[-.13+i*.045,.41,0]], true);
    const cue = new T.Group(); group.add(cue); cue.visible = false;
    torus(cue, 0, 0, 0, .34, .009, C.ink);
    for (const a of [0, 2.1, 4.2]) line(cue, [[Math.cos(a)*.40,Math.sin(a)*.40,0],[Math.cos(a)*.49,Math.sin(a)*.49,0]], true);
    const trayHit = box(group, 0, .19, -2.1, .72, .40, .52, C.white, false);
    trayHit.material = new T.MeshBasicMaterial({ visible: false });
    const bedHit = box(group, -.22, .76, .48, .65, .30, .36, C.white, false);
    bedHit.material = new T.MeshBasicMaterial({ visible: false });
    const hand = new T.Group(); scene.add(hand); hand.visible = false;
    const palm = mesh(hand, new T.SphereGeometry(1, 10, 7), paper); palm.scale.set(.045,.065,.025);
    for (let i=0;i<4;i++) rod(hand, [-.03+i*.02,.035,0],[-.03+i*.02,.10-Math.abs(i-1.5)*.008,-.008], .009, C.white, 7);
    rod(hand, [-.035,0,0],[-.065,.045,-.005], .013, C.white, 7);
    cylinder(hand, 0, -.16, 0, .045, .065, .23, C.white, 10);
    // 창문 없는 짧은 집 안 통로와 집 밖 길바닥. 무늬 텍스처를 코드로 만들지 않는다.
    box(passage, 0,-.06,-4.4,2.4,.12,4.0,C.white);
    for(const x of [-1.2,1.2]) box(passage,x,1.3,-4.4,.1,2.6,4.0,C.white);
    box(passage,0,2.6,-4.4,2.4,.1,4.0,C.white);
    box(street,0,-.07,-8,16,.12,18,C.white);
    box(street,0,.08,-6.5,6,.16,1.0,C.white);
    box(street,0,1.5,-5.9,6,3,.15,C.white);
    box(street,0,1.05,-6.0,1.1,2.1,.04,C.ink);
    for(const x of [-3.1,3.1]) box(street,x,1.4,-9,.15,2.8,6,C.white);
    box(street,1.24,.055,-11,.92,.11,8,C.white);
    box(street,1.74,1.5,-11,.10,3,8,C.white);
    box(street,1.675,1.05,-10,.035,2.1,1.05,C.ink);
    box(street,1.65,1.05,-10,.02,1.98,.93,C.white);
    for(const z of [-12.1,-8.1]){
      box(street,1.675,1.75,z,.035,.86,1.10,C.ink);
      box(street,1.65,1.75,z,.02,.76,1.0,C.white);
      rod(street,[1.63,1.75,z-.50],[1.63,1.75,z+.50],.012,C.ink);
      rod(street,[1.63,1.37,z],[1.63,2.13,z],.012,C.ink);
    }
    for(const z of [-7.1,-8.4,-9.7,-11]) line(street,[[-6,.005,z],[6,.005,z]],true);
    line(street,[[-2,.01,-7],[-2,.01,-15]],true); line(street,[[2,.01,-7],[2,.01,-15]],true);
    // 누운 시점에서도 길로 읽히는 보도 경계석·담·가로등·전봇대.
    for(let z=-7.1;z>-16;z-=.78) box(street,.77,.075,z,.18,.15,.72,C.white);
    box(street,-1.80,.42,-12,.16,.84,11,C.white);
    for(const z of [-7.1,-9.3,-11.5,-13.7,-15.9]){
      box(street,-1.80,.53,z,.24,1.06,.24,C.white);
      box(street,-1.80,1.08,z,.29,.07,.29,C.ink);
    }
    line(street,[[-1.70,.35,-6.5],[-1.70,.35,-17.5]],true);
    line(street,[[-1.70,.68,-6.5],[-1.70,.68,-17.5]],true);
    cylinder(street,1.12,.09,-13.1,.12,.14,.18,C.ink,10);
    rod(street,[1.12,.15,-13.1],[1.12,2.85,-13.1],.037,C.ink,10);
    rod(street,[1.12,2.85,-13.1],[.62,3.0,-13.1],.032,C.ink,10);
    box(street,.50,2.98,-13.1,.38,.12,.20,C.white);
    box(street,.50,2.91,-13.1,.30,.025,.14,C.ink);
    cylinder(street,-1.45,1.65,-15,.075,.10,3.3,C.white,10);
    rod(street,[-1.93,2.94,-15],[-.97,2.94,-15],.035,C.ink,8);
    for(const x of [-1.87,-1.03]){
      cylinder(street,x,3.03,-15,.042,.042,.13,C.ink,8);
      line(street,[[x,3.1,-15],[x+.2,2.88,-10.5],[x+.4,3.16,-6.1]],true);
    }
    // 배수구는 평면 그림이 아닌 짧은 금속 막대로 만든다.
    box(street,.53,.014,-9.1,.30,.02,.46,C.ink);
    for(let z=-9.28;z<-8.88;z+=.075)rod(street,[.40,.033,z],[.66,.033,z],.009,C.white,6);
    const sleepHand = new T.Group(); street.add(sleepHand);
    box(sleepHand,.36,.08,-8.4,.16,.08,.35,C.white); sleepHand.visible=false;
    function canClick() { return active && ['bed','meal'].includes(mode); }
    function target() { return mode === 'bed' ? bedHit : mode === 'meal' ? trayHit : null; }
    function ui() {
      button.hidden = !canClick(); button.disabled = button.hidden;
      button.setAttribute('aria-label', mode === 'meal' ? '밥 먹기' : '침대에서 일어나기');
      canvas.dataset.hikkiStage = active ? `4-${step}:${mode}` : 'off';
      canvas.dataset.hikkiStep = String(step); canvas.dataset.hikkiActive = String(active);
      canvas.dataset.hikkiCold = String(active && step === 2);
    }
    function set(next) { mode = next; time = 0; spoken = false; ui(); }
    function cycle(next) {
      step = next; tray.visible = false; rice.visible = true; rice.scale.setScalar(1);
      riceMaterial.color.setHex(step === 2 ? 0xb7b7b7 : 0xffffff); steam.visible = step === 1;
      mother.group.visible = father.object.visible = hand.visible = false; door.rotation.y = 0;
      PH.say(''); blink(0); set('bed');
    }
    function reset(cfg, phase) {
      const wasActive = active; active = phase === 2 && !!cfg.hikki;
      group.add(father.object);
      group.visible = active; passage.visible = street.visible = hand.visible = false; cue.visible = false;
      mother.group.visible = father.object.visible = false; step = 0; mode = 'off'; sleepHand.visible = false;
      if (active) cycle(1); else { if (wasActive) { PH.say(''); blink(0); } ui(); }
    }
    function click() {
      if (!canClick()) return;
      start(); sound(130,.10,.025);
      if (mode === 'bed') set(step === 3 ? 'father-enter' : 'rise');
      else { lastBite = -1; set('eat'); }
    }
    button.addEventListener('click', click);
    function view(position, target, roll=0) {
      camera.position.copy(position); camera.lookAt(target); if(roll)camera.rotateZ(roll); camera.updateMatrixWorld();
    }
    function update(dt,{reduced,clock}) {
      if(!active)return; time+=dt;
      camera.fov=58; camera.updateProjectionMatrix();
      const bedPosition=V(-.22,1.02,1.45), bedTarget=V(0,.9,-2.35), eatPosition=V(.42,.96,-.90), eatTarget=V(0,.14,-2.10);
      cue.visible=canClick();
      if(mode==='bed'){view(bedPosition,bedTarget);cue.position.set(-.22,.76,.48);}
      else if(mode==='rise'||mode==='meal'||mode==='eat') {
        const u=mode==='rise'?smooth(time/1.7):1, look=mode==='rise'?smooth((time-1.2)/1.5):1;
        view(bedPosition.clone().lerp(eatPosition,u),bedTarget.clone().lerp(eatTarget,look));
        cue.position.set(0,.21,-2.03);
        if(mode==='rise') {
          mother.group.visible=step===1&&time<2.6;
          door.rotation.y=step===1?-1.15*Math.sin(Math.min(1,time/2.6)*Math.PI):0;
          if(step===1) {mother.parts.armR.rotation.x=-.6;mother.parts.armL.rotation.x=-.4;}
          tray.visible=time>.6;tray.position.y=.055+(step===1?.35*(1-smooth((time-.6)/1.3)):0);
          if(!spoken&&time>.8){spoken=true;PH.say(step===1?'밥 놔뒀어.':'언제까지 이럴 거냐.',2800);}
          if(time>2.7){mother.group.visible=false;door.rotation.y=0;set('meal');}
        } else if(mode==='eat') {
          const t=clamp(time/3.6);rice.scale.setScalar(1-t*.98);steam.visible=step===1&&t<.8;
          const bite=Math.floor(t*3);if(bite!==lastBite){lastBite=bite;sound(120,.15,.024,'triangle');}
          hand.visible=true;hand.quaternion.copy(camera.quaternion);hand.position.copy(V(.14,-.18+Math.sin(t*Math.PI*6)*.045,-.35).applyMatrix4(camera.matrixWorld));
          if(t>=1){hand.visible=false;rice.visible=false;set('sleep');}
        }
      } else if(mode==='sleep') {
        const u=smooth(time/1.4);view(eatPosition.clone().lerp(bedPosition,u),eatTarget.clone().lerp(bedTarget,u));blink(smooth((time-.8)/.8));
        if(time>2){cycle(step+1);}
      } else if(mode==='father-enter') {
        view(bedPosition,bedTarget);father.object.visible=true;door.rotation.y=-1.3*smooth(time/.45);
        father.object.position.set(0,0,-2.56+2.7*smooth(time/2.4));father.object.rotation.y=0;fatherReach(smooth((time-1.3)/.9));
        if(time>2.6){hand.visible=true;set('drag');}
      } else if(mode==='drag') {
        const u=smooth(time/3.4),z=1.45-6.1*u;
        view(V(-.1,.50,z),V(0,1.1,z-.95),reduced?0:Math.sin(time*8)*.045);
        father.object.position.set(0,0,z-1.05);father.object.rotation.y=0;
        hand.position.copy(V(.08,-.11,-.42).applyMatrix4(camera.matrixWorld));hand.quaternion.copy(camera.quaternion);
        passage.visible=true;if(z<-2.50){bedroom.group.visible=false;passage.add(father.object);}
        if(time>3.5){hand.visible=false;father.object.visible=false;passage.visible=false;street.visible=true;set('outside');}
      } else if(mode==='outside') {
        const u=smooth(time/1.5);view(V(0,.66,-6.7).lerp(V(.28,.13,-8.2),u),V(.1,.45,-14),.9*u);sleepHand.visible=u>.5;
        if(time>1.6){sound(72,.20,.045);set('street-sleep');}
      } else if(mode==='street-sleep') {
        view(V(.28,.13,-8.2),V(.1,.45,-14),.9);blink(smooth((time-.9)/1.4));
        if(time>2.5){active=false;group.visible=street.visible=passage.visible=hand.visible=false;group.add(father.object);PH.say('');ui();finish();}
      }
      if(cue.visible){cue.lookAt(camera.position);cue.scale.setScalar(reduced?1:1+Math.sin(clock*Math.PI*1.2)*.045);}
      if(steam.visible)steam.position.y=reduced?0:Math.sin(clock*1.5)*.012;
      ui();
    }
    return {reset,click,update,get active(){return active;},get canClick(){return canClick();},targets(){return active&&canClick()?[target()]:[];},positionAction(position){if(!button.hidden)position(target(),button);}};
  }
};
