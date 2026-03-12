export const TABLE_WIDTH = 800;
export const TABLE_HEIGHT = 400;
export const BALL_RADIUS = 10;
export const FRICTION = 0.985;
export const WALL_BOUNCE = 0.7;
export const BALL_BOUNCE = 0.9;
export const MIN_VELOCITY = 0.1;

export const COLORS = {
  CUE: "#ffffff",
  BLACK: "#000000",
  SOLIDS: [
    "#ffcc00", // 1
    "#0033cc", // 2
    "#cc0000", // 3
    "#660099", // 4
    "#ff6600", // 5
    "#006600", // 6
    "#990000", // 7
  ],
  STRIPES: [
    "#ffcc00", // 9
    "#0033cc", // 10
    "#cc0000", // 11
    "#660099", // 12
    "#ff6600", // 13
    "#006600", // 14
    "#990000", // 15
  ],
};

export const POCKETS = [
  { x: 0, y: 0 },
  { x: TABLE_WIDTH / 2, y: 0 },
  { x: TABLE_WIDTH, y: 0 },
  { x: 0, y: TABLE_HEIGHT },
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT },
  { x: TABLE_WIDTH, y: TABLE_HEIGHT },
];

export const POCKET_RADIUS = 25;
