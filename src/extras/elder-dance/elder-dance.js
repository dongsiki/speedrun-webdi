

/* Screen-space retargeting of sixteen held cels. Occluded depth and camera
 * elevation are estimates, not the author's original 3D motion. */
const ElderDance=(()=>{
  const FPS=24,BEAT=.5,LENGTH=2;
  function sample(seconds,reduced=false){
    const frame=Math.floor((((Math.max(0,seconds)%LENGTH)+LENGTH)%LENGTH)*FPS+1e-6);
    return {cel:frame/FPS,key:Math.floor((frame+1)/3)%16,referenceFrame:frame,amount:reduced?.35:1,shift:0};
  }
  function createRig(T,data){
    const R=DanceReference,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),s=Math.sin(R.cameraPitch),c=Math.cos(R.cameraPitch);
    const pivots=data.bindPoses.map(m=>V().setFromMatrixPosition(new T.Matrix4().set(...m).invert()));
    const bones=pivots.map(()=>new T.Matrix4()),up=V(0,c,-s),front=V(0,s,c);
    // Core torso faces only: arm/shoulder skin must not collide with itself.
    const core=data.positions.map((_,i)=>data.boneIndices[i].reduce((weight,b,j)=>weight+
      ([0,5,6,7,8,37].includes(b)?data.boneWeights[i][j]:0),0)>.85);
    const torsoFaces=data.triangles.flat().filter(face=>face.every(i=>core[i]));
    const referencePoint=(xy,depth=0)=>V(-(xy[0]-R.origin[0])/R.pixelsPerMetre,0,0)
      .addScaledVector(up,(R.origin[1]-xy[1])/R.pixelsPerMetre).addScaledVector(front,depth);
    const project=p=>[R.origin[0]-p.x*R.pixelsPerMetre,R.origin[1]-p.dot(up)*R.pixelsPerMetre];
    const around=(p,m)=>new T.Matrix4().makeTranslation(...p.toArray()).multiply(m).multiply(new T.Matrix4().makeTranslation(-p.x,-p.y,-p.z));
    const assign=(from,to,m)=>{for(let i=from;i<=to;i++)bones[i].copy(m);};
    function segment(a,b,start,end){
      const rest=pivots[b].clone().sub(pivots[a]),moved=end.clone().sub(start);
      const q=new T.Quaternion().setFromUnitVectors(rest.clone().normalize(),moved.clone().normalize());
      const axis=rest.clone().normalize(),k=moved.length()/rest.length()-1;
      const stretch=new T.Matrix4().set(1+k*axis.x*axis.x,k*axis.x*axis.y,k*axis.x*axis.z,0,k*axis.y*axis.x,1+k*axis.y*axis.y,k*axis.y*axis.z,0,k*axis.z*axis.x,k*axis.z*axis.y,1+k*axis.z*axis.z,0,0,0,0,1);
      return new T.Matrix4().makeTranslation(...start.toArray()).multiply(new T.Matrix4().makeRotationFromQuaternion(q)).multiply(stretch)
        .multiply(new T.Matrix4().makeTranslation(-pivots[a].x,-pivots[a].y,-pivots[a].z));
    }
    function depthOptions(start,xy,length){
      const planar=referencePoint(xy).sub(start.clone().addScaledVector(front,-start.dot(front)));
      const delta=Math.sqrt(Math.max(0,length*length-planar.lengthSq()));
      return [start.dot(front)+delta,start.dot(front)-delta];
    }
    function clearLeftArm(start,elbow,palm,torso){
      const vertices=data.positions.map(p=>V(...p).applyMatrix4(torso));
      const ray=new T.Ray(),hit=V(),direction=front.clone().negate();let lift=0;
      function sampleClearance(point,weight,radius){
        ray.set(point.clone().addScaledVector(front,3),direction);
        for(const face of torsoFaces){
          if(ray.intersectTriangle(vertices[face[0]],vertices[face[1]],vertices[face[2]],false,hit))
            lift=Math.max(lift,(hit.clone().sub(point).dot(front)+radius)/weight);
        }
      }
      for(let i=0;i<=24;i++)sampleClearance(elbow.clone().lerp(palm,i/24),1,.075);
      // Keep the shoulder attached; only the free end of the upper arm lifts.
      for(let i=10;i<=24;i++){const t=i/24;sampleClearance(start.clone().lerp(elbow,t),t,.065);}
      if(lift>0){elbow.addScaledVector(front,lift);palm.addScaledVector(front,lift);}
      return Math.max(0,lift);
    }
    function proportionedKnee(hip,ankle,hint){
      // Start from the approved 1:1 thigh/shin in both projected and 3D space.
      // A depth-only bend left the knee visually low in this downward view.
      // Put the hinge on the perpendicular bisector in BOTH spaces, retaining
      // the reference's sideways knee bend and the fixed hip/ankle anchors.
      const axis=ankle.clone().sub(hip),middle=hip.clone().add(ankle).multiplyScalar(.5);
      const bend=front.clone().cross(axis).normalize();
      const sideways=hint.clone().sub(middle).dot(bend);
      // Follow-up: a small 3 cm lift, keeping the foot and hip anchors intact.
      return middle.addScaledVector(bend,sideways).addScaledVector(up,.03);
    }
    function pose(seconds,reduced=false){
      const samplePose=sample(seconds,reduced),raw=R.poses[samplePose.key],neutral=R.poses[0];
      const p={};for(const [name,value]of Object.entries(raw))p[name]=Array.isArray(value)?value.map((v,i)=>neutral[name][i]+(v-neutral[name][i])*samplePose.amount):value;
      // The visible split between the legs is below the imported pelvis pivot.
      // Compensate that anatomical offset rather than stretching the abdomen.
      const hip=referencePoint([p.hip[0],p.hip[1]-23],0),sl=referencePoint(p.sl,.08-Math.sin(p.yaw)*.16),sr=referencePoint(p.sr,.08+Math.sin(p.yaw)*.16);
      const x=sl.clone().sub(sr).multiplyScalar(1/(pivots[38].x-pivots[9].x));
      const y=sl.clone().add(sr).multiplyScalar(.5).sub(hip).multiplyScalar(1/(pivots[38].y-pivots[0].y));
      const z=x.clone().cross(y).normalize().multiplyScalar(.88);
      const basis=new T.Matrix4().makeBasis(x,y,z),shoulderOrigin=sl.clone().add(sr).multiplyScalar(.5),restCentre=pivots[38].clone().add(pivots[9]).multiplyScalar(.5);
      const torso=new T.Matrix4().makeTranslation(...shoulderOrigin.toArray()).multiply(basis)
        .multiply(new T.Matrix4().makeTranslation(-restCentre.x,-restCentre.y,-restCentre.z));
      bones.forEach(m=>m.copy(torso));
      const neck=pivots[34].clone().applyMatrix4(torso);
      const headRotation=new T.Matrix4().makeRotationFromEuler(new T.Euler(-.02,p.yaw*.65,Math.atan2(y.x,y.y)*-.45,'YXZ'));
      assign(34,36,new T.Matrix4().makeTranslation(...neck.toArray()).multiply(headRotation).multiply(new T.Matrix4().makeTranslation(-pivots[34].x,-pivots[34].y,-pivots[34].z)));
      const landmarks={sl,sr},lengthRatios=[];let leftArmLift=0;
      for(const [side,shoulder,elbow,palm,last]of [['l',38,39,47,62],['r',9,10,18,33]]){
        const start=side==='l'?sl:sr,el=p['e'+side],pl=p['p'+side];
        const upper=pivots[shoulder].distanceTo(pivots[elbow]),lower=pivots[elbow].distanceTo(pivots[palm]);
        let best;
        for(const ed of depthOptions(start,el,upper)){
          const ep=referencePoint(el,ed);
          for(const pd of depthOptions(ep,pl,lower)){
            const candidateElbow=ep.clone(),candidatePalm=referencePoint(pl,pd);
            const lift=side==='r'?clearLeftArm(start,candidateElbow,candidatePalm,torso):0;
            // Prefer the unobstructed bend before changing the arm's depth.
            const score=(ed-.18)**2*.6+(pd-.42)**2+(pd<.05?2:0)+(ed<-.17?1:0)+lift*lift*40;
            if(!best||score<best.score)best={score,ep:candidateElbow,pp:candidatePalm,lift};
          }
        }
        // "r" is screen-right, the character's anatomical LEFT (bones 9–33).
        // Moving along the viewing ray keeps the traced 2D dance path intact.
        if(side==='r')leftArmLift=best.lift;
        bones[shoulder].copy(segment(shoulder,elbow,start,best.ep));
        const lowerMatrix=segment(elbow,palm,best.ep,best.pp);assign(elbow,last,lowerMatrix);
        landmarks['e'+side]=best.ep;landmarks['p'+side]=best.pp;
        lengthRatios.push(start.distanceTo(best.ep)/upper,best.ep.distanceTo(best.pp)/lower);
        const offset=side==='l'?29:0,sign=side==='l'?-1:1;
        const grip=around(pivots[palm],new T.Matrix4().makeScale(.52,.68,.90));
        for(const chain of [[14,15,16,17],[18,19,20,21],[22,23,24,25],[26,27,28,29],[30,31,32,33]]){
          let m=lowerMatrix.clone().multiply(grip);
          chain.forEach((id,j)=>{const angle=(chain[0]===14?.72:j===0?1.35:j===1?1.50:.90)*sign;
            m=m.clone().multiply(around(pivots[id+offset],new T.Matrix4().makeRotationZ(angle)));bones[id+offset].copy(m);});
        }
      }
      for(const [side,hi,kn,an,toe]of [['l',63,64,65,66],['r',1,2,3,4]]){
        const start=pivots[hi].clone().applyMatrix4(torso),xy=p['t'+side],toeHeight=.027;
        const v=(R.origin[1]-xy[1])/R.pixelsPerMetre;
        const tip=V(-(xy[0]-R.origin[0])/R.pixelsPerMetre,toeHeight,(toeHeight*c-v)/s);
        const yaw=(side==='l'?-.06:.10)+p.yaw*.35,footRotation=new T.Matrix4().makeRotationY(yaw);
        const ankle=tip.clone().sub(pivots[toe].clone().sub(pivots[an]).applyMatrix4(footRotation));
        const upper=pivots[hi].distanceTo(pivots[kn]),lower=pivots[kn].distanceTo(pivots[an]);let best;
        for(let depth=-.25;depth<=1.2;depth+=.01){
          const joint=referencePoint(p['k'+side],depth);
          const score=(joint.distanceTo(start)-upper)**2+(joint.distanceTo(ankle)-lower)**2+(depth-.05)**2*.003;
          if(!best||score<best.score)best={score,joint};
        }
        best.joint=proportionedKnee(start,ankle,best.joint);
        bones[hi].copy(segment(hi,kn,start,best.joint));bones[kn].copy(segment(kn,an,best.joint,ankle));
        const foot=new T.Matrix4().makeTranslation(...ankle.toArray()).multiply(footRotation)
          .multiply(new T.Matrix4().makeTranslation(-pivots[an].x,-pivots[an].y,-pivots[an].z));assign(an,toe,foot);
        landmarks['k'+side]=best.joint;landmarks['t'+side]=tip;
        lengthRatios.push(start.distanceTo(best.joint)/upper,best.joint.distanceTo(ankle)/lower);
      }
      return {bones,sample:samplePose,landmarks,lengthRatios,project,leftArmLift};
    }
    return {pose};
  }
  return {FPS,BEAT,LENGTH,sample,createRig};
})();
if(typeof module!=='undefined')module.exports={ElderDance};