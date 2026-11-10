  // ── 8장. 벽 메모와 반복: 벽 메모 글씨를 선명하게 겹치고, 화면을 계속 다시 그리기 ──
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
    if(noteRound()!==4||reduced)return camera;
    if(!mirrorFrozen){
      mirrorHistory.push({time:clock,position:camera.position.clone(),quaternion:camera.quaternion.clone()});
      while(mirrorHistory.length>1&&mirrorHistory[1].time<=clock-.55)mirrorHistory.shift();
      laggedView.position.copy(mirrorHistory[0].position);laggedView.quaternion.copy(mirrorHistory[0].quaternion);
    }
    canvas.dataset.mirror4=mirrorFrozen?'stayed':'late';
    return laggedView;
  }
  // 필요한 물건 = 3번, 필요 없는 물건 = 1~2번 (todo.md 기록 기준). 정해지지 않은 강조 물건은 3번.
  const BLINK_RULES = {
    bed: 3, basin: 3, tap: 3, chair: 3, kettle: () => PH.child ? 0 : 3, cup: () => PH.child ? 0 : 3, plate: 3, door: 3,
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
    //#play 플레이용(01)에만
    if (ConnectedStage.paused || document.hidden || !$('error').hidden) return;
    //#dev 개발자용(02)에만
    if (document.hidden || !$('error').hidden) return;
    //#end
    elapsed += dt; clock += dt;
    //#play 플레이용(01)에만
    if (phase === 'remembered' && elapsed >= .85) { ConnectedStage.leave('complete'); return; }
    //#end
    if (phase === 'acting') updateAction();
    updateProps(dt);updateKitchen(dt);updateWater();updateCamera(dt);
    if (Childhood.active) {
      if (eyeDrop) { camera.position.y += eyeDrop; eyeDrop = 0; }
      Childhood.update(dt, { reduced, clock });
    }
    if (Hikki.active) {
      if (eyeDrop) { camera.position.y += eyeDrop; eyeDrop = 0; }
      Hikki.update(dt, { reduced, clock });
    }
    updateChildRoundClickView();positionAction();Childhood.positionAction(positionTarget);Hikki.positionAction(positionTarget);positionNotes();
    PH.update(dt,{stageIndex});if(phase==='ready')PH.enterRoom(stageIndex);
    // Actual face volumes, eye line and shoulder/head turns follow the camera.
    const pose=elder.update(mirrorView(),clock,reduced,reflectionAmount,reflectionSway,reflectionSmile);
    canvas.dataset.reflectionLean=reflectionAmount.toFixed(3);
    canvas.dataset.reflectionSmile=reflectionSmile.toFixed(3);
    canvas.dataset.headYaw=pose.yaw.toFixed(3);canvas.dataset.headPitch=pose.pitch.toFixed(3);
    // 2페: 거울 속 노인이 회차마다 더 일그러진다(phases.js distort, 마지막 거울 회차 = 최대).
    { const d=MemoryPhase.distort(stagePhase,round);elder.setDistort(reduced?0:d,clock);canvas.dataset.mirrorDistort=d.toFixed(2); }
    mirrorChild=!!childSelf&&PH.child&&PH.phase===1;canvas.dataset.mirrorSelf=mirrorChild?'child':'elder';
    if(mirrorChild){ // 아이 눈이 카메라 높이에 오게, 얼굴이 카메라 바로 뒤에 오게 세운다.
      // 아이 키 그대로(엄마 1.6, 아이 1.1). 거울 보기 동안은 눈높이를 올려(발돋움) 얼굴이 거울에 걸린다.
      const g=childSelf.group,h=childSelf.height,k=1;g.scale.setScalar(k);
      g.rotation.y=Math.PI+pose.yaw*.22/.78;
      const back=(g.userData.front??(g.userData.front=Math.max(...Object.values(childSelf.parts).map(p=>p.userData.box.max.z+p.userData.pivot[2]))))*k+.03;
      g.position.set(camera.position.x-Math.sin(g.rotation.y)*back,camera.position.y-h*.9*k,camera.position.z-Math.cos(g.rotation.y)*back-reflectionAmount*.22);
    }
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
    if(eyeDrop){camera.position.y+=eyeDrop;camera.updateMatrixWorld();eyeDrop=0;}
  }
  //#play 플레이용(01)에만
  ConnectedStage.configure({
    pause() { drag = null; if (audio?.state === 'running') audio.suspend().catch(() => {}); },
    resume() { lastTime = performance.now(); if (audio && soundChoice !== false && !document.hidden) audio.resume().catch(() => {}); },
    focus() { canvas.focus({ preventScroll: true }); },
    stop() { for (const oscillator of scheduledSounds) { try { oscillator.stop(); } catch (_) {} } scheduledSounds.clear(); }
  });
  //#end
