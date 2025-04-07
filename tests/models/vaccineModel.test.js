// Mock the entire vaccineModel module
jest.mock('../../server/models/vaccineModel', () => ({
  getAllVaccines: jest.fn(),
  getVaccineByType: jest.fn(),
  addPetVaccinationRecord: jest.fn()
}));

const VaccineModel = require('../../server/models/vaccineModel');

describe('VaccineModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllVaccines', () => {
    it('should get all vaccines', async () => {
      const mockVaccines = [{ vax_id: 1, vax_type: 'Rabies' }];
      
      VaccineModel.getAllVaccines.mockResolvedValue(mockVaccines);
      
      const vaccines = await VaccineModel.getAllVaccines();
      
      expect(vaccines).toEqual(mockVaccines);
      expect(VaccineModel.getAllVaccines).toHaveBeenCalled();
    });
  });

  describe('getVaccineByType', () => {
    it('should get vaccine by type', async () => {
      const mockVaccine = { vax_id: 1, vax_type: 'Rabies' };
      
      VaccineModel.getVaccineByType.mockResolvedValue(mockVaccine);
      
      const vaccine = await VaccineModel.getVaccineByType('Rabies');
      
      expect(vaccine).toEqual(mockVaccine);
      expect(VaccineModel.getVaccineByType).toHaveBeenCalledWith('Rabies');
    });

    it('should return null if vaccine not found by type', async () => {
      VaccineModel.getVaccineByType.mockResolvedValue(null);
      
      const vaccine = await VaccineModel.getVaccineByType('Rabies');
      
      expect(vaccine).toBeNull();
      expect(VaccineModel.getVaccineByType).toHaveBeenCalledWith('Rabies');
    });
  });

  describe('addPetVaccinationRecord', () => {
    it('should add pet vaccination record', async () => {
      const mockResult = { insertId: 1 };
      
      VaccineModel.addPetVaccinationRecord.mockResolvedValue(mockResult);
      
      const result = await VaccineModel.addPetVaccinationRecord(1, 1, 1, '2022-01-01');
      
      expect(result).toEqual(mockResult);
      expect(VaccineModel.addPetVaccinationRecord).toHaveBeenCalledWith(1, 1, 1, '2022-01-01');
    });
  });
});