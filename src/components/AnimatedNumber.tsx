'use client';

import React, { useEffect, useRef } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  maximumFractionDigits?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({
  value,
  className = '',
  maximumFractionDigits = 0,
  prefix = '',
  suffix = '',
}: AnimatedNumberProps) {
  const motionVal = useMotionValue(value || 0);
  const springVal = useSpring(motionVal, { stiffness: 90, damping: 18 });
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionVal.set(Number(value) || 0);
  }, [value, motionVal]);

  useEffect(() => {
    const unsubscribe = springVal.on('change', (latest) => {
      if (spanRef.current) {
        const formatted = Number(latest).toLocaleString(undefined, {
          maximumFractionDigits,
          minimumFractionDigits: maximumFractionDigits > 0 ? maximumFractionDigits : 0,
        });
        spanRef.current.textContent = `${prefix}${formatted}${suffix}`;
      }
    });
    return () => unsubscribe();
  }, [springVal, maximumFractionDigits, prefix, suffix]);

  return (
    <span ref={spanRef} className={className}>
      {prefix}
      {(Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits })}
      {suffix}
    </span>
  );
}

export default AnimatedNumber;

