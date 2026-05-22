import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useState } from 'react';
import { cn } from '../../lib/utils';

const CONSTANTS = {
  itemSize: 52,
  containerSize: 270,
  openStagger: 0.025,
  closeStagger: 0.06,
};

const pointOnCircle = (i, n, r, cx = 0, cy = 0) => {
  const theta = (2 * Math.PI * i) / n - Math.PI / 2;
  return {
    x: cx + r * Math.cos(theta),
    y: cy + r * Math.sin(theta),
  };
};

const MenuItem = ({ icon, label, onClick, index, totalItems, isOpen, color }) => {
  const { x, y } = pointOnCircle(index, totalItems, CONSTANTS.containerSize / 2);
  const [hovering, setHovering] = useState(false);

  return (
    <button
      onClick={isOpen ? onClick : undefined}
      className={cn(
        'rounded-full flex items-center justify-center absolute cursor-pointer',
        'border transition-all duration-150',
        hovering
          ? 'bg-white/[0.12] border-white/30 scale-110'
          : 'bg-zinc-900/80 border-zinc-700/60'
      )}
      style={{ height: CONSTANTS.itemSize - 2, width: CONSTANTS.itemSize - 2 }}
    >
      <motion.div
        animate={{
          x: isOpen ? x : 0,
          y: isOpen ? y : 0,
        }}
        transition={{
          delay: isOpen ? index * CONSTANTS.openStagger : index * CONSTANTS.closeStagger,
          type: 'spring',
          stiffness: 300,
          damping: 28,
        }}
        style={{ height: CONSTANTS.itemSize - 2, width: CONSTANTS.itemSize - 2 }}
        className={cn(
          'rounded-full flex flex-col items-center justify-center absolute cursor-pointer shrink-0',
          'border transition-all duration-150',
          hovering
            ? 'bg-white/[0.10] border-white/30'
            : 'bg-zinc-900 border-zinc-700/50'
        )}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={isOpen ? onClick : undefined}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.95 }}
      >
        <span style={{ color: color || '#a1a1aa' }}>{icon}</span>
        <AnimatePresence>
          {hovering && isOpen && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full mt-1.5 text-[10px] font-semibold text-white whitespace-nowrap pointer-events-none"
              style={{ left: '50%', transform: 'translateX(-50%)' }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
};

const MenuTrigger = ({
  setIsOpen,
  isOpen,
  itemsLength,
  closeAnimationCallback,
  openIcon,
  closeIcon,
}) => {
  const animate = useAnimationControls();
  const shakeAnimation = useAnimationControls();

  const scaleTransition = Array.from({ length: itemsLength - 1 })
    .map((_, i) => i + 1)
    .reduce((acc, _, i) => {
      acc.push(1 + i * 0.15);
      return acc;
    }, []);

  const closeAnimation = async () => {
    shakeAnimation.start({
      translateX: [0, 2, -2, 0, 2, -2, 0],
      transition: { duration: CONSTANTS.closeStagger, ease: 'linear', repeat: Infinity, repeatType: 'loop' },
    });
    for (let i = 0; i < scaleTransition.length; i++) {
      await animate.start({
        height: Math.min(CONSTANTS.itemSize * scaleTransition[i], CONSTANTS.itemSize * 1.5),
        width: Math.min(CONSTANTS.itemSize * scaleTransition[i], CONSTANTS.itemSize * 1.5),
        transition: { duration: CONSTANTS.closeStagger / 2, ease: 'linear' },
      });
      if (i !== scaleTransition.length - 1) {
        await new Promise((res) => setTimeout(res, CONSTANTS.closeStagger * 1000));
      }
    }
    shakeAnimation.stop();
    shakeAnimation.start({ translateX: 0, transition: { duration: 0 } });
    animate.start({
      height: CONSTANTS.itemSize,
      width: CONSTANTS.itemSize,
      transition: { duration: 0.1, ease: 'backInOut' },
    });
  };

  return (
    <motion.div animate={shakeAnimation} className="z-50">
      <motion.button
        animate={animate}
        style={{ height: CONSTANTS.itemSize, width: CONSTANTS.itemSize }}
        className="rounded-full flex items-center justify-center cursor-pointer z-50 bg-white/[0.08] border border-white/20 hover:bg-white/[0.12] hover:border-white/35 transition-all duration-150 shadow-lg"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            closeAnimationCallback();
            closeAnimation();
          } else {
            setIsOpen(true);
          }
        }}
      >
        <AnimatePresence mode="popLayout">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, filter: 'blur(8px)', rotate: -90 }}
              animate={{ opacity: 1, filter: 'blur(0px)', rotate: 0 }}
              exit={{ opacity: 0, filter: 'blur(8px)', rotate: 90 }}
              transition={{ duration: 0.18 }}
            >
              {closeIcon}
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ opacity: 0, filter: 'blur(8px)', rotate: 90 }}
              animate={{ opacity: 1, filter: 'blur(0px)', rotate: 0 }}
              exit={{ opacity: 0, filter: 'blur(8px)', rotate: -90 }}
              transition={{ duration: 0.18 }}
            >
              {openIcon}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
};

export const CircleMenu = ({ items, openIcon, closeIcon, centerLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const animate = useAnimationControls();

  const closeAnimationCallback = async () => {
    await animate.start({
      rotate: -360,
      filter: 'blur(1px)',
      transition: { duration: CONSTANTS.closeStagger * (items.length + 2), ease: 'linear' },
    });
    await animate.start({ rotate: 0, filter: 'blur(0px)', transition: { duration: 0 } });
  };

  return (
    <div
      style={{ width: CONSTANTS.containerSize, height: CONSTANTS.containerSize }}
      className="relative flex items-center justify-center place-self-center"
    >
      {/* Center label */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[11px] text-white/40 whitespace-nowrap pointer-events-none"
          >
            {centerLabel || 'click to expand'}
          </motion.div>
        )}
      </AnimatePresence>

      <MenuTrigger
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        itemsLength={items.length}
        closeAnimationCallback={closeAnimationCallback}
        openIcon={openIcon}
        closeIcon={closeIcon}
      />

      <motion.div
        animate={animate}
        className="absolute inset-0 z-0 flex items-center justify-center"
      >
        {items.map((item, i) => (
          <MenuItem
            key={i}
            icon={item.icon}
            label={item.label}
            onClick={item.onClick}
            index={i}
            totalItems={items.length}
            isOpen={isOpen}
            color={item.color}
          />
        ))}
      </motion.div>
    </div>
  );
};
