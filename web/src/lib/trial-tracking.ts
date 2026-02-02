/**
 * Trial Activity Tracking Utility
 *
 * Use this to log user activity during trials.
 * Events are only recorded for users who came through trial invitations.
 */

export type TrialEventType =
  | 'login'
  | 'page_view'
  | 'sheet_viewed'
  | 'sheet_created'
  | 'answer_submitted'
  | 'answer_updated'
  | 'file_uploaded'
  | 'export_downloaded'
  | 'discovery_started'
  | 'discovery_completed'
  | 'follow_up_completed'

interface TrackEventOptions {
  event_type: TrialEventType
  event_data?: Record<string, unknown>
  page_path?: string
  email?: string // For pre-auth tracking (discovery page)
}

/**
 * Track a trial activity event
 * Non-blocking - failures are silently ignored to not disrupt user experience
 */
export async function trackTrialEvent(options: TrackEventOptions): Promise<void> {
  try {
    // Fire and forget - don't await in most cases
    fetch('/api/trial/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: options.event_type,
        event_data: options.event_data || {},
        page_path: options.page_path || (typeof window !== 'undefined' ? window.location.pathname : undefined),
        email: options.email,
      }),
    }).catch(() => {
      // Silently ignore errors - tracking should never break the app
    })
  } catch {
    // Silently ignore
  }
}

/**
 * Track a page view
 */
export function trackPageView(pageName?: string): void {
  trackTrialEvent({
    event_type: 'page_view',
    event_data: pageName ? { page_name: pageName } : undefined,
  })
}

/**
 * Track sheet viewed
 */
export function trackSheetViewed(sheetId: string, sheetName?: string): void {
  trackTrialEvent({
    event_type: 'sheet_viewed',
    event_data: { sheet_id: sheetId, sheet_name: sheetName },
  })
}

/**
 * Track sheet created
 */
export function trackSheetCreated(sheetId: string, sheetName?: string): void {
  trackTrialEvent({
    event_type: 'sheet_created',
    event_data: { sheet_id: sheetId, sheet_name: sheetName },
  })
}

/**
 * Track answer submitted
 */
export function trackAnswerSubmitted(questionId: string, sheetId: string): void {
  trackTrialEvent({
    event_type: 'answer_submitted',
    event_data: { question_id: questionId, sheet_id: sheetId },
  })
}

/**
 * Track answer updated
 */
export function trackAnswerUpdated(questionId: string, sheetId: string): void {
  trackTrialEvent({
    event_type: 'answer_updated',
    event_data: { question_id: questionId, sheet_id: sheetId },
  })
}

/**
 * Track file uploaded
 */
export function trackFileUploaded(sheetId: string, fileName?: string): void {
  trackTrialEvent({
    event_type: 'file_uploaded',
    event_data: { sheet_id: sheetId, file_name: fileName },
  })
}

/**
 * Track export downloaded
 */
export function trackExportDownloaded(sheetId: string, format?: string): void {
  trackTrialEvent({
    event_type: 'export_downloaded',
    event_data: { sheet_id: sheetId, format },
  })
}

/**
 * Track login
 */
export function trackLogin(): void {
  trackTrialEvent({
    event_type: 'login',
  })
}

/**
 * Track discovery form events (pre-auth, requires email)
 */
export function trackDiscoveryStarted(email: string): void {
  trackTrialEvent({
    event_type: 'discovery_started',
    email,
  })
}

export function trackDiscoveryCompleted(email: string): void {
  trackTrialEvent({
    event_type: 'discovery_completed',
    email,
  })
}

export function trackFollowUpCompleted(email: string): void {
  trackTrialEvent({
    event_type: 'follow_up_completed',
    email,
  })
}
