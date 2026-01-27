import { supabase } from './src/migration/supabase-client.js'

/**
 * Demo Data Seed Script
 *
 * Creates a clean, working demo environment with:
 * - 2 companies (1 customer, 1 supplier)
 * - 2 users (1 from each company)
 * - 1 association with 1 stack
 * - 3 sections with realistic questions
 * - 1 sheet assigned from customer to supplier
 * - Various statuses to demonstrate workflow
 */

async function seedDemoData() {
  console.log('=== Seeding Demo Data ===\n')

  // 1. Create demo companies
  console.log('1. Creating demo companies...')

  const { data: customer, error: customerError } = await supabase
    .from('companies')
    .insert({
      name: 'Acme Manufacturing Corp',
      location_text: 'Chicago, IL, USA',
      bubble_id: 'demo_customer_1'
    })
    .select()
    .single()

  if (customerError) {
    console.error('Error creating customer:', customerError)
    return
  }
  console.log('  ✅ Customer created:', customer.name)

  const { data: supplier, error: supplierError } = await supabase
    .from('companies')
    .insert({
      name: 'Premium Polymers Inc',
      location_text: 'Frankfurt, Germany',
      bubble_id: 'demo_supplier_1'
    })
    .select()
    .single()

  if (supplierError) {
    console.error('Error creating supplier:', supplierError)
    return
  }
  console.log('  ✅ Supplier created:', supplier.name)

  // 2. Create demo users
  console.log('\n2. Creating demo users...')

  // Create auth users first
  const { data: customerAuthUser, error: customerAuthError } = await supabase.auth.admin.createUser({
    email: 'sarah.johnson@acme.com',
    password: 'demo1234',
    email_confirm: true,
    user_metadata: {
      full_name: 'Sarah Johnson'
    }
  })

  if (customerAuthError) {
    console.error('Error creating customer auth user:', customerAuthError)
    return
  }

  const { data: supplierAuthUser, error: supplierAuthError } = await supabase.auth.admin.createUser({
    email: 'thomas.mueller@premiumpolymers.com',
    password: 'demo1234',
    email_confirm: true,
    user_metadata: {
      full_name: 'Thomas Mueller'
    }
  })

  if (supplierAuthError) {
    console.error('Error creating supplier auth user:', supplierAuthError)
    return
  }

  // Create user records in users table
  const { data: customerUser, error: customerUserError } = await supabase
    .from('users')
    .insert({
      id: customerAuthUser.user!.id,
      email: 'sarah.johnson@acme.com',
      full_name: 'Sarah Johnson',
      company_id: customer.id,
      role: 'user',
      bubble_id: 'demo_user_customer_1'
    })
    .select()
    .single()

  if (customerUserError) {
    console.error('Error creating customer user record:', customerUserError)
    return
  }
  console.log('  ✅ Customer user created:', customerUser.email)

  const { data: supplierUser, error: supplierUserError } = await supabase
    .from('users')
    .insert({
      id: supplierAuthUser.user!.id,
      email: 'thomas.mueller@premiumpolymers.com',
      full_name: 'Thomas Mueller',
      company_id: supplier.id,
      role: 'user',
      bubble_id: 'demo_user_supplier_1'
    })
    .select()
    .single()

  if (supplierUserError) {
    console.error('Error creating supplier user record:', supplierUserError)
    return
  }
  console.log('  ✅ Supplier user created:', supplierUser.email)

  // 3. Create association and stack
  console.log('\n3. Creating association and stack...')

  const { data: association, error: associationError } = await supabase
    .from('associations')
    .insert({
      name: 'Product Qualification',
      bubble_id: 'demo_association_1'
    })
    .select()
    .single()

  if (associationError) {
    console.error('Error creating association:', associationError)
    return
  }
  console.log('  ✅ Association created:', association.name)

  const { data: stack, error: stackError } = await supabase
    .from('stacks')
    .insert({
      name: 'Supplier Qualification Questionnaire',
      parent_association_id: association.id,
      bubble_id: 'demo_stack_1'
    })
    .select()
    .single()

  if (stackError) {
    console.error('Error creating stack:', stackError)
    return
  }
  console.log('  ✅ Stack created:', stack.name)

  // 4. Create sections
  console.log('\n4. Creating sections...')

  const sections = [
    {
      name: 'Company Information',
      order_number: 1,
      help: 'Basic information about your company and operations',
      parent_association_id: association.id,
      parent_stack_id: stack.id,
      bubble_id: 'demo_section_1'
    },
    {
      name: 'Product Composition',
      order_number: 2,
      help: 'Details about the chemical composition of your products',
      parent_association_id: association.id,
      parent_stack_id: stack.id,
      bubble_id: 'demo_section_2'
    },
    {
      name: 'Compliance & Certifications',
      order_number: 3,
      help: 'Regulatory compliance and quality certifications',
      parent_association_id: association.id,
      parent_stack_id: stack.id,
      bubble_id: 'demo_section_3'
    }
  ]

  const { data: createdSections, error: sectionsError } = await supabase
    .from('sections')
    .insert(sections)
    .select()

  if (sectionsError) {
    console.error('Error creating sections:', sectionsError)
    return
  }
  console.log(`  ✅ Created ${createdSections.length} sections`)

  // 5. Create subsections and questions
  console.log('\n5. Creating subsections and questions...')

  // Section 1: Company Information
  const { data: subsection1_1, error: sub1_1Error } = await supabase
    .from('subsections')
    .insert({
      name: 'General Information',
      order_number: 1,
      parent_section_id: createdSections[0].id,
      bubble_id: 'demo_subsection_1_1'
    })
    .select()
    .single()

  const questions1_1 = [
    {
      name: 'Company Name',
      content: 'What is the legal name of your company?',
      question_type: 'text',
      required: true,
      order_number: 1,
      parent_section_id: createdSections[0].id,
      parent_subsection_id: subsection1_1.id,
      bubble_id: 'demo_q_1_1_1'
    },
    {
      name: 'Manufacturing Location',
      content: 'Where is your primary manufacturing facility located?',
      question_type: 'text_area',
      required: true,
      order_number: 2,
      parent_section_id: createdSections[0].id,
      parent_subsection_id: subsection1_1.id,
      bubble_id: 'demo_q_1_1_2'
    },
    {
      name: 'Years in Business',
      content: 'How many years has your company been in operation?',
      question_type: 'number',
      required: true,
      order_number: 3,
      parent_section_id: createdSections[0].id,
      parent_subsection_id: subsection1_1.id,
      bubble_id: 'demo_q_1_1_3'
    }
  ]

  // Section 2: Product Composition
  const { data: subsection2_1, error: sub2_1Error } = await supabase
    .from('subsections')
    .insert({
      name: 'Chemical Composition',
      order_number: 1,
      parent_section_id: createdSections[1].id,
      bubble_id: 'demo_subsection_2_1'
    })
    .select()
    .single()

  const questions2_1 = [
    {
      name: 'Contains PFAS',
      content: 'Does your product contain any PFAS (Per- and Polyfluoroalkyl Substances)?',
      question_type: 'boolean',
      required: true,
      order_number: 1,
      parent_section_id: createdSections[1].id,
      parent_subsection_id: subsection2_1.id,
      bubble_id: 'demo_q_2_1_1'
    },
    {
      name: 'REACH Compliance',
      content: 'Is your product compliant with EU REACH regulations?',
      question_type: 'single_choice',
      required: true,
      order_number: 2,
      parent_section_id: createdSections[1].id,
      parent_subsection_id: subsection2_1.id,
      bubble_id: 'demo_q_2_1_2'
    },
    {
      name: 'Material Safety Data Sheet',
      content: 'Please upload your Material Safety Data Sheet (MSDS)',
      question_type: 'file_upload',
      required: true,
      order_number: 3,
      parent_section_id: createdSections[1].id,
      parent_subsection_id: subsection2_1.id,
      bubble_id: 'demo_q_2_1_3'
    }
  ]

  // Section 3: Compliance
  const { data: subsection3_1, error: sub3_1Error } = await supabase
    .from('subsections')
    .insert({
      name: 'Certifications',
      order_number: 1,
      parent_section_id: createdSections[2].id,
      bubble_id: 'demo_subsection_3_1'
    })
    .select()
    .single()

  const questions3_1 = [
    {
      name: 'ISO Certifications',
      content: 'Which ISO certifications does your company hold? (Select all that apply)',
      question_type: 'multiple_choice',
      required: false,
      order_number: 1,
      parent_section_id: createdSections[2].id,
      parent_subsection_id: subsection3_1.id,
      bubble_id: 'demo_q_3_1_1'
    },
    {
      name: 'Certification Expiry Date',
      content: 'When do your primary certifications expire?',
      question_type: 'date',
      required: false,
      order_number: 2,
      parent_section_id: createdSections[2].id,
      parent_subsection_id: subsection3_1.id,
      bubble_id: 'demo_q_3_1_2'
    }
  ]

  // Insert all questions
  const allQuestions = [...questions1_1, ...questions2_1, ...questions3_1]
  const { data: createdQuestions, error: questionsError } = await supabase
    .from('questions')
    .insert(allQuestions)
    .select()

  if (questionsError) {
    console.error('Error creating questions:', questionsError)
    return
  }
  console.log(`  ✅ Created ${createdQuestions.length} questions`)

  // 6. Create choices for single/multiple choice questions
  console.log('\n6. Creating answer choices...')

  const reachQuestion = createdQuestions.find(q => q.bubble_id === 'demo_q_2_1_2')
  const isoQuestion = createdQuestions.find(q => q.bubble_id === 'demo_q_3_1_1')

  const choices = [
    // REACH choices
    { content: 'Fully Compliant', order_number: 1, parent_question_id: reachQuestion?.id },
    { content: 'Partially Compliant', order_number: 2, parent_question_id: reachQuestion?.id },
    { content: 'Not Compliant', order_number: 3, parent_question_id: reachQuestion?.id },
    { content: 'Not Applicable', order_number: 4, parent_question_id: reachQuestion?.id },
    // ISO choices
    { content: 'ISO 9001 (Quality Management)', order_number: 1, parent_question_id: isoQuestion?.id },
    { content: 'ISO 14001 (Environmental Management)', order_number: 2, parent_question_id: isoQuestion?.id },
    { content: 'ISO 45001 (Occupational Health & Safety)', order_number: 3, parent_question_id: isoQuestion?.id },
    { content: 'ISO 50001 (Energy Management)', order_number: 4, parent_question_id: isoQuestion?.id }
  ]

  const { data: createdChoices, error: choicesError } = await supabase
    .from('choices')
    .insert(choices)
    .select()

  if (choicesError) {
    console.error('Error creating choices:', choicesError)
    return
  }
  console.log(`  ✅ Created ${createdChoices.length} answer choices`)

  // 7. Create demo sheets with different statuses
  console.log('\n7. Creating demo sheets...')

  const sheets = [
    {
      name: 'Premium Polymers - Hydrocarbon Resin',
      company_id: customer.id,
      assigned_to_company_id: supplier.id,
      parent_stack_id: stack.id,
      new_status: 'in_progress',
      bubble_id: 'demo_sheet_1'
    },
    {
      name: 'Premium Polymers - Polyethylene Additive',
      company_id: customer.id,
      assigned_to_company_id: supplier.id,
      parent_stack_id: stack.id,
      new_status: 'submitted',
      bubble_id: 'demo_sheet_2'
    },
    {
      name: 'Premium Polymers - Antioxidant Package',
      company_id: customer.id,
      assigned_to_company_id: supplier.id,
      parent_stack_id: stack.id,
      new_status: 'approved',
      bubble_id: 'demo_sheet_3'
    }
  ]

  const { data: createdSheets, error: sheetsError } = await supabase
    .from('sheets')
    .insert(sheets)
    .select()

  if (sheetsError) {
    console.error('Error creating sheets:', sheetsError)
    return
  }
  console.log(`  ✅ Created ${createdSheets.length} sheets`)

  // 8. Add some sample answers to show progress
  console.log('\n8. Creating sample answers...')

  const inProgressSheet = createdSheets.find(s => s.new_status === 'in_progress')
  const companyNameQ = createdQuestions.find(q => q.bubble_id === 'demo_q_1_1_1')
  const yearsInBusinessQ = createdQuestions.find(q => q.bubble_id === 'demo_q_1_1_3')

  const sampleAnswers = [
    {
      parent_question_id: companyNameQ?.id,
      parent_sheet_id: inProgressSheet?.id,
      text_value: 'Premium Polymers Inc',
    },
    {
      parent_question_id: yearsInBusinessQ?.id,
      parent_sheet_id: inProgressSheet?.id,
      number_value: 25,
    }
  ]

  const { data: createdAnswers, error: answersError } = await supabase
    .from('answers')
    .insert(sampleAnswers)
    .select()

  if (answersError) {
    console.error('Error creating answers:', answersError)
    return
  }
  console.log(`  ✅ Created ${createdAnswers.length} sample answers`)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ Demo Data Seeded Successfully!')
  console.log('='.repeat(60))
  console.log('\nDemo Credentials:')
  console.log('  Customer (Acme Manufacturing):')
  console.log('    Email: sarah.johnson@acme.com')
  console.log('    Password: demo1234')
  console.log('\n  Supplier (Premium Polymers):')
  console.log('    Email: thomas.mueller@premiumpolymers.com')
  console.log('    Password: demo1234')
  console.log('\nDemo Data Summary:')
  console.log(`  - 2 companies`)
  console.log(`  - 2 users`)
  console.log(`  - 1 association with 1 stack`)
  console.log(`  - 3 sections with 3 subsections`)
  console.log(`  - ${createdQuestions.length} questions`)
  console.log(`  - ${createdChoices.length} answer choices`)
  console.log(`  - 3 sheets (1 in_progress, 1 submitted, 1 approved)`)
  console.log(`  - ${createdAnswers.length} sample answers`)
  console.log('\n' + '='.repeat(60))
}

seedDemoData().catch(console.error)
