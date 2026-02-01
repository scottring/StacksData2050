'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Copy, Check, AlertTriangle, Key } from 'lucide-react'

const API_SCOPES = [
  { value: 'sheets:read', label: 'Read Sheets', description: 'View sheet data and answers' },
  { value: 'sheets:export', label: 'Export Sheets', description: 'Download Excel/CSV exports' },
  { value: 'companies:read', label: 'Read Companies', description: 'View company information' },
  { value: 'webhooks:manage', label: 'Manage Webhooks', description: 'Configure webhook endpoints' },
]

interface CreateApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onKeyCreated: () => void
}

export function CreateApiKeyDialog({ open, onOpenChange, onKeyCreated }: CreateApiKeyDialogProps) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(['sheets:read'])
  const [expiresIn, setExpiresIn] = useState<string>('never')
  const [loading, setLoading] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScopeToggle = (scope: string, checked: boolean) => {
    if (checked) {
      setScopes([...scopes, scope])
    } else {
      setScopes(scopes.filter(s => s !== scope))
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a name for the API key')
      return
    }
    if (scopes.length === 0) {
      setError('Please select at least one scope')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/integrations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          scopes,
          expires_in: expiresIn
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create API key')
        return
      }

      setGeneratedKey(data.key)
      onKeyCreated()
    } catch (err) {
      setError('Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setName('')
    setScopes(['sheets:read'])
    setExpiresIn('never')
    setGeneratedKey(null)
    setCopied(false)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {generatedKey ? 'API Key Created' : 'Create API Key'}
          </DialogTitle>
          <DialogDescription>
            {generatedKey
              ? 'Copy your API key now. You won\'t be able to see it again.'
              : 'Create a new API key to access your data programmatically.'}
          </DialogDescription>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4 py-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Make sure to copy your API key now. You won't be able to see it again!
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Your API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedKey}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyKey} variant="outline">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Usage:</p>
              <code className="block bg-muted p-2 rounded text-xs">
                curl -H "Authorization: Bearer {generatedKey.substring(0, 20)}..." \<br />
                &nbsp;&nbsp;{process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'}/api/v1/sheets
              </code>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                placeholder="e.g., SAP Integration, Data Warehouse"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name to identify this key
              </p>
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              {API_SCOPES.map((scope) => (
                <div key={scope.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={scope.value}
                    checked={scopes.includes(scope.value)}
                    onCheckedChange={(checked) =>
                      handleScopeToggle(scope.value, checked === true)
                    }
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label
                      htmlFor={scope.value}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {scope.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {scope.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expiration</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expires</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                  <SelectItem value="1y">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          {generatedKey ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Key'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
