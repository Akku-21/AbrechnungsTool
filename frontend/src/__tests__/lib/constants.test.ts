import {
  DOC_STATUS_CONFIG,
  SETTLEMENT_STATUS_CONFIG,
  ACCEPTED_FILE_TYPES,
  ACCEPTED_FILE_EXTENSIONS,
  ALLOCATION_METHOD_LABELS,
  POLLING_INTERVAL_MS,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  isValidFileType,
} from '@/lib/constants'

describe('DOC_STATUS_CONFIG', () => {
  it('has all expected status keys', () => {
    expect(DOC_STATUS_CONFIG).toHaveProperty('PENDING')
    expect(DOC_STATUS_CONFIG).toHaveProperty('PROCESSING')
    expect(DOC_STATUS_CONFIG).toHaveProperty('PROCESSED')
    expect(DOC_STATUS_CONFIG).toHaveProperty('FAILED')
    expect(DOC_STATUS_CONFIG).toHaveProperty('VERIFIED')
  })

  it('each status has label and color', () => {
    Object.values(DOC_STATUS_CONFIG).forEach((config) => {
      expect(config).toHaveProperty('label')
      expect(config).toHaveProperty('color')
      expect(typeof config.label).toBe('string')
      expect(typeof config.color).toBe('string')
    })
  })

  it('has German labels', () => {
    expect(DOC_STATUS_CONFIG.PENDING.label).toBe('Ausstehend')
    expect(DOC_STATUS_CONFIG.PROCESSING.label).toBe('Verarbeitung...')
    expect(DOC_STATUS_CONFIG.PROCESSED.label).toBe('Verarbeitet')
    expect(DOC_STATUS_CONFIG.FAILED.label).toBe('Fehlgeschlagen')
    expect(DOC_STATUS_CONFIG.VERIFIED.label).toBe('Verifiziert')
  })

  it('has valid Tailwind color classes', () => {
    Object.values(DOC_STATUS_CONFIG).forEach((config) => {
      expect(config.color).toMatch(/^text-\w+-\d+$/)
    })
  })
})

describe('SETTLEMENT_STATUS_CONFIG', () => {
  it('has all expected status keys', () => {
    expect(SETTLEMENT_STATUS_CONFIG).toHaveProperty('DRAFT')
    expect(SETTLEMENT_STATUS_CONFIG).toHaveProperty('CALCULATED')
    expect(SETTLEMENT_STATUS_CONFIG).toHaveProperty('FINALIZED')
  })

  it('each status has label and color', () => {
    Object.values(SETTLEMENT_STATUS_CONFIG).forEach((config) => {
      expect(config).toHaveProperty('label')
      expect(config).toHaveProperty('color')
      expect(typeof config.label).toBe('string')
      expect(typeof config.color).toBe('string')
    })
  })

  it('has German labels', () => {
    expect(SETTLEMENT_STATUS_CONFIG.DRAFT.label).toBe('Entwurf')
    expect(SETTLEMENT_STATUS_CONFIG.FINALIZED.label).toBe('Abgeschlossen')
  })
})

describe('ACCEPTED_FILE_TYPES', () => {
  it('includes PDF', () => {
    expect(ACCEPTED_FILE_TYPES).toContain('application/pdf')
  })

  it('includes PNG', () => {
    expect(ACCEPTED_FILE_TYPES).toContain('image/png')
  })

  it('includes JPEG variants', () => {
    expect(ACCEPTED_FILE_TYPES).toContain('image/jpeg')
    expect(ACCEPTED_FILE_TYPES).toContain('image/jpg')
  })

  it('has exactly 4 types', () => {
    expect(ACCEPTED_FILE_TYPES).toHaveLength(4)
  })
})

describe('ACCEPTED_FILE_EXTENSIONS', () => {
  it('includes all expected extensions', () => {
    expect(ACCEPTED_FILE_EXTENSIONS).toContain('.pdf')
    expect(ACCEPTED_FILE_EXTENSIONS).toContain('.png')
    expect(ACCEPTED_FILE_EXTENSIONS).toContain('.jpg')
    expect(ACCEPTED_FILE_EXTENSIONS).toContain('.jpeg')
  })

  it('extensions start with dot', () => {
    ACCEPTED_FILE_EXTENSIONS.forEach((ext) => {
      expect(ext).toMatch(/^\.\w+$/)
    })
  })
})

describe('ALLOCATION_METHOD_LABELS', () => {
  it('has all expected allocation methods', () => {
    expect(ALLOCATION_METHOD_LABELS).toHaveProperty('WOHNFLAECHE')
    expect(ALLOCATION_METHOD_LABELS).toHaveProperty('PERSONENZAHL')
    expect(ALLOCATION_METHOD_LABELS).toHaveProperty('EINHEIT')
    expect(ALLOCATION_METHOD_LABELS).toHaveProperty('VERBRAUCH')
    expect(ALLOCATION_METHOD_LABELS).toHaveProperty('MITEIGENTUMSANTEIL')
  })

  it('has German labels', () => {
    expect(ALLOCATION_METHOD_LABELS.WOHNFLAECHE).toBe('Wohnfläche')
    expect(ALLOCATION_METHOD_LABELS.PERSONENZAHL).toBe('Personenzahl')
    expect(ALLOCATION_METHOD_LABELS.EINHEIT).toBe('Pro Einheit')
    expect(ALLOCATION_METHOD_LABELS.VERBRAUCH).toBe('Verbrauch')
    expect(ALLOCATION_METHOD_LABELS.MITEIGENTUMSANTEIL).toBe('Miteigentumsanteil')
  })
})

describe('POLLING_INTERVAL_MS', () => {
  it('is a positive number', () => {
    expect(typeof POLLING_INTERVAL_MS).toBe('number')
    expect(POLLING_INTERVAL_MS).toBeGreaterThan(0)
  })

  it('is set to 2 seconds', () => {
    expect(POLLING_INTERVAL_MS).toBe(2000)
  })
})

describe('MAX_FILE_SIZE constants', () => {
  it('MAX_FILE_SIZE_MB is 10', () => {
    expect(MAX_FILE_SIZE_MB).toBe(10)
  })

  it('MAX_FILE_SIZE_BYTES is correctly calculated', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024)
  })

  it('relationship between MB and BYTES is correct', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(MAX_FILE_SIZE_MB * 1024 * 1024)
  })
})

describe('isValidFileType', () => {
  // Helper to create mock File
  const createMockFile = (name: string, type: string): File => {
    return {
      name,
      type,
      size: 1000,
      lastModified: Date.now(),
    } as File
  }

  describe('validates by MIME type', () => {
    it('accepts PDF files', () => {
      const file = createMockFile('document.pdf', 'application/pdf')
      expect(isValidFileType(file)).toBe(true)
    })

    it('accepts PNG files', () => {
      const file = createMockFile('image.png', 'image/png')
      expect(isValidFileType(file)).toBe(true)
    })

    it('accepts JPEG files', () => {
      const file = createMockFile('image.jpg', 'image/jpeg')
      expect(isValidFileType(file)).toBe(true)
    })

    it('accepts JPG MIME type', () => {
      const file = createMockFile('image.jpg', 'image/jpg')
      expect(isValidFileType(file)).toBe(true)
    })

    it('rejects unknown MIME types', () => {
      const file = createMockFile('document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      expect(isValidFileType(file)).toBe(false)
    })

    it('rejects text files', () => {
      const file = createMockFile('notes.txt', 'text/plain')
      expect(isValidFileType(file)).toBe(false)
    })
  })

  describe('validates by file extension (fallback)', () => {
    it('accepts .pdf extension even with empty MIME type', () => {
      const file = createMockFile('document.pdf', '')
      expect(isValidFileType(file)).toBe(true)
    })

    it('accepts .png extension even with empty MIME type', () => {
      const file = createMockFile('image.png', '')
      expect(isValidFileType(file)).toBe(true)
    })

    it('accepts .jpg extension even with empty MIME type', () => {
      const file = createMockFile('image.jpg', '')
      expect(isValidFileType(file)).toBe(true)
    })

    it('accepts .jpeg extension even with empty MIME type', () => {
      const file = createMockFile('image.jpeg', '')
      expect(isValidFileType(file)).toBe(true)
    })

    it('is case-insensitive for extensions', () => {
      expect(isValidFileType(createMockFile('DOCUMENT.PDF', ''))).toBe(true)
      expect(isValidFileType(createMockFile('Image.PNG', ''))).toBe(true)
      expect(isValidFileType(createMockFile('Photo.JPG', ''))).toBe(true)
    })

    it('rejects files with invalid extensions', () => {
      const file = createMockFile('document.docx', '')
      expect(isValidFileType(file)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles file with no extension', () => {
      const file = createMockFile('document', '')
      expect(isValidFileType(file)).toBe(false)
    })

    it('handles file with extension-like name but wrong extension', () => {
      const file = createMockFile('file.pdf.exe', '')
      expect(isValidFileType(file)).toBe(false)
    })

    it('handles file with multiple dots', () => {
      const file = createMockFile('my.document.final.pdf', '')
      expect(isValidFileType(file)).toBe(true)
    })

    it('accepts by MIME type even if extension is wrong', () => {
      const file = createMockFile('document.txt', 'application/pdf')
      expect(isValidFileType(file)).toBe(true)
    })
  })
})
