"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades + slides its children into view when it first intersects the viewport.
 * Triggers once. `delay` in ms enables staggering sibling reveals.
 */
export function FadeIn({
  children,
  delay = 0,
  as: Tag = "div",
  className,
  offset = 24,
}: {
  children: React.ReactNode;
  delay?: number;
  as?: "div" | "section" | "li" | "article" | "header";
  className?: string;
  offset?: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${offset}px)`,
        transition: `opacity 720ms cubic-bezier(0.2, 0.7, 0.3, 1) ${delay}ms, transform 720ms cubic-bezier(0.2, 0.7, 0.3, 1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}
