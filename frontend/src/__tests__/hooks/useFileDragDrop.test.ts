import { renderHook, act } from '@testing-library/react'
import { useFileDragDrop } from '@/hooks/useFileDragDrop'

describe('useFileDragDrop', () => {
  // Helper to create mock DragEvent
  const createMockDragEvent = (
    type: string,
    files: File[] = [],
    options: Partial<{
      currentTarget: EventTarget
      target: EventTarget
    }> = {}
  ): React.DragEvent => {
    const element = document.createElement('div')
    return {
      type,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: options.currentTarget || element,
      target: options.target || element,
      dataTransfer: {
        files: files as unknown as FileList,
      },
    } as unknown as React.DragEvent
  }

  // Helper to create mock File
  const createMockFile = (name: string): File => {
    return new File(['content'], name, { type: 'application/pdf' })
  }

  describe('initial state', () => {
    it('isDragging is false initially', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      expect(result.current.isDragging).toBe(false)
    })

    it('returns dragHandlers object', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      expect(result.current.dragHandlers).toHaveProperty('onDragEnter')
      expect(result.current.dragHandlers).toHaveProperty('onDragLeave')
      expect(result.current.dragHandlers).toHaveProperty('onDragOver')
      expect(result.current.dragHandlers).toHaveProperty('onDrop')
    })

    it('all handlers are functions', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      expect(typeof result.current.dragHandlers.onDragEnter).toBe('function')
      expect(typeof result.current.dragHandlers.onDragLeave).toBe('function')
      expect(typeof result.current.dragHandlers.onDragOver).toBe('function')
      expect(typeof result.current.dragHandlers.onDrop).toBe('function')
    })
  })

  describe('onDragEnter', () => {
    it('sets isDragging to true', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      const event = createMockDragEvent('dragenter')

      act(() => {
        result.current.dragHandlers.onDragEnter(event)
      })

      expect(result.current.isDragging).toBe(true)
    })

    it('calls preventDefault and stopPropagation', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      const event = createMockDragEvent('dragenter')

      act(() => {
        result.current.dragHandlers.onDragEnter(event)
      })

      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('onDragLeave', () => {
    it('sets isDragging to false when currentTarget equals target', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      // First set dragging to true
      const enterEvent = createMockDragEvent('dragenter')
      act(() => {
        result.current.dragHandlers.onDragEnter(enterEvent)
      })
      expect(result.current.isDragging).toBe(true)

      // Then leave
      const element = document.createElement('div')
      const leaveEvent = createMockDragEvent('dragleave', [], {
        currentTarget: element,
        target: element,
      })

      act(() => {
        result.current.dragHandlers.onDragLeave(leaveEvent)
      })

      expect(result.current.isDragging).toBe(false)
    })

    it('does not set isDragging to false when leaving child element', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      // First set dragging to true
      const enterEvent = createMockDragEvent('dragenter')
      act(() => {
        result.current.dragHandlers.onDragEnter(enterEvent)
      })
      expect(result.current.isDragging).toBe(true)

      // Leave with different target (child element)
      const container = document.createElement('div')
      const child = document.createElement('span')
      const leaveEvent = createMockDragEvent('dragleave', [], {
        currentTarget: container,
        target: child,
      })

      act(() => {
        result.current.dragHandlers.onDragLeave(leaveEvent)
      })

      // Should still be dragging because we only left a child
      expect(result.current.isDragging).toBe(true)
    })

    it('calls preventDefault and stopPropagation', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      const event = createMockDragEvent('dragleave')

      act(() => {
        result.current.dragHandlers.onDragLeave(event)
      })

      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('onDragOver', () => {
    it('calls preventDefault and stopPropagation', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      const event = createMockDragEvent('dragover')

      act(() => {
        result.current.dragHandlers.onDragOver(event)
      })

      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })

    it('does not change isDragging state', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      expect(result.current.isDragging).toBe(false)

      const event = createMockDragEvent('dragover')
      act(() => {
        result.current.dragHandlers.onDragOver(event)
      })

      expect(result.current.isDragging).toBe(false)
    })
  })

  describe('onDrop', () => {
    it('sets isDragging to false', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      // First set dragging to true
      const enterEvent = createMockDragEvent('dragenter')
      act(() => {
        result.current.dragHandlers.onDragEnter(enterEvent)
      })
      expect(result.current.isDragging).toBe(true)

      // Then drop
      const dropEvent = createMockDragEvent('drop', [createMockFile('test.pdf')])
      act(() => {
        result.current.dragHandlers.onDrop(dropEvent)
      })

      expect(result.current.isDragging).toBe(false)
    })

    it('calls onFilesDropped with files', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      const files = [createMockFile('doc1.pdf'), createMockFile('doc2.pdf')]
      const event = createMockDragEvent('drop', files)

      act(() => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onFilesDropped).toHaveBeenCalledTimes(1)
      expect(onFilesDropped).toHaveBeenCalledWith(files)
    })

    it('does not call onFilesDropped when no files', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      const event = createMockDragEvent('drop', [])

      act(() => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onFilesDropped).not.toHaveBeenCalled()
    })

    it('calls preventDefault and stopPropagation', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      const event = createMockDragEvent('drop', [createMockFile('test.pdf')])

      act(() => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('callback updates', () => {
    it('uses updated callback when it changes', () => {
      const onFilesDropped1 = jest.fn()
      const onFilesDropped2 = jest.fn()

      const { result, rerender } = renderHook(
        ({ callback }) => useFileDragDrop(callback),
        { initialProps: { callback: onFilesDropped1 } }
      )

      // Drop with first callback
      const files = [createMockFile('test.pdf')]
      let event = createMockDragEvent('drop', files)
      act(() => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onFilesDropped1).toHaveBeenCalledTimes(1)
      expect(onFilesDropped2).not.toHaveBeenCalled()

      // Update callback
      rerender({ callback: onFilesDropped2 })

      // Drop with second callback
      event = createMockDragEvent('drop', files)
      act(() => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onFilesDropped1).toHaveBeenCalledTimes(1) // Not called again
      expect(onFilesDropped2).toHaveBeenCalledTimes(1)
    })
  })

  describe('complete drag flow', () => {
    it('handles complete drag and drop flow', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      // Initial state
      expect(result.current.isDragging).toBe(false)

      // Enter drag zone
      act(() => {
        result.current.dragHandlers.onDragEnter(createMockDragEvent('dragenter'))
      })
      expect(result.current.isDragging).toBe(true)

      // Drag over
      act(() => {
        result.current.dragHandlers.onDragOver(createMockDragEvent('dragover'))
      })
      expect(result.current.isDragging).toBe(true)

      // Drop files
      const files = [createMockFile('document.pdf')]
      act(() => {
        result.current.dragHandlers.onDrop(createMockDragEvent('drop', files))
      })

      expect(result.current.isDragging).toBe(false)
      expect(onFilesDropped).toHaveBeenCalledWith(files)
    })

    it('handles drag enter, leave without drop', () => {
      const onFilesDropped = jest.fn()
      const { result } = renderHook(() => useFileDragDrop(onFilesDropped))

      // Enter drag zone
      const element = document.createElement('div')
      act(() => {
        result.current.dragHandlers.onDragEnter(createMockDragEvent('dragenter'))
      })
      expect(result.current.isDragging).toBe(true)

      // Leave drag zone
      act(() => {
        result.current.dragHandlers.onDragLeave(
          createMockDragEvent('dragleave', [], { currentTarget: element, target: element })
        )
      })
      expect(result.current.isDragging).toBe(false)

      // No files dropped
      expect(onFilesDropped).not.toHaveBeenCalled()
    })
  })
})
