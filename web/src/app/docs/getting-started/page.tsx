import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, LogIn, LayoutDashboard, FileSpreadsheet, Send, Upload, Settings, HelpCircle } from 'lucide-react'

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/stacks-logo-new.png" 
              alt="Stacks Data" 
              width={140} 
              height={40}
              className="h-10 w-auto"
            />
          </div>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>

      {/* Back to Trial */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <Link href="/trial" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Trial Welcome
        </Link>
      </div>

      {/* Title */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Quick Start Guide</h1>
        <p className="text-lg text-muted-foreground">
          Everything you need to know to get up and running with the new Stacks.
        </p>
      </div>

      {/* What's New Section */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <Card className="bg-primary/5 border-primary/20 mb-8">
          <CardHeader>
            <CardTitle className="text-xl">What's New in Stacks 2026?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>If you used the previous version of Stacks, here's what's changed:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Modern Interface</strong> — Completely redesigned for speed and clarity</li>
              <li><strong>Excel Import</strong> — Upload your existing HQ 2.1 workbooks directly</li>
              <li><strong>Custom Questions</strong> — Create your own compliance questions</li>
              <li><strong>Real-time Collaboration</strong> — See updates as they happen</li>
              <li><strong>Better Search</strong> — Find any product, sheet, or supplier instantly</li>
            </ul>
            <p className="pt-2">Your historical data has been migrated — you'll see it when you log in.</p>
          </CardContent>
        </Card>
      </div>

      {/* Steps */}
      <div className="max-w-4xl mx-auto px-4 pb-16 space-y-6">
        
        {/* Step 1 */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              1
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Sign In
              </CardTitle>
              <CardDescription>Access your account</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-[4.5rem]">
            <p className="text-muted-foreground mb-3">
              Use the email address associated with your company. If you're new or having trouble, 
              contact us at <a href="mailto:support@stacksdata.com" className="text-primary hover:underline">support@stacksdata.com</a>.
            </p>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Go to Sign In <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              2
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                Explore Your Dashboard
              </CardTitle>
              <CardDescription>See your company's data at a glance</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-[4.5rem]">
            <p className="text-muted-foreground">
              Your dashboard shows an overview of your compliance activity — pending requests, 
              recent sheets, and quick actions. Use the sidebar to navigate to different sections.
            </p>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              3
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                View Your Compliance Sheets
              </CardTitle>
              <CardDescription>Find your historical data</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-[4.5rem]">
            <p className="text-muted-foreground mb-3">
              Go to <strong>Sheets</strong> in the sidebar to see all compliance sheets involving your company. 
              You can filter by status, search by product name, or browse by supplier/customer.
            </p>
            <p className="text-muted-foreground">
              Your data from the previous Stacks system has been migrated here.
            </p>
          </CardContent>
        </Card>

        {/* Step 4 - For Customers */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              4a
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send a Request (Customers)
              </CardTitle>
              <CardDescription>Request product information from suppliers</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-[4.5rem]">
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Go to <strong>Requests</strong> → <strong>New Request</strong></li>
              <li>Select the supplier you want to request from</li>
              <li>Choose the products you need information about</li>
              <li>Select which question sections to include (or add custom questions)</li>
              <li>Click <strong>Send Request</strong></li>
            </ol>
            <p className="text-muted-foreground mt-3">
              Your supplier will receive an email notification and can respond directly in Stacks.
            </p>
          </CardContent>
        </Card>

        {/* Step 4b - For Suppliers */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              4b
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Respond to a Request (Suppliers)
              </CardTitle>
              <CardDescription>Fill out compliance sheets for your customers</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-[4.5rem]">
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>You'll receive an email when a customer sends a request</li>
              <li>Click the link or go to <strong>Requests</strong> → <strong>Pending</strong></li>
              <li>Open the request and fill out each product's compliance sheet</li>
              <li>Click <strong>Submit</strong> when complete</li>
            </ol>
            <p className="text-muted-foreground mt-3">
              Previously answered questions may be pre-filled from your historical data.
            </p>
          </CardContent>
        </Card>

        {/* Step 5 */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              5
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Excel Workbooks
              </CardTitle>
              <CardDescription>Bring in data from HQ 2.1 workbooks</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-[4.5rem]">
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Go to <strong>Import</strong> in the sidebar</li>
              <li>Drag and drop your HQ 2.1 Excel workbook (or click to browse)</li>
              <li>Review the preview — check that products and answers look correct</li>
              <li>Click <strong>Import</strong> to create sheets from the workbook</li>
            </ol>
            <p className="text-muted-foreground mt-3">
              <strong>Tip:</strong> You can import multiple workbooks. Duplicates are detected automatically.
            </p>
          </CardContent>
        </Card>

        {/* Step 6 */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              6
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Custom Questions (Optional)
              </CardTitle>
              <CardDescription>Add your own compliance questions</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-[4.5rem]">
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Go to <strong>Settings</strong> → <strong>Custom Questions</strong></li>
              <li>Click <strong>Add Question</strong></li>
              <li>Enter your question text and choose the answer type</li>
              <li>When creating requests, you can include your custom questions</li>
            </ol>
          </CardContent>
        </Card>

        {/* Help */}
        <Card className="bg-muted/50">
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-muted-foreground/20 flex items-center justify-center shrink-0">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>We're here for you</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-[4.5rem]">
            <p className="text-muted-foreground mb-3">
              If you run into any issues or have questions:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Email us: <a href="mailto:support@stacksdata.com" className="text-primary hover:underline">support@stacksdata.com</a></li>
              <li>Report issues directly from the <Link href="/trial" className="text-primary hover:underline">trial page</Link></li>
            </ul>
            <p className="text-muted-foreground mt-3">
              We typically respond within a few hours during the trial period.
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Footer */}
      <div className="border-t bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2026 Stacks Data. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
