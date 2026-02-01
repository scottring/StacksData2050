'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RequestSheetDialog } from '@/components/sheets/request-sheet-dialog'

export function CreateFirstSheetButton() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" className="mt-2" onClick={() => setDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Create First Sheet
      </Button>
      <RequestSheetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
