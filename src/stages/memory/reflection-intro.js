

/* One short involuntary look at the mirror, then an exact return to play. */
const ReflectionIntro=(()=>{
  const smooth=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n);};
  const ramp=(t,a,b)=>smooth((t-a)/(b-a));
  function sample(time,reduced=false){
    if(reduced)return {camera:0,figure:0,smile:0,sway:0,done:time>=.18,shot:'settling'};
    const camera=ramp(time,0,.85)*(1-ramp(time,2.35,3.25));
    // The reflection keeps coming after the camera stops, creating a brief
    // mismatch without a new jump, flash, sound sting or extra game action.
    const figure=ramp(time,.48,1.20)*(1-ramp(time,2.35,3.10));
    const smile=ramp(time,.90,1.40)*(1-ramp(time,2.35,3.08));
    const sway=Math.sin((time-.70)*Math.PI*2/1.30)*.055*figure;
    return {camera,figure,smile,sway,done:time>=3.25,shot:time>=1.42&&time<2.35?'close':time<1.42?'approach':'return'};
  }
  return {sample};
})();