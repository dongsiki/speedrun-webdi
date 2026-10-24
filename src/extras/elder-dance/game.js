

(() => {
  'use strict';
  const T=THREE,$=id=>document.getElementById(id),canvas=$('world'),music=$('music');
  const preference=matchMedia('(prefers-reduced-motion:reduce-off)');
  let reduced=preference.matches,chosenMotion=false,renderer,lastCel=-1,needsRender=true,disposed=false;
  let frames=0,loops=0,previousTime=0,raf=0,exporting=false;
  const error=text=>{$('error').textContent=text;$('error').hidden=false;};
  try{renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});}
  catch(e){error('이 브라우저에서 3D 화면을 열지 못했습니다.');$('play').disabled=true;return;}
  renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=false;
  renderer.toneMapping=T.NoToneMapping;
  const scene=new T.Scene();scene.background=new T.Color(0xffffff);
  const camera=new T.OrthographicCamera(-1,1,1,-1,.05,20);
  const key=new T.DirectionalLight(0xffffff,2);key.position.set(-1.5,2.7,4.5);
  scene.add(new T.AmbientLight(0xffffff,.18),key);
  const elder=createElderModel(T),rig=ElderDance.createRig(T,DanceMesh);
  elder.object.visible=true;elder.object.scale.setScalar(1);scene.add(elder.object);
  const target=new T.WebGLRenderTarget(1,1,{minFilter:T.NearestFilter,magFilter:T.NearestFilter,generateMipmaps:false});
  const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const post=new T.ShaderMaterial({depthTest:false,depthWrite:false,
    uniforms:{picture:{value:target.texture},pixels:{value:new T.Vector2(1,1)}},
    vertexShader:'varying vec2 screenUV;void main(){screenUV=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;varying vec2 screenUV;uniform sampler2D picture;uniform vec2 pixels;
      float bayer(vec2 p){return mod(2.*mod(p.x,2.)+3.*mod(p.y,2.),4.);}
      float perceptual(float x){return x<=.0031308?12.92*x:1.055*pow(x,1./2.4)-.055;}
      void main(){vec2 p=floor(screenUV*pixels);vec3 c=texture2D(picture,(p+.5)/pixels).rgb;
        float v=perceptual(dot(c,vec3(.2126,.7152,.0722)));
        float threshold=(4.*bayer(p)+bayer(floor(p/2.))+.5)/16.;
        gl_FragColor=vec4(vec3(step(threshold,smoothstep(.16,.88,v))),1.);}`});
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));
  T.DefaultLoadingManager.onLoad=()=>{canvas.dataset.texturesReady='true';needsRender=true;};
  T.DefaultLoadingManager.onError=()=>error('인물 그림을 불러오지 못했습니다.');
  function resize(exportWidth,exportHeight){
    const w=typeof exportWidth==='number'?exportWidth:canvas.clientWidth,h=typeof exportHeight==='number'?exportHeight:canvas.clientHeight,aspect=w/h;
    renderer.setSize(w,h,false);
    // Detail level 2: coarser print dots than level 3, retaining the closer view.
    // Only the print grid changes; camera, lighting and poses stay unchanged.
    const pw=Math.min(aspect<1?304:784,Math.ceil(w/(aspect<1?3.55:2.1))),ph=Math.max(1,Math.round(pw/aspect));
    target.setSize(pw,ph);post.uniforms.pixels.value.set(pw,ph);
    const comparison=document.body.dataset.compare==='true';
    const viewH=comparison?350/DanceReference.pixelsPerMetre:Math.max(aspect<1?2.00:2.08,1.08/aspect);
    camera.left=-viewH*aspect/2;camera.right=viewH*aspect/2;camera.top=viewH/2;camera.bottom=-viewH/2;
    const pitch=DanceReference.cameraPitch,centreHeight=comparison?(505-341)/DanceReference.pixelsPerMetre:.835;
    const centre=new T.Vector3(.066,Math.cos(pitch)*centreHeight,-Math.sin(pitch)*centreHeight);
    if(comparison)centre.x=(625-630)/DanceReference.pixelsPerMetre;
    camera.position.copy(centre).add(new T.Vector3(0,Math.sin(pitch)*5,Math.cos(pitch)*5));
    camera.lookAt(centre);camera.updateProjectionMatrix();needsRender=true;
    canvas.dataset.renderSize=pw+'x'+ph;canvas.dataset.cameraViewHeight=viewH.toFixed(3);
  }
  function poseAt(seconds){
    const pose=rig.pose(seconds,reduced),result=elder.poseSkeleton(pose.bones,.08);
    elder.object.position.set(0,0,0);
    lastCel=Math.floor(seconds*ElderDance.FPS);frames++;
    canvas.dataset.cel=String(lastCel);canvas.dataset.phase=pose.sample.cel.toFixed(3);
    canvas.dataset.floor=(result.floor+elder.object.position.y).toFixed(6);
    canvas.dataset.referencePose=String(pose.sample.key);
    canvas.dataset.poses=String(frames);needsRender=true;
  }
  function draw(){
    if(disposed)return;
    if(exporting){raf=requestAnimationFrame(draw);return;}
    // MP3 containers can report encoder padding after the initial metadata.
    // Keep the authored 64-second phrase aligned with its 2-second pose cycle.
    let now=music.currentTime;
    if(!music.paused&&now>=64){now%=64;music.currentTime=now;}
    if(now<previousTime-.5){loops++;canvas.dataset.loops=String(loops);}previousTime=now;
    const cel=Math.floor(now*ElderDance.FPS);
    if(cel!==lastCel)poseAt(now);
    if(needsRender){renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);needsRender=false;}
    canvas.dataset.audioTime=now.toFixed(3);canvas.dataset.playing=String(!music.paused);
    raf=requestAnimationFrame(draw);
  }
  function syncButton(){
    const playing=!music.paused;
    $('play-icon').hidden=playing;$('pause-icon').hidden=!playing;
    // SVG elements do not reflect the HTML hidden property in every browser.
    $('play-icon').toggleAttribute('hidden',playing);$('pause-icon').toggleAttribute('hidden',!playing);
    $('play').setAttribute('aria-label',playing?'춤과 음악 일시정지':'춤과 음악 재생');
    canvas.dataset.playing=String(playing);
  }
  async function toggle(){
    if(!music.paused){music.pause();return;}
    try{await music.play();$('error').hidden=true;$('status').textContent='춤과 음악을 재생합니다.';}
    catch(e){error('재생 버튼을 다시 눌러 주세요.');syncButton();}
  }
  function setMotion(){
    $('motion').setAttribute('aria-pressed',String(reduced));
    $('motion').setAttribute('aria-label',reduced?'원래 크기의 동작으로 보기':'작은 동작으로 보기');
    canvas.dataset.reduced=String(reduced);poseAt(music.currentTime);
  }
  $('play').onclick=toggle;
  $('mute').onclick=()=>{music.muted=!music.muted;$('mute').setAttribute('aria-pressed',String(music.muted));$('mute').setAttribute('aria-label',music.muted?'소리 켜기':'소리 끄기');$('muted-line').toggleAttribute('hidden',!music.muted);};
  $('motion').onclick=()=>{chosenMotion=true;reduced=!reduced;setMotion();};
  preference.addEventListener('change',()=>{if(!chosenMotion){reduced=preference.matches;setMotion();}});
  function closeCredits(){$('credits').hidden=true;$('info').setAttribute('aria-expanded','false');$('info').focus();}
  $('info').onclick=()=>{$('credits').hidden=!$('credits').hidden;$('info').setAttribute('aria-expanded',String(!$('credits').hidden));if(!$('credits').hidden)$('close-info').focus();};
  $('close-info').onclick=closeCredits;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('credits').hidden)closeCredits();music.pause();}
    if(e.code==='Space'&&e.target===document.body){e.preventDefault();if(!e.repeat)toggle();}});
  music.addEventListener('play',syncButton);music.addEventListener('pause',syncButton);
  const metadata=()=>{canvas.dataset.audioDuration=music.duration.toFixed(3);canvas.dataset.loopEnd='64';};
  music.addEventListener('loadedmetadata',metadata);music.addEventListener('durationchange',metadata);
  if(Number.isFinite(music.duration))metadata();
  music.addEventListener('error',()=>error('음원을 재생하지 못했습니다. 페이지를 다시 열어 주세요.'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)music.pause();});
  window.addEventListener('pagehide',()=>{music.pause();cancelAnimationFrame(raf);disposed=true;});
  window.addEventListener('pageshow',()=>{if(disposed){disposed=false;needsRender=true;draw();}});
  window.addEventListener('resize',resize);
  // Present only in the local frame-export page. The preview UI stays unchanged.
  if($('export-frames'))$('export-frames').onclick=async()=>{
    const button=$('export-frames'),status=$('export-status'),oldReduced=reduced;
    const shape=$('export-shape')?.value||'landscape',portrait=shape==='portrait';
    if(canvas.dataset.texturesReady!=='true'){status.textContent='그림을 불러오는 중입니다.';return;}
    music.pause();exporting=true;reduced=false;button.disabled=true;
    try{
      resize(portrait?1080:1920,portrait?1920:1080);
      for(let frame=0;frame<48;frame++){
        poseAt(frame/24+.0001);
        renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
        if(!blob)throw new Error('프레임을 저장하지 못했습니다.');
        const response=await fetch('/frames/'+shape+'/'+String(frame).padStart(2,'0')+'.png',{method:'PUT',headers:{'Content-Type':'image/png'},body:blob});
        if(!response.ok)throw new Error('프레임 저장 오류 '+response.status);
        status.textContent=(frame+1)+' / 48 프레임 저장';
      }
      status.textContent=(portrait?'세로':'가로')+' 48 / 48 프레임 저장 완료';button.dataset.complete=shape;
    }catch(e){status.textContent=e.message;}
    finally{exporting=false;reduced=oldReduced;button.disabled=false;resize();poseAt(music.currentTime);}
  };
  canvas.dataset.character='memory-stage-elder';canvas.dataset.fps=String(ElderDance.FPS);canvas.dataset.loops='0';
  music.volume=.65;resize();setMotion();syncButton();draw();
})();
