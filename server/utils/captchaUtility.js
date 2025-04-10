const { createCanvas, loadImage } = require("canvas");


function generateCaptcha() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let captchaText = "";
    for (let i = 0; i < 6; i++) {
        captchaText += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return captchaText;
}


function generateCaptchaImage(text) {
    const width = 160, height = 50;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");


    // Background
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, width, height);


    // Add noise (dots)
    for (let i = 0; i < 50; i++) {
        ctx.fillStyle = "#666";
        ctx.beginPath();
        ctx.arc(
            Math.random() * width,
            Math.random() * height,
            1,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }


    // Add lines for noise
    for (let i = 0; i < 2; i++) {
        ctx.strokeStyle = "#666";
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    }


    // Configure text
    ctx.font = "italic 32px Times New Roman";
    ctx.fillStyle = "#000";


    // Draw each character with random rotation
    const chars = text.split('');
    let x = 15;
    chars.forEach((char, i) => {
        ctx.save();
        // Random rotation for each character
        const rotation = (Math.random() - 0.5) * 0.5;
        // Random y position
        const y = 35 + (Math.random() - 0.5) * 10;
        
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillText(char, 0, 0);
        ctx.restore();
        
        x += ctx.measureText(char).width + 5;
    });


    return canvas.toDataURL();
}


module.exports = { generateCaptcha, generateCaptchaImage };
