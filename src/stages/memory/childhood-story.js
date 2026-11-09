// 2026-11-09 승인된 1페 3회차 립스틱 → 4회차 교실. 다른 페이즈에는 켜지지 않는다.
window.MemoryChildhoodStory = {
  create({ T, scene, stages, camera, canvas, PH, props, kit, finish, sound }) {
    const { box, cylinder, rod, line, mesh, torus, material, C, V } = kit;
    const bath = stages[0];
    const ink = new T.MeshBasicMaterial({ color: 0x000000, side: T.DoubleSide });
    const paper = new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide });
    let mode = 'off', time = 0, enabled = false, schoolEnabled = false, inventory = 'absent', schoolStage = 'off';
    let active = false, lastLine = -1, nextSound = 0;
    const startPosition = V(), startTarget = V(), currentTarget = V();
    const clamp = x => Math.max(0, Math.min(1, x));
    const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
    const button = document.createElement('button'); button.id = 'child-story-action'; button.className = 'object-action'; button.hidden = true;
    document.getElementById('experience').append(button);

    function lipstick(parent) {
      const g = new T.Group(); parent.add(g);
      cylinder(g, 0, .035, 0, .026, .026, .07, C.ink, 12);
      cylinder(g, 0, .085, 0, .022, .022, .03, C.white, 12);
      const tip = cylinder(g, 0, .127, 0, .018, .019, .055, 0x666666, 12);
      tip.rotation.z = -.12;
      return g;
    }
    function cue(parent, radius = .13) {
      const g = new T.Group(); parent.add(g);
      torus(g, 0, 0, 0, radius, .006, C.ink);
      for (const a of [0, 2.1, 4.2]) line(g, [[Math.cos(a) * radius * 1.2, Math.sin(a) * radius * 1.2, 0], [Math.cos(a) * radius * 1.5, Math.sin(a) * radius * 1.5, 0]], true);
      g.visible = false; return g;
    }
    function hit(parent, p, size) {
      const h = box(parent, ...p, ...size, C.white, false);
      h.material = new T.MeshBasicMaterial({ visible: false }); return h;
    }
    const shelfLipstick = lipstick(bath.props.cabinet);
    shelfLipstick.position.set(-.16, -.537, .20); shelfLipstick.visible = false;
    const lipCue = cue(bath.props.cabinet, .15); lipCue.position.set(-.16, -.46, .30);
    const lipHit = hit(bath.props.cabinet, [-.16, -.455, .29], [.35, .31, .16]);

    const hand = new T.Group(); scene.add(hand); hand.visible = false;
    const palm = mesh(hand, new T.SphereGeometry(1, 10, 7), paper); palm.scale.set(.032, .047, .017);
    for (let i = 0; i < 4; i++) rod(hand, [-.023 + i * .015, .025, 0], [-.023 + i * .015, .076 - Math.abs(i - 1.5) * .007, -.012], .0075, C.white, 7);
    rod(hand, [-.026, 0, 0], [-.052, .025, -.008], .009, C.white, 7);
    cylinder(hand, 0, -.10, 0, .033, .042, .16, C.white, 10);
    const pocket = new T.Group(); scene.add(pocket); pocket.visible = false;
    box(pocket, 0, -.12, 0, .80, .32, .03, C.white);
    box(pocket, 0, 0, .022, .15, .14, .02, C.white);
    line(pocket, [[-.075, .055, .039], [.075, .055, .039]], false);
    const heldLipstick = lipstick(hand); heldLipstick.visible = false;

    // 별도 교실 그룹. 다른 방과 2·3페이즈의 형상은 바꾸지 않는다.
    const classroom = new T.Group(); scene.add(classroom); classroom.visible = false;
    box(classroom, 0, -.06, -.4, 7.4, .12, 8, C.white);
    box(classroom, 0, 1.5, -4.4, 7.4, 3, .1, C.white);
    for (const x of [-3.7, 3.7]) box(classroom, x, 1.5, -.4, .1, 3, 8, C.white);
    box(classroom, 0, 3, -.4, 7.4, .08, 8, C.white);
    for (let x = -3.5; x < 3.6; x += 1) line(classroom, [[x, .005, -4.3], [x, .005, 3.5]], true);
    for (let z = -4.2; z < 3.6; z += 1) line(classroom, [[-3.6, .006, z], [3.6, .006, z]], true);
    box(classroom, -.3, 1.55, -4.31, 3.6, 1.05, .05, C.ink);
    box(classroom, -.3, 1.55, -4.27, 3.48, .93, .01, C.white);
    box(classroom, -.3, .99, -4.18, 3.75, .035, .17, C.white);
    for (const z of [-2.7, -.5, 1.7]) {
      box(classroom, -3.63, 1.7, z, .025, 1.3, 1.6, C.ink);
      box(classroom, -3.60, 1.7, z, .025, 1.20, 1.5, C.white);
      box(classroom, -3.57, 1.7, z, .035, 1.20, .025, C.ink);
      box(classroom, -3.57, 1.7, z, .035, .025, 1.5, C.ink);
    }
    function desk(x, z) {
      const g = new T.Group(); classroom.add(g); g.position.set(x, 0, z);
      box(g, 0, .54, 0, .73, .045, .48, C.white);
      for (const a of [-.30, .30]) for (const b of [-.17, .17]) rod(g, [a, .52, b], [a, .02, b], .014, C.ink);
      const chair = new T.Group(); g.add(chair); chair.position.z = .65;
      box(chair, 0, .24, 0, .36, .025, .34, C.white);
      box(chair, 0, .43, .15, .36, .34, .027, C.white);
      for (const a of [-.145, .145]) for (const b of [-.13, .13]) rod(chair, [a, .23, b], [a, .015, b], .012, C.ink);
      return { group: g, chair };
    }
    const playerDesk = desk(0, .55), friendDesk = desk(-.86, .55);
    for (const x of [-2.4, -1.25, .95, 2.2]) for (const z of [-1.05, -2.6]) desk(x, z);
    const seatCue = cue(playerDesk.chair, .25); seatCue.position.set(0, .44, .18);
    const seatHit = hit(playerDesk.chair, [0, .33, 0], [.52, .62, .52]);

    function child(seated, variant = 0) {
      const model = window.MemoryPhaseModels.build(T, 'child'), holder = new T.Group(); classroom.add(holder); holder.add(model.group);
      const geometry = model.parts.body.children[0].geometry, p = geometry.attributes.position;
      const rest = Array.from(p.array), posed = new Float32Array(p.array.length);
      const pivot = V(0, .4, 0), tmp = V(), upper = new T.Matrix4().makeTranslation(0, .4, 0).multiply(new T.Matrix4().makeRotationX(-1.4)).multiply(new T.Matrix4().makeTranslation(0, -.4, 0));
      const lower = upper.clone().multiply(new T.Matrix4().makeTranslation(0, .22, 0)).multiply(new T.Matrix4().makeRotationX(1.4)).multiply(new T.Matrix4().makeTranslation(0, -.22, 0));
      for (let i = 0; i < p.count; i++) {
        tmp.fromArray(rest, i * 3);
        if (seated && tmp.y < .43 && Math.abs(tmp.x) < .135) tmp.applyMatrix4(tmp.y > .22 ? upper : lower);
        tmp.toArray(posed, i * 3);
      }
      p.array.set(posed); geometry.computeVertexNormals(); geometry.computeBoundingBox();
      model.group.position.y = -geometry.boundingBox.min.y;
      holder.scale.setScalar(1 + variant * .025);
      // 단순한 옷깃을 더하고 기존 어린이 모델의 얼굴·머리 형상을 재사용한다.
      box(model.group, 0, .765, .09, .15, .035, .03, C.white);
      const smile = new T.Group(); model.group.add(smile); smile.position.set(0, .912, .089); smile.visible = false;
      const mouth = new T.Mesh(new T.TorusGeometry(.023, .006, 5, 12, Math.PI), ink); mouth.rotation.z = Math.PI; smile.add(mouth);
      return { holder, model, geometry, posed, smile, seated, turn: 0, reach: 0,
        update(head = 0, reach = 0, laugh = false) {
          const headTurn = new T.Matrix4().makeTranslation(0, .87, 0).multiply(new T.Matrix4().makeRotationY(head)).multiply(new T.Matrix4().makeTranslation(0, -.87, 0));
          const arm = new T.Matrix4().makeTranslation(-.15, .79, 0).multiply(new T.Matrix4().makeRotationX(-reach * 1.2)).multiply(new T.Matrix4().makeTranslation(.15, -.79, 0));
          for (let i = 0; i < p.count; i++) {
            tmp.fromArray(posed, i * 3);
            if (rest[i * 3 + 1] > .82) tmp.applyMatrix4(headTurn);
            else if (rest[i * 3] < -.135 && rest[i * 3 + 1] > .42) tmp.applyMatrix4(arm);
            p.setXYZ(i, tmp.x, tmp.y, tmp.z);
          }
          p.needsUpdate = true; geometry.computeVertexNormals();
          smile.visible = laugh;
          model.group.rotation.z = laugh ? Math.sin(time * 7 + variant) * .017 : 0;
          smile.scale.y = laugh ? 1 + Math.sin(time * 10 + variant) * .25 : 1;
        }
      };
    }
    const friend = child(true); friend.holder.position.set(-.86, 0, 1.2); friend.holder.rotation.y = 2.4;
    const friendCue = cue(classroom, .19); friendCue.position.set(-.86, .83, 1.1);
    const friendHit = hit(classroom, [-.86, .68, 1.16], [.45, .7, .35]);
    const children = [child(false, -1), child(false, 1), child(false, 0)];
    const starts = [V(-2.3, 0, -.8), V(2.5, 0, -.2), V(1.9, 0, 2.8)];
    const ends = [V(-.55, 0, .08), V(.72, 0, -.35), V(.65, 0, .12)];
    for (let i = 0; i < children.length; i++) { children[i].holder.position.copy(starts[i]); children[i].holder.visible = false; }
    const pencil = new T.Group(); playerDesk.group.add(pencil); pencil.position.set(0, .575, .025);
    box(pencil, 0, .025, 0, .27, .05, .14, C.white);
    box(pencil, 0, .052, 0, .23, .005, .10, C.ink);
    const lid = new T.Group(); pencil.add(lid); lid.position.set(0, .052, -.07);
    box(lid, 0, 0, .07, .28, .018, .15, C.white);
    line(lid, [[-.10, .012, .035], [.10, .012, .035]], true);
    const pencilCue = cue(pencil, .20); pencilCue.rotation.x = -Math.PI / 2; pencilCue.position.y = .075;
    const pencilHit = hit(pencil, [0, .04, 0], [.44, .20, .32]);
    const fallenLipstick = lipstick(classroom); fallenLipstick.visible = false;
    const school = { group: classroom, hit: seatHit, notes: [], name: '교실', label: '자리', reminder: '' };
    stages.push(school);

    function set(next) { mode = next; time = 0; lastLine = -1; updateUI(); }
    function canClick() { return ['lipstick', 'seat', 'friend', 'pencil'].includes(mode); }
    function target() { return mode === 'lipstick' ? lipHit : mode === 'seat' ? seatHit : mode === 'friend' ? friendHit : mode === 'pencil' ? pencilHit : null; }
    function updateUI() {
      button.hidden = !active || !canClick(); button.disabled = button.hidden;
      button.setAttribute('aria-label', mode === 'lipstick' ? '립스틱 집기' : mode === 'seat' ? '자리에 앉기' : mode === 'friend' ? '짝꿍에게 인사하기' : '필통 열기');
      canvas.dataset.lipstick = inventory; canvas.dataset.schoolStage = schoolStage;
      canvas.dataset.childhoodMode = mode; canvas.dataset.lipstickCue = String(lipCue.visible);
      canvas.dataset.schoolActive = String(active && schoolEnabled);
    }
    function reset(cfg, phase, round) {
      active = false; mode = 'off'; nextSound = 0; enabled = phase === 1 && !!cfg.stealLipstick; schoolEnabled = phase === 1 && !!cfg.school;
      if (round === 1 || enabled || phase !== 1) { inventory = 'absent'; schoolStage = 'off'; }
      classroom.visible = false; hand.visible = pocket.visible = shelfLipstick.visible = heldLipstick.visible = lipCue.visible = false;
      seatCue.visible = friendCue.visible = pencilCue.visible = fallenLipstick.visible = false;
      props.mirrorTarget = 0; PH.motherAway(0); lid.rotation.x = 0;
      friend.update(0, 0, false); for (let i = 0; i < children.length; i++) { children[i].holder.position.copy(starts[i]); children[i].holder.visible = false; }
      updateUI();
    }
    function beginSteal(view) {
      active = true; inventory = 'shelf';
      startPosition.copy(view.position); view.getWorldDirection(startTarget).multiplyScalar(2).add(view.position);
      PH.brushing(0); props.mirrorTarget = 1; shelfLipstick.visible = true; set('turning');
    }
    function beginSchool() {
      active = true; schoolStage = 'enter'; PH.say(''); set('enter');
    }
    function click() {
      if (!active || !canClick()) return;
      sound(420, .08, .02, 'triangle');
      if (mode === 'lipstick') { hand.visible = true; set('pocket'); }
      else if (mode === 'seat') { schoolStage = 'sitting'; set('sit'); }
      else if (mode === 'friend') { schoolStage = 'greeting'; PH.say('안녕.', 1300); set('greeting'); }
      else { schoolStage = 'opening'; set('opening'); }
    }
    button.addEventListener('click', click);
    function cameraAt(position, target) { camera.position.copy(position); camera.lookAt(target); camera.updateMatrixWorld(); }
    function update(dt, { reduced, clock }) {
      if (!active) return;
      time += dt; lipCue.visible = mode === 'lipstick'; seatCue.visible = mode === 'seat'; friendCue.visible = mode === 'friend'; pencilCue.visible = mode === 'pencil';
      for (const g of [lipCue, seatCue, friendCue, pencilCue]) g.scale.setScalar(g.visible && !reduced ? 1 + Math.sin(clock * Math.PI * 1.2) * .045 : 1);
      if (['turning', 'lipstick', 'pocket', 'returning'].includes(mode)) {
        const u = smooth(time / .8);
        cameraAt(startPosition.clone().lerp(V(-.49, 1.52, -.42), mode === 'turning' ? u : 1), startTarget.clone().lerp(V(-.79, 1.60, -2.27), mode === 'turning' ? u : 1));
        PH.motherAway(mode === 'returning' ? 1 - smooth(time / .8) : mode === 'turning' ? u : 1);
        if (mode === 'turning' && time > 1) set('lipstick');
        else if (mode === 'pocket') {
          const t = clamp(time / 2.2), world = V(); shelfLipstick.getWorldPosition(world); world.y += .07;
          const from = V(.20, -.18, -.4).applyMatrix4(camera.matrixWorld), to = V(.16, -.20, -.42).applyMatrix4(camera.matrixWorld);
          if (t < .45) hand.position.lerpVectors(from, world, smooth(t / .45));
          else { hand.position.lerpVectors(world, to, smooth((t - .45) / .55)); shelfLipstick.visible = false; heldLipstick.visible = true; heldLipstick.position.set(0, .045, .005); }
          hand.quaternion.copy(camera.quaternion); pocket.visible = t > .5;
          pocket.position.copy(V(.16, -.21, -.45).applyMatrix4(camera.matrixWorld)); pocket.quaternion.copy(camera.quaternion);
          if (t >= 1) { inventory = 'pocket'; hand.visible = pocket.visible = heldLipstick.visible = false; PH.say('가자, 밥 먹자.', 1900); set('returning'); }
        } else if (mode === 'returning' && time > 1.5) { active = false; PH.motherAway(0); props.mirrorTarget = 0; mode = 'off'; finish('breakfast'); }
      } else {
        classroom.visible = true;
        const sitting = !['enter', 'seat', 'sit'].includes(mode);
        const seatPosition = V(0, .86, 1.48), deskTarget = V(-.42, .63, .58), friendTarget = V(-.86, .84, 1.10);
        const actionPosition = seatPosition.clone();
        camera.fov = mode === 'pencil' ? 51 + 34 * smooth(time) : ['enter','seat','sit','friend','greeting'].includes(mode) ? 51 : 85;
        camera.updateProjectionMatrix();
        if (mode === 'enter' || mode === 'seat') cameraAt(V(2.6, 1.4, 3.15), V(-.20, .62, .7));
        else if (mode === 'sit') {
          const u = smooth(time / 1.8); cameraAt(V(2.6, 1.4, 3.15).lerp(seatPosition, u), V(-.20, .62, .7).lerp(friendTarget, u));
        } else if (mode === 'friend' || mode === 'greeting') cameraAt(seatPosition, friendTarget);
        else if (mode === 'pencil') cameraAt(seatPosition.clone().lerp(actionPosition, smooth(time)), friendTarget.clone().lerp(deskTarget, smooth(time)));
        else if (mode === 'drop') cameraAt(actionPosition, deskTarget.clone().lerp(V(-.60, .70, .62), smooth(time / .7)));
        else cameraAt(actionPosition, deskTarget.clone().lerp(V(-.35, .82, .45), ['crowd', 'grab', 'away', 'fade'].includes(mode) ? smooth(time / 1.3) : 0));
        friendCue.lookAt(camera.position); seatCue.lookAt(camera.position);
        const avoids = (mode === 'drop' && time > .3) || ['crowd', 'grab', 'away', 'fade'].includes(mode);
        friend.update(avoids ? .85 : sitting ? -.95 : 0, 0, false);
        canvas.dataset.friendGaze = avoids ? 'away' : sitting ? 'toward' : 'neutral';
        if (mode === 'enter' && time > .7) { schoolStage = 'seat'; set('seat'); }
        else if (mode === 'sit' && time > 1.8) { schoolStage = 'friend'; set('friend'); }
        else if (mode === 'greeting') {
          if (time > 1.4 && lastLine < 0) { lastLine = 1; PH.say('…안녕.', 1400); }
          if (time > 3) { schoolStage = 'pencil'; set('pencil'); }
        } else if (mode === 'opening') {
          lid.rotation.x = -smooth(time / .65) * 2.0;
          if (time > .45) {
            fallenLipstick.visible = true;
            const t = smooth((time - .45) / 1.4);
            fallenLipstick.position.set(-.68 * t, .60 + Math.sin(t * Math.PI) * .035, .575 - .04 * t);
            fallenLipstick.rotation.set(t * Math.PI * 4, 0, Math.PI / 2);
          }
          if (time > 2.1) { schoolStage = 'drop'; set('drop'); }
        } else if (mode === 'drop' && time > 1.3) { schoolStage = 'crowd'; set('crowd'); }
        else if (mode === 'crowd') {
          for (let i = 0; i < children.length; i++) {
            const kid = children[i]; kid.holder.visible = true; const u = smooth((time - i * .15) / 1.9);
            kid.holder.position.lerpVectors(starts[i], ends[i], u); kid.holder.position.y = reduced ? 0 : Math.abs(Math.sin(time * 9 + i)) * .014 * (1 - u);
            kid.holder.rotation.y = Math.atan2(-kid.holder.position.x, .7 - kid.holder.position.z);
            kid.update(0, i ? .5 : 0, true);
          }
          if (time >= nextSound) { sound(380 + (Math.floor(time * 3) % 3) * 90, .10, .028, 'triangle'); nextSound = time + .24; }
          if (time > 3) { schoolStage = 'grab'; set('grab'); }
        } else if (mode === 'grab') {
          children[0].update(0, smooth(time / .55), true);
          const t = smooth(time / 1.15), handPoint = children[0].holder.localToWorld(V(-.13, .63, .36));
          fallenLipstick.position.lerpVectors(V(-.68, .60, .535), handPoint, t);
          if (time > 1.3) { inventory = 'taken'; schoolStage = 'away'; set('away'); }
        } else if (mode === 'away') {
          const t = smooth(time / 2);
          children[0].holder.position.lerpVectors(ends[0], V(-1.8, 0, -.4), t);
          fallenLipstick.position.copy(children[0].holder.localToWorld(V(-.13, .63, .36)));
          if (time > 2.5) { schoolStage = 'fade'; set('fade'); }
        } else if (mode === 'fade' && time > .5) { active = false; classroom.visible = false; mode = 'off'; schoolStage = 'done'; finish('school'); }
      }
      updateUI();
    }
    return {
      school, reset, beginSteal, beginSchool, click, update,
      get active() { return active; }, get canClick() { return canClick(); },
      get enabled() { return enabled; }, get schoolEnabled() { return schoolEnabled; },
      targets() { return active && canClick() ? [target()] : []; },
      positionAction(position) { if (!button.hidden && target()) position(target(), button); }
    };
  }
};
