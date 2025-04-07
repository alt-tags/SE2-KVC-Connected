const bcrypt = require('bcrypt');
const { hashPassword, comparePassword } = require('../../server/utils/passwordUtility');

describe('Password Utilities (bcryptjs)', () => {
    const plainPassword = 'mySecretPassword123';
    let hashedPassword = '';

    beforeAll(async () => {
        hashedPassword = await hashPassword(plainPassword);
        expect(typeof hashedPassword).toBe('string');
        expect(hashedPassword.startsWith('$2a$10$') || hashedPassword.startsWith('$2b$10$')).toBe(true);
        expect(hashedPassword.length).toBeGreaterThan(50);
    });

    test('should correctly hash a password', () => {
        expect(hashedPassword).not.toBe(plainPassword);
    });

    test('should return true when comparing the correct password', async () => {
        const isMatch = await comparePassword(plainPassword, hashedPassword);
        expect(isMatch).toBe(true);
    });

    test('should return false when comparing an incorrect password', async () => {
        const wrongPassword = 'incorrectPassword';
        const isMatch = await comparePassword(wrongPassword, hashedPassword);
        expect(isMatch).toBe(false);
    });

    test('should return false when comparing an empty string against a non-empty hash', async () => {
        const isMatch = await comparePassword('', hashedPassword);
        expect(isMatch).toBe(false);
    });

     test('should handle hashing and comparing an empty string correctly', async () => {
        const emptyPassword = '';
        const hashedEmpty = await hashPassword(emptyPassword);

        // Check hash format again for empty string
        expect(typeof hashedEmpty).toBe('string');
        expect(hashedEmpty.startsWith('$2a$10$') || hashedEmpty.startsWith('$2b$10$')).toBe(true);

        // Compare empty string with its hash
        const isMatchCorrect = await comparePassword(emptyPassword, hashedEmpty);
        expect(isMatchCorrect).toBe(true);

        // Compare non-empty string with empty string's hash
        const isMatchIncorrect = await comparePassword('notEmpty', hashedEmpty);
        expect(isMatchIncorrect).toBe(false);
    });

    test('should produce different hashes for the same password (due to salt)', async () => {
        const hash1 = await hashPassword(plainPassword);
        const hash2 = await hashPassword(plainPassword);
        expect(hash1).not.toBe(hash2); // Hashes should differ because of the random salt
        expect(await comparePassword(plainPassword, hash1)).toBe(true);
        expect(await comparePassword(plainPassword, hash2)).toBe(true);
    });
});