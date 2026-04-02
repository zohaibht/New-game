import { useState, useEffect, useCallback, useRef, MouseEvent, TouchEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Shield, Zap, Trophy, Play, RotateCcw, Pause, Star } from 'lucide-react';

// --- Constants ---
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 40;
const OBSTACLE_SIZE = 40;
const INITIAL_SPEED = 3;
const SPEED_INCREMENT = 0.1;

type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

interface Obstacle {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: 'asteroid' | 'powerup';
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2 - PLAYER_SIZE / 2);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [level, setLevel] = useState(1);
  const [shieldActive, setShieldActive] = useState(false);
  
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const obstacleIdRef = useRef(0);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('cosmic-voyager-highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('cosmic-voyager-highscore', score.toString());
    }
  }, [score, highScore]);

  const startGame = () => {
    setGameState('PLAYING');
    setScore(0);
    setLevel(1);
    setObstacles([]);
    setPlayerX(GAME_WIDTH / 2 - PLAYER_SIZE / 2);
    setShieldActive(false);
    lastTimeRef.current = performance.now();
  };

  const spawnObstacle = useCallback(() => {
    const isPowerup = Math.random() > 0.95;
    const newObstacle: Obstacle = {
      id: obstacleIdRef.current++,
      x: Math.random() * (GAME_WIDTH - OBSTACLE_SIZE),
      y: -OBSTACLE_SIZE,
      speed: INITIAL_SPEED + (level * 0.5),
      type: isPowerup ? 'powerup' : 'asteroid',
    };
    setObstacles(prev => [...prev, newObstacle]);
  }, [level]);

  const updateGame = useCallback((time: number) => {
    if (gameState !== 'PLAYING') return;

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Spawn obstacles
    if (Math.random() < 0.02 + (level * 0.005)) {
      spawnObstacle();
    }

    setObstacles(prev => {
      const nextObstacles = prev
        .map(obj => ({ ...obj, y: obj.y + obj.speed }))
        .filter(obj => obj.y < GAME_HEIGHT);

      // Collision detection
      for (const obj of nextObstacles) {
        const playerRect = { x: playerX, y: GAME_HEIGHT - 80, w: PLAYER_SIZE, h: PLAYER_SIZE };
        const objRect = { x: obj.x, y: obj.y, w: OBSTACLE_SIZE, h: OBSTACLE_SIZE };

        if (
          playerRect.x < objRect.x + objRect.w &&
          playerRect.x + playerRect.w > objRect.x &&
          playerRect.y < objRect.y + objRect.h &&
          playerRect.y + playerRect.h > objRect.y
        ) {
          if (obj.type === 'powerup') {
            setShieldActive(true);
            setTimeout(() => setShieldActive(false), 5000);
            return nextObstacles.filter(o => o.id !== obj.id);
          } else if (!shieldActive) {
            setGameState('GAMEOVER');
            return [];
          } else {
            // Shield hit
            setShieldActive(false);
            return nextObstacles.filter(o => o.id !== obj.id);
          }
        }
      }

      return nextObstacles;
    });

    setScore(prev => {
      const nextScore = prev + 1;
      if (nextScore % 500 === 0) setLevel(l => l + 1);
      return nextScore;
    });

    gameLoopRef.current = requestAnimationFrame(updateGame);
  }, [gameState, level, playerX, shieldActive, spawnObstacle]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      gameLoopRef.current = requestAnimationFrame(updateGame);
    } else {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, updateGame]);

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (gameState !== 'PLAYING') return;
    
    let clientX;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      const rect = gameContainer.getBoundingClientRect();
      const relativeX = clientX - rect.left - PLAYER_SIZE / 2;
      setPlayerX(Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, relativeX)));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans select-none">
      {/* Background Stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -10, opacity: Math.random() }}
            animate={{ 
              y: GAME_HEIGHT + 1000,
              opacity: [0.2, 0.8, 0.2]
            }}
            transition={{ 
              duration: 5 + Math.random() * 10, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 10
            }}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 3,
              height: Math.random() * 3,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Game Header */}
      <div className="mb-6 text-center z-10">
        <h1 className="text-4xl md:text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tighter mb-2">
          COSMIC VOYAGER
        </h1>
        <div className="flex gap-8 justify-center text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span>BEST: {highScore}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-cyan-400" />
            <span>SCORE: {score}</span>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div 
        id="game-container"
        className="relative bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/10 cursor-none"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
      >
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 p-8 text-center"
            >
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="mb-8"
              >
                <Rocket className="w-20 h-20 text-cyan-400" />
              </motion.div>
              <h2 className="text-2xl font-display font-bold mb-4">READY FOR LIFTOFF?</h2>
              <p className="text-slate-400 mb-8">Dodge the asteroids and collect powerups to survive the void.</p>
              <button 
                onClick={startGame}
                className="group relative px-8 py-4 bg-cyan-500 text-slate-950 font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                <span className="relative flex items-center gap-2">
                  <Play className="w-5 h-5 fill-current" />
                  START MISSION
                </span>
              </button>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 p-8 text-center"
            >
              <h2 className="text-4xl font-display font-bold text-red-500 mb-2">MISSION FAILED</h2>
              <p className="text-slate-400 mb-6">Your ship was lost in the cosmos.</p>
              
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 w-full">
                <div className="text-sm text-slate-500 uppercase tracking-widest mb-1">Final Score</div>
                <div className="text-4xl font-display font-bold text-white mb-4">{score}</div>
                {score >= highScore && score > 0 && (
                  <div className="text-yellow-500 text-sm font-bold flex items-center justify-center gap-1">
                    <Trophy className="w-4 h-4" /> NEW HIGH SCORE!
                  </div>
                )}
              </div>

              <button 
                onClick={startGame}
                className="flex items-center gap-2 px-8 py-4 bg-white text-slate-950 font-bold rounded-full transition-all hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                RETRY MISSION
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Elements */}
        {gameState === 'PLAYING' && (
          <>
            {/* Player */}
            <motion.div
              className="absolute bottom-20 z-10"
              animate={{ x: playerX }}
              transition={{ type: 'spring', damping: 20, stiffness: 300, mass: 0.5 }}
            >
              <div className="relative">
                <Rocket className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                {shieldActive && (
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute -inset-2 border-2 border-cyan-400 rounded-full bg-cyan-400/10"
                  />
                )}
                {/* Engine Flame */}
                <motion.div 
                  animate={{ height: [15, 25, 15], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 0.1, repeat: Infinity }}
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3 bg-gradient-to-t from-transparent via-orange-500 to-yellow-400 rounded-full"
                />
              </div>
            </motion.div>

            {/* Obstacles */}
            {obstacles.map(obj => (
              <div
                key={obj.id}
                className="absolute"
                style={{ left: obj.x, top: obj.y, width: OBSTACLE_SIZE, height: OBSTACLE_SIZE }}
              >
                {obj.type === 'asteroid' ? (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="w-full h-full bg-slate-700 rounded-lg border-2 border-slate-600 flex items-center justify-center overflow-hidden"
                  >
                    <div className="w-2 h-2 bg-slate-800 rounded-full absolute top-1 left-2" />
                    <div className="w-3 h-3 bg-slate-800 rounded-full absolute bottom-2 right-1" />
                  </motion.div>
                ) : (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-full h-full bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                  >
                    <Shield className="w-6 h-6 text-slate-950" />
                  </motion.div>
                )}
              </div>
            ))}

            {/* Level Indicator */}
            <div className="absolute top-4 right-4 bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800 text-xs font-bold text-cyan-400">
              LVL {level}
            </div>
          </>
        )}
      </div>

      {/* Controls Info */}
      <div className="mt-8 text-slate-500 text-sm flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-slate-700 rounded-sm" />
            <span>Avoid Asteroids</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-cyan-500 rounded-full" />
            <span>Shield Powerup</span>
          </div>
        </div>
        <p className="mt-2">Move mouse or touch to control ship</p>
      </div>
    </div>
  );
}
