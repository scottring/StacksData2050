'use client'

import { useEffect, useRef } from 'react'
import { trackPageView, trackSheetViewed, trackTrialEvent, TrialEventType } from '@/lib/trial-tracking'

interface TrackPageViewProps {
  pageName?: string
}

/**
 * Client component to track page views from server components
 */
export function TrackPageView({ pageName }: TrackPageViewProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true
      trackPageView(pageName)
    }
  }, [pageName])

  return null
}

interface TrackSheetViewProps {
  sheetId: string
  sheetName?: string
}

/**
 * Client component to track sheet views from server components
 */
export function TrackSheetView({ sheetId, sheetName }: TrackSheetViewProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true
      trackSheetViewed(sheetId, sheetName)
    }
  }, [sheetId, sheetName])

  return null
}

interface TrackEventProps {
  eventType: TrialEventType
  eventData?: Record<string, unknown>
  email?: string
}

/**
 * Generic client component to track any event from server components
 */
export function TrackEvent({ eventType, eventData, email }: TrackEventProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true
      trackTrialEvent({
        event_type: eventType,
        event_data: eventData,
        email,
      })
    }
  }, [eventType, eventData, email])

  return null
}
