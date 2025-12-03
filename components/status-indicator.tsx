"use client"

import ProgressBar from "./progress-bar"

interface StatusIndicatorProps {
  progress: number
}

export default function StatusIndicator({ progress }: StatusIndicatorProps) {
  const statusMessage = getStatusMessage(progress)

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
      <div className="w-64 space-y-2">
        <ProgressBar progress={progress} />
        <p className="text-white text-center text-sm">{statusMessage}</p>
      </div>
    </div>
  )
}

function getStatusMessage(progress: number): string {
  if (progress < 20) {
    return "Analyzing audio track..."
  } else if (progress < 40) {
    return "Transcribing speech..."
  } else if (progress < 60) {
    return "Processing language..."
  } else if (progress < 80) {
    return "Generating subtitles..."
  } else if (progress < 100) {
    return "Finalizing output..."
  } else {
    return "Completed!"
  }
}
