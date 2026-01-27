import { createClient } from "@/lib/supabase/server"
import { SimpleSheetEditor } from "./simple-editor"

// Standard HQ section IDs - only these should be shown
const HQ_SECTION_IDS = [
  "e642dcaa-a3af-4535-9cba-b51e68f3813b", // Product Information (section_sort_number: 1)
  "552794d4-17d5-4228-8713-0fc11ff266d6", // Ecolabels (section_sort_number: 2)
  "37aed84e-c334-4f49-9538-6289b3645b50", // Biocides (section_sort_number: 3)
  "2dcf4218-d7d9-48c2-b17e-23da10f994ac", // Food Contact Compliance (section_sort_number: 4)
  "4dcc094b-d1d2-4ad5-84e5-eb59fb3d0a83", // PIDSL (section_sort_number: 5)
  "1f24e929-8291-4b96-9655-4f16d0d42d72", // Additional Requirements (section_sort_number: 6)
]

// Valid section_sort_numbers for HQ (1-6)
const VALID_SECTION_SORT_NUMBERS = [1, 2, 3, 4, 5, 6]

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

  // Fetch all answers from the view
  const { data: answers } = await supabase
    .from("sheet_answers_display")
    .select("*")
    .eq("sheet_id", sheetId)
    .order("section_sort_number")
    .order("subsection_sort_number")
    .order("question_order")

  // Fetch choices for dropdown questions
  const { data: choices } = await supabase
    .from("choices")
    .select("id, content, parent_question_id")
    .order("order_number")

  // Fetch questions with their section/subsection names via joins
  const { data: questionsWithSections } = await supabase
    .from("questions")
    .select(`
      id,
      subsection_id,
      section_sort_number,
      subsection_sort_number,
      subsections!inner(
        id,
        name,
        section_id,
        sections!inner(
          id,
          name
        )
      )
    `)

  // Build lookup map from question_id to section/subsection names
  // Only include questions from standard HQ sections
  const questionSectionMap: Record<string, { sectionName: string; subsectionName: string; sectionId: string }> = {}
  const validQuestionIds = new Set<string>()
  
  questionsWithSections?.forEach((q: any) => {
    if (q.subsections?.sections) {
      const sectionId = q.subsections.sections.id
      // Only include if it's a standard HQ section
      if (HQ_SECTION_IDS.includes(sectionId)) {
        questionSectionMap[q.id] = {
          sectionName: q.subsections.sections.name || "",
          subsectionName: q.subsections.name || "",
          sectionId: sectionId
        }
        validQuestionIds.add(q.id)
      }
    }
  })

  // Filter answers:
  // 1. Only include questions from standard HQ sections
  // 2. Only include valid section_sort_numbers (1-6)
  // 3. Exclude null section_sort_numbers
  const filteredAnswers = answers?.filter(a => 
    validQuestionIds.has(a.question_id) &&
    a.section_sort_number !== null &&
    VALID_SECTION_SORT_NUMBERS.includes(a.section_sort_number)
  ) || []

  const companyName = (sheet as any).companies?.name || "Unknown"

  return (
    <SimpleSheetEditor
      sheetId={sheetId}
      sheetName={sheet.name}
      sheetStatus={sheet.status}
      companyName={companyName}
      answers={filteredAnswers}
      choices={choices || []}
      questionSectionMap={questionSectionMap}
    />
  )
}
