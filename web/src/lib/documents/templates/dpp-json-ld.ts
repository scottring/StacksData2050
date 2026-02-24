/**
 * Digital Product Passport (DPP) — JSON-LD Generator
 * Follows EU Ecodesign for Sustainable Products Regulation (ESPR)
 * Output conforms to W3C Verifiable Credentials data model
 */

interface DPPChemical {
  cas_number: string
  chemical_name: string
  concentration_pct?: number | null
  is_svhc: boolean
  function_in_product?: string | null
}

interface DPPInput {
  productName: string
  productId: string
  companyName: string
  companyId: string
  assessmentId: string
  date: string
  chemicals: DPPChemical[]
  overallStatus: 'pass' | 'fail' | 'warning'
  frameworks: Array<{
    code: string
    name: string
    status: 'pass' | 'fail' | 'warning'
  }>
}

export function generateDPPJsonLD(input: DPPInput): Record<string, unknown> {
  const svhcChemicals = input.chemicals.filter(c => c.is_svhc)

  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://schema.org/',
      {
        dpp: 'https://vocabulary.uncefact.org/dpp/',
        espr: 'https://ec.europa.eu/espr/',
      },
    ],
    type: ['VerifiableCredential', 'DigitalProductPassport'],
    id: `urn:uuid:${input.assessmentId}`,
    issuer: {
      id: `urn:company:${input.companyId}`,
      name: input.companyName,
    },
    issuanceDate: input.date,
    credentialSubject: {
      id: `urn:product:${input.productId}`,
      type: 'Product',
      name: input.productName,
      manufacturer: {
        name: input.companyName,
      },
      materialComposition: {
        type: 'MaterialComposition',
        substances: input.chemicals.map(chem => ({
          type: 'Substance',
          casNumber: chem.cas_number,
          name: chem.chemical_name,
          concentrationPercent: chem.concentration_pct ?? null,
          isSVHC: chem.is_svhc,
          function: chem.function_in_product || null,
        })),
        totalSubstances: input.chemicals.length,
        svhcCount: svhcChemicals.length,
        svhcAboveThreshold: svhcChemicals.filter(c =>
          c.concentration_pct != null && c.concentration_pct > 0.1
        ).length,
      },
      complianceAssessment: {
        type: 'ComplianceAssessment',
        assessmentId: input.assessmentId,
        date: input.date,
        overallStatus: input.overallStatus,
        frameworks: input.frameworks.map(fw => ({
          code: fw.code,
          name: fw.name,
          status: fw.status,
        })),
      },
      scipNotification: {
        type: 'SCIPNotification',
        required: svhcChemicals.some(c => c.concentration_pct != null && c.concentration_pct > 0.1),
        svhcSubstances: svhcChemicals
          .filter(c => c.concentration_pct != null && c.concentration_pct > 0.1)
          .map(c => ({
            casNumber: c.cas_number,
            name: c.chemical_name,
            concentrationPercent: c.concentration_pct,
          })),
      },
      sustainability: {
        type: 'SustainabilityInfo',
        recyclabilityScore: null, // To be determined
        carbonFootprint: null, // To be determined
        circularityMetrics: null, // To be determined
      },
    },
    proof: {
      type: 'StacksIntelligencePipeline',
      created: input.date,
      verificationMethod: `assessment:${input.assessmentId}`,
      purpose: 'Digital Product Passport generation',
    },
  }
}
