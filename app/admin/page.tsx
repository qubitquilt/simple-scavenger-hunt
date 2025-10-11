'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Event, UserProgress, AdminMetrics } from '@/types/admin'
import type { Question } from '@/types/question'
import QRGenerator from '@/components/QRGenerator'










export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session || !session.user.admin) {
      router.push('/admin/login')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  }

  if (!session || !session.user.admin) {
    return null
  }

  return <AdminDashboard />
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'events' | 'questions' | 'users'>('metrics')
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [events, setEvents] = useState<Event[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [users, setUsers] = useState<UserProgress[]>([])
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showEventForm, setShowEventForm] = useState<boolean>(false)
  const [showQuestionForm, setShowQuestionForm] = useState<boolean>(false)

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      loadQuestions()
      loadUsers()
    } else {
      setQuestions([])
      setUsers([])
      setMetrics(null)
    }
  }, [selectedEventId])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/events`)
      if (!res.ok) throw new Error('Failed to fetch events')
      const { events } = await res.json()
      setEvents(events)
      if (events.length > 0) {
        setSelectedEventId(events[0].id)
      }
    } catch (err) {
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const loadQuestions = async () => {
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/questions`)
      if (selectedEventId) url.searchParams.append('eventId', selectedEventId)
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch questions')
      const { questions } = await res.json()
      setQuestions(questions)
    } catch (err) {
      setError('Failed to load questions')
    }
  }

  const loadUsers = async () => {
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/users?eventId=${selectedEventId}`)
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch users')
      const { users: data, metrics: m } = await res.json()
      setUsers(data)
      setMetrics(m)
    } catch (err) {
      setError('Failed to load users')
    }
  }

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/events`, {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData)),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Failed to create event')
      const { event: newEvent } = await res.json()
      setEvents(prev => [...prev, newEvent])
      setShowEventForm(false)
      setError(null)
    } catch (err) {
      setError('Failed to create event')
    }
  }

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event)
    setShowEventForm(true)
  }

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingEvent) return
    const formData = new FormData(e.currentTarget)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/events`, {
        method: 'PUT',
        body: JSON.stringify({ id: editingEvent.id, ...Object.fromEntries(formData) }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Failed to update event')
      const { event: updatedEvent } = await res.json()
      setEvents(prev => prev.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev))
      setEditingEvent(null)
      setShowEventForm(false)
      setError(null)
    } catch (err) {
      setError('Failed to update event')
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/events`, {
        method: 'DELETE',
        body: JSON.stringify({ id }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Failed to delete event')
      setEvents(prev => prev.filter(ev => ev.id !== id))
      if (selectedEventId === id) {
        setSelectedEventId('')
      }
      setError(null)
    } catch (err) {
      setError('Failed to delete event')
    }
  }

  const handleCreateQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.append('eventId', selectedEventId)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/questions`, {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData)),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Failed to create question')
      const { question: newQuestion } = await res.json()
      setQuestions(prev => [...prev, newQuestion])
      setShowQuestionForm(false)
      setError(null)
    } catch (err) {
      setError('Failed to create question')
    }
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setShowQuestionForm(true)
  }

  const handleUpdateQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingQuestion) return
    const formData = new FormData(e.currentTarget)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/questions`, {
        method: 'PUT',
        body: JSON.stringify({ id: editingQuestion.id, ...Object.fromEntries(formData) }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Failed to update question')
      const { question: updatedQuestion } = await res.json()
      setQuestions(prev => prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q))
      setEditingQuestion(null)
      setShowQuestionForm(false)
      setError(null)
    } catch (err) {
      setError('Failed to update question')
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/questions`, {
        method: 'DELETE',
        body: JSON.stringify({ id }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Failed to delete question')
      setQuestions(prev => prev.filter(q => q.id !== id))
      setError(null)
    } catch (err) {
      setError('Failed to delete question')
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/admin/login' })
  }

  if (loading && activeTab === 'metrics') {
    return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Sign out of admin panel"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md" role="alert">
            {error}
          </div>
        )}

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['metrics', 'events', 'questions', 'users'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-selected={activeTab === tab}
                aria-controls={`tab-${tab}`}
                id={`tab-${tab}-button`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'metrics' && (
            <div id="tab-metrics" role="tabpanel" aria-labelledby="tab-metrics-button">
              {metrics ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">U</span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                            <dd className="text-lg font-medium text-gray-900">{metrics.totalUsers}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">C</span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                            <dd className="text-lg font-medium text-gray-900">{metrics.completedUsers}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">%</span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Completion Rate</dt>
                            <dd className="text-lg font-medium text-gray-900">{metrics.completionRate}%</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p>Select an event to view metrics</p>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div id="tab-events" role="tabpanel" aria-labelledby="tab-events-button" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Events</h2>
                <button
                  onClick={() => setShowEventForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Create new event"
                >
                  Create Event
                </button>
              </div>

              {events.length > 0 ? (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {events.map((event) => (
                      <li key={event.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-start justify-between space-x-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                            <p className="text-sm text-gray-500 truncate">{event.description}</p>
                            <p className="text-sm text-gray-500">Date: {new Date(event.date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex flex-col items-center space-y-2 ml-4 flex-shrink-0">
                            <QRGenerator
                              value={`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}?eventId=${event.id}`}
                              size={96}
                              className="border border-gray-200 rounded-md p-1 bg-white"
                              aria-label={`QR code for event ${event.title}`}
                            />
                            <button
                              onClick={() => handleEditEvent(event)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium mr-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 w-full"
                              aria-label={`Edit ${event.title}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 w-full"
                              aria-label={`Delete ${event.title}`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>No events found</p>
              )}

              {showEventForm && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-4">{editingEvent ? 'Edit Event' : 'Create Event'}</h3>
                  <form onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent} className="space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Title
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        required
                        defaultValue={editingEvent?.title || ''}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={3}
                        defaultValue={editingEvent?.description || ''}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                        Date
                      </label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        defaultValue={editingEvent?.date || '2025-10-14'}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {editingEvent ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEventForm(false)
                          setEditingEvent(null)
                        }}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div id="tab-questions" role="tabpanel" aria-labelledby="tab-questions-button" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Questions</h2>
                {selectedEventId && (
                  <button
                    onClick={() => setShowQuestionForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Create new question"
                  >
                    Create Question
                  </button>
                )}
              </div>

              {!selectedEventId ? (
                <p>Select an event to view questions</p>
              ) : questions.length > 0 ? (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {questions.map((question) => (
                      <li key={question.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-gray-900">{question.content}</h3>
                            <p className="text-sm text-gray-500">Type: {question.type}</p>
                            {question.type === 'multiple_choice' && question.options && (
                              <p className="text-sm text-gray-500">Options: {Object.keys(question.options).join(', ')}</p>
                            )}
                            <p className="text-sm text-gray-500">Expected: {question.expectedAnswer}</p>
                            <p className="text-sm text-gray-500">AI Threshold: {question.aiThreshold}/10</p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <button
                              onClick={() => handleEditQuestion(question)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium mr-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                              aria-label={`Edit question ${question.content.substring(0, 20)}...`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(question.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                              aria-label={`Delete question ${question.content.substring(0, 20)}...`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>No questions found for this event</p>
              )}

              {showQuestionForm && selectedEventId && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-4">{editingQuestion ? 'Edit Question' : 'Create Question'}</h3>
                  <form onSubmit={editingQuestion ? handleUpdateQuestion : handleCreateQuestion} className="space-y-4">
                    <input type="hidden" name="eventId" value={selectedEventId} />
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                        Type
                      </label>
                      <select
                        id="type"
                        name="type"
                        required
                        defaultValue={editingQuestion?.type || 'text'}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        aria-required="true"
                      >
                        <option value="text">Text</option>
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="image">Image</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                        Content
                      </label>
                      <textarea
                        id="content"
                        name="content"
                        required
                        defaultValue={editingQuestion?.content || ''}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label htmlFor="expectedAnswer" className="block text-sm font-medium text-gray-700">
                        Expected Answer
                      </label>
                      <input
                        type="text"
                        id="expectedAnswer"
                        name="expectedAnswer"
                        required
                        defaultValue={editingQuestion?.expectedAnswer || ''}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label htmlFor="aiThreshold" className="block text-sm font-medium text-gray-700">
                        AI Threshold (0-10)
                      </label>
                      <input
                        type="number"
                        id="aiThreshold"
                        name="aiThreshold"
                        min="0"
                        max="10"
                        defaultValue={editingQuestion?.aiThreshold || 8}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {editingQuestion?.type === 'multiple_choice' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Options (JSON: {`{"A": "Option A", ...}`})</label>
                        <textarea
                          name="options"
                          rows={3}
                          defaultValue={editingQuestion?.options ? JSON.stringify(editingQuestion.options) : ''}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {editingQuestion ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuestionForm(false)
                          setEditingQuestion(null)
                        }}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div id="tab-users" role="tabpanel" aria-labelledby="tab-users-button" className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Users Progress</h2>
              {!selectedEventId ? (
                <p>Select an event to view users</p>
              ) : users.length > 0 ? (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <li key={user.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Progress: {user.completedQuestions}/{user.totalQuestions} ({Math.round((user.completedQuestions / user.totalQuestions) * 100) || 0}%)
                            </p>
                            <p className="text-sm text-gray-500">
                              Status: {user.completed ? 'Completed' : 'In Progress'}
                            </p>
                            <p className="text-sm text-gray-500">Started: {new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>No users found for this event</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center space-x-4">
          <label htmlFor="event-select" className="sr-only">
            Select event
          </label>
          <select
            id="event-select"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="block w-full max-w-xs border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            aria-label="Select event for questions and users"
          >
            <option value="">Select an event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} - {new Date(event.date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}