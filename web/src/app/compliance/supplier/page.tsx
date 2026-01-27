import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'

export default async function SupplierCompliancePage() {
  const supabase = await createClient()

  // Get all chemicals with their counts
  const { data: chemicals } = await supabase
    .from('chemical_inventory')
    .select(`
      *,
      sheet_chemicals(count)
    `)
    .order('chemical_name')

  // Get summary stats
  const { count: totalChemicals } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })

  const { count: pfasCount } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('is_pfas', true)

  const { count: reachCount } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('is_reach_svhc', true)

  const { count: prop65Count } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('is_prop65', true)

  const { count: highRiskCount } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('risk_level', 'high')

  const { count: totalSheets } = await supabase
    .from('sheet_chemicals')
    .select('sheet_id', { count: 'exact', head: true })

  return (
    <AppLayout title="Supplier Compliance">
      <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Chemicals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChemicals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sheets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSheets}</div>
          </CardContent>
        </Card>

        <Card className={pfasCount && pfasCount > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PFAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{pfasCount || 0}</div>
          </CardContent>
        </Card>

        <Card className={reachCount && reachCount > 0 ? 'border-orange-200 bg-orange-50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              REACH SVHC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{reachCount || 0}</div>
          </CardContent>
        </Card>

        <Card className={prop65Count && prop65Count > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prop 65
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{prop65Count || 0}</div>
          </CardContent>
        </Card>

        <Card className={highRiskCount && highRiskCount > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highRiskCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chemical Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chemical Inventory</CardTitle>
          <CardDescription>
            All chemicals disclosed in supplier data sheets with regulatory flags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chemical Name</TableHead>
                <TableHead>CAS Number</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead>Regulatory Flags</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead className="text-right">Sheets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chemicals?.map((chemical) => {
                // Extract the count from the aggregated result [{ count: N }]
                const sheetCount = Array.isArray(chemical.sheet_chemicals) && chemical.sheet_chemicals.length > 0
                  ? (chemical.sheet_chemicals[0] as any).count || 0
                  : 0

                return (
                  <TableRow key={chemical.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <Link
                        href={`/compliance/chemical/${chemical.id}`}
                        className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                      >
                        {chemical.chemical_name || 'Unknown'}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {chemical.cas_number}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {chemical.molecular_formula || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {chemical.is_pfas && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            PFAS
                          </Badge>
                        )}
                        {chemical.is_reach_svhc && (
                          <Badge variant="destructive" className="text-xs bg-orange-600">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            REACH
                          </Badge>
                        )}
                        {chemical.is_prop65 && (
                          <Badge variant="destructive" className="text-xs bg-yellow-600">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Prop 65
                          </Badge>
                        )}
                        {chemical.is_epa_tosca && (
                          <Badge variant="outline" className="text-xs">
                            EPA
                          </Badge>
                        )}
                        {chemical.is_rohs && (
                          <Badge variant="outline" className="text-xs">
                            RoHS
                          </Badge>
                        )}
                        {!chemical.is_pfas &&
                         !chemical.is_reach_svhc &&
                         !chemical.is_prop65 &&
                         !chemical.is_epa_tosca &&
                         !chemical.is_rohs && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Clear
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {chemical.risk_level === 'high' && (
                        <Badge variant="destructive">High</Badge>
                      )}
                      {chemical.risk_level === 'medium' && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Medium
                        </Badge>
                      )}
                      {chemical.risk_level === 'low' && (
                        <Badge variant="outline" className="text-green-600">
                          Low
                        </Badge>
                      )}
                      {!chemical.risk_level && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {sheetCount}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {(!chemicals || chemicals.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No chemicals found in inventory</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  )
}
