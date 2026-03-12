import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Circle, Rect, Line, Group } from "react-konva";
import { Ball, Vector } from "../types";
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  BALL_RADIUS,
  POCKETS,
  POCKET_RADIUS,
} from "../constants";
import { updateBall, checkBallCollision, checkPocket } from "../physics";

interface PoolTableProps {
  balls: Ball[];
  setBalls: (balls: Ball[]) => void;
  isMyTurn: boolean;
  onShot: (angle: number, power: number) => void;
  onTurnEnd: (balls: Ball[]) => void;
  remoteShot: { angle: number; power: number } | null;
}

const PoolTable: React.FC<PoolTableProps> = ({
  balls,
  setBalls,
  isMyTurn,
  onShot,
  onTurnEnd,
  remoteShot,
}) => {
  const [cueAngle, setCueAngle] = useState(0);
  const [cuePower, setCuePower] = useState(0);
  const [isAiming, setIsAiming] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    if (remoteShot && !isMyTurn) {
      shoot(remoteShot.angle, remoteShot.power);
    }
  }, [remoteShot]);

  const cueBall = balls.find((b) => b.type === "cue");

  const handleMouseDown = (e: any) => {
    if (!isMyTurn || isMoving || !cueBall || cueBall.isPotted) return;
    setIsAiming(true);
  };

  const handleMouseMove = (e: any) => {
    if (!isAiming || !cueBall) return;
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    const dx = pointerPos.x - cueBall.position.x;
    const dy = pointerPos.y - cueBall.position.y;
    const angle = Math.atan2(dy, dx);
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    setCueAngle(angle);
    setCuePower(Math.min(dist / 2, 100));
  };

  const handleMouseUp = () => {
    if (!isAiming) return;
    setIsAiming(false);
    if (cuePower > 5) {
      onShot(cueAngle, cuePower);
      shoot(cueAngle, cuePower);
    }
    setCuePower(0);
  };

  const shoot = (angle: number, power: number) => {
    const strength = power / 5;
    const newBalls = balls.map((b) => {
      if (b.type === "cue") {
        return {
          ...b,
          velocity: {
            x: -Math.cos(angle) * strength,
            y: -Math.sin(angle) * strength,
          },
        };
      }
      return b;
    });
    setBalls(newBalls);
    setIsMoving(true);
  };

  useEffect(() => {
    if (!isMoving) return;

    const animate = () => {
      let currentBalls = [...balls];
      let stillMoving = false;

      // Update positions and check collisions
      for (let i = 0; i < currentBalls.length; i++) {
        currentBalls[i] = updateBall(currentBalls[i]);
        if (
          Math.abs(currentBalls[i].velocity.x) > 0 ||
          Math.abs(currentBalls[i].velocity.y) > 0
        ) {
          stillMoving = true;
        }

        // Check pockets
        if (!currentBalls[i].isPotted && checkPocket(currentBalls[i])) {
          currentBalls[i].isPotted = true;
          currentBalls[i].velocity = { x: 0, y: 0 };
        }
      }

      // Ball-ball collisions
      for (let i = 0; i < currentBalls.length; i++) {
        for (let j = i + 1; j < currentBalls.length; j++) {
          checkBallCollision(currentBalls[i], currentBalls[j]);
        }
      }

      setBalls(currentBalls);

      if (stillMoving) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setIsMoving(false);
        onTurnEnd(currentBalls);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isMoving]);

  return (
    <div className="relative bg-stone-800 p-4 rounded-3xl shadow-2xl border-8 border-stone-700">
      <Stage
        width={TABLE_WIDTH}
        height={TABLE_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="bg-emerald-800 rounded-xl overflow-hidden cursor-crosshair"
      >
        <Layer>
          {/* Table Surface */}
          <Rect
            width={TABLE_WIDTH}
            height={TABLE_HEIGHT}
            fill="#065f46"
            cornerRadius={10}
          />

          {/* Pockets */}
          {POCKETS.map((p, i) => (
            <Circle
              key={i}
              x={p.x}
              y={p.y}
              radius={POCKET_RADIUS}
              fill="#111"
            />
          ))}

          {/* Balls */}
          {balls.map((ball) => (
            !ball.isPotted && (
              <Group key={ball.id}>
                <Circle
                  x={ball.position.x}
                  y={ball.position.y}
                  radius={BALL_RADIUS}
                  fill={ball.color}
                  shadowBlur={5}
                  shadowColor="black"
                  shadowOpacity={0.5}
                />
                {ball.type === "stripe" && (
                  <Rect
                    x={ball.position.x - BALL_RADIUS}
                    y={ball.position.y - BALL_RADIUS / 2}
                    width={BALL_RADIUS * 2}
                    height={BALL_RADIUS}
                    fill="white"
                    opacity={0.8}
                  />
                )}
                {ball.type === "black" && (
                  <Circle
                    x={ball.position.x}
                    y={ball.position.y}
                    radius={BALL_RADIUS / 2}
                    fill="white"
                  />
                )}
              </Group>
            )
          ))}

          {/* Cue Stick */}
          {isMyTurn && !isMoving && cueBall && !cueBall.isPotted && isAiming && (
            <Group>
              <Line
                points={[
                  cueBall.position.x,
                  cueBall.position.y,
                  cueBall.position.x + Math.cos(cueAngle) * (cuePower + 50),
                  cueBall.position.y + Math.sin(cueAngle) * (cuePower + 50),
                ]}
                stroke="#d4d4d8"
                strokeWidth={4}
                lineCap="round"
              />
              {/* Aim Line */}
              <Line
                points={[
                  cueBall.position.x,
                  cueBall.position.y,
                  cueBall.position.x - Math.cos(cueAngle) * 500,
                  cueBall.position.y - Math.sin(cueAngle) * 500,
                ]}
                stroke="white"
                strokeWidth={1}
                dash={[10, 10]}
                opacity={0.3}
              />
            </Group>
          )}
        </Layer>
      </Stage>
      
      {isMyTurn && !isMoving && (
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest">
          Your Turn
        </div>
      )}
    </div>
  );
};

export default PoolTable;
