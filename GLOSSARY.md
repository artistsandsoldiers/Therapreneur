# Therapreneur

The language of running a solo allied health practice in South Africa: treating patients, billing them or their medical aid, and getting paid. Format and rules: the `domain-modeling` skill.

## People and practices

**Practitioner**:
The allied health professional who owns the practice and uses Therapreneur.
_Avoid_: therapist (fine in marketing), user, clinician, doctor

**Practice**:
The practitioner's business: its name, logo, address, banking details and price list.
_Avoid_: clinic, account, business

**Patient**:
The person who receives treatment.
_Avoid_: client, customer

**Main member**:
The person who holds the medical aid membership a patient is covered under, such as a parent of a child patient. May be the patient.
_Avoid_: account holder, principal member

**Payer type**:
Whether a patient's invoices go to a **Medical aid** or are paid in **Cash** by the patient.

## Medical aid

**Medical aid**:
A medical scheme that pays claims for its members, such as Discovery or Bonitas.
_Avoid_: insurer, insurance, funder

**Plan**:
A member's option within a medical aid, which decides what it covers.
_Avoid_: package, option

**ICD-10 code**:
A diagnosis code from the referring doctor, copied onto every invoice line. The practitioner never chooses it.
_Avoid_: diagnosis code

**Billing code**:
A gazetted code for a billable service, including cancellations and no-shows.
_Avoid_: tariff code, procedure code, item code

**Medical aid rate**:
What a medical aid pays for a billing code. We keep these for every practice.
_Avoid_: tariff, scheme rate

**Price adjustment**:
How a practice's prices compare to medical aid rates: at the rate, or a percentage above or below it.
_Avoid_: markup, discount

**Price list**:
The practice's price for each billing code, worked out from the medical aid rate and its price adjustment.
_Avoid_: rate card, fee schedule

## Treating and billing

**Session**:
One appointment with one patient, which arrives from the practitioner's calendar.
_Avoid_: appointment, visit, booking

**Capture**:
Recording a session's billing codes and note straight after it ends, which creates its invoice.

**Note**:
The practitioner's free-text record of one session.
_Avoid_: clinical note, record, SOAP note

**Invoice**:
The bill for one session.
_Avoid_: account, bill

**Statement**:
A summary of everything a patient owes across invoices. Not the same as a **Remittance**.

**Claim**:
One invoice submitted to a medical aid.
_Avoid_: submission

**Claim batch**:
One email to a medical aid carrying several claims.

**Reference number**:
The medical aid's acknowledgement that it received a claim batch, recorded against each claim in it.

## Getting paid

**Remittance**:
A medical aid's report of what it paid, and for which claims.
_Avoid_: claims statement, statement

**Payment**:
Money received against an invoice, from a medical aid or a patient.

**Reconciliation**:
Matching a remittance's lines to claims and marking those invoices paid.
_Avoid_: matching

**Shortfall**:
The part of an invoice a medical aid didn't pay, which the patient then owes.

**Rejection**:
A claim the medical aid refused to pay.

**Outstanding**:
Invoiced but not yet paid.
_Avoid_: debt, debtors, owing

## Relationships

- A **Practice** has one **Practitioner** and many **Patients**.
- A **Patient** is covered under one **Main member**'s **Medical aid**, or pays **Cash**.
- A **Session** has one **Note** and produces one **Invoice**.
- A medical aid **Invoice** becomes a **Claim**, sent in a **Claim batch** that gets one **Reference number**.
- A **Remittance** is reconciled against **Claims** to record **Payments**.

## Flagged ambiguities

- The PRD called a medical aid's payment report a "claims statement". Resolved: it is a **Remittance**, and **Statement** is kept for what a patient owes.
