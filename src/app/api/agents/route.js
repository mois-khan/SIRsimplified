import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function POST(request) {
  try {
    const { name, pin, action } = await request.json();

    if (!name || !pin || pin.length !== 4) {
      return NextResponse.json({ error: "Invalid name or 4-digit PIN" }, { status: 400 });
    }

    const formattedName = name.trim().toUpperCase();

    if (action === "register") {
      // Check if exists
      const { data: existing } = await supabase.from("agents").select("id").eq("name", formattedName).maybeSingle();
      if (existing) {
        return NextResponse.json({ error: "Agent name already exists. Please login." }, { status: 400 });
      }

      const { data, error } = await supabase.from("agents").insert([{ name: formattedName, pin }]).select();
      if (error) throw error;
      return NextResponse.json({ success: true, agent: data[0] });

    } else if (action === "login") {
      const { data: agent, error } = await supabase.from("agents").select("*").eq("name", formattedName).eq("pin", pin).maybeSingle();
      if (error || !agent) {
        return NextResponse.json({ error: "Invalid name or PIN." }, { status: 401 });
      }
      return NextResponse.json({ success: true, agent });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Agent API error:", error);
    return NextResponse.json({ error: "Server error or table not created yet." }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, agents: data });
  } catch (error) {
    console.error("Fetch agents error:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}
