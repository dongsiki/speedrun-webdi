  // ── 2장. 모양 도구: 상자·선·원통 같은 기본 모양, 벽 메모·사진 만들기 ──
  const edgeMaterial = new THREE.LineBasicMaterial({ color: C.ink });
  const fineMaterial = new THREE.LineBasicMaterial({ color: C.ink });
  // 깜빡임 횟수 제한: 물건(묶음)마다 마스크 재질을 따로 두고 횟수를 센다.
  // userData는 복제 때 JSON으로 복사되므로 묶음 번호만 넣는다.
  const blinkGroups = [];
  function emphasize(object, key = 'etc') {
    const group = { key, object, mask: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0, 0), side: THREE.DoubleSide }), start: null, flashes: 0, count: 0 };
    blinkGroups.push(group);
    object.traverse(part => {
      if (part.isMesh && part.material.visible) { part.userData.boldOutline = true; part.userData.blinkGroupIndex = blinkGroups.length - 1; }
    });
    return object;
  }
  function mesh(parent, geometry, mat, outline = true) {
    const object = new THREE.Mesh(geometry, mat);
    parent.add(object);
    if (outline) object.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 24), edgeMaterial));
    return object;
  }
  function box(parent, x, y, z, w, h, d, color = C.white, outline = true) {
    const object = mesh(parent, new THREE.BoxGeometry(w, h, d), material(color), outline);
    object.position.set(x, y, z);
    return object;
  }
  function line(parent, points, fine = false) {
    const object = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => V(...p))), fine ? fineMaterial : edgeMaterial);
    parent.add(object);
    return object;
  }
  function cylinder(parent, x, y, z, top, bottom, height, color = C.white, sides = 12, outline = true) {
    const object = mesh(parent, new THREE.CylinderGeometry(top, bottom, height, sides), material(color), outline);
    object.position.set(x, y, z);
    return object;
  }
  function rod(parent, a, b, radius = .025, color = C.ink, sides = 8) {
    const start = V(...a), end = V(...b), delta = end.clone().sub(start);
    const object = cylinder(parent, ...start.clone().add(end).multiplyScalar(.5).toArray(), radius, radius, delta.length(), color, sides, false);
    object.quaternion.setFromUnitVectors(V(0, 1, 0), delta.normalize());
    return object;
  }
  function torus(parent, x, y, z, radius, thickness, color = C.white, arc = Math.PI * 2, sides = 28) {
    const object = mesh(parent, new THREE.TorusGeometry(radius, thickness, 6, sides, arc), material(color), true);
    object.position.set(x, y, z);
    return object;
  }
  function dots(parent, points, size = .015, color = C.ink) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => V(...p)));
    const object = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size, sizeAttenuation: true }));
    parent.add(object);
    return object;
  }
  // Later mornings reuse the same paper, but the writing has worn away or been
  // corrected by an unknown hand. Coordinates are in the 768px note canvas.
  function wearNote(ctx, marks) {
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const [x, y, w, h] of marks.erase || []) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(x, y + h * .2);
      for (let i = 0; i <= 8; i++) ctx.lineTo(x + w * i / 8, y + (random() - .5) * h * .25);
      for (let i = 8; i >= 0; i--) ctx.lineTo(x + w * i / 8, y + h + (random() - .5) * h * .25);
      ctx.closePath(); ctx.fill();
      // A few surviving ink specks keep the erasure from reading as blank paper.
      ctx.fillStyle = '#000000';
      for (let i = 0; i < w * h / 900; i++) ctx.fillRect(x + random() * w, y + random() * h, 7, 7);
    }
    ctx.strokeStyle = '#000000';
    for (const [x, y, w] of marks.strike || []) {
      ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x + w * .55, y - 4); ctx.lineTo(x + w, y + 3); ctx.stroke();
    }
    ctx.fillStyle = '#000000';
    for (const [text, x, y, size, angle] of marks.write || []) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.font = '700 ' + size + 'px "Malgun Gothic", sans-serif'; ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
  function note(parent, x, y, z, title, tasks, width, height, rotation = -.025, marks = null) {
    // 2026-10-13: a tall card gets a tall sheet, so its letters keep their shape.
    const sheetHeight = Math.max(768, Math.round(768 * height / width));
    const surface = document.createElement('canvas'); surface.width = 768; surface.height = sheetHeight;
    const ctx = surface.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 768, sheetHeight);
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(13, 19); ctx.lineTo(749, 11); ctx.lineTo(758, sheetHeight - 22); ctx.lineTo(8, sheetHeight - 11); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#000000'; ctx.font = '700 77px "Malgun Gothic", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 65, 143, 635); ctx.lineWidth = 5; ctx.strokeText(title, 65, 143, 635);
    ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(63, 207); ctx.lineTo(702, 203); ctx.stroke();
    ctx.font = '700 96px "Malgun Gothic", sans-serif';
    let row = 325;
    for (const lines of tasks) {
      ctx.lineWidth = 12; ctx.strokeRect(61, row - 23, 39, 41);
      for (const text of lines) { ctx.fillText(text, 128, row, 581); ctx.lineWidth = 6; ctx.strokeText(text, 128, row, 581); row += 117; }
      row += 62;
    }
    if (marks) wearNote(ctx, marks);
    const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const card = mesh(parent, new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }), false);
    card.position.set(x, y, z); card.rotation.z = rotation;
    card.userData.sheet = surface; card.userData.size = [width, height];
    const pin = cylinder(card, 0, height / 2 - .042, .012, .014, .014, .016, C.ink, 8, false); pin.rotation.x = Math.PI / 2;
    return card;
  }
  function photo(parent, x, y, z, w = .36, h = .46) {
    const frame = new THREE.Group(); parent.add(frame); frame.position.set(x, y, z);
    box(frame, 0, 0, 0, w, h, .03, C.ink);
    box(frame, 0, 0, .019, w - .035, h - .035, .015, C.pale, false);
    // Only a sparse human silhouette, no raster reference or invented identity.
    cylinder(frame, -.04, .06, .034, .047, .047, .012, C.dark, 12, false).rotation.x = Math.PI / 2;
    const body = mesh(frame, new THREE.CircleGeometry(.092, 16, 0, Math.PI), material(C.dark), false); body.position.set(-.04, -.105, .044);
    return frame;
  }