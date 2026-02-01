'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RequestSheetDialog } from '@/components/sheets/request-sheet-dialog'

interface SupplierDetailActionsProps {
  supplierId: string
  supplierName: string
}

export function SupplierDetailActions({ supplierId, supplierName }: SupplierDetailActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New Product Sheet
      </Button>
      <RequestSheetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
