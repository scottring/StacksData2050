'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Check,
  Cloud,
  Database,
  FileSpreadsheet,
  Globe,
  Link2,
  Lock,
  RefreshCw,
  Server,
  Settings,
  Zap,
} from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  category: 'erp' | 'plm' | 'crm' | 'compliance' | 'data'
  icon: React.ReactNode
  status: 'connected' | 'available' | 'coming_soon'
  features: string[]
}

const integrations: Integration[] = [
  {
    id: 'sap',
    name: 'SAP S/4HANA',
    description: 'Sync supplier data, materials, and compliance records with SAP ERP',
    category: 'erp',
    icon: <Server className="h-8 w-8" />,
    status: 'available',
    features: ['Material master sync', 'Vendor management', 'Compliance documents', 'Batch records'],
  },
  {
    id: 'oracle',
    name: 'Oracle Cloud',
    description: 'Connect to Oracle ERP for procurement and supplier management',
    category: 'erp',
    icon: <Database className="h-8 w-8" />,
    status: 'available',
    features: ['Supplier portal', 'Purchase orders', 'Quality management', 'Document storage'],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Integrate customer and supplier data with Salesforce CRM',
    category: 'crm',
    icon: <Cloud className="h-8 w-8" />,
    status: 'available',
    features: ['Account sync', 'Contact management', 'Activity tracking', 'Custom objects'],
  },
  {
    id: 'windchill',
    name: 'PTC Windchill',
    description: 'Product lifecycle management and BOM integration',
    category: 'plm',
    icon: <RefreshCw className="h-8 w-8" />,
    status: 'available',
    features: ['BOM sync', 'Part compliance', 'Change management', 'Document linking'],
  },
  {
    id: 'teamcenter',
    name: 'Siemens Teamcenter',
    description: 'PLM integration for product data and compliance tracking',
    category: 'plm',
    icon: <Settings className="h-8 w-8" />,
    status: 'coming_soon',
    features: ['Product structures', 'Compliance workflows', 'Supplier data', 'Revision control'],
  },
  {
    id: 'ihs',
    name: 'IHS Markit',
    description: 'Real-time regulatory compliance and substance data',
    category: 'compliance',
    icon: <Globe className="h-8 w-8" />,
    status: 'available',
    features: ['REACH/RoHS data', 'Substance screening', 'Regulatory updates', 'Risk alerts'],
  },
  {
    id: 'sphera',
    name: 'Sphera',
    description: 'Environmental compliance and sustainability data',
    category: 'compliance',
    icon: <Globe className="h-8 w-8" />,
    status: 'available',
    features: ['SDS management', 'Chemical inventory', 'Sustainability metrics', 'Audit trails'],
  },
  {
    id: 'excel',
    name: 'Microsoft Excel',
    description: 'Import/export data via Excel spreadsheets',
    category: 'data',
    icon: <FileSpreadsheet className="h-8 w-8" />,
    status: 'connected',
    features: ['Bulk import', 'Template export', 'Report generation', 'Data validation'],
  },
  {
    id: 'api',
    name: 'REST API',
    description: 'Custom integrations via our comprehensive REST API',
    category: 'data',
    icon: <Zap className="h-8 w-8" />,
    status: 'connected',
    features: ['Full CRUD operations', 'Webhooks', 'OAuth 2.0', 'Rate limiting'],
  },
]

const categoryLabels: Record<string, string> = {
  erp: 'ERP Systems',
  plm: 'PLM Systems',
  crm: 'CRM Systems',
  compliance: 'Compliance Databases',
  data: 'Data & APIs',
}

export default function IntegrationsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredIntegrations = selectedCategory === 'all'
    ? integrations
    : integrations.filter(i => i.category === selectedCategory)

  const connectedCount = integrations.filter(i => i.status === 'connected').length
  const availableCount = integrations.filter(i => i.status === 'available').length

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-700">
            <Check className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )
      case 'available':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            Available
          </Badge>
        )
      case 'coming_soon':
        return (
          <Badge variant="outline">
            Coming Soon
          </Badge>
        )
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'erp': return 'text-purple-600 bg-purple-100'
      case 'plm': return 'text-blue-600 bg-blue-100'
      case 'crm': return 'text-green-600 bg-green-100'
      case 'compliance': return 'text-amber-600 bg-amber-100'
      case 'data': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <AppLayout title="Integrations">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Link2 className="h-6 w-6" />
              Enterprise Integrations
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect Stacks with your existing enterprise systems
            </p>
          </div>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Configure API
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{connectedCount}</p>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Link2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{availableCount}</p>
                  <p className="text-sm text-muted-foreground">Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <RefreshCw className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">Real-time</p>
                  <p className="text-sm text-muted-foreground">Data Sync</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Lock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">SOC 2</p>
                  <p className="text-sm text-muted-foreground">Compliant</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All Integrations
          </Button>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIntegrations.map((integration) => (
            <Card key={integration.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${getCategoryColor(integration.category)}`}>
                    {integration.icon}
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
                <CardTitle className="mt-4">{integration.name}</CardTitle>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {integration.features.map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    variant={integration.status === 'connected' ? 'outline' : 'default'}
                    disabled={integration.status === 'coming_soon'}
                  >
                    {integration.status === 'connected' ? (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </>
                    ) : integration.status === 'available' ? (
                      <>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Connect
                      </>
                    ) : (
                      'Coming Soon'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* API Documentation Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              REST API Access
            </CardTitle>
            <CardDescription>
              Build custom integrations with our comprehensive API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Available Endpoints</h4>
                <div className="space-y-2 text-sm font-mono bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 text-xs">GET</Badge>
                    <span>/api/v1/sheets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 text-xs">GET</Badge>
                    <span>/api/v1/suppliers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 text-xs">POST</Badge>
                    <span>/api/v1/answers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-700 text-xs">PUT</Badge>
                    <span>/api/v1/sheets/:id/status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700 text-xs">WEBHOOK</Badge>
                    <span>/api/v1/webhooks/subscribe</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium">Integration Features</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>OAuth 2.0 authentication</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Real-time webhooks for status changes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Bulk import/export operations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Rate limiting with burst support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Sandbox environment for testing</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full">
                  View API Documentation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
