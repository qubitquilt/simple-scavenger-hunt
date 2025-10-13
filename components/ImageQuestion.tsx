'use client'

import React, { useState, useRef, useEffect } from 'react'
import type { Question, Progress } from '@/types/question'

interface ImageQuestionProps {
  question: Question
  progress: Progress | null
  onAnswer: (url: string) => void
}

const defaultExtensions = ['jpg', 'png', 'gif'] as const

export default function ImageQuestionComponent({
  question,
  progress,
  onAnswer
}: ImageQuestionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const extensions = (question.allowedFormats as (typeof defaultExtensions)[number][] ) || defaultExtensions
  const allowedMimeTypes = extensions.map(f => `image/${f === 'jpg' ? 'jpeg' : f}`)
  const acceptValue = extensions.map(f => `.${f}`).join(',')

  const validateFile = (file: File): string | null => {
    if (!allowedMimeTypes.includes(file.type)) {
      return `Invalid file type. Allowed: ${extensions.map(f => f.toUpperCase()).join(', ')}`
    }
    return null
  }


  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSelectedFile(file)

    // Generate preview
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleClickUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleTakePhotoClick = async () => {
    try {
      setCameraError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
      setShowCamera(true)
    } catch (err) {
      const error = err as DOMException
      if (error.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera to take photos.')
      } else {
        setCameraError('Camera not available. Please upload an image instead.')
      }
      setShowCamera(false)
    }
  }

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' })
        handleFileSelect(file)
        setShowCamera(false)
        stopCamera()
      }
    }, 'image/jpeg', 0.8)
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const handleCloseCamera = () => {
    setShowCamera(false)
    stopCamera()
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      stopCamera()
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('questionId', question.id)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Upload failed')
      }

      const data = await response.json()
      onAnswer(data.url)

      // Clear states
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      callback()
    }
  }

  if (showCamera) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="camera-heading">
        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
          <h2 id="camera-heading" className="sr-only">Camera</h2>
          <div className="relative">
            <video ref={videoRef} className="w-full h-64 object-cover rounded" playsInline />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          {cameraError && (
            <div className="p-3 bg-red-100 text-red-800 rounded-md mt-4" role="alert" aria-live="polite">
              {cameraError}
            </div>
          )}
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleCapture}
              disabled={!videoRef.current?.videoWidth}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
              tabIndex={0}
              aria-label="Capture photo"
              onKeyDown={(e) => handleKeyDown(e, handleCapture)}
            >
              Capture
            </button>
            <button
              onClick={handleCloseCamera}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              tabIndex={0}
              aria-label="Cancel camera"
              onKeyDown={(e) => handleKeyDown(e, handleCloseCamera)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-medium mb-4" id="question-prompt" aria-describedby="question-prompt">
        {question.imageDescription}
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-600 rounded-md" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      {previewUrl ? (
        <div className="space-y-3">
          <img src={previewUrl} alt="Preview of uploaded image" className="max-w-full h-auto rounded border" role="img" />
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            tabIndex={0}
            aria-label="Upload previewed image"
            onKeyDown={(e) => handleKeyDown(e, handleUpload)}
          >
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-gray-300 p-8 rounded-md text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleClickUpload}
          role="button"
          tabIndex={0}
          aria-label="Drag and drop image here or click to browse"
          onKeyDown={(e) => handleKeyDown(e, handleClickUpload)}
        >
          <p className="text-sm text-gray-500 mb-2">Drag and drop an image here or click to browse</p>
          <p className="text-xs text-gray-400">Supports: {extensions.map(f => f.toUpperCase()).join(', ')}</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptValue}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading}
      />

      <button
        onClick={handleTakePhotoClick}
        disabled={isUploading || showCamera}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed"
        tabIndex={0}
        aria-label="Open camera to take photo"
        onKeyDown={(e) => handleKeyDown(e, handleTakePhotoClick)}
      >
        Take Photo
      </button>

      {isUploading && (
        <div className="flex items-center justify-center p-4" aria-live="polite">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Uploading...</span>
        </div>
      )}
    </div>
  )
}