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

**Past patient**:
A patient the practitioner no longer sees, for any reason. Hidden from everyday lists, with their history kept. Every other patient is **current**.
_Avoid_: archived, discharged, inactive, dormant

**Main member**:
The person who holds the medical aid membership a patient is covered under, such as a parent of a child patient. May be the patient.
_Avoid_: account holder, principal member

**Dependant code**:
The two-digit number a medical aid gives each person on a membership. The main member is 00.

**Referrer**:
Who or what sent a patient to the practice: a doctor, another therapist, the website, social media, word of mouth. Optional, one per patient.
_Avoid_: source, lead, referral source

**Who pays**:
Whether an invoice goes to the patient's **Medical aid** or to the **Patient**, who may claim back themselves. Each patient has a usual choice, and each session can change it. Separate from whether the patient has medical aid at all.
_Avoid_: payer type, cash patient

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
One appointment with one patient, in the practice's calendar. It is **booked** until it's captured.
_Avoid_: appointment, visit, booking

**Booked**:
A session in the calendar that hasn't been captured yet, so it has no invoice. Once it's over it waits **to capture**.
_Avoid_: scheduled, planned, upcoming

**Series**:
Booked sessions made together by repeating a booking weekly or every 2 weeks. Each can still change on its own.
_Avoid_: recurring appointment, block booking

**Event**:
Something in the calendar that isn't a session: a meeting, training, errand or other work. It happens at a place or an address and makes trips, never an invoice.
_Avoid_: appointment, task, booking

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

## Running the business

**Expense**:
Money the practice spent to run itself, such as rent or OTASA fees.
_Avoid_: cost, spend, purchase

**Expense category**:
A plain-language group of expenses, from our central list or added by the practice.
_Avoid_: account, ledger, tax category

**Receipt**:
A photo or PDF that proves an expense, kept for SARS.
_Avoid_: slip, proof of payment

**Tax year**:
1 March to the end of February, as SARS counts it.
_Avoid_: financial year

**Provisional tax**:
Income tax a sole proprietor pays SARS in advance from an estimate of the year: end of August, end of February, and an optional top-up by 30 September.
_Avoid_: IRP6 (the form's name, fine for tax practitioners)

**Inc**:
A personal liability company, which pays its own tax. The other kind of practice is a **sole proprietor**.
_Avoid_: company, Pty

**Profit before tax**:
Invoiced income less expenses, for a month or the tax year so far.
_Avoid_: net income, earnings

**Place**:
Somewhere the practitioner sees patients, like her rooms or a hospital, with its address. A session happens at a place or at the patient's home.
_Avoid_: location, venue, practice address

**Regular place**:
A place the practitioner works at regularly. SARS counts driving there from home as private. Every place is regular unless a tax practitioner says otherwise.
_Avoid_: workplace, base

**Trip**:
One drive between two stops in a day, worked out from the calendar. **Business** or **private**, as SARS counts it.
_Avoid_: journey, mileage

**Logbook**:
The SARS record of every business trip in a car, per tax year, with odometer readings at the start and end.
_Avoid_: travel log, mileage log

**Odometer reading**:
What the car's odometer showed on a day, in km. Readings give the total km driven, and so the business share.

**Business share**:
Business km as a percentage of all km driven in the car. Vehicle costs count only this share.
_Avoid_: business use percentage, business portion

## Relationships

- A **Practice** has one **Practitioner** and many **Patients**.
- A **Patient** may be covered under one **Main member**'s **Medical aid**, and either the medical aid or the patient pays (**Who pays**).
- A **Session** has one **Note** and produces one **Invoice**.
- A medical aid **Invoice** becomes a **Claim**, sent in a **Claim batch** that gets one **Reference number**.
- A **Remittance** is reconciled against **Claims** to record **Payments**.
- An **Expense** has one **Expense category** and may have a **Receipt**.
- A **Patient** is usually seen at one **Place** or at home. A day's sessions make **Trips**, and a car's business trips and **Odometer readings** make its **Logbook**.

## Flagged ambiguities

- The PRD called a medical aid's payment report a "claims statement". Resolved: it is a **Remittance**, and **Statement** is kept for what a patient owes.
