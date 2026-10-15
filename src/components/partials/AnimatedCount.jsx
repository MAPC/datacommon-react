import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

const AnimatedCount = ({
  as: Tag = "span",
  end = 0,
  suffix = "",
  duration = 1200,
  className = "",
  ...rest
}) => {
  const [value, setValue] = useState(0);
  const nodeRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return undefined;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setValue(end);
      return undefined;
    }

    const animate = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - progress) ** 3;
        setValue(Math.round(end * eased));
        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [duration, end]);

  return (
    <Tag ref={nodeRef} className={className} {...rest}>
      {value}
      {suffix}
    </Tag>
  );
};

AnimatedCount.propTypes = {
  as: PropTypes.elementType,
  end: PropTypes.number,
  suffix: PropTypes.string,
  duration: PropTypes.number,
  className: PropTypes.string,
};

export default AnimatedCount;
