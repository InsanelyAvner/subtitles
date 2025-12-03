"use client"

import type React from "react"

import { useState, useRef } from "react"
import { FileVideo, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VideoUploaderProps {
  onUpload: (file: File) => void
  isLoading?: boolean
}

export default function VideoUploader({ onUpload, isLoading = false }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith("video/")) {
        onUpload(file)
      } else {
        alert("Please upload a video file")
      }
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith("video/")) {
        onUpload(file)
      } else {
        alert("Please upload a video file")
      }
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      className={`video-upload-area ${isDragging ? "dragging" : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <FileVideo className="h-16 w-16 mb-4 text-white/60" />
      <h2 className="text-xl mb-2 font-medium">Upload your video</h2>
      <p className="text-gray-400 mb-8 text-center max-w-md">
        Drag and drop your video file or click the button below to upload. We support MP4, MOV, and WebM formats.
      </p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/*"
        className="hidden"
        disabled={isLoading}
      />
      <Button
        onClick={triggerFileInput}
        className="bg-white hover:bg-gray-200 text-black rounded-full px-6 py-6 h-auto flex items-center gap-2"
        disabled={isLoading}
      >
        <Upload className="h-5 w-5" />
        <span className="tracking-normal text-base">Select Video</span>
      </Button>
    </div>
  )
}
