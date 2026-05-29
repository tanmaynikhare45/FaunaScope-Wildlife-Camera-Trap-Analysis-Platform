import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import cn from "../../lib/utils";

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".75rem",
    paddingRight: ".75rem",
    scale: 1,
  },
  animate: (isSelected) => ({
    gap: isSelected ? ".75rem" : 0,
    paddingLeft: isSelected ? "1.25rem" : ".75rem",
    paddingRight: isSelected ? "1.25rem" : ".75rem",
    scale: isSelected ? 1.02 : 1,
  }),
};

const spanVariants = {
  initial: { 
    width: 0, 
    opacity: 0,
    x: -10,
  },
  animate: { 
    width: "auto", 
    opacity: 1,
    x: 0,
  },
  exit: { 
    width: 0, 
    opacity: 0,
    x: -10,
  },
};

const iconVariants = {
  initial: { scale: 1 },
  animate: { scale: 1.1 },
  hover: { scale: 1.15 },
};

const backgroundVariants = {
  initial: { 
    opacity: 0,
    scale: 0.8,
  },
  animate: { 
    opacity: 1,
    scale: 1,
  },
};

const transition = { 
  type: "spring", 
  bounce: 0.1, 
  duration: 0.5 
};

export function ExpandableTabs({
  tabs,
  className = "",
  activeColor = "text-white",
  activeBgColor = "bg-green-800",
  inactiveColor = "text-gray-600",
  onChange,
}) {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const outsideClickRef = useRef(null);

  useOnClickOutside(outsideClickRef, () => {
    setSelected(null);
    onChange?.(null);
  });

  const handleSelect = (index) => {
    setSelected(index);
    onChange?.(index);
  };

  const Separator = () => (
    <motion.div 
      className="mx-2 h-6 w-[1.2px] bg-gradient-to-b from-transparent via-gray-300 to-transparent"
      aria-hidden="true"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    />
  );

  return (
    <motion.div
      ref={outsideClickRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-200/50 p-1.5 shadow-inner",
        className
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <Separator key={`separator-${index}`} />;
        }

        const Icon = tab.icon;
        const isSelected = selected === index;
        const isHovered = hovered === index;

        return (
          <motion.button
            key={tab.title}
            variants={buttonVariants}
            initial="initial"
            animate="animate"
            custom={isSelected}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleSelect(index)}
            transition={transition}
            className={cn(
              "relative flex items-center rounded-xl py-2.5 font-medium transition-all duration-300 overflow-hidden",
              "shadow-sm hover:shadow-md",
              isSelected
                ? cn(activeColor, activeBgColor, "shadow-lg")
                : cn(inactiveColor, "hover:text-gray-900 hover:bg-gray-100")
            )}
          >
            {/* Animated background */}
            {isSelected && (
              <motion.div
                variants={backgroundVariants}
                initial="initial"
                animate="animate"
                transition={{ ...transition, duration: 0.4 }}
                className="absolute inset-0 rounded-xl bg-green-800"
              />
            )}

            {/* Hover background */}
            {isHovered && !isSelected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-xl bg-green-800/5"
              />
            )}

            {/* Glow effect for active state */}
            {isSelected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="absolute inset-0 rounded-xl bg-green-600/20 blur-sm"
              />
            )}

            {/* Content */}
            <motion.div
              variants={iconVariants}
              initial="initial"
              animate={isSelected || isHovered ? "animate" : "initial"}
              whileHover="hover"
              className="relative z-10 flex items-center"
            >
              <Icon size={18} className="flex-shrink-0" />
              
              <AnimatePresence mode="wait">
                {isSelected && (
                  <motion.span
                    key={`text-${tab.title}`}
                    variants={spanVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={transition}
                    className="overflow-hidden whitespace-nowrap font-semibold text-sm ml-2"
                  >
                    {tab.title}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Ripple effect on click */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 rounded-xl bg-white/30"
              />
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}