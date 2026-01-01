import {
  createMockParticipant,
  createMockCurator,
} from '../factories/participantFactory'

export const mockParticipants = [
  createMockCurator({
    id: 'curator-1',
    name: 'Mike Leikin',
    email: 'mike@test.com',
  }),
  createMockParticipant({
    id: 'participant-1',
    name: 'John Doe',
    email: 'john@test.com',
  }),
  createMockParticipant({
    id: 'participant-2',
    name: 'Jane Smith',
    email: 'jane@test.com',
  }),
]
