document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('snowCanvas');
    const ctx = canvas.getContext('2d');
    const snowBtn = document.getElementById('snowBtn'); 
    
    let width, height;
    let particles = [];
    let animationId;
    let isSnowing = false;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    class Snowflake {
        constructor() {
            this.reset();
            this.y = Math.random() * height; 
        }

        reset() {
            this.x = Math.random() * width;
            this.y = -10;
            this.size = Math.random() * 2 + 1; 
            this.speed = Math.random() * 1 + 0.5;
            this.wind = Math.random() * 1 - 0.5;
            this.opacity = Math.random() * 0.4 + 0.1;
        }

        update() {
            this.y += this.speed;
            this.x += this.wind;
            this.x += Math.sin(this.y * 0.01) * 0.2;

            if (this.y > height) {
                this.reset();
            }
        }

        draw() {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        const particleCount = Math.floor(width * 0.1); 
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Snowflake());
        }
    }

    function animate() {
        if (!isSnowing) return;
        
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        animationId = requestAnimationFrame(animate);
    }

    snowBtn.addEventListener('click', () => {
        isSnowing = !isSnowing; 
        
        if (isSnowing) {
            snowBtn.classList.add('active');
            canvas.classList.add('active');
            resize();
            initParticles();
            animate();
        } else {
            snowBtn.classList.remove('active');
            canvas.classList.remove('active');
            
            setTimeout(() => {
                if (!isSnowing) {
                    cancelAnimationFrame(animationId);
                    ctx.clearRect(0, 0, width, height);
                }
            }, 1000);
        }
    });

    window.addEventListener('resize', () => {
        if (isSnowing) {
            resize();
            initParticles();
        }
    });
});