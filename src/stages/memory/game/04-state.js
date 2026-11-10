  // ── 4장. 지금 상태: 몇 회차인지, 어느 방인지, 카메라·소리 상태 ──
  const stages = [bathroom(), kitchen(), entryway(), bedroom()];
  // 2026-10-29 치매 1·2·3페이즈: 설정 phases.js, 장면 phase-scenes.js. 윤곽선 마스크 목록을 만들기 전에 그림을 붙인다.
  const PH = MemoryPhaseScenes.create({ THREE, scene, stages, renderer, camera, tone: (...a) => tone(...a), audioRef: () => audio });
  let stagePhase = MemoryPhase.initial(), cfg = MemoryPhase.round(stagePhase, 1), eyeDrop = 0;
  let propState=RoutineProps.create();
  const propIds=['flush','lotion','mirror'];
  let propVisual=RoutineProps.sample(propState);
  const Childhood = MemoryChildhoodStory.create({
    T: THREE, scene, stages, camera, canvas, PH,
    props: { set mirrorTarget(value) { propState.mirrorTarget = value; } },
    kit: { box, cylinder, rod, line, mesh, torus, material, C, V },
    sound: (...args) => tone(...args),
    finish(kind) {
      if (kind === 'breakfast') {
        pendingRoom = 1; phaseStartPosition.copy(camera.position); phaseStartTarget.copy(cameraTarget); transition('leaving');
      } else { round = Math.min(lastRound(), round + 1); wakeAtBed(); }
    }
  });
  const Hikki = MemoryHikkiStory.create({
    T: THREE, scene, bedroom: stages[3], camera, canvas, PH,
    kit: { box, cylinder, rod, line, torus, mesh, C, V }, blink,
    start() { startAudio(); transition('story'); },
    finish() { round = Math.min(lastRound(), round + 1); wakeAtBed(); },
    sound: (...args) => tone(...args)
  });
  const maskForeground = new THREE.MeshBasicMaterial({ color: C.white, side: THREE.DoubleSide });
  const maskOccluder = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.DoubleSide });
  const maskHidden = new THREE.MeshBasicMaterial({ visible: false });
  const outlineObjects = [];
  scene.traverse(object => {
    // Keep invisible click targets out of the mask; keep all visible surfaces
    // as depth-tested occluders so outlines cannot reveal objects through walls.
    if (!object.material || !object.material.visible) return;
    outlineObjects.push({ object, original: object.material, mask: object.userData.tasteCutout ? maskHidden : object.isMesh ? (object.userData.boldOutline ? (object.userData.blinkGroupIndex !== undefined ? blinkGroups[object.userData.blinkGroupIndex].mask : maskForeground) : maskOccluder) : maskHidden });
  });
  let stageIndex = 3;
  let round = 1;
  //#play 플레이용(01)에만
  let pendingLobbyReturn = false;
  //#end
  // Each new morning drifts further: round 3 corrects the notes and sets a second
  // cup; round 4 wears the notes away, tangles the doors and loosens the mirror.
  // 2026-10-31: 회차 수는 페이즈마다 phases.js에서 읽는다(지금 모두 5회차).
  const lastRound = () => MemoryPhase.rounds(stagePhase);
  // 페이즈마다 회차에 쓰는 기존 메모·변화(1~4). 아이 맵은 0(메모 없음).
  const noteRound = () => cfg.notes || 0;
  const foodInFridge = () => noteRound() === 2 || noteRound() === 4;
  let entryDetour = false;
  const mirrorHistory = [], laggedView = { position: V(0, 0, 0), quaternion: new THREE.Quaternion() };
  let mirrorFrozen = false;
  let sinkFocused=false;
  let seated=false,fridgeOpen=false,fridgeAmount=0,foodCollected=false,poured=false,eaten=false,pendingRoom=1;
  let reflectionAmount=0,reflectionSway=0,reflectionSmile=0,reflectionCam=0,cameraRoll=0;
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
