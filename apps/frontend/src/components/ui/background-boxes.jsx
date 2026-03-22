import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const BoxesCore = ({ className, ...rest }) => {
  const rows = new Array(50).fill(1);
  const cols = new Array(70).fill(1);

  const colors = [
    "rgb(38,38,38)",    // neutral-800
    "rgb(30,30,30)",    // dark grey
    "rgb(45,45,45)",    // medium grey
    "rgb(24,24,27)",    // zinc-900
    "rgb(35,35,40)",    // cool dark
    "rgb(50,50,55)",    // lighter grey
    "rgb(28,28,32)",    // near-black
    "rgb(42,42,48)",    // steel
    "rgb(55,55,60)",    // silver-dark
  ];

  const getRandomColor = () => {
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div
      style={{
        transform: `translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)`,
      }}
      className={cn(
        "absolute left-1/4 p-4 -top-1/4 flex -translate-x-1/2 -translate-y-1/2 w-full h-full z-0",
        className
      )}
      {...rest}
    >
      {rows.map((_, i) => (
        <motion.div
          key={`row` + i}
          className="w-16 h-8 border-l border-white/[0.03] relative"
        >
          {cols.map((_, j) => (
            <motion.div
              whileHover={{
                backgroundColor: getRandomColor(),
                transition: { duration: 0 },
              }}
              animate={{
                transition: { duration: 2 },
              }}
              key={`col` + j}
              className="w-16 h-8 border-r border-t border-white/[0.03] relative"
            >
              {j % 2 === 0 && i % 2 === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="absolute h-6 w-10 -top-[14px] -left-[22px] text-white/[0.04] stroke-[1px] pointer-events-none"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m6-6H6"
                  />
                </svg>
              ) : null}
            </motion.div>
          ))}
        </motion.div>
      ))}
    </div>
  );
};

export const Boxes = React.memo(BoxesCore);
