
/* One-bit elderly figure. Paint follows the existing physics bodies; it never
 * changes joint targets, contacts or the camera. All artwork is built locally. */
function createLastWalkArtwork(modelArt, child=false) {
  const ink='#000',skin='#fff',shade='#c5c5c5',deep='#656565';
  function trace(c,d,fill=null,stroke=ink,width=.008){
    const t=d.match(/[MLQCZ]|-?(?:\d*\.)?\d+/g);let i=0;
    c.beginPath();
    while(i<t.length){const op=t[i++],n=()=>Number(t[i++]);
      if(op==='M')c.moveTo(n(),n());else if(op==='L')c.lineTo(n(),n());
      else if(op==='Q')c.quadraticCurveTo(n(),n(),n(),n());
      else if(op==='C')c.bezierCurveTo(n(),n(),n(),n(),n(),n());else c.closePath();
    }
    if(fill){c.fillStyle=fill;c.fill();}
    if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.lineCap='round';c.lineJoin='round';c.stroke();}
  }
  function oval(c,x,y,rx,ry,fill,stroke=null,width=.006){
    c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.stroke();}
  }
  function bake(bounds,paint,density=112){
    const [x0,y0,x1,y1]=bounds,canvas=document.createElement('canvas');
    canvas.width=Math.ceil((x1-x0)*density);canvas.height=Math.ceil((y1-y0)*density);
    const c=canvas.getContext('2d');c.setTransform(density,0,0,-density,-x0*density,y1*density);paint(c);
    c.setTransform(1,0,0,1,0,0);
    const pixels=c.getImageData(0,0,canvas.width,canvas.height),a=pixels.data;
    const w=canvas.width,h=canvas.height,errors=new Float32Array(w*h);
    for(let y=0;y<h;y++)for(let j=0;j<w;j++){
      const dir=y%2?-1:1,x=dir===1?j:w-1-j,p=y*w+x,k=p*4;
      if(a[k+3]<96){a[k+3]=0;continue;}
      const old=a[k]+errors[p],value=old>=128?255:0,error=old-value;
      a[k]=a[k+1]=a[k+2]=value;a[k+3]=255;
      for(const [dx,dy,weight] of [[dir,0,7/16],[-dir,1,3/16],[0,1,5/16],[dir,1,1/16]]){
        const xx=x+dx,yy=y+dy,i=yy*w+xx;if(xx>=0&&xx<w&&yy<h&&a[i*4+3]>=96)errors[i]+=error*weight;
      }
    }
    c.putImageData(pixels,0,0);return {canvas,x0,y1,w:canvas.width/density,h:canvas.height/density};
  }
  function put(c,s,x,y,scale,angle=0){
    c.save();c.translate(x,y);c.rotate(angle);c.imageSmoothingEnabled=false;
    c.drawImage(s.canvas,s.x0*scale,-s.y1*scale,s.w*scale,s.h*scale);c.restore();
  }
  function fromModel(part){
    const canvas=document.createElement('canvas');canvas.width=part.rows[0].length;canvas.height=part.rows.length;
    const c=canvas.getContext('2d'),pixels=c.getImageData(0,0,canvas.width,canvas.height);
    part.rows.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(row[x]!=='.'){
      const boundary=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([xx,yy])=>!part.rows[yy]||part.rows[yy][xx]===undefined||part.rows[yy][xx]==='.');
      const k=(y*canvas.width+x)*4,v=row[x]==='1'&&!boundary?255:0;pixels.data.set([v,v,v,255],k);
    }});c.putImageData(pixels,0,0);return {...part,canvas};
  }
  const modelHead=fromModel(modelArt.head),modelTorso=fromModel(modelArt.torso);
  const shapedTorso=child?modelTorso:bake([-.215,-.27,.20,.29],c=>{
    // A soft side silhouette covers the straight cuts needed to separate the
    // imported T-pose's shoulders. Keep its painted vest inside that contour.
    const contour='M -.052 .269 C -.102 .254 -.158 .223 -.177 .163 C -.190 .094 -.168 .005 -.151 -.081 Q -.141 -.167 -.125 -.231 Q -.004 -.257 .123 -.222 C .154 -.181 .164 -.114 .144 -.047 Q .121 .017 .113 .097 Q .095 .162 .026 .240 Z';
    trace(c,contour,'#fff',null);c.save();trace(c,contour,null,null);c.clip();
    c.translate(modelTorso.x0,modelTorso.y1);c.scale(1,-1);
    c.drawImage(modelTorso.canvas,0,0,modelTorso.w,modelTorso.h);c.restore();
    trace(c,contour,null,ink,.007);
    trace(c,'M -.065 .247 Q -.124 .198 -.123 .122 M .019 .220 Q .036 .158 .077 .140',null,ink,.006);
  });
  const pelvis=bake([-.18,-.15,.18,.15],c=>{
    trace(c,'M -.136 .12 Q -.002 .132 .135 .101 L .151 -.073 Q .082 -.120 .029 -.106 L -.020 -.128 L -.150 -.095 Z','#3b3b3b','#ccc',.006);
    trace(c,'M -.131 .113 Q -.024 .092 .137 .095 L .14 .065 Q .005 .050 -.14 .076 Z','#acacac',ink,.004);
    trace(c,'M .021 .055 Q .053 -.001 .038 -.065 M -.10 .034 L -.067 -.045',null,'#aaa',.006);
  });
  function limbPart(length,kind,near){
    const arm=kind==='upperArm'||kind==='forearm',upper=kind==='upperArm'||kind==='thigh';
    const radius=(child?.79:1)*(arm?(upper?.049:.043):(upper?.080:.055)),h=length/2;
    return bake([-radius-.025,-h-.055,radius+.025,h+.055],c=>{
      // Caps extend over the hinge so bends cannot expose a detached square edge.
      const r=radius,fill=child&&kind==='upperArm'?'#525252':near?skin:'#e7e7e7';
      trace(c,`M ${-r*.64} ${h+.015} Q ${-r*1.13} ${h-.04} ${-r*.90} ${h*.28} Q ${-r*.72} ${-h*.35} ${-r*.54} ${-h-.008} Q 0 ${-h-.052} ${r*.55} ${-h-.005} Q ${r*.78} ${-h*.43} ${r*.96} ${h*.15} Q ${r*1.05} ${h-.025} ${r*.56} ${h+.02} Q 0 ${h+.044} ${-r*.64} ${h+.015} Z`,fill,ink,.006);
      trace(c,`M ${-r*.65} ${h+.008} Q ${-r*.93} ${h*.32} ${-r*.60} ${-h*.50} L ${-r*.44} ${-h-.010} L ${-r*.06} ${-h-.027} Q ${-r*.12} ${-h*.21} ${-r*.25} ${h*.26} Q ${-r*.44} ${h*.62} ${-r*.21} ${h+.018} Z`,near?'#bcbcbc':'#888',null);
      if(kind==='thigh'){
        trace(c,`M ${-r*.79} ${h+.022} Q ${-r*1.23} ${h*.49} ${-r*1.01} ${-h*.23} Q 0 ${-h*.34} ${r*1.05} ${-h*.25} L ${r*1.02} ${h*.54} L ${r*.57} ${h+.030} Z`,near?'#383838':'#242424','#bbb',.005);
        trace(c,`M ${-r*.55} ${h*.39} L ${-r*.66} ${-h*.11} M ${r*.47} ${h*.13} L ${r*.76} ${-h*.15}`,null,'#969696',.006);
        trace(c,`M ${-r*.42} ${-h*.72} Q 0 ${-h*.63} ${r*.46} ${-h*.78}`,null,deep,.004);
      }else{
        if(kind==='shin')trace(c,`M ${r*.39} ${h*.57} Q ${r*.13} 0 ${r*.23} ${-h*.82}`,null,deep,.004);
        else trace(c,`M ${r*.26} ${h*.54} Q ${r*.40} .012 ${r*.16} ${-h*.45}`,null,deep,.0035);
        trace(c,`M ${-r*.38} ${-h+.027} Q 0 ${-h+.020} ${r*.30} ${-h+.027}`,null,deep,.0035);
      }
    });
  }
  const parts={};for(const near of [false,true])for(const [kind,length] of Object.entries(child?{upperArm:.21,forearm:.20,thigh:.28,shin:.27}:{upperArm:.285,forearm:.27,thigh:.405,shin:.390}))parts[kind+near]=limbPart(length,kind,near);
  function handPart(near,grip){return bake([-.066,-.089,.067,.064],c=>{
    trace(c,'M -.029 .049 Q -.044 .019 -.047 -.012 L -.039 -.058 Q -.034 -.078 -.016 -.078 L .019 -.072 Q .041 -.059 .040 -.041 L .042 -.016 Q .058 -.001 .046 .014 L .024 .031 L .026 .050 Z',near?skin:'#c5c5c5',ink,.005);
    trace(c,'M -.027 .015 Q -.033 -.023 -.015 -.062 L .002 -.068 Q -.006 -.032 -.004 -.013 Z',shade,null);
    trace(c,'M .021 .016 Q .008 -.012 .023 -.027 M -.001 -.040 L .005 -.064 M .013 -.039 L .018 -.062',null,deep,.0035);
    if(grip){trace(c,'M -.030 .010 L .015 .003 M -.031 -.005 L .011 -.011 M -.027 -.021 L .015 -.026',null,ink,.004);}
  });}
  const hands=[handPart(false,false),handPart(true,false),handPart(false,true)];
  const shoe=bake([-.146,-.066,.173,.101],c=>{
    trace(c,'M -.101 .083 Q -.051 .098 .014 .074 L .043 .044 Q .086 .025 .134 .022 Q .168 .016 .161 -.042 Q .091 -.061 -.128 -.047 L -.131 .012 Q -.115 .030 -.101 .083 Z','#1c1c1c','#ccc',.005);
    trace(c,'M -.109 -.028 Q .012 -.041 .146 -.027',null,'#f1f1f1',.006);
    trace(c,'M -.062 .056 Q -.019 .034 .022 .043 M -.034 .034 L -.006 .028 M -.014 .020 L .016 .016',null,'#bbb',.004);
  });
  // A right hand around the receiver: forearm and palm behind the handle,
  // four separate curled fingers and opposing thumb in front of it.
  const phoneBack=bake([-.60,-13.2,3.50,.65],c=>{
    // Continue below the portrait viewport too; never leave a floating cut wrist.
    trace(c,'M 1.40 -13 C .95 -9.50 .24 -6.50 .20 -5.12 C .15 -3.40 -.11 -1.71 -.19 -.72 Q -.25 -.43 -.38 -.22 Q -.48 .005 -.38 .265 L -.27 .420 Q -.19 .476 -.12 .401 L .10 .413 Q .278 .383 .324 .222 Q .351 .011 .265 -.182 L .184 -.496 Q .174 -.648 .240 -.895 C .502 -2.13 1.05 -3.72 1.49 -5.12 L 3.24 -13 Z',skin,ink,.022);
    trace(c,'M 1.40 -13 C .95 -9.50 .24 -6.50 .20 -5.12 C .16 -3.42 -.10 -1.71 -.19 -.72 Q -.27 -.40 -.38 -.22 Q -.45 .004 -.36 .243 L -.28 .332 Q -.31 .013 -.20 -.127 Q -.116 -.308 -.048 -.556 C -.061 -1.80 .36 -3.95 .50 -5.12 L 1.75 -13 Z','#b3b3b3',null);
    trace(c,'M -.205 -.488 Q -.018 -.546 .196 -.476 M -.181 -.580 Q .002 -.638 .184 -.558',null,deep,.010);
    trace(c,'M .35 -3.93 Q .035 -2.46 .05 -1.83 Q .094 -1.07 -.018 -.664 M .60 -4.09 Q .31 -2.59 .30 -2.01',null,'#a5a5a5',.012);
    trace(c,'M -.140 -.302 Q -.240 -.175 -.183 .035 M -.066 -.369 Q .012 -.180 .185 -.077',null,'#929292',.009);
    oval(c,.025,-.94,.018,.025,'#aaa');oval(c,.12,-1.29,.013,.019,'#aaa');oval(c,-.09,-.18,.016,.019,'#aaa');
  },112);
  const phoneFront=bake([-.57,-.48,.53,.66],c=>{
    for(const [x,top,bottom,width] of [[-.335,.438,.158,.152],[-.173,.477,.121,.162],[.004,.459,.123,.157],[.172,.394,.150,.130]]){
      trace(c,`M ${x-width/2} ${bottom+.055} L ${x-width/2} ${top-.065} Q ${x-width*.50} ${top+.014} ${x} ${top+.013} Q ${x+width*.56} ${top+.008} ${x+width/2} ${top-.073} L ${x+width*.43} ${bottom+.025} Q ${x} ${bottom-.023} ${x-width/2} ${bottom+.055} Z`,skin,ink,.012);
      trace(c,`M ${x-width*.44} ${top-.060} L ${x-width*.34} ${bottom+.053} Q ${x-width*.15} ${bottom+.016} ${x+width*.21} ${bottom+.042} L ${x+width*.11} ${top-.08} Z`,'#b9b9b9',null);
      trace(c,`M ${x-width*.25} ${top-.067} Q ${x} ${top-.042} ${x+width*.24} ${top-.063} M ${x-width*.22} ${bottom+.094} Q ${x} ${bottom+.107} ${x+width*.20} ${bottom+.094}`,null,deep,.007);
      trace(c,`M ${x-width*.23} ${bottom+.025} L ${x-width*.23} ${bottom+.079} Q ${x} ${bottom+.111} ${x+width*.23} ${bottom+.079} L ${x+width*.23} ${bottom+.030}`,null,deep,.006);
    }
    trace(c,'M .165 -.269 Q .314 -.182 .366 -.024 Q .397 .125 .286 .206 L .105 .272 Q .041 .282 .003 .237 Q -.017 .186 .044 .150 L .195 .097 Q .227 .062 .172 -.009 L .037 -.113',skin,ink,.012);
    trace(c,'M .184 -.176 Q .325 -.111 .290 .034 L .259 .065 Q .230 -.060 .132 -.103 Z','#b2b2b2',null);
    trace(c,'M .044 .180 Q .043 .222 .083 .246 L .149 .222 L .134 .168 Z','#e6e6e6',deep,.007);
    trace(c,'M .231 .108 L .259 .139 M .256 .090 L .282 .119',null,deep,.007);
  },112);
  function drawFigure(c,game,project,scale,drawCane){
    const body=(b,s)=>{const p=project(b.getPosition());put(c,s,p.x,p.y,scale*(child?(s===shoe?.74:s===pelvis?.80:hands.includes(s)?.72:1):1),-b.getAngle());};
    const joint=(j,r,near)=>{const p=project(j.getAnchorA());c.beginPath();c.arc(p.x,p.y,r*scale*(child?.76:1),0,Math.PI*2);c.fillStyle=near?'#fff':'#aaa';c.fill();};
    function leg(key,near){const l=game.limbs[key];
      joint(l.primary,.064,near);joint(l.secondary,.037,near);joint(l.ankle,.028,near);
      body(l.upper.body,parts['thigh'+near]);body(l.lower.body,parts['shin'+near]);body(l.tip,shoe);
    }
    function arm(key,near){const l=game.limbs[key];
      joint(l.primary,.042,near);joint(l.secondary,.032,near);
      body(l.upper.body,parts['upperArm'+near]);body(l.lower.body,parts['forearm'+near]);
      body(l.tip,hands[key==='q'&&game.cane?.held?2:near?1:0]);
    }
    c.save();c.imageSmoothingEnabled=false;
    leg('o',false);drawCane();arm('q',false);body(game.bodies.pelvis,pelvis);
    const a=project(game.joints.neck.getAnchorA()),b=project(game.bodies.head.getWorldPoint({x:-.025,y:-.10}));
    c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineCap='round';c.strokeStyle='#000';c.lineWidth=.078*scale;c.stroke();c.strokeStyle='#fff';c.lineWidth=.062*scale;c.stroke();
    body(game.bodies.torso,shapedTorso);body(game.bodies.head,modelHead);leg('p',true);arm('w',true);c.restore();
  }
  function drawPhoneHand(c,x,y,scale,angle,front){put(c,front?phoneFront:phoneBack,x,y,scale,angle);}
  return {drawFigure,drawPhoneHand,
  drawHead:(c,x,y,s,a=0)=>put(c,modelHead,x,y,s,a),
  drawTorso:(c,x,y,s,a=0)=>put(c,shapedTorso,x,y,s,a),
  drawHand:(c,x,y,s,a=0)=>put(c,hands[1],x,y,s,a)};
}