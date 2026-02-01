'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiKeysTab } from '@/components/integrations/api-keys-tab'
import { ExcelExportTab } from '@/components/integrations/excel-export-tab'
import { WebhooksTab } from '@/components/integrations/webhooks-tab'
import { ConnectedAppsTab } from '@/components/integrations/connected-apps-tab'
import { Key, FileSpreadsheet, Webhook, Plug } from 'lucide-react'

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState('api-access')

  return (
    <AppLayout title="Integrations">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect Stacks with your systems and export compliance data in any format
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="api-access" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">API Access</span>
            </TabsTrigger>
            <TabsTrigger value="excel-export" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Excel Export</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">Webhooks</span>
            </TabsTrigger>
            <TabsTrigger value="connected-apps" className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">Connected Apps</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-access">
            <ApiKeysTab />
          </TabsContent>

          <TabsContent value="excel-export">
            <ExcelExportTab />
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhooksTab />
          </TabsContent>

          <TabsContent value="connected-apps">
            <ConnectedAppsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
