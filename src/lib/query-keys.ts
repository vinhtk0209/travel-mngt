export const queryKeys = {
  profile: (userId: string | undefined) => ['profile', userId] as const,
  myInvitations: ['invitations', 'mine'] as const,
  trips: ['trips'] as const,
  trip: (tripId: string | undefined) => ['trip', tripId] as const,
  tripMembers: (tripId: string | undefined) => ['trip', tripId, 'members'] as const,
  tripInvitations: (tripId: string | undefined) => ['trip', tripId, 'invitations'] as const,
  tripItems: (tripId: string | undefined) => ['trip', tripId, 'items'] as const,
  tripTags: (tripId: string | undefined) => ['trip', tripId, 'tags'] as const,
  tripImages: (tripId: string | undefined) => ['trip', tripId, 'images'] as const,
  tripAssistantPreference: (tripId: string | undefined) =>
    ['trip', tripId, 'assistant-preference'] as const,
  tripMessages: (tripId: string | undefined) => ['trip', tripId, 'messages'] as const,
  sharedTrip: (token: string | undefined) => ['share', token] as const,
  avatarUrls: (paths: string[]) => ['avatar-urls', ...paths] as const,
  signedUrls: (paths: string[]) => ['signed-urls', ...paths] as const,
}
