"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface OptionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: {
    outputFormat: "srt" | "embedded"
    sourceLanguage: string
    translateTo: string
    quality: "standard" | "high"
    includeTimestamps: boolean
  }
  onOptionsChange: (options: any) => void
}

export default function OptionsDialog({ open, onOpenChange, options, onOptionsChange }: OptionsDialogProps) {
  const [localOptions, setLocalOptions] = useState(options)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // Update local options when props change
  useEffect(() => {
    setLocalOptions(options)
  }, [options])

  // Apply changes when dialog closes
  useEffect(() => {
    if (!open) {
      onOptionsChange(localOptions)
    }
  }, [open, localOptions, onOptionsChange])

  const handleChange = (key: string, value: any) => {
    setLocalOptions((prev) => ({ ...prev, [key]: value }))
  }

  const sourceLanguages = [
    { value: "auto", label: "Auto-detect" },
    { value: "en", label: "English" },
    { value: "zh", label: "Chinese (Mandarin)" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "ja", label: "Japanese" },
    { value: "ko", label: "Korean" },
    { value: "ru", label: "Russian" },
    { value: "ar", label: "Arabic" },
    { value: "pt", label: "Portuguese" },
    { value: "it", label: "Italian" },
  ]

  const targetLanguages = [
    { value: "none", label: "None (Keep Original)" },
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "zh", label: "Chinese" },
    { value: "ja", label: "Japanese" },
    { value: "ko", label: "Korean" },
    { value: "ru", label: "Russian" },
    { value: "ar", label: "Arabic" },
    { value: "pt", label: "Portuguese" },
    { value: "it", label: "Italian" },
  ]

  const content = (
    <div className="py-2">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="basic" className="tracking-normal">
            Basic Settings
          </TabsTrigger>
          <TabsTrigger value="advanced" className="tracking-normal">
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white font-mono tracking-normal">Output Format</Label>
            <RadioGroup
              value={localOptions.outputFormat}
              onValueChange={(value: "srt" | "embedded") => handleChange("outputFormat", value)}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="srt" id="srt" className="border-white text-white mt-1" />
                <div>
                  <Label htmlFor="srt" className="text-white tracking-normal">
                    SRT File
                  </Label>
                  <p className="text-gray-400 text-xs">Download a separate subtitle file</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="embedded" id="embedded" className="border-white text-white mt-1" />
                <div>
                  <Label htmlFor="embedded" className="text-white tracking-normal">
                    Embedded Subtitles
                  </Label>
                  <p className="text-gray-400 text-xs">Burn subtitles directly into the video</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-white font-mono tracking-normal">Source Language</Label>
            <Select value={localOptions.sourceLanguage} onValueChange={(value) => handleChange("sourceLanguage", value)}>
              <SelectTrigger className="bg-black border-[rgba(255,255,255,0.12)] text-white tracking-normal">
                <SelectValue placeholder="Select source language" />
              </SelectTrigger>
              <SelectContent className="bg-black border-[rgba(255,255,255,0.12)] text-white max-h-64">
                {sourceLanguages.map((lang) => (
                  <SelectItem
                    key={lang.value}
                    value={lang.value}
                    className="tracking-normal hover:bg-[#111111] focus:bg-[#111111]"
                  >
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-gray-400 text-xs">
              Specify the language of your audio for better accuracy
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white font-mono tracking-normal">Translate To</Label>
            <Select value={localOptions.translateTo} onValueChange={(value) => handleChange("translateTo", value)}>
              <SelectTrigger className="bg-black border-[rgba(255,255,255,0.12)] text-white tracking-normal">
                <SelectValue placeholder="Select target language" />
              </SelectTrigger>
              <SelectContent className="bg-black border-[rgba(255,255,255,0.12)] text-white max-h-64">
                {targetLanguages.map((lang) => (
                  <SelectItem
                    key={lang.value}
                    value={lang.value}
                    className="tracking-normal hover:bg-[#111111] focus:bg-[#111111]"
                  >
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {localOptions.sourceLanguage === 'zh' && localOptions.translateTo === 'en' && (
              <p className="text-green-400 text-xs">
                ✓ Using optimized Chinese→English translation
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white font-mono tracking-normal">Quality</Label>
            <RadioGroup
              value={localOptions.quality}
              onValueChange={(value: "standard" | "high") => handleChange("quality", value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="standard" className="border-white text-white" />
                <Label htmlFor="standard" className="text-white tracking-normal">
                  Standard
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" className="border-white text-white" />
                <Label htmlFor="high" className="text-white tracking-normal">
                  High
                </Label>
              </div>
            </RadioGroup>
            <p className="text-gray-400 text-xs">
              Higher quality means more accurate transcription but slower processing
            </p>
          </div>

          <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm border-[rgba(255,255,255,0.12)] bg-black/50">
            <div>
              <Label className="text-white font-mono tracking-normal">Include Timestamps</Label>
              <p className="text-gray-400 text-xs tracking-normal">For SRT files</p>
            </div>
            <Switch
              checked={localOptions.includeTimestamps}
              onCheckedChange={(checked) => handleChange("includeTimestamps", checked)}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-black border-[rgba(255,255,255,0.12)] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-white font-mono tracking-normal">Subtitle Options</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-black border-t border-[rgba(255,255,255,0.12)] text-white">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle className="text-xl text-white font-mono tracking-normal">Subtitle Options</DrawerTitle>
          </DrawerHeader>
          <div className="px-4">{content}</div>
          <DrawerFooter>
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white tracking-normal"
            >
              Apply Settings
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
