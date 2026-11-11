import { useEffect, useRef } from 'react';
import { decimalPlaces, formatNumber, numericValue } from '../../utils/countValue';

const DEFAULT_DURATION = 1500;

export default function CountUp({
  value = 0,
  prefix = '',
  suffix = '',
  duration = DEFAULT_DURATION,
  className = '',
  ...props
}) {
  const target = numericValue(value);
  const decimals = decimalPlaces(value);
  const finalText = `${prefix}${formatNumber(target, decimals)}${suffix}`;
  const numberRef = useRef(null);
  const currentRef = useRef(0);
  const startedRef = useRef(false);
  const frameRef = useRef(0);

  useEffect(() => {
    const el = numberRef.current;
    if (!el || typeof window === 'undefined') return undefined;

    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canAnimate = !reduceMotion
      && typeof window.IntersectionObserver === 'function'
      && typeof window.requestAnimationFrame === 'function'
      && typeof window.cancelAnimationFrame === 'function';

    if (!canAnimate) {
      currentRef.current = target;
      el.textContent = finalText;
      return undefined;
    }

    // Before the number is scrolled into view it reads 0. Screen readers get
    // the final value once through the visually hidden span below.
    el.textContent = startedRef.current
      ? `${prefix}${formatNumber(currentRef.current, decimals)}${suffix}`
      : `${prefix}${formatNumber(0, decimals)}${suffix}`;

    let cancelled = false;
    const ms = Math.max(1, Number(duration) || DEFAULT_DURATION);

    const animateTo = (to) => {
      window.cancelAnimationFrame(frameRef.current);
      const from = currentRef.current;
      const startedAt = window.performance.now();

      const step = (now) => {
        if (cancelled) return;
        const progress = Math.min(1, (now - startedAt) / ms);
        const eased = 1 - Math.pow(1 - progress, 3);
        const next = from + (to - from) * eased;
        currentRef.current = next;
        el.textContent = `${prefix}${formatNumber(next, decimals)}${suffix}`;

        if (progress < 1) {
          frameRef.current = window.requestAnimationFrame(step);
        } else {
          currentRef.current = to;
          el.textContent = `${prefix}${formatNumber(to, decimals)}${suffix}`;
        }
      };

      frameRef.current = window.requestAnimationFrame(step);
    };

    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (!startedRef.current) {
          startedRef.current = true;
          currentRef.current = 0;
        }
        animateTo(target);
      });
    }, { threshold: 0.45, rootMargin: '0px 0px -5% 0px' });

    observer.observe(el);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameRef.current);
      observer.disconnect();
    };
  }, [target, decimals, duration, prefix, suffix, finalText]);

  return (
    <span className={className} {...props}>
      <span className="sr-only">{finalText}</span>
      <span aria-hidden="true" ref={numberRef}>{finalText}</span>
    </span>
  );
}
