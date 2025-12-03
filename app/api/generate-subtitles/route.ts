import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Groq from "groq-sdk"
import ffmpeg from "fluent-ffmpeg"
import fs from "fs/promises"
import path from "path"
import { tmpdir } from "os"

// Initialize Supabase client (lazy initialization to avoid build-time errors)
let supabase: any = null

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Validate environment variables
    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'placeholder' || supabaseKey === 'placeholder') {
      throw new Error('Supabase environment variables are not properly configured')
    }
    
    try {
      supabase = createClient(supabaseUrl, supabaseKey)
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error)
      throw new Error('Failed to initialize Supabase client')
    }
  }
  return supabase
}

// Caption constraints
const CAPTION_CONSTRAINTS = {
  minDuration: 1.0,        // Minimum caption duration in seconds
  maxDuration: 7.0,        // Maximum caption duration in seconds
  minWords: 1,             // Minimum words per caption
  maxWords: 12,            // Maximum words per caption
  maxCharsPerLine: 42,     // Maximum characters per line
  maxLines: 2,             // Maximum lines per caption
  minGap: 0.1,             // Minimum gap between captions
  readingSpeed: 15,        // Characters per second reading speed
}

// Helper function to extract audio from video with optimal settings
async function extractAudio(videoPath: string): Promise<string> {
  const audioPath = path.join(tmpdir(), `audio-${Date.now()}.wav`)
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .toFormat('wav')
      .audioChannels(1)
      .audioFrequency(16000)
      .audioBitrate('64k')
      .on('end', () => resolve(audioPath))
      .on('error', reject)
      .save(audioPath)
  })
}

// Word timing estimation based on segment
interface WordTiming {
  word: string
  start: number
  end: number
}

function estimateWordTimings(text: string, startTime: number, endTime: number): WordTiming[] {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return []
  
  const totalDuration = endTime - startTime
  const wordTimings: WordTiming[] = []
  
  // Calculate relative word lengths for weighted distribution
  const wordLengths = words.map(w => w.replace(/[^\w]/g, '').length)
  const totalLength = wordLengths.reduce((sum, len) => sum + len, 0)
  
  let currentTime = startTime
  
  for (let i = 0; i < words.length; i++) {
    const wordDuration = (wordLengths[i] / totalLength) * totalDuration
    const wordEnd = Math.min(currentTime + wordDuration, endTime)
    
    wordTimings.push({
      word: words[i],
      start: currentTime,
      end: wordEnd
    })
    
    currentTime = wordEnd
  }
  
  return wordTimings
}

// Natural break point detection
function findNaturalBreaks(words: WordTiming[]): Set<number> {
  const breaks = new Set<number>([0, words.length])
  
  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1].word.toLowerCase()
    const currentWord = words[i].word.toLowerCase()
    
    // Strong punctuation breaks
    if (prevWord.match(/[.!?]$/)) {
      breaks.add(i)
    }
    // Moderate punctuation breaks
    else if (prevWord.match(/[,:;]$/)) {
      breaks.add(i)
    }
    // Conjunction breaks
    else if (['and', 'but', 'or', 'so', 'because', 'when', 'while', 'if', 'although', 'since', 'unless'].includes(prevWord)) {
      breaks.add(i)
    }
    // Preposition breaks (context-dependent)
    else if (i > 3 && ['in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'about'].includes(currentWord)) {
      breaks.add(i)
    }
  }
  
  return breaks
}

// Create optimal captions with precise timing
function createOptimalCaptions(segments: any[]): any[] {
  const allWordTimings: WordTiming[] = []
  
  // Extract all word timings
  for (const segment of segments) {
    const wordTimings = estimateWordTimings(segment.text, segment.start, segment.end)
    allWordTimings.push(...wordTimings)
  }
  
  if (allWordTimings.length === 0) return []
  
  const captions: any[] = []
  let currentCaption: WordTiming[] = []
  let captionStart = allWordTimings[0].start
  
  for (let i = 0; i < allWordTimings.length; i++) {
    const word = allWordTimings[i]
    currentCaption.push(word)
    
    const captionText = currentCaption.map(w => w.word).join(' ')
    const captionDuration = word.end - captionStart
    const wordCount = currentCaption.length
    
    // Check if we should end the current caption
    let shouldEndCaption = false
    
    // Check duration constraints
    if (captionDuration >= CAPTION_CONSTRAINTS.maxDuration) {
      shouldEndCaption = true
    }
    
    // Check word count
    if (wordCount >= CAPTION_CONSTRAINTS.maxWords) {
      shouldEndCaption = true
    }
    
    // Check character count and line breaks
    if (captionText.length > CAPTION_CONSTRAINTS.maxCharsPerLine * CAPTION_CONSTRAINTS.maxLines) {
      shouldEndCaption = true
    }
    
    // Check reading speed
    const requiredReadingTime = captionText.length / CAPTION_CONSTRAINTS.readingSpeed
    if (requiredReadingTime > captionDuration && wordCount > CAPTION_CONSTRAINTS.minWords) {
      shouldEndCaption = true
    }
    
    // Check for natural break points
    if (i < allWordTimings.length - 1) {
      const nextWord = allWordTimings[i + 1]
      const gap = nextWord.start - word.end
      
      // Natural pause or punctuation
      if (gap > 0.5 || word.word.match(/[.!?]$/)) {
        shouldEndCaption = true
      }
      
      // Look ahead for better break points
      if (wordCount >= CAPTION_CONSTRAINTS.minWords && captionDuration >= CAPTION_CONSTRAINTS.minDuration) {
        const naturalBreaks = findNaturalBreaks(allWordTimings.slice(i - wordCount + 1, i + 5))
        if (naturalBreaks.has(wordCount)) {
          shouldEndCaption = true
        }
      }
    }
    
    // Last word
    if (i === allWordTimings.length - 1) {
      shouldEndCaption = true
    }
    
    if (shouldEndCaption && currentCaption.length > 0) {
      // Format caption text with line breaks if needed
      const formattedText = formatCaptionText(captionText)
      
      captions.push({
        start: captionStart,
        end: currentCaption[currentCaption.length - 1].end,
        text: formattedText
      })
      
      currentCaption = []
      if (i < allWordTimings.length - 1) {
        captionStart = allWordTimings[i + 1].start
      }
    }
  }
  
  return captions
}

// Format caption text with appropriate line breaks
function formatCaptionText(text: string): string {
  const words = text.trim().split(/\s+/)
  
  if (words.length <= 3) {
    return text.trim()
  }
  
  // For longer captions, try to balance lines
  if (text.length > CAPTION_CONSTRAINTS.maxCharsPerLine) {
    const midPoint = Math.ceil(words.length / 2)
    
    // Look for natural break point near the middle
    let breakIndex = midPoint
    
    // Check for punctuation or conjunctions near midpoint
    for (let offset = 0; offset <= 2; offset++) {
      for (const idx of [midPoint - offset, midPoint + offset]) {
        if (idx > 0 && idx < words.length) {
          const word = words[idx - 1].toLowerCase()
          if (word.match(/[,;:]$/) || ['and', 'but', 'or', 'with', 'to'].includes(word)) {
            breakIndex = idx
            break
          }
        }
      }
    }
    
    const line1 = words.slice(0, breakIndex).join(' ')
    const line2 = words.slice(breakIndex).join(' ')
    
    // Ensure both lines fit within constraints
    if (line1.length <= CAPTION_CONSTRAINTS.maxCharsPerLine && 
        line2.length <= CAPTION_CONSTRAINTS.maxCharsPerLine) {
      return `${line1}\n${line2}`
    }
  }
  
  return text.trim()
}

// Precise timing alignment for chunked audio
function alignChunkTimings(allSegments: any[], chunkInfo: { startTime: number, duration: number }[]): any[] {
  const aligned: any[] = []
  const processedRanges: { start: number, end: number }[] = []
  
  // Sort segments by start time
  allSegments.sort((a, b) => a.start - b.start)
  
  for (const segment of allSegments) {
    // Check if this segment overlaps with already processed content
    const overlap = processedRanges.some(range => 
      segment.start < range.end && segment.end > range.start
    )
    
    if (!overlap && segment.text.trim()) {
      aligned.push(segment)
      processedRanges.push({ start: segment.start, end: segment.end })
    }
  }
  
  return aligned
}

// Enhanced text similarity calculation
function calculateTextSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim()
  const words1 = normalize(text1).split(/\s+/).filter(w => w.length > 0)
  const words2 = normalize(text2).split(/\s+/).filter(w => w.length > 0)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  const set1 = new Set(words1)
  const set2 = new Set(words2)
  const intersection = [...set1].filter(word => set2.has(word))
  const union = new Set([...set1, ...set2])
  
  return intersection.length / union.size
}

// Optimized chunking strategy
async function createOptimalAudioChunks(audioPath: string): Promise<{ path: string, startTime: number, duration: number }[]> {
  const stats = await fs.stat(audioPath)
  const maxSize = 20 * 1024 * 1024 // 20MB
  
  if (stats.size <= maxSize) {
    const duration = await getAudioDuration(audioPath)
    return [{ path: audioPath, startTime: 0, duration }]
  }
  
  const totalDuration = await getAudioDuration(audioPath)
  const chunks: { path: string, startTime: number, duration: number }[] = []
  
  // Adaptive chunk size based on file duration
  const baseChunkDuration = Math.min(300, Math.max(120, totalDuration / 10)) // 2-5 minutes
  const overlapDuration = 15 // 15 seconds overlap
  
  let currentStart = 0
  let chunkIndex = 0
  
  while (currentStart < totalDuration) {
    const remainingDuration = totalDuration - currentStart
    const chunkDuration = Math.min(baseChunkDuration + overlapDuration, remainingDuration)
    
    const chunkPath = path.join(tmpdir(), `chunk-${chunkIndex}-${Date.now()}.wav`)
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(audioPath)
        .seekInput(currentStart)
        .duration(chunkDuration)
        .toFormat('wav')
        .audioChannels(1)
        .audioFrequency(16000)
        .outputOptions(['-avoid_negative_ts', 'make_zero'])
        .on('end', () => resolve())
        .on('error', reject)
        .save(chunkPath)
    })
    
    chunks.push({ 
      path: chunkPath, 
      startTime: currentStart,
      duration: chunkDuration
    })
    
    currentStart += baseChunkDuration
    chunkIndex++
  }
  
  return chunks
}

async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err: Error | null, metadata: ffmpeg.FfprobeData) => {
      if (err) reject(err)
      else resolve(metadata.format.duration || 0)
    })
  })
}

// Post-process captions to ensure quality
function postProcessCaptions(captions: any[]): any[] {
  const processed: any[] = []
  
  for (let i = 0; i < captions.length; i++) {
    const caption = captions[i]
    
    // Ensure minimum duration
    if (caption.end - caption.start < CAPTION_CONSTRAINTS.minDuration) {
      caption.end = caption.start + CAPTION_CONSTRAINTS.minDuration
    }
    
    // Ensure no overlaps
    if (i > 0 && caption.start < processed[processed.length - 1].end) {
      caption.start = processed[processed.length - 1].end + CAPTION_CONSTRAINTS.minGap
    }
    
    // Add gap between captions if none exists
    if (i > 0) {
      const prevCaption = processed[processed.length - 1]
      if (caption.start - prevCaption.end < CAPTION_CONSTRAINTS.minGap) {
        prevCaption.end = caption.start - CAPTION_CONSTRAINTS.minGap
      }
    }
    
    processed.push(caption)
  }
  
  return processed
}

function convertToSrt(segments: any[]): string {
  return segments.map((segment, index) => {
    const start = formatTime(segment.start)
    const end = formatTime(segment.end)
    return `${index + 1}\n${start} --> ${end}\n${segment.text.trim()}\n`
  }).join('\n')
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}

// Enhanced translation with timing preservation
async function translateCaptions(captions: any[], targetLanguage: string, groq: Groq): Promise<any[]> {
  const translated = [...captions]
  const batchSize = 10
  
  for (let i = 0; i < captions.length; i += batchSize) {
    const batch = captions.slice(i, i + batchSize)
    const batchText = batch.map((seg, idx) => `[${idx + 1}] ${seg.text.replace('\n', ' | ')}`).join('\n')
    
    try {
      const translation = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Translate the following numbered subtitles to ${targetLanguage}. Maintain the numbering format [N] exactly. Keep translations concise and natural for subtitles. If there's a | symbol, it represents a line break - preserve the approximate break position. Return only the translated subtitles.`
          },
          {
            role: "user", 
            content: batchText
          }
        ],
        model: "llama-3.1-70b-versatile",
        temperature: 0.1
      })
      
      const translatedText = translation.choices[0]?.message?.content?.trim()
      if (translatedText) {
        const lines = translatedText.split('\n').filter(line => line.trim())
        
        lines.forEach(line => {
          const match = line.match(/^\[(\d+)\]\s*(.+)$/)
          if (match) {
            const idx = parseInt(match[1]) - 1
            const translatedContent = match[2].trim().replace(' | ', '\n')
            
            if (i + idx < translated.length) {
              translated[i + idx].text = translatedContent
            }
          }
        })
      }
    } catch (error) {
      console.error('Batch translation error:', error)
    }
  }
  
  return translated
}

export async function POST(request: Request) {
  let tempFiles: string[] = []
  
  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    const userId = formData.get('userId') as string
    const optionsStr = formData.get('options') as string
    const options = JSON.parse(optionsStr)
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    if (!videoFile) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 })
    }
    
    // Get user's Groq API key
    const { data: userData, error: userError } = await getSupabaseClient()
      .from("user_settings")
      .select("groq_api_key")
      .eq("user_id", userId)
      .single()
    
    if (userError || !userData.groq_api_key) {
      return NextResponse.json({ error: "Groq API key not found. Please add your API key in settings." }, { status: 400 })
    }
    
    const groq = new Groq({ apiKey: userData.groq_api_key })
    
    // Save and extract audio
    const videoBuffer = await videoFile.arrayBuffer()
    const videoPath = path.join(tmpdir(), `video-${Date.now()}.${videoFile.name.split('.').pop()}`)
    await fs.writeFile(videoPath, Buffer.from(videoBuffer))
    tempFiles.push(videoPath)
    
    const audioPath = await extractAudio(videoPath)
    tempFiles.push(audioPath)
    
    // Create optimal audio chunks
    const audioChunks = await createOptimalAudioChunks(audioPath)
    tempFiles.push(...audioChunks.map(chunk => chunk.path))
    
    let allSegments: any[] = []
    const isTranslating = options.translateTo === 'en' && options.sourceLanguage && options.sourceLanguage !== 'en'
    
    // Process each chunk
    for (const chunk of audioChunks) {
      const audioBuffer = await fs.readFile(chunk.path)
      
      let result: any
      
      if (isTranslating) {
        // Use translation endpoint for direct language translation
        result = await groq.audio.translations.create({
          file: new File([audioBuffer], 'audio.wav', { type: 'audio/wav' }),
          model: 'whisper-large-v3-turbo',
          response_format: 'verbose_json',
          temperature: 0.0,
        })
      } else {
        // Use transcription for same-language or post-processing translation
        const transcriptionParams: any = {
          file: new File([audioBuffer], 'audio.wav', { type: 'audio/wav' }),
          model: options.quality === 'high' ? 'whisper-large-v3' : 'whisper-large-v3-turbo',
          response_format: 'verbose_json',
          timestamp_granularities: ['segment'],
          temperature: 0.0
        }
        
        if (options.sourceLanguage && options.sourceLanguage !== 'auto') {
          transcriptionParams.language = options.sourceLanguage
        }
        
        result = await groq.audio.transcriptions.create(transcriptionParams)
      }
      
      if (result.segments) {
        const adjustedSegments = result.segments.map((segment: any) => ({
          ...segment,
          start: segment.start + chunk.startTime,
          end: segment.end + chunk.startTime,
          avg_logprob: segment.avg_logprob || 0
        }))
        allSegments.push(...adjustedSegments)
      }
    }
    
    // Align timing from multiple chunks
    allSegments = alignChunkTimings(allSegments, audioChunks)
    
    // Create optimal captions with precise timing
    let captions = createOptimalCaptions(allSegments)
    
    // Handle post-processing translation
    if (options.translateTo && options.translateTo !== 'en' && options.translateTo !== 'none' && !isTranslating) {
      captions = await translateCaptions(captions, options.translateTo, groq)
    }
    
    // Post-process to ensure quality
    captions = postProcessCaptions(captions)
    
    // Generate SRT content
    const srtContent = convertToSrt(captions)
    
    if (options.outputFormat === 'srt') {
      return NextResponse.json({
        success: true,
        subtitles: srtContent,
        format: 'srt'
      })
    } else {
      // Embedded subtitles
      const outputVideoPath = path.join(tmpdir(), `output-${Date.now()}.mp4`)
      const srtPath = path.join(tmpdir(), `subtitles-${Date.now()}.srt`)
      
      await fs.writeFile(srtPath, srtContent)
      tempFiles.push(srtPath, outputVideoPath)
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .videoFilters([
            `subtitles=${srtPath}:force_style='FontSize=20,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2,Shadow=1,MarginV=25,Alignment=2,Bold=0'`
          ])
          .outputOptions([
            '-c:v libx264',
            '-preset medium',
            '-crf 23',
            '-r', '30',
            '-vsync', 'cfr',
            '-async', '1',
            '-map', '0:v:0',
            '-map', '0:a:0'
          ])
          .on('end', () => resolve())
          .on('error', reject)
          .save(outputVideoPath)
      })
      
      const videoBuffer = await fs.readFile(outputVideoPath)
      
      return NextResponse.json({
        success: true,
        videoWithSubtitles: Buffer.from(videoBuffer).toString('base64'),
        format: 'embedded'
      })
    }
  } catch (error) {
    console.error("Error generating subtitles:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to generate subtitles" 
    }, { status: 500 })
  } finally {
    // Cleanup
    for (const filePath of tempFiles) {
      try {
        await fs.unlink(filePath)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}