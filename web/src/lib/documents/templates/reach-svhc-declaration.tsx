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
  col2: { width: '35%', fontSize: 9 },
  col3: { width: '20%', fontSize: 9 },
  col4: { width: '25%', fontSize: 9 },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
  pass: { color: '#059669' },
  fail: { color: '#dc2626' },
  warning: { color: '#d97706' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginVertical: 15 },
})

interface SVHCChemical {
  cas_number: string
  chemical_name: string
  concentration_pct?: number | null
  status: 'pass' | 'fail' | 'warning'
}

interface REACHDeclarationProps {
  productName: string
  companyName: string
  date: string
  overallStatus: 'pass' | 'fail' | 'warning'
  chemicals: SVHCChemical[]
  assessmentId: string
  declarationNumber: string
}

export function REACHSVHCDeclaration({
  productName,
  companyName,
  date,
  overallStatus,
  chemicals,
  assessmentId,
  declarationNumber,
}: REACHDeclarationProps) {
  const svhcAboveThreshold = chemicals.filter(c => c.status === 'fail')
  const svhcBelowThreshold = chemicals.filter(c => c.status === 'warning')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>REACH SVHC Declaration</Text>
          <Text style={styles.subtitle}>
            Article 33 / Article 7(2) of Regulation (EC) No 1907/2006
          </Text>
        </View>

        {/* Company & Product Info */}
        <View style={styles.section}>
          <Text style={styles.text}>
            <Text style={styles.bold}>Company: </Text>{companyName}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Product: </Text>{productName}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Declaration No.: </Text>{declarationNumber}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Date: </Text>{date}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Assessment ID: </Text>{assessmentId}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Declaration Statement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Declaration</Text>
          {overallStatus === 'pass' ? (
            <Text style={[styles.text, styles.pass]}>
              We hereby declare that the above-mentioned product does not contain any Substances of Very
              High Concern (SVHC) from the REACH Candidate List in concentrations exceeding 0.1% (w/w)
              per article, based on our current knowledge and information from our supply chain.
            </Text>
          ) : (
            <Text style={[styles.text, styles.fail]}>
              The above-mentioned product contains one or more Substances of Very High Concern (SVHC)
              from the REACH Candidate List at concentrations exceeding 0.1% (w/w) per article. Details
              are provided below in accordance with Article 33 communication obligations.
            </Text>
          )}
        </View>

        {/* SVHC above threshold */}
        {svhcAboveThreshold.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              SVHC Above 0.1% Threshold ({svhcAboveThreshold.length})
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.col1, styles.bold]}>CAS No.</Text>
                <Text style={[styles.col2, styles.bold]}>Substance Name</Text>
                <Text style={[styles.col3, styles.bold]}>Concentration</Text>
                <Text style={[styles.col4, styles.bold]}>Status</Text>
              </View>
              {svhcAboveThreshold.map((chem, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col1}>{chem.cas_number}</Text>
                  <Text style={styles.col2}>{chem.chemical_name}</Text>
                  <Text style={styles.col3}>{chem.concentration_pct != null ? `${chem.concentration_pct}%` : 'N/A'}</Text>
                  <Text style={[styles.col4, styles.fail]}>Above threshold</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SVHC present but below threshold */}
        {svhcBelowThreshold.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              SVHC Present Below 0.1% ({svhcBelowThreshold.length})
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.col1, styles.bold]}>CAS No.</Text>
                <Text style={[styles.col2, styles.bold]}>Substance Name</Text>
                <Text style={[styles.col3, styles.bold]}>Concentration</Text>
                <Text style={[styles.col4, styles.bold]}>Status</Text>
              </View>
              {svhcBelowThreshold.map((chem, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col1}>{chem.cas_number}</Text>
                  <Text style={styles.col2}>{chem.chemical_name}</Text>
                  <Text style={styles.col3}>{chem.concentration_pct != null ? `${chem.concentration_pct}%` : 'N/A'}</Text>
                  <Text style={[styles.col4, styles.warning]}>Below threshold</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Legal basis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal Basis</Text>
          <Text style={styles.text}>
            This declaration is made in accordance with Article 33(1) of Regulation (EC) No 1907/2006
            (REACH), which requires suppliers of articles containing SVHC in concentrations above 0.1%
            (w/w) to provide sufficient information to allow safe use of the article.
          </Text>
          <Text style={styles.text}>
            This declaration is based on the current ECHA Candidate List and information available at
            the time of assessment. It should be reviewed when the Candidate List is updated.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Stacks Intelligence Pipeline | {date} | Ref: {declarationNumber}
        </Text>
      </Page>
    </Document>
  )
}
