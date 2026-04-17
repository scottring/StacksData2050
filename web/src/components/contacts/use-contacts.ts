'use client'

import { useCallback, useEffect, useState } from 'react'

export interface Contact {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  phone_text: string | null
  job_title: string | null
  is_company_main_contact: boolean | null
  has_logged_in: boolean | null
}

export interface ContactInput {
  first_name: string
  last_name: string
  email: string
  phone_text?: string
  job_title?: string
  is_primary?: boolean
  send_invite?: boolean
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function useContacts(companyId: string) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/contacts`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as Contact[]
      setContacts(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const create = useCallback(
    async (input: ContactInput) => {
      const res = await fetch(`/api/companies/${companyId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(json.error || 'Failed', res.status)
      await refetch()
      return json as { contact: Contact; invite_sent: boolean }
    },
    [companyId, refetch]
  )

  const update = useCallback(
    async (contactId: string, patch: Partial<ContactInput>) => {
      const res = await fetch(`/api/companies/${companyId}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(json.error || 'Failed', res.status)
      await refetch()
      return json as { contact: Contact }
    },
    [companyId, refetch]
  )

  const remove = useCallback(
    async (contactId: string) => {
      const res = await fetch(`/api/companies/${companyId}/contacts/${contactId}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(json.error || 'Failed', res.status)
      await refetch()
    },
    [companyId, refetch]
  )

  const setPrimary = useCallback(
    (contactId: string) => update(contactId, { is_primary: true }),
    [update]
  )

  return { contacts, loading, error, refetch, create, update, remove, setPrimary }
}
