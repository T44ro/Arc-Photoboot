"use client";
// UPDATE: Import tipe 'Variants'
import { motion, Variants } from "framer-motion";

type MascotStatus = "idle" | "countdown" | "processing" | "result";

interface MascotProps {
  status: MascotStatus;
}

export default function Mascot({ status }: MascotProps) {
  // UPDATE: Definisikan tipe variabel ini sebagai 'Variants'
  const variants: Variants = {
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
      transition: { duration: 0.8, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" },
    },
  };

  const getExpression = () => {
    switch (status) {
      case "idle": return "👾";
      case "countdown": return "😲";
      case "processing": return "🤔";
      case "result": return "🤩";
      default: return "👾";
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={status}
        className="absolute -top-16 bg-white text-black px-4 py-2 rounded-xl border-4 border-black font-bold whitespace-nowrap z-10"
        style={{ boxShadow: "4px 4px 0px var(--neon-pink)" }}
      >
        {status === "idle" && "Ayo Foto!"}
        {status === "countdown" && "Siap-siap!"}
        {status === "processing" && "Sebentar..."}
        {status === "result" && "Keren Abis!"}
      </motion.div>

      <motion.div
        variants={variants}
        animate={status}
        className="text-[8rem] filter drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] cursor-pointer"
      >
        {getExpression()}
      </motion.div>
      
      <div className="w-24 h-4 bg-black/30 rounded-[50%] blur-sm -mt-2.5" />
    </div>
  );
}