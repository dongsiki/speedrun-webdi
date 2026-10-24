
/* Three character studies from the existing local-study mesh.
 * Original geometry: Lucas Pope / 3909, Obra Dinn GDC 2016 demo.
 * See ../routine3d/assets/obra-model-source.md. New atlas paintings and proportions.
 */
function createNPC(T, data, texture, role, headTexture=texture, posture=null) {
  const profiles = {
    caregiver: {height:.945, width:.93, head:.98, shoulder:.93, lean:0, arm:1.34},
    neighbor: {height:.96, width:1.08, head:1.025, shoulder:1.02, lean:.10, arm:1.39},
    child: {height:.715, width:.91, head:1.19, shoulder:.88, lean:0, arm:1.35}
  };
  const profile=profiles[role], group=new T.Group(); group.name=role;
  const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  const around=(v,m)=>new T.Matrix4().makeTranslation(v.x,v.y,v.z).multiply(m)
    .multiply(new T.Matrix4().makeTranslation(-v.x,-v.y,-v.z));
  const left=around(V(-.209,1.469,0),new T.Matrix4().makeRotationZ(profile.arm));
  const right=around(V(.209,1.469,0),new T.Matrix4().makeRotationZ(-profile.arm));
  const bend=around(V(0,1.08,.025),new T.Matrix4().makeRotationX(profile.lean));
  const identity=new T.Matrix4(), rest=[], p=V(), q=V();
  const headWeights=[];
  for(let i=0;i<data.positions.length;i++){
    q.set(0,0,0);let head=0,upper=0;
    for(let j=0;j<4;j++){
      const b=data.boneIndices[i][j], w=data.boneWeights[i][j];if(!w)continue;
      p.fromArray(data.positions[i]).applyMatrix4(posture?.bones[b]||(b>=9&&b<=33?left:b>=38&&b<=62?right:identity));
      q.addScaledVector(p,w);
      if(b===35||b===36)head+=w;else if(b===34)head+=w*.36;
      if(b>=5&&b<=62)upper+=w;
    }
    // These are actual mesh changes, not just a different picture on a flat card.
    q.x*=1+(profile.head-1)*head;
    q.y+=(q.y-1.56)*(profile.head-1)*head;
    q.z+=(q.z-.065)*(profile.head-1)*head;
    if(role==='caregiver'){
      const jaw=Math.max(0,Math.min(1,(1.705-q.y)/.13))*head;
      q.x*=1-.045*jaw;
      q.y-=.025*head;
    }
    if(role==='child'){
      q.x*=1+.075*head;
      if(q.y<1.69)q.y+=(1.69-q.y)*.22*head;
      q.z-=.024*head*Math.exp(-Math.pow(q.x/.04,2)-Math.pow((q.y-1.65)/.06,2));
      q.y-=Math.min(q.y,.95)*.05;
      q.z=.065+(q.z-.065)*(1-.10*head);
      q.y-=.055*head;
    }
    const shoulders=Math.min(1,Math.max(0,(q.y-1.05)/.34))*(1-head);
    q.x*=profile.width*(1+(profile.shoulder-1)*shoulders);
    if(profile.lean&&upper)q.lerp(p.copy(q).applyMatrix4(bend),Math.min(1,upper));
    q.multiplyScalar(profile.height);rest.push(q.x,q.y,q.z);headWeights.push(head);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(rest,3));
  const landmarks=[[.535,.535],[.70,.67],[.75,.72],[.80,.79],[.83,.83],[1,1]];
  const uv=data.uv.map(([u,v])=>{
    const y=1-v;if(role!=='neighbor'||u>.61||y<.535)return [u,v];
    for(let j=1;j<landmarks.length;j++)if(y<=landmarks[j][0]){
      const [a,b]=landmarks[j-1],[c,d]=landmarks[j];
      return [u+.006*Math.max(0,1-Math.abs(u-.30)/.30),1-(b+(d-b)*(y-a)/(c-a))];
    }
    return [u,v];
  });
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv.flat(),2));
  const indices=data.triangles.flatMap(part=>part.flat());geometry.setIndex(indices);
  let start=0,last=-1;
  for(let i=0;i<indices.length;i+=3){
    const face=indices.slice(i,i+3).every(j=>data.uv[j][0]<.615&&data.uv[j][1]<.465)?1:0;
    if(face!==last){if(last>=0)geometry.addGroup(start,i-start,last);start=i;last=face;}
  }
  geometry.addGroup(start,indices.length-start,last);
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();geometry.computeBoundingBox();
  if(data.neckJoinPairs){
    const normal=geometry.attributes.normal;
    for(const [a,b] of data.neckJoinPairs){
      p.fromBufferAttribute(normal,a).add(q.fromBufferAttribute(normal,b)).normalize();
      normal.setXYZ(a,p.x,p.y,p.z);normal.setXYZ(b,p.x,p.y,p.z);
    }
  }
  const material=new T.MeshLambertMaterial({map:texture,side:T.FrontSide});
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
      '#include <map_fragment>\ndiffuseColor.rgb = pow(diffuseColor.rgb, vec3(0.87));');
  };
  const headMaterial=new T.MeshLambertMaterial({map:headTexture,side:T.FrontSide});headMaterial.onBeforeCompile=material.onBeforeCompile;
  const mesh=new T.Mesh(geometry,[material,headMaterial]);mesh.name=role+'-body';group.add(mesh);
  const bounds=geometry.boundingBox.clone();
  const headY=(1.68-(role==='child'?.1025:role==='caregiver'?.025:0))*profile.height;
  const headPivot=V(0,headY,.05*profile.height), rotation=new T.Matrix4();
  if(posture){
    headPivot.set(0,0,0);let total=0;
    for(let i=0;i<headWeights.length;i++)if(headWeights[i]>.6){headPivot.addScaledVector(p.fromArray(rest,i*3),headWeights[i]);total+=headWeights[i];}
    headPivot.divideScalar(total||1);group.userData.posture=posture.name;
  }
  function pose(headYaw=0){
    rotation.copy(around(headPivot,new T.Matrix4().makeRotationY(headYaw)));
    const a=geometry.attributes.position;
    for(let i=0;i<headWeights.length;i++){
      p.fromArray(rest,i*3);q.copy(p);
      if(headWeights[i])q.lerp(p.applyMatrix4(rotation),headWeights[i]);
      a.setXYZ(i,q.x,q.y,q.z);
    }
    a.needsUpdate=true;geometry.computeVertexNormals();
  }
  return {object:group,mesh,geometry,material,pose,headY,height:bounds.max.y,bounds};
}
if(typeof module!=='undefined')module.exports={createNPC};