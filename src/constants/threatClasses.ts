// ============================================================
// VisionGuard — COCO-SSD Class Prioritization
// ============================================================
// Classes are tiered by collision threat level for pedestrian navigation.
// Moving objects that can injure > stationary obstacles > irrelevant items.

/** High-threat moving objects — vehicles and fast movers */
export const MOVING_HIGH: ReadonlySet<string> = new Set([
  'car', 'truck', 'bus', 'motorcycle', 'bicycle',
]);

/** Medium-threat movers — people, animals */
export const MOVING_MEDIUM: ReadonlySet<string> = new Set([
  'person', 'dog', 'cat', 'horse',
]);

/** Low-threat static obstacles — things you might walk into */
export const STATIC_LOW: ReadonlySet<string> = new Set([
  'chair', 'bench', 'fire hydrant', 'stop sign', 'parking meter',
  'potted plant', 'suitcase', 'backpack', 'umbrella', 'handbag',
  'skateboard', 'surfboard', 'sports ball', 'bottle',
  'dining table', 'couch', 'bed', 'toilet',
]);

/** Objects to never announce — too small, irrelevant, or handheld */
export const IGNORE: ReadonlySet<string> = new Set([
  'book', 'cup', 'fork', 'knife', 'spoon', 'bowl',
  'banana', 'apple', 'sandwich', 'pizza', 'hot dog', 'donut', 'cake',
  'cell phone', 'laptop', 'mouse', 'keyboard', 'remote', 'tv',
  'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
  'wine glass', 'tie', 'frisbee', 'kite', 'baseball bat', 'baseball glove',
  'tennis racket', 'snowboard', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator',
]);

/**
 * Returns a numeric priority for a COCO-SSD class name.
 * Higher = more dangerous = announce first.
 *  4 = MOVING_HIGH
 *  3 = MOVING_MEDIUM
 *  2 = STATIC_LOW
 *  0 = IGNORE (never announce)
 *  1 = unknown class (announce conservatively)
 */
export function getClassPriority(className: string): number {
  if (MOVING_HIGH.has(className)) return 4;
  if (MOVING_MEDIUM.has(className)) return 3;
  if (STATIC_LOW.has(className)) return 2;
  if (IGNORE.has(className)) return 0;
  return 1; // unknown class — announce with low priority (safety-first)
}

/** Returns true if the class should be announced at all */
export function isAnnounceable(className: string): boolean {
  return !IGNORE.has(className);
}

/** Returns true if the class represents a fast-moving threat */
export function isMovingThreat(className: string): boolean {
  return MOVING_HIGH.has(className) || MOVING_MEDIUM.has(className);
}
