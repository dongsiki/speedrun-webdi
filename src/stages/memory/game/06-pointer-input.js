  // ── 6장. 마우스 입력: 무엇을 눌렀는지 찾기, 끌어서 둘러보기 ──
  const childRoundPickCamera = camera.clone();
  const isGuidedChildRound = () => Childhood.active || Hikki.active || stagePhase === 1 && (round === 3 || cfg.school) && PH.child;
  function updateChildRoundClickView() {
    // frame() 끝에서는 아이 눈높이 보정이 되돌려진다. 클릭에는 되돌리기 전,
    // 실제 화면을 그린 카메라의 위치·각도·투영을 한 벌로 보관해 사용한다.
    if (isGuidedChildRound()) childRoundPickCamera.copy(camera, false);
    const guide = stages[0].childTapGuide;
    guide.visible = isGuidedChildRound() && stageIndex === 0 && sinkFocused && phase === 'ready';
    guide.scale.setScalar(guide.visible && !reduced ? 1 + Math.sin(clock * Math.PI * 1.2) * .045 : 1);
    canvas.dataset.p1r3TapCue = guide.visible ? 'on' : 'off';
  }
  function hitAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, isGuidedChildRound() ? childRoundPickCamera : camera);
    scene.updateMatrixWorld(true);
    if (Hikki.active) return raycaster.intersectObjects(Hikki.targets(), false)[0] ? 'hikki-story' : null;
    if (Childhood.active) return raycaster.intersectObjects(Childhood.targets(), false)[0] ? 'child-story' : null;
    let targets;
    if(stageIndex===0){targets=[stages[0].hit,...Object.values(stages[0].props.hits)];if(!sinkFocused)targets.push(stages[0].props.approachHit);}
    else if(stageIndex===1){
      targets=seated?[...(!poured?[stages[1].hit]:[]),...(!eaten&&(!PH.child||PH.served)?[stages[1].foodHit]:[])]:[
        ...((!foodInFridge()||foodCollected)?[stages[1].chairHit]:[]),
        stages[1].fridgeDoorHit,
        ...((foodInFridge()&&fridgeOpen&&!foodCollected)?[stages[1].fridgeFoodHit]:[stages[1].fridgeHit])
      ];
    }
    else targets=[stages[stageIndex].hit];
    if (stageIndex === 0 && stages[0].childTapGuide.visible) targets.push(stages[0].childTapHit);
    const hit=raycaster.intersectObjects(targets,false)[0];
    return hit?(hit.object.userData.interaction||'main'):null;
  }
  canvas.addEventListener('pointerdown', event => {
    if ((phase !== 'ready' && !(Childhood.active && Childhood.canClick) && !(Hikki.active && Hikki.canClick)) || drag || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) {
      if ((phase === 'ready' || Childhood.active && Childhood.canClick || Hikki.active && Hikki.canClick) && event.pointerType !== 'touch') canvas.style.cursor = hitAt(event.clientX, event.clientY) ? 'pointer' : 'grab';
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
    if(clicked==='hikki-story')Hikki.click();
    else if(clicked==='child-story')Childhood.click();
    else if(clicked==='approach')beginApproach(event);
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
