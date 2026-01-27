'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Tag {
  id: string
  name: string | null
  description?: string | null
}

interface TagMultiSelectProps {
  tags: Tag[]
  selectedTags: string[]
  onSelectionChange: (tagIds: string[]) => void
  placeholder?: string
}

export function TagMultiSelect({
  tags,
  selectedTags,
  onSelectionChange,
  placeholder = 'Select tags...'
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedTagObjects = tags.filter(t => selectedTags.includes(t.id))

  const handleSelect = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      // Remove tag
      onSelectionChange(selectedTags.filter(id => id !== tagId))
    } else {
      // Add tag
      onSelectionChange([...selectedTags, tagId])
    }
  }

  const handleRemove = (tagId: string) => {
    onSelectionChange(selectedTags.filter(id => id !== tagId))
  }

  return (
    <div className="space-y-2">
      {/* Selected tags as chips */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTagObjects.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="pl-2 pr-1 py-1"
            >
              {tag.name || 'Unnamed'}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-2 hover:bg-transparent"
                onClick={() => handleRemove(tag.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Combobox for searching and selecting */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id)
                return (
                  <CommandItem
                    key={tag.id}
                    value={tag.name || 'Unnamed'}
                    onSelect={() => handleSelect(tag.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{tag.name || 'Unnamed'}</span>
                      {tag.description && (
                        <span className="text-xs text-muted-foreground">
                          {tag.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
