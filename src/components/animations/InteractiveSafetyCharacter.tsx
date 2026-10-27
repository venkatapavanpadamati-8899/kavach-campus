"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface InteractiveSafetyCharacterProps {
  isPasswordFocused?: boolean;
  isInputFocused?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  isSuccess?: boolean;
}

export function InteractiveSafetyCharacter({
  isPasswordFocused = false,
  isInputFocused = false,
  isError = false,
  isLoading = false,
  isSuccess = false,
}: InteractiveSafetyCharacterProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized mouse coords (-1 to 1) relative to center
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Pupil offsets based on mouse tracking or input focus
  const pupilX = isPasswordFocused ? 0 : isInputFocused ? 0 : mousePos.x * 6;
  const pupilY = isPasswordFocused ? 0 : isInputFocused ? 5 : mousePos.y * 4;

  return (
    <div
      style={{
        width: '130px',
        height: '130px',
        margin: '0 auto 16px auto',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {/* Ambient Glow */}
      <motion.div
        animate={{
          scale: isLoading ? [1, 1.15, 1] : [1, 1.05, 1],
          opacity: isError ? 0.6 : isSuccess ? 0.8 : 0.35,
        }}
        transition={{ repeat: Infinity, duration: isLoading ? 1 : 2.5, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: '-8px',
          borderRadius: '50%',
          background: isError
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%)'
            : isSuccess
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, transparent 70%)',
          filter: 'blur(12px)',
          zIndex: 0,
        }}
      />

      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'relative', zIndex: 1, overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="shieldGrad" x1="20" y1="15" x2="100" y2="105" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3b82f6" />
            <stop offset="0.5" stopColor="#1e3a8a" />
            <stop offset="1" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="pawGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60a5fa" />
            <stop offset="1" stopColor="#2563eb" />
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Character Base Body: Futuristic Campus Safety Shield */}
        <motion.path
          d="M60 14 C85 14 100 24 100 50 C100 82 60 106 60 106 C60 106 20 82 20 50 C20 24 35 14 60 14 Z"
          fill="url(#shieldGrad)"
          stroke="#60a5fa"
          strokeWidth="2.5"
          filter="url(#shadow)"
          animate={{
            y: [0, -3, 0],
            rotate: isError ? [-3, 3, -3, 3, 0] : 0,
          }}
          transition={{
            y: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
            rotate: { duration: 0.4 },
          }}
        />

        {/* Inner Shield Badge Line */}
        <path
          d="M60 22 C78 22 90 30 90 50 C90 75 60 94 60 94 C60 94 30 75 30 50 C30 30 42 22 60 22 Z"
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1.5"
        />

        {/* Left Eye Sclera */}
        <ellipse cx="44" cy="50" rx="10" ry="12" fill="#ffffff" />
        {/* Right Eye Sclera */}
        <ellipse cx="76" cy="50" rx="10" ry="12" fill="#ffffff" />

        {/* Left Pupil (Interactive) */}
        <motion.circle
          cx="44"
          cy="50"
          r="5"
          fill="#0f172a"
          animate={{
            x: pupilX,
            y: pupilY,
            scaleY: isPasswordFocused ? 0.1 : 1,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
        {/* Right Pupil (Interactive) */}
        <motion.circle
          cx="76"
          cy="50"
          r="5"
          fill="#0f172a"
          animate={{
            x: pupilX,
            y: pupilY,
            scaleY: isPasswordFocused ? 0.1 : 1,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />

        {/* Pupil Reflections (Catchlights) */}
        {!isPasswordFocused && (
          <>
            <circle cx={42 + pupilX * 0.7} cy={48 + pupilY * 0.7} r="1.8" fill="#ffffff" />
            <circle cx={74 + pupilX * 0.7} cy={48 + pupilY * 0.7} r="1.8" fill="#ffffff" />
          </>
        )}

        {/* Mouth/Visor expression */}
        <motion.path
          d={
            isError
              ? "M52 74 Q60 68 68 74"
              : isSuccess
              ? "M50 68 Q60 80 70 68"
              : "M52 70 Q60 76 68 70"
          }
          fill="none"
          stroke="#93c5fd"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{ scale: isSuccess ? 1.1 : 1 }}
        />

        {/* Left Shield Arm / Paw (Covers Left Eye on Password Focus) */}
        <motion.g
          animate={{
            x: isPasswordFocused ? 26 : 0,
            y: isPasswordFocused ? -18 : 0,
            rotate: isPasswordFocused ? 38 : 0,
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          style={{ transformOrigin: '20px 80px' }}
        >
          <ellipse cx="20" cy="74" rx="9" ry="12" fill="url(#pawGrad)" stroke="#93c5fd" strokeWidth="1.5" />
        </motion.g>

        {/* Right Shield Arm / Paw (Covers Right Eye on Password Focus) */}
        <motion.g
          animate={{
            x: isPasswordFocused ? -26 : 0,
            y: isPasswordFocused ? -18 : 0,
            rotate: isPasswordFocused ? -38 : 0,
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          style={{ transformOrigin: '100px 80px' }}
        >
          <ellipse cx="100" cy="74" rx="9" ry="12" fill="url(#pawGrad)" stroke="#93c5fd" strokeWidth="1.5" />
        </motion.g>

        {/* Antigravity Safety Crest on Forehead */}
        <path
          d="M60 27 L64 33 L56 33 Z"
          fill={isSuccess ? "#10b981" : "#60a5fa"}
        />
      </svg>
    </div>
  );
}
