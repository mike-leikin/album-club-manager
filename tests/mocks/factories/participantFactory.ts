import type { Participant } from '@/lib/types/database'

let participantIdCounter = 0

export function createMockParticipant(
  overrides?: Partial<Participant>
): Participant {
  participantIdCounter++
  return {
    id: `participant-${participantIdCounter}`,
    name: `Test User ${participantIdCounter}`,
    email: `user${participantIdCounter}@test.com`,
    auth_user_id: null,
    is_curator: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  }
}

export function createMockCurator(
  overrides?: Partial<Participant>
): Participant {
  return createMockParticipant({
    is_curator: true,
    auth_user_id: 'curator-auth-id',
    ...overrides,
  })
}

export function resetParticipantCounter() {
  participantIdCounter = 0
}
