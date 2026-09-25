# FollowCare
## Hackathon Build Spec

### 1. Goal

Build a lightweight clinic workspace that helps small UAE clinics continue patient care after a consultation.

The system should:

1. Show the clinic a patient's recent history and active follow-up plan.
2. Automatically schedule simple post-visit check-ins.
3. Interpret simulated patient replies.
4. Route routine issues to a nurse first.
5. Escalate only important or unresolved cases to the doctor.
6. Give the doctor a concise summary instead of raw patient messages.

The demo should communicate one idea clearly:

> The doctor does not need to monitor every patient. The system watches the gap between visits and brings the doctor in only when necessary.

---

# 2. Demo Flow

Use one primary patient story during the demo.

Example:

**Patient:** Aisha Rahman  
**Visit:** Minor outpatient procedure  
**Follow-up protocol:** Post-procedure

### Flow A: Routine response

Patient receives simulated check-in:

> How are you feeling today? Any pain, swelling, bleeding, or fever?

Patient replies:

> Slight pain but otherwise feeling okay.

System:

- classifies response as low severity
- records the check-in
- sends it to the Nurse Queue
- recommends routine follow-up
- does NOT alert the doctor

### Flow B: Escalation

Next simulated reply:

> The pain is much worse and I have a fever.

System:

- detects configured red flags
- creates a high-severity alert
- places it in Doctor Queue
- generates a concise clinical summary:

**Patient:** Aisha Rahman  
**Procedure:** Minor outpatient procedure, 2 days ago  
**Previous status:** Mild pain, stable  
**New issue:** Increasing pain + reported fever  
**Reason for escalation:** Post-procedure red flags detected

Doctor can then mark:

- Review
- Contact patient
- Resolved

---

# 3. Pages

## Dashboard

Simple overview cards:

- Active follow-ups
- Nurse alerts
- Doctor alerts
- Patients needing attention

Below that:

### Patient Follow-Up List

Show:

- Patient
- Diagnosis / visit reason
- Follow-up protocol
- Current status
- Next check-in
- Alert level

Statuses:

- Stable
- Needs nurse review
- Doctor review
- Completed

---

## Patient Detail

Show:

### Patient Header

- Name
- Age
- Last visit
- Diagnosis
- Assigned doctor

### Recent History

Simple seeded timeline:

- Visit
- Diagnosis
- Treatment
- Check-ins
- Alerts

### Active Care Plan

Example:

**Post-Procedure Protocol**

Day 1  
Check pain / bleeding / fever

Day 3  
Check recovery progress

Day 7  
Final recovery check

Include:

**Simulate Patient Reply** button.

---

## Nurse Queue

List patient responses requiring human review but not immediate doctor attention.

Each item shows:

- Patient
- Message
- Severity
- Detected reason
- Recommended action

Actions:

- Resolve
- Send follow-up
- Escalate to doctor

---

## Doctor Queue

Only show high-severity or nurse-escalated cases.

Each alert should already contain:

- patient
- recent visit
- relevant history
- latest message
- detected red flags
- escalation reason

The doctor should never need to read the entire conversation.

---

## Care Protocols

Only implement 3 templates.

### Post Procedure

Check for:

- severe pain
- bleeding
- fever
- swelling
- worsening symptoms

### Acute Infection

Check for:

- fever
- worsening symptoms
- breathing difficulty
- inability to eat/drink
- no improvement

### Chronic Condition

Check for:

- symptom deterioration
- medication problems
- abnormal reported measurements
- missed medication
- urgent symptoms

Protocols can be hardcoded JSON/config.

Do not build a protocol editor.

---

# 4. Patient Reply Processing

Keep escalation deterministic.

Pipeline:

```text
Patient Reply
     ↓
Extract symptoms / keywords
     ↓
Match protocol rules
     ↓
Assign severity
     ↓
Route to correct queue
     ↓
Generate concise summary
```

Use an LLM only for:

- extracting structured information from natural language
- summarizing the case

Do NOT allow the LLM to independently decide whether something is medically urgent.

Example output:

```json
{
  "symptoms": ["fever", "increasing pain"],
  "matched_rules": ["FEVER", "WORSENING_PAIN"],
  "severity": "HIGH",
  "route": "DOCTOR"
}
```

Severity must come from predefined rules.

---

# 5. Data Model

Keep the schema minimal.

### patients

```text
id
name
age
phone
assigned_doctor
```

### visits

```text
id
patient_id
date
diagnosis
treatment
notes
```

### care_protocols

```text
id
name
type
steps
red_flags
```

### patient_protocols

```text
id
patient_id
protocol_id
start_date
status
next_checkin
```

### checkins

```text
id
patient_id
protocol_id
message
patient_response
severity
created_at
```

### alerts

```text
id
patient_id
checkin_id
severity
assigned_role
reason
status
summary
```

### team_members

```text
id
name
role
```

---

# 6. Roles

Use a simple role switcher.

### Doctor

Can:

- view patients
- view Doctor Queue
- resolve/escalate alerts
- review patient history

### Nurse / Care Coordinator

Can:

- view Nurse Queue
- review responses
- resolve alerts
- escalate to doctor

### Admin

For this hackathon version, Admin only needs basic dashboard visibility.

No real authentication.

---

# 7. Seed Data

Create 5-8 realistic synthetic patients.

Include different states:

- stable patient
- active follow-up
- mild issue
- nurse review
- doctor escalation
- completed follow-up

At least one patient for each care protocol.

Use synthetic data only.

---

# 8. UI

Aim for a clean clinical dashboard.

Desktop-first.

Suggested navigation:

```text
Dashboard
Patients
Nurse Queue
Doctor Queue
Care Protocols
```

Visual hierarchy should make severity obvious.

Use:

- green: stable
- amber: nurse review
- red: doctor attention

Avoid building a complex hospital-style UI.

The important part is understanding:

**who needs attention right now and why.**

---

# 9. Recommended Stack

Keep the existing preferred stack simple:

```text
Next.js
TypeScript
Tailwind
Postgres / Supabase
LLM API for extraction + summaries
```

For a very short hackathon, SQLite or Supabase is also fine.

Do not build unnecessary infrastructure.

---

# 10. Must-Have Demo Features

Implement these first:

- seeded patient dashboard
- patient detail + history
- 3 care protocols
- simulated patient reply
- rule-based severity detection
- nurse queue
- doctor queue
- AI-generated alert summary
- resolve / escalate actions
- role switcher

Everything else is secondary.

---

# 11. Explicitly Out of Scope

Do NOT build:

- Claims Copilot
- insurance workflows
- real EHR integration
- real WhatsApp integration
- real SMS
- real authentication
- patient mobile app
- protocol builder
- autonomous medical diagnosis
- autonomous treatment recommendations
- production consent infrastructure
- production UAE health-data integrations

---

# 12. Demo Script

The final demo should take roughly this shape:

1. Open dashboard.
2. Show multiple patients currently being followed.
3. Open Aisha's record.
4. Show her visit and post-procedure follow-up protocol.
5. Simulate mild response.
6. Show it routed to Nurse Queue.
7. Explain that the doctor was not interrupted.
8. Simulate fever + worsening pain.
9. Show deterministic red-flag detection.
10. Open Doctor Queue.
11. Show the generated clinical context summary.
12. Doctor marks the case for patient contact.

The core demo moment is:

```text
100 patient messages
        ↓
automated follow-up + triage
        ↓
small nurse queue
        ↓
only important cases reach doctor
```

That is the product story Devin should optimize the build around.