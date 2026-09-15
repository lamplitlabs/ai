import { useEffect, useRef, useState, type ReactNode } from 'react';

/** True once the element has entered the viewport (stays true). Reduced-motion users see everything at once. */
export function useReveal<T extends HTMLElement>(threshold = 0.12) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export function Reveal({ children, className = '', stagger = false, id, as: Tag = 'div' }: { children: ReactNode; className?: string; stagger?: boolean; id?: string; as?: 'div' | 'section' | 'ul' }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <Tag ref={ref as never} id={id} className={`${stagger ? 'reveal-stagger' : 'reveal'} ${visible ? 'visible' : ''} ${className}`}>
      {children}
    </Tag>
  );
}
