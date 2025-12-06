"use client";
import { motion } from "framer-motion";

interface RetroButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  color?: "pink" | "cyan";
  disabled?: boolean;
}

export default function RetroButton({ onClick, children, color = "cyan", disabled }: RetroButtonProps) {
  const bgClass = color === "pink" ? "bg-[#ff00ff]" : "bg-[#00ffff]";
  const shadowColor = color === "pink" ? "#b300b3" : "#00cccc";

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95, y: 4 }} // Efek ditekan
      onClick={onClick}
      disabled={disabled}
      className={`
        ${bgClass} text-black font-black text-xl px-8 py-4 
        border-4 border-black rounded-lg relative uppercase tracking-widest
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      style={{
        boxShadow: `6px 6px 0px 0px ${shadowColor}, 6px 6px 0px 4px black`,
      }}
    >
      {children}
    </motion.button>
  );
}