"use client"

import { cn } from "@/lib/utils"

interface ProgressBarProps {
  progress: number
  className?: string
}

export default function ProgressBar({ progress, className }: ProgressBarProps) {
  return (
    <div className={cn("w-full bg-black rounded-full h-2 overflow-hidden border border-white p-[1px]", className)}>
      <div className="h-full bg-white transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
    </div>
  )
}
