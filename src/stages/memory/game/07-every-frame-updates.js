  // ── 7장. 매 순간 움직임: 물·주방·버튼·카메라를 조금씩 움직이기 ──
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
      actionValue = clamp(elapsed / (PH.child ? 3.6 : 1.35));
      if (PH.child) PH.brushing(actionValue); // 아이 맵: 엄마가 양치해 주고 물도 잠가 준다.
      stages[0].handle.rotation.y = -smooth(PH.child ? range(actionValue, .82, 1) : actionValue) * Math.PI / 2;
      if (actionValue >= 1) {
        stages[0].water.visible = false;
        tone(620, .10, .027, 'triangle');
        if (Childhood.enabled) { Childhood.beginSteal(childRoundPickCamera); transition('story'); return; }
        // Round 4: the bathroom door opens onto the entrance instead of the kitchen.
        entryDetour=noteRound()===4;pendingRoom=entryDetour?2:1;
        if(entryDetour)mirrorFrozen=true;
        phaseStartPosition.copy(camera.position); phaseStartTarget.copy(cameraTarget);
        transition('leaving');
        $('caption').textContent = PH.child ? '엄마가 물을 잠갔다. 주방으로 간다.' : '물을 잠갔다. 주방으로 간다.';
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
      PH.roadOpen();
      if(actionValue>=1&&entryDetour){
        // The front door leads back into the kitchen; the second visit is a real exit.
        entryDetour=false;pendingRoom=1;transition('closing');
      } else if(actionValue>=1&&cfg.school){
        setRoom(4);Childhood.beginSchool();transition('story');
      } else if(actionValue>=1&&cfg.ending==='road'){
        // 3페 마지막 회차: 문 밖은 길. 아이가 달려 나간다(phase-scenes.js ending).
        phaseStartPosition.copy(camera.position);phaseStartTarget.copy(cameraTarget);transition('ending');$('caption').textContent='문 밖은 길이었다. 아이가 달려 나간다.';
      } else if(actionValue>=1){
        const focusCanvas=keyboardActivation;
        //#play 플레이용(01)에만
        // The connected demo ends after the last implemented round, back at the bed.
        pendingLobbyReturn = round === lastRound();
        //#end
        round=Math.min(lastRound(),round+1);
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
      //#play 플레이용(01)에만
      if(t>=1){blink(0);transition(pendingLobbyReturn?'remembered':'ready');$('caption').textContent='침대에서 눈을 떴습니다.';}
      //#dev 개발자용(02)에만
      if(t>=1){blink(0);transition('ready');$('caption').textContent='침대에서 눈을 떴습니다.';}
      //#end
    } else if(phase==='collapse'){
      const r=PH.collapse(elapsed,camera.position,target,cameraStart,cameraTarget);cameraRoll=r.roll;
      canvas.dataset.cutscene=elapsed<3?'struggle':elapsed<4?'fall':elapsed<7.2?'cough':elapsed<8?'down':'black';
      //#play 플레이용(01)에만
      if(r.done){cameraRoll=0;transition('remembered');$('caption').textContent='2페이즈가 끝났습니다.';}
      //#dev 개발자용(02)에만
      if(r.done){cameraRoll=0;transition('cutsceneDone');$('caption').textContent='2페이즈가 끝났습니다.';}
      //#end
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
      if(t>=1){pendingRoom=cfg.school?2:0;transition('closing');}
    } else if(phase==='approaching'){
      const t=clamp(elapsed/(reduced?.18:1.85)),u=smooth(t),pose=sinkPose();
      camera.position.lerpVectors(phaseStartPosition,pose.position,u);
      if(!reduced)camera.position.y+=Math.sin(t*Math.PI*6)*.012*Math.sin(t*Math.PI);
      target.lerpVectors(phaseStartTarget,pose.target,u);
      if(t>=1){
        sinkFocused=true;frameCamera();
        if(PH.child&&PH.phase!==1){transition('ready');$('caption').textContent='세면대 앞에 섰습니다. 엄마가 칫솔을 들고 있습니다.';if(keyboardActivation)action.focus({preventScroll:true});}
        else{transition('reflection');
        canvas.dataset.reflectionShot='approach';
        $('caption').textContent='거울 속 자신의 얼굴을 가까이 봅니다.';}
      }
    } else if(phase==='reflection'){
      const shot=ReflectionIntro.sample(elapsed,reduced),pose=sinkPose();reflectionCam=shot.camera;
      camera.position.copy(pose.position);camera.position.z-=shot.camera*.80;
      target.copy(pose.target).lerp(V(-.50,1.96,-2.24),shot.camera);
      reflectionAmount=shot.figure;reflectionSway=shot.sway;reflectionSmile=shot.smile;
      canvas.dataset.reflectionShot=shot.shot;
      if(shot.done){
        reflectionAmount=reflectionSway=reflectionSmile=0;camera.position.copy(pose.position);target.copy(pose.target);
        canvas.dataset.reflectionShot='idle';transition('ready');
        $('caption').textContent=PH.child?'세면대 앞에 섰습니다. 엄마가 칫솔을 들고 있습니다.':'거울을 보던 시선이 돌아왔습니다. 이제 물건을 사용할 수 있습니다.';
        if(keyboardActivation)action.focus({preventScroll:true});
      }
    } else if(phase==='sitting'){
      const t=clamp(elapsed/(reduced?.18:1.75)),u=smooth(t),pose=seatPose();
      camera.position.lerpVectors(phaseStartPosition,pose.position,u);
      if(!reduced)camera.position.y+=Math.sin(t*Math.PI*5)*.012*Math.sin(t*Math.PI);
      target.lerpVectors(phaseStartTarget,pose.target,u);
      if(t>=1){seated=true;frameCamera();
        if(PH.child&&!PH.served){transition('serving');$('caption').textContent='엄마가 음식을 차려 줍니다.';}
        else{transition('ready');$('caption').textContent='의자에 앉았습니다.';if(keyboardActivation)action.focus({preventScroll:true});}}
    } else if(phase==='serving'){
      const t=clamp(elapsed/(reduced?.6:1.9));PH.serving(t);camera.position.copy(cameraStart);
      if(t>=1){transition('ready');$('caption').textContent='엄마가 차려 준 음식을 먹을 수 있습니다.';if(keyboardActivation)$('food').focus({preventScroll:true});}
    } else if(phase==='ending'){
      const t=elapsed,u=smooth(clamp(t/2.8));
      camera.position.lerpVectors(phaseStartPosition,V(0,1.55,-4.2),u);
      if(!reduced)camera.position.y+=Math.sin(t*Math.PI*9)*.02*(1-u);
      target.lerpVectors(phaseStartTarget,V(0,1.1,-9),u);
      if(PH.ending(t)){cfg.ending=null;transition('acting');elapsed=1.2;}
    } else if(phase==='eating'){
      // 2페: 이상한 음식은 오래 씹는다(씹는 소리·삼키는 소리·화면 울렁임은 phase-scenes.js eating).
      const biteTime=reduced?.75:(cfg.food?4.6:2.40),t=clamp(elapsed/biteTime);PH.eating(t);
      stages[1].bites.forEach((bite,i)=>{
        const segment=clamp(t*3-i);
        bite.visible=segment<1;
        bite.position.set((i-1)*.084-.62*range(segment,.12,.88),.07+.42*range(segment,.12,.88),(i===1?-.012:.022)+.48*range(segment,.12,.88));
      });
      camera.position.copy(cameraStart);
      target.lerpVectors(cameraTarget,V(-.10,1.00,-.62),.25*Math.sin(t*Math.PI));
      if(t>=1){
        eaten=true;PH.endEating();if(PH.child)PH.ate();
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
    // 아이 맵: 아이 키 눈높이(그리는 동안만 낮추고 frame()에서 되돌린다).
    { const y=camera.position.y;PH.childEye(camera.position,target,phase==='reflection'&&mirrorChild?1-reflectionCam:1);eyeDrop=y-camera.position.y; }
    camera.lookAt(target);
    if(cameraRoll)camera.rotateZ(cameraRoll);
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
