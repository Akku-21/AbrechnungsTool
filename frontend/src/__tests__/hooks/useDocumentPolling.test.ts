import { renderHook, act } from '@testing-library/react'
import { useDocumentPolling } from '@/hooks/useDocumentPolling'
import { POLLING_INTERVAL_MS } from '@/lib/constants'

describe('useDocumentPolling', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns hasProcessingDocs as false when no documents', () => {
    const refetch = jest.fn()
    const { result } = renderHook(() => useDocumentPolling(undefined, [refetch]))

    expect(result.current.hasProcessingDocs).toBe(false)
  })

  it('returns hasProcessingDocs as false when documents array is empty', () => {
    const refetch = jest.fn()
    const { result } = renderHook(() => useDocumentPolling([], [refetch]))

    expect(result.current.hasProcessingDocs).toBe(false)
  })

  it('returns hasProcessingDocs as false when no documents are processing', () => {
    const refetch = jest.fn()
    const documents = [
      { document_status: 'PENDING' },
      { document_status: 'PROCESSED' },
      { document_status: 'FAILED' },
    ]
    const { result } = renderHook(() => useDocumentPolling(documents, [refetch]))

    expect(result.current.hasProcessingDocs).toBe(false)
  })

  it('returns hasProcessingDocs as true when a document is processing', () => {
    const refetch = jest.fn()
    const documents = [
      { document_status: 'PENDING' },
      { document_status: 'PROCESSING' },
      { document_status: 'PROCESSED' },
    ]
    const { result } = renderHook(() => useDocumentPolling(documents, [refetch]))

    expect(result.current.hasProcessingDocs).toBe(true)
  })

  it('does not start polling when no documents are processing', () => {
    const refetch = jest.fn()
    const documents = [{ document_status: 'PROCESSED' }]

    renderHook(() => useDocumentPolling(documents, [refetch]))

    act(() => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS * 3)
    })

    expect(refetch).not.toHaveBeenCalled()
  })

  it('starts polling when documents are processing', () => {
    const refetch = jest.fn()
    const documents = [{ document_status: 'PROCESSING' }]

    renderHook(() => useDocumentPolling(documents, [refetch]))

    expect(refetch).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS)
    })

    expect(refetch).toHaveBeenCalledTimes(1)

    act(() => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS)
    })

    expect(refetch).toHaveBeenCalledTimes(2)
  })

  it('calls all refetch functions', () => {
    const refetch1 = jest.fn()
    const refetch2 = jest.fn()
    const refetch3 = jest.fn()
    const documents = [{ document_status: 'PROCESSING' }]

    renderHook(() => useDocumentPolling(documents, [refetch1, refetch2, refetch3]))

    act(() => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS)
    })

    expect(refetch1).toHaveBeenCalledTimes(1)
    expect(refetch2).toHaveBeenCalledTimes(1)
    expect(refetch3).toHaveBeenCalledTimes(1)
  })

  it('stops polling when documents stop processing', () => {
    const refetch = jest.fn()
    let documents = [{ document_status: 'PROCESSING' }]

    const { rerender } = renderHook(
      ({ docs }) => useDocumentPolling(docs, [refetch]),
      { initialProps: { docs: documents } }
    )

    act(() => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS)
    })

    expect(refetch).toHaveBeenCalledTimes(1)

    // Update to processed status
    documents = [{ document_status: 'PROCESSED' }]
    rerender({ docs: documents })

    act(() => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS * 3)
    })

    // Should not have been called again
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('starts polling when document starts processing', () => {
    const refetch = jest.fn()
    let documents = [{ document_status: 'PENDING' }]

    const { rerender } = renderHook(
      ({ docs }) => useDocumentPolling(docs, [refetch]),
      { initialProps: { docs: documents } }
    )

    act(() => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS)
    })

    expect(refetch).not.toHaveBeenCalled()

    // Update to processing status
    documents = [{ document_status: 'PROCESSING' }]
    rerender({ docs: documents })

    act(() => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS)
    })

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('cleans up interval on unmount', () => {
    const refetch = jest.fn()
    const documents = [{ document_status: 'PROCESSING' }]

    const { unmount } = renderHook(() => useDocumentPolling(documents, [refetch]))

    act(() => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS)
    })

    expect(refetch).toHaveBeenCalledTimes(1)

    unmount()

    act(() => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS * 3)
    })

    // Should not have been called after unmount
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('handles empty refetch array', () => {
    const documents = [{ document_status: 'PROCESSING' }]

    expect(() => {
      const { result } = renderHook(() => useDocumentPolling(documents, []))

      act(() => {
        jest.advanceTimersByTime(POLLING_INTERVAL_MS)
      })

      expect(result.current.hasProcessingDocs).toBe(true)
    }).not.toThrow()
  })

  it('uses correct polling interval from constants', () => {
    const refetch = jest.fn()
    const documents = [{ document_status: 'PROCESSING' }]

    renderHook(() => useDocumentPolling(documents, [refetch]))

    // Should not have polled before interval
    act(() => {
      jest.advanceTimersByTime(POLLING_INTERVAL_MS - 100)
    })
    expect(refetch).not.toHaveBeenCalled()

    // Should poll after interval
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
