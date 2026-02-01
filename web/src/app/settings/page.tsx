'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
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
  Save,
  ArrowRight,
  MessageSquarePlus,
  CheckCircle2,
  Settings2,
  Mail,
  Phone,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  return (
    <AppLayout title="Settings">
      <div className="space-y-8 max-w-4xl mx-auto">
        <PageHeader
          title="Settings"
          description="Manage your account and application preferences"
        />

        {/* Profile Settings */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden opacity-0 animate-fade-in-up animation-delay-100" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="bg-gradient-to-br from-slate-50/50 to-white border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-100">
                <User className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Profile</CardTitle>
                <CardDescription>
                  Your personal information and contact details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">First Name</label>
                <Input defaultValue="Admin" className="rounded-xl border-slate-200 focus:border-sky-300 focus:ring-sky-200" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Last Name</label>
                <Input defaultValue="User" className="rounded-xl border-slate-200 focus:border-sky-300 focus:ring-sky-200" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                Email
              </label>
              <Input defaultValue="admin@stacksdata.com" className="rounded-xl border-slate-200 focus:border-sky-300 focus:ring-sky-200" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                Phone
              </label>
              <Input defaultValue="+1 (555) 123-4567" className="rounded-xl border-slate-200 focus:border-sky-300 focus:ring-sky-200" />
            </div>
            <Button className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-sm">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Company Settings */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden opacity-0 animate-fade-in-up animation-delay-150" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="bg-gradient-to-br from-slate-50/50 to-white border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-100">
                <Building2 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Company</CardTitle>
                <CardDescription>
                  Your organization's information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Company Name</label>
              <Input defaultValue="Stacks Data" className="rounded-xl border-slate-200 focus:border-violet-300 focus:ring-violet-200" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Industry</label>
              <Input defaultValue="Food & Beverage Manufacturing" className="rounded-xl border-slate-200 focus:border-violet-300 focus:ring-violet-200" />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200/50 font-medium">Verified</Badge>
                <span className="text-sm text-slate-600 ml-2">Association member since 2021</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Questions */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden opacity-0 animate-fade-in-up animation-delay-200" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="bg-gradient-to-br from-slate-50/50 to-white border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100">
                <MessageSquarePlus className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Custom Questions</CardTitle>
                <CardDescription>
                  Create custom questions to include in supplier requests
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-4">
              Add your own questions to gather specific information from suppliers alongside the standard questionnaire.
            </p>
            <Link href="/settings/questions">
              <Button variant="outline" className="w-full rounded-xl border-slate-200 hover:bg-slate-50 hover:border-slate-300 group">
                <Settings2 className="h-4 w-4 mr-2 text-slate-500" />
                Manage Custom Questions
                <ArrowRight className="h-4 w-4 ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden opacity-0 animate-fade-in-up animation-delay-250" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="bg-gradient-to-br from-slate-50/50 to-white border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100">
                <Bell className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>
                  Configure how you receive updates and alerts
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 pt-6">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Email Notifications</p>
                <p className="text-sm text-slate-500">Receive updates via email</p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/50 font-medium">Enabled</Badge>
            </div>
            <Separator className="bg-slate-100" />
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Sheet Submission Alerts</p>
                <p className="text-sm text-slate-500">When suppliers submit questionnaires</p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/50 font-medium">Enabled</Badge>
            </div>
            <Separator className="bg-slate-100" />
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Regulatory Updates</p>
                <p className="text-sm text-slate-500">Important regulatory changes</p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/50 font-medium">Enabled</Badge>
            </div>
            <Separator className="bg-slate-100" />
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Weekly Digest</p>
                <p className="text-sm text-slate-500">Summary of activity</p>
              </div>
              <Badge variant="outline" className="border-slate-200 text-slate-500 font-medium">Disabled</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden opacity-0 animate-fade-in-up animation-delay-300" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="bg-gradient-to-br from-slate-50/50 to-white border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100">
                <Shield className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Security</CardTitle>
                <CardDescription>
                  Manage your security preferences
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 pt-6">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                <p className="text-sm text-slate-500">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-50">
                <Key className="h-4 w-4 mr-2" />
                Enable
              </Button>
            </div>
            <Separator className="bg-slate-100" />
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Session Timeout</p>
                <p className="text-sm text-slate-500">Automatically log out after inactivity</p>
              </div>
              <Badge variant="outline" className="border-slate-200 text-slate-600 font-medium">30 minutes</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
