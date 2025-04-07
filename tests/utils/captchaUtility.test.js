// captchaUtility.test.js

const { generateCaptcha, generateCaptchaImage } = require("../../server/utils/captchaUtility"); // Adjust path if needed
const { createCanvas } = require("canvas"); // Only needed if you were doing deeper canvas checks/mocks

// Helper function to check if a string contains only allowed characters
const containsOnlyAllowedChars = (str, allowedChars) => {
    for (let i = 0; i < str.length; i++) {
        if (allowedChars.indexOf(str[i]) === -1) {
            return false;
        }
    }
    return true;
};

describe("Captcha Utilities", () => {

    describe("generateCaptcha", () => {
        const ALLOWED_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const CAPTCHA_LENGTH = 6;

        it("should return a string", () => {
            const captchaText = generateCaptcha();
            expect(typeof captchaText).toBe("string");
        });

        it(`should return a string of length ${CAPTCHA_LENGTH}`, () => {
            const captchaText = generateCaptcha();
            expect(captchaText).toHaveLength(CAPTCHA_LENGTH);
        });

        it(`should contain only characters from the allowed set: ${ALLOWED_CHARS}`, () => {
            const captchaText = generateCaptcha();
            // Method 1: Using helper function
            expect(containsOnlyAllowedChars(captchaText, ALLOWED_CHARS)).toBe(true);

            // Method 2: Using regex (more concise)
            // ^[A-Za-z0-9]+$ asserts the string contains one or more allowed characters from start to end
            expect(captchaText).toMatch(/^[A-Za-z0-9]+$/);
        });

        it("should generate different codes on subsequent calls (highly likely)", () => {
            // Generate multiple codes. Due to randomness, it's *extremely* unlikely
            // they will be the same, but not theoretically impossible.
            const captcha1 = generateCaptcha();
            const captcha2 = generateCaptcha();
            const captcha3 = generateCaptcha();

            console.log("Generated CAPTCHAs for uniqueness check:", captcha1, captcha2, captcha3); // Optional logging

            expect(captcha1).not.toBe(captcha2);
            expect(captcha2).not.toBe(captcha3);
            expect(captcha1).not.toBe(captcha3);
        });
    });

    describe("generateCaptchaImage", () => {
        const TEST_TEXT = "Abc123";

        it("should return a string", () => {
            const imageDataUrl = generateCaptchaImage(TEST_TEXT);
            expect(typeof imageDataUrl).toBe("string");
        });

        it("should return a valid PNG Data URL", () => {
            const imageDataUrl = generateCaptchaImage(TEST_TEXT);
            // Check if it starts with the PNG Data URL prefix
            expect(imageDataUrl).toMatch(/^data:image\/png;base64,/);
            // Basic check: length should be significant
            expect(imageDataUrl.length).toBeGreaterThan(100); // Arbitrary check for non-trivial base64 data
        });

        it("should generate different Data URLs for different input text", () => {
            const text1 = "TextOne";
            const text2 = "TextTwo";
            const imageDataUrl1 = generateCaptchaImage(text1);
            const imageDataUrl2 = generateCaptchaImage(text2);

            expect(imageDataUrl1).not.toBe(imageDataUrl2);
            expect(imageDataUrl1).toMatch(/^data:image\/png;base64,/);
            expect(imageDataUrl2).toMatch(/^data:image\/png;base64,/);
        });

        it("should execute without errors for typical input", () => {
            expect(() => {
                generateCaptchaImage(TEST_TEXT);
            }).not.toThrow();
        });

        it("should handle empty string input without error (generates image with no text)", () => {
             expect(() => {
                const imageDataUrl = generateCaptchaImage("");
                expect(imageDataUrl).toMatch(/^data:image\/png;base64,/);
             }).not.toThrow();
        });

        // Optional: Snapshot test (more advanced, checks visual consistency)
        // Note: Requires `jest-image-snapshot` and careful setup
        // it('should generate a visually consistent image (snapshot)', () => {
        //   const imageDataUrl = generateCaptchaImage('SnapT3st');
        //   const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, "");
        //   const imageBuffer = Buffer.from(base64Data, 'base64');
        //   expect(imageBuffer).toMatchImageSnapshot(); // Requires jest-image-snapshot setup
        // });
    });
});