

/**
 * Constructor options of `Reflector`.
 *
 * @typedef {Object} Reflector~Options
 * @property {number|Color|string} [color=0x7F7F7F] - The reflector's color.
 * @property {number} [textureWidth=512] - The texture width. A higher value results in more clear reflections but is also more expensive.
 * @property {number} [textureHeight=512] - The texture height. A higher value results in more clear reflections but is also more expensive.
 * @property {number} [clipBias=0] - The clip bias.
 * @property {Object} [shader] - Can be used to pass in a custom shader that defines how the reflective view is projected onto the reflector's geometry.
 * @property {number} [multisample=4] - How many samples to use for MSAA. `0` disables MSAA.
 **/



(function(root){
  'use strict';
  const timing=Object.freeze({flush:2.8,lotion:1.1,mirror:.85});
  const clamp=n=>Math.max(0,Math.min(1,n));
  const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
  const ramp=(n,a,b)=>smooth((n-a)/(b-a));
  function create(){return {flush:null,lotion:null,mirror:0,mirrorTarget:0,doses:0,flushCount:0,pumpCount:0};}
  function activate(state,id){
    if(id==='mirror'){state.mirrorTarget=1-state.mirrorTarget;return true;}
    if(id==='flush'&&state.flush===null){state.flush=0;state.flushCount++;return true;}
    if(id==='lotion'&&state.lotion===null){state.lotion=0;state.doses=Math.min(3,state.doses+1);state.pumpCount++;return true;}
    return false;
  }
  function advance(state,dt,reduced=false){
    dt=Math.max(0,Math.min(.1,dt));
    for(const id of ['flush','lotion'])if(state[id]!==null){state[id]+=dt;if(state[id]>=timing[id])state[id]=null;}
    const step=dt/(reduced?.16:timing.mirror),delta=state.mirrorTarget-state.mirror;
    state.mirror+=Math.sign(delta)*Math.min(Math.abs(delta),step);
  }
  function sample(state,reduced=false){
    const f=state.flush===null?-1:state.flush/timing.flush,p=state.lotion===null?-1:state.lotion/timing.lotion;
    return {
      flushActive:f>=0,flushPress:f<0?0:ramp(f,0,.05)*(1-ramp(f,.08,.18)),
      drain:f<0?0:ramp(f,.08,.62)*(1-ramp(f,.65,1)),
      swirl:f<0||reduced?0:Math.sin(Math.PI*clamp(f)),swirlAngle:f<0?0:f*Math.PI*7,
      pumpPress:p<0?0:ramp(p,0,.12)*(1-ramp(p,.26,.54)),
      cream:p>=.15&&p<.70,creamLength:p<0?0:ramp(p,.15,.64),
      dollop:state.doses>0&&(p<0||p>.55),doses:state.doses,
      mirrorAngle:-1.78*smooth(state.mirror)
    };
  }
  // A first sink click only changes distance. It must never operate the object.
  function intent(id,room,phase,close){
    if(phase!=='ready')return 'ignore';
    if(room===0&&!close&&['approach','main','lotion','mirror'].includes(id))return 'approach';
    return id==='approach'?'ignore':'operate';
  }
  const api={timing,create,activate,advance,sample,intent};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.RoutineProps=api;
})(typeof window==='undefined'?globalThis:window);