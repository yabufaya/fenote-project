import { useLayoutEffect } from 'react';

// Public SPA only. The root class is added before paint; if JavaScript,
// IntersectionObserver, or MutationObserver is unavailable, no element is
// hidden. This is a progressive enhancement, not a requirement to see content.
const ROOT_CLASS = 'js-scroll-flow';
const VISIBLE_CLASS = 'is-visible';
const REVEAL_SELECTOR = '[data-reveal]';

export default function useScrollFlow() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    const body = document.body;
    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canObserve = typeof IntersectionObserver !== 'undefined'
      && typeof MutationObserver !== 'undefined';

    const showAll = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => el.classList.add(VISIBLE_CLASS));
    };

    if (!body || reduceMotion || !canObserve) {
      root.classList.remove(ROOT_CLASS);
      showAll();
      return undefined;
    }

    root.classList.add(ROOT_CLASS);

    const seen = new WeakSet();
    let active = true;

    // Reveal only when the element reaches the viewport. No global timer:
    // sections below the fold stay waiting until the user scrolls to them.
    const observer = new IntersectionObserver((entries) => {
      if (!active) return;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(VISIBLE_CLASS);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    const register = (node) => {
      if (!active || !(node instanceof Element)) return;
      const targets = [];
      if (node.matches(REVEAL_SELECTOR)) targets.push(node);
      node.querySelectorAll(REVEAL_SELECTOR).forEach((el) => targets.push(el));

      targets.forEach((el) => {
        if (seen.has(el) || el.classList.contains(VISIBLE_CLASS)) return;
        seen.add(el);
        observer.observe(el);
      });
    };

    register(body);

    // Content sections re-render after API/Realtime refreshes. New cards and
    // rows are picked up here and revealed with their own stagger delay.
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => register(node)));
    });
    mutations.observe(body, { childList: true, subtree: true });

    return () => {
      active = false;
      mutations.disconnect();
      observer.disconnect();
      root.classList.remove(ROOT_CLASS);
    };
  }, []);
}
