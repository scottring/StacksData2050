'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Minimal read-only view of the Zone A / Zone B form data stored on the
// workflow as JSONB. Not every field is always present — we render what
// we have and skip nulls.

type ZoneA = {
  requesting_department?: string
  asi_identification_number?: string
  date_of_introduction?: string
  chemical_characterization?: string
  mat_no_ek?: string | null
  product_group?: string
  rating_class?: string
  product_hierarchy?: string
  material_allocation?: { SM?: string[]; PM?: string[]; UT?: string[]; ZF?: string[] }
  purpose_of_use?: string
  aim_of_introduction?: string
  manufacturer_supplier?: string
  solids_content_pct?: number
  active_ingredient_pct?: number
  density_kg_m3?: number
  mission?: string
  location?: string
  volume_number?: string
  storage_location?: string
  storage_type?: string
  packaging?: string
}

type ZoneB = {
  product_questionnaire_included?: boolean | null
  substitute_testing_for_hazardous?: boolean | null
  system_compatibility_checked?: boolean | null
  process_change_required?: boolean | null
  notes_requirements?: string
  incident_ordinance_relevant?: boolean | null
  gefstoffv_hazardous?: boolean | null
  wgk_class?: string | null
  vaws_cadastre_no?: string | null
  sdb_revision_date?: string
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  )
}

function YesNo({ value }: { value: boolean | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">Pending</span>
  }
  return value ? 'Yes' : 'No'
}

function materialAllocationChips(ma?: ZoneA['material_allocation']) {
  if (!ma) return null
  const parts: string[] = []
  if (ma.SM?.length) parts.push(`SM: ${ma.SM.join(', ')}`)
  if (ma.PM?.length) parts.push(`PM: ${ma.PM.join(', ')}`)
  if (ma.UT?.length) parts.push(`UT: ${ma.UT.join(', ')}`)
  if (ma.ZF?.length) parts.push(`ZF: ${ma.ZF.join(', ')}`)
  if (parts.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((p) => (
        <Badge key={p} variant="outline" className="text-xs">
          {p}
        </Badge>
      ))}
    </div>
  )
}

export function ProductDetailsCard({ zoneA, zoneB }: { zoneA: ZoneA; zoneB: ZoneB }) {
  const hasZoneA = Object.values(zoneA).some(
    (v) => v !== null && v !== undefined && v !== ''
  )
  const hasZoneB = Object.values(zoneB).some(
    (v) => v !== null && v !== undefined && v !== ''
  )
  if (!hasZoneA && !hasZoneB) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Product details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasZoneA && (
          <div>
            <div className="mb-3 text-sm font-semibold text-muted-foreground">
              Identification
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Row label="Requesting department" value={zoneA.requesting_department} />
              <Row label="ASi identification" value={zoneA.asi_identification_number} />
              <Row label="Date of introduction" value={zoneA.date_of_introduction} />
              <Row label="Manufacturer / supplier" value={zoneA.manufacturer_supplier} />
              <Row label="Mat. no. (EK)" value={zoneA.mat_no_ek} />
              <Row label="Product group" value={zoneA.product_group} />
              <Row label="Rating class" value={zoneA.rating_class} />
              <Row
                label="Product hierarchy"
                value={zoneA.product_hierarchy}
              />
              <Row
                label="Material allocation"
                value={materialAllocationChips(zoneA.material_allocation)}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Row label="Chemical characterization" value={zoneA.chemical_characterization} />
              <Row label="Purpose of use" value={zoneA.purpose_of_use} />
              <Row label="Aim of introduction" value={zoneA.aim_of_introduction} />
              <Row label="Mission" value={zoneA.mission} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Row
                label="Solids %"
                value={zoneA.solids_content_pct != null ? `${zoneA.solids_content_pct}%` : null}
              />
              <Row
                label="Active ingredient %"
                value={
                  zoneA.active_ingredient_pct != null
                    ? `${zoneA.active_ingredient_pct}%`
                    : null
                }
              />
              <Row
                label="Density"
                value={zoneA.density_kg_m3 != null ? `${zoneA.density_kg_m3} kg/m³` : null}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Row label="Location" value={zoneA.location} />
              <Row label="Volume / number" value={zoneA.volume_number} />
              <Row label="Storage location" value={zoneA.storage_location} />
              <Row label="Storage type" value={zoneA.storage_type} />
              <Row label="Packaging" value={zoneA.packaging} />
            </div>
          </div>
        )}

        {hasZoneB && (
          <div>
            <div className="mb-3 text-sm font-semibold text-muted-foreground">
              Compliance & conditions
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Row
                label="Product questionnaire included"
                value={<YesNo value={zoneB.product_questionnaire_included} />}
              />
              <Row
                label="Substitute testing done"
                value={<YesNo value={zoneB.substitute_testing_for_hazardous} />}
              />
              <Row
                label="System compatibility checked"
                value={<YesNo value={zoneB.system_compatibility_checked} />}
              />
              <Row
                label="Process change required"
                value={<YesNo value={zoneB.process_change_required} />}
              />
              <Row
                label="Incident Ordinance relevant"
                value={<YesNo value={zoneB.incident_ordinance_relevant} />}
              />
              <Row
                label="GefStoffV hazardous"
                value={<YesNo value={zoneB.gefstoffv_hazardous} />}
              />
              <Row label="WGK class" value={zoneB.wgk_class} />
              <Row label="VAwS cadastre no." value={zoneB.vaws_cadastre_no} />
              <Row label="SDS revision date" value={zoneB.sdb_revision_date} />
            </div>
            {zoneB.notes_requirements && (
              <div className="mt-4">
                <Row label="Notes / requirements" value={zoneB.notes_requirements} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
