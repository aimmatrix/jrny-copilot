'use client'
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'

interface SwipeCardProps {
  onVote: (vote: 'approve' | 'disapprove') => void
  children: React.ReactNode
}

export function SwipeCard({ onVote, children }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const approveOpacity = useTransform(x, [20, 100], [0, 1])
  const rejectOpacity = useTransform(x, [-100, -20], [1, 0])

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 100) {
      onVote('approve')
    } else if (info.offset.x < -100) {
      onVote('disapprove')
    }
  }

  return (
    <motion.div
      style={{ x, rotate, touchAction: 'none' }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      whileDrag={{ scale: 1.03 }}
    >
      {/* Approve overlay */}
      <motion.div
        style={{ opacity: approveOpacity }}
        className="absolute top-6 left-6 z-10 rotate-[-15deg] border-4 border-green-500 text-green-500 font-black text-2xl px-3 py-1 rounded-lg pointer-events-none"
      >
        LIKE
      </motion.div>
      {/* Reject overlay */}
      <motion.div
        style={{ opacity: rejectOpacity }}
        className="absolute top-6 right-6 z-10 rotate-[15deg] border-4 border-red-500 text-red-500 font-black text-2xl px-3 py-1 rounded-lg pointer-events-none"
      >
        NOPE
      </motion.div>
      {children}
    </motion.div>
  )
}
