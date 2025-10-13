jest.mock('@/lib/prisma', () => ({
  prisma: {
    question: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

const { GET, POST, PUT, DELETE } = require('@/app/api/admin/questions/route');
const { prisma } = require('@/lib/prisma');
const { getServerSession } = require('next-auth');

describe('admin questions api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { role: 'ADMIN' } });
  });

  describe('GET', () => {
    it('returns questions filtered by eventId', async () => {
      const mockQuestion = {
        id: 'q1',
        eventId: 'ev1',
        type: 'text',
        content: 'c',
        expectedAnswer: 'e',
        aiThreshold: 8,
        createdAt: new Date(),
        allowedFormats: null,
        options: null,
        minResolution: null,
        imageDescription: null,
        maxFileSize: null,
        required: false,
        hintEnabled: false,

      };
      prisma.question.findMany.mockResolvedValue([mockQuestion]);
      const fakeReq = { url: 'https://example.com/?eventId=ev1' };
      const res = await GET(fakeReq);
      const { questions } = res;
      expect(questions[0].id).toBe('q1');
      expect(questions[0].eventId).toBe('ev1');
    });
  });

  describe('POST', () => {
    it('validates required fields', async () => {
      const req = { json: async () => ({ type: 'text', eventId: '', content: '', expectedAnswer: '' }) };
      const res = await POST(req);
      expect(res.error).toBe('Validation failed');
    });

    it('returns 404 when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      const req = { json: async () => ({ type: 'text', eventId: 'ev1', content: 'c', expectedAnswer: 'e' }) };
      const res = await POST(req);
      expect(res.error).toBe('Event not found');
    });

    it('creates multiple choice question with valid options', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const mockEvent = { id: validUUID };
      const mockQuestion = {
        id: 'q1',
        eventId: validUUID,
        type: 'multiple_choice',
        content: 'What is 2+2?',
        expectedAnswer: 'A',
        options: { A: '4', B: '5', C: '3', D: '6' },
        aiThreshold: 8,
        hintEnabled: false,
        createdAt: new Date(),
      };
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.question.create.mockResolvedValue({
        ...mockQuestion,
        options: JSON.stringify(mockQuestion.options),
      });

      const req = {
        json: async () => ({
          eventId: validUUID,
          type: 'multiple_choice',
          content: 'What is 2+2?',
          expectedAnswer: 'A',
          options: { A: '4', B: '5', C: '3', D: '6' },
          aiThreshold: 8,
          hintEnabled: false,
        }),
      };

      const res = await POST(req);
      expect(res.question.id).toEqual(mockQuestion.id);
    });

    it('creates image question with valid data', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const mockEvent = { id: validUUID };
      const mockQuestion = {
        id: 'q1',
        eventId: validUUID,
        type: 'image',
        content: 'Upload an image',
        expectedAnswer: 'Image expected',
        aiThreshold: 8,
        hintEnabled: false,
        imageDescription: 'Describe the scene',
        allowedFormats: ['jpg', 'png'],
        maxFileSize: 5 * 1024 * 1024,
        minResolution: { width: 100, height: 100 },
        required: false,
        createdAt: new Date(),
      };
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.question.create.mockResolvedValue({
        ...mockQuestion,
        allowedFormats: JSON.stringify(mockQuestion.allowedFormats),
        minResolution: JSON.stringify(mockQuestion.minResolution),
      });

      const req = {
        json: async () => ({
          ...mockQuestion,
        }),
      };

      const res = await POST(req);
      expect(res.question.id).toEqual(mockQuestion.id);
    });

    it('rejects image question with invalid data', async () => {
      const req = {
        json: async () => ({
          type: 'image',
          imageDescription: '', // Invalid
        }),
      };
      const res = await POST(req);
      expect(res.error).toBe('Validation failed');
      expect(prisma.question.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT', () => {
    it('requires id', async () => {
      const req = { json: async () => ({}) };
      const res = await PUT(req);
      expect(res.error).toBe('Validation failed');
    });

    it('updates a question', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const mockQuestion = {
        id: validUUID,
        content: 'Updated Content',
        createdAt: new Date(),
      };
      prisma.question.update.mockResolvedValue(mockQuestion);

      const req = {
        json: async () => ({
          id: validUUID,
          content: 'Updated Content',
        }),
      };

      const res = await PUT(req);
      expect(res.question.id).toEqual(mockQuestion.id);
      expect(res.question.content).toEqual(mockQuestion.content);
    });
  });

  describe('DELETE', () => {
    it('requires id', async () => {
      const req = { json: async () => ({}) };
      const res = await DELETE(req);
      expect(res.error).toBe('ID is required');
    });

    it('deletes a question', async () => {
      const req = { json: async () => ({ id: 'q1' }) };
      await DELETE(req);
      expect(prisma.question.delete).toHaveBeenCalledWith({ where: { id: 'q1' } });
    });
  });
});