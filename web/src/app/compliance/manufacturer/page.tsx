import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Building2, FileText } from "lucide-react";

export default async function ManufacturerCompliancePage() {
  const supabase = await createClient();

  // Manual aggregation (RPC function not implemented yet)
  // Get all companies with sheets that have chemicals
  const { data: companies } = await supabase
    .from("companies")
    .select(
      `
      id,
      name,
      sheets!sheets_company_id_fkey(
        id,
        name,
        sheet_chemicals(
          chemical_id,
          chemical_inventory(
            is_pfas,
            is_reach_svhc,
            is_prop65,
            risk_level
          )
        )
      )
    `,
    )
    .order("name");

  // Aggregate compliance data per company
  const aggregated = companies
    ?.map((company) => {
      const sheets = company.sheets || [];

      // Only count sheets that actually have chemical data
      const sheetsWithChemicals = sheets.filter(
        (sheet) => sheet.sheet_chemicals && sheet.sheet_chemicals.length > 0
      );
      const totalSheets = sheetsWithChemicals.length;

      const allChemicals = sheetsWithChemicals
        .flatMap((sheet) =>
          (sheet.sheet_chemicals || []).map((sc) => sc.chemical_inventory),
        )
        .filter(Boolean);

      const uniqueChemicals = new Set(
        allChemicals.map((c: any) => JSON.stringify(c)),
      ).size;
      const pfasCount = allChemicals.filter((c: any) => c?.is_pfas).length;
      const reachCount = allChemicals.filter((c: any) => c?.is_reach_svhc).length;
      const prop65Count = allChemicals.filter((c: any) => c?.is_prop65).length;
      const highRiskCount = allChemicals.filter(
        (c: any) => c?.risk_level === "high",
      ).length;

      return {
        company_id: company.id,
        company_name: company.name,
        total_sheets: totalSheets,
        unique_chemicals: uniqueChemicals,
        pfas_count: pfasCount,
        reach_count: reachCount,
        prop65_count: prop65Count,
        high_risk_count: highRiskCount,
      };
    })
    .filter((c) => c.total_sheets > 0); // Only show companies with sheets that have chemicals

  // Get overall stats
  const totalSuppliers = aggregated?.length || 0;
  const totalPFAS = aggregated?.reduce((sum, c) => sum + c.pfas_count, 0) || 0;
  const totalREACH =
    aggregated?.reduce((sum, c) => sum + c.reach_count, 0) || 0;
  const totalProp65 =
    aggregated?.reduce((sum, c) => sum + c.prop65_count, 0) || 0;
  const totalHighRisk =
    aggregated?.reduce((sum, c) => sum + c.high_risk_count, 0) || 0;
  const totalSheets =
    aggregated?.reduce((sum, c) => sum + c.total_sheets, 0) || 0;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Manufacturer Compliance Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Aggregate supplier compliance across your supply chain
        </p>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuppliers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sheets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSheets}</div>
          </CardContent>
        </Card>

        <Card className={totalPFAS > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PFAS Instances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalPFAS}</div>
          </CardContent>
        </Card>

        <Card
          className={totalREACH > 0 ? "border-orange-200 bg-orange-50" : ""}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              REACH Instances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalREACH}
            </div>
          </CardContent>
        </Card>

        <Card
          className={totalProp65 > 0 ? "border-yellow-200 bg-yellow-50" : ""}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prop 65 Instances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {totalProp65}
            </div>
          </CardContent>
        </Card>

        <Card className={totalHighRisk > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalHighRisk}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Compliance Summary</CardTitle>
          <CardDescription>
            Chemical compliance status by supplier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Sheets</TableHead>
                <TableHead className="text-right">Chemicals</TableHead>
                <TableHead className="text-center">PFAS</TableHead>
                <TableHead className="text-center">REACH</TableHead>
                <TableHead className="text-center">Prop 65</TableHead>
                <TableHead className="text-center">High Risk</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregated?.map((supplier) => {
                const hasIssues =
                  supplier.pfas_count > 0 ||
                  supplier.reach_count > 0 ||
                  supplier.prop65_count > 0 ||
                  supplier.high_risk_count > 0;

                return (
                  <TableRow key={supplier.company_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {supplier.company_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        {supplier.total_sheets}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {supplier.unique_chemicals}
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.pfas_count > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {supplier.pfas_count}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.reach_count > 0 ? (
                        <Badge
                          variant="destructive"
                          className="text-xs bg-orange-600"
                        >
                          {supplier.reach_count}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.prop65_count > 0 ? (
                        <Badge
                          variant="destructive"
                          className="text-xs bg-yellow-600"
                        >
                          {supplier.prop65_count}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.high_risk_count > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {supplier.high_risk_count}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasIssues ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Attention Required
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600">
                          Compliant
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {(!aggregated || aggregated.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No supplier data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
