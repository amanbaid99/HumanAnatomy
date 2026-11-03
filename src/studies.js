// Study prompts follow the muscle descriptions already used by the atlas.
export const STUDIES = {
  'chest-dissection': {
    title: 'Chest dissection', description: 'Peel the chest to reveal its deeper structures', dissection: true,
    groups: ['chest', 'shoulder', 'arm'], bones: /^(.*-rib|costal|sternum|clavicle|scapula|humerus)/,
    anchor: 'sternum', radius: .9,
    steps: [
      { muscle: 'pectoralis-major', layers: [1,2,3], angle: .55, peel: [], next: 'Peel pectoralis major →', hint: 'Pectoralis major is the broad superficial chest muscle. Peel it away on the right to expose pectoralis minor beneath it.' },
      { muscle: 'pectoralis-minor', layers: [1,2,3], angle: .55, peel: ['pectoralis-major'], next: 'Peel pectoralis minor →', hint: 'Pectoralis minor runs from ribs 3–5 to the coracoid process of the scapula. Unlike pectoralis major, it acts on the scapula rather than directly on the arm.' },
      { muscle: 'serratus-anterior', layers: [1,2,3], angle: 1.0, peel: ['pectoralis-major','pectoralis-minor'], hint: 'The chest wall is now exposed. Find the finger-like slips of serratus anterior along the ribs. It helps hold the scapula against the rib cage.' },
    ],
  },
  'hip-dissection': {
    title: 'Gluteal dissection', description: 'From gluteus maximus to gluteus minimus', dissection: true,
    groups: ['hip'], bones: /^(hip-bone|femur|sacrum|coccyx)/,
    anchor: 'hip-bone.r', radius: .98,
    steps: [
      { muscle: 'gluteus-maximus', layers: [1,2,3], angle: 2.5, peel: [], next: 'Peel gluteus maximus →', hint: 'Begin with gluteus maximus, the large superficial hip extensor. Peel it away on the right to inspect the muscles beneath it.' },
      { muscle: 'gluteus-medius', layers: [1,2,3], angle: 1.8, peel: ['gluteus-maximus'], next: 'Peel gluteus medius →', hint: 'Gluteus medius lies over gluteus minimus on the lateral pelvis. Both help abduct the hip and stabilise the pelvis while walking.' },
      { muscle: 'gluteus-minimus', layers: [1,2,3], angle: 1.5, peel: ['gluteus-maximus','gluteus-medius'], hint: 'Gluteus minimus is the deepest of these three gluteal muscles. Follow it from the outer ilium toward the greater trochanter of the femur.' },
    ],
  },
  shoulder: {
    title: 'Shoulder', description: 'From the deltoid to the rotator cuff',
    groups: ['shoulder'], bones: /^(scapula|clavicle|humerus)/,
    anchor: 'scapula.r', radius: .75,
    steps: [
      { muscle: 'deltoid-lateral', layers: [1, 2, 3], angle: .65, hint: 'Start with the outer shoulder. The deltoid helps raise the arm away from the body.' },
      { muscle: 'supraspinatus', layers: [3], angle: 2.42, hint: 'The outer layers are peeled away. Find supraspinatus above the spine of the scapula.' },
      { muscle: 'subscapularis', layers: [3], angle: .55, hint: 'Turn to the front of the scapula. Subscapularis is the anterior member of the rotator cuff.' },
    ],
  },
  knee: {
    title: 'Knee', description: 'Explore the muscles crossing the joint',
    groups: ['thigh', 'lowerleg'], bones: /^(femur|patella|tibia|fibula)/,
    anchor: 'patella.r', radius: .83,
    steps: [
      { muscle: 'rectus-femoris', layers: [1, 2, 3], angle: .35, hint: 'Follow the quadriceps toward the kneecap. Rectus femoris helps straighten the knee.' },
      { muscle: 'vastus-medialis', layers: [1, 2, 3], angle: -.6, hint: 'Find the inner part of the quadriceps just above the knee.' },
      { muscle: 'gastrocnemius-medial', layers: [1, 2, 3], angle: 2.7, hint: 'Look behind the knee. Gastrocnemius crosses both the knee and ankle.' },
    ],
  },
  hip: {
    title: 'Hip', description: 'Peel the gluteal layers, then look inside',
    groups: ['hip'], bones: /^(hip-bone|femur|sacrum|coccyx)/,
    anchor: 'hip-bone.r', radius: .98,
    steps: [
      { muscle: 'gluteus-maximus', layers: [1, 2, 3], angle: 2.5, hint: 'Begin at the back of the hip. Gluteus maximus is the outer gluteal layer.' },
      { muscle: 'gluteus-medius', layers: [2, 3], angle: 1.5, hint: 'Peel the outer layer to reveal gluteus medius on the side of the pelvis.' },
      { muscle: 'iliacus', layers: [3], angle: .35, hint: 'Look inside the pelvis. Iliacus joins psoas to help flex the hip.' },
    ],
  },
  spine: {
    title: 'Spine', description: 'Trace the deep muscles around the back',
    groups: ['back'], bones: /^(vertebra|sacrum|.*-rib)/,
    anchor: 'vertebra-l3', radius: 1.12, bothSides: true,
    steps: [
      { muscle: 'erector-spinae', layers: [3], angle: Math.PI, hint: 'Follow the long columns of erector spinae alongside the vertebral column.' },
      { muscle: 'multifidus', layers: [3], angle: 2.8, hint: 'Look closer to the vertebrae. Multifidus spans short sections of the spine.' },
      { muscle: 'quadratus-lumborum', layers: [3], angle: 2.2, hint: 'Move to the side of the lumbar spine, between the pelvis and the lowest rib.' },
    ],
  },
};
