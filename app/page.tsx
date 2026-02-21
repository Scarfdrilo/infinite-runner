"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Obstacle {
  x: number;
  width: number;
  height: number;
}

export default function InfiniteRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Game state refs (to avoid stale closures)
  const gameStateRef = useRef(gameState);
  const playerRef = useRef({ y: 0, velocity: 0, isJumping: false });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const speedRef = useRef(5);
  const frameRef = useRef(0);
  const scoreRef = useRef(0);

  // Game constants
  const GROUND_Y = 300;
  const PLAYER_WIDTH = 40;
  const PLAYER_HEIGHT = 50;
  const PLAYER_X = 80;
  const GRAVITY = 0.8;
  const JUMP_FORCE = -15;

  const resetGame = useCallback(() => {
    playerRef.current = { y: GROUND_Y - PLAYER_HEIGHT, velocity: 0, isJumping: false };
    obstaclesRef.current = [];
    speedRef.current = 5;
    frameRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
  }, []);

  const jump = useCallback(() => {
    if (gameStateRef.current === "menu") {
      resetGame();
      setGameState("playing");
      gameStateRef.current = "playing";
      return;
    }

    if (gameStateRef.current === "gameover") {
      resetGame();
      setGameState("playing");
      gameStateRef.current = "playing";
      return;
    }

    if (!playerRef.current.isJumping) {
      playerRef.current.velocity = JUMP_FORCE;
      playerRef.current.isJumping = true;
    }
  }, [resetGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      // Clear canvas
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw ground
      ctx.fillStyle = "#16213e";
      ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

      // Draw ground line
      ctx.strokeStyle = "#e94560";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(canvas.width, GROUND_Y);
      ctx.stroke();

      if (gameStateRef.current === "menu") {
        // Draw menu
        ctx.fillStyle = "#e94560";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("INFINITE RUNNER", canvas.width / 2, 120);

        ctx.fillStyle = "#fff";
        ctx.font = "24px Arial";
        ctx.fillText("Presiona ESPACIO o toca para comenzar", canvas.width / 2, 200);

        // Draw idle player
        ctx.fillStyle = "#0f3460";
        ctx.fillRect(PLAYER_X, GROUND_Y - PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT);
        ctx.fillStyle = "#e94560";
        ctx.fillRect(PLAYER_X + 5, GROUND_Y - PLAYER_HEIGHT + 5, 10, 10);
        ctx.fillRect(PLAYER_X + 25, GROUND_Y - PLAYER_HEIGHT + 5, 10, 10);
      } else if (gameStateRef.current === "playing") {
        const player = playerRef.current;

        // Update player physics
        player.velocity += GRAVITY;
        player.y += player.velocity;

        // Ground collision
        if (player.y >= GROUND_Y - PLAYER_HEIGHT) {
          player.y = GROUND_Y - PLAYER_HEIGHT;
          player.velocity = 0;
          player.isJumping = false;
        }

        // Update obstacles
        frameRef.current++;
        if (frameRef.current % Math.max(60, 120 - Math.floor(speedRef.current * 5)) === 0) {
          const height = 30 + Math.random() * 40;
          obstaclesRef.current.push({
            x: canvas.width,
            width: 20 + Math.random() * 20,
            height: height,
          });
        }

        // Move and draw obstacles
        obstaclesRef.current = obstaclesRef.current.filter((obs) => {
          obs.x -= speedRef.current;
          
          // Draw obstacle
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(obs.x, GROUND_Y - obs.height, obs.width, obs.height);

          // Check collision
          if (
            PLAYER_X < obs.x + obs.width &&
            PLAYER_X + PLAYER_WIDTH > obs.x &&
            player.y + PLAYER_HEIGHT > GROUND_Y - obs.height
          ) {
            setHighScore((prev) => Math.max(prev, scoreRef.current));
            setGameState("gameover");
            gameStateRef.current = "gameover";
          }

          return obs.x > -obs.width;
        });

        // Increase speed over time
        speedRef.current = 5 + Math.floor(scoreRef.current / 500);

        // Update score
        scoreRef.current += 1;
        if (frameRef.current % 5 === 0) {
          setScore(scoreRef.current);
        }

        // Draw player
        ctx.fillStyle = "#0f3460";
        ctx.fillRect(PLAYER_X, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
        
        // Player eyes
        ctx.fillStyle = "#e94560";
        ctx.fillRect(PLAYER_X + 5, player.y + 5, 10, 10);
        ctx.fillRect(PLAYER_X + 25, player.y + 5, 10, 10);

        // Draw score
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`Score: ${scoreRef.current}`, 20, 40);
        ctx.fillText(`Speed: ${speedRef.current.toFixed(1)}x`, 20, 70);
      } else if (gameStateRef.current === "gameover") {
        // Draw obstacles (frozen)
        obstaclesRef.current.forEach((obs) => {
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(obs.x, GROUND_Y - obs.height, obs.width, obs.height);
        });

        // Draw player (frozen)
        ctx.fillStyle = "#0f3460";
        ctx.fillRect(PLAYER_X, playerRef.current.y, PLAYER_WIDTH, PLAYER_HEIGHT);
        ctx.fillStyle = "#e94560";
        ctx.fillRect(PLAYER_X + 5, playerRef.current.y + 5, 10, 10);
        ctx.fillRect(PLAYER_X + 25, playerRef.current.y + 5, 10, 10);

        // Game over text
        ctx.fillStyle = "#e94560";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, 120);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 32px Arial";
        ctx.fillText(`Score: ${scoreRef.current}`, canvas.width / 2, 180);
        ctx.fillText(`High Score: ${Math.max(highScore, scoreRef.current)}`, canvas.width / 2, 220);

        ctx.font = "24px Arial";
        ctx.fillText("Presiona ESPACIO para reiniciar", canvas.width / 2, 280);
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => cancelAnimationFrame(animationId);
  }, [highScore]);

  return (
    <main className="min-h-screen bg-[#0f0f23] flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-[#e94560] mb-4">🏃 Infinite Runner</h1>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        onClick={jump}
        className="border-4 border-[#e94560] rounded-lg cursor-pointer shadow-lg shadow-[#e94560]/20"
      />

      <div className="mt-4 text-white text-center">
        <p className="text-lg">Controles: <span className="text-[#e94560] font-bold">ESPACIO</span> o <span className="text-[#e94560] font-bold">CLICK</span> para saltar</p>
        <p className="text-sm text-gray-400 mt-2">Evita los obstáculos y consigue el mayor puntaje</p>
      </div>

      <div className="mt-6 flex gap-8 text-white">
        <div className="text-center">
          <p className="text-sm text-gray-400">Puntaje actual</p>
          <p className="text-3xl font-bold text-[#e94560]">{score}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-400">Mejor puntaje</p>
          <p className="text-3xl font-bold text-[#0f3460]">{highScore}</p>
        </div>
      </div>
    </main>
  );
}
