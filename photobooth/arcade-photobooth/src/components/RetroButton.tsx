"use client";
import { motion } from "framer-motion";

interface RetroButtonProps {
  // UPDATE: Tambahkan tanda '?' agar onClick tidak wajib
  onClick?: () => void; 
  children: React.ReactNode;
  color?: "pink" | "cyan" | "yellow"; 
  disabled?: boolean;
}

export default function RetroButton({ onClick, children, color = "cyan", disabled }: RetroButtonProps) {
  let bgClass = "bg-[#00ffff]"; 
  let shadowColor = "#00cccc";

  if (color === "pink") {
    bgClass = "bg-[#ff00ff]";
    shadowColor = "#b300b3";
  } else if (color === "yellow") {
    bgClass = "bg-[#ffff00]";
    shadowColor = "#b3b300";
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95, y: 4 }}
      // Jika onClick kosong (undefined), button tetap aman
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