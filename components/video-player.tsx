"use client"

import { useEffect, useRef } from "react"

interface VideoPlayerProps {
  src: string | null
}

export default function VideoPlayer({ src }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && src) {
      videoRef.current.load()
    }
  }, [src])

  if (!src) {
    return (
      <div className="video-container flex items-center justify-center">
        <p className="text-gray-400">No video selected</p>
      </div>
    )
  }

  return (
    <div className="video-container">
      <video ref={videoRef} className="video-player" controls>
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
