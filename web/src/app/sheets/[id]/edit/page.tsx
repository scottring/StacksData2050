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
  const { data: answers } = await supabase
    .from("sheet_answers_display")
    .select("*")
    .eq("sheet_id", sheetId)
    .order("section_sort_number")
    .order("subsection_sort_number")
    .order("order_number")

  // Fetch choices for dropdown questions
  const { data: choices } = await supabase
    .from("choices")
    .select("id, content, question_id")
    .order("order_number")

  // Fetch ALL list_table_columns
  const { data: listTableColumns } = await supabase
    .from("list_table_columns")
    .select("id, name, order_number, parent_table_id, response_type")
    .order("parent_table_id")
    .order("order_number")

  // Fetch questions with their section/subsection info (including list_table_id)
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
          list_table_id,
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
  
  // Process questions to add proper sort values
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
      list_table_id: q.list_table_id || null,
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
    }))

  // Combine existing answers with placeholders
  const allAnswers = [...(answers || []), ...placeholderAnswers]
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

  const companyName = (sheet as any).companies?.name || "Unknown"

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
    />
  )
}
