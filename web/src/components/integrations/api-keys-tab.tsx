'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Key, MoreVertical, Copy, Trash2, RefreshCw, ExternalLink, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CreateApiKeyDialog } from './create-api-key-dialog'
import { formatDistanceToNow } from 'date-fns'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  is_active: boolean
  last_used_at: string | null
  created_at: string
  expires_at: string | null
}

export function ApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const fetchApiKeys = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, is_active, last_used_at, created_at, expires_at')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setApiKeys(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const handleRevoke = async (keyId: string) => {
    const supabase = createClient()

    await supabase
      .from('api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq('id', keyId)

    fetchApiKeys()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* API Documentation Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <CardTitle>API Access</CardTitle>
          </div>
          <CardDescription>
            Use API keys to programmatically access your compliance data from external systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                API keys allow you to integrate Stacks with your ERP systems, data warehouses,
                and other applications. Each key can have specific permissions and rate limits.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/v1/docs" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    API Documentation
                  </a>
                </Button>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your API Keys</CardTitle>
          <CardDescription>
            Manage your API keys and monitor their usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No API keys yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first API key to start integrating with external systems
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">
                          {key.key_prefix}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(key.key_prefix)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.slice(0, 2).map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope.replace(':', ' ')}
                          </Badge>
                        ))}
                        {key.scopes.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{key.scopes.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {key.last_used_at
                        ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {key.is_active ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Revoked</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyToClipboard(key.key_prefix)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Prefix
                          </DropdownMenuItem>
                          {key.is_active && (
                            <DropdownMenuItem
                              onClick={() => handleRevoke(key.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Revoke Key
                            </DropdownMenuItem>
                          )}
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

      <CreateApiKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onKeyCreated={fetchApiKeys}
      />
    </div>
  )
}
