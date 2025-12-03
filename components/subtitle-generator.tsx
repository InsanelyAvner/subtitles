"use client"

import { useState } from "react"
import { ExternalLink, Download, Settings, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"
import OptionsDialog from "./options-dialog"
import VideoUploader from "./video-uploader"
import VideoPlayer from "./video-player"
import StatusIndicator from "./status-indicator"
import UserMenu from "./user-menu"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"

export default function SubtitleGenerator() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null)
  const [subtitleContent, setSubtitleContent] = useState<string | null>(null)
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [showUploaderView, setShowUploaderView] = useState(true)
  const [generationProgress, setGenerationProgress] = useState(0)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { toast } = useToast()
  const { user } = useAuth()

  const [options, setOptions] = useState({
    outputFormat: "srt" as "srt" | "embedded",
    sourceLanguage: "auto" as string,
    translateTo: "none" as string,
    quality: "standard" as "standard" | "high",
    includeTimestamps: true,
  })

  const handleVideoUpload = (file: File) => {
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setShowUploaderView(false)
  }

  const handleOptionsChange = (newOptions: any) => {
    setOptions(newOptions)
  }

  const handleGenerate = async () => {
    if (!videoFile) {
      toast({
        title: "No video selected",
        description: "Please upload a video first",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to generate subtitles",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)
    setSubtitleUrl(null)
    setSubtitleContent(null)
    setProcessedVideoUrl(null)
    setGenerationProgress(0)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        const next = prev + Math.random() * 3
        return next > 85 ? 85 : next
      })
    }, 2000)

    try {
      // Prepare form data
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('userId', user.id)
      formData.append('options', JSON.stringify(options))

      // Call the API
      const response = await fetch('/api/generate-subtitles', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate subtitles')
      }

      clearInterval(progressInterval)
      setGenerationProgress(100)

      if (data.format === 'srt') {
        // Handle SRT download
        setSubtitleContent(data.subtitles)
        const blob = new Blob([data.subtitles], { type: "text/plain" })
        setSubtitleUrl(URL.createObjectURL(blob))
        
        let description = "Your SRT file is ready for download"
        if (options.sourceLanguage === 'zh' && options.translateTo === 'en') {
          description = "Chinese audio translated to English subtitles"
        }
        
        toast({
          title: "Subtitles generated!",
          description,
        })
      } else if (data.format === 'embedded') {
        // Handle embedded video
        const videoBlob = new Blob([Buffer.from(data.videoWithSubtitles, 'base64')], { 
          type: 'video/mp4' 
        })
        setProcessedVideoUrl(URL.createObjectURL(videoBlob))
        
        toast({
          title: "Video processed!",
          description: "Your video with embedded subtitles is ready",
        })
      }

      setIsLoading(false)
    } catch (err) {
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setIsLoading(false)
      setGenerationProgress(0)
      
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleDownload = () => {
    if (subtitleUrl && subtitleContent) {
      const a = document.createElement("a")
      a.href = subtitleUrl
      a.download = `subtitles-${videoFile?.name.split(".")[0] || "video"}.srt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleDownloadVideo = () => {
    if (processedVideoUrl) {
      const a = document.createElement("a")
      a.href = processedVideoUrl
      a.download = `${videoFile?.name.split(".")[0] || "video"}-with-subtitles.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleBack = () => {
    setShowUploaderView(true)
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    if (subtitleUrl) URL.revokeObjectURL(subtitleUrl)
    if (processedVideoUrl) URL.revokeObjectURL(processedVideoUrl)
    setVideoFile(null)
    setVideoUrl(null)
    setSubtitleUrl(null)
    setSubtitleContent(null)
    setProcessedVideoUrl(null)
    setGenerationProgress(0)
    setError(null)
  }

  // Show processed video if available, otherwise show original
  const displayVideoUrl = processedVideoUrl || videoUrl

  return (
    <div className="relative h-[100dvh] w-full">
      {/* Content area */}
      <div className="absolute inset-0 z-0 flex items-center justify-center p-4 sm:p-8">
        {showUploaderView ? (
          <div className="w-full max-w-4xl">
            <VideoUploader onUpload={handleVideoUpload} isLoading={isLoading} />
          </div>
        ) : (
          <div className="w-full max-w-4xl h-[70vh]">
            <VideoPlayer src={displayVideoUrl} />
          </div>
        )}
      </div>

      {/* Overlay UI */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Header with logo in top left */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center pointer-events-auto">
          <div>
            <h1 className="text-3xl text-white font-normal tracking-normal">AI Subtitle Generator</h1>
            <p className="text-gray-400 text-sm mt-1 tracking-normal">Created by <a className="underline" href="https://github.com/InsanelyAvner">InsanelyAvner</a></p>
          </div>

          {/* User menu / auth */}
          <UserMenu />
        </div>

        {/* Loading indicator */}
        {isLoading && <StatusIndicator progress={generationProgress} />}

        {/* Error message */}
        {error && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-900/80 text-white px-4 py-2 rounded-md tracking-normal max-w-md text-center">
            {error}
          </div>
        )}

        {/* Bottom controls when video is loaded */}
        {!showUploaderView && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 pointer-events-auto">
            <Button
              onClick={handleBack}
              className="bg-black hover:bg-gray-900 text-white border border-white/20 rounded-full px-4 py-2 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="tracking-normal">Back</span>
            </Button>

            <Button
              onClick={() => setShowOptions(true)}
              className="bg-black hover:bg-gray-900 text-white border border-white/20 rounded-full px-4 py-2 flex items-center gap-2"
              disabled={isLoading}
            >
              <Settings className="h-4 w-4" />
              <span className="tracking-normal">Options</span>
            </Button>

            <Button
              onClick={handleGenerate}
              className="bg-white hover:bg-gray-200 text-black rounded-full px-4 py-2 flex items-center gap-2"
              disabled={isLoading}
            >
              <span className="tracking-normal">{isLoading ? "Generating..." : "Generate Subtitles"}</span>
            </Button>

            {subtitleUrl && options.outputFormat === "srt" && (
              <Button
                onClick={handleDownload}
                className="bg-white hover:bg-gray-200 text-black rounded-full px-4 py-2 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="tracking-normal">Download SRT</span>
              </Button>
            )}

            {processedVideoUrl && options.outputFormat === "embedded" && (
              <Button
                onClick={handleDownloadVideo}
                className="bg-white hover:bg-gray-200 text-black rounded-full px-4 py-2 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="tracking-normal">Download Video</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Options Dialog/Drawer */}
      <OptionsDialog
        open={showOptions}
        onOpenChange={setShowOptions}
        options={options}
        onOptionsChange={handleOptionsChange}
      />
    </div>
  )
}