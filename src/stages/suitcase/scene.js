/* Code-native objects, drawn at one pixel density with anchored dot shading. */
const SuitcaseScene=(()=>{
  const STYLE=Object.freeze({ink:'#000',paper:'#fff',line:2.4,pixel:.75});
  const PI=Math.PI;
  function path(c,d,fill='#fff',line=2.4){const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p);}if(line){c.strokeStyle='#000';c.lineWidth=line;c.stroke(p);}}
  function oval(c,x,y,rx,ry,fill='#fff',lw=2.4){c.beginPath();c.ellipse(x,y,rx,ry,0,0,PI*2);if(fill){c.fillStyle=fill;c.fill();}if(lw){c.strokeStyle='#000';c.lineWidth=lw;c.stroke();}}
  function stroke(c,d,w=2.4){path(c,d,null,w);}
  function dots(c,x,y,w,h,level=.2,seed=0){c.fillStyle='#000';for(let yy=0;yy<h;yy+=3)for(let xx=0;xx<w;xx+=3)if(((xx*17+yy*31+seed*13)%97)/97<level)c.fillRect(x+xx,y+yy,1.2,1.2);}
  function human(c,x,y,s,child=false){c.save();c.translate(x,y);c.scale(s,s);oval(c,0,-61,child?12:9,child?13:11);path(c,'M -13 -44 Q 0 -51 13 -44 L 18 -15 L 8 -14 L 7 15 L 1 15 L 0 -9 L -3 15 L -9 15 L -9 -14 L -18 -15 Z','#000',1);c.restore();}
  function object(c,id,x,y,size=100,angle=0){
    c.save();c.translate(x,y);c.rotate(angle);c.scale(size/100,size/100);c.lineCap='round';c.lineJoin='round';
    if(id==='photo'){
      path(c,'M -38 -43 L 38 -41 L 40 43 L -40 42 Z');c.strokeRect(-31,-34,62,65);dots(c,-37,-40,72,78,.09);
      human(c,-12,18,.55);human(c,16,23,.4,true);stroke(c,'M -25 23 Q 0 5 29 21',1.2);
    }else if(id==='bear'){
      oval(c,-18,-35,11,11);oval(c,18,-35,11,11);oval(c,0,11,24,30);oval(c,-25,4,9,19);oval(c,25,4,9,19);oval(c,-14,37,13,10);oval(c,14,37,13,10);oval(c,0,-22,25,24);dots(c,-18,-33,35,28,.3);oval(c,-8,-25,2,3,'#000',0);oval(c,8,-25,2,3,'#000',0);oval(c,0,-13,11,8);path(c,'M -4 -16 L 4 -16 L 0 -12 Z','#000',1);stroke(c,'M 0 -12 L 0 -7 M -5 10 L 5 10 M 0 5 L 0 15',1.4);
    }else if(id==='clock'){
      oval(c,-23,-28,14,9,'#000');oval(c,23,-28,14,9,'#000');oval(c,0,4,34,34);oval(c,0,4,28,28);stroke(c,'M -24 33 L -30 43 M 24 33 L 30 43 M 0 5 L 0 -15 M 0 5 L 15 12',3);for(let i=0;i<12;i++){c.save();c.translate(0,4);c.rotate(i*PI/6);stroke(c,'M 0 -24 L 0 -21',1.5);c.restore();}dots(c,-29,22,57,7,.3);
    }else if(id==='keys'){
      oval(c,-12,-21,18,18,null,4);oval(c,-12,-21,11,11,null,1);path(c,'M -3 -7 L 25 29 L 19 35 L 12 27 L 7 31 L 2 24 L 7 20 L -11 -2 Z');stroke(c,'M -16 -4 L -25 25 L -17 29 L -13 17 L -7 19 L -5 13',4);
    }else if(id==='cloth'){
      path(c,'M -43 -24 L 35 -29 L 44 22 L -36 29 Z');stroke(c,'M -38 -16 L 29 -20 L 35 17 L -30 22 Z M -22 -24 L -14 25',1.5);dots(c,-34,-12,59,31,.18);stroke(c,'M 18 2 Q 27 -7 28 5 Q 23 16 18 2 Z',1.4);
    }else if(id==='pills'){
      path(c,'M -22 -43 L 23 -40 L 25 44 L -24 41 Z');dots(c,-20,-37,40,74,.16);for(let yy=-26;yy<=26;yy+=26)for(let xx=-10;xx<=10;xx+=20){oval(c,xx,yy,7,10,'#fff',1.7);stroke(c,`M ${xx-4} ${yy-5} L ${xx+4} ${yy+5}`,1);}
    }else if(id==='book'){
      path(c,'M -37 -42 L 30 -42 L 38 -34 L 38 43 L -30 43 Q -39 42 -39 34 L -39 -33 Q -39 -41 -37 -42 Z');
      path(c,'M -31 -36 L 30 -36 L 30 34 L -31 34 Q -38 35 -37 40 L -37 -32 Z');
      stroke(c,'M -25 -35 L -25 33 M -30 39 L 31 39 M -9 -13 L 16 -13 M -9 -5 L 9 -5',1.4);dots(c,-20,7,42,21,.15);path(c,'M 15 34 L 15 47 L 20 42 L 25 47 L 25 34 Z','#000',1);
    }else if(id==='cassette'){
      path(c,'M -45 -28 L 45 -28 L 47 27 L -47 27 Z');path(c,'M -37 -20 L 37 -20 L 37 12 L -37 12 Z');
      oval(c,-20,-4,9,9);oval(c,20,-4,9,9);stroke(c,'M -11 -4 L 11 -4 M -29 -15 L 29 -15 M -24 26 L -18 15 L 18 15 L 24 26',1.5);
      for(const x of [-20,20]){stroke(c,`M ${x} -11 L ${x} 3 M ${x-6} -4 L ${x+6} -4`,1.4);}dots(c,-40,17,15,6,.45);
    }else if(id==='letter'){
      path(c,'M -43 -29 L 43 -29 L 43 30 L -43 30 Z');stroke(c,'M -42 -28 L 0 7 L 42 -28 M -42 29 L -13 1 M 42 29 L 13 1',1.6);path(c,'M 27 -23 L 37 -23 L 37 -12 L 27 -12 Z',null,1);dots(c,28,-22,8,9,.35);
    }else if(id==='pencil'){
      path(c,'M -31 23 L 19 -36 L 30 -26 L -20 33 L -36 40 Z');path(c,'M -36 40 L -31 23 L -20 33 Z');path(c,'M -36 40 L -33 31 L -28 36 Z','#000',1);stroke(c,'M -27 27 L 23 -32 M 15 -31 L 26 -21',1.3);path(c,'M 19 -36 L 23 -41 Q 25 -44 29 -40 L 34 -35 Q 36 -32 30 -26 Z');dots(c,24,-39,6,7,.35);
    }
    c.restore();
  }
  function layout(w,h){
    const narrow=w/h<.9, vw=narrow?720:1000,vh=narrow?1100:720,scale=Math.min(w/vw,h/vh),ox=(w-vw*scale)/2,oy=(h-vh*scale)/2;
    const bag=narrow?{x:152,y:345,w:416,h:265}:{x:292,y:350,w:416,h:265};
    const home=narrow?[[80,760],[220,760],[360,760],[500,760],[640,760],[80,970],[220,970],[360,970],[500,970],[640,970]]:[[140,110],[140,235],[140,360],[140,485],[140,610],[860,110],[860,235],[860,360],[860,485],[860,610]];
    return {w,h,vw,vh,scale,ox,oy,narrow,bag,grid:{x:bag.x+40,y:bag.y+22,cell:112},lid:{x:bag.x,y:bag.y-275,w:bag.w,h:260},close:{x:bag.x+bag.w/2,y:bag.y+bag.h+22},home};
  }
  function bag(c,g,closed=0){
    const b=g.bag,l=g.lid;
    c.lineWidth=3;c.strokeStyle='#000';c.fillStyle='#fff';
    c.beginPath();c.roundRect(b.x-8,b.y-3,b.w+16,b.h+8,24);c.fill();c.stroke();
    dots(c,b.x-5,b.y+12,b.w+10,b.h-14,.12);c.fillStyle='#fff';c.fillRect(b.x+12,b.y+10,b.w-24,b.h-25);c.strokeRect(b.x+12,b.y+10,b.w-24,b.h-25);
    c.save();c.translate(l.x,l.y+260);c.scale(1,Math.max(.015,1-closed));c.translate(-l.x,-l.y-260);
    c.fillStyle='#fff';c.beginPath();c.roundRect(l.x,l.y,l.w,l.h,22);c.fill();c.stroke();
    c.strokeRect(l.x+16,l.y+17,l.w-32,l.h-34);dots(c,l.x+19,l.y+21,l.w-38,l.h-42,.10);
    stroke(c,`M ${l.x+30} ${l.y+175} Q ${l.x+l.w/2} ${l.y+205} ${l.x+l.w-30} ${l.y+175}`,1.5);
    stroke(c,`M ${l.x+l.w/2-54} ${l.y-1} L ${l.x+l.w/2-50} ${l.y-26} Q ${l.x+l.w/2} ${l.y-44} ${l.x+l.w/2+50} ${l.y-26} L ${l.x+l.w/2+54} ${l.y-1}`,7);
    c.restore();
    for(const x of [b.x+57,b.x+b.w-57])stroke(c,`M ${x} ${b.y-6} L ${x} ${b.y+9}`,9);
    const k=g.close;path(c,`M ${k.x-24} ${k.y-13} L ${k.x+24} ${k.y-13} L ${k.x+24} ${k.y+12} Q ${k.x} ${k.y+21} ${k.x-24} ${k.y+12} Z`);oval(c,k.x,k.y,5,5,'#000',0);
    if(closed>.02){c.save();c.globalAlpha=Math.min(1,closed*2);c.fillStyle='#fff';c.beginPath();c.roundRect(b.x,b.y,b.w,b.h,23);c.fill();c.stroke();c.strokeRect(b.x+14,b.y+12,b.w-28,b.h-24);dots(c,b.x+18,b.y+16,b.w-36,b.h-32,.2);for(const x of [b.x+57,b.x+b.w-57]){c.fillStyle='#fff';c.fillRect(x-8,b.y-5,16,b.h+10);c.strokeRect(x-8,b.y-5,16,b.h+10);}c.restore();}
  }
  function chair(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);path(c,'M -27 -86 L 23 -88 L 26 -36 L -27 -34 Z');stroke(c,'M -30 -32 L 31 -35 L 38 -19 L -25 -17 Z M -23 -17 L -24 36 M 30 -20 L 36 34 M -25 8 L 33 7',3);c.restore();}
  function memory(c,key,t,g,selected){
    const cx=g.vw/2,cy=g.vh*.49,zoom=Math.min(g.vw/800,g.vh/650);
    c.save();c.translate(cx,cy);c.scale(zoom,zoom);c.lineWidth=2.4;c.strokeStyle='#000';c.fillStyle='#000';
    const breath=Math.sin(t*1.7);
    if(key==='photo'){
      stroke(c,'M -310 190 L 310 190 M -255 -205 L -255 190',2);object(c,'photo',-60,-145,180,-.03);chair(c,105,126,1.7);stroke(c,'M 55 42 L 145 42',1);
    }else if(key==='bear'){
      stroke(c,'M -285 190 L -210 -220 L 225 -220 L 290 190 M -235 -170 L 250 -170',4);
      const d=breath*8;stroke(c,`M -90 -220 L ${-90+d} 38 M 70 -220 L ${70+d} 38 M ${-102+d} 40 L ${82+d} 40`,2);object(c,'bear',-150,149,105,-.17);stroke(c,'M -310 197 L 310 197',2);
    }else if(key==='clock'){
      stroke(c,'M -310 160 L 310 160 M -260 -205 L -260 160',2);object(c,'clock',0,-80,230);stroke(c,'M -210 65 L 202 65 L 211 160 M -194 65 L -198 160',3);dots(c,-200,71,390,15,.13);
    }else if(key==='keys'){
      path(c,'M -130 -225 L 150 -225 L 150 210 L -130 210 Z');c.strokeRect(-110,-206,240,394);oval(c,104,0,8,8,'#000',0);stroke(c,'M 110 1 L 110 15',3);object(c,'keys',-190,132,95,.25);stroke(c,'M -310 210 L 310 210',2);
    }else if(key==='cloth'){
      stroke(c,'M -315 -110 Q 0 -55 315 -105',3);c.save();c.translate(breath*3,0);path(c,'M -100 -82 L 115 -83 L 103 120 Q 0 139 -95 120 Z');dots(c,-89,-35,180,150,.09);stroke(c,'M -80 -94 L -78 -64 M 96 -95 L 93 -63',5);c.restore();stroke(c,'M -270 210 L 270 210',2);
    }else if(key==='pills'){
      stroke(c,'M -215 85 L 220 85 L 230 115 L -220 115 Z M -190 115 L -195 220 M 196 115 L 203 220',3);object(c,'pills',-105,38,100,-PI/2);path(c,'M 80 -42 L 150 -42 L 143 80 L 88 80 Z');stroke(c,'M 85 19 L 147 19',1.3);dots(c,89,26,52,50,.2);chair(c,-265,145,.9);
    }else if(key==='book'){
      stroke(c,'M -290 110 L 280 110 L 298 130 L -300 130 Z M -260 130 L -264 220 M 255 130 L 260 220',3);
      c.save();c.translate(0,46);
      path(c,'M 0 64 Q -88 27 -176 56 L -176 -78 Q -86 -111 0 -65 Q 88 -111 176 -78 L 176 56 Q 89 27 0 64 Z');
      stroke(c,'M 0 -65 L 0 64 M -150 -51 Q -91 -73 -27 -46 M -150 -29 Q -91 -51 -27 -24 M 27 -46 Q 91 -73 150 -51 M 27 -24 Q 91 -51 150 -29',1.4);c.restore();chair(c,230,174,1.05);
    }else if(key==='cassette'){
      path(c,'M -215 -62 L 200 -62 L 200 119 L -215 119 Z');c.strokeRect(-187,-38,145,91);object(c,'cassette',-114,9,127);oval(c,91,30,57,57);for(let i=-35;i<=35;i+=10)stroke(c,`M 48 ${30+i} L 135 ${30+i}`,1.2);
      stroke(c,'M -180 -65 L -167 -107 L 121 -107 L 138 -65 M -310 130 L 310 130',3);oval(c,-143,85,9,9,'#000');stroke(c,'M -115 85 L -90 85 M -72 85 L -47 85',4);dots(c,-183,-35,136,85,.07);
    }else if(key==='letter'){
      stroke(c,'M -310 185 L 310 185 M -255 -200 L -255 185',2);path(c,'M -114 -170 L 117 -170 L 117 -22 L -114 -22 Z');stroke(c,'M -92 -131 L 95 -131 M 2 -21 L 2 185',4);path(c,'M -92 -142 L 95 -142 L 95 -125 L -92 -125 Z','#000',1);object(c,'letter',-22,139,155,-.12);dots(c,-109,-115,220,86,.08);
    }else if(key==='pencil'){
      path(c,'M -195 -155 L 170 -145 L 188 133 L -177 145 Z');stroke(c,'M -128 65 L -118 -23 L -25 -81 L 66 -24 L 77 69 M -141 -23 L -25 -105 L 90 -23 M -45 70 L -45 5 L -4 5 L -4 71 M 19 2 L 49 2 L 49 31 L 19 31 Z',1.5);
      stroke(c,'M -117 72 L 76 72 M -310 185 L 310 185',2);object(c,'pencil',126,118,155,.3);dots(c,-160,-133,52,24,.12);
    }else if(key==='empty-case'){
      path(c,'M -170 -90 L 175 -90 L 175 110 L -170 110 Z');stroke(c,'M -158 -79 L 162 98 M 161 -78 L -157 99',1.4);dots(c,-163,-81,331,182,.08);
    }else{
      stroke(c,'M -315 80 L 315 80 L 334 105 L -328 105 Z M -292 106 L -301 230 M 292 106 L 301 230',3);
      const n=selected.length;selected.forEach((id,i)=>{const size=id==='photo'?74:70,bottom={photo:43,bear:47,clock:43,keys:35,cloth:29,pills:44,book:47,cassette:28,letter:30,pencil:40}[id];object(c,id,(i-(n-1)/2)*89,80-bottom*size/100,size,0);});
      chair(c,-130,171,1.2);
      if(selected.includes('photo')&&selected.includes('bear'))chair(c,130,172,.8);
      if(selected.includes('pills')&&selected.includes('cloth')){path(c,'M 225 -30 L 270 -30 L 266 75 L 231 75 Z');stroke(c,'M 229 25 L 269 25',1.2);}
      if(selected.includes('keys'))stroke(c,'M 305 -225 L 365 -225 L 365 79 M 348 -75 L 356 -75',2);
    }
    c.restore();
  }
  return {STYLE,object,layout,bag,memory,stroke,dots};
})();
