'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Webhook,
  Plus,
  MoreVertical,
  Trash2,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

const WEBHOOK_EVENTS = [
  { value: 'sheet.submitted', label: 'Sheet Submitted', description: 'When a supplier submits a sheet' },
  { value: 'sheet.approved', label: 'Sheet Approved', description: 'When a sheet is approved' },
  { value: 'sheet.rejected', label: 'Sheet Rejected', description: 'When a sheet is rejected' },
  { value: 'sheet.updated', label: 'Sheet Updated', description: 'When answers are modified' },
]

interface WebhookRecord {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  last_triggered_at: string | null
  last_status_code: number | null
  failure_count: number
  created_at: string
}

export function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(['sheet.submitted'])

  const fetchWebhooks = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setWebhooks(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const handleEventToggle = (event: string, checked: boolean) => {
    if (checked) {
      setEvents([...events, event])
    } else {
      setEvents(events.filter(e => e !== event))
    }
  }

  const handleCreate = async () => {
    if (!name.trim() || !url.trim() || events.length === 0) return

    setCreating(true)
    try {
      const response = await fetch('/api/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, events })
      })

      if (response.ok) {
        setCreateDialogOpen(false)
        setName('')
        setUrl('')
        setEvents(['sheet.submitted'])
        fetchWebhooks()
      }
    } catch (error) {
      console.error('Failed to create webhook:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (webhookId: string) => {
    const supabase = createClient()
    await supabase.from('webhooks').delete().eq('id', webhookId)
    fetchWebhooks()
  }

  const handleTest = async (webhookId: string) => {
    setTesting(webhookId)
    try {
      await fetch('/api/integrations/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_id: webhookId })
      })
      fetchWebhooks()
    } catch (error) {
      console.error('Failed to test webhook:', error)
    } finally {
      setTesting(null)
    }
  }

  const getStatusBadge = (webhook: WebhookRecord) => {
    if (!webhook.is_active) {
      return <Badge variant="secondary">Disabled</Badge>
    }
    if (webhook.failure_count >= 3) {
      return <Badge className="bg-red-100 text-red-700">Failed</Badge>
    }
    if (webhook.last_status_code && webhook.last_status_code >= 200 && webhook.last_status_code < 300) {
      return <Badge className="bg-green-100 text-green-700">Healthy</Badge>
    }
    if (webhook.last_triggered_at) {
      return <Badge className="bg-amber-100 text-amber-700">Warning</Badge>
    }
    return <Badge variant="secondary">Pending</Badge>
  }

  const maskUrl = (url: string) => {
    try {
      const parsed = new URL(url)
      return `${parsed.protocol}//${parsed.host}/***`
    } catch {
      return url.substring(0, 30) + '...'
    }
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Webhooks</CardTitle>
          </div>
          <CardDescription>
            Receive real-time notifications when events happen in Stacks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                Webhooks allow you to receive HTTP POST requests when specific events occur,
                such as when a supplier submits a sheet or when a sheet is approved.
                Each webhook includes an HMAC signature for verification.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Webhooks</CardTitle>
          <CardDescription>
            Manage your webhook endpoints and monitor their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No webhooks configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a webhook to receive real-time notifications
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">
                        {maskUrl(webhook.url)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event) => (
                          <Badge key={event} variant="secondary" className="text-xs">
                            {event.replace('sheet.', '')}
                          </Badge>
                        ))}
                        {webhook.events.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{webhook.events.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {webhook.last_triggered_at
                        ? formatDistanceToNow(new Date(webhook.last_triggered_at), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                    <TableCell>{getStatusBadge(webhook)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleTest(webhook.id)}
                            disabled={testing === webhook.id}
                          >
                            {testing === webhook.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            Test Webhook
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(webhook.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Add Webhook
            </DialogTitle>
            <DialogDescription>
              Configure a new webhook endpoint to receive event notifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">Name</Label>
              <Input
                id="webhook-name"
                placeholder="e.g., Slack Notifications"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-server.com/webhooks/stacks"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be a valid HTTPS URL that accepts POST requests
              </p>
            </div>

            <div className="space-y-3">
              <Label>Events to Subscribe</Label>
              {WEBHOOK_EVENTS.map((event) => (
                <div key={event.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={event.value}
                    checked={events.includes(event.value)}
                    onCheckedChange={(checked) =>
                      handleEventToggle(event.value, checked === true)
                    }
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label htmlFor={event.value} className="text-sm font-medium cursor-pointer">
                      {event.label}
                    </label>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !name.trim() || !url.trim() || events.length === 0}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Webhook'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
