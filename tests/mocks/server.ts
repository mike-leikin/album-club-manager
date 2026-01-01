import { setupServer } from 'msw/node'
import { supabaseHandlers } from './handlers/supabase'
import { resendHandlers } from './handlers/resend'

export const server = setupServer(...supabaseHandlers, ...resendHandlers)
