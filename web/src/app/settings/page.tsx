'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Building2,
  Bell,
  Shield,
  Key,
  Globe,
  Mail,
  Save,
  Link2,
  Check,
  ArrowRight,
  Server,
  Cloud,
  Database,
  Zap,
  MessageSquarePlus,
} from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  return (
    <AppLayout title="Settings">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and application preferences
          </p>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>
              Your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <Input defaultValue="Admin" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <Input defaultValue="User" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input defaultValue="admin@stacksdata.com" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input defaultValue="+1 (555) 123-4567" className="mt-1" />
            </div>
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Company Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Company</CardTitle>
            </div>
            <CardDescription>
              Your organization's information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Name</label>
              <Input defaultValue="Stacks Data" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Industry</label>
              <Input defaultValue="Food & Beverage Manufacturing" className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700">Verified</Badge>
              <span className="text-sm text-muted-foreground">Association member since 2021</span>
            </div>
          </CardContent>
        </Card>

        {/* Custom Questions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Custom Questions</CardTitle>
            </div>
            <CardDescription>
              Create custom questions to include in supplier requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add your own questions to gather specific information from suppliers
              alongside the standard questionnaire.
            </p>
            <Link href="/settings/questions">
              <Button variant="outline" className="w-full">
                Manage Custom Questions
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive updates and alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Badge>Enabled</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sheet Submission Alerts</p>
                <p className="text-sm text-muted-foreground">When suppliers submit questionnaires</p>
              </div>
              <Badge>Enabled</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Regulatory Updates</p>
                <p className="text-sm text-muted-foreground">Important regulatory changes</p>
              </div>
              <Badge>Enabled</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Weekly Digest</p>
                <p className="text-sm text-muted-foreground">Summary of activity</p>
              </div>
              <Badge variant="outline">Disabled</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>
              Manage your security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm">
                <Key className="h-4 w-4 mr-2" />
                Enable
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Session Timeout</p>
                <p className="text-sm text-muted-foreground">Automatically log out after inactivity</p>
              </div>
              <Badge variant="outline">30 minutes</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Integrations</CardTitle>
            </div>
            <CardDescription>
              Connect with enterprise systems and external services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Zap className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">REST API</p>
                  <p className="text-sm text-muted-foreground">API access enabled</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700">
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Server className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">SAP S/4HANA</p>
                  <p className="text-sm text-muted-foreground">ERP integration available</p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-700">Available</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Cloud className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Salesforce</p>
                  <p className="text-sm text-muted-foreground">CRM integration available</p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-700">Available</Badge>
            </div>
            <Separator />
            <Link href="/integrations">
              <Button variant="outline" className="w-full">
                View All Integrations
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
