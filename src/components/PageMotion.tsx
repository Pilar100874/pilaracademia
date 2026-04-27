import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { forwardRef } from 'react';

/**
 * PageMotion — wrapper de página com fade + slide suave.
 * Estilo "Editorial Cotton Paper": animações discretas, ease "expo-out".
 */
const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
  },
};

type Props = Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'animate' | 'exit'>;

export const PageMotion = forwardRef<HTMLDivElement, Props>(
  ({ children, className, ...rest }, ref) => (
    <motion.div
      ref={ref}
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  ),
);
PageMotion.displayName = 'PageMotion';

/**
 * StaggerList — container que aplica entrada em cascata aos filhos diretos
 * envolvidos em <StaggerItem>.
 */
const staggerVariants: Variants = {
  initial: {},
  enter: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] },
  },
};

export const StaggerList = forwardRef<HTMLDivElement, Props>(
  ({ children, className, ...rest }, ref) => (
    <motion.div
      ref={ref}
      variants={staggerVariants}
      initial="initial"
      animate="enter"
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  ),
);
StaggerList.displayName = 'StaggerList';

export const StaggerItem = forwardRef<HTMLDivElement, Props>(
  ({ children, className, ...rest }, ref) => (
    <motion.div ref={ref} variants={itemVariants} className={className} {...rest}>
      {children}
    </motion.div>
  ),
);
StaggerItem.displayName = 'StaggerItem';
