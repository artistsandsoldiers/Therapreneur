import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatDate } from "./dates";
import type { InvoiceDocument } from "./invoice-document";
import { invoiceNumber } from "./invoices";
import type { LogoImage } from "./logo";
import { formatRands } from "./money";
import { lineTotal } from "./pricing";

// The invoice as a PDF, matching the invoice page. Helvetica is built into PDF readers, so no font files are needed.
const grey = "#737373";
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#171717" },
  header: { flexDirection: "row", justifyContent: "space-between" },
  logo: { maxWidth: 160, maxHeight: 56, objectFit: "contain", marginBottom: 8 },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  muted: { color: grey },
  label: { fontSize: 7, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  section: { marginTop: 18 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5", paddingVertical: 5 },
  code: { width: 50, fontFamily: "Helvetica-Bold" },
  description: { flex: 1, paddingRight: 8 },
  amount: { width: 70, textAlign: "right" },
  total: { flexDirection: "row", paddingTop: 6, fontFamily: "Helvetica-Bold" },
});

export function invoicePdf(invoice: InvoiceDocument, logo: LogoImage | null = null) {
  const { practice, patient } = invoice;
  return (
    <Document title={`${invoiceNumber(invoice.number)} ${patient.patient_name}`} author={practice.name ?? undefined}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf images have no alt text */}
            {logo && <Image src={logo} style={styles.logo} />}
            <Text style={styles.title}>{practice.name}</Text>
            <Text style={styles.muted}>{practice.address}</Text>
            {practice.phone && <Text style={styles.muted}>{practice.phone}</Text>}
            {practice.email && <Text style={styles.muted}>{practice.email}</Text>}
            {practice.practice_number && <Text style={styles.muted}>Practice no. {practice.practice_number}</Text>}
            {practice.hpcsa_number && <Text style={styles.muted}>HPCSA no. {practice.hpcsa_number}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.title}>Invoice</Text>
            <Text>{invoiceNumber(invoice.number)}</Text>
            <Text style={styles.muted}>Date {formatDate(invoice.issuedOn)}</Text>
            <Text style={styles.muted}>Due {formatDate(invoice.dueOn)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bill to</Text>
          {invoice.toMedicalAid ? (
            <>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{patient.medical_aid_name}</Text>
              <Text>Main member: {patient.main_member_name}</Text>
              <Text>
                Member no. {patient.member_number}
                {patient.dependant_code && ` · Dependant ${patient.dependant_code}`}
                {patient.plan && ` · ${patient.plan}`}
              </Text>
              <Text>
                Patient: {patient.patient_name}
                {patient.date_of_birth && ` · Born ${formatDate(patient.date_of_birth)}`}
              </Text>
              {patient.referring_doctor_name && (
                <Text>
                  Referred by {patient.referring_doctor_name}
                  {patient.referring_doctor_practice_number && ` (practice no. ${patient.referring_doctor_practice_number})`}
                </Text>
              )}
            </>
          ) : (
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{patient.patient_name}</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={[styles.row, styles.label, { marginBottom: 0 }]}>
            <Text style={styles.code}>Code</Text>
            <Text style={styles.description}>Description</Text>
            <Text style={styles.amount}>Amount</Text>
          </View>
          {invoice.lines.map((line) => (
            <View key={line.id} style={styles.row} wrap={false}>
              <Text style={styles.code}>{line.code}</Text>
              <View style={styles.description}>
                <Text>{line.description}</Text>
                <Text style={styles.muted}>
                  {formatDate(invoice.issuedOn)}
                  {line.icd10Codes.length > 0 && ` · ICD-10 ${line.icd10Codes.join(", ")}`}
                  {line.quantity > 1 && ` · ${line.quantity} × ${formatRands(line.unitPriceCents)}`}
                </Text>
              </View>
              <Text style={styles.amount}>{formatRands(lineTotal(line))}</Text>
            </View>
          ))}
          <View style={styles.total}>
            <Text style={{ flex: 1 }}>Total</Text>
            <Text style={styles.amount}>{formatRands(invoice.totalCents)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Banking details</Text>
          <Text style={styles.muted}>{practice.bank_name} · {practice.bank_account_holder}</Text>
          <Text style={styles.muted}>Account {practice.bank_account_number} · Branch {practice.bank_branch_code}</Text>
          <Text style={styles.muted}>Reference {invoiceNumber(invoice.number)}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** The invoice's PDF file, e.g. for a download or an email attachment, with the practice's logo if it has one. */
export function renderInvoicePdf(invoice: InvoiceDocument, logo: LogoImage | null = null): Promise<Buffer> {
  return renderToBuffer(invoicePdf(invoice, logo));
}

/** "INV-0007 Thandi Mokoena.pdf" */
export function invoicePdfName(invoice: InvoiceDocument): string {
  return `${invoiceNumber(invoice.number)} ${invoice.patient.patient_name.replace(/[^A-Za-z0-9 '-]/g, "")}.pdf`;
}
