"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

type AnimatedValueProps = {
  value: number;
  suffix?: string;
  className?: string;
};

export function AnimatedValue({ value, suffix = "", className }: AnimatedValueProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = ref.current;
    if (!target) {
      return;
    }

    const counter = { value: 0 };
    const tween = gsap.to(counter, {
      value,
      duration: 1.2,
      ease: "power3.out",
      onUpdate: () => {
        target.textContent = `${Math.round(counter.value)}${suffix}`;
      },
    });

    return () => {
      tween.kill();
    };
  }, [suffix, value]);

  return <span ref={ref} className={className}>{`0${suffix}`}</span>;
}
