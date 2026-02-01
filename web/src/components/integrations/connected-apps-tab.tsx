'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plug,
  Database,
  Cloud,
  FileJson,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  status: 'available' | 'coming_soon' | 'connected'
  category: string
  features: string[]
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'sap',
    name: 'SAP',
    description: 'Export compliance data in IDoc-compatible format for SAP Material Master integration',
    icon: <Database className="h-8 w-8" />,
    status: 'available',
    category: 'ERP Systems',
    features: [
      'IDoc JSON format for SAP PI/PO',
      'Material Master (MATMAS) structure',
      'Batch export support',
      'Custom field mapping',
    ],
  },
  {
    id: 'rest-api',
    name: 'REST API',
    description: 'Full programmatic access to your compliance data via authenticated REST endpoints',
    icon: <FileJson className="h-8 w-8" />,
    status: 'available',
    category: 'Developer Tools',
    features: [
      'JSON response format',
      'API key authentication',
      'Rate limiting protection',
      'Comprehensive documentation',
    ],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sync compliance data with Salesforce accounts and custom objects',
    icon: <Cloud className="h-8 w-8" />,
    status: 'coming_soon',
    category: 'CRM',
    features: [
      'Account synchronization',
      'Custom object mapping',
      'Real-time updates',
      'Bi-directional sync',
    ],
  },
  {
    id: 'oracle',
    name: 'Oracle ERP Cloud',
    description: 'Integrate with Oracle ERP Cloud for supplier qualification workflows',
    icon: <Database className="h-8 w-8" />,
    status: 'coming_soon',
    category: 'ERP Systems',
    features: [
      'Supplier Portal integration',
      'Qualification workflows',
      'Document attachments',
      'Approval routing',
    ],
  },
]

export function ConnectedAppsTab() {
  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )
      case 'available':
        return <Badge className="bg-blue-100 text-blue-700">Available</Badge>
      case 'coming_soon':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Coming Soon
          </Badge>
        )
    }
  }

  const getActionButton = (integration: Integration) => {
    switch (integration.status) {
      case 'connected':
        return (
          <Button variant="outline" size="sm">
            Configure
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )
      case 'available':
        return (
          <Button size="sm">
            Set Up
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )
      case 'coming_soon':
        return (
          <Button variant="outline" size="sm" disabled>
            Notify Me
          </Button>
        )
    }
  }

  // Group integrations by category
  const categories = Array.from(new Set(INTEGRATIONS.map(i => i.category)))

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Connected Apps</CardTitle>
          </div>
          <CardDescription>
            Connect Stacks with your ERP, CRM, and other enterprise systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Stacks is designed to be a global distribution center for environmental compliance data.
            Connect with your existing systems to automatically sync supplier data, trigger workflows,
            and ensure your compliance information is always up-to-date across your organization.
          </p>
        </CardContent>
      </Card>

      {/* Integrations by Category */}
      {categories.map((category) => (
        <div key={category} className="space-y-4">
          <h3 className="text-lg font-semibold">{category}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {INTEGRATIONS.filter(i => i.category === category).map((integration) => (
              <Card key={integration.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {integration.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        {getStatusBadge(integration.status)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground mb-4">
                    {integration.description}
                  </p>
                  <ul className="text-sm space-y-1.5 mb-4 flex-1">
                    {integration.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-2">
                    {getActionButton(integration)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Custom Integration */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center py-4">
            <div className="p-3 rounded-full bg-muted mb-4">
              <Plug className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Need a Custom Integration?</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Our REST API supports any integration. Use API keys to connect with
              your internal systems, data warehouses, or custom applications.
            </p>
            <Button variant="outline" asChild>
              <a href="/api/v1/docs" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View API Documentation
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
