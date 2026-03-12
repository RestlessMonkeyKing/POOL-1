import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Users, Hash, Play, RefreshCw, LogOut } from "lucide-react";
import confetti from "canvas-confetti";
import PoolTable from "./components/PoolTable";
import { Ball, GameState } from "./types";
import { initialBalls } from "./physics";

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState("");
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    balls: initialBalls(),
    turn: "",
    players: [],
    status: "waiting",
    winner: null,
    playerType: {},
  });

  const [remoteShot, setRemoteShot] = useState<{ angle: number; power: number } | null>(null);
  const ballsRef = useRef<Ball[]>(gameState.balls);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("game-start", (data) => {
      setGameState((prev) => ({
        ...prev,
        players: data.players,
        turn: data.turn,
        status: "playing",
      }));
    });

    newSocket.on("opponent-shot", (data) => {
      setRemoteShot(data);
    });

    newSocket.on("state-synced", (data) => {
      setGameState((prev) => ({
        ...prev,
        balls: data.balls,
        turn: data.nextTurn,
      }));
      ballsRef.current = data.balls;
    });

    newSocket.on("player-disconnected", () => {
      setGameState((prev) => ({ ...prev, status: "waiting", players: [newSocket.id!] }));
      alert("Opponent disconnected");
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinRoom = () => {
    if (roomId && socket) {
      socket.emit("join-room", roomId);
      setJoinedRoom(roomId);
    }
  };

  const handleShot = (angle: number, power: number) => {
    if (socket && joinedRoom) {
      socket.emit("shot", { roomId: joinedRoom, angle, power });
    }
  };

  const handleTurnEnd = (finalBalls: Ball[]) => {
    if (socket && joinedRoom && gameState.turn === socket.id) {
      const nextTurn = gameState.players.find((id) => id !== socket.id) || socket.id;
      
      // Respawn cue ball if potted
      let updatedBalls = [...finalBalls];
      const cueBall = updatedBalls.find(b => b.type === 'cue');
      if (cueBall?.isPotted) {
        cueBall.isPotted = false;
        cueBall.position = { x: 200, y: 200 }; // Default position
        cueBall.velocity = { x: 0, y: 0 };
      }

      // Check for win condition (8-ball potted)
      const eightBall = updatedBalls.find(b => b.type === 'black');
      if (eightBall?.isPotted) {
        setGameState(prev => ({ ...prev, status: 'finished', winner: socket.id! }));
        confetti();
      }

      socket.emit("sync-state", {
        roomId: joinedRoom,
        balls: updatedBalls,
        nextTurn,
      });
      
      setGameState(prev => ({ ...prev, balls: updatedBalls, turn: nextTurn }));
      ballsRef.current = updatedBalls;
      setRemoteShot(null); // Reset remote shot
    }
  };

  const isMyTurn = socket?.id === gameState.turn;

  return (
    <div className="min-h-screen bg-[#1c1917] text-stone-200 font-sans selection:bg-emerald-500/30">
      <AnimatePresence mode="wait">
        {!joinedRoom ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-6"
          >
            <div className="max-w-md w-full space-y-8 bg-stone-900/50 p-10 rounded-[2.5rem] border border-stone-800 backdrop-blur-xl shadow-2xl">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 bg-emerald-500/10 rounded-3xl mb-4">
                  <Users className="w-10 h-10 text-emerald-500" />
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-white italic uppercase">
                  Pigeon Pool
                </h1>
                <p className="text-stone-500 font-medium">Real-time Multiplayer 8-Ball</p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Enter Room Code"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    className="w-full bg-stone-950 border border-stone-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono text-lg tracking-widest uppercase"
                  />
                </div>
                <button
                  onClick={joinRoom}
                  disabled={!roomId}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 text-lg"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Join Game
                </button>
              </div>

              <div className="pt-6 border-t border-stone-800 text-center">
                <p className="text-xs text-stone-600 uppercase tracking-[0.2em] font-bold">
                  Online Multiplayer • No Bots
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-screen p-4 space-y-6"
          >
            <div className="w-full max-w-4xl flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <div className="bg-stone-900 p-3 rounded-2xl border border-stone-800 flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${gameState.status === 'playing' ? 'bg-emerald-500 animate-pulse' : 'bg-stone-700'}`} />
                  <span className="font-mono text-sm font-bold tracking-wider text-stone-400">
                    ROOM: {joinedRoom}
                  </span>
                </div>
                <div className="bg-stone-900 p-3 rounded-2xl border border-stone-800 flex items-center gap-3">
                  <Users className="w-4 h-4 text-stone-500" />
                  <span className="font-mono text-sm font-bold text-stone-400">
                    {gameState.players.length}/2
                  </span>
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="p-3 bg-stone-900 hover:bg-stone-800 rounded-2xl border border-stone-800 transition-colors text-stone-500 hover:text-white"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {gameState.status === "waiting" ? (
              <div className="flex flex-col items-center space-y-6 py-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                  <RefreshCw className="w-20 h-20 text-emerald-500 animate-spin relative" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">
                    Waiting for Opponent
                  </h2>
                  <p className="text-stone-500 font-medium">Share code <span className="text-emerald-500 font-mono font-bold">{joinedRoom}</span> with a friend</p>
                </div>
              </div>
            ) : gameState.status === "finished" ? (
              <div className="flex flex-col items-center space-y-8 py-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full" />
                  <Trophy className="w-32 h-32 text-yellow-500 relative drop-shadow-2xl" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-5xl font-black text-white italic uppercase tracking-tight">
                    {gameState.winner === socket?.id ? "You Won!" : "Opponent Won"}
                  </h2>
                  <p className="text-stone-500 font-medium">Game Over</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-white text-black font-black px-10 py-4 rounded-2xl hover:scale-105 transition-transform uppercase tracking-widest"
                >
                  Play Again
                </button>
              </div>
            ) : (
              <div className="space-y-8 w-full flex flex-col items-center">
                <div className="flex gap-8 w-full max-w-2xl justify-center">
                  <div className={`flex flex-col items-center p-4 rounded-3xl border-2 transition-all ${isMyTurn ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-stone-900/50 border-stone-800 opacity-50'}`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-1">Player 1 (You)</span>
                    <span className="text-xl font-bold text-white">YOU</span>
                  </div>
                  <div className="flex items-center text-stone-700 font-black italic text-2xl">VS</div>
                  <div className={`flex flex-col items-center p-4 rounded-3xl border-2 transition-all ${!isMyTurn ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-stone-900/50 border-stone-800 opacity-50'}`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-1">Player 2</span>
                    <span className="text-xl font-bold text-white">OPPONENT</span>
                  </div>
                </div>

                <PoolTable
                  balls={gameState.balls}
                  setBalls={(balls) => setGameState((prev) => ({ ...prev, balls }))}
                  isMyTurn={isMyTurn}
                  onShot={handleShot}
                  onTurnEnd={handleTurnEnd}
                  remoteShot={remoteShot}
                />
                
                <div className="text-center">
                  <p className="text-stone-600 font-mono text-xs uppercase tracking-[0.3em] font-bold">
                    {isMyTurn ? "Your Turn - Aim and Shoot" : "Waiting for opponent's move..."}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
