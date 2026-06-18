import { defineAction } from '@agent-native/core'
import type { createPresentationsService } from '../server/services/presentations.js'
import { parsePresentationCreate, parsePresentationPatch } from '../server/validation.js'
import { z } from 'zod'

type PresentationsService = ReturnType<typeof createPresentationsService>

export function createDeckActions(presentationsService: PresentationsService) {
  return {
    'list-decks': defineAction({
      description: 'List available presentation decks.',
      schema: z.object({}),
      http: {
        method: 'GET',
        path: 'list-decks',
      },
      requiresAuth: false,
      readOnly: true,
      run: () => presentationsService.list(),
    }),

    'get-deck': defineAction({
      description: 'Get one presentation deck by id.',
      schema: z.object({
        id: z.coerce.number().int().positive(),
      }),
      http: {
        method: 'GET',
        path: 'get-deck',
      },
      requiresAuth: false,
      readOnly: true,
      run: ({ id }) => presentationsService.get(id),
    }),

    'create-deck': defineAction({
      description: 'Create a new presentation deck.',
      schema: z.object({
        name: z.string(),
        theme: z.string().optional(),
      }),
      http: {
        method: 'POST',
        path: 'create-deck',
      },
      requiresAuth: false,
      run: (input) => presentationsService.create(parsePresentationCreate(input)),
    }),

    'update-deck': defineAction({
      description: 'Update a presentation deck name or theme.',
      schema: z.object({
        id: z.coerce.number().int().positive(),
        name: z.string().optional(),
        theme: z.string().optional(),
      }),
      http: {
        method: 'PUT',
        path: 'update-deck',
      },
      requiresAuth: false,
      run: ({ id, ...patch }) => presentationsService.update(id, parsePresentationPatch(patch)),
    }),

    'delete-deck': defineAction({
      description: 'Delete a presentation deck.',
      schema: z.object({
        id: z.coerce.number().int().positive(),
      }),
      http: {
        method: 'DELETE',
        path: 'delete-deck',
      },
      requiresAuth: false,
      run: ({ id }) => {
        presentationsService.delete(id)
        return null
      },
    }),
  }
}
