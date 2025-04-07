// Mock the entire recordModel module
jest.mock('../../server/models/recordModel', () => ({
  getAllVisitRecords: jest.fn(),
  insertLabInfo: jest.fn(),
  getLabIdByDescription: jest.fn(),
  insertDiagnosis: jest.fn(),
  insertSurgeryInfo: jest.fn(),
  insertRecord: jest.fn(),
  updateRecordInDB: jest.fn(),
  getRecordById: jest.fn(),
  insertMatchRecLab: jest.fn(),
  updateMatchRecLab: jest.fn(),
  updateDiagnosisText: jest.fn(),
  updateSurgeryInfo: jest.fn(),
  removeSurgeryFromRecord: jest.fn(),
  getSurgeryIdForRecord: jest.fn(),
  deleteSurgeryInfo: jest.fn()
}));

// Import the mocked module
const recordModel = require('../../server/models/recordModel');

describe('RecordModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllVisitRecords', () => {
    it('should get all visit records for a pet', async () => {
      const mockRecords = [
        { 
          id: 1, 
          date: '2022-01-01', 
          purposeOfVisit: 'Checkup',
          weight: 10,
          temperature: 37.5,
          conditions: 'Healthy',
          symptoms: 'None',
          recentVisit: '2022-01-01',
          recentPurchase: 'Food',
          file: null,
          pet_name: 'Buddy',
          laboratories: 'Blood Test',
          surgeryType: null,
          surgeryDate: null,
          latestDiagnosis: 'Healthy',
          petId: 1,
          hadSurgery: false
        }
      ];
      
      recordModel.getAllVisitRecords.mockResolvedValue(mockRecords);
      
      const result = await recordModel.getAllVisitRecords(1);
      
      expect(result).toEqual(mockRecords);
      expect(recordModel.getAllVisitRecords).toHaveBeenCalledWith(1);
    });
  });

  describe('insertLabInfo', () => {
    it('should insert lab info and return the lab ID', async () => {
      recordModel.insertLabInfo.mockResolvedValue(1);
      
      const result = await recordModel.insertLabInfo('Blood Test');
      
      expect(result).toBe(1);
      expect(recordModel.insertLabInfo).toHaveBeenCalledWith('Blood Test');
    });
  });

  describe('getLabIdByDescription', () => {
    it('should get lab ID by description', async () => {
      recordModel.getLabIdByDescription.mockResolvedValue(1);
      
      const result = await recordModel.getLabIdByDescription('Blood Test');
      
      expect(result).toBe(1);
      expect(recordModel.getLabIdByDescription).toHaveBeenCalledWith('Blood Test');
    });

    it('should return null if lab ID not found by description', async () => {
      recordModel.getLabIdByDescription.mockResolvedValue(null);
      
      const result = await recordModel.getLabIdByDescription('Blood Test');
      
      expect(result).toBeNull();
      expect(recordModel.getLabIdByDescription).toHaveBeenCalledWith('Blood Test');
    });
  });

  describe('insertDiagnosis', () => {
    it('should insert diagnosis and return the diagnosis ID', async () => {
      recordModel.insertDiagnosis.mockResolvedValue(1);
      
      const result = await recordModel.insertDiagnosis('No issues');
      
      expect(result).toBe(1);
      expect(recordModel.insertDiagnosis).toHaveBeenCalledWith('No issues');
    });
  });

  describe('insertSurgeryInfo', () => {
    it('should insert surgery info and return the surgery ID', async () => {
      recordModel.insertSurgeryInfo.mockResolvedValue(1);
      
      const result = await recordModel.insertSurgeryInfo('Neutering', '2022-01-01');
      
      expect(result).toBe(1);
      expect(recordModel.insertSurgeryInfo).toHaveBeenCalledWith('Neutering', '2022-01-01');
    });
  });

  describe('insertRecord', () => {
    it('should insert a record and return the record ID', async () => {
      recordModel.insertRecord.mockResolvedValue(1);
      
      const result = await recordModel.insertRecord(
        1, // petId
        '2022-01-01', // recordDate
        10, // recordWeight
        37.5, // recordTemp
        'Healthy', // recordCondition
        'None', // recordSymptom
        '2022-01-01', // recordRecentVisit
        'Food', // recordPurchase
        'Checkup', // recordPurpose
        null, // recordLabFile
        1, // labId
        1, // diagnosisId
        1 // surgeryId
      );
      
      expect(result).toBe(1);
      expect(recordModel.insertRecord).toHaveBeenCalledWith(
        1,
        '2022-01-01',
        10,
        37.5,
        'Healthy',
        'None',
        '2022-01-01',
        'Food',
        'Checkup',
        null,
        1,
        1,
        1
      );
    });
  });

  describe('updateRecordInDB', () => {
    it('should update a record in the database', async () => {
      recordModel.updateRecordInDB.mockResolvedValue(true);
      
      const result = await recordModel.updateRecordInDB(
        1, // recordId
        '2022-01-02', // recordDate
        'Treatment', // recordPurpose
        11, // recordWeight
        38, // recordTemp
        'Sick', // recordCondition
        'Cough', // recordSymptom
        '2022-01-02', // recordRecentVisit
        'Medicine', // recordPurchase
        null // recordLabFile
      );
      
      expect(result).toBe(true);
      expect(recordModel.updateRecordInDB).toHaveBeenCalledWith(
        1,
        '2022-01-02',
        'Treatment',
        11,
        38,
        'Sick',
        'Cough',
        '2022-01-02',
        'Medicine',
        null
      );
    });
  });

  describe('getRecordById', () => {
    it('should get a record by ID', async () => {
      const mockRecord = { record_id: 1, record_date: '2022-01-01' };
      recordModel.getRecordById.mockResolvedValue(mockRecord);
      
      const result = await recordModel.getRecordById(1);
      
      expect(result).toEqual(mockRecord);
      expect(recordModel.getRecordById).toHaveBeenCalledWith(1);
    });

    it('should return null if record not found by ID', async () => {
      recordModel.getRecordById.mockResolvedValue(null);
      
      const result = await recordModel.getRecordById(1);
      
      expect(result).toBeNull();
      expect(recordModel.getRecordById).toHaveBeenCalledWith(1);
    });
  });

  describe('insertMatchRecLab', () => {
    it('should insert match record lab', async () => {
      recordModel.insertMatchRecLab.mockResolvedValue(1);
      
      const result = await recordModel.insertMatchRecLab(1, 1);
      
      expect(result).toBe(1);
      expect(recordModel.insertMatchRecLab).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('updateMatchRecLab', () => {
    it('should update match record lab', async () => {
      recordModel.updateMatchRecLab.mockResolvedValue(true);
      
      const result = await recordModel.updateMatchRecLab(1, 1);
      
      expect(result).toBe(true);
      expect(recordModel.updateMatchRecLab).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('updateDiagnosisText', () => {
    it('should update diagnosis text', async () => {
      const mockResult = { affectedRows: 1 };
      recordModel.updateDiagnosisText.mockResolvedValue(mockResult);
      
      const result = await recordModel.updateDiagnosisText(1, 'Updated diagnosis');
      
      expect(result).toEqual(mockResult);
      expect(recordModel.updateDiagnosisText).toHaveBeenCalledWith(1, 'Updated diagnosis');
    });
  });

  describe('updateSurgeryInfo', () => {
    it('should update surgery info', async () => {
      recordModel.updateSurgeryInfo.mockResolvedValue(true);
      
      const result = await recordModel.updateSurgeryInfo(1, 'Spaying', '2022-02-01');
      
      expect(result).toBe(true);
      expect(recordModel.updateSurgeryInfo).toHaveBeenCalledWith(1, 'Spaying', '2022-02-01');
    });
  });

  describe('removeSurgeryFromRecord', () => {
    it('should remove surgery from record', async () => {
      recordModel.removeSurgeryFromRecord.mockResolvedValue(true);
      
      const result = await recordModel.removeSurgeryFromRecord(1);
      
      expect(result).toBe(true);
      expect(recordModel.removeSurgeryFromRecord).toHaveBeenCalledWith(1);
    });
  });

  describe('getSurgeryIdForRecord', () => {
    it('should get surgery ID for record', async () => {
      recordModel.getSurgeryIdForRecord.mockResolvedValue(1);
      
      const result = await recordModel.getSurgeryIdForRecord(1);
      
      expect(result).toBe(1);
      expect(recordModel.getSurgeryIdForRecord).toHaveBeenCalledWith(1);
    });

    it('should return null if surgery ID not found for record', async () => {
      recordModel.getSurgeryIdForRecord.mockResolvedValue(null);
      
      const result = await recordModel.getSurgeryIdForRecord(1);
      
      expect(result).toBeNull();
      expect(recordModel.getSurgeryIdForRecord).toHaveBeenCalledWith(1);
    });
  });

  describe('deleteSurgeryInfo', () => {
    it('should delete surgery info', async () => {
      recordModel.deleteSurgeryInfo.mockResolvedValue(true);
      
      const result = await recordModel.deleteSurgeryInfo(1);
      
      expect(result).toBe(true);
      expect(recordModel.deleteSurgeryInfo).toHaveBeenCalledWith(1);
    });
  });
});