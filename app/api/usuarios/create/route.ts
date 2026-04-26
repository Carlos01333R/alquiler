
import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, nombre, rol, empresa_id } = body

    if (!email || !password || !empresa_id) {
      return NextResponse.json(
        { error: "Email, contraseña y empresa_id son obligatorios" },
        { status: 400 }
      )
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, 
      })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "No se pudo crear el usuario en Auth" },
        { status: 500 }
      )
    }

    const { error: profileError } = await supabaseAdmin
      .from("usuarios")
      .insert({
        id: authData.user.id,
        empresa_id,
        nombre,
        email,
        rol,
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}