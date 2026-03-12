"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, useEffect } from "react";
import Lenis from "lenis";
import { appEnv } from "@/lib/env/app-env";

const convexClient = appEnv.isConvexConfigured
  ? new ConvexReactClient(appEnv.NEXT_PUBLIC_CONVEX_URL!)
  : null;

function LenisBoot() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    });

    let frame = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  if (!convexClient) {
    return (
      <>
        <LenisBoot />
        {children}
      </>
    );
  }

  return (
    <ConvexProvider client={convexClient}>
      <LenisBoot />
      {children}
    </ConvexProvider>
  );
}
