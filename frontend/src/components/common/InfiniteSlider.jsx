import { useRef, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

const InfiniteSlider = ({
  children,
  gap = 16,
  speed = 20, // smaller = faster
  speedOnHover,
  reverse = false,
  className = "",
}) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const controls = useAnimation();

  // Handle hover speed
  const handleMouseEnter = () => {
    if (speedOnHover && contentRef.current) {
      const scrollWidth = contentRef.current.scrollWidth / 2;
      controls.start({
        x: reverse ? scrollWidth : -scrollWidth,
        transition: { duration: speedOnHover, ease: "linear", repeat: Infinity, repeatType: "loop" },
      });
    }
  };

  const handleMouseLeave = () => {
    if (contentRef.current) {
      const scrollWidth = contentRef.current.scrollWidth / 2;
      controls.start({
        x: reverse ? scrollWidth : -scrollWidth,
        transition: { duration: speed, ease: "linear", repeat: Infinity, repeatType: "loop" },
      });
    }
  };

  // Start animation
  useEffect(() => {
    if (!contentRef.current) return;
    const scrollWidth = contentRef.current.scrollWidth / 2;

    controls.start({
      x: reverse ? scrollWidth : -scrollWidth,
      transition: { duration: speed, ease: "linear", repeat: Infinity, repeatType: "loop" },
    });
  }, [children, speed, reverse, controls]);

  return (
    <div
      ref={containerRef}
      className={`slider-container ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        ref={contentRef}
        className="slider-content"
        style={{ gap: `${gap}px` }}
        animate={controls}
      >
        {children}
        {children} {/* duplicate for seamless scroll */}
      </motion.div>
    </div>
  );
};

export default InfiniteSlider;
