'use client'

import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  X,
  Send,
  Mic,
  Sprout,
  Zap,
  Upload,
  Play,
  Pause,
  FileAudio,
  Loader2,
  AlertCircle,
} from 'lucide-react'

import {
  sendTextMessage,
  sendVoiceMessage,
  newSessionId,
  AgentResponse
} from '@/lib/fermes-api'

type ChatMode = 'search' | 'boost'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  transcript?: string
  audioUrl?: string
  timestamp: number
}

const SUGGESTED_QUESTIONS = [
  'Is my location suitable for tomatoes?',
  "What's the nearest seed dealer?",
  'Analyze 34.5004,-91.5529',
  'Which crop is best for this location?',
]

export default function FermesAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<ChatMode>('search')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null)
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  const sessionIdRef = useRef<string>(newSessionId())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Reset session on close
  useEffect(() => {
    if (!isOpen) {
      sessionIdRef.current = newSessionId()
    }
  }, [isOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (text?: string) => {
    const messageText = text ?? input.trim()
    if (!messageText || loading) return

    setError(null)
    setLoading(true)

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')

    try {
      const response = await sendTextMessage(sessionIdRef.current, messageText)

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.reply ?? 'I could not generate a response.',
        transcript: response.transcript ?? undefined,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error('Failed to send message:', err)
      setError('I couldn\'t reach the Fermes intelligence engine right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendAudio = async () => {
    const audioToSend = selectedAudio || audioBlob
    if (!audioToSend || loading) return

    setError(null)
    setLoading(true)

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `🎙 ${audioToSend instanceof File ? audioToSend.name : 'Voice recording'}`,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setSelectedAudio(null)
    setAudioBlob(null)

    try {
      const response = await sendVoiceMessage(
        sessionIdRef.current,
        audioToSend,
        'en-IN',
        true
      )

      let content = response.reply ?? 'I could not generate a response.'

      // Add transcript if available
      if (response.transcript) {
        content = `**You said:**\n"${response.transcript}"\n\n${content}`
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        audioUrl: response.audio_url ?? response.audio ?? undefined,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error('Failed to send audio:', err)
      setError('I couldn\'t process your voice message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const toggleAudioPlayback = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      setPlayingAudio(null)
    } else {
      setPlayingAudio(audioUrl)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    handleSendMessage(question)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      setSelectedAudio(file)
      setAudioBlob(null)
    }
  }

  return (
    <>
      {/* Chat Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Fermes AI Assistant"
          className="
            fixed bottom-6 right-6 z-50
            flex items-center gap-2
            rounded-xl
            border-2 border-black
            bg-yellow-400
            px-4 py-3
            font-black uppercase tracking-tight
            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
            transition-all
            hover:bg-yellow-300
            hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
            active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
            sm:px-5 sm:py-3.5
          "
        >
          <Sprout className="size-5" />
          <span className="hidden sm:inline">Ask Fermes</span>
          <span className="sm:hidden">AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="
            fixed bottom-24 right-6 z-50
            flex h-[550px] w-[380px] max-w-[calc(100vw-3rem)] flex-col
            overflow-hidden
            rounded-2xl
            border-2 border-black
            bg-white
            shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
            sm:w-[420px]
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-black bg-yellow-400 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sprout className="size-5 shrink-0" />
              <div>
                <div className="font-black uppercase leading-none">Fermes AI</div>
                <div className="text-xs font-medium opacity-75">Location intelligence</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="
                rounded-md p-1
                transition
                hover:bg-black/10
              "
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b-2 border-black bg-gray-50">
            <button
              onClick={() => setMode('search')}
              className={`
                flex flex-1 items-center justify-center gap-2 py-2 text-sm font-bold uppercase
                transition
                ${mode === 'search'
                  ? 'bg-white text-black'
                  : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              <Sprout className="size-4" />
              Search
            </button>
            <button
              onClick={() => setMode('boost')}
              className={`
                flex flex-1 items-center justify-center gap-2 py-2 text-sm font-bold uppercase
                transition
                ${mode === 'boost'
                  ? 'bg-white text-black'
                  : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              <Zap className="size-4" />
              Boost
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto bg-white p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Sprout className="mb-4 size-12 text-yellow-500" />
                <h3 className="mb-2 text-lg font-black uppercase">Fermes AI Assistant</h3>
                <p className="mb-6 text-sm font-medium text-gray-500">
                  How can I help with your farm?
                </p>

                <div className="w-full space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Try asking:
                  </div>
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      onClick={() => handleSuggestedQuestion(question)}
                      className="
                        w-full rounded-lg
                        border-2 border-black
                        bg-white
                        px-3 py-2
                        text-left text-sm font-medium
                        shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                        transition
                        hover:bg-yellow-50
                        hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                        active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
                      "
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`
                        max-w-[85%] rounded-xl
                        border-2 border-black
                        px-3 py-2
                        text-sm
                        shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                        ${msg.role === 'user'
                          ? 'bg-yellow-400'
                          : 'bg-white'}
                      `}
                    >
                      {msg.role === 'assistant' && msg.audioUrl && (
                        <div className="mb-2 flex items-center gap-2">
                          <button
                            onClick={() => toggleAudioPlayback(msg.audioUrl!)}
                            className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold hover:bg-gray-200"
                          >
                            {playingAudio === msg.audioUrl ? (
                              <>
                                <Pause className="size-3" />
                                Playing...
                              </>
                            ) : (
                              <>
                                <Play className="size-3" />
                                Play response
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-xl border-2 border-black bg-white px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <Loader2 className="size-4 animate-spin" />
                        Fermes is investigating...
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-xl border-2 border-black bg-red-50 px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex items-start gap-2 text-sm font-medium text-red-700">
                        <AlertCircle className="size-4 shrink-0" />
                        {error}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t-2 border-black bg-gray-50 p-3">
            {mode === 'search' ? (
              /* Search Mode Input */
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Type your question..."
                  rows={2}
                  disabled={loading}
                  className="
                    flex-1 resize-none
                    rounded-xl
                    border-2 border-black
                    bg-white
                    px-3 py-2
                    text-sm font-medium
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:bg-yellow-50
                    focus:ring-2
                    focus:ring-yellow-400
                    disabled:bg-gray-100
                  "
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                  className="
                    flex h-10 w-10 shrink-0 items-center justify-center
                    rounded-xl
                    border-2 border-black
                    bg-yellow-400
                    font-bold
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                    transition
                    hover:bg-yellow-300
                    disabled:bg-gray-300
                    disabled:shadow-none
                    disabled:cursor-not-allowed
                  "
                >
                  {loading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Send className="size-5" />
                  )}
                </button>
              </div>
            ) : (
              /* Boost Mode Input */
              <div className="space-y-3">
                {/* Audio File Display / Upload */}
                <div className="flex items-center gap-2">
                  <label
                    className="
                      flex flex-1 cursor-pointer items-center gap-2
                      rounded-xl
                      border-2 border-dashed border-black
                      bg-white
                      px-3 py-2
                      text-sm font-medium
                      transition
                      hover:bg-yellow-50
                    "
                  >
                    <Upload className="size-4" />
                    {selectedAudio ? (
                      <span className="truncate">{selectedAudio.name}</span>
                    ) : audioBlob ? (
                      <span className="truncate">🎙 Recording ready</span>
                    ) : (
                      <span>Upload or record audio</span>
                    )}
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileChange}
                      disabled={loading || recording}
                      className="hidden"
                    />
                  </label>

                  {(selectedAudio || audioBlob) && (
                    <button
                      onClick={() => {
                        setSelectedAudio(null)
                        setAudioBlob(null)
                      }}
                      disabled={loading}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-200"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {/* Recording Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={() => recording && stopRecording()}
                    onTouchStart={(e) => {
                      e.preventDefault()
                      startRecording()
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      stopRecording()
                    }}
                    disabled={loading || !!selectedAudio}
                    className={`
                      flex flex-1 items-center justify-center gap-2
                      rounded-xl
                      border-2 border-black
                      px-3 py-2
                      text-sm font-bold
                      shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                      transition
                      ${recording
                        ? 'bg-red-500 text-white'
                        : 'bg-white hover:bg-yellow-50'}
                      disabled:bg-gray-200 disabled:shadow-none disabled:cursor-not-allowed
                    `}
                  >
                    <Mic className="size-4" />
                    {recording ? 'Recording...' : 'Hold to talk'}
                  </button>

                  <button
                    onClick={handleSendAudio}
                    disabled={loading || !(selectedAudio || audioBlob)}
                    aria-label="Send voice message"
                    className="
                      flex h-10 w-10 shrink-0 items-center justify-center
                      rounded-xl
                      border-2 border-black
                      bg-yellow-400
                      font-bold
                      shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                      transition
                      hover:bg-yellow-300
                      disabled:bg-gray-300
                      disabled:shadow-none
                      disabled:cursor-not-allowed
                    "
                  >
                    {loading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <Send className="size-5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden audio element for playback */}
      {playingAudio && (
        <audio
          src={playingAudio}
          autoPlay
          onEnded={() => setPlayingAudio(null)}
          onError={() => setPlayingAudio(null)}
        />
      )}
    </>
  )
}