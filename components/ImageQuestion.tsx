'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { Question, Progress } from '@/types/question'

interface ImageQuestionProps {
  question: Question
  progress: Progress | null
  onAnswer: (url: string) => void
}

export default function ImageQuestion({
  question,
  progress,
  onAnswer
}: ImageQuestionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const file = files[0]
    if (file && file.type.startsWith('image/')) {
      setError(null)
      setSelectedFile(file)
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)
    } else {
      setError('Please drop an image file')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setError(null)
      setSelectedFile(file)
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)
    } else {
      setError('Please select an image file')
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
        body: formData,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setShowCamera(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError('Unable to access camera')
    }
  }, [])

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth
      canvasRef.current.height = videoRef.current.videoHeight
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured.jpg', { type: 'image/jpeg' })
            setSelectedFile(file)
            const preview = URL.createObjectURL(file)
            setPreviewUrl(preview)
            setShowCamera(false)
            // Stop camera
            if (videoRef.current?.srcObject) {
              (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop())
            }
          }
        }, 'image/jpeg')
      }
    }
  }, [])

  const closeCamera = useCallback(() => {
    setShowCamera(false)
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop())
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      callback()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  if (showCamera) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-heading"
      >
        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
          <h2 id="camera-heading" className="sr-only">
            Camera
          </h2>
          <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover rounded" data-testid="camera-video" role="video" />
          <canvas ref={canvasRef} className="hidden" data-testid="capture-canvas" />
          <div className="flex space-x-3 mt-4">
            <button
              onClick={capturePhoto}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              tabIndex={0}
              aria-label="Capture photo"
              onKeyDown={(e) => handleKeyDown(e, capturePhoto)}
            >
              Capture
            </button>
            <button
              onClick={closeCamera}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              tabIndex={0}
              aria-label="Cancel camera"
              onKeyDown={(e) => handleKeyDown(e, closeCamera)}
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
      <div className="text-lg font-medium mb-4" id="question-prompt">
        {question.imageDescription || 'Take or upload a photo'}
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-600 rounded-md" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      {previewUrl ? (
        <div className="space-y-3">
          <img
            src={previewUrl}
            alt="Preview of uploaded image"
            className="max-w-full h-auto rounded border"
            role="img"
          />
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            tabIndex={0}
            aria-label="Upload image"
            onKeyDown={(e) => handleKeyDown(e, handleUpload)}
          >
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </button>
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 p-8 rounded-md text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label="Drag and drop image here or click to browse"
          onKeyDown={(e) => handleKeyDown(e, () => dropZoneRef.current?.querySelector('input')?.click())}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-sm text-gray-500 mb-2">
            Drag and drop an image here or click to browse
          </p>
          <p className="text-xs text-gray-400">
            Supports all image formats
          </p>
        </div>
      )}

      <button
        onClick={openCamera}
        disabled={isUploading || showCamera}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed"
        tabIndex={0}
        aria-label="Open camera to take photo"
        onKeyDown={(e) => handleKeyDown(e, openCamera)}
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