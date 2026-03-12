export type Vector = { x: number; y: number };

export type BallType = "cue" | "solid" | "stripe" | "black";

export interface Ball {
  id: number;
  type: BallType;
  position: Vector;
  velocity: Vector;
  isPotted: boolean;
  color: string;
}

export interface GameState {
  balls: Ball[];
  turn: string; // socket.id
  players: string[];
  status: "waiting" | "playing" | "finished";
  winner: string | null;
  playerType: { [socketId: string]: "solid" | "stripe" | null };
}
