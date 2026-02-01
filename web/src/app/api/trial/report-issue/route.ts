import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { title, description, email } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Store the issue in trial_issues table
    const { data: issue, error: insertError } = await supabase
      .from("trial_issues")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        reporter_email: email?.trim() || null,
        status: "open",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("Failed to insert issue:", insertError)
    }

    // Notify via Telegram
    const notifyText = `🐛 *New Trial Issue*\n\n*Title:* ${title}\n${description ? `*Details:* ${description}\n` : ""}${email ? `*Reporter:* ${email}` : "_No email provided_"}`

    try {
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: notifyText,
            parse_mode: "Markdown",
          }),
        })
      }
    } catch (notifyError) {
      console.error("Failed to send notification:", notifyError)
    }

    return NextResponse.json({ success: true, issueId: issue?.id })
  } catch (error) {
    console.error("Error in report-issue:", error)
    return NextResponse.json({ error: "Failed to submit issue" }, { status: 500 })
  }
}
