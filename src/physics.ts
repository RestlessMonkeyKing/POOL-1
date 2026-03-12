import { Ball, Vector, BallType } from "./types";
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  BALL_RADIUS,
  FRICTION,
  WALL_BOUNCE,
  BALL_BOUNCE,
  MIN_VELOCITY,
  POCKETS,
  POCKET_RADIUS,
} from "./constants";

export const updateBall = (ball: Ball) => {
  if (ball.isPotted) return ball;

  let { position, velocity } = ball;

  // Update position
  position.x += velocity.x;
  position.y += velocity.y;

  // Apply friction
  velocity.x *= FRICTION;
  velocity.y *= FRICTION;

  // Stop if slow
  if (Math.abs(velocity.x) < MIN_VELOCITY) velocity.x = 0;
  if (Math.abs(velocity.y) < MIN_VELOCITY) velocity.y = 0;

  // Wall collisions
  if (position.x - BALL_RADIUS < 0) {
    position.x = BALL_RADIUS;
    velocity.x *= -WALL_BOUNCE;
  } else if (position.x + BALL_RADIUS > TABLE_WIDTH) {
    position.x = TABLE_WIDTH - BALL_RADIUS;
    velocity.x *= -WALL_BOUNCE;
  }

  if (position.y - BALL_RADIUS < 0) {
    position.y = BALL_RADIUS;
    velocity.y *= -WALL_BOUNCE;
  } else if (position.y + BALL_RADIUS > TABLE_HEIGHT) {
    position.y = TABLE_HEIGHT - BALL_RADIUS;
    velocity.y *= -WALL_BOUNCE;
  }

  return { ...ball, position, velocity };
};

export const checkBallCollision = (b1: Ball, b2: Ball) => {
  if (b1.isPotted || b2.isPotted) return null;

  const dx = b2.position.x - b1.position.x;
  const dy = b2.position.y - b1.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < BALL_RADIUS * 2) {
    // Collision detected
    const angle = Math.atan2(dy, dx);
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    // Rotate velocities
    const v1 = {
      x: b1.velocity.x * cos + b1.velocity.y * sin,
      y: b1.velocity.y * cos - b1.velocity.x * sin,
    };
    const v2 = {
      x: b2.velocity.x * cos + b2.velocity.y * sin,
      y: b2.velocity.y * cos - b2.velocity.x * sin,
    };

    // Elastic collision
    const temp = v1.x;
    v1.x = v2.x * BALL_BOUNCE;
    v2.x = temp * BALL_BOUNCE;

    // Rotate back
    b1.velocity.x = v1.x * cos - v1.y * sin;
    b1.velocity.y = v1.y * cos + v1.x * sin;
    b2.velocity.x = v2.x * cos - v2.y * sin;
    b2.velocity.y = v2.y * cos + v2.x * sin;

    // Separate balls to prevent sticking
    const overlap = BALL_RADIUS * 2 - distance;
    b1.position.x -= (overlap / 2) * cos;
    b1.position.y -= (overlap / 2) * sin;
    b2.position.x += (overlap / 2) * cos;
    b2.position.y += (overlap / 2) * sin;

    return [b1, b2];
  }
  return null;
};

export const checkPocket = (ball: Ball): boolean => {
  for (const pocket of POCKETS) {
    const dx = ball.position.x - pocket.x;
    const dy = ball.position.y - pocket.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < POCKET_RADIUS) {
      return true;
    }
  }
  return false;
};

export const initialBalls = (): Ball[] => {
  const balls: Ball[] = [];
  
  // Cue ball
  balls.push({
    id: 0,
    type: "cue",
    position: { x: TABLE_WIDTH / 4, y: TABLE_HEIGHT / 2 },
    velocity: { x: 0, y: 0 },
    isPotted: false,
    color: "#ffffff",
  });

  // Triangle rack
  const startX = (TABLE_WIDTH * 3) / 4;
  const startY = TABLE_HEIGHT / 2;
  const spacing = BALL_RADIUS * 2 + 1;

  let ballId = 1;
  const types: BallType[] = [
    "solid", "stripe", "solid", "stripe", "black", "solid", "stripe", "solid", "stripe", "solid", "stripe", "solid", "stripe", "solid", "stripe"
  ];
  // Shuffle types slightly but keep 8-ball in middle
  // For simplicity, let's just place them
  
  const rackPositions = [
    [0, 0],
    [1, -0.5], [1, 0.5],
    [2, -1], [2, 0], [2, 1],
    [3, -1.5], [3, -0.5], [3, 0.5], [3, 1.5],
    [4, -2], [4, -1], [4, 0], [4, 1], [4, 2]
  ];

  rackPositions.forEach((pos, index) => {
    let type: BallType = "solid";
    let color = "#ff0000";

    if (index === 4) {
      type = "black";
      color = "#000000";
    } else if (index % 2 === 0) {
      type = "solid";
      color = "#ffcc00";
    } else {
      type = "stripe";
      color = "#0033cc";
    }

    balls.push({
      id: ballId++,
      type,
      position: {
        x: startX + pos[0] * spacing * 0.866, // cos(30deg)
        y: startY + pos[1] * spacing,
      },
      velocity: { x: 0, y: 0 },
      isPotted: false,
      color,
    });
  });

  return balls;
};
