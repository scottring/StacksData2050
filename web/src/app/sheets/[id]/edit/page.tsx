import { createClient } from "@/lib/supabase/server"
import { SimpleSheetEditor } from "./simple-editor"

export default async function SheetEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: sheetId } = await params
  const supabase = await createClient()

  // Fetch sheet info
  const { data: sheet } = await supabase
    .from("sheets")
    .select("id, name, status, company_id, companies!sheets_company_id_fkey(name)")
    .eq("id", sheetId)
    .single()

  if (!sheet) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">Sheet Not Found</h1>
        <p className="text-muted-foreground">The requested sheet could not be found.</p>
      </div>
    )
  }

  // === Fetch the sheet's tags ===
  const { data: sheetTags } = await supabase
    .from("sheet_tags")
    .select("tag_id")
    .eq("sheet_id", sheetId)

  const tagIds = sheetTags?.map(st => st.tag_id) || []

  // === If sheet has tags, get questions with those tags ===
  let taggedQuestionIds: string[] = []
  if (tagIds.length > 0) {
    const { data: questionTags } = await supabase
      .from("question_tags")
      .select("question_id")
      .in("tag_id", tagIds)
    
    taggedQuestionIds = [...new Set(questionTags?.map(qt => qt.question_id) || [])]
  }

  // Fetch all answers from the view
  const { data: answers, error: answersError } = await supabase
    .from("sheet_answers_display")
    .select("*")
    .eq("sheet_id", sheetId)

  // Fetch choices for dropdown questions (for branching (disabled))
  const { data: choices } = await supabase
    .from("choices")
    .select("id, content, question_id")
    .order("order_number")

  // Fetch ALL list_table_columns (linked via question_id)
  const { data: listTableColumns } = await supabase
    .from("list_table_columns")
    .select("id, name, order_number, question_id, response_type, choice_options")
    .not("question_id", "is", null)
    .order("question_id")
    .order("order_number")

  // === Fetch rejections if sheet is flagged ===
  let rejections: { question_id: string; rounds: { reason: string; response: string | null; created_at: string }[] }[] = []
  if (sheet.status === 'flagged') {
    // Get all answer IDs for this sheet
    const answerIds = answers?.map(a => a.id).filter(Boolean) || []
    if (answerIds.length > 0) {
      const { data: rejectionsData } = await supabase
        .from("answer_rejections")
        .select("answer_id, reason, response, created_at")
        .in("answer_id", answerIds)
        .order("created_at")
      
      // Group rejections by question_id
      if (rejectionsData) {
        const byQuestion = new Map<string, { reason: string; response: string | null; created_at: string }[]>()
        rejectionsData.forEach(r => {
          const answer = answers?.find(a => a.id === r.answer_id)
          if (answer?.question_id) {
            const existing = byQuestion.get(answer.question_id) || []
            existing.push({
              reason: r.reason || 'Revision requested',
              response: r.response || null,
              created_at: r.created_at
            })
            byQuestion.set(answer.question_id, existing)
          }
        })
        rejections = Array.from(byQuestion.entries()).map(([question_id, rounds]) => ({
          question_id,
          rounds
        }))
      }
    }
  }

  // Fetch questions with their section/subsection info + branching fields
  let questionsWithSections: any[] = []
  
  if (taggedQuestionIds.length > 0) {
    const batchSize = 50
    for (let i = 0; i < taggedQuestionIds.length; i += batchSize) {
      const batch = taggedQuestionIds.slice(i, i + batchSize)
      const { data, error } = await supabase
        .from("questions")
        .select(`
          id,
          name,
          content,
          response_type,
          section_sort_number,
          order_number,
          dependent_no_show,
          subsection_id,
          subsections(
            id,
            name,
            order_number,
            section_id,
            sections(
              id,
              name,
              order_number
            )
          )
        `)
        .in("id", batch)
      
      if (error) {
        console.error("Error fetching questions batch:", error)
      } else if (data) {
        questionsWithSections.push(...data)
      }
    }
  }

  // Build lookup map and add computed sort values
  const questionSectionMap: Record<string, { sectionName: string; subsectionName: string; sectionId: string }> = {}
  // Build branching data: for dependent questions, find their parent (previous non-dependent question)
  const branchingData: Record<string, {
    dependentNoShow: boolean
    parentQuestionId: string | null
  }> = {}

  // Group questions by subsection and sort by order_number
  const questionsBySubsection = new Map<string, any[]>()

  questionsWithSections.forEach((q: any) => {
    if (q.subsection_id) {
      if (!questionsBySubsection.has(q.subsection_id)) {
        questionsBySubsection.set(q.subsection_id, [])
      }
      questionsBySubsection.get(q.subsection_id)!.push(q)
    }
  })

  // For each subsection, link dependent questions to their immediate parent (previous non-dependent question)
  questionsBySubsection.forEach((questions) => {
    // Sort by order_number
    const sorted = questions.sort((a, b) => (a.order_number || 999) - (b.order_number || 999))

    let lastNonDependentId: string | null = null

    sorted.forEach((q) => {
      if (q.dependent_no_show) {
        // This is a dependent question - link to the last non-dependent question
        if (lastNonDependentId) {
          branchingData[q.id] = {
            dependentNoShow: true,
            parentQuestionId: lastNonDependentId
          }
        }
      } else {
        // This is a non-dependent question - update the tracker
        lastNonDependentId = q.id
      }
    })
  })


  const processedQuestions = questionsWithSections.map((q: any) => {
    const subsection = q.subsections
    const section = subsection?.sections
    
    // Get sort numbers from the hierarchy
    const sectionSortNumber = section?.order_number ?? q.section_sort_number ?? 999
    const subsectionSortNumber = subsection?.order_number ?? 999
    const questionOrder = q.order_number ?? 999
    
    if (subsection && section) {
      questionSectionMap[q.id] = {
        sectionName: section.name || "",
        subsectionName: subsection.name || "",
        sectionId: section.id || ""
      }
    }
    
    return {
      ...q,
      _sectionSort: sectionSortNumber,
      _subsectionSort: subsectionSortNumber,
      _questionOrder: questionOrder
    }
  })

  // Sort questions properly
  processedQuestions.sort((a, b) => {
    if (a._sectionSort !== b._sectionSort) return a._sectionSort - b._sectionSort
    if (a._subsectionSort !== b._subsectionSort) return a._subsectionSort - b._subsectionSort
    return a._questionOrder - b._questionOrder
  })

  // Create placeholder answers for questions that don't have answers yet
  const existingQuestionIds = new Set(answers?.map(a => a.question_id) || [])
  const placeholderAnswers = processedQuestions
    .filter((q: any) => !existingQuestionIds.has(q.id))
    .map((q: any) => ({
      id: `placeholder-${q.id}`,
      question_id: q.id,
      question_name: q.name || "",
      question_content: q.content,
      response_type: q.response_type || "text",
      section_sort_number: q._sectionSort,
      subsection_sort_number: q._subsectionSort,
      question_order: q._questionOrder,
      text_value: null,
      text_area_value: null,
      number_value: null,
      boolean_value: null,
      date_value: null,
      choice_id: null,
      choice_content: null,
      list_table_row_id: null,
      list_table_column_id: null,
      list_table_column_name: null,
      list_table_column_order: null,
      additional_notes: null,
    }))

  // Combine existing answers with placeholders
  let allAnswers = [...(answers || []), ...placeholderAnswers]
    .sort((a, b) => {
      const aSection = a.section_sort_number ?? 999
      const bSection = b.section_sort_number ?? 999
      if (aSection !== bSection) return aSection - bSection
      
      const aSubsection = a.subsection_sort_number ?? 999
      const bSubsection = b.subsection_sort_number ?? 999
      if (aSubsection !== bSubsection) return aSubsection - bSubsection
      
      const aOrder = a.question_order ?? a.order_number ?? 999
      const bOrder = b.question_order ?? b.order_number ?? 999
      return aOrder - bOrder
    })

  // If sheet is flagged, filter to only show rejected questions
  if (sheet.status === 'flagged' && rejections.length > 0) {
    const rejectedQuestionIds = new Set(rejections.map(r => r.question_id))
    allAnswers = allAnswers.filter(a => rejectedQuestionIds.has(a.question_id))
  }

  const companyName = (sheet as any).companies?.name || "Unknown"

  // === Fetch custom questions for this sheet ===
  // First, find the request associated with this sheet
  const { data: request } = await supabase
    .from("requests")
    .select("id, requestor_id")
    .eq("sheet_id", sheetId)
    .single()

  let customQuestions: any[] = []
  let customAnswers: any[] = []
  let requestingCompanyName = ""

  if (request) {
    // Fetch custom questions linked to this request
    const { data: requestCustomQuestions } = await supabase
      .from("request_custom_questions")
      .select(`
        id,
        sort_order,
        company_question_id,
        company_questions (
          id,
          company_id,
          question_text,
          response_type,
          choices,
          hint,
          required
        )
      `)
      .eq("request_id", request.id)
      .order("sort_order")

    if (requestCustomQuestions) {
      customQuestions = requestCustomQuestions
        .filter(rcq => rcq.company_questions)
        .map(rcq => ({
          id: (rcq.company_questions as any).id,
          question_text: (rcq.company_questions as any).question_text,
          response_type: (rcq.company_questions as any).response_type,
          choices: (rcq.company_questions as any).choices,
          hint: (rcq.company_questions as any).hint,
          required: (rcq.company_questions as any).required,
          sort_order: rcq.sort_order
        }))
    }

    // Fetch existing custom answers for this sheet
    const { data: existingCustomAnswers } = await supabase
      .from("custom_question_answers")
      .select("id, company_question_id, value")
      .eq("sheet_id", sheetId)

    customAnswers = existingCustomAnswers || []

    // Get the requesting company name for the header
    if (request.requestor_id) {
      const { data: requestingCompany } = await supabase
        .from("companies")
        .select("name")
        .eq("id", request.requestor_id)
        .single()
      requestingCompanyName = requestingCompany?.name || ""
    }
  }

  return (
    <SimpleSheetEditor
      sheetId={sheetId}
      sheetName={sheet.name}
      sheetStatus={sheet.status}
      companyName={companyName}
      answers={allAnswers}
      choices={choices || []}
      questionSectionMap={questionSectionMap}
      listTableColumns={listTableColumns || []}
      branchingData={branchingData}
      rejections={rejections}
      customQuestions={customQuestions}
      customAnswers={customAnswers}
      requestingCompanyName={requestingCompanyName}
    />
  )
}
