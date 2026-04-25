"use client";
import React, { useState } from "react";
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { cn } from "@/lib/utils";

export const AnimatedTooltip = ({
  items,
  className,
}: {
  items: {
    id: number;
    name: string;
    designation: string;
    image: string;
  }[];
  className?: string;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig
  );
  const handleMouseMove = (event: any) => {
    const halfWidth = event.target.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {items.map((item) => (
        <div
          className="-mr-2.5 relative group"
          key={item.name}
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence mode="popLayout">
            {hoveredIndex === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 10,
                  },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                style={{
                  translateX: translateX,
                  rotate: rotate,
                }}
                className="absolute -top-12 left-1/2 z-50 flex w-max max-w-42 -translate-x-1/2 flex-col items-center justify-center rounded-md bg-foreground px-2.5 py-1.5 text-xs shadow-xl"
              >
                <div className="absolute inset-x-10 z-30 w-[20%] -bottom-px bg-linear-to-r from-transparent via-emerald-500 to-transparent h-px" />
                <div className="absolute left-10 w-[40%] z-30 -bottom-px bg-linear-to-r from-transparent via-sky-500 to-transparent h-px" />
                <div className="relative z-30 max-w-37.5 truncate font-semibold text-background text-[11px]">
                  {item.name}
                </div>
                <div className="max-w-37.5 truncate text-[10px] text-muted-foreground">
                  {item.designation}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <img
            onMouseMove={handleMouseMove}
            src={item.image}
            alt={item.name}
            className="relative m-0! h-10 w-10 rounded-full object-cover object-top p-0! transition duration-500 group-hover:z-30 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
};