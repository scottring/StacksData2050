import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, ArrowLeft, CheckCircle2, Package } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'

export default async function ChemicalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // Get chemical details
  const { data: chemical, error: chemicalError } = await supabase
    .from('chemical_inventory')
    .select('*')
    .eq('id', id)
    .single()

  if (chemicalError || !chemical) {
    notFound()
  }

  // Get all sheets containing this chemical
  const { data: sheetChemicals } = await supabase
    .from('sheet_chemicals')
    .select(`
      sheet_id,
      concentration,
      concentration_unit,
      sheets (
        id,
        name,
        status,
        created_at,
        companies!sheets_company_id_fkey (
          name
        )
      )
    `)
    .eq('chemical_id', id)

  // Deduplicate sheets by product name and keep only the most recent version
  const sheetsByName = new Map()
  sheetChemicals?.forEach((sc: any) => {
    if (sc.sheets) {
      const productName = sc.sheets.name
      const existing = sheetsByName.get(productName)

      // Keep the most recent version (latest created_at date)
      if (!existing || new Date(sc.sheets.created_at) > new Date(existing.created_at)) {
        sheetsByName.set(productName, {
          ...sc.sheets,
          concentration: sc.concentration,
          concentration_unit: sc.concentration_unit,
        })
      }
    }
  })

  const sheets = Array.from(sheetsByName.values()).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <AppLayout title={chemical.chemical_name || 'Chemical Details'}>
      <div className="space-y-8">
      {/* Back button */}
      <Link
        href="/compliance/supplier"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Chemical Inventory
      </Link>

      {/* Chemical Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{chemical.chemical_name || 'Unknown Chemical'}</CardTitle>
              <CardDescription className="text-base mt-2">
                CAS Number: <span className="font-mono">{chemical.cas_number}</span>
              </CardDescription>
            </div>
            <div>
              {chemical.risk_level === 'high' && (
                <Badge variant="destructive" className="text-sm">High Risk</Badge>
              )}
              {chemical.risk_level === 'medium' && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-sm">
                  Medium Risk
                </Badge>
              )}
              {chemical.risk_level === 'low' && (
                <Badge variant="outline" className="text-green-600 text-sm">Low Risk</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Properties */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Molecular Formula</div>
              <div className="font-mono text-base mt-1">{chemical.molecular_formula || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Molecular Weight</div>
              <div className="font-mono text-base mt-1">
                {chemical.molecular_weight ? `${chemical.molecular_weight} g/mol` : '—'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">PubChem CID</div>
              <div className="font-mono text-base mt-1">
                {chemical.pubchem_cid ? (
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${chemical.pubchem_cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {chemical.pubchem_cid}
                  </a>
                ) : (
                  '—'
                )}
              </div>
            </div>
          </div>

          {/* Regulatory Flags */}
          <div>
            <div className="text-sm font-medium mb-2">Regulatory Flags</div>
            <div className="flex flex-wrap gap-2">
              {chemical.is_pfas && (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  PFAS
                </Badge>
              )}
              {chemical.is_reach_svhc && (
                <Badge variant="destructive" className="bg-orange-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  REACH SVHC
                </Badge>
              )}
              {chemical.is_prop65 && (
                <Badge variant="destructive" className="bg-yellow-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Prop 65
                </Badge>
              )}
              {chemical.is_epa_tosca && (
                <Badge variant="outline">EPA TSCA</Badge>
              )}
              {chemical.is_rohs && (
                <Badge variant="outline">RoHS</Badge>
              )}
              {chemical.is_food_contact_restricted && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                  Food Contact Restricted
                </Badge>
              )}
              {!chemical.is_pfas &&
               !chemical.is_reach_svhc &&
               !chemical.is_prop65 &&
               !chemical.is_epa_tosca &&
               !chemical.is_rohs &&
               !chemical.is_food_contact_restricted && (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  No Regulatory Flags
                </Badge>
              )}
            </div>
          </div>

          {/* Warnings */}
          {chemical.warnings && chemical.warnings.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Warnings</div>
              <ul className="space-y-1">
                {chemical.warnings.map((warning: string, idx: number) => (
                  <li key={idx} className="flex items-start text-sm">
                    <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 text-amber-500 flex-shrink-0" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Restrictions */}
          {chemical.restrictions && chemical.restrictions.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Restrictions</div>
              <ul className="space-y-1">
                {chemical.restrictions.map((restriction: string, idx: number) => (
                  <li key={idx} className="flex items-start text-sm">
                    <span className="mr-2">•</span>
                    <span>{restriction}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Synonyms */}
          {chemical.synonyms && chemical.synonyms.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Common Names & Synonyms</div>
              <div className="flex flex-wrap gap-2">
                {chemical.synonyms.slice(0, 10).map((synonym: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="font-normal">
                    {synonym}
                  </Badge>
                ))}
                {chemical.synonyms.length > 10 && (
                  <Badge variant="outline" className="font-normal">
                    +{chemical.synonyms.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheets containing this chemical */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Products Containing This Chemical
              </CardTitle>
              <CardDescription className="mt-2">
                {sheets.length === 0
                  ? 'No products currently contain this chemical'
                  : `${sheets.length} product${sheets.length === 1 ? '' : 's'} contain${sheets.length === 1 ? 's' : ''} this chemical`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sheets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>This chemical is not currently used in any submitted product data sheets.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.map((sheet: any) => (
                  <TableRow key={sheet.id}>
                    <TableCell className="font-medium">
                      {sheet.name || 'Untitled Product'}
                    </TableCell>
                    <TableCell>
                      {sheet.companies?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sheet.status === 'approved'
                            ? 'default'
                            : sheet.status === 'submitted'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {sheet.status || 'draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sheet.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/sheets/${sheet.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View Sheet
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  )
}
