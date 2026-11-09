  // ── 3장. 방 4개 만들기: 화장실·주방·현관·침실 ──
  function room(parent, kitchen = false) {
    box(parent, 0, -.08, .4, 6, .16, 6, C.white);
    box(parent, 0, 1.65, -2.66, 6.12, 3.3, .12, C.white);
    box(parent, -3.06, 1.65, .4, .12, 3.3, 6.12, C.white);
    // A real opening in the right wall gives the automatic walk a destination.
    box(parent, 3.06, 1.65, -1.19, .12, 3.3, 3.06, C.white);
    box(parent, 3.06, 2.89, 1.0, .12, .82, 1.3, C.white);
    box(parent, 3.06, 1.65, 2.52, .12, 3.3, 1.74, C.white);
    box(parent, 3.8, 1.3, 1.0, .07, 2.6, 1.3, C.white);
    box(parent, 3.4, -.015, 1, .8, .06, 1.3, C.gray);
    box(parent, 3.00, 1.24, .33, .18, 2.48, .07, C.white);
    box(parent, 3.00, 1.24, 1.67, .18, 2.48, .07, C.white);
    box(parent, 3.00, 2.49, 1.0, .18, .07, 1.4, C.white);
    const floorPoints = [];
    for (let x = -3; x <= 3; x += 1) {
      line(parent, [[x, .007, -2.6], [x, .007, 3.4]], true);
      for (let z = -2.6; z <= 3.4; z += 1) floorPoints.push([x, .012, z]);
    }
    for (let z = -2.6; z <= 3.41; z += kitchen ? 1.5 : 1) line(parent, [[-3, .007, z], [3, .007, z]], true);
    dots(parent, floorPoints, .016, C.ink);
    line(parent, [[-3, .09, 3.4], [-3, .09, -2.58], [3, .09, -2.58]], true);
    // No cast shadows, fake pools of light, or orientation-based face shading.
    const cross = new THREE.Group(); parent.add(cross);
    line(cross, [[-2.94, 2.52, -.45], [-2.94, 2.52, .55]], true);
    line(cross, [[-2.94, 2.14, .05], [-2.94, 2.92, .05]], true);
  }

  function bathroom() {
    const group = new THREE.Group(); scene.add(group); room(group);
    box(group, -.6, .43, -2.09, 1.9, .8, .83, C.pale);
    box(group, -.6, .14, -2.05, 1.75, .11, .7, C.dark);
    box(group, -.6, .52, -1.666, .018, .56, .009, C.gray, false);
    rod(group, [-.82, .72, -1.654], [-.7, .72, -1.654], .012);
    rod(group, [-.5, .72, -1.654], [-.38, .72, -1.654], .012);
    // A basin built from separate rim and interior planes, genuinely hollow.
    const basin = new THREE.Group(); group.add(basin);
    box(basin, -.6, .91, -2.08, 2.04, .12, .91, C.white);
    box(basin, -.6, .976, -2.02, 1.24, .012, .52, C.white);
    box(basin, -.6, .997, -2.33, 1.38, .04, .14, C.white);
    box(basin, -.6, .997, -1.71, 1.38, .04, .14, C.white);
    box(basin, -1.29, .997, -2.02, .14, .04, .75, C.white);
    box(basin, .09, .997, -2.02, .14, .04, .75, C.white);
    cylinder(basin, -.6, .99, -2.02, .047, .047, .01, C.ink, 12, false);
    emphasize(basin,'basin');
    const tap = new THREE.Group(); group.add(tap); tap.position.set(-.6, .999, -2.34);
    cylinder(tap, 0, .025, 0, .077, .077, .05, C.ink);
    rod(tap, [0, .025, 0], [0, .25, 0], .038, C.gray);
    rod(tap, [0, .25, 0], [0, .25, .22], .038, C.gray);
    rod(tap, [0, .25, .22], [0, .20, .22], .036, C.gray);
    const handle = new THREE.Group(); tap.add(handle); handle.position.set(0, .275, 0);
    rod(handle, [0, 0, 0], [.18, .025, 0], .016, C.ink);
    emphasize(tap,'tap');
    const cabinet = new THREE.Group(); group.add(cabinet); cabinet.position.set(-.63, 2.04, -2.55);
    box(cabinet, 0, 0, .015, 1.91, 1.18, .03, C.white);
    for(const x of [-.93,.93])box(cabinet,x,0,.16,.06,1.18,.32,C.white);
    for(const y of [-.575,.575])box(cabinet,0,y,.16,1.91,.05,.32,C.white);
    for(const y of [-.20,.18])box(cabinet,0,y,.16,1.80,.035,.29,C.white);
    for(const [x,y,r,h] of [[-.60,-.40,.075,.30],[-.25,-.42,.06,.26],[.12,-.40,.08,.30],[-.53,.36,.055,.32]]){
      cylinder(cabinet,x,y,.16,r,r,h,C.white,10);
      cylinder(cabinet,x,y+h/2+.02,.16,r*.8,r*.8,.04,C.ink,10,false);
    }
    for(let i=0;i<3;i++)box(cabinet,.42,.225+i*.075,.16,.48,.065,.22,C.white);
    const mirrorDoor = new THREE.Group(); cabinet.add(mirrorDoor); mirrorDoor.position.set(-.95,0,.34);
    box(mirrorDoor,.95,0,0,1.91,1.18,.05,C.ink);
    box(mirrorDoor,.95,0,-.032,1.83,1.10,.012,C.white,false);
    const mirrorSurface=new Reflector(new THREE.PlaneGeometry(1.83,1.10),{
      textureWidth:1024,textureHeight:1024,multisample:0,clipBias:.003,color:new THREE.Color().setRGB(.5,.5,.5)
    });
    mirrorSurface.position.set(.95,0,.044);mirrorDoor.add(mirrorSurface);
    const reflect=mirrorSurface.onBeforeRender;
    mirrorSurface.onBeforeRender=function(...args){
      // The outline pass must not overwrite the mirror with mask materials.
      if(renderer.getRenderTarget()===outlineTarget)return;
      const self=mirrorChild?childSelf.group:reflectedSelf;
      self.visible=true;
      try{reflect.apply(this,args);}finally{self.visible=false;}
    };
    line(mirrorDoor,[[.16,-.31,.043],[.59,.46,.043]],true);
    line(mirrorDoor,[[.32,-.31,.044],[.74,.46,.044]],true);
    rod(mirrorDoor,[1.79,-.38,.06],[1.79,-.17,.06],.019,C.ink);
    emphasize(mirrorDoor,'mirror');
    const mirrorHit=box(mirrorDoor,.95,0,.055,1.91,1.18,.08,C.white,false);
    mirrorHit.material=new THREE.MeshBasicMaterial({visible:false});
    box(group, -.63, 1.424, -2.4, 2.03, .06, .27, C.white);
    cylinder(group, -1.35, 1.55, -2.36, .06, .05, .19, C.white, 10);
    rod(group, [-1.365, 1.55, -2.36], [-1.39, 1.79, -2.36], .013, C.ink);
    box(group, -1.39, 1.8, -2.36, .04, .06, .025, C.gray, false);
    const bathNotes=[
      note(group, .99, 2.00, -2.58, '나가기 전에', [['수도 잠그기'], ['주방 가기']], 1.18, 1.08),
      // Round 3: someone has corrected the first task.
      note(group, .99, 2.00, -2.58, '나가기 전에', [['수도 잠그기'], ['주방 가기']], 1.18, 1.08, -.025, {strike:[[370,325,280]],write:[['틀기',300,640,150,-.07]]}),
      // Round 4: the verbs have worn away.
      note(group, .99, 2.00, -2.58, '나가기 전에', [['수도 잠그기'], ['주방 가기']], 1.18, 1.08, -.025, {erase:[[355,270,330,110],[120,450,215,110],[40,95,180,95]]})
    ];
    for(const [i,card] of bathNotes.entries())card.visible=i===0;
    // Geometric toilet: tank, bowl, dark recess and an open ring.
    box(group, 1.72, .79, -2.23, .63, .67, .30, C.white);
    box(group, 1.72, 1.15, -2.23, .69, .07, .34, C.white);
    const flushButton=box(group,1.90,1.198,-2.23,.17,.026,.11,C.white);
    emphasize(flushButton,'flush');
    const flushHit=box(group,1.90,1.22,-2.20,.29,.15,.26,C.white,false);
    flushHit.material=new THREE.MeshBasicMaterial({visible:false});
    const bowl = cylinder(group, 1.72, .33, -1.84, .32, .20, .51, C.white, 12); bowl.scale.z = 1.28;
    const inside = cylinder(group, 1.72, .594, -1.80, .24, .24, .015, C.dark, 14, false); inside.scale.z = 1.25;
    const seat = torus(group, 1.72, .61, -1.8, .282, .033, C.white); seat.rotation.x = -Math.PI / 2; seat.scale.y = 1.25;
    const bowlWater=new THREE.Group();group.add(bowlWater);bowlWater.position.set(1.72,.607,-1.8);
    const waterSurface=cylinder(bowlWater,0,0,0,.222,.222,.006,C.white,24,false);waterSurface.scale.z=1.25;
    const whirlpool=new THREE.Group();bowlWater.add(whirlpool);
    for(let j=0;j<3;j++)line(whirlpool,Array.from({length:35},(_,i)=>{
      const a=i/34*Math.PI*1.22+j*Math.PI*2/3,r=.20-i/34*.13;
      return [Math.cos(a)*r,.006,Math.sin(a)*r*1.25];
    }),true);
    const lotion=new THREE.Group();group.add(lotion);lotion.position.set(.24,1.035,-2.12);
    cylinder(lotion,0,.14,0,.085,.105,.28,C.white,12);
    cylinder(lotion,0,.295,0,.045,.06,.045,C.white,10);
    box(lotion,0,.15,.096,.105,.115,.012,C.white);
    line(lotion,[[-.026,.165,.105],[.027,.165,.105]],true);
    const pump=new THREE.Group();lotion.add(pump);pump.position.y=.355;
    cylinder(pump,0,-.021,0,.019,.019,.07,C.ink,8,false);
    box(pump,0,.018,.055,.14,.036,.23,C.white);
    box(pump,0,-.005,.161,.045,.042,.026,C.ink,false);
    const tray=cylinder(lotion,0,-.035,.34,.107,.11,.026,C.white,20);tray.scale.z=.72;
    const cream=new THREE.Group();lotion.add(cream);cream.position.set(0,.32,.175);cream.visible=false;
    const creamPath=new THREE.QuadraticBezierCurve3(V(0,0,0),V(.017,-.07,.15),V(0,-.326,.165));
    mesh(cream,new THREE.TubeGeometry(creamPath,18,.012,6,false),material(C.white),true);
    const dollop=mesh(lotion,new THREE.SphereGeometry(.036,12,8),material(C.white),true);
    dollop.position.set(0,-.01,.34);dollop.scale.set(1,.52,1);dollop.visible=false;
    emphasize(lotion,'lotion');
    const lotionHit=box(lotion,0,.19,.04,.31,.49,.31,C.white,false);
    lotionHit.material=new THREE.MeshBasicMaterial({visible:false});
    rod(group, [2.46, .98, -2.18], [2.46, .98, -1.94], .018, C.ink);
    const roll = cylinder(group, 2.46, .94, -2.06, .08, .08, .15, C.white, 12); roll.rotation.x = Math.PI / 2;
    rod(group, [-2.4, 1.38, -2.50], [-1.84, 1.38, -2.50], .018, C.ink);
    box(group, -2.09, 1.1, -2.45, .33, .56, .026, C.gray);
    line(group, [[-2.22, .86, -2.43], [-1.97, .86, -2.43]], true);
    box(group, -.6, .018, -.98, 1.45, .023, .53, C.white);
    for (let x = -1.18; x <= .02; x += .10) line(group, [[x, .032, -1.19], [x, .032, -.77]], true);
    const water = new THREE.Group(); group.add(water);
    const waterSegments = [];
    for (let i = 0; i < 7; i++) {
      waterSegments.push(line(water, [[-.6 + ((i % 3) - 1) * .012, 1.177 - i * .025, -2.115], [-.6 + ((i % 3) - 1) * .012, 1.162 - i * .025, -2.115]], true));
    }
    const ripples = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 36 }, (_, j) => V(Math.cos(j / 36 * Math.PI * 2) * .10, 0, Math.sin(j / 36 * Math.PI * 2) * .07))), fineMaterial);
      ring.position.set(-.6, .986, -2.115); water.add(ring); ripples.push(ring);
    }
    const hit = box(tap, 0, .14, .08, .46, .36, .46, C.white, false); hit.material = new THREE.MeshBasicMaterial({ visible: false });
    // 1페 3회차 전용: 아이 시점에서 다음 행동인 수도꼭지를 찾을 수 있는 입체 표시.
    // 초기에는 숨기고 해당 회차의 세면대 앞 ready 상태에서만 켠다.
    const childTapGuide = new THREE.Group(); tap.add(childTapGuide); childTapGuide.visible = false;
    torus(childTapGuide, 0, .14, .27, .23, .006, C.ink);
    for (const angle of [-.18, Math.PI / 2 + .12, Math.PI + .18]) {
      line(childTapGuide, [[Math.cos(angle) * .27, .14 + Math.sin(angle) * .27, .27],
        [Math.cos(angle) * .32, .14 + Math.sin(angle) * .32, .27]], true);
    }
    const childTapHit = box(tap, 0, .14, .29, .64, .60, .12, C.white, false);
    childTapHit.material = new THREE.MeshBasicMaterial({ visible: false });
    childTapHit.userData.interaction = 'main';
    const approachHit=box(group,-.6,1.48,-1.98,2.2,2.25,.85,C.white,false);
    approachHit.material=new THREE.MeshBasicMaterial({visible:false});
    approachHit.userData.interaction='approach';
    const props={cabinet,mirrorDoor,flushButton,bowlWater,whirlpool,pump,cream,dollop,approachHit,hits:{flush:flushHit,lotion:lotionHit,mirror:mirrorHit}};
    for(const [id,target] of Object.entries(props.hits))target.userData.interaction=id;
    return { group, tap, handle, water, waterSegments, ripples, hit, childTapGuide, childTapHit, props, notes: bathNotes, name: '화장실', label: '수도꼭지', reminder: '벽의 메모. 나가기 전에: 수도 잠그기, 주방 가기.',
      reminders: ['벽의 메모. 나가기 전에: 수도 잠그기, 주방 가기.','벽의 메모. 나가기 전에: 수도 잠그기, 주방 가기. 잠그기에 줄이 그어지고 틀기라고 고쳐 적혀 있다.','벽의 메모. 전에: 수도, 가기. 나머지 글씨는 지워졌다.'] };
  }

  function kitchen() {
    const group = new THREE.Group(); scene.add(group); room(group, true);
    box(group, -1.04, .46, -2.19, 2.80, .86, .69, C.pale);
    box(group, -1.04, .925, -2.15, 2.94, .08, .84, C.white);
    for (let x of [-1.97, -1.04, -.11]) {
      box(group, x, .48, -1.832, .86, .77, .027, C.white);
      rod(group, [x - .10, .74, -1.80], [x + .10, .74, -1.80], .012, C.ink);
    }
    box(group, -.57, .979, -2.15, 1.04, .024, .60, C.gray);
    for (const [x, z, r] of [[-.85, -2.16, .15], [-.30, -2.16, .12]]) {
      const ring = torus(group, x, 1.005, z, r, .01, C.ink); ring.rotation.x = -Math.PI / 2;
      line(group, [[x - r - .03, 1.01, z], [x + r + .03, 1.01, z]]);
      line(group, [[x, 1.01, z - r - .03], [x, 1.01, z + r + .03]]);
    }
    box(group, -1.42, 2.07, -2.55, 1.74, 1.15, .06, C.ink);
    box(group, -1.42, 2.07, -2.507, 1.67, 1.08, .025, C.stipple, false);
    box(group, -1.42, 2.07, -2.48, .038, 1.09, .04, C.white);
    box(group, -1.42, 2.02, -2.478, 1.67, .038, .04, C.white);
    box(group, -1.42, 1.467, -2.37, 1.89, .06, .4, C.white);
    // The lower fridge door hinges outward; a shallow white interior stays visible.
    box(group, 1.58, 1.12, -2.50, .97, 2.24, .15, C.white);
    for(const x of [1.12,2.04])box(group,x,1.12,-2.17,.07,2.24,.74,C.white);
    box(group,1.58,.035,-2.17,.97,.07,.74,C.white);
    box(group,1.58,2.205,-2.17,.97,.07,.74,C.white);
    box(group,1.58,1.43,-2.17,.90,.055,.72,C.white);
    box(group,1.58,.69,-2.16,.88,.035,.66,C.white);
    cylinder(group,1.42,.82,-2.27,.09,.09,.24,C.white,10);
    cylinder(group,1.74,.79,-2.30,.12,.10,.17,C.white,8);
    box(group,1.58,1.82,-1.749,.91,.71,.025,C.white);
    rod(group,[1.22,1.58,-1.70],[1.22,1.83,-1.70],.014,C.ink);
    const fridgeDoor=new THREE.Group();group.add(fridgeDoor);fridgeDoor.position.set(2.035,0,-1.744);
    box(fridgeDoor,-.455,.73,0,.91,1.36,.055,C.white);
    rod(fridgeDoor,[-.81,.99,.050],[-.81,1.31,.050],.014,C.ink);
    const fridgeDoorHit=box(fridgeDoor,-.455,.73,.065,.91,1.36,.11,C.white,false);
    fridgeDoorHit.material=new THREE.MeshBasicMaterial({visible:false});fridgeDoorHit.userData.interaction='fridge';emphasize(fridgeDoor,'fridge');
    const fridgeHit=box(group,1.58,.73,-1.70,.91,1.36,.09,C.white,false);
    fridgeHit.material=new THREE.MeshBasicMaterial({visible:false});fridgeHit.userData.interaction='fridge';
    const morningNote=note(group,.29,2.00,-2.58,'아침에',[['앉아서,','차 마시고','밥 먹기']],1.18,1.08,.022);
    const secondNote=note(group,.29,2.00,-2.58,'아침에',[['냉장고 열기','음식 먹기','차도 마시기']],1.18,1.08,.022);
    secondNote.visible=false;
    const thirdNote=note(group,.29,2.00,-2.58,'아침에',[['차 따르기','앉아서 음식 먹기']],1.18,1.08,.022,{write:[['두 잔!',150,650,150,-.06]]});
    const fourthNote=note(group,.29,2.00,-2.58,'아침에',[['냉장고 열기','음식 먹기','차도 마시기']],1.18,1.08,.022,{erase:[[120,270,330,110],[390,390,300,110]]});
    thirdNote.visible=fourthNote.visible=false;
    const kitchenNotes=[morningNote,secondNote,thirdNote,fourthNote];
    const fridgeFood=new THREE.Group();group.add(fridgeFood);fridgeFood.position.set(1.58,.735,-1.97);
    box(fridgeFood,0,.012,0,.54,.025,.37,C.ink);
    for(let i=0;i<3;i++){
      const piece=new THREE.Group();fridgeFood.add(piece);piece.position.set((i-1)*.13,.062,i===1?-.025:.022);
      box(piece,0,0,0,.12,.075,.15,C.white);
      line(piece,[[-.044,.041,-.047],[.040,.041,.045]],true);
    }
    emphasize(fridgeFood,'fridgeFood');
    const fridgeFoodHit=box(group,1.58,.815,-1.97,.66,.27,.47,C.white,false);
    fridgeFoodHit.material=new THREE.MeshBasicMaterial({visible:false});fridgeFoodHit.userData.interaction='takeFood';
    const table = new THREE.Group(); group.add(table); table.position.set(-.35, 0, -.94);
    box(table, 0, .945, 0, 2.16, .09, .94, C.white);
    for (const x of [-.91, .91]) for (const z of [-.33, .33]) box(table, x, .44, z, .058, .88, .058, C.gray);
    box(table, 0, .847, .0, 1.93, .14, .075, C.gray);
    const chair = new THREE.Group(); group.add(chair); chair.position.set(-.90, 0, -.05); chair.rotation.y = Math.PI * .75;
    box(chair, 0, .45, 0, .53, .05, .55, C.gray);
    for (const x of [-.22, .22]) for (const z of [-.22, .22]) box(chair, x, .22, z, .041, .43, .041, C.ink);
    for (const x of [-.22, .22]) box(chair, x, .77, -.25, .04, .62, .04, C.ink);
    box(chair, 0, .94, -.25, .50, .24, .04, C.white);
    const chairHit=box(chair,0,.64,-.09,.68,1.04,.69,C.white,false);
    chairHit.material=new THREE.MeshBasicMaterial({visible:false});chairHit.userData.interaction='chair';emphasize(chair,'chair');
    // A faceted kettle assembled as one group so the pour is a spatial action.
    const kettle = new THREE.Group(); group.add(kettle); kettle.position.set(-.63, .991, -1.04);
    cylinder(kettle, 0, .18, 0, .18, .23, .34, C.white, 10);
    cylinder(kettle, 0, .36, 0, .105, .18, .06, C.gray, 10);
    cylinder(kettle, 0, .398, 0, .047, .047, .035, C.ink, 10, false);
    rod(kettle, [.14, .19, 0], [.35, .32, 0], .047, C.white, 8);
    cylinder(kettle, .355, .32, 0, .036, .036, .004, C.ink, 8, false).rotation.z = -.8;
    const handle = torus(kettle, -.145, .22, 0, .20, .02, C.ink, Math.PI * 1.22, 18); handle.rotation.z = Math.PI * .40;
    const cup = new THREE.Group(); group.add(cup); cup.position.set(.35, .997, -1.04);
    cylinder(cup, 0, -.003, 0, .235, .235, .018, C.white, 24);
    // Open mug wall and independently rising tea surface.
    const outer = mesh(cup, new THREE.CylinderGeometry(.125, .096, .225, 16, 1, true), material(C.white)); outer.position.y = .122;
    const inner = cylinder(cup, 0, .022, 0, .101, .10, .016, C.white, 16, false);
    const rim = torus(cup, 0, .237, 0, .119, .009, C.white); rim.rotation.x = -Math.PI / 2;
    const mugHandle = torus(cup, .136, .134, 0, .072, .014, C.white, Math.PI * 1.7, 20); mugHandle.rotation.z = -Math.PI * .83;
    const liquid = cylinder(cup, 0, .03, 0, .10, .10, .006, C.ink, 24, false);
    liquid.name = 'tea';
    emphasize(kettle,'kettle'); emphasize(cup,'cup');
    const plate=new THREE.Group();group.add(plate);plate.position.set(-.10,.998,-.62);
    cylinder(plate,0,.014,0,.215,.215,.028,C.white,18);
    const plateRim=torus(plate,0,.030,0,.19,.008,C.ink);plateRim.rotation.x=-Math.PI/2;
    const bites=[];
    for(let i=0;i<3;i++){
      const bite=new THREE.Group();plate.add(bite);bite.position.set((i-1)*.084,.07,(i===1?-.012:.022));
      box(bite,0,0,0,.088,.055,.12,C.white);
      line(bite,[[-.03,.03,-.04],[.022,.03,.015]],true);
      bites.push(bite);
    }
    emphasize(plate,'plate');
    const foodHit=box(plate,0,.06,0,.43,.18,.43,C.white,false);
    foodHit.material=new THREE.MeshBasicMaterial({visible:false});foodHit.userData.interaction='food';
    const spoon = rod(table, [.81, 1.005, .23], [1.0, 1.005, -.02], .012, C.ink, 6);
    cylinder(table, .99, 1.011, -.01, .028, .028, .004, C.gray, 12).scale.z = 1.4;
    box(group, -.21, 1.017, -.91, .24, .012, .24, C.pale);
    line(group, [[-.3, 1.025, -.88], [-.13, 1.025, -.97]], true);
    photo(group, .39, 1.20, -2.34, .30, .37).rotation.z = -.025;
    // From round 3 a second, cold cup waits at the table end where no chair stands;
    // four worn marks on the floor show where a chair used to be.
    const otherCup=cup.clone();otherCup.position.set(-1.18,.997,-.72);otherCup.rotation.y=Math.PI*.15;group.add(otherCup);
    otherCup.getObjectByName('tea').position.y=.17;
    otherCup.visible=false;
    const chairMarks=new THREE.Group();group.add(chairMarks);chairMarks.position.set(-1.95,0,-.78);chairMarks.rotation.y=Math.PI*.5;chairMarks.visible=false;
    for(const x of [-.22,.22])for(const z of [-.22,.22])dots(chairMarks,Array.from({length:16},(_,i)=>[x+((i%4)-1.5)*.022,.016,z+(Math.floor(i/4)-1.5)*.022]),.026,C.ink);
    const jar = cylinder(group, -2.21, 1.14, -2.24, .09, .09, .34, C.pale, 10);
    cylinder(group, -2.21, 1.321, -2.24, .095, .095, .025, C.ink, 10);
    const pour = new THREE.Group(); group.add(pour); pour.visible = false;
    const pourPoints = dots(pour, Array.from({ length: 6 }, (_, i) => [.35, 1.335 - i * .018, -1.04]), .014, C.ink);
    const steam = new THREE.Group(); cup.add(steam); steam.visible = false;
    for (let i = 0; i < 3; i++) {
      line(steam, Array.from({ length: 16 }, (_, j) => [(i - 1) * .055 + Math.sin(j * .48 + i) * .018, .27 + j * .014, 0]), true);
    }
    const hit = box(kettle, .04, .23, 0, .64, .53, .40, C.white, false); hit.material = new THREE.MeshBasicMaterial({ visible: false });
    return { group, chairHit, fridgeDoor, fridgeDoorHit, fridgeHit, fridgeFood, fridgeFoodHit, morningNote, secondNote, notes: kitchenNotes, otherCup, chairMarks, foodHit, bites, kettle, cup, liquid, pour, pourPoints, steam, hit, name: '주방', label: '주전자', reminder: '벽의 메모. 아침에: 앉아서, 차 마시고 밥 먹기.',
      reminders: ['벽의 메모. 아침에: 앉아서, 차 마시고 밥 먹기.','벽의 메모. 아침에: 냉장고 열기, 음식 먹기, 차도 마시기.','벽의 메모. 아침에: 차 따르기, 앉아서 음식 먹기. 옆에 두 잔이라고 적혀 있다.','벽의 메모. 아침에: 열기, 음식, 차도 마시기. 나머지 글씨는 지워졌다.'] };
  }

  function entryway(){
    const group=new THREE.Group();scene.add(group);
    box(group,0,-.08,.25,3.40,.16,6.0,C.white);
    box(group,0,2.75,.25,3.40,.12,6.0,C.white);
    box(group,-1.76,1.38,.25,.12,2.76,6.0,C.white);
    box(group,1.76,1.38,.25,.12,2.76,6.0,C.white);
    box(group,0,1.38,3.25,3.52,2.76,.12,C.white);
    box(group,-1.26,1.38,-2.75,.95,2.76,.12,C.white);
    box(group,1.26,1.38,-2.75,.95,2.76,.12,C.white);
    box(group,0,2.51,-2.75,1.57,.50,.12,C.white);
    box(group,0,.075,-2.72,1.58,.15,.23,C.white);
    for(const x of [-.77,.77])box(group,x,1.38,-2.68,.09,2.76,.16,C.ink);
    box(group,0,2.74,-2.68,1.63,.08,.16,C.ink);
    // The door opens onto darkness before the next awakening in bed.
    box(group,0,1.30,-3.18,1.55,2.58,.08,C.ink);
    const door=new THREE.Group();group.add(door);door.position.set(-.71,0,-2.58);
    box(door,.71,1.38,0,1.42,2.70,.085,C.white);
    box(door,.71,2.18,.052,1.17,.68,.014,C.white);
    box(door,.71,.77,.052,1.17,1.02,.014,C.white);
    const peephole=cylinder(door,.71,1.72,.057,.026,.026,.015,C.ink,12,false);peephole.rotation.x=Math.PI/2;
    const knob=cylinder(door,1.24,1.13,.09,.055,.055,.09,C.ink,12);knob.rotation.x=Math.PI/2;
    emphasize(door,'door');
    const hit=box(group,0,1.38,-2.46,1.48,2.66,.18,C.white,false);
    hit.material=new THREE.MeshBasicMaterial({visible:false});
    box(group,0,.022,-1.73,.85,.024,.53,C.white);
    for(let x=-.30;x<=.31;x+=.15)line(group,[[x,.041,-1.95],[x,.041,-1.50]],true);
    for(let z=-2.72;z<=3.22;z+=.75)line(group,[[-1.68,.012,z],[1.68,.012,z]],true);
    for(let x of [-1.65,-.82,0,.82,1.65])line(group,[[x,.012,-2.72],[x,.012,3.21]],true);
    const rack=new THREE.Group();group.add(rack);rack.position.set(-1.25,0,-.35);
    for(const y of [.14,.44])box(rack,0,y,0,.58,.045,.96,C.white);
    for(const x of [-.26,.26])for(const z of [-.43,.43])box(rack,x,.26,z,.035,.50,.035,C.ink);
    for(const [x,z] of [[-.24,.36],[.17,.42]]){
      const shoe=mesh(group,new THREE.SphereGeometry(.14,8,5),material(C.white));
      shoe.position.set(x,.115,z+1.0);shoe.scale.set(.8,.48,1.5);
    }
    // Coat and low shoes make the narrow passage read as a lived-in entrance.
    const coat=new THREE.Group();group.add(coat);coat.position.set(1.34,1.27,-.93);
    const coatShape=new THREE.Shape();
    coatShape.moveTo(-.13,.42);coatShape.lineTo(.13,.42);coatShape.lineTo(.21,.29);
    coatShape.lineTo(.35,.16);coatShape.lineTo(.27,-.10);coatShape.lineTo(.19,-.04);
    coatShape.lineTo(.22,-.51);coatShape.lineTo(-.22,-.51);coatShape.lineTo(-.19,-.04);
    coatShape.lineTo(-.27,-.10);coatShape.lineTo(-.35,.16);coatShape.lineTo(-.21,.29);
    coatShape.closePath();
    mesh(coat,new THREE.ShapeGeometry(coatShape),material(C.ink),false);
    cylinder(coat,0,.49,0,.045,.045,.07,C.ink,8,false);
    const stitch=new THREE.LineBasicMaterial({color:C.white});
    const lapel=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-.10,.39,.01),V(0,.16,.01),V(.10,.39,.01)]),stitch);coat.add(lapel);
    for(const y of [.02,-.15,-.32])cylinder(coat,0,y,.012,.012,.012,.008,C.white,8,false).rotation.x=Math.PI/2;
    rod(group,[1.53,1.55,-1.40],[1.53,1.55,-.50],.017,C.ink);
    for(const z of [-1.23,-.78]){
      const hook=rod(group,[1.53,1.55,z],[1.37,1.38,z],.012,C.ink);
    }
    const entryNote=note(group,1.22,1.98,-2.53,'나갈 때',[['문 열기']],.74,.96,-.02);
    // Round 4, first visit: the door is a way into the kitchen, not out.
    const detourNote=note(group,1.22,1.98,-2.53,'나갈 때',[['문 열기']],.74,.96,-.02,{strike:[[60,150,300]],write:[['밥 먹으러',70,600,140,-.06]]});
    detourNote.visible=false;
    return {group,door,hit,notes:[entryNote,detourNote],name:'현관',label:'현관문 열기',reminder:'현관 벽의 메모. 나갈 때: 문 열기.',
      detourReminder:'현관 벽의 메모. 나갈 때에 줄이 그어지고 밥 먹으러라고 고쳐 적혀 있다. 문 열기.'};
  }

  function bedroom(){
    const group=new THREE.Group();scene.add(group);
    box(group,0,-.08,.15,5.4,.16,5.9,C.white);
    box(group,0,2.60,.15,5.4,.12,5.9,C.white);
    for(const x of [-2.76,2.76])box(group,x,1.30,.15,.12,2.6,5.9,C.white);
    box(group,0,1.30,3.14,5.52,2.6,.12,C.white);
    box(group,-1.42,1.30,-2.82,2.56,2.6,.12,C.white);
    box(group,1.42,1.30,-2.82,2.56,2.6,.12,C.white);
    box(group,0,2.32,-2.79,1.17,.57,.16,C.white);
    for(const x of [-.63,.63])box(group,x,1.15,-2.76,.085,2.30,.12,C.ink);
    box(group,0,2.33,-2.75,1.34,.07,.12,C.ink);
    box(group,0,1.12,-2.84,1.10,2.20,.04,C.ink);
    box(group,0,.10,-2.71,1.06,.04,.40,C.white);
    for(const z of [-2.4,-1.4,-.4,.6,1.6,2.6])line(group,[[-2.69,.008,z],[2.69,.008,z]],true);
    for(const x of [-2.5,-1.25,0,1.25,2.5])line(group,[[x,.009,-2.78],[x,.009,3.02]],true);
    const bed=new THREE.Group();group.add(bed);bed.position.set(-.22,0,.96);
    const bedParts=[];
    // Real bed topology, uniformly scaled: mattress, wooden frame, feet,
    // a continuous cover with a folded white cuff, and a separate pillow.
    const importedBed=/* @json assets/models/memory-game-imported-bed-d312f94a19.json */ null;
    for(const part of importedBed.parts){
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));
      if(part.indices)geometry.setIndex(part.indices);
      if(part.normals)geometry.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3));
      else geometry.computeVertexNormals();
      const tone=part.material==='metal'?C.ink:part.material==='carpet'?0xbcbcbc:C.white;
      let clothMaterial=material(tone);
      if(part.material==='carpet'){
        // Print gentle form tones into the existing one-bit pass. No cast
        // shadows; the portrait light must not turn the bed into a black mass.
        const shades=[],normals=geometry.attributes.normal;
        for(let i=0;i<normals.count;i++){
          const up=Math.abs(normals.getY(i));
          const brightness=clamp(.45+.32*up+.06*normals.getZ(i));
          const linear=Math.pow((brightness+.055)/1.055,2.4);
          shades.push(linear,linear,linear);
        }
        geometry.setAttribute('color',new THREE.Float32BufferAttribute(shades,3));
        clothMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
      }
      const piece=mesh(bed,geometry,clothMaterial);
      piece.name='Kenney '+part.name+' '+part.material;
      bedParts.push({piece,geometry,part});
    }
    emphasize(bed,'bed');
    const stand=box(group,-1.55,.47,1.32,.61,.76,.53,C.white);
    box(group,-1.55,.88,1.32,.67,.06,.58,C.white);
    cylinder(group,-1.55,1.17,1.32,.105,.105,.45,C.white,9);
    cylinder(group,-1.55,1.40,1.32,.22,.12,.10,C.white,10);
    box(group,1.95,1.79,-2.72,.65,.67,.025,C.white);
    line(group,[[1.64,1.64,-2.695],[2.25,1.64,-2.695]],true);
    // 2026-10-27: 할아버지의 꾸미는 취향(이불·베개 무늬, 교복, 협탁 소품, 액자). bedroom-taste.js
    if(window.BedroomTaste)window.BedroomTaste.decorate({THREE,group,bed,bedParts,renderer,material,mesh,emphasize});
    const hit=box(bed,0,.49,-.23,1.15,.30,1.72,C.white,false);
    hit.material=new THREE.MeshBasicMaterial({visible:false});
    return {group,hit,name:'침실',label:'침대에서 일어나기',reminder:'침대에 누워 있습니다.'};
  }
