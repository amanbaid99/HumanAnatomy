// Illustrative joint actions, not deformation of the anatomy mesh.
const DEMOS = {
  raiseArm: {title:'Shoulder abduction',from:'Arm by your side',to:'Arm raised sideways',start:0,end:-85,upper:[0,-72],lower:[0,85],joint:'Shoulder',fixed:'Torso stays still',moving:'Arm moves',role:'helps raise the arm away from the body.',example:'Reach sideways toward a shelf.'},
  lowerArm: {title:'Shoulder adduction',from:'Arm raised sideways',to:'Arm by your side',start:-85,end:0,upper:[0,-72],lower:[0,85],joint:'Shoulder',fixed:'Torso stays still',moving:'Arm moves',role:'helps bring the arm back toward the body.',example:'Pull your arm down during a pull-up.'},
  elbow: {title:'Elbow flexion',from:'Elbow straight',to:'Elbow bent',start:0,end:110,upper:[0,-80],lower:[0,85],joint:'Elbow',fixed:'Upper arm stays still',moving:'Forearm moves',role:'helps bend the elbow, bringing the forearm toward the upper arm.',example:'Lift a cup toward your mouth.'},
  knee: {title:'Knee extension',from:'Knee bent',to:'Knee straight',start:65,end:0,upper:[0,-75],lower:[0,85],joint:'Knee',fixed:'Thigh stays still',moving:'Lower leg moves',role:'helps straighten the knee.',example:'Straighten your leg while sitting in a chair.'},
  ankle: {title:'Plantarflexion',from:'Foot level',to:'Toes pointed down',start:0,end:35,upper:[0,-85],lower:[85,0],joint:'Ankle',fixed:'Lower leg stays still',moving:'Foot moves',role:'helps point the foot downward at the ankle.',example:'Rise onto your tiptoes.'},
  hip: {title:'Hip flexion',from:'Leg down',to:'Thigh raised forward',start:0,end:-75,upper:[0,-65],lower:[0,90],joint:'Hip',fixed:'Pelvis stays still',moving:'Thigh moves',role:'helps lift the thigh toward the trunk.',example:'Lift your knee to step onto a stair.'},
};
const MUSCLE_MOTION = {
  'deltoid-lateral':'raiseArm',supraspinatus:'raiseArm',
  'latissimus-dorsi':'lowerArm','teres-major':'lowerArm',
  'biceps-long':'elbow','biceps-short':'elbow',brachialis:'elbow',brachioradialis:'elbow',
  'rectus-femoris':'knee','vastus-medialis':'knee','vastus-lateralis':'knee','vastus-intermedius':'knee',
  'gastrocnemius-medial':'ankle','gastrocnemius-lateral':'ankle',soleus:'ankle','achilles-tendon':'ankle',
  iliacus:'hip','psoas-major':'hip',
};
function limb(demo,angle,classes='') {
  const [ux,uy]=demo.upper,[lx,ly]=demo.lower;
  return `<line class="motion-fixed" x1="${ux}" y1="${uy}" x2="0" y2="0"/>
    <g class="${classes}" style="transform:rotate(${angle}deg)"><line class="motion-moving" x1="0" y1="0" x2="${lx}" y2="${ly}"/><circle class="motion-tip" cx="${lx}" cy="${ly}" r="6"/></g>
    <circle class="motion-joint-halo" r="17"/><circle class="motion-joint" r="8"/>`;
}
function direction(demo) {
  const base=Math.atan2(demo.lower[1],demo.lower[0]),point=angle=>[Math.cos(base+angle*Math.PI/180)*58,Math.sin(base+angle*Math.PI/180)*58];
  const a=point(demo.start),b=point(demo.end);
  return `M ${a[0]} ${a[1]} A 58 58 0 0 ${demo.end>demo.start?1:0} ${b[0]} ${b[1]}`;
}
export function createMovementController() {
  const $=selector=>document.querySelector(selector),pane=$('#motion-pane'),button=$('#motion-play'),slider=$('#motion-progress');
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let demo=null,progress=0,animation=0;
  function draw(value) {
    progress=Math.max(0,Math.min(100,value));slider.value=String(Math.round(progress));
    const angle=demo.start+(demo.end-demo.start)*progress/100;
    $('.motion-limb').style.transform=`rotate(${angle}deg)`;
    $('#motion-position').textContent=progress===0?'Start position':progress===100?'End position':`${Math.round(progress)}% through movement`;
    slider.setAttribute('aria-valuetext',`${Math.round(progress)}%: ${demo.from} to ${demo.to}`);
  }
  function stop() {
    cancelAnimationFrame(animation);animation=0;
    pane.dataset.playing='false';button.setAttribute('aria-pressed','false');
    button.textContent=preference.matches?(progress===100?'Show start position':'Show end position'):(progress===100?'Replay movement':'Play movement');
  }
  button.addEventListener('click',()=>{
    if(!demo)return;
    if(preference.matches){draw(progress===100?0:100);stop();pane.dataset.playing=String(progress===100);button.setAttribute('aria-pressed',String(progress===100));return;}
    if(animation){stop();return;}
    if(progress>=100)draw(0);
    const start=performance.now(),initial=progress;
    pane.dataset.playing='true';button.setAttribute('aria-pressed','true');button.textContent='Pause movement';
    const tick=now=>{
      draw(initial+(now-start)/32);
      if(progress>=100){stop();return;}
      animation=requestAnimationFrame(tick);
    };
    animation=requestAnimationFrame(tick);
  });
  slider.addEventListener('input',()=>{if(demo){stop();draw(Number(slider.value));stop();}});
  $('#motion-start').addEventListener('click',()=>{if(demo){stop();draw(0);stop();}});
  $('#motion-end').addEventListener('click',()=>{if(demo){stop();draw(100);stop();}});
  preference.addEventListener('change',stop);
  return {
    stop,
    update(record) {
      stop();progress=0;demo=DEMOS[MUSCLE_MOTION[record.id]];
      pane.hidden=!demo;$('#peek-motion').hidden=!demo;
      if(!demo){$('#motion-drawing').replaceChildren();$('#motion-snapshots').replaceChildren();return;}
      $('#motion-caption').textContent=demo.title;
      $('#motion-poses').textContent=`${demo.from} → ${demo.to}`;
      $('#motion-role').textContent=record.id==='achilles-tendon'?'The Achilles tendon transfers force from the calf muscles to the heel; it does not contract itself.':`${record.name} ${demo.role}`;
      $('#motion-example').textContent=demo.example;
      $('#motion-fixed-label').textContent=demo.fixed;$('#motion-moving-label').textContent=demo.moving;
      $('#motion-drawing').innerHTML=`<svg viewBox="0 0 320 250" role="img" aria-label="Simplified ${demo.title.toLowerCase()} diagram: ${demo.from.toLowerCase()} to ${demo.to.toLowerCase()}">
        <defs><marker id="motion-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
        <g transform="translate(160 120)">
          <g transform="rotate(${demo.start})"><line class="motion-ghost" x1="0" y1="0" x2="${demo.lower[0]}" y2="${demo.lower[1]}"/></g>
          ${limb(demo,demo.start,'motion-limb')}
          <path class="motion-direction" d="${direction(demo)}" marker-end="url(#motion-arrow)"/>
        </g>
        <text class="motion-joint-name" x="172" y="108">${demo.joint}</text>
      </svg>`;
      $('#motion-snapshots').innerHTML=[['Start',demo.from,demo.start],['Finish',demo.to,demo.end]].map(([label,text,angle])=>`<div><span>${label}</span><svg viewBox="0 0 260 230" aria-hidden="true"><g transform="translate(130 115)">${limb(demo,angle)}</g></svg><p>${text}</p></div>`).join('');
      draw(0);stop();
    },
    reveal(){pane.scrollIntoView({block:'nearest',behavior:preference.matches?'auto':'smooth'});},
  };
}
