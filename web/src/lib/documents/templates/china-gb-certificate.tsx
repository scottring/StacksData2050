import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 50, fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.5 },
  header: { marginBottom: 20, textAlign: 'center' },
  titleCN: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  titleEN: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#475569', marginBottom: 15 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 5, color: '#1e293b' },
  text: { fontSize: 10, color: '#334155', marginBottom: 3 },
  textCN: { fontSize: 10, color: '#64748b', marginBottom: 3 },
  bold: { fontFamily: 'Helvetica-Bold' },
  table: { width: '100%', marginTop: 5, marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#fef2f2', padding: 6, borderBottomWidth: 1, borderBottomColor: '#fca5a5' },
  tableRow: { flexDirection: 'row', padding: 5, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  col1: { width: '20%', fontSize: 9 },
  col2: { width: '30%', fontSize: 9 },
  col3: { width: '25%', fontSize: 9 },
  col4: { width: '25%', fontSize: 9 },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
  pass: { color: '#059669' },
  fail: { color: '#dc2626' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#fca5a5', marginVertical: 15 },
  stamp: { textAlign: 'center', marginTop: 20, padding: 15, borderWidth: 2, borderColor: '#dc2626', borderRadius: 5 },
  stampText: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#dc2626' },
})

interface GBChemical {
  cas_number: string
  chemical_name: string
  concentration_pct?: number | null
  gb_status: string
  sml_mg_kg?: number | null
}

interface ChinaGBCertificateProps {
  productName: string
  companyName: string
  date: string
  chemicals: GBChemical[]
  overallCompliant: boolean
  certificateNumber: string
  applicableStandards: string[]
}

export function ChinaGBCertificate({
  productName,
  companyName,
  date,
  chemicals,
  overallCompliant,
  certificateNumber,
  applicableStandards,
}: ChinaGBCertificateProps) {
  const restrictedChemicals = chemicals.filter(c => c.gb_status !== 'Compliant')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Bilingual Header */}
        <View style={styles.header}>
          <Text style={styles.titleCN}>China Food Contact Compliance Certificate</Text>
          <Text style={styles.titleEN}>
            GB 9685-2016 / GB 4806 Series Compliance Assessment
          </Text>
        </View>

        {/* Certificate Info */}
        <View style={styles.section}>
          <Text style={styles.text}>
            <Text style={styles.bold}>Certificate No. / </Text>{certificateNumber}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Company / </Text>{companyName}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Product / </Text>{productName}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Date / </Text>{date}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Applicable Standards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Applicable Standards</Text>
          {applicableStandards.map((std, i) => (
            <Text key={i} style={styles.text}>
              {i + 1}. {std}
            </Text>
          ))}
        </View>

        {/* Chemical Assessment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Substance Assessment</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.col1, styles.bold]}>CAS No.</Text>
              <Text style={[styles.col2, styles.bold]}>Substance</Text>
              <Text style={[styles.col3, styles.bold]}>SML (mg/kg)</Text>
              <Text style={[styles.col4, styles.bold]}>Status</Text>
            </View>
            {chemicals.map((chem, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.col1}>{chem.cas_number}</Text>
                <Text style={styles.col2}>{chem.chemical_name}</Text>
                <Text style={styles.col3}>{chem.sml_mg_kg != null ? `${chem.sml_mg_kg}` : 'N/A'}</Text>
                <Text style={[styles.col4, chem.gb_status === 'Compliant' ? styles.pass : styles.fail]}>
                  {chem.gb_status}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Restricted substances */}
        {restrictedChemicals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.fail]}>
              Attention: Restricted Substances Found ({restrictedChemicals.length})
            </Text>
            <Text style={styles.text}>
              The following substances require attention for China food contact compliance.
              Migration testing per GB 31604 series methods is recommended.
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Compliance stamp */}
        <View style={styles.stamp}>
          <Text style={styles.stampText}>
            {overallCompliant ? 'COMPLIANT' : 'REVIEW REQUIRED'}
          </Text>
          <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 5 }}>
            {overallCompliant
              ? 'Product meets GB 9685-2016 requirements based on chemical assessment'
              : 'Further testing required to confirm GB 9685-2016 compliance'
            }
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Stacks Intelligence Pipeline | {date} | Ref: {certificateNumber}
        </Text>
      </Page>
    </Document>
  )
}
