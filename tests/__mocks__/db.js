// tests/__mocks__/db.js
// Centralized mock for the database module

const dbMock = {
  query: jest.fn().mockResolvedValue([[], {}]),
  execute: jest.fn().mockResolvedValue([[], {}]),
  connection: {
    query: jest.fn().mockResolvedValue([[], {}]),
    execute: jest.fn().mockResolvedValue([[], {}]),
    promise: jest.fn().mockReturnThis(),
  },
  promise: jest.fn().mockReturnThis(),
};

module.exports = dbMock;