import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getSignedImageUrls } from './api'

const SIGNED_URL_STALE_TIME = 50 * 60 * 1000

export function useSignedImageUrls(paths: (string | null | undefined)[]) {
  const uniquePaths = useMemo(
    () => Array.from(new Set(paths.filter((path): path is string => Boolean(path)))).sort(),
    [paths],
  )

  const query = useQuery({
    queryKey: queryKeys.signedUrls(uniquePaths),
    queryFn: () => getSignedImageUrls(uniquePaths),
    enabled: uniquePaths.length > 0,
    staleTime: SIGNED_URL_STALE_TIME,
    gcTime: SIGNED_URL_STALE_TIME + 5 * 60 * 1000,
  })

  return {
    urls: query.data ?? {},
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
