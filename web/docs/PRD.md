# Product Requirements Document (PRD)
# Stacks Data - Supply Chain Compliance Platform

**Version:** 1.0
**Last Updated:** December 25, 2024
**Document Status:** Draft
**Authors:** Product Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Goals](#3-product-vision--goals)
4. [User Personas](#4-user-personas)
5. [Subscription Model & Feature Matrix](#5-subscription-model--feature-matrix)
6. [Core Features & Requirements](#6-core-features--requirements)
7. [User Journeys](#7-user-journeys)
8. [Data Model Requirements](#8-data-model-requirements)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [MVP vs Future Phases](#10-mvp-vs-future-phases)
11. [Success Metrics](#11-success-metrics)
12. [Appendix](#appendix)

---

## 1. Executive Summary

### 1.1 What is Stacks Data?

Stacks Data is a B2B SaaS platform that revolutionizes supply chain compliance data management by enabling manufacturers and customers to collect, manage, and share compliance data from their suppliers through structured questionnaires. The platform creates a powerful network effect where supplier compliance data can be securely reused across multiple customer requests, dramatically reducing redundant data collection efforts while maintaining data accuracy and currency.

### 1.2 Target Market

**Primary Markets:**
- Manufacturing companies requiring supplier compliance verification
- Consumer goods brands managing complex supply chains
- Retailers with sustainability and compliance requirements
- Chemical and materials companies subject to regulatory reporting

**Industry Verticals:**
- Consumer Products & Retail
- Electronics & Technology
- Automotive & Transportation
- Food & Beverage
- Textiles & Apparel
- Chemicals & Materials

### 1.3 Value Proposition

| For Customers (Manufacturers) | For Suppliers |
|------------------------------|---------------|
| Centralized supplier compliance management | Answer once, share with multiple customers |
| Reduced time spent chasing supplier data | Organized compliance data repository |
| Real-time visibility into compliance status | Insights into their own compliance posture |
| Standardized questionnaire templates | Reduced administrative burden |
| Analytics and reporting capabilities | Professional data presentation |

### 1.4 Existing Implementation Status

The platform is currently in active development with the following foundation in place:

- **Technology Stack:** Next.js 14, Supabase (PostgreSQL), TypeScript
- **Authentication:** Supabase Auth with row-level security (RLS)
- **Data Migration:** Migrating ~367k answers from Bubble.io legacy platform
- **Current Tables:** 40+ database tables with comprehensive RLS policies
- **User Roles:** User, Admin, Super Admin with impersonation capability
- **Core UI:** Dashboard, Suppliers list, Admin panel implemented

---

## 2. Problem Statement

### 2.1 Industry Challenges

**For Customers/Manufacturers:**
1. **Fragmented Data Collection:** Compliance data is scattered across emails, spreadsheets, and disconnected systems
2. **Repetitive Requests:** Same data requested multiple times from same suppliers
3. **No Standardization:** Each questionnaire uses different formats, making data comparison difficult
4. **Poor Visibility:** No real-time view of supplier compliance status
5. **Manual Follow-ups:** Significant time spent chasing suppliers for responses

**For Suppliers:**
1. **Questionnaire Fatigue:** Responding to similar questions from multiple customers
2. **Data Inconsistency:** Providing different answers to similar questions across requests
3. **No Data Ownership:** Once submitted, suppliers lose access to their own data
4. **Administrative Burden:** Managing multiple customer compliance portals

### 2.2 Market Opportunity

The supply chain compliance software market is projected to grow significantly due to:
- Increasing regulatory requirements (GDPR, sustainability reporting, conflict minerals)
- ESG (Environmental, Social, Governance) mandates from investors
- Consumer demand for supply chain transparency
- Risk management needs in global supply chains

---

## 3. Product Vision & Goals

### 3.1 Vision Statement

*"To create the world's most efficient supply chain compliance network where data flows seamlessly between trading partners, reducing friction while maximizing transparency and trust."*

### 3.2 Strategic Goals

| Goal | Description | Success Indicator |
|------|-------------|-------------------|
| **Network Growth** | Build a self-reinforcing network of suppliers and customers | 1000+ companies on platform within 18 months |
| **Data Reuse** | Maximize answer reuse across customer requests | 50%+ of answers auto-populated from prior responses |
| **Time Savings** | Reduce compliance data collection time | 60%+ reduction in average questionnaire completion time |
| **Data Quality** | Improve accuracy of compliance data | 90%+ supplier response rate within 30 days |
| **Platform Revenue** | Generate sustainable subscription revenue | $X ARR within 24 months |

### 3.3 Key Principles

1. **Supplier-Centric:** Suppliers own their data; the platform is their asset, not a burden
2. **Network Effects:** Every new participant increases value for all users
3. **Standardization:** Consistent question formats enable data comparison and reuse
4. **Transparency:** Clear visibility into data usage, sharing, and access
5. **Security First:** Enterprise-grade security with tenant isolation

---

## 4. User Personas

### 4.1 Persona: Sarah - Supply Chain Manager (Customer Role)

**Demographics:**
- Age: 35-45
- Title: Supply Chain Compliance Manager
- Company: Mid-size consumer goods manufacturer ($50M-$500M revenue)
- Team Size: 3-5 people

**Goals:**
- Maintain visibility into supplier compliance status
- Reduce time spent collecting supplier data
- Generate compliance reports for internal stakeholders and auditors
- Onboard new suppliers quickly

**Pain Points:**
- Chasing suppliers for questionnaire responses via email
- Consolidating data from multiple spreadsheets
- Re-requesting data when it expires or changes
- Explaining questionnaire requirements to suppliers

**Technical Proficiency:** Moderate - comfortable with web applications and spreadsheets

**Quote:** *"I spend 40% of my time just getting suppliers to respond to questionnaires. I need a system that makes it easy for them so they actually do it."*

---

### 4.2 Persona: Marcus - Sustainability Lead (Customer Role)

**Demographics:**
- Age: 30-40
- Title: Sustainability/ESG Director
- Company: Large enterprise ($1B+ revenue)
- Team Size: 10-20 people

**Goals:**
- Track sustainability metrics across entire supply base
- Generate ESG reports for investors and regulators
- Identify high-risk suppliers for intervention
- Benchmark supplier performance

**Pain Points:**
- Inconsistent data formats from different suppliers
- Lack of historical data trends
- Difficulty rolling up data across hundreds of suppliers
- Manual data entry into reporting systems

**Technical Proficiency:** High - uses multiple enterprise systems

**Quote:** *"Our board wants quarterly ESG updates. Right now it takes my team 3 weeks just to collect and validate the data."*

---

### 4.3 Persona: Jennifer - Quality Manager (Supplier Role - Free Tier)

**Demographics:**
- Age: 28-38
- Title: Quality Assurance Manager
- Company: Small manufacturing company (50-200 employees)
- Works With: 5-15 customers who request compliance data

**Goals:**
- Respond to customer questionnaires on time
- Maintain good relationships with customers
- Not spend too much time on administrative tasks

**Pain Points:**
- Receiving similar questionnaires from multiple customers
- Remembering what was answered previously
- Finding compliance documents when needed
- Tracking which customers received which information

**Technical Proficiency:** Moderate - uses email and basic business applications

**Quote:** *"I get the same questions from three different customers. Why can't I just answer once and share it with all of them?"*

---

### 4.4 Persona: David - Compliance Director (Supplier Role - Paid Tier)

**Demographics:**
- Age: 40-50
- Title: VP of Compliance / Regulatory Affairs
- Company: Mid-size supplier with complex compliance requirements
- Works With: 50+ customers, multiple regulatory bodies

**Goals:**
- Centralize all compliance data in one place
- Proactively share data with customers
- Export data for external audits and certifications
- Track compliance trends over time

**Pain Points:**
- Managing compliance data across multiple customer portals
- No single source of truth for company compliance status
- Preparing data for external auditors
- Demonstrating improvements over time

**Technical Proficiency:** High - manages multiple compliance systems

**Quote:** *"I need a compliance command center. One place where I can see everything about our compliance posture and share it on my terms."*

---

### 4.5 Persona: Alex - Operations Lead (Both Customer & Supplier Role)

**Demographics:**
- Age: 35-45
- Title: Operations Manager
- Company: Contract manufacturer (both buys from and sells to other companies)
- Dual Role: Manages 30 suppliers, serves 20 customers

**Goals:**
- Streamline both directions of compliance data flow
- Leverage their supplier data to inform their own compliance
- Reduce overall compliance overhead

**Pain Points:**
- Using different systems for supplier vs customer compliance
- Data gaps between what's requested and what's provided
- Reconciling discrepancies in compliance data

**Technical Proficiency:** High - power user of business systems

**Quote:** *"I'm in the middle of the supply chain. I need to query my suppliers and respond to my customers - ideally from the same platform."*

---

## 5. Subscription Model & Feature Matrix

### 5.1 Plan Overview

| Plan | Monthly Price | Target User | Value Proposition |
|------|--------------|-------------|-------------------|
| **Free Supplier** | $0 | Suppliers invited by paying customers | Respond to data requests, basic data entry |
| **Paid Supplier** | $49-199/mo* | Suppliers wanting data ownership | Export data, insights, external request management |
| **Paid Customer** | $299-999/mo* | Manufacturers collecting supplier data | Questionnaire creation, supplier management, analytics |
| **Paid Both** | $399-1,199/mo* | Companies that are both customers and suppliers | Full platform access in both directions |

*Pricing tiers TBD based on usage limits and feature access

### 5.2 Detailed Feature Matrix

#### 5.2.1 Core Platform Access

| Feature | Free Supplier | Paid Supplier | Paid Customer | Paid Both |
|---------|--------------|---------------|---------------|-----------|
| User accounts | 1 | Up to 5 | Up to 10 | Up to 15 |
| Company profile | Basic | Full | Full | Full |
| Dashboard access | Limited | Full | Full | Full |
| Mobile responsive | Yes | Yes | Yes | Yes |
| Email notifications | Basic | Customizable | Customizable | Customizable |
| API access | No | No | Enterprise only | Enterprise only |

#### 5.2.2 Supplier Capabilities

| Feature | Free Supplier | Paid Supplier | Paid Customer | Paid Both |
|---------|--------------|---------------|---------------|-----------|
| Respond to questionnaires | Yes | Yes | N/A | Yes |
| View question history | Current only | Full history | N/A | Full history |
| Answer auto-population | No | Yes | N/A | Yes |
| Document management | Upload only | Full library | N/A | Full library |
| Data export (PDF/Excel) | No | Yes | N/A | Yes |
| External request management | No | Yes | N/A | Yes |
| Compliance insights | No | Yes | N/A | Yes |
| Certificate expiry tracking | No | Yes | N/A | Yes |
| Answer sharing controls | Limited | Full | N/A | Full |

#### 5.2.3 Customer Capabilities

| Feature | Free Supplier | Paid Supplier | Paid Customer | Paid Both |
|---------|--------------|---------------|---------------|-----------|
| Create questionnaires | No | No | Yes | Yes |
| Invite suppliers | No | No | Yes | Yes |
| Send reminders | No | No | Yes | Yes |
| View supplier responses | No | No | Yes | Yes |
| Supplier comparison | No | No | Yes | Yes |
| Custom question creation | No | No | Yes | Yes |
| Use question templates | No | No | Yes | Yes |
| Bulk supplier import | No | No | Yes | Yes |
| Supplier risk scoring | No | No | Yes | Yes |
| Compliance reports | No | No | Yes | Yes |
| Data analytics | No | No | Yes | Yes |

#### 5.2.4 Administration & Integration

| Feature | Free Supplier | Paid Supplier | Paid Customer | Paid Both |
|---------|--------------|---------------|---------------|-----------|
| User role management | No | Admin only | Full | Full |
| SSO integration | No | No | Enterprise | Enterprise |
| Custom branding | No | No | Enterprise | Enterprise |
| Audit log access | No | No | Yes | Yes |
| Priority support | No | Email | Email + Chat | Email + Chat |
| Dedicated CSM | No | No | Enterprise | Enterprise |

### 5.3 Usage Limits by Tier

| Metric | Free Supplier | Paid Supplier | Paid Customer | Paid Both |
|--------|--------------|---------------|---------------|-----------|
| Active questionnaires | Unlimited (view) | Unlimited | 50/100/250* | 50/100/250* |
| Suppliers managed | N/A | N/A | 50/100/500* | 50/100/500* |
| Document storage | 100MB | 5GB | 25GB | 50GB |
| Data exports/month | 0 | 10/50/Unlimited* | Unlimited | Unlimited |
| API calls/month | 0 | 0 | 1K/10K/100K* | 1K/10K/100K* |

*Varies by tier within plan

### 5.4 Upgrade Paths

```
Free Supplier -----> Paid Supplier -----> Paid Both
                                              ^
Paid Customer ---------------------------------+
```

**Trigger Points for Upgrades:**
- **Free to Paid Supplier:** Need to export data, manage external requests, access insights
- **Paid Supplier to Paid Both:** Company starts needing to collect data from their own suppliers
- **Paid Customer to Paid Both:** Company starts receiving questionnaires from their own customers

---

## 6. Core Features & Requirements

### 6.1 Authentication & User Management

#### 6.1.1 User Registration & Login

**FR-AUTH-001: Email/Password Authentication**
- Users can register with email and password
- Email verification required before account activation
- Password requirements: 8+ characters, 1 uppercase, 1 number, 1 special character

**FR-AUTH-002: Social Login (Future)**
- Google Workspace integration
- Microsoft Azure AD integration (Enterprise)

**FR-AUTH-003: Magic Link Login**
- Passwordless login via email link
- Link expires after 15 minutes
- Single-use tokens

**Acceptance Criteria:**
```gherkin
GIVEN a user with a valid email address
WHEN they request a magic link
THEN they receive an email within 60 seconds
AND the link logs them in on first click
AND the link expires after 15 minutes
AND the link cannot be reused
```

#### 6.1.2 User Roles & Permissions

**FR-AUTH-010: Role Hierarchy**

| Role | Scope | Capabilities |
|------|-------|--------------|
| Super Admin | Platform | All access, impersonate users, system configuration |
| Company Admin | Company | Manage company users, settings, all company data |
| User | Company | Standard access based on subscription tier |
| View Only | Company | Read-only access to assigned questionnaires |

**FR-AUTH-011: Company Membership**
- Users belong to exactly one company
- Users can be invited to companies by Company Admins
- Users can request to join a company (pending admin approval)

**FR-AUTH-012: Super Admin Impersonation**
- Super admins can log in as any user for support purposes
- All impersonation sessions are logged with timestamp and duration
- Impersonated sessions are visually indicated in UI

**Acceptance Criteria:**
```gherkin
GIVEN a super admin user
WHEN they initiate impersonation of another user
THEN they see the platform as that user would see it
AND a banner indicates they are in impersonation mode
AND all actions are logged with both user IDs
AND they can exit impersonation at any time
```

---

### 6.2 Company Management

#### 6.2.1 Company Profile

**FR-COMP-001: Company Information**

Required Fields:
- Company name
- Primary email domain (for user invitation validation)

Optional Fields:
- Logo (image upload, max 2MB, PNG/JPG/SVG)
- Location/Address
- Industry classification
- Company size (employees)
- Annual revenue range
- Website URL
- Description

**FR-COMP-002: Company Verification**
- Email domain verification for user auto-assignment
- Manual verification by super admin for disputed domains
- Public company profile for suppliers visible to customers

#### 6.2.2 User Management

**FR-COMP-010: User Invitation Flow**
1. Admin enters email address
2. System checks if user exists
3. If new: Send invitation email with magic link
4. If existing (different company): Show error
5. If existing (no company): Send join request

**FR-COMP-011: User Roles Within Company**

| Permission | Admin | User | View Only |
|------------|-------|------|-----------|
| Invite users | Yes | No | No |
| Remove users | Yes | No | No |
| Edit company profile | Yes | No | No |
| Create questionnaires | Yes | Yes | No |
| Submit answers | Yes | Yes | No |
| View all data | Yes | Yes | Yes |
| Export data | Yes | Yes | No |

---

### 6.3 Questionnaire Management (Customer Capabilities)

#### 6.3.1 Questionnaire Creation

**FR-QUEST-001: Questionnaire Structure**

```
Questionnaire (Sheet)
  |
  +-- Section (e.g., "Company Information")
  |     |
  |     +-- Subsection (e.g., "Basic Details")
  |     |     |
  |     |     +-- Question 1
  |     |     +-- Question 2
  |     |     +-- Question 3
  |     |
  |     +-- Subsection (e.g., "Certifications")
  |           |
  |           +-- Question 4
  |           +-- Question 5
  |
  +-- Section (e.g., "Environmental Compliance")
        |
        +-- Subsection...
```

**FR-QUEST-002: Question Types**

| Type | Description | Answer Format |
|------|-------------|---------------|
| Text | Short text input | String (max 255 chars) |
| Text Area | Long text input | String (max 10,000 chars) |
| Number | Numeric input | Decimal |
| Boolean | Yes/No question | Boolean |
| Date | Date selection | Date |
| Single Choice | Radio button selection | Choice ID |
| Multiple Choice | Checkbox selection | Array of Choice IDs |
| File Upload | Document attachment | File URL |
| List Table | Tabular data entry | Array of row objects |

**FR-QUEST-003: Question Configuration**

| Property | Description | Required |
|----------|-------------|----------|
| Content | The question text | Yes |
| Description | Additional context/help text | No |
| Required | Must be answered to submit | No |
| Clarification | Follow-up question if Yes/No | No |
| Support File | Request supporting document | No |
| Conditional | Show based on previous answer | No |

**Acceptance Criteria:**
```gherkin
GIVEN a customer user with questionnaire creation permission
WHEN they create a new questionnaire
THEN they can add sections with subsections
AND add questions of any supported type
AND configure question properties
AND preview how suppliers will see it
AND save as draft or publish
```

#### 6.3.2 Question Templates & Reuse

**FR-QUEST-010: Standard Question Library**
- Platform provides standard compliance questions
- Questions organized by category (Tags)
- Customers can use standard questions or create custom

**FR-QUEST-011: Custom Questions**
- Customers can create company-specific questions
- Custom questions can be marked as shareable or private
- Version history maintained for question changes

**FR-QUEST-012: Stacks (Question Bundles)**
- Pre-defined collections of related questions
- Stacks can be bundled together
- Associated with industry associations

---

### 6.4 Supplier Invitation & Onboarding

#### 6.4.1 Supplier Invitation Flow

**FR-INV-001: Invitation Methods**

| Method | Description | Use Case |
|--------|-------------|----------|
| Email invitation | Send link to specific email | Known contact at supplier |
| Bulk CSV import | Upload list of suppliers | Mass onboarding |
| Self-registration | Supplier signs up via link | Public questionnaires |

**FR-INV-002: Invitation Email Content**
- Customer company name and logo
- Brief description of request
- Clear call-to-action button
- Expiration notice (30 days default)
- Support contact information

**FR-INV-003: Supplier Onboarding Steps**

1. **Click invitation link** - Validate link is not expired
2. **Create account** (if new) - Email, password, name
3. **Company association**:
   - If email domain matches existing company: Request to join
   - If new company: Create company profile
4. **Complete profile** - Basic company information
5. **View questionnaire** - Land on assigned questionnaire

**Acceptance Criteria:**
```gherkin
GIVEN a customer has sent a questionnaire to a new supplier
WHEN the supplier clicks the invitation link
THEN they are guided through account creation
AND automatically associated with the correct company
AND see the questionnaire they were invited to complete
AND can begin responding immediately after onboarding
```

#### 6.4.2 Supplier Association

**FR-INV-010: Customer-Supplier Relationship**
- Customers maintain a list of their suppliers
- Suppliers can be associated with multiple customers
- Relationship includes:
  - Status (Active, Inactive, Pending)
  - First contact date
  - Number of questionnaires sent
  - Response rate metrics

**FR-INV-011: Supplier Status Tracking**

| Status | Meaning |
|--------|---------|
| Invited | Invitation sent, no action yet |
| Pending | Account created, onboarding incomplete |
| Active | Fully onboarded, responding to requests |
| Inactive | No activity for 90+ days |
| Blocked | Removed from supplier list |

---

### 6.5 Response Collection

#### 6.5.1 Answer Submission

**FR-RESP-001: Answer Data Model**

Each answer stores:
- Question reference (originating + specific)
- Sheet reference
- Company reference (supplier)
- Value (appropriate to question type)
- Supporting documentation (if applicable)
- Metadata (created by, created at, modified at)

**FR-RESP-002: Answer Validation**

| Question Type | Validations |
|---------------|-------------|
| Text | Max length, required check |
| Number | Range validation, required check |
| Date | Valid date, optional range |
| File | File type, max size (default 25MB) |
| Choice | Valid choice selection |

**FR-RESP-003: Partial Save / Draft Mode**
- Answers auto-save every 30 seconds
- Suppliers can leave and return to questionnaire
- Progress indicator shows completion percentage

**Acceptance Criteria:**
```gherkin
GIVEN a supplier is answering a questionnaire
WHEN they enter data into a field
THEN the answer is auto-saved within 30 seconds
AND if they navigate away and return, their answers are preserved
AND they see a progress indicator showing % complete
```

#### 6.5.2 Answer Sharing & Reuse

**FR-RESP-010: Answer Auto-Population**
- When supplier receives new questionnaire, check for existing answers
- Auto-populate matching questions from prior responses
- Supplier can review and modify before confirming

**FR-RESP-011: Answer Sharing Controls (Paid Suppliers)**

| Setting | Description |
|---------|-------------|
| Share All | Answer available to all customers who ask same question |
| Share Selected | Answer shared only with specific customers |
| Private | Answer only for this specific questionnaire |

**FR-RESP-012: Shareable Companies**
- Answers have list of companies with whom they can be shared
- Questionnaires have list of companies who can view responses
- Intersection determines visibility

#### 6.5.3 Review & Revision Cycle

**FR-REV-001: Customer Review Workflow**

After supplier submits a questionnaire response, the customer reviews and can request revisions:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REVIEW & REVISION CYCLE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. SUPPLIER SUBMITS                                                │
│     └── Sheet status: "Submitted"                                   │
│                           ↓                                         │
│  2. CUSTOMER REVIEWS                                                │
│     ├── Opens submitted sheet                                       │
│     ├── Reviews each answer                                         │
│     ├── For problematic answers:                                    │
│     │   ├── Flag answer as needing revision                         │
│     │   └── Add comment explaining issue                            │
│     └── Submit review to supplier                                   │
│         └── Sheet status: "Needs Revision"                          │
│                           ↓                                         │
│  3. SUPPLIER RESPONDS TO REVIEW                                     │
│     ├── Opens sheet with flagged answers highlighted                │
│     ├── For each flagged answer:                                    │
│     │   ├── View customer's comment                                 │
│     │   ├── Update answer OR                                        │
│     │   └── Reply with explanation                                  │
│     └── Resubmit for review                                         │
│         └── Sheet status: "Resubmitted"                             │
│                           ↓                                         │
│  4. CUSTOMER FINAL REVIEW                                           │
│     ├── Reviews updated/explained answers                           │
│     ├── IF satisfied:                                               │
│     │   └── Approve sheet → Status: "Approved"                      │
│     └── IF not satisfied:                                           │
│         └── Flag again → Cycle repeats                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**FR-REV-002: Answer Rejection**

| Field | Description |
|-------|-------------|
| `answer_id` | The answer being rejected |
| `reason` | Customer's explanation of the issue |
| `rejected_by` | Customer user who flagged it |
| `created_at` | When the rejection was created |

**FR-REV-003: Review Comments**

| Field | Description |
|-------|-------------|
| `content` | The comment text |
| `comment_type` | Type of comment (review, response, clarification) |
| `parent_entity_type` | What it's attached to (answer, sheet) |
| `parent_entity_id` | ID of the parent entity |
| `created_by` | User who wrote the comment |

**FR-REV-004: Sheet Status Transitions**

| From | To | Trigger |
|------|-----|---------|
| In Progress | Submitted | Supplier clicks Submit |
| Submitted | Approved | Customer approves with no issues |
| Submitted | Needs Revision | Customer flags issues |
| Needs Revision | Resubmitted | Supplier addresses issues and resubmits |
| Resubmitted | Approved | Customer satisfied |
| Resubmitted | Needs Revision | Customer still has issues |

**Acceptance Criteria:**
```gherkin
GIVEN a customer is reviewing a submitted questionnaire
WHEN they find an answer that needs clarification or correction
THEN they can flag that specific answer
AND provide a comment explaining the issue
AND when they submit their review, the supplier is notified

GIVEN a supplier has received a review with flagged answers
WHEN they open the questionnaire
THEN flagged answers are visually highlighted
AND they can see the customer's comments
AND they can update their answer or reply with explanation
AND resubmit for another review cycle

GIVEN a customer is satisfied with all answers
WHEN they approve the sheet
THEN the status changes to "Approved"
AND both parties are notified
AND the data is finalized
```

---

### 6.6 Data Export & External Request Management (Paid Supplier)

#### 6.6.1 Data Export

**FR-EXP-001: Export Formats**
- PDF report (branded with company logo)
- Excel spreadsheet (raw data + formatted)
- JSON (for system integration)

**FR-EXP-002: Export Scope**
- All answered questions
- Selected questionnaires only
- Selected question categories (Tags)
- Date range filter

**FR-EXP-003: Export Branding**
- Company logo on PDF exports
- Custom cover page (Enterprise)
- Confidentiality notices

**Acceptance Criteria:**
```gherkin
GIVEN a paid supplier user
WHEN they request a data export
THEN they can select specific questionnaires or categories
AND choose PDF or Excel format
AND the export includes their company branding
AND is available for download within 60 seconds
```

#### 6.6.2 External Request Management

**FR-EXP-010: External Request Tracking**
- Suppliers can log compliance requests from non-Stacks customers
- Link existing Stacks answers to external requests
- Track status of external requests

**FR-EXP-011: External Request Workflow**
1. Create external request (customer name, request date)
2. Associate relevant questions/answers
3. Generate export for external customer
4. Mark request as fulfilled
5. Track follow-up and renewal dates

---

### 6.7 Analytics & Insights

#### 6.7.1 Customer Analytics

**FR-ANA-001: Supplier Compliance Dashboard**
- Overall compliance rate across all suppliers
- Suppliers by compliance status (Complete, Partial, Not Started)
- Time to completion metrics
- Overdue questionnaires

**FR-ANA-002: Supplier Comparison**
- Side-by-side comparison of supplier responses
- Identify gaps and inconsistencies
- Export comparison reports

**FR-ANA-003: Trend Analysis**
- Compliance status over time
- Response rate trends
- Common data gaps

#### 6.7.2 Supplier Insights

**FR-ANA-010: Compliance Scorecard**
- Overall completion percentage
- Breakdown by question category
- Certificates and their expiry dates
- Areas needing attention

**FR-ANA-011: Data Freshness**
- Age of each answer
- Questions needing update
- Automatic reminder for stale data (>12 months)

---

### 6.8 Notifications & Reminders

#### 6.8.1 Notification Types

| Notification | Trigger | Recipients |
|--------------|---------|------------|
| New questionnaire | Customer sends questionnaire | Supplier users |
| Reminder | Approaching/past due date | Supplier users |
| Submission complete | Supplier submits questionnaire | Customer users |
| Answer update | Supplier updates shared answer | Customer users |
| Review requested | Customer requests clarification | Supplier users |
| Certificate expiring | 30 days before expiry | Supplier users |

#### 6.8.2 Notification Channels

**FR-NOT-001: Email Notifications**
- All notifications sent via email by default
- Customizable email preferences per user
- Digest option (daily/weekly summary)

**FR-NOT-002: In-App Notifications**
- Notification bell with unread count
- Notification center with history
- Mark as read/unread

**FR-NOT-003: Reminder Automation**
- Automatic reminders at configurable intervals
- Maximum reminder limit (prevent spam)
- Escalation to different contacts after X reminders

---

### 6.9 Administration

#### 6.9.1 Super Admin Capabilities

**FR-ADM-001: User Management**
- View all users across platform
- Impersonate any user
- Reset user passwords
- Deactivate user accounts

**FR-ADM-002: Company Management**
- View all companies
- Merge duplicate companies
- Verify company domains
- Adjust subscription tiers

**FR-ADM-003: System Configuration**
- Manage standard question library
- Configure notification templates
- View platform analytics
- Manage Stacks/Associations

#### 6.9.2 Company Admin Capabilities

**FR-ADM-010: Company User Management**
- Invite new users
- Set user roles
- Deactivate user accounts
- View user activity logs

**FR-ADM-011: Company Settings**
- Update company profile
- Manage branding/logo
- Configure default questionnaire settings
- View billing and subscription

---

### 6.10 Billing & Subscription Management

#### 6.10.1 Subscription Lifecycle

**FR-BILL-001: Subscription States**

| State | Description |
|-------|-------------|
| Trial | Free trial period (14 days default) |
| Active | Paid subscription in good standing |
| Past Due | Payment failed, grace period |
| Canceled | User canceled, active until period end |
| Expired | Subscription ended, downgrade to free |

**FR-BILL-002: Plan Changes**
- Upgrade: Immediate access, prorated billing
- Downgrade: Effective at period end
- Cancel: Access until period end

**FR-BILL-003: Payment Processing**
- Credit card via Stripe
- Invoice billing for Enterprise (Net 30)
- Annual discount (2 months free)

#### 6.10.2 Usage Tracking

**FR-BILL-010: Metered Usage**
- Active questionnaires count
- Suppliers managed count
- Storage usage
- API calls (if applicable)

**FR-BILL-011: Usage Alerts**
- 80% of limit reached
- 100% of limit reached
- Overage charges applied (if applicable)

---

## 7. User Journeys

### 7.1 Customer Journey: First Questionnaire

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CUSTOMER FIRST QUESTIONNAIRE                     │
└─────────────────────────────────────────────────────────────────────┘

1. DISCOVERY & SIGNUP
   │
   ├── Visit stacksdata.com
   ├── Click "Start Free Trial"
   ├── Enter email, password
   ├── Verify email
   └── Complete company profile
       │
       ▼
2. CREATE QUESTIONNAIRE
   │
   ├── Dashboard → "Create Questionnaire"
   ├── Name questionnaire (e.g., "2024 Supplier Assessment")
   ├── Choose template OR start blank
   ├── Add sections and questions
   │   ├── Use standard questions from library
   │   └── Add custom questions as needed
   ├── Configure required/optional settings
   ├── Preview questionnaire
   └── Save as draft
       │
       ▼
3. INVITE SUPPLIERS
   │
   ├── Navigate to "Suppliers" tab
   ├── Click "Add Supplier"
   ├── Enter supplier company name + contact email
   ├── OR bulk import via CSV
   ├── Assign questionnaire to suppliers
   ├── Set due date
   └── Send invitations
       │
       ▼
4. MONITOR PROGRESS
   │
   ├── Dashboard shows supplier status
   │   ├── Invited (not yet started)
   │   ├── In Progress (partially complete)
   │   └── Complete (submitted)
   ├── Send reminders as needed
   └── View individual supplier responses
       │
       ▼
5. REVIEW & ANALYZE
   │
   ├── Review submitted responses
   ├── Request clarification if needed
   ├── Compare across suppliers
   ├── Generate compliance report
   └── Export data as needed

```

### 7.2 Supplier Journey: Responding to Request (New User)

```
┌─────────────────────────────────────────────────────────────────────┐
│                   SUPPLIER RESPONDS TO REQUEST                       │
└─────────────────────────────────────────────────────────────────────┘

1. RECEIVE INVITATION
   │
   ├── Email from customer via Stacks
   ├── Clear subject: "[Customer Name] requests compliance data"
   ├── Email body shows:
   │   ├── Customer name and logo
   │   ├── Questionnaire name
   │   ├── Due date
   │   └── "Get Started" button
   └── Click link in email
       │
       ▼
2. CREATE ACCOUNT
   │
   ├── Land on Stacks registration page
   ├── Email pre-filled from invitation
   ├── Set password
   ├── Enter name
   └── Create account
       │
       ▼
3. COMPANY SETUP
   │
   ├── System checks email domain
   ├── IF company exists → Request to join (approval needed)
   ├── IF company new → Create company
   │   ├── Company name
   │   ├── Location (optional)
   │   └── Logo (optional)
   └── Complete onboarding
       │
       ▼
4. VIEW QUESTIONNAIRE
   │
   ├── Automatically navigate to assigned questionnaire
   ├── See progress indicator (0% complete)
   ├── View all sections and questions
   └── Understand what's required vs optional
       │
       ▼
5. ANSWER QUESTIONS
   │
   ├── Work through sections
   ├── Upload supporting documents
   ├── Answers auto-save as you go
   ├── Can leave and return anytime
   └── Progress updates in real-time
       │
       ▼
6. SUBMIT QUESTIONNAIRE
   │
   ├── Review all answers
   ├── System validates required fields
   ├── Click "Submit"
   ├── Confirmation shown
   └── Customer notified of submission

```

### 7.3 Supplier Journey: Answering Second Customer (Returning User)

```
┌─────────────────────────────────────────────────────────────────────┐
│              SUPPLIER RESPONDS TO SECOND CUSTOMER                    │
└─────────────────────────────────────────────────────────────────────┘

1. RECEIVE NEW REQUEST
   │
   ├── Email notification of new questionnaire
   └── Login to Stacks
       │
       ▼
2. VIEW NEW QUESTIONNAIRE
   │
   ├── Dashboard shows new questionnaire from Customer B
   ├── Navigate to questionnaire
   └── See that some questions match previous responses
       │
       ▼
3. AUTO-POPULATED ANSWERS
   │
   ├── System identifies matching questions
   ├── Shows previous answers as suggestions
   ├── Supplier can:
   │   ├── Accept previous answer
   │   ├── Modify previous answer
   │   └── Provide new answer
   └── Saves significant time
       │
       ▼
4. ANSWER NEW QUESTIONS
   │
   ├── Complete any customer-specific questions
   └── Submit questionnaire
       │
       ▼
5. MANAGE SHARING (PAID SUPPLIER)
   │
   ├── Navigate to "My Data"
   ├── See all answers organized by category
   ├── Configure sharing preferences
   │   ├── Share with all customers
   │   ├── Share with specific customers
   │   └── Keep private
   └── Data automatically shared per preferences

```

### 7.4 Customer Journey: Ongoing Supplier Management

```
┌─────────────────────────────────────────────────────────────────────┐
│                  ONGOING SUPPLIER MANAGEMENT                         │
└─────────────────────────────────────────────────────────────────────┘

QUARTERLY ACTIVITIES
│
├── Review supplier dashboard
│   ├── Identify suppliers with expiring certifications
│   ├── Check for outdated answers (>12 months)
│   └── Note suppliers who haven't responded
│
├── Send renewal requests
│   ├── Create new version of questionnaire
│   ├── Pre-populate with existing answers
│   └── Request suppliers confirm or update
│
├── Generate compliance reports
│   ├── Export data for internal stakeholders
│   ├── Create audit-ready documentation
│   └── Identify compliance gaps
│
└── Onboard new suppliers
    ├── Add suppliers as they're qualified
    ├── Send standard questionnaire
    └── Track onboarding progress

ANNUAL ACTIVITIES
│
├── Review and update questionnaires
│   ├── Add new regulatory requirements
│   ├── Remove obsolete questions
│   └── Improve based on supplier feedback
│
├── Full supplier re-certification
│   ├── Send updated questionnaire to all suppliers
│   ├── Set appropriate deadlines
│   └── Track completion
│
└── Analyze trends
    ├── Year-over-year compliance improvement
    ├── Supplier response rate trends
    └── Data quality metrics

```

---

## 8. Data Model Requirements

### 8.1 Entity Relationship Diagram (Core Entities)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CORE DATA MODEL                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   ASSOCIATIONS  │
                    │   (Industry     │
                    │    Groups)      │
                    └────────┬────────┘
                             │ has many
                             ▼
                    ┌─────────────────┐
                    │     STACKS      │
                    │  (Question      │
                    │   Bundles)      │
                    └────────┬────────┘
                             │ has many
                             ▼
    ┌────────────────────────┴────────────────────────┐
    │                                                  │
    ▼                                                  ▼
┌─────────────┐                               ┌─────────────────┐
│  SECTIONS   │──────────────────────────────▶│    QUESTIONS    │
│             │         has many              │                 │
└─────────────┘                               └────────┬────────┘
                                                       │
    ┌─────────────────────────────────────────────────┘
    │ has many
    ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   SUBSECTIONS   │      │     CHOICES     │      │      TAGS       │
│                 │      │  (for MC Qs)    │      │ (Question       │
└─────────────────┘      └─────────────────┘      │  Bundles)       │
                                                  └────────┬────────┘
                                                           │
                    ┌──────────────────────────────────────┤
                    │                                      │
                    ▼                                      ▼
            ┌─────────────────┐                  ┌─────────────────┐
            │  question_tags  │                  │   sheet_tags    │
            │ (tag→questions) │                  │ (sheet→tags     │
            └─────────────────┘                  │  selected)      │
                                                 └─────────────────┘

                    ┌─────────────────┐
                    │    COMPANIES    │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐        ┌──────────┐       ┌───────────┐
    │  USERS  │        │  SHEETS  │       │  ANSWERS  │
    │         │        │(Question-│       │           │
    └─────────┘        │ naires)  │       └───────────┘
                       └────┬─────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │  SHEET_STATUS   │
                    │  (per supplier) │
                    └─────────────────┘


RELATIONSHIPS:
─────────────────────────────────────────────────────────────────
- Company has many Users (users.company_id → companies.id)
- Company creates many Sheets (sheets.company_id → companies.id)
- Sheet assigned to Company (sheets.assigned_to_company_id → companies.id)
- Sheet has many Answers (answers.sheet_id → sheets.id)
- Answer belongs to Company (answers.company_id → companies.id)
- Answer references Question (answers.parent_question_id → questions.id)
- Answer may have Choice (answers.choice_id → choices.id)
```

### 8.2 New Entities Required for Subscription Management

#### 8.2.1 Plans Table

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 'Free Supplier', 'Paid Supplier', etc.
  slug TEXT UNIQUE NOT NULL,             -- 'free-supplier', 'paid-supplier'
  type TEXT NOT NULL CHECK (type IN ('supplier', 'customer', 'both')),
  price_monthly INTEGER NOT NULL,        -- Price in cents
  price_annual INTEGER,                  -- Annual price in cents (optional)
  features JSONB NOT NULL DEFAULT '{}',  -- Feature flags
  limits JSONB NOT NULL DEFAULT '{}',    -- Usage limits
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- Example features JSONB:
-- {
--   "can_export": true,
--   "can_create_questionnaires": false,
--   "can_invite_suppliers": false,
--   "api_access": false,
--   "max_users": 1,
--   "answer_auto_population": false
-- }

-- Example limits JSONB:
-- {
--   "active_questionnaires": 50,
--   "suppliers_managed": 100,
--   "storage_gb": 5,
--   "exports_per_month": 10
-- }
```

#### 8.2.2 Subscriptions Table

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL CHECK (status IN (
    'trialing', 'active', 'past_due', 'canceled', 'expired'
  )),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id)  -- One active subscription per company
);
```

#### 8.2.3 Subscription Usage Table

```sql
CREATE TABLE subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  metric TEXT NOT NULL,                  -- 'active_questionnaires', 'storage_bytes', etc.
  value BIGINT NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(subscription_id, metric, period_start)
);
```

#### 8.2.4 Invoices Table

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  stripe_invoice_id TEXT,
  amount INTEGER NOT NULL,               -- Amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN (
    'draft', 'open', 'paid', 'void', 'uncollectible'
  )),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  invoice_pdf_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 8.3 Existing Tables Summary (Current Implementation)

| Table | Rows | Purpose |
|-------|------|---------|
| companies | 133 | Organizations on the platform |
| users | 337 | User accounts |
| sheets | 1,649 | Questionnaires |
| questions | 214 | Question definitions |
| answers | 33,700 | Supplier responses |
| choices | 691 | Multiple choice options |
| sections | 19 | Question groupings |
| subsections | 83 | Question sub-groupings |
| tags | 26 | Question categories |
| stacks | 21 | Question bundles |
| associations | 1 | Industry groups |
| list_tables | 154 | Tabular question templates |
| list_table_columns | 766 | Column definitions |
| list_table_rows | 37,589 | Row data |

### 8.4 Migration ID Mapping

The `_migration_id_map` table (75,217 rows) maintains mapping between Bubble.io legacy IDs and new Supabase UUIDs for data migration integrity.

---

## 9. Non-Functional Requirements

### 9.1 Performance Requirements

| Metric | Requirement | Notes |
|--------|-------------|-------|
| Page Load Time | < 2 seconds | 90th percentile |
| API Response Time | < 500ms | 90th percentile |
| Search Results | < 1 second | For up to 10,000 records |
| Export Generation | < 60 seconds | For standard exports |
| Concurrent Users | 1,000+ | Per tenant |

### 9.2 Scalability Requirements

| Dimension | Requirement |
|-----------|-------------|
| Companies | Support 10,000+ companies |
| Users per Company | Up to 100 users |
| Questions | 100,000+ unique questions |
| Answers | 10M+ total answers |
| Documents | 1TB+ total storage |

### 9.3 Availability Requirements

| Metric | Requirement |
|--------|-------------|
| Uptime | 99.9% (8.76 hours downtime/year) |
| Planned Maintenance | < 4 hours/month, announced 72 hours ahead |
| RPO (Recovery Point Objective) | < 1 hour |
| RTO (Recovery Time Objective) | < 4 hours |

### 9.4 Security Requirements

#### 9.4.1 Data Security

| Requirement | Implementation |
|-------------|----------------|
| Encryption at Rest | AES-256 via Supabase |
| Encryption in Transit | TLS 1.2+ |
| Data Isolation | Row-Level Security (RLS) policies |
| Backup | Daily automated backups, 30-day retention |
| Audit Logging | All data access and modifications logged |

#### 9.4.2 Authentication Security

| Requirement | Implementation |
|-------------|----------------|
| Password Storage | bcrypt hashing via Supabase Auth |
| Session Management | JWT tokens with 1-hour expiry, refresh tokens |
| MFA | Optional TOTP-based 2FA (future) |
| Rate Limiting | 100 requests/minute per IP |
| Brute Force Protection | Account lockout after 5 failed attempts |

#### 9.4.3 Authorization

| Requirement | Implementation |
|-------------|----------------|
| Role-Based Access | User, Admin, Super Admin roles |
| Resource-Level Permissions | RLS policies per table |
| Tenant Isolation | All queries filtered by company_id |
| API Authorization | JWT verification on all endpoints |

### 9.5 Compliance Requirements

| Regulation | Requirement |
|------------|-------------|
| GDPR | Data subject rights (access, deletion, portability) |
| SOC 2 Type II | Security controls and audit (future) |
| Data Residency | EU data center option (future) |

### 9.6 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Last 2 major versions |
| Firefox | Last 2 major versions |
| Safari | Last 2 major versions |
| Edge | Last 2 major versions |
| Mobile Safari | iOS 14+ |
| Mobile Chrome | Android 10+ |

---

## 10. MVP vs Future Phases

### 10.1 Phase 1: MVP (Months 1-3)

**Goal:** Enable basic customer-supplier questionnaire workflow

#### Core Features

| Feature | Priority | Status |
|---------|----------|--------|
| User authentication (email/password) | P0 | Implemented |
| Company creation and profile | P0 | Implemented |
| User-company association | P0 | Implemented |
| Dashboard (supplier + customer views) | P0 | Implemented |
| View suppliers list | P0 | Implemented |
| View supplier detail page | P0 | In Progress |
| Basic questionnaire viewing | P0 | Planned |
| Answer questions (all types) | P0 | Planned |
| Submit questionnaire | P0 | Planned |
| Super admin impersonation | P0 | Implemented |
| Email notifications (basic) | P1 | Planned |
| Supplier invitation (email) | P1 | Planned |

#### Technical Foundation

| Component | Priority | Status |
|-----------|----------|--------|
| Next.js 14 app structure | P0 | Implemented |
| Supabase database setup | P0 | Implemented |
| RLS policies (all tables) | P0 | Implemented |
| TypeScript types | P0 | Partial |
| UI component library (shadcn) | P0 | Implemented |
| Responsive layout | P1 | Implemented |
| Data migration from Bubble | P0 | In Progress |

### 10.2 Phase 2: Core Platform (Months 4-6)

**Goal:** Full questionnaire lifecycle and basic subscription

#### Features

| Feature | Priority |
|---------|----------|
| Questionnaire creation UI | P0 |
| Section/subsection management | P0 |
| Question creation (all types) | P0 |
| Answer auto-population | P0 |
| Free subscription tier | P0 |
| Paid customer subscription | P0 |
| Stripe integration | P0 |
| Email reminder system | P1 |
| Bulk supplier import | P1 |
| PDF export (basic) | P1 |
| Question templates/library | P1 |

### 10.3 Phase 3: Growth Features (Months 7-9)

**Goal:** Enable network effects and paid supplier tier

#### Features

| Feature | Priority |
|---------|----------|
| Paid supplier subscription | P0 |
| Data export (Excel, PDF) | P0 |
| Answer sharing controls | P0 |
| External request management | P0 |
| Supplier insights dashboard | P0 |
| Customer analytics | P0 |
| Notification preferences | P1 |
| Certificate expiry tracking | P1 |
| In-app notifications | P1 |
| Custom branding (Enterprise) | P2 |

### 10.4 Phase 4: Scale & Enterprise (Months 10-12)

**Goal:** Enterprise features and platform maturity

#### Features

| Feature | Priority |
|---------|----------|
| SSO integration (SAML) | P0 |
| API access | P0 |
| Advanced analytics | P0 |
| Supplier risk scoring | P1 |
| Audit log access | P1 |
| Custom question library | P1 |
| Webhooks | P2 |
| Integrations (ERP, etc.) | P2 |
| Mobile app | P2 |
| Multi-language support | P2 |

### 10.5 Phase Overview Timeline

```
Month  1   2   3   4   5   6   7   8   9   10  11  12
       ├───────────┼───────────┼───────────┼───────────┤
       │   MVP     │   CORE    │  GROWTH   │ ENTERPRISE│
       │           │           │           │           │
       │ Auth      │ Quest.    │ Paid      │ SSO       │
       │ Companies │ Creation  │ Supplier  │ API       │
       │ Dashboard │ Stripe    │ Exports   │ Analytics │
       │ Answers   │ Templates │ Insights  │ Integr.   │
       └───────────┴───────────┴───────────┴───────────┘
```

---

## 11. Success Metrics

### 11.1 Product Metrics

#### Acquisition Metrics

| Metric | Definition | Target (Y1) |
|--------|------------|-------------|
| New Companies | Companies created per month | 50/month |
| Customer Signups | Paid customer companies | 100 total |
| Supplier Signups | Total supplier companies | 500 total |
| Supplier Conversion | Free to Paid suppliers | 10% |

#### Activation Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Questionnaire Created | % of customers who create first questionnaire | 80% |
| First Supplier Invited | % of customers who invite first supplier | 70% |
| First Response | % of suppliers who submit first questionnaire | 60% |
| Time to First Value | Days from signup to first submitted questionnaire | < 7 days |

#### Engagement Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| DAU/MAU | Daily active / Monthly active users | 30% |
| Questionnaires per Customer | Average questionnaires created per customer | 5+ |
| Suppliers per Customer | Average suppliers managed per customer | 20+ |
| Answer Reuse Rate | % of answers auto-populated from prior responses | 40% |
| Login Frequency | Average logins per user per month | 8+ |

#### Retention Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| 30-Day Retention | % of users active after 30 days | 70% |
| 90-Day Retention | % of users active after 90 days | 50% |
| Customer Churn | Monthly customer churn rate | < 3% |
| Supplier Churn | Monthly supplier churn rate | < 5% |
| NPS | Net Promoter Score | 40+ |

### 11.2 Business Metrics

#### Revenue Metrics

| Metric | Definition | Target (Y1) |
|--------|------------|-------------|
| MRR | Monthly Recurring Revenue | $50K |
| ARR | Annual Recurring Revenue | $600K |
| ARPU | Average Revenue Per User (Company) | $250/month |
| LTV | Customer Lifetime Value | $6,000 |
| CAC | Customer Acquisition Cost | < $600 |
| LTV:CAC Ratio | Lifetime value to acquisition cost | > 10:1 |

#### Operational Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Support Tickets | Tickets per 100 users per month | < 5 |
| Response Time | Average first response time | < 4 hours |
| Resolution Time | Average ticket resolution time | < 24 hours |
| CSAT | Customer satisfaction score | 90%+ |

### 11.3 Technical Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Uptime | System availability | 99.9% |
| Page Load Time | 90th percentile load time | < 2 seconds |
| Error Rate | % of requests resulting in errors | < 0.1% |
| Deployment Frequency | Production deployments per week | 3+ |

### 11.4 Metric Dashboard

Key metrics should be displayed on an internal dashboard with:

- Real-time data where possible
- Week-over-week and month-over-month trends
- Cohort analysis for retention
- Funnel visualization for conversion
- Alerts for metrics outside targets

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Answer** | A supplier's response to a specific question |
| **Association** | An industry group that defines standard question sets |
| **Choice** | A predefined option for multiple-choice questions |
| **Company** | An organization on the platform (can be supplier, customer, or both) |
| **Customer** | A company that sends questionnaires to suppliers |
| **Question** | An individual data field requiring a response |
| **Questionnaire** | A collection of questions sent to suppliers (called "Sheet" in system) |
| **Section** | A grouping of related subsections within a questionnaire |
| **Sheet** | Internal term for questionnaire |
| **Stack** | A pre-defined bundle of questions, often industry-specific |
| **Subsection** | A grouping of related questions within a section |
| **Supplier** | A company that responds to questionnaires from customers |
| **Tag** | A category label used to organize questions |

### B. Related Documents

- Technical Architecture Document (TBD)
- API Documentation (TBD)
- Security & Compliance Policy (TBD)
- User Guide (TBD)

### C. Open Questions (Resolved)

| # | Question | Decision |
|---|----------|----------|
| 1 | Pricing Finalization | See PRICING.md for placeholder pricing |
| 2 | Trial Duration | **14 days** |
| 3 | API Access | **Enterprise only** |
| 4 | Data Retention | **Keep forever** - downgrade restricts features, not data |
| 5 | Multi-Company Users | **One user = one company** |

### D. Open Questions (Pending)

*All questions resolved.*

### D.1 Resolved: Associations

**What it is:** An Association is an industry consortium (e.g., "P&P-VIS" for Paper & Packaging) that defines standard questionnaire bundles for its members.

**Current state:** 1 association ("Single Portal" = P&P-VIS) with 21 stacks and standard tags (HQ 2.0.1, Food Contact, PIDSL, etc.)

**Data model (already exists):**
```
Association
    └── has Stacks (question bundles)
         └── has Tags → Questions
    └── has Member Companies (via association_companies)
```

**Decisions:**

| Question | Decision |
|----------|----------|
| Who creates associations? | Both Stacks Data (curated) and self-service (enterprise) |
| Who manages association questions? | Both Stacks Data and association admins |
| MVP or future? | **MVP** - lightweight implementation |

**Implementation (UI-focused):**
- Association management page (super admin + association admin role)
- Company "join association" flow
- Filter available tags by association membership when creating requests

### D.2 Resolved: Questionnaire Versioning

**Decision:** Snapshot model with configurable behavior

**Architecture:**
- `sheet_questions` stores a snapshot of question content at time of assignment
- Sheets track `question_version` at time of creation
- Behavior is configurable per customer via settings

**Customer Settings:**
| Setting | Options | Default |
|---------|---------|---------|
| Apply question updates to in-progress sheets | Yes / No | Yes |
| Auto-request re-certification on question changes | Yes / No | Yes |

**Behavior:**
- **In-progress sheets:** If setting = Yes, supplier sees updated questions. If No, sees frozen version from assignment.
- **Submitted/approved sheets:** If setting = Yes, system flags for re-certification when questions change. If No, historical record preserved as-is.

### E. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-25 | Product Team | Initial PRD creation |

---

*This document is a living artifact and will be updated as product requirements evolve.*
