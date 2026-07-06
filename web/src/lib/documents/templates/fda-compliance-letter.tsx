import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 50, fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.5 },
  header: { marginBottom: 30 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 5 },
  subtitle: { fontSize: 12, color: '#475569', marginBottom: 20 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 5, color: '#1e293b' },
  text: { fontSize: 10, color: '#334155', marginBottom: 3 },
  bold: { fontFamily: 'Helvetica-Bold' },
  table: { width: '100%', marginTop: 5, marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 6, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  tableRow: { flexDirection: 'row', padding: 5, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  col1: { width: '20%', fontSize: 9 },
  col2: { width: '30%', fontSize: 9 },
  col3: { width: '25%', fontSize: 9 },
  col4: { width: '25%', fontSize: 9 },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
  pass: { color: '#059669' },
  fail: { color: '#dc2626' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginVertical: 15 },
  bullet: { flexDirection: 'row', marginBottom: 3 },
  bulletPoint: { width: 15, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10, color: '#334155' },
})

interface FDAChemical {
  cas_number: string
  chemical_name: string
  concentration_pct?: number | null
  fda_status: string
}

interface FDAComplianceLetterProps {
  productName: string
  companyName: string
  recipientName: string
  date: string
  chemicals: FDAChemical[]
  prop65Chemicals: string[]
  overallCompliant: boolean
  letterNumber: string
}

export function FDAComplianceLetter({
  productName,
  companyName,
  recipientName,
  date,
  chemicals,
  prop65Chemicals,
  overallCompliant,
  letterNumber,
}: FDAComplianceLetterProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>FDA Compliance Letter</Text>
          <Text style={styles.subtitle}>
            21 CFR Compliance Statement — Food Contact Materials
          </Text>
        </View>

        {/* Addressee */}
        <View style={styles.section}>
          <Text style={styles.text}>{date}</Text>
          <Text style={styles.text}>{recipientName}</Text>
          <Text style={styles.text}>RE: FDA Compliance for {productName}</Text>
          <Text style={styles.text}>Letter No.: {letterNumber}</Text>
        </View>

        <View style={styles.divider} />

        {/* Compliance Statement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance Statement</Text>
          <Text style={styles.text}>
            {companyName} hereby certifies that the product &quot;{productName}&quot; has been
            evaluated for compliance with applicable U.S. Food and Drug Administration (FDA) regulations
            for food contact materials, including:
          </Text>
          <View style={{ marginTop: 5, marginBottom: 5 }}>
            <View style={styles.bullet}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>21 CFR Part 174-186: Indirect Food Additives</Text>
            </View>
            <View style={styles.bullet}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>21 CFR 176.170: Components of Paper and Paperboard</Text>
            </View>
            <View style={styles.bullet}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>FDA Food Contact Notification (FCN) listings</Text>
            </View>
          </View>
        </View>

        {/* Chemical Composition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chemical Composition Assessment</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.col1, styles.bold]}>CAS No.</Text>
              <Text style={[styles.col2, styles.bold]}>Substance</Text>
              <Text style={[styles.col3, styles.bold]}>Concentration</Text>
              <Text style={[styles.col4, styles.bold]}>FDA Status</Text>
            </View>
            {chemicals.map((chem, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.col1}>{chem.cas_number}</Text>
                <Text style={styles.col2}>{chem.chemical_name}</Text>
                <Text style={styles.col3}>{chem.concentration_pct != null ? `${chem.concentration_pct}%` : 'N/A'}</Text>
                <Text style={styles.col4}>{chem.fda_status}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Prop 65 notice */}
        {prop65Chemicals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>California Proposition 65 Notice</Text>
            <Text style={[styles.text, styles.fail]}>
              This product contains substance(s) known to the State of California to cause cancer
              and/or reproductive harm: {prop65Chemicals.join(', ')}.
            </Text>
            <Text style={styles.text}>
              A Proposition 65 warning label is required for products sold in California.
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Conclusion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conclusion</Text>
          <Text style={overallCompliant ? [styles.text, styles.pass] : [styles.text, styles.fail]}>
            {overallCompliant
              ? `Based on our assessment, ${productName} meets FDA requirements for food contact materials under the referenced regulations.`
              : `Based on our assessment, ${productName} requires further review to confirm FDA compliance for food contact use.`
            }
          </Text>
        </View>

        {/* Signature block */}
        <View style={[styles.section, { marginTop: 30 }]}>
          <Text style={styles.text}>Sincerely,</Text>
          <Text style={[styles.text, { marginTop: 20 }]}>{companyName}</Text>
          <Text style={styles.text}>Regulatory Compliance Department</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Stacks Intelligence Pipeline | {date} | Ref: {letterNumber}
        </Text>
      </Page>
    </Document>
  )
}
