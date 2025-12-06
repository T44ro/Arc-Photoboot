"use client";
import { motion } from "framer-motion";

type MascotStatus = "idle" | "countdown" | "processing" | "result";

interface MascotProps {
  status: MascotStatus;
}

export default function Mascot({ status }: MascotProps) {
  // Variasi animasi berdasarkan state
  const variants = {
    idle: {
      y: [0, -15, 0],
      rotate: [0, 2, -2, 0],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    },
    countdown: {
      scale: [1, 1.2, 1],
      y: [0, 0, 0],
      transition: { duration: 0.5, repeat: Infinity },
    },
    processing: {
      rotate: 360,
      transition: { duration: 1, repeat: Infinity, ease: "linear" },
    },
    result: {
      y: [0, -20, 0],
      scale: [1, 1.1, 1],
      transition: { type: "spring", stiffness: 300 },
    },
  };

  // Emoji sebagai representasi wajah maskot (bisa diganti Image/SVG)
  const getExpression = () => {
    switch (status) {
      case "idle": return "👾"; // Alien santai
      case "countdown": return "😲"; // Kaget/Siap
      case "processing": return "🤔"; // Mikir
      case "result": return "🤩"; // Mata berbinar
      default: return "👾";
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Speech Bubble */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={status} // Re-render animasi saat status berubah
        className="absolute -top-16 bg-white text-black px-4 py-2 rounded-xl border-4 border-black font-bold whitespace-nowrap z-10"
        style={{ boxShadow: "4px 4px 0px var(--neon-pink)" }}
      >
        {status === "idle" && "Ayo Foto!"}
        {status === "countdown" && "Siap-siap!"}
        {status === "processing" && "Sebentar..."}
        {status === "result" && "Keren Abis!"}
      </motion.div>

      {/* Badan Mascot */}
      <motion.div
        variants={variants}
        animate={status}
        className="text-[8rem] filter drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] cursor-pointer"
      >
        {getExpression()}
      </motion.div>
      
      {/* Shadow bawah */}
      <div className="w-24 h-4 bg-black/30 rounded-[50%] blur-sm mt-[-10px]" />
    </div>
  );
}