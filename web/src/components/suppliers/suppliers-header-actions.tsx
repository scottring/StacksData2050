'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, Download, UserPlus } from 'lucide-react'
import { InviteSupplierDialog } from './invite-supplier-dialog'

export function SuppliersHeaderActions() {
  const router = useRouter()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  const handleInviteSuccess = () => {
    // Refresh the page to show the new supplier
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Supplier
        </Button>
      </div>

      <InviteSupplierDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={handleInviteSuccess}
      />
    </>
  )
}
