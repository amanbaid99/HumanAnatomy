/**
 * Muscle definitions.
 *
 * Every muscle is either a `tube` (a cross-section swept along a curved
 * centerline) or a `sheet` (a fan between a broad origin and a narrow
 * insertion). Attachments are written against the shared landmark table so a
 * muscle lands on the bone it actually comes from.
 *
 * layer 1 = superficial, what you would see first on a dissection
 * layer 2 = intermediate, exposed once layer 1 is reflected
 * layer 3 = deep, against bone
 *
 * Coordinates describe the figure's right side; `mirror: true` produces the left.
 *
 * Accuracy note: these are careful anatomical approximations built from
 * standard attachment descriptions and proportional landmarks. They are not
 * derived from medical imaging. Good enough to learn the relationships and the
 * layering; not a substitute for an atlas or a clinician.
 */

import { Y, X, Z, P } from './landmarks.js';
import { FUSIFORM, STRAP, TAPERED } from '../geometry/loft.js';

/** Tendon-heavy profile: short belly, long tapering tendon at the insertion. */
const TENDINOUS = [[0, 0.45], [0.22, 1.0], [0.52, 0.95], [0.80, 0.48], [1, 0.30]];
/** Two-headed / bulging belly, e.g. the calf. */
const BULGING = [[0, 0.55], [0.18, 1.0], [0.42, 1.0], [0.75, 0.62], [1, 0.22]];

export const MUSCLES = [

  // ===================== NECK =====================
  {
    id: 'sternocleidomastoid', name: 'Sternocleidomastoid', region: 'Neck',
    group: 'neck', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.020, 1.466, 0.078], [0.038, 1.498, 0.062],
      [0.054, 1.532, 0.030], [0.062, 1.564, -0.002], [0.062, 1.602, -0.016],
    ],
    width: 0.0295, flat: 0.68, profile: [[0, 0.55], [0.3, 1.0], [0.7, 0.95], [1, 0.5]],
    fn: 'Tilts the head toward the same side and turns the face to the opposite side. Both together flex the neck forward.',
    or: 'Manubrium of the sternum and the medial third of the clavicle',
    ins: 'Mastoid process of the temporal bone, just behind the ear',
    nerve: 'Accessory nerve (CN XI)',
  },
  {
    id: 'scalenes', name: 'Scalenes', region: 'Neck',
    group: 'neck', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.030, 1.557, 0.006], [0.042, 1.524, 0.010], [0.052, 1.492, 0.020],
    ],
    width: 0.0175, flat: 0.8, profile: STRAP,
    fn: 'Elevate the first two ribs during forceful breathing and side-bend the neck.',
    or: 'Transverse processes of the cervical vertebrae',
    ins: 'First and second ribs',
    nerve: 'Cervical spinal nerves (C3-C8)',
    clinical: 'The brachial plexus and subclavian artery pass between the anterior and middle scalene. Tightness here can produce thoracic outlet symptoms that mimic a shoulder problem.',
  },
  {
    id: 'levator-scapulae', name: 'Levator scapulae', region: 'Neck',
    group: 'neck', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.028, 1.564, -0.026], [0.036, 1.532, -0.044],
      [0.042, 1.498, -0.062], [0.042, 1.462, -0.074],
    ],
    width: 0.0162, flat: 0.75, profile: STRAP,
    fn: 'Lifts the shoulder blade and helps tilt the neck. Chronically overworked in desk posture.',
    or: 'Transverse processes of vertebrae C1 to C4',
    ins: 'Superior angle of the scapula',
    nerve: 'Dorsal scapular nerve (C5) and cervical nerves C3-C4',
  },
  {
    id: 'splenius-capitis', name: 'Splenius capitis', region: 'Neck',
    group: 'neck', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.014, 1.470, -0.060], [0.034, 1.521, -0.058], [0.052, 1.569, -0.040],
    ],
    width: 0.0189, flat: 0.55, profile: STRAP,
    fn: 'Extends and rotates the head to the same side.',
    or: 'Spinous processes of C7 to T3 and the nuchal ligament',
    ins: 'Mastoid process and the occipital bone',
    nerve: 'Posterior rami of the cervical spinal nerves',
  },

  {
    id: 'semispinalis-capitis', name: 'Semispinalis capitis', region: 'Neck',
    group: 'neck', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.024, 1.470, -0.062], [0.026, 1.514, -0.062],
      [0.026, 1.557, -0.052], [0.024, 1.611, -0.034],
    ],
    width: 0.023, flat: 0.72, profile: [[0, 0.7], [0.35, 1.0], [0.75, 0.95], [1, 0.62]],
    fn: 'The main extensor of the head: holds the skull up against gravity all day. Most of the bulk at the back of the neck is this muscle.',
    or: 'Transverse processes of C7 to T6',
    ins: 'Between the nuchal lines of the occipital bone',
    nerve: 'Posterior rami of the cervical spinal nerves',
  },
  {
    id: 'longus-colli', name: 'Longus colli', region: 'Neck',
    group: 'neck', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.014, 1.470, -0.006], [0.016, 1.514, 0.000], [0.016, 1.554, -0.002],
    ],
    width: 0.012, flat: 0.8, profile: STRAP,
    fn: 'Flexes the neck forward and steadies the cervical spine from the front.',
    or: 'Bodies of the upper thoracic and lower cervical vertebrae',
    ins: 'Anterior arch of the atlas and the upper cervical vertebrae',
    nerve: 'Anterior rami of the cervical spinal nerves (C2-C6)',
  },

  // ============ SHOULDER: ROTATOR CUFF ============
  // The four cuff muscles hold the humeral head into a shallow socket. They sit
  // under the deltoid and trapezius, which is why they are layer 3 and why you
  // have to peel to see them.
  {
    id: 'supraspinatus', name: 'Supraspinatus', region: 'Rotator cuff',
    group: 'shoulder', layer: 3, mirror: true, shape: 'tube',
    // The belly lies in the supraspinous fossa: the trough on the back of the
    // blade above the scapular spine, not across the blade itself. It is a
    // shallow trough, so the muscle is wider front-to-back than it is tall.
    // The tendon then runs out over the humeral head into the subacromial gap.
    path: [
      [0.048, 1.441, -0.086], [0.078, 1.447, -0.083], [0.112, 1.455, -0.068],
      [0.148, 1.462, -0.040], [0.174, 1.462, -0.022], [0.188, 1.456, -0.016],
    ],
    width: 0.0135, flat: 0.80, squareness: 2.8,
    profile: [[0, 0.48], [0.22, 1.0], [0.52, 0.96], [0.80, 0.50], [1, 0.32]],
    fn: 'Starts the first 15 degrees of lifting the arm out to the side, then assists the deltoid through the rest of the range. Presses the humeral head into the socket so the deltoid has something to pull against.',
    or: 'Supraspinous fossa: the shallow trough above the spine of the scapula',
    ins: 'Superior facet of the greater tubercle of the humerus',
    nerve: 'Suprascapular nerve (C5-C6)',
    clinical: 'The tendon passes through a narrow gap between the humeral head and the acromion above it. That gap is where it gets compressed, and the last centimetre or two before the insertion is poorly supplied with blood. Together that makes this the most commonly torn tendon in the rotator cuff.',
  },
  {
    id: 'infraspinatus', name: 'Infraspinatus', region: 'Rotator cuff',
    group: 'shoulder', layer: 3, mirror: true, shape: 'sheet',
    // The origin traces the rim of the infraspinous fossa rather than just the
    // medial border, so the fan lies on the back of the blade instead of
    // cutting across it: down the medial border, round the inferior angle and
    // back up the lateral border. The fibres then converge on the tubercle,
    // crossing the back of the humeral head rather than passing through it.
    origin: [
      [0.046, 1.392, -0.084], [0.058, 1.330, -0.084], [0.088, 1.276, -0.081],
      [0.124, 1.306, -0.084], [0.146, 1.372, -0.083],
    ],
    insertion: [
      [0.172, 1.446, -0.048], [0.184, 1.434, -0.038], [0.182, 1.422, -0.028],
    ],
    thickness: 0.0190, bulge: 0.026, taper: [[0, 1], [0.55, 0.82], [1, 0.34]],
    uSeg: 24, vSeg: 16,
    fn: 'The main external rotator of the shoulder: turns the arm outward, as in the wind-up before throwing.',
    or: 'Infraspinous fossa, the broad hollow below the spine of the scapula',
    ins: 'Middle facet of the greater tubercle of the humerus',
    nerve: 'Suprascapular nerve (C5-C6)',
    clinical: 'The second most commonly torn cuff muscle. Tears here often extend backward from a supraspinatus tear rather than starting on their own.',
  },
  {
    id: 'teres-minor', name: 'Teres minor', region: 'Rotator cuff',
    group: 'shoulder', layer: 3, mirror: true, shape: 'tube',
    // It arises from the lateral border, so it runs alongside the edge of the
    // blade rather than across its back. Following the border keeps it out of
    // the plate on the way to the inferior facet.
    path: [
      [0.120, 1.294, -0.075], [0.145, 1.330, -0.077], [0.163, 1.367, -0.068],
      [0.180, 1.404, -0.046], [0.189, 1.425, -0.030],
    ],
    width: 0.0145, flat: 0.76, profile: TENDINOUS,
    fn: 'Externally rotates the shoulder alongside infraspinatus, and helps hold the humeral head down in the socket.',
    or: 'Upper two thirds of the lateral border of the scapula',
    ins: 'Inferior facet of the greater tubercle of the humerus',
    nerve: 'Axillary nerve (C5-C6)',
  },
  {
    id: 'subscapularis', name: 'Subscapularis', region: 'Rotator cuff',
    group: 'shoulder', layer: 3, mirror: true, shape: 'sheet',
    // The only cuff muscle on the front of the blade, so its origin sits clear
    // of the costal surface rather than on it, and the fan passes in front of
    // the glenoid on its way to the lesser tubercle.
    origin: [
      [0.048, 1.428, -0.044], [0.060, 1.358, -0.045], [0.084, 1.284, -0.042],
    ],
    insertion: [
      [0.162, 1.452, -0.002], [0.172, 1.443, 0.006], [0.168, 1.430, 0.012],
    ],
    thickness: 0.0210, bulge: 0.0185, outward: [0.35, 0, 1],
    taper: [[0, 1], [0.55, 0.80], [1, 0.32]], uSeg: 24, vSeg: 16,
    fn: 'The only cuff muscle on the front of the shoulder blade. Internally rotates the arm and is the main block against the humeral head sliding forward.',
    or: 'Subscapular fossa, the front surface of the scapula facing the ribs',
    ins: 'Lesser tubercle of the humerus',
    nerve: 'Upper and lower subscapular nerves (C5-C6)',
  },

  // ============ SHOULDER: THE REST ============
  {
    id: 'deltoid-anterior', name: 'Deltoid, anterior head', region: 'Shoulder',
    group: 'shoulder', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.106, 1.464, 0.038], [0.144, 1.470, 0.026], [0.178, 1.470, 0.008],
    ],
    insertion: [
      [0.196, 1.288, 0.020], [0.203, 1.277, 0.015], [0.205, 1.266, 0.010],
    ],
    thickness: 0.0305, bulge: 0.0318, taper: [[0, 1], [0.55, 0.66], [1, 0.22]],
    uSeg: 20, vSeg: 18,
    fn: 'Flexes the shoulder, raising the arm forward, and assists internal rotation.',
    or: 'Lateral third of the clavicle',
    ins: 'Deltoid tuberosity, on the outer shaft of the humerus',
    nerve: 'Axillary nerve (C5-C6)',
  },
  {
    id: 'deltoid-lateral', name: 'Deltoid, lateral head', region: 'Shoulder',
    group: 'shoulder', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.178, 1.472, 0.008], [0.198, 1.473, -0.012], [0.190, 1.468, -0.032],
    ],
    insertion: [
      [0.205, 1.286, 0.010], [0.211, 1.275, 0.005], [0.208, 1.264, 0.000],
    ],
    thickness: 0.0333, bulge: 0.0371, taper: [[0, 1], [0.55, 0.66], [1, 0.22]],
    uSeg: 20, vSeg: 18,
    fn: 'The main abductor of the shoulder: lifts the arm out to the side once supraspinatus has started the movement. Gives the shoulder its rounded cap.',
    or: 'Acromion process of the scapula',
    ins: 'Deltoid tuberosity of the humerus',
    nerve: 'Axillary nerve (C5-C6)',
    clinical: 'When the supraspinatus is torn, the deltoid can still raise the arm but often only after a shrug or a swing to get it started. That painful arc between roughly 60 and 120 degrees is the classic sign.',
  },
  {
    id: 'deltoid-posterior', name: 'Deltoid, posterior head', region: 'Shoulder',
    group: 'shoulder', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.186, 1.466, -0.036], [0.148, 1.440, -0.058], [0.104, 1.404, -0.072],
    ],
    insertion: [
      [0.203, 1.286, -0.004], [0.207, 1.275, -0.001], [0.204, 1.264, 0.003],
    ],
    thickness: 0.029, bulge: 0.0305, taper: [[0, 1], [0.55, 0.62], [1, 0.20]],
    uSeg: 20, vSeg: 18,
    fn: 'Extends the shoulder, pulling the arm backward, and assists external rotation.',
    or: 'Spine of the scapula',
    ins: 'Deltoid tuberosity of the humerus',
    nerve: 'Axillary nerve (C5-C6)',
  },
  {
    id: 'teres-major', name: 'Teres major', region: 'Shoulder',
    group: 'shoulder', layer: 2, mirror: true, shape: 'tube',
    // From the back of the inferior angle, then out along the lateral border
    // to the humerus. Hugging the border keeps the belly behind the blade and
    // out of the rib wall instead of running across the back of the chest.
    path: [
      [0.094, 1.250, -0.078], [0.136, 1.274, -0.062],
      [0.163, 1.304, -0.026], [0.173, 1.340, 0.002],
    ],
    width: 0.0230, flat: 0.60, profile: FUSIFORM,
    fn: 'Extends, adducts and internally rotates the arm. Works with latissimus dorsi, which is why it is nicknamed the lat’s little helper.',
    or: 'Inferior angle of the scapula',
    ins: 'Medial lip of the intertubercular groove of the humerus',
    nerve: 'Lower subscapular nerve (C5-C6)',
  },
  {
    id: 'coracobrachialis', name: 'Coracobrachialis', region: 'Shoulder',
    group: 'shoulder', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.110, 1.444, 0.026], [0.140, 1.390, 0.020], [0.164, 1.322, 0.014],
    ],
    width: 0.0152, flat: 0.85, profile: FUSIFORM,
    fn: 'Flexes and adducts the shoulder. A small deep stabiliser in the armpit.',
    or: 'Coracoid process of the scapula',
    ins: 'Middle of the medial surface of the humerus',
    nerve: 'Musculocutaneous nerve (C5-C7)',
  },

  // ===================== CHEST =====================
  {
    id: 'pectoralis-major', name: 'Pectoralis major', region: 'Chest',
    group: 'chest', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.005, 1.452, 0.086], [0.004, 1.390, 0.102],
      [0.006, 1.320, 0.100], [0.024, 1.248, 0.092],
    ],
    insertion: [
      [0.158, 1.386, 0.030], [0.164, 1.372, 0.026],
      [0.166, 1.358, 0.024], [0.160, 1.344, 0.026],
    ],
    thickness: 0.031, bulge: 0.046, taper: [[0, 1], [0.6, 0.66], [1, 0.20]],
    uSeg: 24, vSeg: 18,
    fn: 'Brings the arm forward and across the body, and internally rotates it. The main pushing muscle: bench press, push-up, throwing.',
    or: 'Medial clavicle, the sternum, and the cartilage of the upper six ribs',
    ins: 'Lateral lip of the intertubercular groove of the humerus',
    nerve: 'Lateral and medial pectoral nerves (C5-T1)',
  },
  {
    id: 'pectoralis-minor', name: 'Pectoralis minor', region: 'Chest',
    group: 'chest', layer: 3, mirror: true, shape: 'sheet',
    origin: [
      [0.062, 1.318, 0.084], [0.074, 1.348, 0.082], [0.084, 1.378, 0.076],
    ],
    insertion: [
      [0.102, 1.436, 0.032], [0.106, 1.442, 0.030], [0.104, 1.448, 0.028],
    ],
    thickness: 0.0143, bulge: 0.0122, taper: [[0, 1], [0.6, 0.6], [1, 0.28]],
    uSeg: 14, vSeg: 14,
    fn: 'Pulls the shoulder blade forward and down against the ribs, and helps lift the ribs in forced breathing.',
    or: 'Third to fifth ribs, near their cartilage',
    ins: 'Coracoid process of the scapula',
    nerve: 'Medial pectoral nerve (C8-T1)',
    clinical: 'A tight pec minor tips the shoulder blade forward, narrowing the space the supraspinatus tendon runs through. It is a common contributor to impingement.',
  },
  {
    id: 'serratus-anterior', name: 'Serratus anterior', region: 'Chest wall',
    group: 'chest', layer: 2, mirror: true, shape: 'sheet',
    origin: [
      [0.104, 1.396, 0.052], [0.128, 1.336, 0.058],
      [0.136, 1.276, 0.052], [0.128, 1.226, 0.036],
    ],
    insertion: [
      [0.044, 1.444, -0.070], [0.046, 1.376, -0.076],
      [0.056, 1.310, -0.076], [0.076, 1.252, -0.070],
    ],
    thickness: 0.016, bulge: 0.013, uSeg: 22, vSeg: 16,
    fn: 'Pulls the shoulder blade forward around the ribcage and holds it flat against the chest wall. Rotates the socket upward so you can raise your arm overhead.',
    or: 'Outer surfaces of the upper eight or nine ribs, as a row of finger-like slips',
    ins: 'Medial border of the scapula, on its rib-facing surface',
    nerve: 'Long thoracic nerve (C5-C7)',
    clinical: 'If the long thoracic nerve is injured the scapula lifts off the ribcage, a winged scapula, and raising the arm overhead becomes difficult.',
  },

  // ===================== BACK =====================
  {
    id: 'trapezius-upper', name: 'Trapezius, upper fibres', region: 'Back',
    group: 'back', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.018, 1.606, -0.046], [0.012, 1.548, -0.066], [0.009, 1.498, -0.074],
    ],
    insertion: [
      [0.104, 1.473, -0.012], [0.148, 1.475, -0.010], [0.184, 1.472, -0.014],
    ],
    thickness: 0.017, bulge: 0.03, uSeg: 20, vSeg: 16,
    fn: 'Lifts the shoulder blade, as in a shrug, and helps rotate the socket upward when you reach overhead.',
    or: 'Occipital bone and the nuchal ligament',
    ins: 'Lateral third of the clavicle and the acromion',
    nerve: 'Accessory nerve (CN XI)',
  },
  {
    id: 'trapezius-middle', name: 'Trapezius, middle fibres', region: 'Back',
    group: 'back', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.008, 1.492, -0.074], [0.009, 1.452, -0.076], [0.010, 1.404, -0.074],
    ],
    insertion: [
      [0.076, 1.436, -0.062], [0.128, 1.418, -0.050], [0.170, 1.446, -0.032],
    ],
    thickness: 0.017, bulge: 0.024, uSeg: 20, vSeg: 14,
    fn: 'Pulls the shoulder blades straight back toward the spine.',
    or: 'Spinous processes of the upper thoracic vertebrae',
    ins: 'Acromion and the spine of the scapula',
    nerve: 'Accessory nerve (CN XI)',
  },
  {
    id: 'trapezius-lower', name: 'Trapezius, lower fibres', region: 'Back',
    group: 'back', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.010, 1.392, -0.074], [0.011, 1.286, -0.070], [0.012, 1.184, -0.062],
    ],
    insertion: [
      [0.050, 1.400, -0.068], [0.062, 1.398, -0.066], [0.074, 1.396, -0.062],
    ],
    thickness: 0.0156, bulge: 0.017, taper: [[0, 1], [0.6, 0.7], [1, 0.4]],
    uSeg: 20, vSeg: 16,
    fn: 'Pulls the shoulder blade down and, working with the upper fibres, rotates the socket upward for overhead reaching.',
    or: 'Spinous processes of the lower thoracic vertebrae',
    ins: 'Medial end of the spine of the scapula',
    nerve: 'Accessory nerve (CN XI)',
    clinical: 'Weak lower trapezius plus a tight upper trapezius is a common pattern behind shoulder impingement: the blade shrugs instead of rotating, and the space under the acromion closes down.',
  },
  {
    id: 'latissimus-dorsi', name: 'Latissimus dorsi', region: 'Back',
    group: 'back', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.010, 1.240, -0.066], [0.011, 1.130, -0.064],
      [0.022, 1.040, -0.056], [0.088, 1.020, -0.038],
    ],
    insertion: [
      [0.150, 1.372, -0.006], [0.156, 1.360, 0.004],
      [0.154, 1.350, 0.010], [0.146, 1.342, 0.008],
    ],
    thickness: 0.021, bulge: 0.048, taper: [[0, 1], [0.62, 0.52], [1, 0.14]],
    uSeg: 26, vSeg: 20,
    fn: 'Pulls the arm down and backward and rotates it inward. The prime mover of a pull-up, and the reason a swimmer’s back is wide.',
    or: 'Spinous processes of the lower six thoracic vertebrae, the thoracolumbar fascia, the iliac crest and the lower ribs',
    ins: 'Floor of the intertubercular groove of the humerus',
    nerve: 'Thoracodorsal nerve (C6-C8)',
  },
  {
    id: 'rhomboid-major', name: 'Rhomboid major', region: 'Back',
    group: 'back', layer: 2, mirror: true, shape: 'sheet',
    origin: [
      [0.012, 1.400, -0.070], [0.014, 1.352, -0.068], [0.016, 1.306, -0.064],
    ],
    insertion: [
      [0.044, 1.372, -0.076], [0.050, 1.322, -0.076], [0.058, 1.272, -0.072],
    ],
    thickness: 0.013, bulge: 0.0073, uSeg: 14, vSeg: 12,
    fn: 'Pulls the shoulder blade toward the spine and rotates the socket downward.',
    or: 'Spinous processes of T2 to T5',
    ins: 'Medial border of the scapula, below the spine',
    nerve: 'Dorsal scapular nerve (C5)',
  },
  {
    id: 'rhomboid-minor', name: 'Rhomboid minor', region: 'Back',
    group: 'back', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.014, 1.462, -0.070], [0.028, 1.456, -0.074], [0.042, 1.448, -0.074],
    ],
    width: 0.0143, flat: 0.42, squareness: 3.0, profile: STRAP,
    fn: 'Retracts the shoulder blade, working with rhomboid major just above it.',
    or: 'Spinous processes of C7 and T1',
    ins: 'Medial border of the scapula at the root of the spine',
    nerve: 'Dorsal scapular nerve (C5)',
  },
  {
    id: 'erector-spinae', name: 'Erector spinae', region: 'Back',
    group: 'back', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.028, 1.478, -0.058], [0.032, 1.380, -0.062],
      [0.036, 1.260, -0.062], [0.038, 1.140, -0.052], [0.036, 1.020, -0.042],
    ],
    // A broad column filling the gutter either side of the spine, wider across
    // the back than it is deep.
    width: 0.0299, flat: 0.60, squareness: 2.8,
    profile: [[0, 0.55], [0.25, 0.85], [0.7, 1.0], [1, 0.8]],
    fn: 'The column of muscle either side of the spine that holds you upright and straightens the back from a bend.',
    or: 'Sacrum, iliac crest and the lumbar spinous processes',
    ins: 'Ribs, transverse processes all the way up, and the skull',
    nerve: 'Posterior rami of the spinal nerves',
  },
  {
    id: 'quadratus-lumborum', name: 'Quadratus lumborum', region: 'Back',
    group: 'back', layer: 3, mirror: true, shape: 'sheet',
    origin: [
      [0.030, 1.026, -0.030], [0.062, 1.030, -0.024], [0.088, 1.032, -0.014],
    ],
    insertion: [
      [0.026, 1.166, -0.026], [0.052, 1.170, -0.022], [0.072, 1.172, -0.016],
    ],
    thickness: 0.0182, bulge: 0.0049, uSeg: 12, vSeg: 12,
    fn: 'Hikes the hip up and side-bends the trunk. Also steadies the twelfth rib while you breathe.',
    or: 'Iliac crest and the iliolumbar ligament',
    ins: 'Twelfth rib and the transverse processes of the lumbar vertebrae',
    nerve: 'Subcostal nerve and lumbar plexus (T12-L4)',
  },

  // ===================== UPPER ARM =====================
  {
    id: 'biceps-long', name: 'Biceps brachii, long head', region: 'Upper arm',
    group: 'arm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.157, 1.452, -0.014], [0.169, 1.434, 0.012], [0.178, 1.398, 0.030],
      [0.188, 1.318, 0.044], [0.195, 1.222, 0.046], [0.198, 1.140, 0.034],
      [0.199, 1.100, 0.028],
    ],
    // The belly is an oval lying on the brachialis, wider across the arm than
    // it is deep, not the round cord it was.
    width: 0.0352, flat: 0.74, squareness: 2.6,
    profile: [[0, 0.26], [0.14, 0.30], [0.36, 0.95], [0.62, 1.0], [0.86, 0.48], [1, 0.24]],
    fn: 'Bends the elbow and turns the palm upward. The long head also helps hold the humeral head down in the socket.',
    or: 'Supraglenoid tubercle, just above the socket of the scapula',
    ins: 'Radial tuberosity of the radius, and the forearm fascia',
    nerve: 'Musculocutaneous nerve (C5-C6)',
    clinical: 'This tendon runs over the top of the humeral head and down a bony groove on the front of the arm. It is a frequent source of front-of-shoulder pain and often inflamed alongside a rotator cuff tear.',
  },
  {
    id: 'biceps-short', name: 'Biceps brachii, short head', region: 'Upper arm',
    group: 'arm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.110, 1.444, 0.028], [0.148, 1.380, 0.049], [0.178, 1.300, 0.058],
      [0.194, 1.202, 0.051], [0.198, 1.122, 0.030],
    ],
    // Lies medial to the long head, and its belly sits a little lower, so the
    // swell peaks past the midpoint rather than at it. The belly also stands a
    // few mm further in front of the humerus, which is where it really lies.
    width: 0.0333, flat: 0.76, squareness: 2.6,
    profile: [[0, 0.34], [0.24, 0.86], [0.52, 1.0], [0.82, 0.62], [1, 0.26]],
    fn: 'Bends the elbow and supinates the forearm, alongside the long head.',
    or: 'Coracoid process of the scapula',
    ins: 'Radial tuberosity of the radius',
    nerve: 'Musculocutaneous nerve (C5-C6)',
  },
  {
    id: 'brachialis', name: 'Brachialis', region: 'Upper arm',
    group: 'arm', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.184, 1.294, 0.016], [0.191, 1.222, 0.026], [0.196, 1.160, 0.026],
      [0.192, 1.106, 0.018],
    ],
    width: 0.0333, flat: 0.78, profile: FUSIFORM,
    fn: 'The workhorse flexor of the elbow. It pulls on the ulna, so unlike the biceps it works just as hard whichever way the palm faces.',
    or: 'Lower half of the front of the humerus',
    ins: 'Coronoid process and tuberosity of the ulna',
    nerve: 'Musculocutaneous nerve (C5-C6)',
  },
  {
    id: 'triceps-long', name: 'Triceps brachii, long head', region: 'Upper arm',
    group: 'arm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.147, 1.400, -0.046], [0.166, 1.340, -0.050], [0.180, 1.258, -0.048],
      [0.190, 1.180, -0.038], [0.194, 1.132, -0.026],
    ],
    // Flattened against the back of the humerus. The common tendon it ends in
    // is a broad flat aponeurosis, so it stays wide rather than drawing to a
    // point the way a cord-like tendon would.
    width: 0.037, flat: 0.72, squareness: 2.7,
    profile: [[0, 0.46], [0.22, 0.95], [0.5, 1.0], [0.8, 0.66], [1, 0.42]],
    fn: 'Straightens the elbow, and because it crosses the shoulder it also helps pull the arm backward and inward.',
    or: 'Infraglenoid tubercle, just below the socket of the scapula',
    ins: 'Olecranon process of the ulna, the point of the elbow',
    nerve: 'Radial nerve (C6-C8)',
  },
  {
    id: 'triceps-lateral', name: 'Triceps brachii, lateral head', region: 'Upper arm',
    group: 'arm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.190, 1.352, -0.028], [0.198, 1.316, -0.034], [0.201, 1.280, -0.036],
      [0.201, 1.198, -0.036], [0.196, 1.136, -0.026],
    ],
    // A flat sheet of muscle wrapped round the outside of the humerus, so it
    // is much wider than it is deep. The extra control point describes that
    // wrap instead of cutting the corner.
    width: 0.0315, flat: 0.64, squareness: 2.8,
    profile: [[0, 0.52], [0.24, 0.96], [0.52, 1.0], [0.82, 0.64], [1, 0.40]],
    fn: 'Straightens the elbow. The head that gives the back of the arm its outer ridge.',
    or: 'Upper posterior surface of the humerus, above the radial groove',
    ins: 'Olecranon process of the ulna',
    nerve: 'Radial nerve (C6-C8)',
  },
  {
    id: 'triceps-medial', name: 'Triceps brachii, medial head', region: 'Upper arm',
    group: 'arm', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.176, 1.262, -0.022], [0.184, 1.192, -0.028], [0.190, 1.136, -0.024],
    ],
    width: 0.0259, flat: 0.82, profile: FUSIFORM,
    fn: 'Straightens the elbow. Lies underneath the other two heads and does most of the work in light, everyday extension.',
    or: 'Lower posterior surface of the humerus, below the radial groove',
    ins: 'Olecranon process of the ulna',
    nerve: 'Radial nerve (C6-C8)',
  },
  {
    id: 'anconeus', name: 'Anconeus', region: 'Upper arm',
    group: 'arm', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.206, 1.124, -0.020], [0.202, 1.100, -0.014], [0.196, 1.082, -0.012],
    ],
    width: 0.012, flat: 0.6, profile: STRAP,
    fn: 'Assists the triceps in straightening the elbow and steadies the joint during forearm rotation.',
    or: 'Lateral epicondyle of the humerus',
    ins: 'Olecranon and upper posterior ulna',
    nerve: 'Radial nerve (C7-C8)',
  },

  // ===================== FOREARM =====================
  {
    id: 'brachioradialis', name: 'Brachioradialis', region: 'Forearm',
    group: 'forearm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.204, 1.182, 0.004], [0.223, 1.100, 0.027], [0.224, 1.000, 0.036],
      [0.210, 0.912, 0.033], [0.198, 0.878, 0.030],
    ],
    // The flat strap that makes the outer border of the forearm. Reading it as
    // a round cord was what made the forearm look like a bundle of ropes.
    // Flattening it also widens it, so the belly rides a few mm further out on
    // the radius, where it actually sits, rather than into the bone.
    width: 0.0264, flat: 0.58, squareness: 2.7,
    profile: [[0, 0.4], [0.2, 0.95], [0.44, 1.0], [0.78, 0.42], [1, 0.24]],
    fn: 'Bends the elbow, and is strongest with the thumb pointing up, as when carrying a briefcase.',
    or: 'Lateral supracondylar ridge of the humerus',
    ins: 'Styloid process of the radius, at the wrist',
    nerve: 'Radial nerve (C5-C6)',
  },
  {
    id: 'pronator-teres', name: 'Pronator teres', region: 'Forearm',
    group: 'forearm', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.176, 1.126, 0.010], [0.190, 1.086, 0.024], [0.206, 1.046, 0.028],
    ],
    width: 0.0186, flat: 0.8, profile: FUSIFORM,
    fn: 'Rotates the forearm to turn the palm downward.',
    or: 'Medial epicondyle of the humerus and the coronoid process of the ulna',
    ins: 'Middle of the lateral surface of the radius',
    nerve: 'Median nerve (C6-C7)',
  },
  {
    id: 'flexor-carpi-radialis', name: 'Flexor carpi radialis', region: 'Forearm',
    group: 'forearm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.178, 1.120, 0.014], [0.190, 1.030, 0.038], [0.196, 0.930, 0.042],
      [0.194, 0.876, 0.038],
    ],
    width: 0.017, flat: 0.8, profile: TENDINOUS,
    fn: 'Bends the wrist and angles the hand toward the thumb side.',
    or: 'Medial epicondyle of the humerus, via the common flexor tendon',
    ins: 'Bases of the second and third metacarpals',
    nerve: 'Median nerve (C6-C7)',
  },
  {
    id: 'palmaris-longus', name: 'Palmaris longus', region: 'Forearm',
    group: 'forearm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.176, 1.118, 0.016], [0.186, 1.020, 0.042], [0.190, 0.920, 0.046],
      [0.190, 0.874, 0.042],
    ],
    width: 0.0092, flat: 0.8, profile: [[0, 0.6], [0.22, 1.0], [0.5, 0.7], [1, 0.22]],
    fn: 'Weakly bends the wrist and tightens the fascia of the palm.',
    or: 'Medial epicondyle of the humerus',
    ins: 'Palmar aponeurosis of the hand',
    nerve: 'Median nerve (C7-C8)',
    clinical: 'Missing in roughly one person in seven, on one or both sides, with no loss of function. Its tendon is a favourite donor for surgical grafts, including rotator cuff and ligament repairs.',
  },
  {
    id: 'flexor-carpi-ulnaris', name: 'Flexor carpi ulnaris', region: 'Forearm',
    group: 'forearm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.174, 1.120, 0.008], [0.178, 1.030, 0.030], [0.182, 0.930, 0.036],
      [0.184, 0.874, 0.034],
    ],
    width: 0.0186, flat: 0.8, profile: TENDINOUS,
    fn: 'Bends the wrist and angles the hand toward the little-finger side.',
    or: 'Medial epicondyle of the humerus and the upper ulna',
    ins: 'Pisiform, hamate and the fifth metacarpal',
    nerve: 'Ulnar nerve (C7-T1)',
  },
  {
    id: 'flexor-digitorum-superficialis', name: 'Flexor digitorum superficialis', region: 'Forearm',
    group: 'forearm', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.180, 1.102, 0.014], [0.190, 1.010, 0.034], [0.194, 0.920, 0.038],
      [0.192, 0.876, 0.036],
    ],
    width: 0.0232, flat: 0.8, profile: TENDINOUS,
    fn: 'Curls the middle joints of the fingers, closing the hand.',
    or: 'Medial epicondyle, the ulna and the radius',
    ins: 'Middle phalanges of the four fingers',
    nerve: 'Median nerve (C7-T1)',
  },
  {
    id: 'extensor-carpi-radialis', name: 'Extensor carpi radialis', region: 'Forearm',
    group: 'forearm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.206, 1.150, -0.004], [0.215, 1.070, 0.006], [0.212, 0.970, 0.012],
      [0.202, 0.884, 0.014],
    ],
    width: 0.0186, flat: 0.8, profile: TENDINOUS,
    fn: 'Straightens the wrist and angles the hand toward the thumb side. Steadies the wrist whenever you grip.',
    or: 'Lateral supracondylar ridge and lateral epicondyle of the humerus',
    ins: 'Bases of the second and third metacarpals',
    nerve: 'Radial nerve (C6-C7)',
    clinical: 'Overuse at the common extensor origin on the lateral epicondyle is what tennis elbow actually is.',
  },
  {
    id: 'extensor-digitorum', name: 'Extensor digitorum', region: 'Forearm',
    group: 'forearm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.208, 1.124, -0.012], [0.212, 1.040, -0.008], [0.208, 0.950, -0.002],
      [0.200, 0.880, 0.004],
    ],
    // A broad flat sheet that splits into four tendons, so it is wide and
    // shallow rather than round.
    width: 0.0217, flat: 0.58, squareness: 2.7, profile: TENDINOUS,
    fn: 'Straightens the fingers, opening the hand.',
    or: 'Lateral epicondyle of the humerus, via the common extensor tendon',
    ins: 'Extensor hoods of the four fingers',
    nerve: 'Posterior interosseous nerve (C7-C8)',
  },
  {
    id: 'extensor-carpi-ulnaris', name: 'Extensor carpi ulnaris', region: 'Forearm',
    group: 'forearm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.204, 1.122, -0.018], [0.198, 1.040, -0.020], [0.192, 0.950, -0.014],
      [0.186, 0.880, -0.008],
    ],
    width: 0.017, flat: 0.8, profile: TENDINOUS,
    fn: 'Straightens the wrist and angles the hand toward the little-finger side.',
    or: 'Lateral epicondyle of the humerus and the posterior ulna',
    ins: 'Base of the fifth metacarpal',
    nerve: 'Posterior interosseous nerve (C7-C8)',
  },
  {
    id: 'supinator', name: 'Supinator', region: 'Forearm',
    group: 'forearm', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.198, 1.116, -0.010], [0.209, 1.088, 0.010], [0.204, 1.062, 0.026],
    ],
    width: 0.017, flat: 0.7, profile: STRAP,
    fn: 'Turns the palm upward. Does the job on its own when the elbow is straight; the biceps takes over when force is needed.',
    or: 'Lateral epicondyle of the humerus and the upper ulna',
    ins: 'Upper third of the radius',
    nerve: 'Posterior interosseous nerve (C6-C7)',
  },

  // ===================== ABDOMEN =====================
  {
    id: 'rectus-abdominis', name: 'Rectus abdominis', region: 'Abdomen',
    group: 'abdomen', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.026, 0.942, 0.074], [0.029, 1.020, 0.100], [0.031, 1.110, 0.110],
      [0.033, 1.190, 0.108], [0.035, 1.272, 0.096],
    ],
    // Cross-section was already right. What was missing is the segmentation:
    // three tendinous intersections cross the muscle above the navel and pinch
    // it slightly at each one, which is what makes the blocks of a six-pack.
    width: 0.043, flat: 0.40, squareness: 3.4,
    profile: [[0, 0.58], [0.18, 0.94], [0.32, 1.0], [0.42, 0.90], [0.52, 1.0],
              [0.62, 0.89], [0.72, 0.99], [0.82, 0.88], [0.92, 0.93], [1, 0.82]],
    fn: 'Curls the trunk forward and resists the spine arching backward. The six-pack.',
    or: 'Pubic crest and pubic symphysis',
    ins: 'Cartilage of ribs 5 to 7 and the xiphoid process',
    nerve: 'Thoracoabdominal nerves (T7-T12)',
    clinical: 'The visible blocks come from three tendinous bands crossing the muscle, not from separate muscles. How defined they look is mostly down to body fat and where those bands sit, which is inherited.',
  },
  {
    id: 'external-oblique', name: 'External oblique', region: 'Abdomen',
    group: 'abdomen', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.086, 1.330, 0.056], [0.120, 1.286, 0.030], [0.138, 1.234, -0.006],
    ],
    insertion: [
      [0.038, 1.140, 0.110], [0.078, 1.076, 0.098], [0.130, 1.036, 0.038],
    ],
    thickness: 0.0169, bulge: 0.017, uSeg: 20, vSeg: 16,
    fn: 'Bends the trunk sideways and twists it to the opposite side. Fibres run down and forward, the direction your hands go into your pockets.',
    or: 'Outer surfaces of the lower eight ribs',
    ins: 'Iliac crest and the linea alba down the midline',
    nerve: 'Thoracoabdominal nerves (T7-T12)',
  },
  {
    id: 'internal-oblique', name: 'Internal oblique', region: 'Abdomen',
    group: 'abdomen', layer: 2, mirror: true, shape: 'sheet',
    origin: [
      [0.128, 1.028, 0.030], [0.134, 1.036, -0.006], [0.108, 1.030, -0.036],
    ],
    insertion: [
      [0.046, 1.128, 0.104], [0.096, 1.212, 0.064], [0.122, 1.246, 0.012],
    ],
    thickness: 0.0156, bulge: 0.0097, uSeg: 18, vSeg: 14,
    fn: 'Bends the trunk sideways and twists it to the same side. Its fibres run at right angles to the external oblique, so the two layers cross.',
    or: 'Iliac crest, inguinal ligament and thoracolumbar fascia',
    ins: 'Lower three ribs and the linea alba',
    nerve: 'Thoracoabdominal nerves and L1',
  },
  {
    id: 'transversus-abdominis', name: 'Transversus abdominis', region: 'Abdomen',
    group: 'abdomen', layer: 3, mirror: true, shape: 'sheet',
    origin: [
      [0.122, 1.058, -0.032], [0.130, 1.120, -0.024], [0.126, 1.190, -0.016],
    ],
    insertion: [
      [0.028, 1.058, 0.092], [0.030, 1.120, 0.100], [0.032, 1.190, 0.096],
    ],
    thickness: 0.013, bulge: 0.0073, uSeg: 16, vSeg: 16,
    fn: 'The deepest abdominal layer. Its fibres run horizontally, so it acts like a corset: it draws the belly wall in and braces the spine before you lift.',
    or: 'Iliac crest, thoracolumbar fascia and the cartilage of the lower six ribs',
    ins: 'Linea alba and the pubic crest',
    nerve: 'Thoracoabdominal nerves and L1',
  },

  // ===================== HIP =====================
  {
    id: 'gluteus-maximus', name: 'Gluteus maximus', region: 'Hip',
    group: 'hip', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.026, 0.996, -0.064], [0.060, 1.022, -0.054], [0.106, 1.028, -0.028],
    ],
    insertion: [
      [0.104, 0.848, -0.036], [0.146, 0.866, -0.014], [0.168, 0.892, 0.006],
    ],
    thickness: 0.048, bulge: 0.058, uSeg: 22, vSeg: 18,
    fn: 'Drives the hip from bent to straight. The muscle that stands you up out of a chair, climbs stairs and powers a sprint.',
    or: 'Posterior ilium, the sacrum, the coccyx and the sacrotuberous ligament',
    ins: 'Iliotibial band and the gluteal tuberosity of the femur',
    nerve: 'Inferior gluteal nerve (L5-S2)',
  },
  {
    id: 'gluteus-medius', name: 'Gluteus medius', region: 'Hip',
    group: 'hip', layer: 2, mirror: true, shape: 'sheet',
    origin: [
      [0.096, 1.028, -0.024], [0.124, 1.024, 0.010], [0.118, 1.000, 0.048],
    ],
    insertion: [
      [0.156, 0.952, -0.014], [0.162, 0.950, 0.000], [0.158, 0.948, 0.014],
    ],
    thickness: 0.0266, bulge: 0.0232, taper: [[0, 1], [0.6, 0.66], [1, 0.30]],
    uSeg: 16, vSeg: 14,
    fn: 'Holds the pelvis level while you stand on one leg, which is every step you take.',
    or: 'Outer surface of the ilium, between its posterior and anterior gluteal lines',
    ins: 'Lateral surface of the greater trochanter of the femur',
    nerve: 'Superior gluteal nerve (L4-S1)',
    clinical: 'If it is weak, the opposite hip drops when you stand on that leg. That is the Trendelenburg sign, and it often shows up as knee or low back pain rather than hip pain.',
  },
  {
    id: 'gluteus-minimus', name: 'Gluteus minimus', region: 'Hip',
    group: 'hip', layer: 3, mirror: true, shape: 'sheet',
    origin: [
      [0.096, 1.004, -0.010], [0.114, 0.998, 0.018], [0.110, 0.984, 0.042],
    ],
    insertion: [
      [0.150, 0.950, -0.004], [0.154, 0.948, 0.006], [0.150, 0.946, 0.016],
    ],
    thickness: 0.0182, bulge: 0.0129, taper: [[0, 1], [0.6, 0.66], [1, 0.30]],
    uSeg: 14, vSeg: 12,
    fn: 'Works with gluteus medius to steady the pelvis and turn the thigh inward.',
    or: 'Outer surface of the ilium, below gluteus medius',
    ins: 'Anterior surface of the greater trochanter',
    nerve: 'Superior gluteal nerve (L4-S1)',
  },
  {
    id: 'piriformis', name: 'Piriformis', region: 'Hip',
    group: 'hip', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.030, 0.960, -0.054], [0.080, 0.958, -0.038], [0.130, 0.952, -0.018],
      [0.156, 0.950, -0.006],
    ],
    width: 0.0132, flat: 0.7, profile: FUSIFORM,
    fn: 'Turns the thigh outward when the hip is straight, and steadies the head of the femur in its socket.',
    or: 'Anterior surface of the sacrum',
    ins: 'Upper border of the greater trochanter',
    nerve: 'Nerve to piriformis (S1-S2)',
    clinical: 'The sciatic nerve passes directly beneath it, and through it in a minority of people. A tight piriformis can compress the nerve and produce buttock and leg pain that imitates a disc problem.',
  },
  {
    id: 'psoas-major', name: 'Psoas major', region: 'Hip',
    group: 'hip', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.026, 1.140, -0.018], [0.044, 1.060, 0.006], [0.062, 0.990, 0.030],
      [0.090, 0.940, 0.024], [0.118, 0.908, -0.008],
    ],
    width: 0.0238, flat: 0.85, profile: [[0, 0.5], [0.3, 1.0], [0.68, 0.9], [1, 0.32]],
    fn: 'The strongest hip flexor: lifts the thigh toward the chest and, with the leg fixed, curls you up from lying down.',
    or: 'Bodies and transverse processes of the lumbar vertebrae and T12',
    ins: 'Lesser trochanter of the femur',
    nerve: 'Lumbar plexus (L1-L3)',
    clinical: 'It is the only muscle connecting the spine to the leg. Long hours of sitting keep it short, which tips the pelvis forward and is a common hidden contributor to low back pain.',
  },
  {
    id: 'iliacus', name: 'Iliacus', region: 'Hip',
    group: 'hip', layer: 3, mirror: true, shape: 'sheet',
    origin: [
      [0.070, 1.014, 0.026], [0.098, 1.006, 0.044], [0.112, 0.986, 0.050],
    ],
    insertion: [
      [0.104, 0.930, 0.008], [0.112, 0.922, 0.002], [0.116, 0.914, -0.004],
    ],
    thickness: 0.021, bulge: 0.0103, taper: [[0, 1], [0.6, 0.62], [1, 0.30]],
    uSeg: 14, vSeg: 12,
    fn: 'Flexes the hip. Joins the psoas tendon, and the pair are usually described together as the iliopsoas.',
    or: 'Iliac fossa, the inner bowl of the pelvis',
    ins: 'Lesser trochanter of the femur, with psoas major',
    nerve: 'Femoral nerve (L2-L3)',
  },
  {
    id: 'tensor-fasciae-latae', name: 'Tensor fasciae latae', region: 'Hip',
    group: 'hip', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.116, 0.976, 0.062], [0.142, 0.940, 0.052], [0.160, 0.890, 0.034],
      [0.166, 0.842, 0.024],
    ],
    width: 0.021, flat: 0.7, profile: TAPERED,
    fn: 'Flexes and abducts the hip, and tightens the iliotibial band to steady the knee.',
    or: 'Anterior superior iliac spine and the front of the iliac crest',
    ins: 'Iliotibial band, about a third of the way down the thigh',
    nerve: 'Superior gluteal nerve (L4-S1)',
  },
  {
    id: 'iliotibial-band', name: 'Iliotibial band', region: 'Hip / thigh',
    group: 'hip', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.166, 0.842, 0.024], [0.172, 0.740, 0.020], [0.170, 0.620, 0.018],
      [0.150, 0.530, 0.018], [0.128, 0.492, 0.020],
    ],
    width: 0.0199, flat: 0.26, squareness: 3.6, profile: STRAP,
    fn: 'Not a muscle but a thick strap of fascia. It carries the pull of tensor fasciae latae and gluteus maximus down to the knee and steadies the joint from the side.',
    or: 'Iliac crest, via tensor fasciae latae and gluteus maximus',
    ins: 'Gerdy’s tubercle on the lateral tibia',
    nerve: 'Not applicable, this is connective tissue',
    clinical: 'Where it passes over the outer knee it can become irritated with repetitive bending, which is IT band syndrome, a common running complaint.',
  },

  // ===================== THIGH =====================
  {
    id: 'rectus-femoris', name: 'Rectus femoris', region: 'Thigh, quadriceps',
    group: 'thigh', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.108, 0.960, 0.056], [0.124, 0.880, 0.072], [0.128, 0.760, 0.080],
      [0.122, 0.640, 0.072], [0.110, 0.556, 0.052], [0.104, 0.520, 0.042],
    ],
    // Bipennate and distinctly flat: it lies as a broad band on the front of
    // the thigh, roughly half as deep as it is wide.
    width: 0.0455, flat: 0.62, squareness: 2.7, profile: TENDINOUS,
    fn: 'Straightens the knee and helps lift the thigh. The only quadriceps head that crosses both the hip and the knee.',
    or: 'Anterior inferior iliac spine of the pelvis',
    ins: 'Patella, and through the patellar tendon to the tibial tuberosity',
    nerve: 'Femoral nerve (L2-L4)',
  },
  {
    id: 'vastus-lateralis', name: 'Vastus lateralis', region: 'Thigh, quadriceps',
    group: 'thigh', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.156, 0.916, -0.004], [0.168, 0.840, 0.014], [0.166, 0.740, 0.032],
      [0.150, 0.640, 0.046], [0.126, 0.556, 0.048], [0.110, 0.522, 0.042],
    ],
    // The largest of the four. It is a broad mass wrapped round the outside of
    // the femur, so it is much wider than deep.
    width: 0.0525, flat: 0.64, squareness: 2.8,
    profile: [[0, 0.48], [0.25, 0.95], [0.58, 1.0], [0.88, 0.48], [1, 0.28]],
    fn: 'Straightens the knee. The largest of the four quadriceps heads and the outer sweep of the thigh.',
    or: 'Greater trochanter and the lateral lip of the linea aspera of the femur',
    ins: 'Patella, and through the patellar tendon to the tibia',
    nerve: 'Femoral nerve (L2-L4)',
  },
  {
    id: 'vastus-medialis', name: 'Vastus medialis', region: 'Thigh, quadriceps',
    group: 'thigh', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.100, 0.880, 0.010], [0.086, 0.780, 0.028], [0.076, 0.680, 0.048],
      [0.076, 0.590, 0.056], [0.090, 0.534, 0.048],
    ],
    // Its bulk sits low, just above the knee: the teardrop you can see on the
    // inside of a straightened leg. The peak is pushed down to match.
    width: 0.042, flat: 0.66, squareness: 2.7,
    profile: [[0, 0.34], [0.32, 0.72], [0.70, 0.96], [0.86, 1.0], [1, 0.46]],
    fn: 'Straightens the knee and pulls the kneecap inward, keeping it tracking in its groove through the last part of the movement.',
    or: 'Intertrochanteric line and the medial lip of the linea aspera of the femur',
    ins: 'Patella, and through the patellar tendon to the tibia',
    nerve: 'Femoral nerve (L2-L4)',
  },
  {
    id: 'vastus-intermedius', name: 'Vastus intermedius', region: 'Thigh, quadriceps',
    group: 'thigh', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.130, 0.900, 0.020], [0.128, 0.780, 0.036], [0.120, 0.660, 0.044],
      [0.108, 0.560, 0.042],
    ],
    width: 0.0385, flat: 0.80, profile: TENDINOUS,
    fn: 'Straightens the knee. Lies directly on the femur, hidden beneath the other three heads.',
    or: 'Front and lateral surfaces of the shaft of the femur',
    ins: 'Patella, and through the patellar tendon to the tibia',
    nerve: 'Femoral nerve (L2-L4)',
  },
  {
    id: 'sartorius', name: 'Sartorius', region: 'Thigh',
    group: 'thigh', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.116, 0.972, 0.062], [0.114, 0.880, 0.070], [0.096, 0.780, 0.062],
      [0.070, 0.680, 0.040], [0.052, 0.590, 0.010], [0.056, 0.530, -0.008],
      [0.072, 0.494, 0.006],
    ],
    // The longest muscle in the body, and a flat ribbon rather than a cord:
    // about 2.5cm across and only 1cm thick as it crosses the thigh.
    width: 0.0137, flat: 0.38, squareness: 2.8, radial: 12, profile: STRAP,
    fn: 'Flexes, abducts and externally rotates the hip while bending the knee. Put together, that is the cross-legged tailor’s position its name comes from.',
    or: 'Anterior superior iliac spine',
    ins: 'Upper medial tibia, at the pes anserinus',
    nerve: 'Femoral nerve (L2-L3)',
    clinical: 'The longest muscle in the body. It spirals from the outside of the pelvis to the inside of the knee, crossing the whole front of the thigh.',
  },
  {
    id: 'gracilis', name: 'Gracilis', region: 'Thigh, adductors',
    group: 'thigh', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.036, 0.928, 0.036], [0.048, 0.840, 0.014], [0.052, 0.720, 0.000],
      [0.054, 0.600, -0.004], [0.068, 0.508, 0.004],
    ],
    // A thin flat strap down the inside of the thigh, not a rounded cord.
    width: 0.0143, flat: 0.42, squareness: 2.8, radial: 12, profile: STRAP,
    fn: 'Pulls the thigh inward and helps bend the knee. The most superficial of the inner-thigh muscles.',
    or: 'Body and inferior ramus of the pubis',
    ins: 'Upper medial tibia, at the pes anserinus',
    nerve: 'Obturator nerve (L2-L3)',
  },
  {
    id: 'adductor-longus', name: 'Adductor longus', region: 'Thigh, adductors',
    group: 'thigh', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.036, 0.930, 0.044], [0.062, 0.870, 0.028], [0.086, 0.800, 0.006],
      [0.104, 0.730, -0.008],
    ],
    // A flat triangular fan: it starts narrow on the pubis and broadens as it
    // runs to the back of the femur, which is the opposite way round to the
    // tapering profile it had.
    width: 0.0298, flat: 0.56, squareness: 2.7,
    profile: [[0, 0.34], [0.28, 0.78], [0.68, 1.0], [1, 0.86]],
    fn: 'Pulls the thigh in toward the midline and assists hip flexion.',
    or: 'Front of the pubis, just below the pubic crest',
    ins: 'Middle third of the linea aspera of the femur',
    nerve: 'Obturator nerve (L2-L4)',
    clinical: 'Its tendon at the pubis is the usual site of a groin strain in footballers and sprinters.',
  },
  {
    id: 'adductor-magnus', name: 'Adductor magnus', region: 'Thigh, adductors',
    group: 'thigh', layer: 3, mirror: true, shape: 'sheet',
    origin: [
      [0.034, 0.930, 0.036], [0.052, 0.912, -0.006], [0.066, 0.902, -0.046],
    ],
    insertion: [
      [0.104, 0.780, -0.020], [0.096, 0.680, -0.024], [0.086, 0.560, -0.012],
    ],
    thickness: 0.0385, bulge: 0.0216, uSeg: 16, vSeg: 16,
    fn: 'The largest adductor. Its front part pulls the thigh inward, while its back part behaves like a hamstring and extends the hip.',
    or: 'Inferior pubic ramus, ischial ramus and the ischial tuberosity',
    ins: 'Linea aspera and the adductor tubercle of the femur',
    nerve: 'Obturator nerve and the tibial division of the sciatic nerve',
  },
  {
    id: 'pectineus', name: 'Pectineus', region: 'Thigh, adductors',
    group: 'thigh', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.040, 0.940, 0.042], [0.072, 0.918, 0.020], [0.104, 0.900, -0.006],
    ],
    width: 0.0227, flat: 0.7, profile: STRAP,
    fn: 'Flexes and adducts the hip. Sits in the crease at the very top of the inner thigh.',
    or: 'Pectineal line of the pubis',
    ins: 'Pectineal line of the femur, below the lesser trochanter',
    nerve: 'Femoral nerve (L2-L3)',
  },
  {
    id: 'biceps-femoris-long', name: 'Biceps femoris, long head', region: 'Thigh, hamstrings',
    group: 'thigh', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.062, 0.902, -0.048], [0.086, 0.820, -0.048], [0.104, 0.720, -0.046],
      [0.118, 0.620, -0.038], [0.130, 0.540, -0.022], [0.132, 0.500, -0.008],
    ],
    // Flattened between the other hamstrings and the outside of the thigh.
    width: 0.035, flat: 0.70, squareness: 2.6, profile: TENDINOUS,
    fn: 'Bends the knee and extends the hip. The outer hamstring; its tendon is the cord you can feel on the outside behind the knee.',
    or: 'Ischial tuberosity, the sit bone',
    ins: 'Head of the fibula, at the outer knee',
    nerve: 'Tibial division of the sciatic nerve (L5-S2)',
    clinical: 'Because it crosses both hip and knee, it is the most commonly strained hamstring, usually during the swing phase of a sprint.',
  },
  {
    id: 'biceps-femoris-short', name: 'Biceps femoris, short head', region: 'Thigh, hamstrings',
    group: 'thigh', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.108, 0.700, -0.038], [0.120, 0.620, -0.034], [0.130, 0.538, -0.020],
    ],
    width: 0.0227, flat: 0.85, profile: FUSIFORM,
    fn: 'Bends the knee. Unlike the long head it crosses only the knee, not the hip.',
    or: 'Linea aspera of the femur',
    ins: 'Head of the fibula, joining the long head',
    nerve: 'Common fibular division of the sciatic nerve (L5-S2)',
  },
  {
    id: 'semitendinosus', name: 'Semitendinosus', region: 'Thigh, hamstrings',
    group: 'thigh', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.058, 0.900, -0.050], [0.058, 0.810, -0.052], [0.058, 0.700, -0.048],
      [0.060, 0.600, -0.036], [0.066, 0.520, -0.016], [0.074, 0.492, 0.002],
    ],
    width: 0.0262, flat: 0.85,
    profile: [[0, 0.5], [0.2, 1.0], [0.48, 0.9], [0.74, 0.38], [1, 0.22]],
    fn: 'Bends the knee and extends the hip. Named for its unusually long tendon, which makes up the lower half of the muscle.',
    or: 'Ischial tuberosity',
    ins: 'Upper medial tibia, at the pes anserinus',
    nerve: 'Tibial division of the sciatic nerve (L5-S2)',
  },
  {
    id: 'semimembranosus', name: 'Semimembranosus', region: 'Thigh, hamstrings',
    group: 'thigh', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.062, 0.898, -0.054], [0.070, 0.800, -0.056], [0.076, 0.690, -0.052],
      [0.078, 0.590, -0.040], [0.076, 0.528, -0.024],
    ],
    // Named for its membrane: broad flat tendons at both ends and a flat belly
    // between them.
    width: 0.0298, flat: 0.58, squareness: 2.8, profile: TENDINOUS,
    fn: 'Bends the knee and extends the hip. Lies underneath semitendinosus, against the femur.',
    or: 'Ischial tuberosity',
    ins: 'Posterior aspect of the medial tibial condyle',
    nerve: 'Tibial division of the sciatic nerve (L5-S2)',
  },

  // ===================== LOWER LEG =====================
  {
    id: 'gastrocnemius-medial', name: 'Gastrocnemius, medial head', region: 'Lower leg, calf',
    group: 'lowerleg', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.084, 0.506, -0.030], [0.078, 0.430, -0.048], [0.080, 0.340, -0.050],
      [0.086, 0.250, -0.038], [0.088, 0.180, -0.030],
    ],
    // The calf bellies are broad and pressed flat against the soleus behind
    // them, so they are wider than they are deep.
    width: 0.0384, flat: 0.64, squareness: 2.7, profile: BULGING,
    fn: 'Points the foot down and helps bend the knee. The larger, more prominent of the two calf bellies.',
    or: 'Medial condyle of the femur, above the knee',
    ins: 'Calcaneus, via the Achilles tendon',
    nerve: 'Tibial nerve (S1-S2)',
  },
  {
    id: 'gastrocnemius-lateral', name: 'Gastrocnemius, lateral head', region: 'Lower leg, calf',
    group: 'lowerleg', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.124, 0.504, -0.026], [0.124, 0.430, -0.046], [0.116, 0.345, -0.048],
      [0.100, 0.255, -0.038], [0.092, 0.185, -0.030],
    ],
    // Same flattening as the medial head, and it ends a little higher.
    width: 0.0336, flat: 0.62, squareness: 2.7, profile: BULGING,
    fn: 'Points the foot down and helps bend the knee. Because it crosses the knee, the calf is weaker when the knee is bent.',
    or: 'Lateral condyle of the femur',
    ins: 'Calcaneus, via the Achilles tendon',
    nerve: 'Tibial nerve (S1-S2)',
  },
  {
    id: 'soleus', name: 'Soleus', region: 'Lower leg, calf',
    group: 'lowerleg', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.104, 0.456, -0.024], [0.104, 0.380, -0.036], [0.100, 0.300, -0.040],
      [0.092, 0.200, -0.034], [0.088, 0.140, -0.026],
    ],
    // The broad flat muscle under the gastrocnemius. It is what gives the calf
    // its width, so it is the flattest of the three.
    width: 0.0448, flat: 0.54, squareness: 2.7,
    profile: [[0, 0.55], [0.25, 1.0], [0.6, 0.92], [0.88, 0.44], [1, 0.26]],
    fn: 'Points the foot down. It does not cross the knee, so it keeps working when the knee is bent and does most of the quiet work of standing.',
    or: 'Back of the head of the fibula and the soleal line of the tibia',
    ins: 'Calcaneus, via the Achilles tendon',
    nerve: 'Tibial nerve (S1-S2)',
    clinical: 'Often called the second heart: every step squeezes it and helps push venous blood back up from the legs.',
  },
  {
    id: 'achilles-tendon', name: 'Achilles tendon', region: 'Lower leg, calf',
    group: 'lowerleg', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.090, 0.190, -0.030], [0.087, 0.130, -0.038], [0.085, 0.075, -0.046],
      [0.084, 0.042, -0.050],
    ],
    width: 0.011, flat: 0.55, squareness: 3.0,
    profile: [[0, 1.0], [0.5, 0.78], [1, 0.98]],
    fn: 'Carries the whole force of the calf to the heel. The thickest and strongest tendon in the body.',
    or: 'Merged tendons of gastrocnemius and soleus',
    ins: 'Posterior surface of the calcaneus',
    nerve: 'Not applicable, this is connective tissue',
    clinical: 'Like the supraspinatus tendon, it has a stretch a few centimetres above its insertion where the blood supply is poorest, and that is where it usually tears.',
  },
  {
    id: 'tibialis-anterior', name: 'Tibialis anterior', region: 'Lower leg, shin',
    group: 'lowerleg', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.112, 0.470, 0.030], [0.114, 0.390, 0.040], [0.108, 0.290, 0.040],
      [0.096, 0.180, 0.032], [0.084, 0.110, 0.024], [0.076, 0.078, 0.020],
    ],
    // Packed into the trough on the outer side of the shin bone, which makes
    // its section closer to a triangle than a circle.
    width: 0.0272, flat: 0.58, squareness: 2.8, profile: TENDINOUS,
    fn: 'Lifts the foot and turns the sole inward. It lowers the foot under control after the heel strikes, instead of letting it slap down.',
    or: 'Lateral condyle and upper lateral surface of the tibia',
    ins: 'Medial cuneiform and the base of the first metatarsal',
    nerve: 'Deep fibular nerve (L4-L5)',
    clinical: 'When it is weak or its nerve is injured the foot drops, and the toes catch on the ground during walking.',
  },
  {
    id: 'extensor-digitorum-longus', name: 'Extensor digitorum longus', region: 'Lower leg, shin',
    group: 'lowerleg', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.122, 0.462, 0.020], [0.124, 0.380, 0.032], [0.118, 0.290, 0.034],
      [0.104, 0.180, 0.028], [0.092, 0.100, 0.024],
    ],
    width: 0.0192, flat: 0.75, profile: TENDINOUS,
    fn: 'Straightens the toes and helps lift the foot.',
    or: 'Lateral condyle of the tibia and the anterior fibula',
    ins: 'Middle and distal phalanges of the four lesser toes',
    nerve: 'Deep fibular nerve (L5-S1)',
  },
  {
    id: 'peroneus-longus', name: 'Peroneus longus', region: 'Lower leg, shin',
    group: 'lowerleg', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.132, 0.470, 0.000], [0.136, 0.390, 0.004], [0.130, 0.290, 0.006],
      [0.116, 0.180, 0.000], [0.104, 0.110, -0.006],
    ],
    width: 0.0208, flat: 0.7, profile: TENDINOUS,
    fn: 'Turns the sole outward and points the foot down. Its tendon crosses under the foot and helps hold up the arch.',
    or: 'Head and upper lateral surface of the fibula',
    ins: 'Medial cuneiform and the base of the first metatarsal, on the sole',
    nerve: 'Superficial fibular nerve (L5-S1)',
  },
  {
    id: 'tibialis-posterior', name: 'Tibialis posterior', region: 'Lower leg, deep',
    group: 'lowerleg', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.100, 0.430, -0.014], [0.098, 0.340, -0.016], [0.092, 0.240, -0.014],
      [0.086, 0.140, -0.012], [0.082, 0.090, -0.006],
    ],
    width: 0.0176, flat: 0.8, profile: TENDINOUS,
    fn: 'Turns the sole inward and points the foot down. The main dynamic support of the arch of the foot.',
    or: 'Interosseous membrane and the adjacent tibia and fibula',
    ins: 'Navicular, cuneiforms and the bases of metatarsals 2 to 4',
    nerve: 'Tibial nerve (L4-L5)',
    clinical: 'If this tendon fails, the arch collapses. It is the usual cause of adult-acquired flatfoot.',
  },
  {
    id: 'flexor-hallucis-longus', name: 'Flexor hallucis longus', region: 'Lower leg, deep',
    group: 'lowerleg', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.110, 0.400, -0.022], [0.106, 0.310, -0.024], [0.098, 0.210, -0.020],
      [0.088, 0.120, -0.014],
    ],
    width: 0.016, flat: 0.8, profile: TENDINOUS,
    fn: 'Curls the big toe down, giving the final push at the end of each step.',
    or: 'Posterior surface of the fibula',
    ins: 'Base of the distal phalanx of the big toe',
    nerve: 'Tibial nerve (L5-S2)',
  },
  {
    id: 'sternohyoid', name: 'Sternohyoid', region: 'Neck',
    group: 'neck', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.016, 1.472, 0.062], [0.018, 1.512, 0.058], [0.016, 1.547, 0.048],
    ],
    width: 0.009, flat: 0.5, squareness: 3.0, profile: STRAP,
    fn: 'Pulls the hyoid bone down after swallowing. One of the strap muscles standing out either side of the windpipe.',
    or: 'Manubrium of the sternum and the medial clavicle',
    ins: 'Body of the hyoid bone',
    nerve: 'Ansa cervicalis (C1-C3)',
  },
  {
    id: 'omohyoid', name: 'Omohyoid', region: 'Neck',
    group: 'neck', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.020, 1.550, 0.046], [0.048, 1.519, 0.028], [0.086, 1.486, -0.006],
    ],
    width: 0.007, flat: 0.6, profile: STRAP,
    fn: 'Depresses the hyoid bone. Unusual in having two bellies joined by a tendon that is tethered to the clavicle.',
    or: 'Superior border of the scapula',
    ins: 'Body of the hyoid bone',
    nerve: 'Ansa cervicalis (C1-C3)',
  },

  // ===================== CHEST WALL =====================
  {
    id: 'intercostals', name: 'Intercostals', region: 'Chest wall',
    group: 'chest', layer: 3, mirror: true, shape: 'sheet',
    origin: [
      [0.040, 1.428, -0.062], [0.100, 1.414, -0.054],
      [0.141, 1.398, 0.012], [0.114, 1.394, 0.070],
    ],
    insertion: [
      [0.035, 1.182, -0.054], [0.095, 1.176, -0.046],
      [0.136, 1.182, 0.016], [0.076, 1.202, 0.078],
    ],
    thickness: 0.011, bulge: 0.008, uSeg: 24, vSeg: 16,
    fn: 'Fill the spaces between the ribs and move them during breathing. The outer layer lifts the ribs to draw air in, the inner layer pulls them down to force it out.',
    or: 'Lower border of each rib',
    ins: 'Upper border of the rib below',
    nerve: 'Intercostal nerves (T1-T11)',
    clinical: 'A hard cough or a twisting lift can strain them, which produces a sharp, well-localised chest pain that moves with breathing and is often mistaken for something more serious.',
  },

  // ===================== DEEP BACK AND HIP =====================
  {
    id: 'multifidus', name: 'Multifidus', region: 'Back, deep',
    group: 'back', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.020, 1.420, -0.050], [0.024, 1.300, -0.052], [0.026, 1.180, -0.046],
      [0.028, 1.060, -0.038], [0.026, 0.992, -0.040],
    ],
    width: 0.017, flat: 0.82, profile: [[0, 0.6], [0.3, 0.9], [0.75, 1.0], [1, 0.85]],
    fn: 'A short muscle repeated the length of the spine, bridging two or three vertebrae at a time. It steadies each joint segment rather than producing large movement.',
    or: 'Sacrum, and the transverse processes up the spine',
    ins: 'Spinous processes two to four levels above',
    nerve: 'Posterior rami of the spinal nerves',
    clinical: 'It wastes quickly after an episode of back pain and does not recover on its own, which is a large part of why core stability work is prescribed afterwards.',
  },
  {
    id: 'serratus-posterior-inferior', name: 'Serratus posterior inferior', region: 'Back',
    group: 'back', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.022, 1.156, -0.058], [0.070, 1.190, -0.054], [0.116, 1.234, -0.028],
    ],
    width: 0.013, flat: 0.42, squareness: 3.0, profile: STRAP,
    fn: 'Draws the lower ribs down and back, steadying them against the pull of the diaphragm.',
    or: 'Spinous processes of T11 to L2',
    ins: 'Lower borders of ribs 9 to 12',
    nerve: 'Intercostal nerves (T9-T12)',
  },
  {
    id: 'quadratus-femoris', name: 'Quadratus femoris', region: 'Hip, deep',
    group: 'hip', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.064, 0.900, -0.040], [0.110, 0.906, -0.030], [0.150, 0.916, -0.020],
    ],
    width: 0.013, flat: 0.6, squareness: 2.8, profile: STRAP,
    fn: 'Turns the thigh outward and holds the head of the femur in its socket. One of the short external rotators lying under gluteus maximus.',
    or: 'Lateral border of the ischial tuberosity',
    ins: 'Intertrochanteric crest of the femur',
    nerve: 'Nerve to quadratus femoris (L4-S1)',
  },
  {
    id: 'obturator-internus', name: 'Obturator internus', region: 'Hip, deep',
    group: 'hip', layer: 3, mirror: true, shape: 'tube',
    path: [
      [0.045, 0.922, -0.008], [0.096, 0.936, -0.030], [0.146, 0.946, -0.018],
    ],
    width: 0.012, flat: 0.7, profile: FUSIFORM,
    fn: 'Rotates the thigh outward. Its tendon turns almost a right angle around the pelvis, using the bone as a pulley.',
    or: 'Inner surface of the obturator membrane and the surrounding pelvis',
    ins: 'Medial surface of the greater trochanter',
    nerve: 'Nerve to obturator internus (L5-S2)',
  },

  // ===================== HAND =====================
  {
    id: 'thenar', name: 'Thenar eminence', region: 'Hand',
    group: 'forearm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.190, 0.857, 0.030], [0.180, 0.836, 0.040], [0.170, 0.820, 0.046],
    ],
    width: 0.012, flat: 0.66, profile: [[0, 0.7], [0.45, 1.0], [1, 0.6]],
    fn: 'The muscular pad at the base of the thumb. Together these move the thumb across the palm, which is what makes the human grip what it is.',
    or: 'Flexor retinaculum and the carpal bones',
    ins: 'Base of the thumb',
    nerve: 'Median nerve, mostly (C8-T1)',
    clinical: 'Wasting of this pad is a classic late sign of carpal tunnel syndrome, because the median nerve that supplies it is the one being compressed.',
  },
  {
    id: 'hypothenar', name: 'Hypothenar eminence', region: 'Hand',
    group: 'forearm', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.212, 0.851, 0.028], [0.214, 0.812, 0.030], [0.209, 0.784, 0.028],
    ],
    width: 0.010, flat: 0.62, profile: [[0, 0.7], [0.45, 1.0], [1, 0.55]],
    fn: 'The pad along the little-finger edge of the palm. Cups the hand and moves the little finger.',
    or: 'Pisiform, hamate and the flexor retinaculum',
    ins: 'Base of the little finger',
    nerve: 'Ulnar nerve (C8-T1)',
  },
  {
    id: 'interossei', name: 'Interossei', region: 'Hand',
    group: 'forearm', layer: 2, mirror: true, shape: 'tube',
    path: [
      [0.190, 0.850, 0.026], [0.192, 0.802, 0.028], [0.192, 0.772, 0.026],
    ],
    width: 0.019, flat: 0.30, squareness: 3.2, profile: [[0, 0.75], [0.5, 1.0], [1, 0.7]],
    fn: 'Spread the fingers apart and draw them together, and help straighten them at the middle joints. They fill the spaces between the metacarpal bones.',
    or: 'Shafts of the metacarpal bones',
    ins: 'Bases of the proximal phalanges and the extensor hoods',
    nerve: 'Ulnar nerve (C8-T1)',
  },

  // ===================== FOOT =====================
  {
    id: 'extensor-digitorum-brevis', name: 'Extensor digitorum brevis', region: 'Foot',
    group: 'lowerleg', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.090, 0.058, 0.018], [0.092, 0.041, 0.068], [0.090, 0.031, 0.098],
    ],
    width: 0.013, flat: 0.42, squareness: 3.0, profile: [[0, 0.75], [0.4, 1.0], [1, 0.5]],
    fn: 'Straightens the toes. Forms the soft bulge on the outer side of the top of the foot, in front of the ankle.',
    or: 'Upper surface of the calcaneus',
    ins: 'Tendons of the first four toes',
    nerve: 'Deep fibular nerve (L5-S1)',
  },
  {
    id: 'abductor-hallucis', name: 'Abductor hallucis', region: 'Foot',
    group: 'lowerleg', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.070, 0.038, -0.028], [0.068, 0.028, 0.030], [0.070, 0.024, 0.080],
    ],
    width: 0.011, flat: 0.5, profile: [[0, 0.7], [0.45, 1.0], [1, 0.55]],
    fn: 'Pulls the big toe away from the others and supports the inner arch during push-off.',
    or: 'Medial process of the calcaneal tuberosity',
    ins: 'Medial side of the base of the big toe',
    nerve: 'Medial plantar nerve (S1-S2)',
  },

  // ===================== HEAD: MUSCLES OF MASTICATION =====================
  {
    id: 'temporalis', name: 'Temporalis', region: 'Jaw',
    group: 'head', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.030, 1.743, 0.028], [0.052, 1.732, 0.002],
      [0.062, 1.708, -0.028], [0.060, 1.682, -0.044],
    ],
    insertion: [
      [0.044, 1.675, 0.048], [0.052, 1.673, 0.028],
      [0.056, 1.670, 0.008], [0.054, 1.668, -0.006],
    ],
    thickness: 0.010, bulge: 0.005, uSeg: 20, vSeg: 14,
    fn: 'Closes the jaw and draws it backward. The broad fan over the temple that you can feel bunch under your fingers when you clench.',
    or: 'Temporal fossa, the flat area on the side of the skull',
    ins: 'Coronoid process of the mandible, passing under the zygomatic arch',
    nerve: 'Mandibular branch of the trigeminal nerve (CN V3)',
  },
  {
    id: 'masseter', name: 'Masseter', region: 'Jaw',
    group: 'head', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.042, 1.656, 0.058], [0.055, 1.658, 0.030], [0.064, 1.661, 0.002],
    ],
    insertion: [
      [0.038, 1.595, 0.046], [0.050, 1.597, 0.020], [0.057, 1.602, -0.006],
    ],
    thickness: 0.012, bulge: 0.007, uSeg: 16, vSeg: 12,
    fn: 'Clamps the jaw shut. Pound for pound the strongest muscle in the body, and the slab you can feel bulge at the angle of the jaw when you bite down.',
    or: 'Zygomatic arch, the bar of bone across the cheek',
    ins: 'Angle and outer surface of the ramus of the mandible',
    nerve: 'Mandibular branch of the trigeminal nerve (CN V3)',
  },
  {
    id: 'buccinator', name: 'Buccinator', region: 'Face',
    group: 'head', layer: 2, mirror: true, shape: 'sheet',
    origin: [
      [0.046, 1.640, 0.036], [0.048, 1.623, 0.032], [0.044, 1.609, 0.036],
    ],
    insertion: [
      [0.026, 1.632, 0.080], [0.027, 1.624, 0.082], [0.025, 1.616, 0.080],
    ],
    thickness: 0.008, bulge: 0.004, uSeg: 12, vSeg: 10,
    fn: 'Presses the cheek flat against the teeth so food does not collect there, and blows air out forcefully.',
    or: 'Outer surfaces of the upper and lower jaw, opposite the molars',
    ins: 'Blends into orbicularis oris at the corner of the mouth',
    nerve: 'Buccal branch of the facial nerve (CN VII)',
    clinical: 'Named for the Latin trumpeter. It is the muscle a wind player uses to control the stream of air.',
  },

  // ============ HEAD: MUSCLES OF FACIAL EXPRESSION ============
  // These insert into skin rather than bone, which is what lets a face move.
  // On a plate they tile the whole face, so they are modelled as broad straps
  // and rings rather than the thin cords used elsewhere in the body.
  {
    id: 'frontalis', name: 'Frontalis', region: 'Face',
    group: 'head', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.006, 1.694, 0.0885], [0.022, 1.697, 0.0865], [0.039, 1.694, 0.0765],
    ],
    insertion: [
      [0.015, 1.753, 0.0590], [0.030, 1.749, 0.0540], [0.045, 1.741, 0.0410],
    ],
    thickness: 0.0075, bulge: 0.0045, uSeg: 16, vSeg: 14,
    fn: 'Raises the eyebrows and wrinkles the forehead. The pair of vertical straps that give the forehead its shape, separated by the pale aponeurosis running down between them.',
    or: 'Epicranial aponeurosis, the sheet over the top of the skull',
    ins: 'Skin of the eyebrow and the root of the nose',
    nerve: 'Temporal branches of the facial nerve (CN VII)',
  },
  {
    id: 'procerus', name: 'Procerus', region: 'Face',
    group: 'head', layer: 1, mirror: false, shape: 'tube',
    path: [
      [0, 1.6708, 0.0960], [0, 1.6838, 0.0935], [0, 1.6967, 0.0885],
    ],
    alignRadial: [0, 0.005],
    width: 0.0075, flat: 0.42, squareness: 2.8, profile: STRAP,
    fn: 'Pulls the skin between the eyebrows down, making the horizontal wrinkle across the bridge of the nose. The muscle of frowning and of squinting into the sun.',
    or: 'Nasal bone and the upper lateral nasal cartilage',
    ins: 'Skin of the lower forehead, between the eyebrows',
    nerve: 'Temporal and zygomatic branches of the facial nerve (CN VII)',
  },
  {
    id: 'orbicularis-oculi', name: 'Orbicularis oculi', region: 'Face',
    group: 'head', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.0100, 1.6826, 0.0870], [0.0150, 1.6973, 0.0870], [0.0305, 1.7038, 0.0845],
      [0.0465, 1.6973, 0.0780], [0.0520, 1.6826, 0.0730], [0.0465, 1.6678, 0.0780],
      [0.0305, 1.6614, 0.0850], [0.0150, 1.6678, 0.0870], [0.0100, 1.6826, 0.0870],
    ],
    alignRadial: [0, 0.005],
    width: 0.0115, flat: 0.26, squareness: 3.2,
    profile: [[0, 0.85], [0.5, 1.0], [1, 0.85]],
    fn: 'Closes the eye. The inner ring blinks, the outer ring screws the eye tightly shut. A broad flat disc, not a thin band, which is why the whole area around the eye moves when you squint.',
    or: 'Medial orbital margin, nasal bone and the medial palpebral ligament',
    ins: 'Circles the orbit and returns to its own origin',
    nerve: 'Temporal and zygomatic branches of the facial nerve (CN VII)',
    clinical: 'When the facial nerve is paralysed, as in Bell’s palsy, this muscle stops working and the eye on that side will not close, leaving the cornea exposed and at risk of drying out.',
  },
  {
    id: 'nasalis', name: 'Nasalis', region: 'Face',
    group: 'head', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.0045, 1.6572, 0.1000], [0.0130, 1.6619, 0.0925], [0.0195, 1.6690, 0.0820],
    ],
    alignRadial: [0, 0.005],
    width: 0.0052, flat: 0.45, profile: STRAP,
    fn: 'Compresses the bridge of the nose and flares the nostril. The muscle that moves when you wrinkle your nose.',
    or: 'Maxilla, above the upper canine and incisor',
    ins: 'Bridge of the nose, joining its partner across the midline',
    nerve: 'Buccal branch of the facial nerve (CN VII)',
  },
  {
    id: 'levator-labii', name: 'Levator labii superioris', region: 'Face',
    group: 'head', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.0255, 1.6720, 0.0855], [0.0205, 1.6513, 0.0895], [0.0145, 1.6372, 0.0890],
    ],
    alignRadial: [0, 0.005],
    width: 0.0050, flat: 0.5, profile: STRAP,
    fn: 'Lifts the upper lip. Working hard it produces the raised-lip look of disgust, and with the nose muscles a snarl.',
    or: 'Lower margin of the orbit, above the infraorbital foramen',
    ins: 'Skin and muscle of the upper lip',
    nerve: 'Buccal branch of the facial nerve (CN VII)',
  },
  {
    id: 'zygomaticus-major', name: 'Zygomaticus major', region: 'Face',
    group: 'head', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.0520, 1.6572, 0.0505], [0.0385, 1.6407, 0.0745], [0.0245, 1.6265, 0.0840],
    ],
    alignRadial: [0, 0.005],
    width: 0.0058, flat: 0.5, profile: STRAP,
    fn: 'Draws the corner of the mouth up and outward. This is the smiling muscle.',
    or: 'Zygomatic bone, the cheekbone',
    ins: 'Corner of the mouth, blending with orbicularis oris',
    nerve: 'Zygomatic and buccal branches of the facial nerve (CN VII)',
  },
  {
    id: 'zygomaticus-minor', name: 'Zygomaticus minor', region: 'Face',
    group: 'head', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.0440, 1.6625, 0.0610], [0.0300, 1.6466, 0.0820], [0.0180, 1.6348, 0.0880],
    ],
    alignRadial: [0, 0.005],
    width: 0.0040, flat: 0.5, profile: STRAP,
    fn: 'Lifts the upper lip, deepening the fold that runs from the nose to the corner of the mouth.',
    or: 'Zygomatic bone, in front of zygomaticus major',
    ins: 'Skin of the upper lip',
    nerve: 'Zygomatic branch of the facial nerve (CN VII)',
  },
  {
    id: 'risorius', name: 'Risorius', region: 'Face',
    group: 'head', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.0540, 1.6254, 0.0430], [0.0390, 1.6242, 0.0720], [0.0262, 1.6244, 0.0828],
    ],
    alignRadial: [0, 0.005],
    width: 0.0046, flat: 0.38, profile: STRAP,
    fn: 'Pulls the corner of the mouth straight sideways, producing a tight, closed smile or a grimace.',
    or: 'Fascia over the parotid gland and the masseter',
    ins: 'Skin at the corner of the mouth',
    nerve: 'Buccal branch of the facial nerve (CN VII)',
  },
  {
    id: 'orbicularis-oris', name: 'Orbicularis oris', region: 'Face',
    group: 'head', layer: 1, mirror: false, shape: 'tube',
    path: [
      [-0.0245, 1.6242, 0.0790], [-0.0140, 1.6378, 0.0865], [0, 1.6413, 0.0905],
      [0.0140, 1.6378, 0.0865], [0.0245, 1.6242, 0.0790], [0.0140, 1.6106, 0.0860],
      [0, 1.6071, 0.0895], [-0.0140, 1.6106, 0.0860], [-0.0245, 1.6242, 0.0790],
    ],
    alignRadial: [0, 0.005],
    width: 0.0092, flat: 0.34, squareness: 3.0,
    profile: [[0, 0.85], [0.5, 1.0], [1, 0.85]],
    fn: 'Closes and purses the lips. Everything that converges on the mouth blends into this ring, which is why so many muscles radiate away from it on a plate.',
    or: 'Encircles the mouth, with no bony attachment of its own',
    ins: 'Skin and mucous membrane of the lips',
    nerve: 'Buccal and mandibular branches of the facial nerve (CN VII)',
  },
  {
    id: 'depressor-anguli-oris', name: 'Depressor anguli oris', region: 'Face',
    group: 'head', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.0330, 1.5935, 0.0690], [0.0295, 1.6100, 0.0790], [0.0255, 1.6224, 0.0830],
    ],
    alignRadial: [0, 0.005],
    width: 0.0060, flat: 0.45, profile: TAPERED,
    fn: 'Pulls the corner of the mouth down. The muscle of a frown, and of the turned-down mouth of sadness.',
    or: 'Oblique line of the mandible',
    ins: 'Corner of the mouth',
    nerve: 'Mandibular branch of the facial nerve (CN VII)',
  },
  {
    id: 'mentalis', name: 'Mentalis', region: 'Face',
    group: 'head', layer: 1, mirror: true, shape: 'tube',
    path: [
      [0.0075, 1.5864, 0.0765], [0.0095, 1.5970, 0.0830], [0.0105, 1.6047, 0.0855],
    ],
    alignRadial: [0, 0.005],
    width: 0.0052, flat: 0.55, profile: STRAP,
    fn: 'Lifts and pushes out the lower lip, wrinkling the chin. The muscle that makes a pout, and the one that quivers before crying.',
    or: 'Incisive fossa of the mandible',
    ins: 'Skin of the chin',
    nerve: 'Mandibular branch of the facial nerve (CN VII)',
  },
  {
    id: 'platysma', name: 'Platysma', region: 'Neck',
    group: 'neck', layer: 1, mirror: true, shape: 'sheet',
    origin: [
      [0.0180, 1.5852, 0.0720], [0.0400, 1.5994, 0.0480], [0.0555, 1.6088, 0.0080],
    ],
    insertion: [
      [0.0340, 1.4720, 0.0640], [0.0760, 1.4749, 0.0330], [0.1080, 1.4770, -0.0180],
    ],
    thickness: 0.0055, bulge: 0.006, uSeg: 18, vSeg: 14,
    fn: 'A broad sheet just under the skin of the neck. Tenses the skin of the neck and pulls the corner of the mouth down, as in a look of horror or strain.',
    or: 'Fascia over the upper chest and shoulder',
    ins: 'Lower border of the mandible and the skin of the lower face',
    nerve: 'Cervical branch of the facial nerve (CN VII)',
  },
];
