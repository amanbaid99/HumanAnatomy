// Study prompts follow the muscle descriptions already used by the atlas.
export const STUDIES = {
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
