/* ========================================================
   Weather Particle System
   Renders snow, rain, or sunshine particles on a canvas
   based on the current weather zone.
   ======================================================== */

const WeatherEngine = (function () {
    const canvas = document.getElementById('weather-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let currentWeather = 'snow';
    let animationFrameId = null;
    let sunOpacity = 0;
    let rainbowOpacity = 0;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    /* ----- Particle Factories ----- */

    function createSnowflake() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height,
            radius: Math.random() * 4 + 2,
            speed: Math.random() * 1.5 + 0.5,
            drift: Math.random() * 1 - 0.5,
            opacity: Math.random() * 0.6 + 0.4
        };
    }

    function createRaindrop() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height,
            length: Math.random() * 18 + 10,
            speed: Math.random() * 6 + 8,
            opacity: Math.random() * 0.4 + 0.2
        };
    }

    function createSunParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 0.5 + 0.2,
            opacity: Math.random() * 0.3 + 0.1,
            drift: Math.random() * 0.5 - 0.25
        };
    }

    /* ----- Update & Draw ----- */

    function updateSnow() {
        particles.forEach(p => {
            p.y += p.speed;
            p.x += p.drift + Math.sin(p.y * 0.01) * 0.5;
            if (p.y > canvas.height + 10) {
                p.y = -10;
                p.x = Math.random() * canvas.width;
            }
        });
    }

    function drawSnow() {
        ctx.fillStyle = 'white';
        particles.forEach(p => {
            ctx.globalAlpha = p.opacity;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    function updateRain() {
        particles.forEach(p => {
            p.y += p.speed;
            p.x += 1.5;
            if (p.y > canvas.height + 10) {
                p.y = Math.random() * -200;
                p.x = Math.random() * canvas.width;
            }
        });
    }

    function drawRain() {
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
        ctx.lineWidth = 1.5;
        particles.forEach(p => {
            ctx.globalAlpha = p.opacity;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + 2, p.y + p.length);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
    }

    function updateSun() {
        particles.forEach(p => {
            p.y -= p.speed;
            p.x += p.drift;
            if (p.y < -10) {
                p.y = canvas.height + 10;
                p.x = Math.random() * canvas.width;
            }
        });
    }

    function drawSun() {
        /* Full-screen warm wash — fills the entire background golden */
        const warmWash = ctx.createLinearGradient(0, 0, 0, canvas.height);
        warmWash.addColorStop(0, `rgba(254, 243, 199, ${0.7 * sunOpacity})`);
        warmWash.addColorStop(0.4, `rgba(253, 230, 138, ${0.5 * sunOpacity})`);
        warmWash.addColorStop(1, `rgba(245, 158, 11, ${0.3 * sunOpacity})`);
        ctx.fillStyle = warmWash;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        /* Large sun disc in top-right corner */
        if (sunOpacity > 0) {
            const sunX = canvas.width - 150;
            const sunY = 130;
            const sunRadius = 300;

            const gradient = ctx.createRadialGradient(sunX, sunY, 30, sunX, sunY, sunRadius);
            gradient.addColorStop(0, `rgba(253, 224, 71, ${0.9 * sunOpacity})`);
            gradient.addColorStop(0.2, `rgba(251, 191, 36, ${0.6 * sunOpacity})`);
            gradient.addColorStop(0.5, `rgba(245, 158, 11, ${0.3 * sunOpacity})`);
            gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        /* Floating warm sparkle particles */
        particles.forEach(p => {
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        /* Rainbow arc */
        if (rainbowOpacity > 0) {
            const rainbowColors = [
                `rgba(255, 0, 0, ${0.18 * rainbowOpacity})`,
                `rgba(255, 127, 0, ${0.18 * rainbowOpacity})`,
                `rgba(255, 255, 0, ${0.18 * rainbowOpacity})`,
                `rgba(0, 255, 0, ${0.18 * rainbowOpacity})`,
                `rgba(0, 0, 255, ${0.18 * rainbowOpacity})`,
                `rgba(75, 0, 130, ${0.18 * rainbowOpacity})`,
                `rgba(148, 0, 211, ${0.18 * rainbowOpacity})`
            ];

            const centerX = canvas.width * 0.5;
            const centerY = canvas.height * 0.9;
            const baseRadius = Math.min(canvas.width, canvas.height) * 0.8;

            rainbowColors.forEach((color, i) => {
                ctx.beginPath();
                ctx.arc(centerX, centerY, baseRadius - i * 14, Math.PI, 0);
                ctx.strokeStyle = color;
                ctx.lineWidth = 12;
                ctx.stroke();
            });
        }

        ctx.globalAlpha = 1;
    }

    /* ----- Animation Loop ----- */

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (currentWeather === 'snow') {
            updateSnow();
            drawSnow();
        } else if (currentWeather === 'rain') {
            updateRain();
            drawRain();
        } else if (currentWeather === 'sunny') {
            updateSun();
            drawSun();
        }

        animationFrameId = requestAnimationFrame(animate);
    }

    /* ----- Public API ----- */

    /**
     * Calculates sun intensity: ramps from 0 at slider=0 to 1 at slider=0.30.
     * Rainbow appears only at the very low end of the slider (slider < 0.10).
     */
    function calcSunIntensity(sliderPercent) {
        sunOpacity = weather === 'sunny' ? Math.min((0.30 - sliderPercent) / 0.30, 1) : 0;
        rainbowOpacity = weather === 'sunny' ? Math.max((0.10 - sliderPercent) / 0.10, 0) : 0;
    }

    let weather = 'rain';

    function setWeather(newWeather, sliderPercent) {
        weather = newWeather;

        if (newWeather === currentWeather && particles.length > 0) {
            calcSunIntensity(sliderPercent);
            return;
        }

        currentWeather = newWeather;
        particles = [];

        const particleCount = newWeather === 'snow' ? 200 : newWeather === 'rain' ? 200 : 100;

        for (let i = 0; i < particleCount; i++) {
            if (newWeather === 'snow') particles.push(createSnowflake());
            else if (newWeather === 'rain') particles.push(createRaindrop());
            else particles.push(createSunParticle());
        }

        calcSunIntensity(sliderPercent);
    }

    /* Start the render loop */
    animate();

    return { setWeather };
})();
