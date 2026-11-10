  // ── 5장. 소리와 행동: 소리 내기, 방 옮기기, 앉기·냉장고·먹기, 버튼 연결 ──
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
    canvas.setAttribute('aria-busy', String(['waking','rising','leavingBed','approaching','reflection','sitting','serving','acting','eating','leaving','leavingKitchen','closing','opening','ending','collapse'].includes(next)));
  }
  function syncTargets(){
    if (Childhood.active || Hikki.active) {
      for (const id of ['action','approach',...propIds.map(id=>'prop-'+id),'chair','fridge','fridge-food','food']) { $(id).hidden = true; $(id).disabled = true; }
      return;
    }
    const far=stageIndex===0&&!sinkFocused,ready=phase==='ready';
    const mainHidden=far||(stageIndex===1&&(!seated||poured));
    action.hidden=mainHidden;action.disabled=!ready||mainHidden;
    $('approach').hidden=!far;$('approach').disabled=!ready||!far;
    for(const id of propIds){
      const hidden=stageIndex!==0||(far&&id!=='flush');
      $('prop-'+id).hidden=hidden;$('prop-'+id).disabled=!ready||hidden;
    }
    for(const [id,hidden] of [['chair',stageIndex!==1||seated||(foodInFridge()&&!foodCollected)],['fridge',stageIndex!==1||seated],['fridge-food',stageIndex!==1||seated||!foodInFridge()||!fridgeOpen||foodCollected],['food',stageIndex!==1||!seated||eaten||(PH.child&&!PH.served)]]){
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
    action.setAttribute('aria-label', PH.child&&index===0?'양치하기':stages[index].label);
    // 2026-10-31: 메모 글은 모든 페이즈·회차에서 1회차 그대로(이상 징후만 회차별로 바뀜).
    $('room-note').textContent = PH.child?stages[index].name:stages[index].reminder;
    if(index===2){stages[2].door.rotation.y=0;stages[2].notes[0].visible=!PH.child;stages[2].notes[1].visible=false;}
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
    cfg=MemoryPhase.round(stagePhase,round);PH.setRound(stagePhase,cfg);PH.clearEnding();Childhood.reset(cfg,stagePhase,round);Hikki.reset(cfg,stagePhase);
    if(PH.child)poured=true; // 아이 맵: 차는 없고 엄마가 차려 준 음식만 먹는다.
    reflectionAmount=reflectionSway=reflectionSmile=0;canvas.dataset.reflectionShot='idle';
    propState=RoutineProps.create();updateProps(0);
    stages[1].kettle.position.set(-.63, .991, -1.04); stages[1].kettle.rotation.z = 0;
    stages[1].liquid.position.y = .03; stages[1].pour.visible = false; stages[1].steam.visible = false;
    stages[1].fridgeDoor.rotation.y=0;
    stages[1].notes.forEach((card,i)=>card.visible=noteRound()>0&&i===0);
    stages[0].notes.forEach((card,i)=>card.visible=noteRound()>0&&i===0);
    stages[1].otherCup.visible=noteRound()===3;stages[1].chairMarks.visible=noteRound()>=3;
    stages[1].fridgeFood.visible=foodInFridge();
    for(const [i,bite] of stages[1].bites.entries()){bite.visible=!foodInFridge()&&!PH.child;bite.position.set((i-1)*.084,.07,i===1?-.012:.022);}
    entryDetour=false;mirrorFrozen=false;mirrorHistory.length=0;cameraRoll=0;
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
      desiredX=desiredY=lookX=lookY=0;startAudio();
      // 2페 마지막 회차: 일어나지 못하고 침대에서 떨어지는 컷신(엔딩 아님).
      if(cfg.cutscene==='collapse'){transition('collapse');$('caption').textContent='침대에서 일어나려고 애씁니다.';return;}
      transition('rising');
      $('caption').textContent='침대에서 일어납니다.';
      return;
    }
    if(RoutineProps.intent('main',stageIndex,phase,sinkFocused)==='approach'){beginApproach(event);return;}
    if(stageIndex===1&&(!seated||poured))return;
    keyboardActivation = Boolean(event && event.type === 'click' && event.detail === 0);
    startAudio();
    desiredX = desiredY = 0;
    transition('acting'); actionValue = 0;
    $('caption').textContent = stageIndex === 0 ? (PH.child?'엄마가 이를 닦아 줍니다.':'수도꼭지를 돌리고 있습니다.') : stageIndex===1?'차를 따르고 있습니다.':'현관문을 엽니다.';
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
    $('caption').textContent=cfg.food?'접시 위의 것을 입에 넣습니다.':'식탁의 음식을 먹습니다.';
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
  //#play 플레이용(01)에만
  $('restart').addEventListener('click', event => { pendingLobbyReturn=false;round=1;wakeAtBed(event.detail===0); });
  //#dev 개발자용(02)에만
  $('restart').addEventListener('click', event => { round=1;wakeAtBed(event.detail===0); });
  //#end
  // 페이즈 바꾸기(postMessage, phases.js 설명): 그 페이즈 1회차부터.
  //#play 플레이용(01)에만
  MemoryPhase.onChange(p => { stagePhase=p;pendingLobbyReturn=false;round=1;wakeAtBed(); });
  //#dev 개발자용(02)에만
  MemoryPhase.onChange(p => { stagePhase=p;round=1;wakeAtBed(); });
  // 10/31 개발자용 컷신 버튼: 부모의 {channel:'speedrun-memory-cutscene'} 메시지로 지금 페이즈의 컷신 회차로 바로 간다.
  // 1페 = 3회차 거울 속 아이, 2페 = 5회차 침대 컷신, 3페 = 마지막 회차 현관 너머 길.
  function playCutscene(){
    startAudio();keyboardActivation=false;
    if(stagePhase===1){round=3;reset(0);beginApproach();return;}
    round=lastRound();
    if(stagePhase===2){reset(3);activate();return;}
    reset(2);activate();
  }
  addEventListener('message',e=>{if(e.data&&e.data.channel==='speedrun-memory-cutscene')playCutscene();});
  //#end
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
