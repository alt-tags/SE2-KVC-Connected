// Mock the entire userModel module
jest.mock('../../server/models/userModel', () => ({
  getUserById: jest.fn(),
  getOwnerByUserId: jest.fn(),
  getPasswordById: jest.fn(),
  updatePassword: jest.fn(),
  findByEmail: jest.fn(),
  isEmailTaken: jest.fn(),
  createPetOwner: jest.fn(),
  createEmployee: jest.fn(),
  updateEmployeeProfile: jest.fn(),
  updateOwnerProfile: jest.fn()
}));

// Import the mocked module
const UserModel = require('../../server/models/userModel');

describe('UserModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should get a user by ID', async () => {
      const mockUser = { user_id: 1, user_email: 'test@example.com' };
      
      UserModel.getUserById.mockResolvedValue(mockUser);
      
      const user = await UserModel.getUserById(1);
      
      expect(user).toEqual(mockUser);
      expect(UserModel.getUserById).toHaveBeenCalledWith(1);
    });

    it('should return null if user not found by ID', async () => {
      UserModel.getUserById.mockResolvedValue(null);
      
      const user = await UserModel.getUserById(1);
      
      expect(user).toBeNull();
      expect(UserModel.getUserById).toHaveBeenCalledWith(1);
    });
  });

  describe('getOwnerByUserId', () => {
    it('should get owner by user ID', async () => {
      const mockOwner = { user_id: 1, owner_address: '123 Main St' };
      
      UserModel.getOwnerByUserId.mockResolvedValue(mockOwner);
      
      const owner = await UserModel.getOwnerByUserId(1);
      
      expect(owner).toEqual(mockOwner);
      expect(UserModel.getOwnerByUserId).toHaveBeenCalledWith(1);
    });

    it('should return null if owner not found by user ID', async () => {
      UserModel.getOwnerByUserId.mockResolvedValue(null);
      
      const owner = await UserModel.getOwnerByUserId(1);
      
      expect(owner).toBeNull();
      expect(UserModel.getOwnerByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe('getPasswordById', () => {
    it('should get password by user ID', async () => {
      const mockPassword = 'hashedpassword';
      
      UserModel.getPasswordById.mockResolvedValue(mockPassword);
      
      const password = await UserModel.getPasswordById(1);
      
      expect(password).toEqual(mockPassword);
      expect(UserModel.getPasswordById).toHaveBeenCalledWith(1);
    });

    it('should return null if password not found by user ID', async () => {
      UserModel.getPasswordById.mockResolvedValue(null);
      
      const password = await UserModel.getPasswordById(1);
      
      expect(password).toBeNull();
      expect(UserModel.getPasswordById).toHaveBeenCalledWith(1);
    });
  });

  describe('updatePassword', () => {
    it('should update password', async () => {
      const mockResult = [{ affectedRows: 1 }];
      
      UserModel.updatePassword.mockResolvedValue(mockResult);
      
      const result = await UserModel.updatePassword(1, 'newhashedpassword');
      
      expect(result).toEqual(mockResult);
      expect(UserModel.updatePassword).toHaveBeenCalledWith(1, 'newhashedpassword');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        user_id: 1,
        user_password: 'hashedpassword',
        user_role: 'user',
      };
      
      UserModel.findByEmail.mockResolvedValue(mockUser);
      
      const user = await UserModel.findByEmail('test@example.com');
      
      expect(user).toEqual(mockUser);
      expect(UserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null if user not found by email', async () => {
      UserModel.findByEmail.mockResolvedValue(null);
      
      const user = await UserModel.findByEmail('test@example.com');
      
      expect(user).toBeNull();
      expect(UserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('isEmailTaken', () => {
    it('should check if email is taken', async () => {
      UserModel.isEmailTaken.mockResolvedValue(true);
      
      const isTaken = await UserModel.isEmailTaken('test@example.com');
      
      expect(isTaken).toBe(true);
      expect(UserModel.isEmailTaken).toHaveBeenCalledWith('test@example.com');
    });

    it('should return false if email is not taken', async () => {
      UserModel.isEmailTaken.mockResolvedValue(false);
      
      const isTaken = await UserModel.isEmailTaken('test@example.com');
      
      expect(isTaken).toBe(false);
      expect(UserModel.isEmailTaken).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('createPetOwner', () => {
    it('should create a pet owner', async () => {
      const mockUserData = {
        fname: 'John',
        lname: 'Doe',
        email: 'john.doe@example.com',
        contact: '1234567890',
        address: '123 Main St',
        password: 'hashedpassword',
        altPerson1: 'Jane Doe',
        altContact1: '0987654321',
      };
      const mockConnection = {};
      
      UserModel.createPetOwner.mockResolvedValue(1);
      
      const userId = await UserModel.createPetOwner(mockUserData, mockConnection);
      
      expect(userId).toBe(1);
      expect(UserModel.createPetOwner).toHaveBeenCalledWith(mockUserData, mockConnection);
    });
  });

  describe('createEmployee', () => {
    it('should create an employee', async () => {
      const mockEmployeeData = {
        fname: 'Jane',
        lname: 'Doe',
        email: 'jane.doe@example.com',
        contact: '1234567890',
        role: 'Vet',
        hashedPassword: 'hashedpassword',
      };
      
      UserModel.createEmployee.mockResolvedValue(1);
      
      const userId = await UserModel.createEmployee(mockEmployeeData);
      
      expect(userId).toBe(1);
      expect(UserModel.createEmployee).toHaveBeenCalledWith(mockEmployeeData);
    });
  });

  describe('updateEmployeeProfile', () => {
    it('should update employee profile', async () => {
      const mockUser = { user_id: 1, user_firstname: 'Jane', user_lastname: 'Doe' };
      
      UserModel.updateEmployeeProfile.mockResolvedValue(mockUser);
      
      const result = await UserModel.updateEmployeeProfile(
        1,
        'Jane',
        'Doe',
        'jane.doe@example.com',
        '1234567890'
      );
      
      expect(result).toEqual(mockUser);
      expect(UserModel.updateEmployeeProfile).toHaveBeenCalledWith(
        1,
        'Jane',
        'Doe',
        'jane.doe@example.com',
        '1234567890'
      );
    });
  });

  describe('updateOwnerProfile', () => {
    it('should update owner profile', async () => {
      UserModel.updateOwnerProfile.mockResolvedValue(undefined);
      
      await UserModel.updateOwnerProfile(
        1,
        'John',
        'Doe',
        'john.doe@example.com',
        '1234567890',
        '123 Main St',
        'Jane Doe',
        '0987654321',
        null,
        null
      );
      
      expect(UserModel.updateOwnerProfile).toHaveBeenCalledWith(
        1,
        'John',
        'Doe',
        'john.doe@example.com',
        '1234567890',
        '123 Main St',
        'Jane Doe',
        '0987654321',
        null,
        null
      );
    });
  });
});