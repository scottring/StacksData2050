'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import { ContactRow } from './contact-row'
import { ContactFormSheet } from './contact-form-sheet'
import { useContacts, type Contact } from './use-contacts'

interface Props {
  companyId: string
}

export function ContactsCard({ companyId }: Props) {
  const { contacts, loading, error, create, update, remove, setPrimary } =
    useContacts(companyId)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | undefined>(undefined)

  function openAdd() {
    setEditing(undefined)
    setSheetOpen(true)
  }

  function openEdit(contact: Contact) {
    setEditing(contact)
    setSheetOpen(true)
  }

  const ordered = [...contacts].sort((a, b) => {
    const aPrimary = a.is_company_main_contact === true
    const bPrimary = b.is_company_main_contact === true
    if (aPrimary !== bPrimary) return aPrimary ? -1 : 1
    return (a.full_name ?? '').localeCompare(b.full_name ?? '')
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contacts</CardTitle>
        <Button variant="ghost" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Failed to load contacts: {error}</p>
        ) : ordered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Users className="h-8 w-8 opacity-40" />
            <span className="text-sm">No contacts yet</span>
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add the first contact
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {ordered.map((c) => (
              <ContactRow
                key={c.id}
                contact={c}
                onEdit={openEdit}
                onSetPrimary={setPrimary}
                onDelete={remove}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ContactFormSheet
        mode={editing ? 'edit' : 'add'}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        contact={editing}
        onSubmit={async (input) => {
          if (editing) {
            await update(editing.id, input)
          } else {
            await create(input)
          }
        }}
      />
    </Card>
  )
}
