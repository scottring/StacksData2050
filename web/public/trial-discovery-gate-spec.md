# Trial Discovery Questions - Splash Screen Gate

## 🎯 **Implementation Strategy**

### **User Flow:**
1. **User clicks trial invitation link** → Lands on discovery splash screen
2. **Completes 5 discovery questions** → Responses saved to database  
3. **Redirects to sign in/up** → Normal trial access granted
4. **Friday follow-up** → Additional questions based on trial usage

## 🔧 **Technical Implementation**

### **New Route: `/trial/discovery`**
**Purpose:** Pre-trial discovery question gate
**Database:** `trial_discovery_responses` table

### **Database Schema:**
```sql
CREATE TABLE trial_discovery_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  company_name varchar(255),
  responded_at timestamp DEFAULT now(),
  
  -- Discovery Questions
  motivation_interest text,
  learning_goals text, 
  success_definition text,
  impact_measurement text,
  concerns_questions text,
  
  -- Tracking
  trial_started_at timestamp,
  trial_completed_at timestamp,
  follow_up_sent_at timestamp,
  follow_up_responded_at timestamp,
  
  -- Follow-up Questions (Friday)
  platform_experience text,
  biggest_surprise text,
  remaining_questions text,
  likelihood_to_recommend integer,
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

### **Component Structure:**
```
/trial/discovery/page.tsx
├── DiscoveryForm component
├── Question components (5 questions)
├── Progress indicator
├── Form validation
└── Success redirect
```

## 📱 **Discovery Splash Screen Design**

### **Header:**
```
🚀 Welcome to the Stacks Data Trial!
Before you explore the ultra-modern platform, help us tailor your experience...
```

### **The 5 Questions:**
1. **What makes you interested in trying this trial and participating in it?**
   - `<textarea>` - 3-4 lines
   
2. **What do you hope to learn from your participation in this trial?**
   - `<textarea>` - 3-4 lines
   
3. **What would you consider to be a successful outcome of this trial for your organization?**
   - `<textarea>` - 3-4 lines
   
4. **How would you know if this platform could meaningfully impact your work?**
   - `<textarea>` - 3-4 lines
   
5. **What questions or concerns do you have going into this trial?**
   - `<textarea>` - 3-4 lines

### **Form Elements:**
- **Email input** (required for tracking)
- **Company name** (optional, for personalization)
- **Submit button:** "Start My Trial Experience"
- **Progress bar** showing completion
- **Character counters** on textareas

## 📊 **Tracking & Analytics**

### **Admin Dashboard View:**
```
Trial Discovery Responses Dashboard
===================================

Total Responses: 12/15 invited
Response Rate: 80%
Avg Response Length: 127 words

[Export CSV] [Send Follow-ups] [View Individual Responses]

┌─────────────────┬──────────────┬─────────────┬─────────────┐
│ Company         │ Responded    │ Trial Start │ Status      │
├─────────────────┼──────────────┼─────────────┼─────────────┤
│ Solenis         │ ✅ Feb 1     │ ✅ Feb 2    │ Active      │
│ Omya            │ ✅ Feb 1     │ ⏳ Pending  │ Not Started │
│ P&P VIS Admin   │ ❌ No        │ ❌ No       │ No Response │
└─────────────────┴──────────────┴─────────────┴─────────────┘
```

### **Key Metrics:**
- **Response completion rate**
- **Average response length**  
- **Time from discovery to trial start**
- **Common themes in responses**

## 🎯 **Friday Follow-up Questions**

### **Trigger:** Friday (Feb 7) automated email to trial participants
### **Additional Questions:**

6. **How has your experience with the platform been so far?**
7. **What's been the biggest surprise (positive or negative) during your trial?**
8. **What questions do you still have after using the platform?**
9. **On a scale of 1-10, how likely would you be to recommend this trial to a colleague?**

### **Follow-up Email Template:**
```
Subject: Quick follow-up on your Stacks Data trial experience

Hi [NAME],

Hope your trial experience has been valuable! A few quick follow-up questions based on your usage:

[4 follow-up questions with simple form or email response]

Your initial responses were really helpful - these follow-ups help me understand how reality compared to expectations.

Best,
Scott
```

## 🔄 **Implementation Priority**

### **Phase 1 (Today/Tomorrow):**
- Create `/trial/discovery` route
- Build discovery form component
- Set up database table
- Implement response tracking

### **Phase 2 (This Week):**
- Admin dashboard for viewing responses
- Friday follow-up email automation
- Response analytics and theming

### **Phase 3 (Post-Trial):**
- Response analysis and insights
- Template improvements based on learnings
- Scale for future trials

## ✅ **Benefits of This Approach**

1. **100% response rate** (gated access ensures completion)
2. **Immediate insights** (before they form trial opinions)
3. **Baseline expectations** (compare to post-trial reality)
4. **Trackable engagement** (who responds, who actually trials)
5. **Personalized follow-ups** (reference their specific responses)
6. **Friday comparison** (expectations vs. reality insights)

**This turns your trial invitation into a structured customer research program with before/after insights.** 🎯