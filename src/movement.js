// These diagrams illustrate one action; they do not deform the anatomical mesh.
const DEMOS = {
  raiseArm: { title:'Shoulder abduction', from:'Arm at side', to:'Arm raised', start:0, end:-75, upper:[0,-45], lower:[0,95] },
  lowerArm: { title:'Shoulder adduction', from:'Arm raised', to:'Arm at side', start:-75, end:0, upper:[0,-45], lower:[0,95] },
  elbow: { title:'Elbow flexion', from:'Elbow extended', to:'Elbow bent', start:-40, end:95, upper:[-60,-70], lower:[0,85] },
  knee: { title:'Knee extension', from:'Knee bent', to:'Knee straight', start:65, end:0, upper:[0,-75], lower:[0,85] },
  ankle: { title:'Plantarflexion', from:'Foot neutral', to:'Toes pointed', start:0, end:35, upper:[0,-85], lower:[90,0] },
  hip: { title:'Hip flexion', from:'Leg down', to:'Thigh raised', start:0, end:-75, upper:[0,-55], lower:[0,95] },
};
const MUSCLE_MOTION = {
  'deltoid-lateral':'raiseArm', supraspinatus:'raiseArm',
  'latissimus-dorsi':'lowerArm', 'teres-major':'lowerArm',
  'biceps-long':'elbow', 'biceps-short':'elbow', brachialis:'elbow', brachioradialis:'elbow',
  'rectus-femoris':'knee', 'vastus-medialis':'knee', 'vastus-lateralis':'knee', 'vastus-intermedius':'knee',
  'gastrocnemius-medial':'ankle', 'gastrocnemius-lateral':'ankle', soleus:'ankle', 'achilles-tendon':'ankle',
  iliacus:'hip', 'psoas-major':'hip',
};
export function createMovementController() {
  const pane=document.querySelector('#motion-pane');
  const button=document.querySelector('#motion-play');
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  function stop() {
    pane.dataset.playing='false';button.setAttribute('aria-pressed','false');
    button.textContent=preference.matches?'Show end position':'Play movement';
  }
  button.addEventListener('click',()=>{
    const active=pane.dataset.playing!=='true';pane.dataset.playing=String(active);button.setAttribute('aria-pressed',String(active));
    button.textContent=preference.matches?(active?'Show start position':'Show end position'):(active?'Stop movement':'Play movement');
  });
  preference.addEventListener('change',stop);
  return {
    stop,
    update(record) {
      stop();
      const demo=DEMOS[MUSCLE_MOTION[record.id]];
      pane.hidden=!demo;document.querySelector('#peek-motion').hidden=!demo;
      if(!demo){document.querySelector('#motion-drawing').replaceChildren();return;}
      document.querySelector('#motion-caption').textContent=demo.title;
      document.querySelector('#motion-poses').textContent=`${demo.from} → ${demo.to}`;
      const [ux,uy]=demo.upper,[lx,ly]=demo.lower;
      document.querySelector('#motion-drawing').innerHTML=`<svg viewBox="0 0 280 220" role="img" aria-label="Simplified ${demo.title.toLowerCase()} diagram">
        <g transform="translate(140 110)">
          <line class="motion-fixed" x1="${ux}" y1="${uy}" x2="0" y2="0"/>
          <g transform="rotate(${demo.end})"><line class="motion-ghost" x1="0" y1="0" x2="${lx}" y2="${ly}"/></g>
          <g class="motion-limb" style="--from-angle:${demo.start}deg;--to-angle:${demo.end}deg">
            <line class="motion-moving" x1="0" y1="0" x2="${lx}" y2="${ly}"/>
            <circle class="motion-tip" cx="${lx}" cy="${ly}" r="7"/>
          </g>
          <circle class="motion-joint" r="9"/>
        </g>
      </svg>`;
    },
    reveal() { pane.scrollIntoView({block:'nearest',behavior:preference.matches?'auto':'smooth'}); },
  };
}
