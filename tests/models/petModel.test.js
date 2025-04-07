// Mock the entire petModel module
jest.mock('../../server/models/petModel', () => ({
  findByOwnerId: jest.fn(),
  findById: jest.fn(),
  findSpeciesByDescription: jest.fn(),
  createPet: jest.fn(),
  updatePet: jest.fn(),
  updatePetSpecies: jest.fn(),
  archivePet: jest.fn(),
  restorePet: jest.fn(),
  getAllActivePets: jest.fn(),
  getAllArchivedPets: jest.fn()
}));

// Import the mocked module
const PetModel = require('../../server/models/petModel');

describe('PetModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a pet by ID', async () => {
      const mockPet = { 
        pet_id: 1, 
        name: 'Buddy',
        breed: 'Labrador',
        birthday: '2020-01-01',
        gender: 'Male',
        color: 'Brown',
        status: 1,
        owner_name: 'John Doe',
        email: 'john@example.com',
        contact: '1234567890',
        address: '123 Main St',
        species: 'Dog'
      };
      
      PetModel.findById.mockResolvedValue(mockPet);
      
      const pet = await PetModel.findById(1);
      
      expect(pet).toEqual(mockPet);
      expect(PetModel.findById).toHaveBeenCalledWith(1);
    });

    it('should return null if pet not found by ID', async () => {
      PetModel.findById.mockResolvedValue(null);
      
      const pet = await PetModel.findById(1);
      
      expect(pet).toBeNull();
      expect(PetModel.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('findByOwnerId', () => {
    it('should find pets by owner ID', async () => {
      const mockPets = [
        { pet_id: 1, pet_name: 'Buddy' },
        { pet_id: 2, pet_name: 'Max' }
      ];
      
      PetModel.findByOwnerId.mockResolvedValue(mockPets);
      
      const pets = await PetModel.findByOwnerId(1);
      
      expect(pets).toEqual(mockPets);
      expect(PetModel.findByOwnerId).toHaveBeenCalledWith(1);
    });
  });

  describe('findSpeciesByDescription', () => {
    it('should find species by description', async () => {
      const mockSpecies = { spec_id: 1, spec_description: 'Dog' };
      
      PetModel.findSpeciesByDescription.mockResolvedValue(mockSpecies);
      
      const species = await PetModel.findSpeciesByDescription('Dog');
      
      expect(species).toEqual(mockSpecies);
      expect(PetModel.findSpeciesByDescription).toHaveBeenCalledWith('Dog');
    });

    it('should return null if species not found by description', async () => {
      PetModel.findSpeciesByDescription.mockResolvedValue(null);
      
      const species = await PetModel.findSpeciesByDescription('Dog');
      
      expect(species).toBeNull();
      expect(PetModel.findSpeciesByDescription).toHaveBeenCalledWith('Dog');
    });
  });

  describe('createPet', () => {
    it('should create a new pet', async () => {
      const mockPetData = {
        petname: 'Buddy',
        gender: 'Male',
        speciesId: 1,
        breed: 'Labrador',
        birthdate: '2020-01-01',
        userId: 1,
      };
      const mockConnection = {};
      
      PetModel.createPet.mockResolvedValue(1);
      
      const petId = await PetModel.createPet(mockPetData, mockConnection);
      
      expect(petId).toBe(1);
      expect(PetModel.createPet).toHaveBeenCalledWith(mockPetData, mockConnection);
    });
  });

  describe('updatePet', () => {
    it('should update a pet', async () => {
      const mockUpdateData = {
        pet_name: 'Buddy',
        pet_breed: 'Labrador',
      };
      const mockResult = { affectedRows: 1 };
      
      PetModel.updatePet.mockResolvedValue(mockResult);
      
      const result = await PetModel.updatePet(1, mockUpdateData);
      
      expect(result).toEqual(mockResult);
      expect(PetModel.updatePet).toHaveBeenCalledWith(1, mockUpdateData);
    });
  });

  describe('updatePetSpecies', () => {
    it('should update pet species', async () => {
      const mockResult = [{ affectedRows: 1 }];
      
      PetModel.updatePetSpecies.mockResolvedValue(mockResult);
      
      const result = await PetModel.updatePetSpecies(1, 2);
      
      expect(result).toEqual(mockResult);
      expect(PetModel.updatePetSpecies).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('archivePet', () => {
    it('should archive a pet', async () => {
      const mockResult = [{ affectedRows: 1 }];
      
      PetModel.archivePet.mockResolvedValue(mockResult);
      
      const result = await PetModel.archivePet(1);
      
      expect(result).toEqual(mockResult);
      expect(PetModel.archivePet).toHaveBeenCalledWith(1);
    });
  });

  describe('restorePet', () => {
    it('should restore a pet', async () => {
      const mockResult = [{ affectedRows: 1 }];
      
      PetModel.restorePet.mockResolvedValue(mockResult);
      
      const result = await PetModel.restorePet(1);
      
      expect(result).toEqual(mockResult);
      expect(PetModel.restorePet).toHaveBeenCalledWith(1);
    });
  });

  describe('getAllActivePets', () => {
    it('should get all active pets', async () => {
      const mockPets = [{ 
        pet_id: 1, 
        pet_name: 'Buddy', 
        owner_name: 'John Doe',
        species: 'Dog'
      }];
      
      PetModel.getAllActivePets.mockResolvedValue(mockPets);
      
      const pets = await PetModel.getAllActivePets();
      
      expect(pets).toEqual(mockPets);
      expect(PetModel.getAllActivePets).toHaveBeenCalled();
    });
  });

  describe('getAllArchivedPets', () => {
    it('should get all archived pets', async () => {
      const mockPets = [{ pet_id: 1, pet_name: 'Buddy', pet_status: 0 }];
      
      PetModel.getAllArchivedPets.mockResolvedValue(mockPets);
      
      const pets = await PetModel.getAllArchivedPets();
      
      expect(pets).toEqual(mockPets);
      expect(PetModel.getAllArchivedPets).toHaveBeenCalled();
    });
  });
});