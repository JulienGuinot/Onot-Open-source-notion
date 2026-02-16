import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key'

let supabase: any

try {
    supabase = createClient(supabaseUrl, supabaseKey)
} catch (error) {
    console.warn('Supabase initialization warning: Environment variables may not be set correctly')
    supabase = null
}

export default supabase

